const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';
const BATCH_SIZE = 40;
const BATCH_DELAY_MS = 1100;
const RATE_LIMIT_DELAY_MS = 5000;

async function tmdbFetch(url, apiKey) {
  const separator = url.includes('?') ? '&' : '?';
  const fullUrl = `${url}${separator}api_key=${apiKey}`;

  const response = await fetch(fullUrl);
  if (response.status === 429) {
    await delay(RATE_LIMIT_DELAY_MS);
    const retry = await fetch(fullUrl);
    if (!retry.ok) return null;
    return retry.json();
  }
  if (!response.ok) return null;
  return response.json();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchFilm(name, year, apiKey) {
  const query = encodeURIComponent(name);
  const url = `${TMDB_BASE}/search/movie?query=${query}&year=${year}`;
  const data = await tmdbFetch(url, apiKey);
  if (!data || !data.results || data.results.length === 0) return null;
  return data.results[0].id;
}

async function getFilmDetails(tmdbId, apiKey) {
  const url = `${TMDB_BASE}/movie/${tmdbId}?append_to_response=credits,keywords`;
  return tmdbFetch(url, apiKey);
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

export async function enrichFilm(film, apiKey) {
  try {
    const tmdbId = await searchFilm(film.name, film.year, apiKey);
    if (!tmdbId) {
      return { ...film, enriched: false };
    }

    const details = await getFilmDetails(tmdbId, apiKey);
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

export async function enrichFilms(films, apiKey, onProgress) {
  const results = [];
  let done = 0;
  const total = films.length;

  for (let i = 0; i < films.length; i += BATCH_SIZE) {
    const batch = films.slice(i, i + BATCH_SIZE);
    const enriched = await Promise.all(batch.map(f => enrichFilm(f, apiKey)));
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
