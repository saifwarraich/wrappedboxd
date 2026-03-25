const PROXY_BASE = 'https://unboxd-proxy.vercel.app/api/tmdb';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';
const BATCH_SIZE = 40;
const BATCH_DELAY_MS = 1100;
const RATE_LIMIT_DELAY_MS = 5000;

async function tmdbFetch(endpoint, params = {}) {
  const qs = new URLSearchParams({ endpoint, ...params }).toString();
  const url = `${PROXY_BASE}?${qs}`;

  const response = await fetch(url);
  if (response.status === 429) {
    await delay(RATE_LIMIT_DELAY_MS);
    const retry = await fetch(url);
    if (!retry.ok) return null;
    return retry.json();
  }
  if (!response.ok) return null;
  return response.json();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchFilm(name, year) {
  const data = await tmdbFetch('search/movie', { query: name, year });
  if (!data || !data.results || data.results.length === 0) return null;
  return data.results[0].id;
}

async function getFilmDetails(tmdbId) {
  return tmdbFetch(`movie/${tmdbId}`, { append_to_response: 'credits,keywords' });
}

function extractDirector(credits) {
  if (!credits || !credits.crew) return { director: null, director_id: null, director_photo: null };
  const dir = credits.crew.find(p => p.job === 'Director');
  if (!dir) return { director: null, director_id: null, director_photo: null };
  return {
    director: dir.name,
    director_id: dir.id,
    director_photo: dir.profile_path ? `${IMAGE_BASE}${dir.profile_path}` : null,
  };
}

function extractCast(credits) {
  if (!credits || !credits.cast) return [];
  return credits.cast.slice(0, 5).map(person => ({
    name: person.name,
    id: person.id,
    photo: person.profile_path ? `${IMAGE_BASE}${person.profile_path}` : null,
  }));
}

function extractKeywords(keywordsData) {
  if (!keywordsData || !keywordsData.keywords) return [];
  return keywordsData.keywords.map(k => k.name);
}

export async function enrichFilm(film) {
  try {
    const tmdbId = await searchFilm(film.name, film.year);
    if (!tmdbId) {
      return { ...film, enriched: false };
    }

    const details = await getFilmDetails(tmdbId);
    if (!details) {
      return { ...film, enriched: false };
    }

    const { director, director_id, director_photo } = extractDirector(details.credits);
    const cast = extractCast(details.credits);
    const keywords = extractKeywords(details.keywords);
    const genres = (details.genres || []).map(g => g.name);
    const originCountry = details.production_countries
      ? details.production_countries.map(c => c.name).filter(Boolean)
      : [];

    return {
      ...film,
      tmdb_id: tmdbId,
      genres,
      director,
      director_id,
      director_photo,
      cast,
      keywords,
      poster: details.poster_path ? `${IMAGE_BASE}${details.poster_path}` : null,
      tmdb_rating: details.vote_average || null,
      runtime: details.runtime || null,
      origin_country: originCountry,
      decade: film.year ? Math.floor(film.year / 10) * 10 : film.decade,
      enriched: true,
      enriched_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[LBS] TMDB enrichment failed for', film.name, err);
    return { ...film, enriched: false };
  }
}

export async function enrichFilms(films, onProgress) {
  const results = [];
  let done = 0;
  const total = films.length;

  for (let i = 0; i < films.length; i += BATCH_SIZE) {
    const batch = films.slice(i, i + BATCH_SIZE);
    const enriched = await Promise.all(batch.map(f => enrichFilm(f)));
    results.push(...enriched);
    done += batch.length;
    if (typeof onProgress === 'function') {
      onProgress(done, total);
    }
    if (i + BATCH_SIZE < films.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  return results;
}
