// Boots the real WrappedBoxd panel (unmodified extension source, in ./vendor/)
// against a curated slice of real Letterboxd export data, so the landing
// page's "live demo" is the actual extension UI, not a re-creation of it.
import { injectPanel, renderFullPanel, showToast } from './vendor/content/panel.js';
import { ENRICHMENT_DATA_VERSION } from './vendor/lib/tmdb.js';
import { DATE_DATA_VERSION } from './vendor/lib/db.js';

async function main() {
  const mount = document.getElementById('demoMount');

  let films, diaryEntries;
  try {
    const res = await fetch('./demo-data.json');
    const data = await res.json();
    films = data.films;
    diaryEntries = data.diary_entries;
  } catch (err) {
    mount.innerHTML = '<div class="demo-loading">Couldn’t load the demo data.</div>';
    console.error('[WrappedBoxd demo]', err);
    return;
  }

  mount.innerHTML = '';

  // injectPanel() looks for the nearest ".col-16" in the document (that's
  // where it mounts on a real Letterboxd profile) — #demoMount carries that
  // class so the unmodified extension code drops the panel in place here.
  const { shadow, panel } = injectPanel();

  const settings = {
    last_rss_sync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    cast_data_version: ENRICHMENT_DATA_VERSION,
    date_data_version: DATE_DATA_VERSION,
  };

  renderFullPanel(panel, films, diaryEntries, true, 'saifwarraich', settings, {});

  // This is a public demo with no backend, IndexedDB history, or chrome.storage
  // behind it, so the header action row (Filters/Sync/Settings) is inert here —
  // intercept those three before the real handlers (bound inside renderFullPanel)
  // run. Everything else — tabs, theme/genre/rating clicks, film modals — stays
  // wired exactly as shipped.
  const DISABLED_IDS = new Set(['lbs-filter-toggle', 'lbs-sync-btn', 'lbs-settings-toggle']);
  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && DISABLED_IDS.has(btn.id)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      showToast(shadow, 'This is a live demo. Install WrappedBoxd to use this on your own profile.');
    }
  }, true);
}

main();
