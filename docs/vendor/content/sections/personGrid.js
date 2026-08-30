import { openFilmModal } from '../modal.js';
import { h, setChildren } from '../dom.js';

export function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function renderPersonCard(person, onSelect) {
  const initials = h('div', {
    className: 'lbs-person-initials',
    text: getInitials(person.name),
  });
  if (person.photo) initials.style.display = 'none';

  const photo = h('div', { className: 'lbs-person-photo' });
  if (person.photo) {
    const img = h('img', { src: person.photo, alt: person.name, loading: 'lazy' });
    img.addEventListener('error', () => {
      img.style.display = 'none';
      initials.style.display = 'flex';
    });
    photo.append(img);
  }
  photo.append(initials);

  const info = h('div', { className: 'lbs-person-info' }, [
    h('div', { className: 'lbs-person-name', text: person.name }),
    h('div', { className: 'lbs-person-count', text: `${person.count} film${person.count !== 1 ? 's' : ''}` }),
    person.avgRating !== null ? h('div', { className: 'lbs-person-rating', text: `★ ${person.avgRating.toFixed(1)}` }) : null,
  ]);

  const card = h('div', { className: 'lbs-person-card', style: 'cursor:pointer' }, [photo, info]);
  card.addEventListener('click', () => onSelect(person.name));
  return card;
}

export function renderPersonGrid(people, allFilms, container, entityType, filterFn) {
  let showAll = false;
  const INITIAL_LIMIT = 10;
  const EXPANDED_LIMIT = 25;
  let sortBy = 'count';

  function onSelect(name) {
    const films = filterFn(allFilms, name);
    const shadow = container.getRootNode();
    openFilmModal(shadow, name, films);
  }

  function buildGrid() {
    const sorted = [...people].sort((a, b) =>
      sortBy === 'avgRating' ? (b.avgRating || 0) - (a.avgRating || 0) : b.count - a.count
    );
    const shown = sorted.slice(0, showAll ? EXPANDED_LIMIT : INITIAL_LIMIT);
    const grid = h('div', { className: 'lbs-person-grid', id: `lbs-${entityType}-grid` });
    for (const person of shown) grid.append(renderPersonCard(person, onSelect));
    return grid;
  }

  function render() {
    const hasMore = people.length > INITIAL_LIMIT;

    const countBtn = h('button', {
      className: `lbs-sort-btn ${sortBy === 'count' ? 'active' : ''}`,
      dataset: { sort: 'count' },
      text: 'By count',
    });
    const ratingBtn = h('button', {
      className: `lbs-sort-btn ${sortBy === 'avgRating' ? 'active' : ''}`,
      dataset: { sort: 'avgRating' },
      text: 'By rating',
    });
    for (const btn of [countBtn, ratingBtn]) {
      btn.addEventListener('click', () => { sortBy = btn.dataset.sort; render(); });
    }

    const headerRow = h('div', { className: 'lbs-section-header-row' }, [
      h('div', { className: 'lbs-sort-controls' }, [
        h('span', { className: 'lbs-sort-label', text: 'Sort:' }),
        countBtn,
        ratingBtn,
      ]),
    ]);

    const children = [headerRow, buildGrid()];

    if (hasMore) {
      const toggleBtn = h('button', {
        className: 'lbs-show-more-btn',
        id: `lbs-${entityType}-toggle`,
        text: showAll ? 'Show less' : `Show more (${Math.min(EXPANDED_LIMIT, people.length)} total)`,
      });
      toggleBtn.addEventListener('click', () => { showAll = !showAll; render(); });
      children.push(h('div', { className: 'lbs-show-more-row' }, [toggleBtn]));
    }

    setChildren(container, children);
  }

  render();
}
