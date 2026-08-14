# Privacy Policy for WrappedBoxd

**Last updated:** 2026-08-12

WrappedBoxd is a Chrome extension that adds a statistics panel to Letterboxd profile pages. This policy explains what data the extension accesses, how it's used, and what is (and isn't) shared.

## What data WrappedBoxd accesses

- **Website content** — WrappedBoxd reads film titles, ratings, watch dates, and related activity from Letterboxd pages you visit and from Letterboxd data exports (CSV files) you choose to upload, in order to compute and display your viewing statistics.
- **Settings** — Your Letterboxd username and last sync timestamp are stored locally via `chrome.storage.local` so the extension can tell your own profile apart from others and avoid unnecessary re-syncing.

WrappedBoxd does **not** collect names, email addresses, passwords, payment information, location data, health information, or your browsing history on other websites.

## Where your data is stored

All film and rating data is stored **locally in your browser** using IndexedDB. It never leaves your device except for the network requests described below.

## Network requests

WrappedBoxd makes requests to three destinations, and only for the purposes below:

- **letterboxd.com** — to read your public RSS activity feed and profile page content.
- **A first-party proxy (unboxd-proxy.vercel.app)** — forwards film title/year lookups to the TMDB API to fetch genre, cast, director, and keyword metadata. The proxy does not log, store, or retain personal data; it only relays film metadata requests.
- **image.tmdb.org** — loads film poster and cast/director photos directly from TMDB's public image CDN.

No analytics, advertising, or tracking scripts are included in this extension.

## Data sharing

WrappedBoxd does not sell or transfer user data to third parties, does not use your data for purposes unrelated to displaying your Letterboxd statistics, and does not use your data to determine creditworthiness or for lending purposes.

## Your control over your data

You can clear all locally stored data at any time by removing the extension or clearing your browser's site data for the extension. Uploading a CSV export and syncing are both actions you initiate manually.

## Contact

Questions about this policy can be directed via the [GitHub repository](https://github.com/saifwarraich/wrappedboxd).
