import { computeTopDirectors } from '../../lib/stats.js';
import { renderPersonGrid } from './personGrid.js';
import { setEmptyState } from '../dom.js';

export function renderDirectors(films, container) {
  const directors = computeTopDirectors(films, 25);
  if (!directors.length) {
    setEmptyState(container, 'No director data available. Enrich your films with TMDB to see director stats.');
    return;
  }
  renderPersonGrid(directors, films, container, 'directors', (allFilms, name) =>
    allFilms.filter(f => f.director === name)
  );
}
