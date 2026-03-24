/**
 * Parse Letterboxd diary.csv export.
 * CSV columns: Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
 */

function slugify(name, year) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${slug}-${year}`;
}

function extractSlugFromURI(uri) {
  if (!uri) return null;
  // URI like https://boxd.it/xxxx — use the path segment
  try {
    const url = new URL(uri);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  } catch (e) {
    // not a valid URL
  }
  return null;
}

function parseRating(ratingStr) {
  if (!ratingStr || ratingStr.trim() === '') return null;
  const trimmed = ratingStr.trim();

  // Handle decimal format (e.g. "4.5", "3.0")
  const decimal = parseFloat(trimmed);
  if (!isNaN(decimal)) {
    return Math.round(decimal * 2) / 2; // ensure 0.5 increments
  }

  // Handle star format (e.g. "★★★½")
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

export function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Skip header row
  const films = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 8) continue;

    const [date, name, yearStr, uri, ratingStr, rewatchStr, tags, watchedDate] = cols;

    if (!name || !name.trim()) continue;

    const year = parseInt(yearStr, 10) || null;
    const uriSlug = extractSlugFromURI(uri);
    const letterboxd_id = uriSlug || slugify(name.trim(), year);
    const rating = parseRating(ratingStr);
    const rewatch = rewatchStr && rewatchStr.trim().toLowerCase() === 'yes';
    const watched = watchedDate && watchedDate.trim() ? watchedDate.trim() : (date && date.trim() ? date.trim() : null);
    const decade = year ? Math.floor(year / 10) * 10 : null;

    films.push({
      letterboxd_id,
      name: name.trim(),
      year,
      watched_date: watched,
      rating,
      rewatch,
      review: '',
      letterboxd_uri: uri && uri.trim() ? uri.trim() : null,
      // TMDB fields — empty/null until enriched
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
    });
  }

  return films;
}
