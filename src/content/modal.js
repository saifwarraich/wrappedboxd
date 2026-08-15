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

import { escapeHtml } from '../lib/escape.js';

let styleInjected = false;

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

  const backdrop = document.createElement('div');
  backdrop.className = 'lbs-modal-backdrop';

  const sorted = [...films].sort((a, b) => {
    if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
    return (b.last_watched || '').localeCompare(a.last_watched || '');
  });

  backdrop.innerHTML = `
    <div class="lbs-modal">
      <div class="lbs-modal-header">
        <div class="lbs-modal-title">
          ${escapeHtml(title)}
          <span class="lbs-modal-count">${films.length} film${films.length !== 1 ? 's' : ''}</span>
        </div>
        <button class="lbs-modal-close">✕</button>
      </div>
      <div class="lbs-modal-body">
        ${sorted.map(f => `
          <div class="lbs-film-row ${f.letterboxd_uri ? 'lbs-film-row--link' : ''}" ${f.letterboxd_uri ? `data-uri="${escapeHtml(f.letterboxd_uri)}"` : ''}>
            ${f.poster
              ? `<img class="lbs-film-poster" src="${escapeHtml(f.poster)}" alt="${escapeHtml(f.name)}" loading="lazy">`
              : `<div class="lbs-film-poster-placeholder"></div>`
            }
            <div class="lbs-film-info">
              <div class="lbs-film-title">${escapeHtml(f.name)}${f.year ? ` <span style="color:#678;font-weight:400">${f.year}</span>` : ''}</div>
              <div class="lbs-film-meta">${escapeHtml(f.last_watched || '')}</div>
            </div>
            <div class="lbs-film-rating">${f.rating ? '★ ' + f.rating.toFixed(1) : '—'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.remove();
  });
  backdrop.querySelector('.lbs-modal-close').addEventListener('click', () => backdrop.remove());

  backdrop.querySelectorAll('.lbs-film-row--link').forEach(row => {
    row.addEventListener('click', () => {
      window.open(row.dataset.uri, '_blank', 'noopener');
    });
  });

  shadowRoot.appendChild(backdrop);
}

export function openDiaryModal(shadowRoot, diaryEntries, filmsMap) {
  ensureStyles(shadowRoot);
  shadowRoot.querySelector('.lbs-modal-backdrop')?.remove();

  const sorted = [...diaryEntries].sort((a, b) =>
    (b.watched_date || '').localeCompare(a.watched_date || '')
  );

  const backdrop = document.createElement('div');
  backdrop.className = 'lbs-modal-backdrop';
  backdrop.innerHTML = `
    <div class="lbs-modal">
      <div class="lbs-modal-header">
        <div class="lbs-modal-title">
          Films Logged
          <span class="lbs-modal-count">${sorted.length} entr${sorted.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        <button class="lbs-modal-close">✕</button>
      </div>
      <div class="lbs-modal-body">
        ${sorted.map(e => {
          const film = filmsMap.get(e.letterboxd_id) || {};
          return `
            <div class="lbs-film-row ${film.letterboxd_uri ? 'lbs-film-row--link' : ''}" ${film.letterboxd_uri ? `data-uri="${escapeHtml(film.letterboxd_uri)}"` : ''}>
              ${film.poster
                ? `<img class="lbs-film-poster" src="${escapeHtml(film.poster)}" alt="${escapeHtml(film.name || '')}" loading="lazy">`
                : `<div class="lbs-film-poster-placeholder"></div>`
              }
              <div class="lbs-film-info">
                <div class="lbs-film-title">
                  ${escapeHtml(film.name || e.letterboxd_id)}${film.year ? ` <span style="color:#678;font-weight:400">${film.year}</span>` : ''}
                  ${e.rewatch ? '<span class="lbs-rewatch-badge">↩ rewatch</span>' : ''}
                </div>
                <div class="lbs-diary-date">${escapeHtml(e.watched_date || '')}</div>
              </div>
              <div class="lbs-film-rating">${e.rating ? '★ ' + e.rating.toFixed(1) : '—'}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('.lbs-modal-close').addEventListener('click', () => backdrop.remove());
  backdrop.querySelectorAll('.lbs-film-row--link').forEach(row => {
    row.addEventListener('click', () => window.open(row.dataset.uri, '_blank', 'noopener'));
  });
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

  const backdrop = document.createElement('div');
  backdrop.className = 'lbs-modal-backdrop';
  backdrop.innerHTML = `
    <div class="lbs-modal">
      <div class="lbs-modal-header">
        <div class="lbs-modal-title">
          Languages
          <span class="lbs-modal-count">${languages.length} language${languages.length !== 1 ? 's' : ''}</span>
        </div>
        <button class="lbs-modal-close">✕</button>
      </div>
      <div class="lbs-modal-body">
        ${languages.map(([language, languageFilms], i) => `
          <div class="lbs-country-row" data-idx="${i}">
            <div class="lbs-country-header">
              <span class="lbs-country-name">${escapeHtml(language)}</span>
              <span class="lbs-country-right">
                <span>${languageFilms.length} film${languageFilms.length !== 1 ? 's' : ''}</span>
                <span class="lbs-country-chevron">▶</span>
              </span>
            </div>
            <div class="lbs-country-films" id="lbs-lf-${i}">
              ${[...languageFilms].sort((a, b) => (b.rating || 0) - (a.rating || 0)).map(f => `
                <div class="lbs-country-film-item ${f.letterboxd_uri ? 'lbs-film-row--link' : ''}" ${f.letterboxd_uri ? `data-uri="${escapeHtml(f.letterboxd_uri)}"` : ''}>
                  ${f.poster
                    ? `<img class="lbs-film-poster" src="${escapeHtml(f.poster)}" alt="${escapeHtml(f.name)}" loading="lazy">`
                    : `<div class="lbs-film-poster-placeholder"></div>`
                  }
                  <div class="lbs-film-info">
                    <div class="lbs-film-title">${escapeHtml(f.name)}${f.year ? ` <span style="color:#678;font-weight:400">${f.year}</span>` : ''}</div>
                  </div>
                  <div class="lbs-film-rating">${f.rating ? '★ ' + f.rating.toFixed(1) : '—'}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('.lbs-modal-close').addEventListener('click', () => backdrop.remove());

  backdrop.querySelectorAll('.lbs-country-row').forEach(row => {
    row.addEventListener('click', () => {
      const list = row.querySelector('.lbs-country-films');
      const chevron = row.querySelector('.lbs-country-chevron');
      const open = list.classList.toggle('open');
      chevron.style.transform = open ? 'rotate(90deg)' : '';
    });
  });

  backdrop.querySelectorAll('.lbs-film-row--link').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      window.open(row.dataset.uri, '_blank', 'noopener');
    });
  });

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

  const backdrop = document.createElement('div');
  backdrop.className = 'lbs-modal-backdrop';
  backdrop.innerHTML = `
    <div class="lbs-modal">
      <div class="lbs-modal-header">
        <div class="lbs-modal-title">
          Countries
          <span class="lbs-modal-count">${countries.length} countr${countries.length !== 1 ? 'ies' : 'y'}</span>
        </div>
        <button class="lbs-modal-close">✕</button>
      </div>
      <div class="lbs-modal-body">
        ${countries.map(([code, countryFilms], i) => `
          <div class="lbs-country-row" data-idx="${i}">
            <div class="lbs-country-header">
              <span class="lbs-country-name">${escapeHtml(code)}</span>
              <span class="lbs-country-right">
                <span>${countryFilms.length} film${countryFilms.length !== 1 ? 's' : ''}</span>
                <span class="lbs-country-chevron">▶</span>
              </span>
            </div>
            <div class="lbs-country-films" id="lbs-cf-${i}">
              ${[...countryFilms].sort((a, b) => (b.rating || 0) - (a.rating || 0)).map(f => `
                <div class="lbs-country-film-item ${f.letterboxd_uri ? 'lbs-film-row--link' : ''}" ${f.letterboxd_uri ? `data-uri="${escapeHtml(f.letterboxd_uri)}"` : ''}>
                  ${f.poster
                    ? `<img class="lbs-film-poster" src="${escapeHtml(f.poster)}" alt="${escapeHtml(f.name)}" loading="lazy">`
                    : `<div class="lbs-film-poster-placeholder"></div>`
                  }
                  <div class="lbs-film-info">
                    <div class="lbs-film-title">${escapeHtml(f.name)}${f.year ? ` <span style="color:#678;font-weight:400">${f.year}</span>` : ''}</div>
                  </div>
                  <div class="lbs-film-rating">${f.rating ? '★ ' + f.rating.toFixed(1) : '—'}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('.lbs-modal-close').addEventListener('click', () => backdrop.remove());

  backdrop.querySelectorAll('.lbs-country-row').forEach(row => {
    row.addEventListener('click', () => {
      const list = row.querySelector('.lbs-country-films');
      const chevron = row.querySelector('.lbs-country-chevron');
      const open = list.classList.toggle('open');
      chevron.style.transform = open ? 'rotate(90deg)' : '';
    });
  });

  backdrop.querySelectorAll('.lbs-film-row--link').forEach(row => {
    row.addEventListener('click', e => {
      e.stopPropagation();
      window.open(row.dataset.uri, '_blank', 'noopener');
    });
  });

  shadowRoot.appendChild(backdrop);
}
