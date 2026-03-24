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

let styleInjected = false;

export function openFilmModal(shadowRoot, title, films) {
  // Inject styles once into the shadow root
  if (!styleInjected) {
    const style = document.createElement('style');
    style.textContent = MODAL_STYLES;
    shadowRoot.appendChild(style);
    styleInjected = true;
  }

  // Remove any existing modal
  shadowRoot.querySelector('.lbs-modal-backdrop')?.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'lbs-modal-backdrop';

  const sorted = [...films].sort((a, b) => {
    if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
    return (b.watched_date || '').localeCompare(a.watched_date || '');
  });

  backdrop.innerHTML = `
    <div class="lbs-modal">
      <div class="lbs-modal-header">
        <div class="lbs-modal-title">
          ${title}
          <span class="lbs-modal-count">${films.length} film${films.length !== 1 ? 's' : ''}</span>
        </div>
        <button class="lbs-modal-close">✕</button>
      </div>
      <div class="lbs-modal-body">
        ${sorted.map(f => `
          <div class="lbs-film-row ${f.letterboxd_uri ? 'lbs-film-row--link' : ''}" ${f.letterboxd_uri ? `data-uri="${f.letterboxd_uri}"` : ''}>
            ${f.poster
              ? `<img class="lbs-film-poster" src="${f.poster}" alt="${f.name}" loading="lazy">`
              : `<div class="lbs-film-poster-placeholder"></div>`
            }
            <div class="lbs-film-info">
              <div class="lbs-film-title">${f.name}${f.year ? ` <span style="color:#678;font-weight:400">${f.year}</span>` : ''}</div>
              <div class="lbs-film-meta">${f.watched_date || ''}</div>
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
