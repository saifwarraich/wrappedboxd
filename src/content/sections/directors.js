import { computeTopDirectors } from '../../lib/stats.js';
import { openFilmModal } from '../modal.js';

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function renderPersonGrid(people, allFilms, container, entityType) {
  const gridId = `lbs-${entityType}-grid`;
  let showAll = false;
  const INITIAL_LIMIT = 10;
  const EXPANDED_LIMIT = 25;
  let sortBy = 'count';

  function renderGrid() {
    const sorted = [...people].sort((a, b) =>
      sortBy === 'avgRating' ? (b.avgRating || 0) - (a.avgRating || 0) : b.count - a.count
    );
    const shown = sorted.slice(0, showAll ? EXPANDED_LIMIT : INITIAL_LIMIT);

    return shown.map(person => `
      <div class="lbs-person-card" data-name="${person.name}" style="cursor:pointer">
        <div class="lbs-person-photo">
          ${person.photo
            ? `<img src="${person.photo}" alt="${person.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <div class="lbs-person-initials" style="${person.photo ? 'display:none' : ''}">
            ${getInitials(person.name)}
          </div>
        </div>
        <div class="lbs-person-info">
          <div class="lbs-person-name">${person.name}</div>
          <div class="lbs-person-count">${person.count} film${person.count !== 1 ? 's' : ''}</div>
          ${person.avgRating !== null ? `<div class="lbs-person-rating">★ ${person.avgRating.toFixed(1)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  function render() {
    const hasMore = people.length > INITIAL_LIMIT;
    container.innerHTML = `
      <div class="lbs-section-header-row">
        <div class="lbs-sort-controls">
          <span class="lbs-sort-label">Sort:</span>
          <button class="lbs-sort-btn ${sortBy === 'count' ? 'active' : ''}" data-sort="count">By count</button>
          <button class="lbs-sort-btn ${sortBy === 'avgRating' ? 'active' : ''}" data-sort="avgRating">By rating</button>
        </div>
      </div>
      <div class="lbs-person-grid" id="${gridId}">${renderGrid()}</div>
      ${hasMore ? `
        <div class="lbs-show-more-row">
          <button class="lbs-show-more-btn" id="lbs-${entityType}-toggle">
            ${showAll ? 'Show less' : `Show more (${Math.min(EXPANDED_LIMIT, people.length)} total)`}
          </button>
        </div>
      ` : ''}
    `;

    container.querySelectorAll('.lbs-sort-btn').forEach(btn => {
      btn.addEventListener('click', () => { sortBy = btn.dataset.sort; render(); });
    });

    const toggleBtn = container.querySelector(`#lbs-${entityType}-toggle`);
    if (toggleBtn) toggleBtn.addEventListener('click', () => { showAll = !showAll; render(); });

    container.querySelectorAll('.lbs-person-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.name;
        const films = allFilms.filter(f => f.director === name);
        const shadow = card.getRootNode();
        openFilmModal(shadow, name, films);
      });
    });
  }

  render();
}

export function renderDirectors(films, container) {
  const directors = computeTopDirectors(films, 25);
  if (!directors.length) {
    container.innerHTML = `<div class="lbs-empty-state">No director data available. Enrich your films with TMDB to see director stats.</div>`;
    return;
  }
  renderPersonGrid(directors, films, container, 'directors');
}
