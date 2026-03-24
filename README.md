# Unboxd

A Chrome extension that injects a rich stats panel into your Letterboxd profile page.

## Features

- **Overview** — Films logged, hours watched, avg rating, countries, this year
- **Directors & Actors** — Top watched with photos, film counts, avg ratings. Click any card to see all films.
- **Genres** — Doughnut chart + stacked bar chart by year
- **Decades** — Horizontal bar chart of films by decade
- **Ratings** — Histogram with avg line. Click any bar to see films with that rating.
- **Themes** — Keyword tag cloud from TMDB data
- **Filters** — Filter all sections by year watched, decade, or genre
- **Sync** — Background RSS sync on page load, manual sync button

Stats only appear on your own profile. Other profiles are unaffected.

## Setup

### 1. Install dependencies and build

```bash
npm install
npm run build
```

### 2. Load the extension in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

### 3. First-time setup

Visit your Letterboxd profile. The extension will prompt you to:

1. Enter your **TMDB API key** — get one free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Upload your **diary.csv** — export from Letterboxd → Settings → Import & Export → Export Your Data
3. Enrich your films with TMDB data (fetches directors, cast, genres, keywords)

### 4. Updating your diary

Click **Settings ⚙** in the panel header to update your TMDB key or re-import a new CSV at any time.

## Development

```bash
npm run dev    # build on every save
npm run build  # production build
```

After any code change, click the refresh icon on your extension in `chrome://extensions`, then hard-refresh your Letterboxd profile.

## Tech Stack

- Vite + vite-plugin-web-extension
- Vanilla JS (ES modules)
- Chart.js 4
- IndexedDB (film cache)
- Manifest V3
