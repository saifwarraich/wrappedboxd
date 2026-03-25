const DB_NAME = 'letterboxd_stats_v1';
const DB_VERSION = 2;

const FILMS_STORE = 'films';
const DIARY_STORE = 'diary_entries';

let dbInstance = null;

export function initDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(FILMS_STORE)) {
        const films = db.createObjectStore(FILMS_STORE, { keyPath: 'letterboxd_id' });
        films.createIndex('last_watched', 'last_watched', { unique: false });
        films.createIndex('director', 'director', { unique: false });
        films.createIndex('enriched', 'enriched', { unique: false });
      }

      if (!db.objectStoreNames.contains(DIARY_STORE)) {
        const diary = db.createObjectStore(DIARY_STORE, { keyPath: 'id' });
        diary.createIndex('letterboxd_id', 'letterboxd_id', { unique: false });
        diary.createIndex('watched_date', 'watched_date', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return initDB();
}

// ─── Films ────────────────────────────────────────────────────────────────────

export async function getAllFilms() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILMS_STORE, 'readonly');
    const store = tx.objectStore(FILMS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getFilm(letterboxd_id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILMS_STORE, 'readonly');
    const store = tx.objectStore(FILMS_STORE);
    const request = store.get(letterboxd_id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Upsert a film, merging with existing record.
 * Merge rules:
 *   - rating: keep latest (caller must pass watched_date for comparison)
 *   - first_watched: keep earliest
 *   - last_watched: keep latest
 *   - rewatch_count: keep max
 *   - tags: union
 *   - sources: union
 *   - TMDB fields: only overwrite if incoming has them (enriched: true)
 */
export async function upsertFilm(incoming) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILMS_STORE, 'readwrite');
    const store = tx.objectStore(FILMS_STORE);
    const getReq = store.get(incoming.letterboxd_id);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      const merged = existing ? mergeFilm(existing, incoming) : incoming;
      const putReq = store.put(merged);
      putReq.onsuccess = () => resolve(putReq.result);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function upsertFilms(films) {
  // Sequential to respect merge logic per film
  let count = 0;
  for (const film of films) {
    await upsertFilm(film);
    count++;
  }
  return count;
}

export async function getFilmCount() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILMS_STORE, 'readonly');
    const store = tx.objectStore(FILMS_STORE);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAll() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([FILMS_STORE, DIARY_STORE], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(FILMS_STORE).clear();
    tx.objectStore(DIARY_STORE).clear();
  });
}

// ─── Diary entries ────────────────────────────────────────────────────────────

export async function getAllDiaryEntries() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, 'readonly');
    const store = tx.objectStore(DIARY_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getDiaryEntriesForFilm(letterboxd_id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, 'readonly');
    const store = tx.objectStore(DIARY_STORE);
    const index = store.index('letterboxd_id');
    const request = index.getAll(letterboxd_id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function upsertDiaryEntry(entry) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, 'readwrite');
    const store = tx.objectStore(DIARY_STORE);
    const request = store.put(entry);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function upsertDiaryEntries(entries) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, 'readwrite');
    const store = tx.objectStore(DIARY_STORE);
    let count = 0;

    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);

    for (const entry of entries) {
      const req = store.put(entry);
      req.onsuccess = () => { count++; };
    }
  });
}

/**
 * Most recent watched_date across all diary entries.
 * Used by RSS sync to know where to start diffing.
 */
export async function getLastWatchedDate() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DIARY_STORE, 'readonly');
    const store = tx.objectStore(DIARY_STORE);
    const index = store.index('watched_date');
    const request = index.openCursor(null, 'prev');
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      resolve(cursor ? cursor.value.watched_date : null);
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Merge helper ─────────────────────────────────────────────────────────────

function mergeFilm(existing, incoming) {
  const merged = { ...existing };

  // Date tracking
  if (incoming.first_watched && (!merged.first_watched || incoming.first_watched < merged.first_watched)) {
    merged.first_watched = incoming.first_watched;
  }
  if (incoming.last_watched && (!merged.last_watched || incoming.last_watched > merged.last_watched)) {
    merged.last_watched = incoming.last_watched;
  }

  // Latest rating wins (keyed by last_watched date)
  if (incoming.rating !== null && incoming.rating !== undefined) {
    const incomingDate = incoming.last_watched || '';
    const existingDate = merged.last_watched || '';
    if (!merged.rating || incomingDate >= existingDate) {
      merged.rating = incoming.rating;
    }
  }

  // Rewatch count: keep max
  if ((incoming.rewatch_count || 0) > (merged.rewatch_count || 0)) {
    merged.rewatch_count = incoming.rewatch_count;
  }

  // Tags: union
  const tagSet = new Set([...(merged.tags || []), ...(incoming.tags || [])]);
  merged.tags = [...tagSet];

  // Sources: union
  const sourceSet = new Set([...(merged.sources || []), ...(incoming.sources || [])]);
  merged.sources = [...sourceSet];

  // TMDB fields: only overwrite if incoming is enriched
  if (incoming.enriched) {
    merged.tmdb_id = incoming.tmdb_id;
    merged.genres = incoming.genres;
    merged.director = incoming.director;
    merged.director_id = incoming.director_id;
    merged.director_photo = incoming.director_photo;
    merged.cast = incoming.cast;
    merged.keywords = incoming.keywords;
    merged.poster = incoming.poster;
    merged.tmdb_rating = incoming.tmdb_rating;
    merged.runtime = incoming.runtime;
    merged.origin_country = incoming.origin_country;
    merged.enriched = true;
    merged.enriched_at = incoming.enriched_at;
  }

  return merged;
}
