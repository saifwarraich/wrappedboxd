import { computeTopActors } from '../../lib/stats.js';
import { renderPersonGrid } from './personGrid.js';

export function renderActors(films, container) {
  const actors = computeTopActors(films, 25);
  if (!actors.length) {
    container.innerHTML = `<div class="lbs-empty-state">No cast data available. Enrich your films with TMDB to see actor stats.</div>`;
    return;
  }
  renderPersonGrid(actors, films, container, 'actors', (allFilms, name) =>
    allFilms.filter(f => f.cast?.some(c => c.name === name))
  );
}
