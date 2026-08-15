/**
 * Parse Letterboxd CSV exports.
 * Supports: diary.csv, ratings.csv, watched.csv
 * Auto-detects file type from headers.
 *
 * Returns: { films: Film[], diaryEntries: DiaryEntry[] }
 *
 * Film shape (CSV fields only, TMDB fields null/empty):
 *   letterboxd_id, name, year, rating, first_watched, last_watched,
 *   rewatch_count, tags, sources, letterboxd_uri,
 *   tmdb_id, genres, director, director_id, director_photo, cast,
 *   keywords, poster, tmdb_rating, runtime, origin_country, decade,
 *   enriched, enriched_at
 *
 * DiaryEntry shape:
 *   id, letterboxd_id, watched_date, rating, rewatch, tags, source
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function slugify(name, year) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${slug}-${year}`;
}

// letterboxd_id is always slugify(name, year) — the only field consistent across
// all three export files. URIs differ in format (letterboxd.com vs boxd.it) between
// files and Letterboxd slugs may or may not include the year, making them unreliable
// as cross-file keys. name+year slugify is deterministic and always matches.

function parseRating(ratingStr) {
  if (!ratingStr || ratingStr.trim() === '') return null;
  const trimmed = ratingStr.trim();

  const decimal = parseFloat(trimmed);
  if (!isNaN(decimal)) return Math.round(decimal * 2) / 2;

  let stars = 0;
  for (const char of trimmed) {
    if (char === '★') stars += 1;
    else if (char === '½') stars += 0.5;
  }
  return stars > 0 ? stars : null;
}

function parseCSVLine(line) {
  const result = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function blankTmdbFields() {
  return {
    tmdb_id: null,
    genres: [],
    director: null,
    director_id: null,
    director_photo: null,
    cast: [],
    keywords: [],
    poster: null,
    tmdb_rating: null,
    runtime: null,
    origin_country: null,
    languages: [],
    enriched: false,
    enriched_at: null,
  };
}

function makeFilm(letterboxd_id, name, year, uri) {
  return {
    letterboxd_id,
    name,
    year,
    rating: null,
    first_watched: null,
    last_watched: null,
    rewatch_count: 0,
    tags: [],
    sources: [],
    letterboxd_uri: uri || null,
    decade: year ? Math.floor(year / 10) * 10 : null,
    ...blankTmdbFields(),
  };
}

function makeDiaryEntry(letterboxd_id, watched_date, rating, rewatch, tags) {
  return {
    id: `${letterboxd_id}_${watched_date}`,
    letterboxd_id,
    watched_date,
    rating,
    rewatch,
    tags,
    source: 'diary',
  };
}

// ─── File type detection ──────────────────────────────────────────────────────

function detectFileType(headerLine) {
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  if (headers.includes('rewatch')) return 'diary';
  if (headers.includes('rating') && !headers.includes('rewatch')) return 'ratings';
  return 'watched';
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * diary.csv: Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
 * One row per diary log — film may appear multiple times (rewatches).
 */
function parseDiary(lines) {
  const filmsMap = new Map();   // letterboxd_id → Film
  const diaryEntries = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 8) continue;

    const [, name, yearStr, uri, ratingStr, rewatchStr, tagsStr, watchedDateStr] = cols;
    if (!name || !name.trim()) continue;

    const year = parseInt(yearStr, 10) || null;
    const uriTrimmed = uri && uri.trim() ? uri.trim() : null;
    const letterboxd_id = slugify(name.trim(), year);
    const rating = parseRating(ratingStr);
    const rewatch = rewatchStr && rewatchStr.trim().toLowerCase() === 'yes';
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
    const watched_date = watchedDateStr && watchedDateStr.trim() ? watchedDateStr.trim() : null;

    if (!watched_date) continue;

    diaryEntries.push(makeDiaryEntry(letterboxd_id, watched_date, rating, rewatch, tags));

    // Film record — merge if already seen (multiple rewatches)
    if (!filmsMap.has(letterboxd_id)) {
      const film = makeFilm(letterboxd_id, name.trim(), year, uriTrimmed);
      film.sources = ['diary'];
      filmsMap.set(letterboxd_id, film);
    }

    const film = filmsMap.get(letterboxd_id);

    if (!film.first_watched || watched_date < film.first_watched) film.first_watched = watched_date;
    if (!film.last_watched || watched_date > film.last_watched) film.last_watched = watched_date;

    if (rating !== null && watched_date >= (film.last_watched || '')) {
      film.rating = rating;
    }

    if (rewatch) film.rewatch_count = (film.rewatch_count || 0) + 1;

    const tagSet = new Set([...film.tags, ...tags]);
    film.tags = [...tagSet];
  }

  return { films: [...filmsMap.values()], diaryEntries };
}

/**
 * ratings.csv: Date,Name,Year,Letterboxd URI,Rating
 * One row per rated film.
 */
function parseRatings(lines) {
  const films = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) continue;

    const [dateStr, name, yearStr, uri, ratingStr] = cols;
    if (!name || !name.trim()) continue;

    const year = parseInt(yearStr, 10) || null;
    const uriTrimmed = uri && uri.trim() ? uri.trim() : null;
    const letterboxd_id = slugify(name.trim(), year);
    const rating = parseRating(ratingStr);
    const date = dateStr && dateStr.trim() ? dateStr.trim() : null;

    const film = makeFilm(letterboxd_id, name.trim(), year, uriTrimmed);
    film.rating = rating;
    film.first_watched = date;
    film.last_watched = date;
    film.sources = ['ratings'];

    films.push(film);
  }

  return { films, diaryEntries: [] };
}

/**
 * watched.csv: Date,Name,Year,Letterboxd URI
 * One row per watched film (includes unrated).
 */
function parseWatched(lines) {
  const films = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 4) continue;

    const [dateStr, name, yearStr, uri] = cols;
    if (!name || !name.trim()) continue;

    const year = parseInt(yearStr, 10) || null;
    const uriTrimmed = uri && uri.trim() ? uri.trim() : null;
    const letterboxd_id = slugify(name.trim(), year);
    const date = dateStr && dateStr.trim() ? dateStr.trim() : null;

    const film = makeFilm(letterboxd_id, name.trim(), year, uriTrimmed);
    film.first_watched = date;
    film.last_watched = date;
    film.sources = ['watched'];

    films.push(film);
  }

  return { films, diaryEntries: [] };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse any Letterboxd CSV export.
 * Auto-detects file type from the header row.
 * Returns { films: Film[], diaryEntries: DiaryEntry[] }
 */
export function parseLetterboxdCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return { films: [], diaryEntries: [] };

  const type = detectFileType(lines[0]);

  if (type === 'diary') return parseDiary(lines);
  if (type === 'ratings') return parseRatings(lines);
  return parseWatched(lines);
}
