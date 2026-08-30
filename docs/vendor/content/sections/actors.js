import { computeTopActors } from '../../lib/stats.js';
import { renderPersonGrid } from './personGrid.js';
import { setEmptyState } from '../dom.js';

export function renderActors(films, container) {
  const actors = computeTopActors(films, 25);
  if (!actors.length) {
    setEmptyState(container, 'No cast data available. Enrich your films with TMDB to see actor stats.');
    return;
  }
  renderPersonGrid(actors, films, container, 'actors', (allFilms, name) =>
    allFilms.filter(f => f.cast?.some(c => c.name === name))
  );
}
