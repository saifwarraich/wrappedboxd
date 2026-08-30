const MODAL_STYLES = `
  .lbs-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 99998;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: lbs-fadein 0.15s ease;
  }

  .lbs-modal {
    background: #1c2228;
    border-radius: 8px;
    width: 100%;
    max-width: 560px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    animation: lbs-slidein 0.15s ease;
  }

  @keyframes lbs-slidein {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .lbs-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #2a3440;
    flex-shrink: 0;
  }

  .lbs-modal-title {
    font-size: 15px;
    font-weight: 700;
    color: #fff;
  }

  .lbs-modal-count {
    font-size: 12px;
    color: #678;
    margin-left: 8px;
    font-weight: 400;
  }

  .lbs-modal-close {
    background: none;
    border: none;
    color: #678;
    font-size: 20px;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;
  }

  .lbs-modal-close:hover { color: #fff; }

  .lbs-modal-body {
    overflow-y: auto;
    flex: 1;
    padding: 8px 0;
  }

  .lbs-film-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    border-bottom: 1px solid #1c2228;
    transition: background 0.1s;
  }

  .lbs-film-row:hover { background: #242c36; }
  .lbs-film-row--link { cursor: pointer; }
  .lbs-film-row--link:hover .lbs-film-title { color: #00e054; }

  .lbs-film-poster {
    width: 32px;
    height: 48px;
    border-radius: 3px;
    object-fit: cover;
    flex-shrink: 0;
    background: #242c36;
  }

  .lbs-film-poster-placeholder {
    width: 32px;
    height: 48px;
    border-radius: 3px;
    background: #242c36;
    flex-shrink: 0;
  }

  .lbs-film-info { flex: 1; min-width: 0; }

  .lbs-film-title {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lbs-film-meta {
    font-size: 11px;
    color: #678;
    margin-top: 2px;
  }

  .lbs-film-rating {
    font-size: 13px;
    color: #00e054;
    flex-shrink: 0;
  }
`;

const EXTENDED_STYLES = `
  .lbs-diary-date {
    font-size: 11px;
    color: #678;
    margin-top: 2px;
  }

  .lbs-rewatch-badge {
    font-size: 10px;
    color: #ff8000;
    margin-left: 6px;
    font-weight: 600;
  }

  .lbs-country-row {
    padding: 10px 20px;
    border-bottom: 1px solid #1c2228;
    cursor: pointer;
    user-select: none;
  }

  .lbs-country-row:hover { background: #242c36; }

  .lbs-country-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .lbs-country-name {
    font-size: 13px;
    font-weight: 600;
    color: #fff;
  }

  .lbs-country-right {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #678;
    font-size: 12px;
  }

  .lbs-country-chevron {
    font-size: 10px;
    transition: transform 0.15s;
  }

  .lbs-country-films {
    display: none;
    padding: 4px 0 4px 12px;
  }

  .lbs-country-films.open { display: block; }

  .lbs-country-film-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
  }

  .lbs-country-film-item:hover { background: #1c2228; }
  .lbs-country-film-item:hover .lbs-film-title { color: #00e054; }
`;

import { h, append } from './dom.js';

let styleInjected = false;

function filmYearSpan(f) {
  return f.year ? h('span', { style: 'color:#678;font-weight:400', text: ` ${f.year}` }) : null;
}

function filmPosterEl(className, f) {
  return f.poster
    ? h('img', { className, src: f.poster, alt: f.name || '', loading: 'lazy' })
    : h('div', { className: `${className}-placeholder` });
}

function ratingText(rating) {
  return rating ? `★ ${rating.toFixed(1)}` : '—';
}

function buildFilmRow(f) {
  const row = h('div', { className: `lbs-film-row ${f.letterboxd_uri ? 'lbs-film-row--link' : ''}` }, [
    filmPosterEl('lbs-film-poster', f),
    h('div', { className: 'lbs-film-info' }, [
      h('div', { className: 'lbs-film-title' }, [escapeText(f.name), filmYearSpan(f)]),
      h('div', { className: 'lbs-film-meta', text: f.last_watched || '' }),
    ]),
    h('div', { className: 'lbs-film-rating', text: ratingText(f.rating) }),
  ]);
  if (f.letterboxd_uri) {
    row.addEventListener('click', () => window.open(f.letterboxd_uri, '_blank', 'noopener'));
  }
  return row;
}

function buildDiaryRow(e, film) {
  const titleChildren = [escapeText(film.name || e.letterboxd_id), filmYearSpan(film)];
  if (e.rewatch) titleChildren.push(h('span', { className: 'lbs-rewatch-badge', text: '↩ rewatch' }));

  const row = h('div', { className: `lbs-film-row ${film.letterboxd_uri ? 'lbs-film-row--link' : ''}` }, [
    filmPosterEl('lbs-film-poster', film),
    h('div', { className: 'lbs-film-info' }, [
      h('div', { className: 'lbs-film-title' }, titleChildren),
      h('div', { className: 'lbs-diary-date', text: e.watched_date || '' }),
    ]),
    h('div', { className: 'lbs-film-rating', text: ratingText(e.rating) }),
  ]);
  if (film.letterboxd_uri) {
    row.addEventListener('click', () => window.open(film.letterboxd_uri, '_blank', 'noopener'));
  }
  return row;
}

function buildGroupedFilmItem(f) {
  const item = h('div', { className: `lbs-country-film-item ${f.letterboxd_uri ? 'lbs-film-row--link' : ''}` }, [
    filmPosterEl('lbs-film-poster', f),
    h('div', { className: 'lbs-film-info' }, [
      h('div', { className: 'lbs-film-title' }, [escapeText(f.name), filmYearSpan(f)]),
    ]),
    h('div', { className: 'lbs-film-rating', text: ratingText(f.rating) }),
  ]);
  if (f.letterboxd_uri) {
    item.addEventListener('click', e => {
      e.stopPropagation();
      window.open(f.letterboxd_uri, '_blank', 'noopener');
    });
  }
  return item;
}

function buildGroupedRow(name, items, idPrefix, i) {
  const sortedItems = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const filmsList = h('div', { className: 'lbs-country-films', id: `lbs-${idPrefix}-${i}` });
  for (const f of sortedItems) filmsList.append(buildGroupedFilmItem(f));

  const chevron = h('span', { className: 'lbs-country-chevron', text: '▶' });
  const row = h('div', { className: 'lbs-country-row' }, [
    h('div', { className: 'lbs-country-header' }, [
      h('span', { className: 'lbs-country-name', text: name }),
      h('span', { className: 'lbs-country-right' }, [
        h('span', { text: `${items.length} film${items.length !== 1 ? 's' : ''}` }),
        chevron,
      ]),
    ]),
    filmsList,
  ]);
  row.addEventListener('click', () => {
    const open = filmsList.classList.toggle('open');
    chevron.style.transform = open ? 'rotate(90deg)' : '';
  });
  return row;
}

function escapeText(value) {
  return document.createTextNode(value == null ? '' : String(value));
}

function buildModalShell(titleText, countText, bodyChildren) {
  const backdrop = h('div', { className: 'lbs-modal-backdrop' });
  const closeBtn = h('button', { className: 'lbs-modal-close', text: '✕' });
  const body = h('div', { className: 'lbs-modal-body' });
  append(body, bodyChildren);

  const modal = h('div', { className: 'lbs-modal' }, [
    h('div', { className: 'lbs-modal-header' }, [
      h('div', { className: 'lbs-modal-title' }, [
        escapeText(titleText),
        h('span', { className: 'lbs-modal-count', text: countText }),
      ]),
      closeBtn,
    ]),
    body,
  ]);
  backdrop.append(modal);

  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  closeBtn.addEventListener('click', () => backdrop.remove());

  return backdrop;
}

function ensureStyles(shadowRoot) {
  if (!styleInjected) {
    const style = document.createElement('style');
    style.textContent = MODAL_STYLES + EXTENDED_STYLES;
    shadowRoot.appendChild(style);
    styleInjected = true;
  }
}


export function openFilmModal(shadowRoot, title, films) {
  ensureStyles(shadowRoot);

  // Remove any existing modal
  shadowRoot.querySelector('.lbs-modal-backdrop')?.remove();

  const sorted = [...films].sort((a, b) => {
    if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
    return (b.last_watched || '').localeCompare(a.last_watched || '');
  });

  const backdrop = buildModalShell(
    title,
    `${films.length} film${films.length !== 1 ? 's' : ''}`,
    sorted.map(buildFilmRow)
  );

  shadowRoot.appendChild(backdrop);
}

export function openDiaryModal(shadowRoot, diaryEntries, filmsMap) {
  ensureStyles(shadowRoot);
  shadowRoot.querySelector('.lbs-modal-backdrop')?.remove();

  const sorted = [...diaryEntries].sort((a, b) =>
    (b.watched_date || '').localeCompare(a.watched_date || '')
  );

  const backdrop = buildModalShell(
    'Films Logged',
    `${sorted.length} entr${sorted.length !== 1 ? 'ies' : 'y'}`,
    sorted.map(e => buildDiaryRow(e, filmsMap.get(e.letterboxd_id) || {}))
  );

  shadowRoot.appendChild(backdrop);
}

export function openLanguagesModal(shadowRoot, films) {
  ensureStyles(shadowRoot);
  shadowRoot.querySelector('.lbs-modal-backdrop')?.remove();

  // Group by each film's original (primary) language
  const languageMap = new Map();
  for (const film of films) {
    if (!film.original_language) continue;
    if (!languageMap.has(film.original_language)) languageMap.set(film.original_language, []);
    languageMap.get(film.original_language).push(film);
  }
  const languages = [...languageMap.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  const backdrop = buildModalShell(
    'Languages',
    `${languages.length} language${languages.length !== 1 ? 's' : ''}`,
    languages.map(([language, languageFilms], i) => buildGroupedRow(language, languageFilms, 'lf', i))
  );

  shadowRoot.appendChild(backdrop);
}

export function openCountriesModal(shadowRoot, films) {
  ensureStyles(shadowRoot);
  shadowRoot.querySelector('.lbs-modal-backdrop')?.remove();

  // Group by country — a film with multiple countries appears under each
  const countryMap = new Map();
  for (const film of films) {
    for (const country of (film.origin_country || [])) {
      if (!countryMap.has(country)) countryMap.set(country, []);
      countryMap.get(country).push(film);
    }
  }
  const countries = [...countryMap.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  const backdrop = buildModalShell(
    'Countries',
    `${countries.length} countr${countries.length !== 1 ? 'ies' : 'y'}`,
    countries.map(([code, countryFilms], i) => buildGroupedRow(code, countryFilms, 'cf', i))
  );

  shadowRoot.appendChild(backdrop);
}
