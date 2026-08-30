import { renderOverview } from './sections/overview.js';
import { renderDirectors } from './sections/directors.js';
import { renderActors } from './sections/actors.js';
import { renderGenres } from './sections/genres.js';
import { renderThemes } from './sections/themes.js';
import { renderDecades } from './sections/decades.js';
import { renderLanguages } from './sections/languages.js';
import { renderRatings } from './sections/ratings.js';
import { filterFilms } from '../lib/stats.js';
import { syncRSS } from '../lib/rss.js';
import { getAllFilms, upsertFilms, upsertDiaryEntries, correctWatchDates, DATE_DATA_VERSION } from '../lib/db.js';
import { enrichFilms, ENRICHMENT_DATA_VERSION } from '../lib/tmdb.js';
import { parseLetterboxdCSV } from '../lib/csv.js';
import { h, append, setChildren, clear } from './dom.js';

const PANEL_STYLES = `
  :host {
    display: block;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; }

  :root, .lbs-panel {
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
  }

  .lbs-panel {
    background: var(--lbs-bg);
    border-radius: var(--lbs-radius-lg);
    color: var(--lbs-text);
    overflow: hidden;
    margin-bottom: 30px;
  }

  /* Header */
  .lbs-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: var(--lbs-bg2);
    flex-wrap: wrap;
  }

  .lbs-header:not(:has(+ .lbs-header-caption)) {
    border-bottom: 1px solid #2a3440;
  }

  .lbs-header-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--lbs-text-bright);
    flex: 1;
    min-width: 120px;
  }


  .lbs-sync-info {
    font-size: 11px;
    color: var(--lbs-text-muted);
  }

  .lbs-update-hint {
    display: block;
    margin-top: 2px;
    color: var(--lbs-orange);
  }

  .lbs-update-hint-link {
    text-decoration: underline;
    cursor: pointer;
  }

  .lbs-update-hint-link:hover {
    color: var(--lbs-text-bright);
  }

  .lbs-header-caption {
    padding: 0 20px 10px;
    margin-top: -8px;
    text-align: right;
    font-size: 10px;
    color: var(--lbs-text-muted);
    background: var(--lbs-bg2);
    border-bottom: 1px solid #2a3440;
  }

  .lbs-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  .lbs-btn {
    background: var(--lbs-bg3);
    color: var(--lbs-text);
    border: 1px solid #2a3440;
    border-radius: var(--lbs-radius);
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .lbs-btn:hover {
    color: var(--lbs-text-bright);
    border-color: var(--lbs-border);
  }

  .lbs-btn--green {
    color: var(--lbs-green);
    border-color: var(--lbs-green-dim);
  }

  .lbs-btn--green:hover {
    background: rgba(0, 224, 84, 0.1);
  }

  .lbs-btn--spinning::after {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: lbs-spin 0.7s linear infinite;
    margin-left: 6px;
    vertical-align: middle;
  }

  @keyframes lbs-spin {
    to { transform: rotate(360deg); }
  }

  /* Banner */
  .lbs-banner {
    margin: 12px 20px 0;
    background: rgba(255, 200, 0, 0.12);
    border: 1px solid rgba(255, 200, 0, 0.4);
    border-radius: var(--lbs-radius);
    padding: 10px 14px;
    font-size: 12px;
    color: #ffd700;
    line-height: 1.5;
  }

  /* Filter bar */
  .lbs-filter-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 20px;
    background: var(--lbs-bg3);
    border-bottom: 1px solid #2a3440;
    flex-wrap: wrap;
  }

  .lbs-filter-bar.hidden { display: none; }

  .lbs-filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .lbs-filter-label {
    font-size: 11px;
    color: var(--lbs-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .lbs-filter-select {
    background: var(--lbs-bg2);
    color: var(--lbs-text);
    border: 1px solid #2a3440;
    border-radius: var(--lbs-radius);
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
  }

  .lbs-filter-select:focus { outline: none; border-color: var(--lbs-green); }

  .lbs-active-filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
    flex: 1;
  }

  .lbs-filter-pill {
    background: rgba(0,224,84,0.12);
    border: 1px solid var(--lbs-green-dim);
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 11px;
    color: var(--lbs-green);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .lbs-filter-pill-remove {
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    opacity: 0.7;
  }

  .lbs-filter-pill-remove:hover { opacity: 1; }

  .lbs-clear-filters {
    background: none;
    border: none;
    color: var(--lbs-text-muted);
    font-size: 11px;
    cursor: pointer;
    padding: 2px 6px;
    text-decoration: underline;
  }

  .lbs-clear-filters:hover { color: var(--lbs-text); }

  /* Body layout */
  .lbs-body {
    display: flex;
    min-height: 400px;
  }

  /* Tab nav */
  .lbs-tabs {
    width: 120px;
    min-width: 120px;
    background: var(--lbs-bg2);
    border-right: 1px solid #2a3440;
    display: flex;
    flex-direction: column;
    padding: 8px 0;
  }

  .lbs-tab {
    background: none;
    border: none;
    color: var(--lbs-text);
    padding: 10px 16px;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;
  }

  .lbs-tab:hover {
    color: var(--lbs-text-bright);
    background: rgba(255,255,255,0.03);
  }

  .lbs-tab.active {
    color: var(--lbs-text-bright);
    font-weight: 700;
    border-left-color: var(--lbs-green);
    background: none;
  }

  /* Section content */
  .lbs-section {
    flex: 1;
    padding: 20px;
    min-width: 0;
    overflow-x: auto;
  }

  /* Overview circles */
  .lbs-overview-circles {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    justify-content: center;
    padding: 16px 0 8px;
  }

  .lbs-circle-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .lbs-clickable {
    cursor: pointer;
  }

  .lbs-clickable:hover .lbs-circle {
    filter: brightness(1.15);
  }

  .lbs-clickable:hover .lbs-extra-value {
    color: var(--lbs-green);
  }

  .lbs-circle {
    width: 84px;
    height: 84px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lbs-circle-value {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    font-family: var(--font-stack-tiempos-text, Georgia, serif);
  }

  .lbs-circle-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--lbs-text);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .lbs-overview-extras {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 32px;
    margin-top: 20px;
  }

  .lbs-extra-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .lbs-extra-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--lbs-text-bright);
    font-family: var(--font-stack-tiempos-text, Georgia, serif);
  }

  .lbs-extra-label {
    font-size: 11px;
    color: var(--lbs-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* Featured person (overview) */
  .lbs-featured-row {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 0;
    margin-top: 32px;
    padding: 0 40px;
  }

  .lbs-featured-person {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 260px;
  }

  .lbs-featured-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--lbs-text-muted);
    margin-bottom: 16px;
  }

  .lbs-featured-photo {
    width: 180px;
    height: 220px;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .lbs-featured-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--lbs-text-bright);
    margin-bottom: 4px;
    font-family: var(--font-stack-tiempos-text, Georgia, serif);
  }

  .lbs-featured-count {
    font-size: 12px;
    color: var(--lbs-text-muted);
  }

  .lbs-featured-divider {
    width: 1px;
    height: 260px;
    background: var(--lbs-border);
    margin: 36px 40px 0;
    opacity: 0.4;
  }

  /* Person grid */
  .lbs-section-header-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 16px;
  }

  .lbs-sort-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .lbs-sort-label {
    font-size: 11px;
    color: var(--lbs-text-muted);
  }

  .lbs-sort-btn {
    background: var(--lbs-bg3);
    color: var(--lbs-text);
    border: 1px solid #2a3440;
    border-radius: var(--lbs-radius);
    padding: 3px 10px;
    font-size: 11px;
    cursor: pointer;
  }

  .lbs-sort-btn.active {
    color: var(--lbs-green);
    border-color: var(--lbs-green-dim);
  }

  .lbs-person-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 12px;
  }

  .lbs-person-card {
    background: var(--lbs-bg2);
    border-radius: var(--lbs-radius-lg);
    padding: 12px 8px;
    text-align: center;
    transition: background 0.15s;
  }

  .lbs-person-card:hover { background: var(--lbs-bg3); }

  .lbs-person-photo {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin: 0 auto 8px;
    overflow: hidden;
    position: relative;
  }

  .lbs-person-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .lbs-person-initials {
    width: 100%;
    height: 100%;
    background: var(--lbs-bg3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
    color: var(--lbs-text-muted);
  }

  .lbs-person-name {
    font-size: 12px;
    color: var(--lbs-text-bright);
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .lbs-person-count {
    font-size: 11px;
    color: var(--lbs-text-muted);
  }

  .lbs-person-rating {
    font-size: 11px;
    color: var(--lbs-green);
    margin-top: 2px;
  }

  .lbs-show-more-row {
    text-align: center;
    margin-top: 16px;
  }

  .lbs-show-more-btn {
    background: none;
    border: 1px solid #2a3440;
    color: var(--lbs-text);
    border-radius: var(--lbs-radius);
    padding: 6px 18px;
    font-size: 12px;
    cursor: pointer;
  }

  .lbs-show-more-btn:hover { color: var(--lbs-text-bright); border-color: var(--lbs-border); }

  /* Genres */
  .lbs-genres-layout { display: flex; flex-direction: column; gap: 16px; }

  .lbs-genres-charts {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 16px;
  }

  @media (max-width: 700px) {
    .lbs-genres-charts { grid-template-columns: 1fr; }
  }

  .lbs-chart-card {
    background: var(--lbs-bg2);
    border-radius: var(--lbs-radius-lg);
    padding: 16px;
  }

  .lbs-chart-card--wide { min-height: 260px; }
  .lbs-chart-card--full { min-height: 300px; }

  .lbs-chart-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--lbs-text-bright);
    margin: 0 0 12px;
  }

  .lbs-chart-subtitle {
    font-size: 11px;
    color: var(--lbs-text-muted);
    margin: -8px 0 12px;
  }

  .lbs-doughnut-wrapper {
    position: relative;
    width: 180px;
    height: 180px;
    margin: 0 auto;
  }

  .lbs-bar-wrapper {
    position: relative;
    height: 220px;
  }

  .lbs-genre-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .lbs-genre-pill {
    display: flex;
    align-items: center;
    gap: 5px;
    background: var(--lbs-bg2);
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 12px;
  }

  .lbs-genre-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .lbs-genre-name { color: var(--lbs-text-bright); }

  .lbs-genre-count {
    color: var(--lbs-text);
    font-size: 11px;
  }

  .lbs-genre-pct {
    color: var(--lbs-text-muted);
    font-size: 11px;
  }

  /* Decades */
  .lbs-decades-layout { display: flex; flex-direction: column; gap: 12px; }

  .lbs-decades-chart-wrapper {
    position: relative;
    height: 320px;
  }

  .lbs-decades-highlight {
    font-size: 13px;
    color: var(--lbs-text);
  }

  .lbs-decades-highlight strong { color: var(--lbs-green); }

  /* Ratings */
  .lbs-ratings-layout { display: flex; flex-direction: column; gap: 20px; }

  .lbs-ratings-hist-wrapper {
    position: relative;
    height: 220px;
  }

  .lbs-scatter-wrapper {
    position: relative;
    height: 280px;
  }

  /* Themes */
  .lbs-themes-layout { display: flex; flex-direction: column; gap: 12px; }

  .lbs-themes-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: baseline;
    background: var(--lbs-bg2);
    border-radius: var(--lbs-radius-lg);
    padding: 20px;
    line-height: 1.8;
  }

  .lbs-theme-tag {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: var(--lbs-radius);
    transition: opacity 0.15s;
    font-family: inherit;
    font-weight: 600;
  }

  .lbs-theme-tag:hover {
    opacity: 0.8;
  }

  .lbs-themes-stats {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: var(--lbs-text-muted);
  }

  /* Empty state */
  .lbs-empty-state {
    padding: 40px 20px;
    text-align: center;
    color: var(--lbs-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  /* Loading skeleton */
  .lbs-skeleton {
    background: linear-gradient(90deg, #1c2228 25%, #242c36 50%, #1c2228 75%);
    background-size: 200% 100%;
    animation: lbs-shimmer 1.4s infinite;
    border-radius: var(--lbs-radius);
  }

  @keyframes lbs-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .lbs-skeleton-strip {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .lbs-skeleton-card {
    flex: 1;
    min-width: 120px;
    height: 80px;
  }

  /* Toast */
  .lbs-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--lbs-bg3);
    border: 1px solid var(--lbs-green-dim);
    border-radius: var(--lbs-radius-lg);
    padding: 12px 20px;
    color: var(--lbs-green);
    font-size: 13px;
    z-index: 9999;
    animation: lbs-fadein 0.3s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }

  @keyframes lbs-fadein {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Onboarding */
  .lbs-onboarding {
    padding: 32px;
    max-width: 560px;
    margin: 0 auto;
  }

  .lbs-onboarding h2 {
    font-size: 20px;
    color: var(--lbs-text-bright);
    margin: 0 0 8px;
  }

  .lbs-onboarding p {
    color: var(--lbs-text);
    line-height: 1.6;
    margin: 0 0 24px;
  }

  .lbs-onboarding-step {
    background: var(--lbs-bg2);
    border-radius: var(--lbs-radius-lg);
    padding: 20px;
    margin-bottom: 16px;
  }

  .lbs-onboarding-step h3 {
    font-size: 14px;
    color: var(--lbs-green);
    margin: 0 0 6px;
  }

  .lbs-step-label {
    font-size: 11px;
    color: var(--lbs-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .lbs-step-desc {
    font-size: 12px;
    color: var(--lbs-text);
    margin: 0 0 14px;
    line-height: 1.5;
  }

  .lbs-step-ok {
    font-size: 12px;
    color: var(--lbs-green);
    margin-top: 8px;
  }

  .lbs-btn--ghost {
    background: transparent;
    border: 1px solid #2a3440;
    color: var(--lbs-text-muted);
    font-size: 12px;
  }

  .lbs-btn--ghost:hover { border-color: var(--lbs-text); color: var(--lbs-text); }

  .lbs-input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .lbs-input {
    flex: 1;
    background: var(--lbs-bg3);
    border: 1px solid #2a3440;
    border-radius: var(--lbs-radius);
    color: var(--lbs-text-bright);
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
  }

  .lbs-input:focus { border-color: var(--lbs-green); }

  .lbs-input-note {
    font-size: 11px;
    color: var(--lbs-text-muted);
    margin-top: 6px;
  }

  .lbs-drop-zone {
    border: 2px dashed #2a3440;
    border-radius: var(--lbs-radius-lg);
    padding: 32px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .lbs-drop-zone:hover, .lbs-drop-zone.drag-over {
    border-color: var(--lbs-green-dim);
    background: rgba(0, 224, 84, 0.05);
  }

  .lbs-drop-zone-icon { font-size: 32px; margin-bottom: 8px; }

  .lbs-drop-zone-text {
    font-size: 13px;
    color: var(--lbs-text);
  }

  .lbs-drop-zone-sub {
    font-size: 11px;
    color: var(--lbs-text-muted);
    margin-top: 4px;
  }

  /* Progress bar */
  .lbs-progress-wrap {
    background: var(--lbs-bg3);
    border-radius: 4px;
    height: 8px;
    overflow: hidden;
    margin: 12px 0;
  }

  .lbs-progress-bar {
    background: var(--lbs-green);
    height: 100%;
    width: 0%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .lbs-progress-text {
    font-size: 12px;
    color: var(--lbs-text-muted);
    margin-top: 4px;
  }

  /* Error */
  .lbs-error {
    background: rgba(231, 76, 60, 0.1);
    border: 1px solid rgba(231, 76, 60, 0.4);
    border-radius: var(--lbs-radius);
    padding: 10px 14px;
    font-size: 12px;
    color: #e74c3c;
    margin: 8px 0;
  }

  /* Warning */
  .lbs-warning {
    background: rgba(255, 128, 0, 0.1);
    border: 1px solid rgba(255, 128, 0, 0.3);
    border-radius: var(--lbs-radius);
    padding: 8px 12px;
    font-size: 12px;
    color: var(--lbs-orange);
    margin: 8px 20px;
  }

  /* Settings panel */
  .lbs-settings-panel {
    background: var(--lbs-bg2);
    border-bottom: 1px solid #2a3440;
    padding: 20px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }

  .lbs-settings-panel.hidden { display: none; }

  .lbs-settings-block {
    flex: 1;
    min-width: 220px;
  }

  .lbs-settings-block h4 {
    font-size: 12px;
    color: var(--lbs-green);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 10px;
    font-weight: 700;
  }

  .lbs-settings-drop-zone {
    position: relative;
    border: 2px dashed #2a3440;
    border-radius: var(--lbs-radius);
    padding: 14px;
    text-align: center;
    cursor: pointer;
    font-size: 12px;
    color: var(--lbs-text);
    transition: border-color 0.15s, background 0.15s;
  }

  .lbs-settings-drop-zone:hover, .lbs-settings-drop-zone.drag-over {
    border-color: var(--lbs-green-dim);
    background: rgba(0,224,84,0.05);
  }

  .lbs-settings-status {
    font-size: 11px;
    margin-top: 6px;
    min-height: 16px;
  }
`;

const OWN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'directors', label: 'Directors' },
  { id: 'actors', label: 'Actors' },
  { id: 'genres', label: 'Genres' },
  { id: 'themes', label: 'Themes' },
  { id: 'decades', label: 'Decades' },
  { id: 'languages', label: 'Languages' },
  { id: 'ratings', label: 'Ratings' },
];

const OTHER_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'directors', label: 'Directors' },
  { id: 'genres', label: 'Genres' },
  { id: 'decades', label: 'Decades' },
  { id: 'ratings', label: 'Ratings' },
];

function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getFilterOptions(films) {
  const years = new Set();
  const decades = new Set();
  const genres = new Set();
  const languages = new Set();

  for (const f of films) {
    if (f.last_watched) years.add(f.last_watched.substring(0, 4));
    if (f.decade !== null && f.decade !== undefined) decades.add(f.decade);
    if (f.genres) f.genres.forEach(g => genres.add(g));
    if (f.original_language) languages.add(f.original_language);
  }

  return {
    years: Array.from(years).sort((a, b) => b - a),
    decades: Array.from(decades).sort((a, b) => a - b),
    genres: Array.from(genres).sort(),
    languages: Array.from(languages).sort(),
  };
}

export function injectPanel() {
  // Remove existing panel if present
  const existing = document.getElementById('lbs-stats-panel');
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = 'lbs-stats-panel';

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = PANEL_STYLES;
  shadow.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'lbs-panel';
  shadow.appendChild(panel);

  // Inject inside .col-16 (the main content column), before the first section
  const col = document.querySelector('.col-16');
  if (col) {
    col.prepend(host);
  } else {
    document.querySelector('#content')?.prepend(host) || document.body.prepend(host);
  }

  return { host, shadow, panel };
}

export function renderLoadingState(panel) {
  panel.innerHTML = `
    <div class="lbs-header">
      <div class="lbs-header-title"><span style="color:var(--lbs-orange)">Wrapped</span><span style="color:var(--lbs-green)">Box</span><span style="color:#40bcf4">d</span></div>
      <div class="lbs-sync-info">Loading...</div>
    </div>
    <div class="lbs-body">
      <div class="lbs-section">
        <div class="lbs-skeleton-strip">
          <div class="lbs-skeleton lbs-skeleton-card"></div>
          <div class="lbs-skeleton lbs-skeleton-card"></div>
          <div class="lbs-skeleton lbs-skeleton-card"></div>
          <div class="lbs-skeleton lbs-skeleton-card"></div>
          <div class="lbs-skeleton lbs-skeleton-card"></div>
        </div>
      </div>
    </div>
  `;
}

export function renderErrorState(panel, message) {
  setChildren(panel, [
    h('div', { className: 'lbs-header' }, [
      h('div', { className: 'lbs-header-title' }, [
        h('span', { style: 'color:var(--lbs-orange)', text: 'Wrapped' }),
        h('span', { style: 'color:var(--lbs-green)', text: 'Box' }),
        h('span', { style: 'color:#40bcf4', text: 'd' }),
      ]),
    ]),
    h('div', { className: 'lbs-body' }, [
      h('div', { className: 'lbs-section' }, [
        h('div', { className: 'lbs-error', text: message }),
      ]),
    ]),
  ]);
}

function readCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function bindDropZone(panel, dropId, inputId, onFile) {
  const drop = panel.querySelector(`#${dropId}`);
  const input = panel.querySelector(`#${inputId}`);
  if (!drop || !input) return;
  drop.addEventListener('click', () => input.click());
  input.addEventListener('click', e => e.stopPropagation());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files[0]) onFile(input.files[0]); });
}

function mergeFilmsIntoMap(films, map) {
  for (const film of films) {
    if (!map.has(film.letterboxd_id)) {
      map.set(film.letterboxd_id, { ...film });
      continue;
    }
    const existing = map.get(film.letterboxd_id);
    if (film.first_watched && (!existing.first_watched || film.first_watched < existing.first_watched))
      existing.first_watched = film.first_watched;
    if (film.last_watched && (!existing.last_watched || film.last_watched > existing.last_watched))
      existing.last_watched = film.last_watched;
    if (film.rating != null) {
      const inDate = film.last_watched || '';
      const exDate = existing.last_watched || '';
      if (!existing.rating || inDate >= exDate) existing.rating = film.rating;
    }
    if ((film.rewatch_count || 0) > (existing.rewatch_count || 0))
      existing.rewatch_count = film.rewatch_count;
    existing.tags = [...new Set([...existing.tags, ...film.tags])];
    existing.sources = [...new Set([...existing.sources, ...film.sources])];
  }
}

export function renderOnboarding(panel, { onEnrich }) {
  panel.innerHTML = `
    <div class="lbs-header">
      <div class="lbs-header-title"><span style="color:var(--lbs-orange)">Wrapped</span><span style="color:var(--lbs-green)">Box</span><span style="color:#40bcf4">d</span></div>
    </div>
    <div class="lbs-onboarding">
      <h2>Welcome to WrappedBoxd</h2>
      <p>Get rich stats about your films — directors, genres, decades, ratings and more.</p>

      <div class="lbs-onboarding-steps">

        <!-- Step 1: watched.csv (required) -->
        <div class="lbs-onboarding-step" id="lbs-step-1">
          <div class="lbs-step-label">Step 1 of 4 — Required</div>
          <h3>Upload watched.csv</h3>
          <p class="lbs-step-desc">Your complete list of every film you've marked as watched, including unrated ones. This is the base for all your stats.</p>
          <div class="lbs-drop-zone" id="lbs-drop-1">
            <div class="lbs-drop-zone-icon">📄</div>
            <div class="lbs-drop-zone-text">Drop watched.csv here, or click to browse</div>
            <input type="file" accept=".csv" id="lbs-input-1" style="display:none">
          </div>
          <div id="lbs-status-1"></div>
          <p class="lbs-input-note" style="margin-top:8px">Get your export files at <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener" style="color:var(--lbs-green)">letterboxd.com/settings/data</a></p>
        </div>

        <!-- Step 2: ratings.csv (optional) -->
        <div class="lbs-onboarding-step hidden" id="lbs-step-2">
          <div class="lbs-step-label">Step 2 of 4 — Optional</div>
          <h3>Upload ratings.csv</h3>
          <p class="lbs-step-desc">Adds your star ratings to the film list. Skip if you didn't rate many films outside the diary.</p>
          <div class="lbs-drop-zone" id="lbs-drop-2">
            <div class="lbs-drop-zone-icon">⭐</div>
            <div class="lbs-drop-zone-text">Drop ratings.csv here, or click to browse</div>
            <input type="file" accept=".csv" id="lbs-input-2" style="display:none">
          </div>
          <div id="lbs-status-2"></div>
          <button class="lbs-btn lbs-btn--ghost" id="lbs-skip-2" style="margin-top:10px">Skip this step →</button>
        </div>

        <!-- Step 3: diary.csv (optional) -->
        <div class="lbs-onboarding-step hidden" id="lbs-step-3">
          <div class="lbs-step-label">Step 3 of 4 — Optional</div>
          <h3>Upload diary.csv</h3>
          <p class="lbs-step-desc">Adds exact watch dates, rewatch history and tags. Enables timeline charts and per-year breakdowns.</p>
          <div class="lbs-drop-zone" id="lbs-drop-3">
            <div class="lbs-drop-zone-icon">📅</div>
            <div class="lbs-drop-zone-text">Drop diary.csv here, or click to browse</div>
            <input type="file" accept=".csv" id="lbs-input-3" style="display:none">
          </div>
          <div id="lbs-status-3"></div>
          <button class="lbs-btn lbs-btn--ghost" id="lbs-skip-3" style="margin-top:10px">Skip this step →</button>
        </div>

        <!-- Step 4: Enrich -->
        <div class="lbs-onboarding-step hidden" id="lbs-step-4">
          <div class="lbs-step-label">Step 4 of 4</div>
          <h3>Enrich with TMDB</h3>
          <p id="lbs-enrich-summary"></p>
          <button class="lbs-btn lbs-btn--green" id="lbs-enrich-btn">Start Enrichment</button>
          <div id="lbs-progress-wrap" style="display:none; margin-top:12px">
            <div class="lbs-progress-wrap">
              <div class="lbs-progress-bar" id="lbs-progress-bar"></div>
            </div>
            <div class="lbs-progress-text" id="lbs-progress-text">Starting...</div>
          </div>
          <div id="lbs-enrich-error"></div>
        </div>

      </div>
    </div>
  `;

  // ── State ──────────────────────────────────────────────────────────────────
  // In-memory merged film map (letterboxd_id → Film) and diary entries
  const filmsMap = new Map();
  let allDiaryEntries = [];

  function showStep(n) {
    [1, 2, 3, 4].forEach(i => {
      panel.querySelector(`#lbs-step-${i}`).classList.toggle('hidden', i !== n);
    });
  }

  // ── Step 1: watched.csv (required) ────────────────────────────────────────
  bindDropZone(panel, 'lbs-drop-1', 'lbs-input-1', async file => {
    const status = panel.querySelector('#lbs-status-1');
    try {
      const text = await readCSV(file);
      const { films } = parseLetterboxdCSV(text);
      mergeFilmsIntoMap(films, filmsMap);
      setChildren(status, [h('div', { className: 'lbs-step-ok', text: `✓ ${films.length} films loaded` })]);
      setTimeout(() => showStep(2), 800);
    } catch (err) {
      setChildren(status, [h('div', { className: 'lbs-error', text: `Failed to parse: ${err.message}` })]);
    }
  });

  // ── Step 2: ratings.csv (optional) ────────────────────────────────────────
  bindDropZone(panel, 'lbs-drop-2', 'lbs-input-2', async file => {
    const status = panel.querySelector('#lbs-status-2');
    try {
      const text = await readCSV(file);
      const { films } = parseLetterboxdCSV(text);
      const before = filmsMap.size;
      mergeFilmsIntoMap(films, filmsMap);
      const added = filmsMap.size - before;
      const rated = films.filter(f => f.rating !== null).length;
      const msg = `✓ Ratings added for ${rated} films${added ? `, ${added} new films discovered` : ''}`;
      setChildren(status, [h('div', { className: 'lbs-step-ok', text: msg })]);
      setTimeout(() => showStep(3), 800);
    } catch (err) {
      setChildren(status, [h('div', { className: 'lbs-error', text: `Failed to parse: ${err.message}` })]);
    }
  });

  panel.querySelector('#lbs-skip-2').addEventListener('click', () => showStep(3));

  // ── Step 3: diary.csv (optional) ──────────────────────────────────────────
  bindDropZone(panel, 'lbs-drop-3', 'lbs-input-3', async file => {
    const status = panel.querySelector('#lbs-status-3');
    try {
      const text = await readCSV(file);
      const { films, diaryEntries } = parseLetterboxdCSV(text);
      mergeFilmsIntoMap(films, filmsMap);
      allDiaryEntries = allDiaryEntries.concat(diaryEntries);
      const msg = `✓ Watch history for ${films.length} films, ${diaryEntries.length} diary entries`;
      setChildren(status, [h('div', { className: 'lbs-step-ok', text: msg })]);
      setTimeout(() => showStep(4), 800);
    } catch (err) {
      setChildren(status, [h('div', { className: 'lbs-error', text: `Failed to parse: ${err.message}` })]);
    }
  });

  panel.querySelector('#lbs-skip-3').addEventListener('click', () => showStep(4));

  // ── Step 4: Enrich ─────────────────────────────────────────────────────────
  // Update summary when step 4 becomes visible via MutationObserver
  const step4 = panel.querySelector('#lbs-step-4');
  new MutationObserver(() => {
    if (!step4.classList.contains('hidden')) {
      panel.querySelector('#lbs-enrich-summary').textContent =
        `Ready to enrich ${filmsMap.size} films with director, cast, genre and keyword data. This may take a few minutes.`;
    }
  }).observe(step4, { attributeFilter: ['class'] });

  const enrichBtn = panel.querySelector('#lbs-enrich-btn');
  const progressWrap = panel.querySelector('#lbs-progress-wrap');
  const progressBar = panel.querySelector('#lbs-progress-bar');
  const progressText = panel.querySelector('#lbs-progress-text');
  const enrichError = panel.querySelector('#lbs-enrich-error');

  enrichBtn.addEventListener('click', async () => {
    enrichBtn.disabled = true;
    enrichBtn.textContent = 'Enriching...';
    progressWrap.style.display = 'block';
    clear(enrichError);

    try {
      const films = [...filmsMap.values()];
      const enriched = await enrichFilms(films, (done, total) => {
        progressBar.style.width = Math.round((done / total) * 100) + '%';
        progressText.textContent = `Enriching ${done} / ${total} films...`;
      });

      await upsertFilms(enriched);
      await upsertDiaryEntries(allDiaryEntries);
      await chrome.storage.local.set({
        onboarded: true,
        last_full_sync: new Date().toISOString(),
        cast_data_version: ENRICHMENT_DATA_VERSION,
        date_data_version: DATE_DATA_VERSION,
      });

      progressBar.style.width = '100%';
      progressText.textContent = 'Done! Loading your stats...';

      if (typeof onEnrich === 'function') onEnrich(enriched);
    } catch (err) {
      setChildren(enrichError, [h('div', { className: 'lbs-error', text: `Enrichment error: ${err.message}` })]);
      enrichBtn.disabled = false;
      enrichBtn.textContent = 'Retry';
    }
  });
}

export function renderFullPanel(panel, allFilms, allDiaryEntries, isOwnProfile, username, settings, callbacks = {}) {
  const tabs = isOwnProfile ? OWN_TABS : OTHER_TABS;
  let activeTab = tabs[0].id;
  let filters = {};
  let filteredFilms = allFilms;

  function filteredDiaryEntries() {
    const filteredIds = new Set(filteredFilms.map(f => f.letterboxd_id));
    return allDiaryEntries.filter(e => {
      if (!filteredIds.has(e.letterboxd_id)) return false;
      if (filters.yearWatched) {
        return e.watched_date && e.watched_date.startsWith(String(filters.yearWatched));
      }
      return true;
    });
  }
  let filtersVisible = false;
  let settingsVisible = false;

  const syncTime = formatRelativeTime(settings.last_rss_sync);

  function settingsDropZone(id, inputId, statusId, label) {
    return h('div', {}, [
      h('div', { className: 'lbs-settings-drop-zone', id }, [
        document.createTextNode(label),
        h('input', {
          type: 'file', accept: '.csv', id: inputId,
          style: 'position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%',
        }),
      ]),
      h('div', { id: statusId }),
    ]);
  }

  function buildSettingsPanel() {
    return h('div', { className: `lbs-settings-panel ${settingsVisible ? '' : 'hidden'}`, id: 'lbs-settings-panel' }, [
      h('div', { className: 'lbs-settings-block' }, [
        h('h4', { text: 'Update Film Data' }),
        h('p', { className: 'lbs-input-note', style: 'margin-bottom:10px' }, [
          "Upload new exports to add or update your film list. Files are merged — you won't lose existing data. Get your files at ",
          h('a', { href: 'https://letterboxd.com/settings/data/', target: '_blank', rel: 'noopener', style: 'color:var(--lbs-green)', text: 'letterboxd.com/settings/data' }),
        ]),
        h('div', { id: 'lbs-su-step-1' }, [
          h('div', { className: 'lbs-step-label', text: 'Step 1 — Required' }),
          settingsDropZone('lbs-su-drop-1', 'lbs-su-input-1', 'lbs-su-status-1', 'Drop watched.csv here or click to browse'),
        ]),
        h('div', { id: 'lbs-su-step-2', className: 'hidden', style: 'margin-top:10px' }, [
          h('div', { className: 'lbs-step-label', text: 'Step 2 — Optional' }),
          settingsDropZone('lbs-su-drop-2', 'lbs-su-input-2', 'lbs-su-status-2', 'Drop ratings.csv here or click to browse'),
          h('button', { className: 'lbs-btn lbs-btn--ghost', id: 'lbs-su-skip-2', style: 'margin-top:6px;font-size:11px', text: 'Skip →' }),
        ]),
        h('div', { id: 'lbs-su-step-3', className: 'hidden', style: 'margin-top:10px' }, [
          h('div', { className: 'lbs-step-label', text: 'Step 3 — Optional' }),
          settingsDropZone('lbs-su-drop-3', 'lbs-su-input-3', 'lbs-su-status-3', 'Drop diary.csv here or click to browse'),
          h('button', { className: 'lbs-btn lbs-btn--ghost', id: 'lbs-su-skip-3', style: 'margin-top:6px;font-size:11px', text: 'Skip →' }),
        ]),
        h('div', { id: 'lbs-su-step-4', className: 'hidden', style: 'margin-top:10px' }, [
          h('button', { className: 'lbs-btn lbs-btn--green', id: 'lbs-settings-enrich-btn', text: 'Enrich with TMDB' }),
          h('div', { className: 'lbs-progress-wrap', id: 'lbs-settings-progress-wrap', style: 'display:none; margin-top:8px' }, [
            h('div', { className: 'lbs-progress-bar', id: 'lbs-settings-progress-bar' }),
          ]),
          h('div', { className: 'lbs-settings-status', id: 'lbs-settings-enrich-status' }),
        ]),
      ]),
    ]);
  }

  function filterSelect(id, labelText, values, current, optionText, isSelected) {
    const select = h('select', { className: 'lbs-filter-select', id }, [
      h('option', { value: '', text: `All ${labelText.toLowerCase()}s` }),
    ]);
    for (const v of values) {
      select.append(h('option', {
        value: String(v),
        selected: isSelected(v, current) || false,
        text: optionText(v),
      }));
    }
    return h('div', { className: 'lbs-filter-group' }, [
      h('span', { className: 'lbs-filter-label', text: labelText }),
      select,
    ]);
  }

  function buildFilterBar() {
    const opts = getFilterOptions(allFilms);
    const activeKeys = Object.keys(filters).filter(k => filters[k]);

    const activeFilters = h('div', { className: 'lbs-active-filters', id: 'lbs-active-filters' });
    for (const k of activeKeys) {
      const removeBtn = h('span', { className: 'lbs-filter-pill-remove', dataset: { filter: k }, text: '×' });
      activeFilters.append(h('span', { className: 'lbs-filter-pill', dataset: { filter: k } }, [
        `${filters[k]} `,
        removeBtn,
      ]));
    }
    if (activeKeys.length > 1) {
      activeFilters.append(h('button', { className: 'lbs-clear-filters', id: 'lbs-clear-filters', text: 'Clear all' }));
    }

    return h('div', { className: `lbs-filter-bar ${filtersVisible ? '' : 'hidden'}`, id: 'lbs-filter-bar' }, [
      filterSelect('lbs-filter-year', 'Year', opts.years, filters.yearWatched, y => String(y), (y, cur) => cur != null && cur == y),
      filterSelect('lbs-filter-decade', 'Decade', opts.decades, filters.decade, d => `${d}s`, (d, cur) => cur != null && cur == d),
      filterSelect('lbs-filter-genre', 'Genre', opts.genres, filters.genre, g => g, (g, cur) => cur === g),
      filterSelect('lbs-filter-language', 'Language', opts.languages, filters.language, l => l, (l, cur) => cur === l),
      activeFilters,
    ]);
  }

  function buildTabs() {
    const tabsEl = h('div', { className: 'lbs-tabs' });
    for (const t of tabs) {
      tabsEl.append(h('button', {
        className: `lbs-tab ${t.id === activeTab ? 'active' : ''}`,
        dataset: { tab: t.id },
        text: t.label,
      }));
    }
    return tabsEl;
  }

  function renderActiveSection(container) {
    switch (activeTab) {
      case 'overview':
        renderOverview(filteredFilms, filteredDiaryEntries(), container);
        break;
      case 'directors':
        renderDirectors(filteredFilms, container);
        break;
      case 'actors':
        renderActors(filteredFilms, container);
        break;
      case 'genres':
        renderGenres(filteredFilms, container);
        break;
      case 'themes':
        renderThemes(filteredFilms, container, (kw) => {
          filters.keyword = kw;
          filteredFilms = filterFilms(allFilms, filters);
          rerender();
        });
        break;
      case 'decades':
        renderDecades(filteredFilms, container);
        break;
      case 'languages':
        renderLanguages(filteredFilms, container);
        break;
      case 'ratings':
        renderRatings(filteredFilms, container, panel.getRootNode());
        break;
    }
  }

  function rerender() {
    filteredFilms = filterFilms(allFilms, filters);
    render();
  }

  function render() {
    const needsEnrichmentUpdate = isOwnProfile && settings.cast_data_version !== ENRICHMENT_DATA_VERSION;
    const needsDateCorrection = isOwnProfile && settings.date_data_version !== DATE_DATA_VERSION;
    const needsDataUpdate = needsEnrichmentUpdate || needsDateCorrection;
    const hasActiveFilters = Object.keys(filters).filter(k => filters[k]).length > 0;

    const syncInfo = h('div', { className: 'lbs-sync-info' }, [`Last synced ${syncTime}`]);
    if (needsDataUpdate) {
      syncInfo.append(h('span', { className: 'lbs-update-hint', id: 'lbs-update-hint' }, [
        'New film data available — ',
        h('span', { className: 'lbs-update-hint-link', id: 'lbs-update-hint-link', text: 'update now' }),
      ]));
    }

    const headerActions = h('div', { className: 'lbs-header-actions' });
    if (isOwnProfile) {
      append(headerActions, [
        h('button', { className: 'lbs-btn', id: 'lbs-filter-toggle', text: `Filters ${hasActiveFilters ? '●' : '▾'}` }),
        h('button', { className: 'lbs-btn lbs-btn--green', id: 'lbs-sync-btn', title: 'Shift+click to fully re-enrich all films from TMDB', text: 'Sync ↻' }),
        h('button', { className: `lbs-btn ${settingsVisible ? 'lbs-btn--green' : ''}`, id: 'lbs-settings-toggle', text: 'Settings ⚙' }),
      ]);
    }

    const sectionContent = h('div', { className: 'lbs-section', id: 'lbs-section-content' });

    const children = [
      h('div', { className: 'lbs-header' }, [
        h('div', { className: 'lbs-header-title' }, [
          h('span', { style: 'color:var(--lbs-orange)', text: 'Wrapped' }),
          h('span', { style: 'color:var(--lbs-green)', text: 'Box' }),
          h('span', { style: 'color:#40bcf4', text: 'd' }),
        ]),
        syncInfo,
        headerActions,
      ]),
      isOwnProfile ? h('div', { className: 'lbs-header-caption', text: 'Shift+click Sync ↻ to fully re-enrich all films from TMDB' }) : null,
      !isOwnProfile ? h('div', { className: 'lbs-banner' }, [
        'These stats are based on the 50 most recent entries from ',
        h('strong', { text: username }),
        "'s public activity. Stats may be incomplete.",
      ]) : null,
      isOwnProfile ? buildSettingsPanel() : null,
      isOwnProfile ? buildFilterBar() : null,
      h('div', { className: 'lbs-body' }, [buildTabs(), sectionContent]),
    ];

    setChildren(panel, children);

    if (sectionContent) {
      renderActiveSection(sectionContent);
    }

    panel.querySelectorAll('.lbs-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    if (isOwnProfile) {
      // Filter toggle
      const filterToggle = panel.querySelector('#lbs-filter-toggle');
      if (filterToggle) {
        filterToggle.addEventListener('click', () => {
          filtersVisible = !filtersVisible;
          render();
        });
      }

      // Filter selects
      const yearSel = panel.querySelector('#lbs-filter-year');
      const decadeSel = panel.querySelector('#lbs-filter-decade');
      const genreSel = panel.querySelector('#lbs-filter-genre');
      const languageSel = panel.querySelector('#lbs-filter-language');

      if (yearSel) {
        yearSel.addEventListener('change', () => {
          filters.yearWatched = yearSel.value || null;
          filteredFilms = filterFilms(allFilms, filters);
          render();
        });
      }
      if (decadeSel) {
        decadeSel.addEventListener('change', () => {
          filters.decade = decadeSel.value || null;
          filteredFilms = filterFilms(allFilms, filters);
          render();
        });
      }
      if (genreSel) {
        genreSel.addEventListener('change', () => {
          filters.genre = genreSel.value || null;
          filteredFilms = filterFilms(allFilms, filters);
          render();
        });
      }
      if (languageSel) {
        languageSel.addEventListener('change', () => {
          filters.language = languageSel.value || null;
          filteredFilms = filterFilms(allFilms, filters);
          render();
        });
      }

      panel.querySelectorAll('.lbs-filter-pill-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.filter;
          delete filters[key];
          filteredFilms = filterFilms(allFilms, filters);
          render();
        });
      });

      // Clear all filters
      const clearBtn = panel.querySelector('#lbs-clear-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          filters = {};
          filteredFilms = allFilms;
          render();
        });
      }

      // Settings toggle
      const settingsToggle = panel.querySelector('#lbs-settings-toggle');
      if (settingsToggle) {
        settingsToggle.addEventListener('click', () => {
          settingsVisible = !settingsVisible;
          render();
        });
      }

      const suFilmsMap = new Map();
      let suDiaryEntries = [];

      function suShowStep(n) {
        [1, 2, 3, 4].forEach(i => {
          panel.querySelector(`#lbs-su-step-${i}`).classList.toggle('hidden', i !== n);
        });
      }

      // Step 1: watched.csv
      bindDropZone(panel, 'lbs-su-drop-1', 'lbs-su-input-1', async file => {
        const status = panel.querySelector('#lbs-su-status-1');
        try {
          const { films } = parseLetterboxdCSV(await readCSV(file));
          mergeFilmsIntoMap(films, suFilmsMap);
          setChildren(status, [h('span', { className: 'lbs-step-ok', text: `✓ ${films.length} films loaded` })]);
          setTimeout(() => suShowStep(2), 800);
        } catch (err) {
          setChildren(status, [h('span', { style: 'color:#e74c3c', text: `Parse error: ${err.message}` })]);
        }
      });

      // Step 2: ratings.csv
      bindDropZone(panel, 'lbs-su-drop-2', 'lbs-su-input-2', async file => {
        const status = panel.querySelector('#lbs-su-status-2');
        try {
          const { films } = parseLetterboxdCSV(await readCSV(file));
          const before = suFilmsMap.size;
          mergeFilmsIntoMap(films, suFilmsMap);
          const rated = films.filter(f => f.rating !== null).length;
          const added = suFilmsMap.size - before;
          const msg = `✓ Ratings for ${rated} films${added ? `, ${added} new` : ''}`;
          setChildren(status, [h('span', { className: 'lbs-step-ok', text: msg })]);
          setTimeout(() => suShowStep(3), 800);
        } catch (err) {
          setChildren(status, [h('span', { style: 'color:#e74c3c', text: `Parse error: ${err.message}` })]);
        }
      });
      panel.querySelector('#lbs-su-skip-2').addEventListener('click', () => suShowStep(3));

      // Step 3: diary.csv
      bindDropZone(panel, 'lbs-su-drop-3', 'lbs-su-input-3', async file => {
        const status = panel.querySelector('#lbs-su-status-3');
        try {
          const { films, diaryEntries } = parseLetterboxdCSV(await readCSV(file));
          mergeFilmsIntoMap(films, suFilmsMap);
          suDiaryEntries = suDiaryEntries.concat(diaryEntries);
          const msg = `✓ ${films.length} films, ${diaryEntries.length} diary entries`;
          setChildren(status, [h('span', { className: 'lbs-step-ok', text: msg })]);
          setTimeout(() => suShowStep(4), 800);
        } catch (err) {
          setChildren(status, [h('span', { style: 'color:#e74c3c', text: `Parse error: ${err.message}` })]);
        }
      });
      panel.querySelector('#lbs-su-skip-3').addEventListener('click', () => suShowStep(4));

      // Step 4: enrich
      const settingsEnrichBtn = panel.querySelector('#lbs-settings-enrich-btn');
      const settingsProgressWrap = panel.querySelector('#lbs-settings-progress-wrap');
      const settingsProgressBar = panel.querySelector('#lbs-settings-progress-bar');
      const settingsEnrichStatus = panel.querySelector('#lbs-settings-enrich-status');

      if (settingsEnrichBtn) {
        settingsEnrichBtn.addEventListener('click', async () => {
          settingsEnrichBtn.disabled = true;
          settingsEnrichBtn.textContent = 'Enriching...';
          settingsProgressWrap.style.display = 'block';
          clear(settingsEnrichStatus);
          try {
            const enriched = await enrichFilms([...suFilmsMap.values()], (done, total) => {
              settingsProgressBar.style.width = Math.round((done / total) * 100) + '%';
              setChildren(settingsEnrichStatus, [h('span', { style: 'color:var(--lbs-text-muted)', text: `${done} / ${total}` })]);
            });
            await upsertFilms(enriched);
            await upsertDiaryEntries(suDiaryEntries);
            await chrome.storage.local.set({ onboarded: true, last_full_sync: new Date().toISOString(), cast_data_version: ENRICHMENT_DATA_VERSION, date_data_version: DATE_DATA_VERSION });
            settings.cast_data_version = ENRICHMENT_DATA_VERSION;
            settings.date_data_version = DATE_DATA_VERSION;
            setChildren(settingsEnrichStatus, [h('span', { style: 'color:var(--lbs-green)', text: 'Done! Reloading stats...' })]);
            const refreshed = await getAllFilms();
            allFilms = refreshed;
            filteredFilms = filterFilms(allFilms, filters);
            settingsVisible = false;
            render();
          } catch (err) {
            setChildren(settingsEnrichStatus, [h('span', { style: 'color:#e74c3c', text: `Error: ${err.message}` })]);
            settingsEnrichBtn.disabled = false;
            settingsEnrichBtn.textContent = 'Retry';
          }
        });
      }

      // "update now" hint link — triggers the same full re-enrich as shift+click Sync
      const updateHintLink = panel.querySelector('#lbs-update-hint-link');
      if (updateHintLink) {
        updateHintLink.addEventListener('click', () => {
          panel.querySelector('#lbs-sync-btn')?.dispatchEvent(
            new MouseEvent('click', { shiftKey: true, bubbles: true })
          );
        });
      }

      // Sync button
      const syncBtn = panel.querySelector('#lbs-sync-btn');
      if (syncBtn) {
        syncBtn.addEventListener('click', async (e) => {
          const isFullSync = e.shiftKey;
          syncBtn.classList.add('lbs-btn--spinning');
          syncBtn.textContent = isFullSync ? 'Full Sync' : 'Syncing';
          syncBtn.disabled = true;

          try {
            if (isFullSync) {
              // Re-enrich every film from scratch (not just unenriched ones) so
              // fixes to TMDB extraction (e.g. cast list size) reach existing data.
              const films = await getAllFilms();
              if (films.length) {
                const reEnriched = await enrichFilms(films, null);
                await upsertFilms(reEnriched);
                await chrome.storage.local.set({ cast_data_version: ENRICHMENT_DATA_VERSION });
                settings.cast_data_version = ENRICHMENT_DATA_VERSION;

                // Local-only correction: recompute first_watched/last_watched from
                // diary entries, clearing out dates that a past bug pulled from
                // ratings.csv/watched.csv's log date instead of a real watched date.
                await correctWatchDates(await getAllFilms());
                await chrome.storage.local.set({ date_data_version: DATE_DATA_VERSION });
                settings.date_data_version = DATE_DATA_VERSION;
              }
            }
            const result = await syncRSS(username);
            if (result.added > 0 && typeof callbacks.onNewFilms === 'function') {
              callbacks.onNewFilms(result.added);
            }
          } catch (err) {
            console.warn('[LBS] Sync error', err);
          }

          allFilms = await getAllFilms();
          filteredFilms = filterFilms(allFilms, filters);

          syncBtn.classList.remove('lbs-btn--spinning');
          syncBtn.disabled = false;
          render();
        });
      }

    }
  }

  render();
}

export function showToast(shadow, message) {
  const existing = shadow.querySelector('.lbs-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'lbs-toast';
  toast.textContent = message;
  shadow.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}
