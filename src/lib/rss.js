import { getLastWatchedDate, upsertFilms, upsertDiaryEntries, getAllFilms } from './db.js';
import { enrichFilms } from './tmdb.js';
import { slugify } from './csv.js';

const RSS_BASE = 'https://letterboxd.com';

function parseRSSTitle(title) {
  // Format: "Fight Club, 1999 - ★★★★" or "Fight Club, 1999"
  if (!title) return { name: '', year: null };
  const dashIndex = title.lastIndexOf(' - ');
  const namePart = dashIndex > -1 ? title.substring(0, dashIndex) : title;
  const yearMatch = namePart.match(/,\s*(\d{4})$/);
  if (yearMatch) {
    const name = namePart.substring(0, yearMatch.index).trim();
    const year = parseInt(yearMatch[1], 10);
    return { name, year };
  }
  return { name: namePart.trim(), year: null };
}


function getTagText(item, tagName) {
  const els = item.getElementsByTagNameNS('https://letterboxd.com', tagName);
  if (els.length > 0) return els[0].textContent.trim();
  const els2 = item.getElementsByTagName(tagName);
  if (els2.length > 0) return els2[0].textContent.trim();
  const els3 = item.getElementsByTagName(`letterboxd:${tagName}`);
  if (els3.length > 0) return els3[0].textContent.trim();
  return null;
}

function parseRSSItem(item) {
  const titleEl = item.getElementsByTagName('title')[0];
  const linkEl = item.getElementsByTagName('link')[0];
  const title = titleEl ? titleEl.textContent.trim() : '';
  const link = linkEl ? linkEl.textContent.trim() : '';

  const filmTitle = getTagText(item, 'filmTitle');
  const filmYear = getTagText(item, 'filmYear');
  const watchedDate = getTagText(item, 'watchedDate');

  // Skip non-film entries (lists, reviews without a film tag, etc.)
  if (!filmTitle && !watchedDate) return null;
  const memberRating = getTagText(item, 'memberRating');
  const rewatch = getTagText(item, 'rewatch');

  let name, year;
  if (filmTitle) {
    name = filmTitle;
    year = filmYear ? parseInt(filmYear, 10) : null;
  } else {
    const parsed = parseRSSTitle(title);
    name = parsed.name;
    year = parsed.year;
  }

  // Always use name+year slugify — same canonical ID as csv.js
  const letterboxd_id = slugify(name, year);
  const rating = memberRating ? parseFloat(memberRating) : null;
  const isRewatch = rewatch && rewatch.toLowerCase() === 'yes';

  const film = {
    letterboxd_id,
    name,
    year,
    rating: (!isNaN(rating) && rating !== null) ? rating : null,
    first_watched: watchedDate || null,
    last_watched: watchedDate || null,
    rewatch_count: isRewatch ? 1 : 0,
    tags: [],
    sources: ['rss'],
    letterboxd_uri: link || null,
    decade: year ? Math.floor(year / 10) * 10 : null,
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
    enriched: false,
    enriched_at: null,
  };

  const diaryEntry = watchedDate ? {
    id: `${letterboxd_id}_${watchedDate}`,
    letterboxd_id,
    watched_date: watchedDate,
    rating: film.rating,
    rewatch: isRewatch,
    tags: [],
    source: 'rss',
  } : null;

  return { film, diaryEntry };
}

export async function fetchRSS(username) {
  const url = `${RSS_BASE}/${username}/rss/`;
  let text;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
    text = await response.text();
  } catch (err) {
    console.warn('[LBS] RSS fetch failed for', username, err);
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  const items = doc.getElementsByTagName('item');
  const films = [];

  for (let i = 0; i < items.length; i++) {
    const parsed = parseRSSItem(items[i]);
    if (parsed && parsed.film.name) films.push(parsed.film);
  }

  return films;
}

export async function syncRSS(username, apiKey) {
  let rssItems;
  try {
    const url = `${RSS_BASE}/${username}/rss/`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const items = doc.getElementsByTagName('item');
    rssItems = Array.from(items)
      .map(item => parseRSSItem(item))
      .filter(parsed => parsed && parsed.film.name);
  } catch (err) {
    console.warn('[LBS] syncRSS: fetch failed', err);
    return { added: 0 };
  }

  if (!rssItems.length) return { added: 0 };

  const lastWatched = await getLastWatchedDate();
  const existingFilms = await getAllFilms();
  const dbMap = new Map(existingFilms.map(f => [f.letterboxd_id, f]));

  const brandNewFilms = [];
  const newDiaryEntries = [];
  const unenrichedFilms = [];
  const enrichedFilms = [];
  let newWatchCount = 0;

  for (const { film, diaryEntry } of rssItems) {
    const inDb = dbMap.get(film.letterboxd_id);
    if (inDb) {
      const isNewWatch = diaryEntry && (!inDb.last_watched || diaryEntry.watched_date > inDb.last_watched);
      const merged = {
        ...film,
        ...inDb,
        letterboxd_uri: inDb.letterboxd_uri || film.letterboxd_uri,
        ...(isNewWatch ? {
          last_watched: diaryEntry.watched_date,
          rating: diaryEntry.rating ?? inDb.rating,
        } : {}),
      };
      if (isNewWatch) {
        newDiaryEntries.push(diaryEntry);
        newWatchCount++;
      }
      if (inDb.enriched) {
        enrichedFilms.push(merged);
      } else {
        unenrichedFilms.push(merged);
      }
    } else if (!lastWatched || !film.last_watched || film.last_watched >= lastWatched) {
      brandNewFilms.push(film);
      if (diaryEntry) newDiaryEntries.push(diaryEntry);
    }
  }

  const toEnrich = [...brandNewFilms, ...unenrichedFilms];
  let enriched = toEnrich;
  if (toEnrich.length && apiKey) {
    try {
      enriched = await enrichFilms(toEnrich, apiKey, null);
    } catch (err) {
      console.warn('[LBS] enrichment failed during sync', err);
    }
  }

  await upsertFilms([...enriched, ...enrichedFilms]);
  if (newDiaryEntries.length) await upsertDiaryEntries(newDiaryEntries);
  await chrome.storage.local.set({ last_rss_sync: new Date().toISOString() });

  return { added: brandNewFilms.length + newWatchCount };
}
