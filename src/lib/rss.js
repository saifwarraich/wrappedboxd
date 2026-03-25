import { getLastWatchedDate, upsertFilms, getFilm } from './db.js';
import { enrichFilms } from './tmdb.js';

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

function extractSlugFromLink(link) {
  if (!link) return null;
  try {
    const url = new URL(link);
    const parts = url.pathname.split('/').filter(Boolean);
    // letterboxd.com/username/films/diary/for/YYYY/MM/DD/diary-entry-slug/
    // or letterboxd.com/film/slug/
    if (parts.length >= 2) {
      return parts[parts.length - 1] || parts[parts.length - 2];
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function slugify(name, year) {
  const slug = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${slug}-${year}`;
}

function getTagText(item, tagName) {
  // Handle both namespaced and non-namespaced
  const els = item.getElementsByTagNameNS('https://letterboxd.com', tagName);
  if (els.length > 0) return els[0].textContent.trim();
  // Try without namespace
  const els2 = item.getElementsByTagName(tagName);
  if (els2.length > 0) return els2[0].textContent.trim();
  // Try with letterboxd: prefix
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

  const slug = extractSlugFromLink(link) || slugify(name, year);
  const rating = memberRating ? parseFloat(memberRating) : null;
  const decade = year ? Math.floor(year / 10) * 10 : null;

  return {
    letterboxd_id: slug,
    name,
    year,
    watched_date: watchedDate || null,
    rating: (!isNaN(rating) && rating !== null) ? rating : null,
    rewatch: rewatch && rewatch.toLowerCase() === 'yes',
    review: '',
    letterboxd_uri: link || null,
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
    decade,
    enriched: false,
    enriched_at: null,
  };
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
    const film = parseRSSItem(items[i]);
    if (film.name) {
      films.push(film);
    }
  }

  return films;
}

export async function syncRSS(username, apiKey) {
  let rssFilms;
  try {
    rssFilms = await fetchRSS(username);
  } catch (err) {
    console.warn('[LBS] syncRSS: fetch failed', err);
    return { added: 0 };
  }

  if (!rssFilms.length) return { added: 0 };

  const lastWatched = await getLastWatchedDate();

  // Split into new, existing-unenriched, and existing-enriched films
  const newFilms = [];
  const unenrichedFilms = [];
  const enrichedFilms = [];

  for (const f of rssFilms) {
    const inDb = await getFilm(f.letterboxd_id);
    if (inDb) {
      const merged = { ...f, ...inDb, letterboxd_uri: inDb.letterboxd_uri || f.letterboxd_uri };
      if (inDb.enriched) {
        enrichedFilms.push(merged);
      } else {
        unenrichedFilms.push(merged);
      }
    } else if (!lastWatched || !f.watched_date || f.watched_date > lastWatched) {
      newFilms.push(f);
    }
  }

  const toEnrich = [...newFilms, ...unenrichedFilms];
  let enriched = toEnrich;
  if (toEnrich.length && apiKey) {
    try {
      enriched = await enrichFilms(toEnrich, apiKey, null);
    } catch (err) {
      console.warn('[LBS] enrichment failed during sync', err);
    }
  }

  await upsertFilms([...enriched, ...enrichedFilms]);
  await chrome.storage.local.set({ last_rss_sync: new Date().toISOString() });

  return { added: newFilms.length };
}
