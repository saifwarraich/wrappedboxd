import { describe, it, expect, vi, afterEach } from 'vitest';
import { enrichFilm } from './tmdb.js';
import { computeTopActors, computeLanguageBreakdown, filterFilms } from './stats.js';

function mockCastCredits(count) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Actor ${i + 1}`,
    id: i + 1,
    profile_path: `/actor${i + 1}.jpg`,
  }));
}

function mockFetchSequence(searchResult, detailsResult) {
  global.fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => searchResult })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => detailsResult });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('enrichFilm cast extraction', () => {
  it('keeps the full credited cast, not just the top 5', async () => {
    const cast = mockCastCredits(12); // ensemble-sized cast, e.g. Harry Potter
    mockFetchSequence(
      { results: [{ id: 674 }] },
      {
        genres: [],
        production_countries: [],
        credits: { cast, crew: [] },
        keywords: { keywords: [] },
      }
    );

    const film = { name: 'Harry Potter and the Goblet of Fire', year: 2005 };
    const enriched = await enrichFilm(film);

    expect(enriched.cast).toHaveLength(12);
    expect(enriched.cast[11].name).toBe('Actor 12'); // 12th-billed actor survives
  });
});

describe('enrichFilm language extraction', () => {
  it('extracts spoken languages as full names', async () => {
    mockFetchSequence(
      { results: [{ id: 550 }] },
      {
        genres: [],
        production_countries: [],
        spoken_languages: [
          { english_name: 'English', iso_639_1: 'en' },
          { english_name: 'German', iso_639_1: 'de' },
        ],
        credits: { cast: [], crew: [] },
        keywords: { keywords: [] },
      }
    );

    const enriched = await enrichFilm({ name: 'Fight Club', year: 1999 });

    expect(enriched.languages).toEqual(['English', 'German']);
  });

  it('returns an empty array when TMDB has no spoken_languages data', async () => {
    mockFetchSequence(
      { results: [{ id: 1 }] },
      { genres: [], production_countries: [], credits: { cast: [], crew: [] }, keywords: { keywords: [] } }
    );

    const enriched = await enrichFilm({ name: 'Unknown Film', year: 2000 });

    expect(enriched.languages).toEqual([]);
  });
});

describe('computeLanguageBreakdown and language filtering', () => {
  it('counts films under every language they contain and filters correctly', () => {
    const films = [
      { name: 'A', languages: ['English'] },
      { name: 'B', languages: ['English', 'French'] },
      { name: 'C', languages: ['French'] },
      { name: 'D', languages: [] },
    ];

    expect(computeLanguageBreakdown(films)).toEqual({ English: 2, French: 2 });

    const frenchOnly = filterFilms(films, { language: 'French' });
    expect(frenchOnly.map(f => f.name)).toEqual(['B', 'C']);
  });
});

describe('computeTopActors with a full cast list', () => {
  it('counts an actor billed below the top 5 across multiple films', () => {
    const lowBilledActor = { name: 'Ralph Fiennes', id: 5988 };
    const films = Array.from({ length: 4 }, (_, i) => ({
      cast: [
        { name: 'Lead A', id: 1 },
        { name: 'Lead B', id: 2 },
        { name: 'Lead C', id: 3 },
        { name: 'Lead D', id: 4 },
        { name: 'Lead E', id: 5 },
        lowBilledActor, // 6th billed — would have been dropped by a top-5 slice
      ],
      rating: null,
    }));

    const topActors = computeTopActors(films, 10);
    const fiennes = topActors.find(a => a.id === 5988);

    expect(fiennes).toBeDefined();
    expect(fiennes.count).toBe(4);
  });
});
