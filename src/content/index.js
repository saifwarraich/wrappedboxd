import { initDB, getAllFilms, getFilmCount, getAllDiaryEntries, upsertFilms } from '../lib/db.js';
import { fetchRSS, syncRSS } from '../lib/rss.js';
import { enrichFilms, ENRICHMENT_DATA_VERSION } from '../lib/tmdb.js';
import {
  injectPanel,
  renderLoadingState,
  renderOnboarding,
  renderFullPanel,
  renderErrorState,
  showToast,
} from './panel.js';

console.log('[LBS] Letterboxd Stats extension loaded');

// Only run on profile pages: letterboxd.com/{username} or letterboxd.com/{username}/
function getProfileUsername() {
  const url = window.location.href;
  const match = url.match(/^https:\/\/letterboxd\.com\/([a-zA-Z0-9_-]+)\/?(?:\?.*)?(?:#.*)?$/);
  if (!match) return null;
  const username = match[1];
  // Exclude known non-profile paths
  const excluded = ['films', 'lists', 'members', 'journal', 'activity', 'signin', 'create-account', 'settings', 'genre', 'film', 'director', 'actor'];
  if (excluded.includes(username.toLowerCase())) return null;
  return username;
}

function getOwnUsernameFromDOM() {
  // Avatar img alt contains the username directly
  const avatar = document.querySelector('.nav-account img[alt]');
  if (avatar) return avatar.getAttribute('alt');
  return null;
}

async function main() {
  const username = getProfileUsername();
  if (!username) return; // Not a profile page

  console.log('[LBS] Profile page detected, username:', username);

  // Get settings
  let settings;
  try {
    settings = await chrome.storage.local.get([
      'own_username',
      'last_rss_sync',
      'last_full_sync',
      'onboarded',
      'cast_data_version',
    ]);
  } catch (err) {
    console.warn('[LBS] chrome.storage unavailable', err);
    settings = {};
  }

  // If own_username not set, detect from DOM
  if (!settings.own_username) {
    const detectedUsername = getOwnUsernameFromDOM();
    if (detectedUsername) {
      settings.own_username = detectedUsername;
      try {
        await chrome.storage.local.set({ own_username: detectedUsername });
      } catch (e) {
        // ignore
      }
    }
  }

  const isOwnProfile = settings.own_username &&
    settings.own_username.toLowerCase() === username.toLowerCase();

  if (!isOwnProfile) return;

  const { host, shadow, panel } = injectPanel();
  await handleOwnProfile(panel, shadow, username, settings);
}

async function handleOwnProfile(panel, shadow, username, settings) {
  // Show loading state immediately
  renderLoadingState(panel);

  let db;
  let dbAvailable = true;
  try {
    db = await initDB();
  } catch (err) {
    dbAvailable = false;
    console.warn('[LBS] IndexedDB unavailable, using in-memory mode:', err);
    // Show warning but continue
    const warning = document.createElement('div');
    warning.className = 'lbs-warning';
    warning.textContent = 'IndexedDB is unavailable. Stats will not be persisted between sessions.';
    panel.querySelector('.lbs-panel')?.appendChild(warning);
  }

  const filmCount = dbAvailable ? await getFilmCount() : 0;

  // Onboarding: not yet set up
  if (!settings.onboarded || filmCount === 0) {
    renderOnboarding(panel, {
      onEnrich: async (enrichedFilms) => {
        settings.onboarded = true;
        settings.cast_data_version = ENRICHMENT_DATA_VERSION;
        await loadAndShowStats(panel, shadow, username, settings, enrichedFilms);
      },
    });
    return;
  }

  // Load films from IndexedDB
  let allFilms = [];
  try {
    allFilms = await getAllFilms();
  } catch (err) {
    console.warn('[LBS] Failed to load films:', err);
    renderErrorState(panel, 'Failed to load your film data. Please try refreshing the page.');
    return;
  }

  await loadAndShowStats(panel, shadow, username, settings, allFilms);
}

async function loadAndShowStats(panel, shadow, username, settings, initialFilms) {
  let allFilms = initialFilms;
  let allDiaryEntries = [];
  try { allDiaryEntries = await getAllDiaryEntries(); } catch (e) { /* non-fatal */ }

  renderFullPanel(panel, allFilms, allDiaryEntries, true, username, settings, {
    onNewFilms: (count) => {
      showToast(shadow, `↻ ${count} new film${count !== 1 ? 's' : ''} synced`);
      Promise.all([getAllFilms(), getAllDiaryEntries()]).then(([films, entries]) => {
        allFilms = films;
        allDiaryEntries = entries;
        renderFullPanel(panel, allFilms, allDiaryEntries, true, username, settings, {});
      });
    },
    onUploadCSV: () => {
      renderOnboarding(panel, {
        onEnrich: async (enrichedFilms) => {
          settings.onboarded = true;
          settings.cast_data_version = ENRICHMENT_DATA_VERSION;
          await loadAndShowStats(panel, shadow, username, settings, enrichedFilms);
        },
      });
    },
  });

  // One-time background migration: if TMDB extraction logic changed since this
  // user's films were last enriched (e.g. cast list used to be truncated to
  // top 5), silently re-enrich everything once and bump cast_data_version so
  // it never runs again.
  if (settings.cast_data_version !== ENRICHMENT_DATA_VERSION && allFilms.length > 0) {
    try {
      const reEnriched = await enrichFilms(allFilms, null);
      await upsertFilms(reEnriched);
      await chrome.storage.local.set({ cast_data_version: ENRICHMENT_DATA_VERSION });
      settings.cast_data_version = ENRICHMENT_DATA_VERSION;

      allFilms = await getAllFilms();
      renderFullPanel(panel, allFilms, allDiaryEntries, true, username, settings, {
        onNewFilms: (count) => {
          showToast(shadow, `↻ ${count} new film${count !== 1 ? 's' : ''} synced`);
        },
        onUploadCSV: () => {},
      });
      showToast(shadow, '✓ Refreshed your film data');
    } catch (err) {
      console.warn('[LBS] Background enrichment-data migration failed:', err);
    }
  }

  // Background RSS sync
  try {
    const result = await syncRSS(username);
    if (result.added > 0) {
      const refreshedFilms = await getAllFilms();
      renderFullPanel(panel, refreshedFilms, true, username, settings, {
        onNewFilms: (count) => {
          showToast(shadow, `↻ ${count} new film${count !== 1 ? 's' : ''} synced`);
        },
        onUploadCSV: () => {},
      });
      showToast(shadow, `↻ ${result.added} new film${result.added !== 1 ? 's' : ''} synced`);
      // Update last_rss_sync
      const updatedSettings = await chrome.storage.local.get(['last_rss_sync']);
      settings.last_rss_sync = updatedSettings.last_rss_sync;
    }
  } catch (err) {
    console.warn('[LBS] Background sync failed:', err);
  }
}

async function handleOtherProfile(panel, shadow, username, settings) {
  renderLoadingState(panel);

  let rssFilms = [];
  try {
    rssFilms = await fetchRSS(username);
  } catch (err) {
    console.warn('[LBS] Failed to fetch RSS for', username, err);
    // Show panel with empty data + banner
  }

  renderFullPanel(panel, rssFilms, false, username, settings, {});
}

// Run
main().catch(err => {
  console.error('[LBS] Fatal error:', err);
});
