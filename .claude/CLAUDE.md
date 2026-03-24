# Letterboxd Stats Extension — Claude Code Spec

## Project Overview

A Chrome extension (Manifest V3) that injects a rich stats panel into Letterboxd profile pages.
Built with Vite + vanilla JS. No React, no TypeScript. Chart.js for charts.

The panel appears **above the "Recent Activity" section** on any letterboxd.com profile page.

Behaviour differs based on whether you're viewing **your own profile** or **someone else's**:

- **Your profile** — full stats from IndexedDB (populated via CSV upload + TMDB enrichment + RSS sync)
- **Other profiles** — lightweight stats from their public RSS feed only, with a banner: *"Stats based on recent 50 entries. Visit your own profile to unlock full stats."*

---

## Tech Stack

- **Vite** — build tool, dev server with HMR
- **Vanilla JS** (ES modules) — no React, no Vue
- **Chart.js 4** — all charts, loaded as an npm dependency
- **IndexedDB** — local film cache (via a thin wrapper, no external lib)
- **chrome.storage.local** — user settings (TMDB key, own username, last sync time)
- **Manifest V3** — modern Chrome extension format

---

## Project Structure

```
letterboxd-extension/
├── manifest.json
├── vite.config.js
├── package.json
├── src/
│   ├── content/
│   │   ├── index.js        ← entry point injected on letterboxd.com/*
│   │   ├── panel.js        ← builds panel DOM, mounts into page
│   │   ├── sections/
│   │   │   ├── overview.js     ← summary numbers strip
│   │   │   ├── directors.js    ← top directors grid
│   │   │   ├── actors.js       ← top actors grid
│   │   │   ├── genres.js       ← genre chart + timeline
│   │   │   ├── themes.js       ← keyword/theme tag cloud
│   │   │   ├── decades.js      ← decade bar chart
│   │   │   └── ratings.js      ← rating histogram + scatter
│   │   └── content.css     ← all injected styles
│   ├── lib/
│   │   ├── db.js           ← IndexedDB wrapper
│   │   ├── csv.js          ← diary.csv parser
│   │   ├── tmdb.js         ← TMDB API client + batch enrichment
│   │   ├── rss.js          ← RSS fetcher + diff/sync logic
│   │   └── stats.js        ← pure stat computation functions
│   └── assets/
│       └── icon.png
```

---

## Data Schema

### Film object (stored in IndexedDB)

```js
{
  // from CSV
  letterboxd_id: "fight-club-1999",   // slug — unique key
  name: "Fight Club",
  year: 1999,
  watched_date: "2023-11-04",          // ISO string
  rating: 4.5,                         // 0.5–5, null if not rated
  rewatch: false,
  review: "",                          // may be empty

  // from TMDB
  tmdb_id: 550,
  genres: ["Drama", "Thriller"],
  director: "David Fincher",
  director_id: 7467,
  director_photo: "https://image.tmdb.org/t/p/w185/...",
  cast: [
    { name: "Brad Pitt", id: 287, photo: "https://..." },
    { name: "Edward Norton", id: 819, photo: "https://..." },
    // top 5 only
  ],
  keywords: ["fight club", "nihilism", "masculinity", "twist ending"],
  poster: "https://image.tmdb.org/t/p/w185/...",
  tmdb_rating: 8.4,
  runtime: 139,
  origin_country: "US",
  decade: 1990,                        // year rounded down to decade
  enriched: true,                      // false if TMDB fetch failed/pending
  enriched_at: "2024-03-01T12:00:00Z"
}
```

### Settings (chrome.storage.local)

```js
{
  tmdb_api_key: "abc123",
  own_username: "yourname",           // set on first visit, from page DOM
  last_rss_sync: "2024-03-01T12:00:00Z",
  last_full_sync: "2024-03-01T12:00:00Z",
  onboarded: false
}
```

---

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "Letterboxd Stats",
  "version": "1.0.0",
  "description": "Rich stats panel injected into your Letterboxd profile.",
  "permissions": ["storage", "alarms"],
  "host_permissions": [
    "https://letterboxd.com/*",
    "https://api.themoviedb.org/*",
    "https://image.tmdb.org/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://letterboxd.com/*"],
      "js": ["src/content/index.js"],
      "css": ["src/content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_icon": "src/assets/icon.png"
  },
  "icons": {
    "128": "src/assets/icon.png"
  }
}
```

---

## vite.config.js

Use `vite-plugin-web-extension` or configure Vite manually to:
- Build `src/content/index.js` as an IIFE (not ES module — content scripts can't use top-level imports in MV3 without bundling)
- Output to `dist/`
- Copy `manifest.json` to `dist/`
- In dev mode, write to `dist/` on every save so you can load `dist/` as unpacked extension

```js
import { defineConfig } from 'vite'
import webExtension from 'vite-plugin-web-extension'

export default defineConfig({
  plugins: [
    webExtension({
      manifest: './manifest.json',
    }),
  ],
})
```

---

## src/lib/db.js

Thin IndexedDB wrapper. Export these functions:

```js
initDB()                          // opens/upgrades DB, creates 'films' store with keyPath 'letterboxd_id'
getAllFilms()                      // returns all Film objects as array
getFilm(letterboxd_id)            // returns one Film
upsertFilm(film)                  // insert or update by letterboxd_id
upsertFilms(films[])              // bulk upsert
getFilmCount()                    // integer
getLastWatchedDate()              // ISO string of most recent watched_date
clearAllFilms()                   // nuclear reset
```

DB name: `letterboxd_stats_v1`
Store name: `films`
Indices: `watched_date`, `director`, `enriched`

---

## src/lib/csv.js

Parse the Letterboxd `diary.csv` export.

CSV columns (Letterboxd format):
```
Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
```

Export:
```js
parseCSV(csvText)  // returns Film[] with CSV fields filled, TMDB fields null/empty, enriched: false
```

- `letterboxd_id` = slug extracted from the URI column: `https://boxd.it/xxxx` — use the film name + year as fallback slug if URI parsing fails: `"fight-club-1999"`
- `rating` = convert "½★★★" style OR decimal "3.5" — Letterboxd exports as decimals (0.5 increments)
- `rewatch` = "Yes" → true
- Skip header row
- Handle missing Rating gracefully (null)

---

## src/lib/tmdb.js

TMDB API base: `https://api.themoviedb.org/3`
Image base: `https://image.tmdb.org/t/p/`

### Endpoints used

1. **Search film** — `GET /search/movie?query={name}&year={year}&api_key={key}`
   → take first result's `id`

2. **Film details** — `GET /movie/{id}?api_key={key}&append_to_response=credits,keywords`
   → extract genres, runtime, origin_country, vote_average, credits (cast top 5 + director), keywords

3. **Person image** — from credits response, `profile_path` field
   → full URL: `https://image.tmdb.org/t/p/w185{profile_path}`

4. **Poster** — `poster_path` from movie details
   → full URL: `https://image.tmdb.org/t/p/w185{poster_path}`

### Rate limiting

TMDB free tier: ~40 requests per 10 seconds.
Implement a simple queue:
- Process films in batches of 20
- Each film = 2 requests (search + details)
- Wait 600ms between batches
- On 429 response: wait 10s, retry

### Export

```js
enrichFilm(film, apiKey)           // enriches one film, returns updated Film
enrichFilms(films[], apiKey, onProgress)  // bulk, calls onProgress(done, total) each batch
```

`onProgress(done, total)` is called after each batch — used to update the progress bar.

---

## src/lib/rss.js

```js
fetchRSS(username)         // fetches https://letterboxd.com/{username}/rss/
                           // returns Film[] parsed from RSS items (CSV fields only, enriched: false)

syncRSS(username, apiKey)  // 1. fetchRSS
                           // 2. get lastWatchedDate from IndexedDB
                           // 3. filter RSS films newer than lastWatchedDate
                           // 4. enrichFilms on new ones
                           // 5. upsertFilms
                           // 6. update last_rss_sync in chrome.storage.local
                           // returns { added: N }
```

RSS item fields to extract:
- `title` → film name + year (parse: "Fight Club, 1999 - ★★★★")
- `letterboxd:watchedDate` → watched_date
- `letterboxd:memberRating` → rating (already decimal)
- `letterboxd:rewatch` → rewatch ("Yes"/"No")
- `letterboxd:filmTitle` → clean name
- `letterboxd:filmYear` → year
- `link` → extract slug for letterboxd_id

For **other users' profiles** (not own), call `fetchRSS` only — do not enrich, do not write to IndexedDB. Compute stats on the fly from the raw RSS array.

---

## src/lib/stats.js

Pure functions. All take `films[]` as first argument. Return plain objects/arrays.

```js
computeOverview(films)
// → { total, hours, avgRating, countries: Set, thisYear, rewatches }

computeTopDirectors(films, limit = 10)
// → [{ name, id, photo, count, avgRating }, ...]

computeTopActors(films, limit = 10)
// → [{ name, id, photo, count, avgRating }, ...]

computeGenreBreakdown(films)
// → { totals: {Drama: 45, ...}, byYear: { 2023: {Drama: 12, ...}, ... } }

computeTopKeywords(films, limit = 30)
// → [{ keyword, count }, ...] sorted by count

computeDecades(films)
// → { 1970: 3, 1980: 12, 1990: 45, ... }

computeRatingDistribution(films)
// → { "0.5": 2, "1.0": 5, ..., "5.0": 34 }

computeRatingVsTmdb(films)
// → [{ name, yourRating, tmdbRating }, ...] for films where both exist

filterFilms(films, filters)
// filters: { yearWatched, decade, genre } — all optional, AND logic
// → filtered Film[]
```

---

## src/content/index.js

Entry point. Runs on every letterboxd.com page.

Logic:
1. Check if current page is a profile page: URL matches `letterboxd.com/{username}/` (or just `letterboxd.com/{username}`)
2. Extract `username` from URL
3. Get `own_username` from chrome.storage.local
4. If `own_username` is not set: read it from the page DOM (logged-in user nav element) and save it
5. If username === own_username → **own profile mode**
6. Else → **other profile mode**

```
own profile mode:
  - initDB()
  - check onboarded flag
  - if not onboarded: inject onboarding UI (CSV upload + API key prompt)
  - if onboarded:
    - load all films from IndexedDB
    - run RSS sync silently in background
    - inject panel with full stats

other profile mode:
  - fetchRSS(username)
  - compute stats from RSS films only
  - inject panel with limited stats + banner
```

---

## src/content/panel.js

Builds and injects the panel DOM.

### Injection point

Find the element: `#content .section.main-cols` or `.profile-recent-activity` — inject the stats panel **before** this element.

The panel is a `<div id="lbs-stats-panel">` with a shadow DOM to avoid CSS conflicts with Letterboxd's styles.

### Panel structure (own profile)

```
┌─────────────────────────────────────────────────────┐
│  📊 Your Stats   [Filters ▾]  [Sync ↻]  [Upload CSV]│
├─────────────────────────────────────────────────────┤
│  [Overview strip: total / hours / avg / countries]  │
├──────────┬──────────────────────────────────────────┤
│ Directors│  [Most watched director photo and name + top 10 directors]         │
│  Actors  │  [Most watched actor with photo and name — top 10 actors]            │
│  Genres  │  [doughnut + timeline chart]             │
│  Themes  │  [keyword tag cloud]                     │
│  Decades │  [horizontal bar chart]                  │
│  Ratings │  [histogram + scatter]                   │
└──────────┴──────────────────────────────────────────┘
```

Left: vertical tab nav. Right: section content.
Active tab highlighted with Letterboxd green (`#00e054`).

### Panel structure (other profile)

Same layout but:
- Only Directors, Genres, Decades, Ratings tabs (no Actors, no Themes — RSS doesn't have enough data)
- Yellow banner at top: *"These stats are based on the 50 most recent entries from {username}'s public activity. Stats may be incomplete."*
- No Filters, no Sync button, no Upload CSV

### Onboarding state (own profile, first visit)

Render inside the panel:
1. Welcome message
2. TMDB API key input field + save button
3. CSV file drop zone (or click to upload)
4. On CSV drop: parse → show film count → show "Enrich with TMDB" button
5. On enrich: show progress bar (updating via onProgress callback)
6. On complete: re-render panel with full stats

---

## src/content/sections/overview.js

A horizontal strip of 5 stat cards:

| Stat | Value |
|---|---|
| Films | 847 |
| Hours | 1,412h |
| Avg Rating | ★ 3.6 |
| Countries | 42 |
| This Year | 134 |

Each card: number in large white text, label below in muted green-grey.
Style matches Letterboxd's stat counters.

---

## src/content/sections/directors.js

Grid of director cards. Each card:
- Circular photo (from TMDB, fallback to initials on dark circle)
- Name
- Film count (e.g. "14 films")
- Your avg rating for their films (★ 4.1)

Show top 10. "Show more" expands to top 25.
Sort options: by count (default), by avg rating.

---

## src/content/sections/actors.js

Identical structure to directors. Top 10 actors from `cast` arrays.

---

## src/content/sections/genres.js

Two charts side by side:

**Left: Doughnut chart** — genre totals. Chart.js doughnut.
Letterboxd color palette for segments (greens, teals, the orange accent).

**Right: Stacked bar chart** — genre breakdown per year watched (x-axis = year, stacked bars = genres).
Only show years where you watched ≥ 5 films.

Below charts: genre pill list showing count + percentage.

---

## src/content/sections/themes.js

Tag cloud of TMDB keywords. Size = frequency.
Largest tags ~18px, smallest ~11px. Scale linearly.
Color: all green, opacity varies with frequency (most frequent = full `#00e054`, least = 40% opacity).
Click a tag → filter all stats to films with that keyword.

---

## src/content/sections/decades.js

Horizontal bar chart. Y-axis = decades (1920s → 2020s). X-axis = film count.
Bars filled with green gradient. Show film count label at end of each bar.
Highlight the decade with most films.

---

## src/content/sections/ratings.js

Two charts:

**Top: Rating histogram** — bar chart. X = star rating (0.5 to 5.0 in 0.5 steps). Y = count.
Your ratings in green. Show avg rating as a vertical dashed line.

**Bottom: Your rating vs TMDB** — scatter plot. X = TMDB avg (0–10 scaled to 0–5). Y = your rating.
Each dot = one film. Hover tooltip shows film name. Color: dots above diagonal = you rated higher (green), below = you rated lower (orange/amber).

---

## Filters

A filter bar appears below the panel header when "Filters" is clicked.
Three dropdowns:

- **Year watched** — all years present in diary
- **Decade of film** — 1920s through 2020s
- **Genre** — all genres present

Selecting a filter calls `filterFilms()` and re-renders all sections reactively.
Active filters shown as dismissible pills.
"Clear all" button.

---

## CSS / Design Tokens (content.css)

Match Letterboxd's visual language exactly. Use these tokens:

```css
--lbs-bg: #14181c;
--lbs-bg2: #1c2228;
--lbs-bg3: #242c36;
--lbs-border: #456;
--lbs-green: #00e054;
--lbs-green-dim: #00b544;
--lbs-orange: #ff8000;
--lbs-text: #9ab;
--lbs-text-bright: #fff;
--lbs-text-muted: #678;
--lbs-radius: 4px;
--lbs-radius-lg: 8px;
```

Font: use the page's existing font stack — Letterboxd uses a system font, don't load extras.

Panel has a subtle top border: `3px solid var(--lbs-green)`.

All chart backgrounds: transparent (they sit inside `--lbs-bg2` cards).
Chart.js global defaults: set `color`, `borderColor`, `backgroundColor` to match theme.

---

## Sync behaviour

### On page load (own profile)
1. Render stats immediately from IndexedDB (fast, from cache)
2. In background: call `syncRSS()`
3. If new films found: show subtle toast "↻ 3 new films synced" — re-render stats

### Sync button (manual)
- Clicking "Sync ↻" in panel header: runs `syncRSS()` with visual spinner
- Long-press or shift+click: runs full re-enrichment of all unenriched films

### Last synced indicator
Show "Last synced 2h ago" in muted text in panel header.

---

## Error handling

- TMDB key missing or invalid: show inline error with link to get key
- TMDB 429: show "Rate limited, retrying…" in progress bar
- RSS fetch fail: silent — just don't sync, show last sync time
- Film not found on TMDB: mark `enriched: false`, skip gracefully, still show in stats with whatever data we have
- IndexedDB unavailable: fall back to in-memory only, show warning

---

## Build & Dev Instructions

```bash
npm install
npm run dev     # builds to dist/ on save, HMR for popup if any
npm run build   # production build to dist/
```

Load extension: Chrome → Extensions → Load unpacked → select `dist/`

After any code change in dev: Vite rebuilds → click refresh icon in chrome://extensions.

---

## What NOT to build (out of scope for v1)

- No MCP server
- No backend / no deployment
- No popup UI (everything is injected)
- No options page (settings handled inline in panel)
- No Firefox support
- No write-back to Letterboxd (no logging films)
- No AI features / no Claude API calls

---

## Implementation order

Build in this order so each step is testable:

1. `manifest.json` + `vite.config.js` + `package.json` — bare extension that logs to console
2. `src/lib/db.js` — IndexedDB wrapper with test in console
3. `src/lib/csv.js` — CSV parser, test with sample diary.csv
4. `src/lib/tmdb.js` — enrichment, test with 3 films
5. `src/lib/rss.js` — RSS fetch + diff
6. `src/lib/stats.js` — all stat functions, test with mock data
7. `src/content/panel.js` — inject empty panel shell, confirm it appears above Recent Activity
8. `src/content/sections/overview.js`
9. `src/content/sections/directors.js` + `actors.js`
10. `src/content/sections/genres.js`
11. `src/content/sections/decades.js`
12. `src/content/sections/ratings.js`
13. `src/content/sections/themes.js`
14. Filters + reactive re-render
15. Onboarding flow (CSV upload + TMDB key + progress)
16. RSS sync + toast
17. Other-profile mode + banner
18. Polish: loading skeletons, empty states, error states

---

## Sample diary.csv (for testing)

```
Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
2024-01-15,Oppenheimer,2023,https://boxd.it/oNNs,4.5,No,,2024-01-14
2024-01-10,Past Lives,2023,https://boxd.it/pxMs,5.0,No,,2024-01-09
2023-12-28,The Zone of Interest,2023,https://boxd.it/sj2w,4.0,No,,2023-12-27
2023-12-20,Killers of the Flower Moon,2023,https://boxd.it/sj2w,4.5,No,,2023-12-19
2023-11-04,Fight Club,1999,https://boxd.it/29Zs,5.0,Yes,,2023-11-03
```