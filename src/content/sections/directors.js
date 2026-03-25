import { computeTopDirectors } from '../../lib/stats.js';
import { renderPersonGrid } from './personGrid.js';

export function renderDirectors(films, container) {
  const directors = computeTopDirectors(films, 25);
  if (!directors.length) {
    container.innerHTML = `<div class="lbs-empty-state">No director data available. Enrich your films with TMDB to see director stats.</div>`;
    return;
  }
  renderPersonGrid(directors, films, container, 'directors', (allFilms, name) =>
    allFilms.filter(f => f.director === name)
  );
}
