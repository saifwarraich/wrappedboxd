/**
 * Pure stat computation functions. All take films[] as first argument.
 */

export function computeOverview(films) {
  const total = films.length;
  const ratedFilms = films.filter(f => f.rating !== null && f.rating !== undefined);
  const avgRating = ratedFilms.length > 0
    ? ratedFilms.reduce((sum, f) => sum + f.rating, 0) / ratedFilms.length
    : 0;

  const hours = films.reduce((sum, f) => sum + (f.runtime || 0), 0) / 60;

  const countries = new Set(films.flatMap(f => f.origin_country || []).filter(Boolean));
  const languages = new Set(films.flatMap(f => f.languages || []).filter(Boolean));

  const currentYear = new Date().getFullYear();
  const thisYear = films.filter(f => {
    if (!f.last_watched) return false;
    return parseInt(f.last_watched.substring(0, 4), 10) === currentYear;
  }).length;

  const rewatches = films.filter(f => (f.rewatch_count || 0) > 0).length;

  return {
    total,
    hours: Math.round(hours),
    avgRating: Math.round(avgRating * 10) / 10,
    countries,
    languages,
    thisYear,
    rewatches,
  };
}

export function computeTopDirectors(films, limit = 10) {
  const dirMap = new Map();

  for (const film of films) {
    if (!film.director) continue;
    const key = film.director_id || film.director;
    if (!dirMap.has(key)) {
      dirMap.set(key, {
        name: film.director,
        id: film.director_id,
        photo: film.director_photo,
        count: 0,
        totalRating: 0,
        ratedCount: 0,
      });
    }
    const entry = dirMap.get(key);
    entry.count++;
    if (film.rating !== null && film.rating !== undefined) {
      entry.totalRating += film.rating;
      entry.ratedCount++;
    }
    // Update photo if we have one and don't yet
    if (!entry.photo && film.director_photo) {
      entry.photo = film.director_photo;
    }
  }

  return Array.from(dirMap.values())
    .map(d => ({
      name: d.name,
      id: d.id,
      photo: d.photo,
      count: d.count,
      avgRating: d.ratedCount > 0 ? Math.round((d.totalRating / d.ratedCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function computeTopActors(films, limit = 10) {
  const actorMap = new Map();

  for (const film of films) {
    if (!film.cast || !film.cast.length) continue;
    for (const actor of film.cast) {
      const key = actor.id || actor.name;
      if (!actorMap.has(key)) {
        actorMap.set(key, {
          name: actor.name,
          id: actor.id,
          photo: actor.photo,
          count: 0,
          totalRating: 0,
          ratedCount: 0,
        });
      }
      const entry = actorMap.get(key);
      entry.count++;
      if (film.rating !== null && film.rating !== undefined) {
        entry.totalRating += film.rating;
        entry.ratedCount++;
      }
      if (!entry.photo && actor.photo) {
        entry.photo = actor.photo;
      }
    }
  }

  return Array.from(actorMap.values())
    .map(a => ({
      name: a.name,
      id: a.id,
      photo: a.photo,
      count: a.count,
      avgRating: a.ratedCount > 0 ? Math.round((a.totalRating / a.ratedCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function computeGenreBreakdown(films) {
  const totals = {};
  const byYear = {};

  for (const film of films) {
    if (!film.genres || !film.genres.length) continue;
    const watchedYear = film.last_watched ? parseInt(film.last_watched.substring(0, 4), 10) : null;

    for (const genre of film.genres) {
      totals[genre] = (totals[genre] || 0) + 1;
      if (watchedYear) {
        if (!byYear[watchedYear]) byYear[watchedYear] = {};
        byYear[watchedYear][genre] = (byYear[watchedYear][genre] || 0) + 1;
      }
    }
  }

  return { totals, byYear };
}

export function computeTopKeywords(films, limit = 30) {
  const keywordMap = new Map();

  for (const film of films) {
    if (!film.keywords || !film.keywords.length) continue;
    for (const kw of film.keywords) {
      keywordMap.set(kw, (keywordMap.get(kw) || 0) + 1);
    }
  }

  return Array.from(keywordMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function computeDecades(films) {
  const decades = {};

  for (const film of films) {
    if (film.decade === null || film.decade === undefined) continue;
    decades[film.decade] = (decades[film.decade] || 0) + 1;
  }

  return decades;
}

export function computeLanguageBreakdown(films) {
  const totals = {};

  for (const film of films) {
    if (!film.languages || !film.languages.length) continue;
    for (const lang of film.languages) {
      totals[lang] = (totals[lang] || 0) + 1;
    }
  }

  return totals;
}

export function computeRatingDistribution(films) {
  const dist = {};
  const steps = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  for (const s of steps) {
    dist[s.toFixed(1)] = 0;
  }

  for (const film of films) {
    if (film.rating === null || film.rating === undefined) continue;
    const key = parseFloat(film.rating).toFixed(1);
    if (key in dist) {
      dist[key]++;
    }
  }

  return dist;
}

export function computeRatingVsTmdb(films) {
  return films
    .filter(f => f.rating !== null && f.rating !== undefined && f.tmdb_rating !== null && f.tmdb_rating !== undefined)
    .map(f => ({
      name: f.name,
      yourRating: f.rating,
      tmdbRating: f.tmdb_rating / 2, // scale 0-10 to 0-5
    }));
}

export function filterFilms(films, filters = {}) {
  return films.filter(film => {
    if (filters.yearWatched) {
      if (!film.last_watched) return false;
      const watchedYear = parseInt(film.last_watched.substring(0, 4), 10);
      if (watchedYear !== parseInt(filters.yearWatched, 10)) return false;
    }

    if (filters.decade !== undefined && filters.decade !== null && filters.decade !== '') {
      if (film.decade !== parseInt(filters.decade, 10)) return false;
    }

    if (filters.genre) {
      if (!film.genres || !film.genres.includes(filters.genre)) return false;
    }

    if (filters.language) {
      if (!film.languages || !film.languages.includes(filters.language)) return false;
    }

    return true;
  });
}
