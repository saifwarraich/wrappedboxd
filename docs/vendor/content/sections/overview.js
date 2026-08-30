import { computeOverview, computeTopDirectors, computeTopActors } from '../../lib/stats.js';
import { openFilmModal, openDiaryModal, openCountriesModal, openLanguagesModal } from '../modal.js';
import { h, setChildren } from '../dom.js';

function getShadowRoot(el) {
  let node = el;
  while (node) {
    if (node instanceof ShadowRoot) return node;
    node = node.parentNode;
  }
  return document;
}

export function renderOverview(films, diaryEntries, container) {
  const stats = computeOverview(films);
  const topDir = computeTopDirectors(films, 1)[0] || null;
  const topActor = computeTopActors(films, 1)[0] || null;
  const currentYear = new Date().getFullYear();

  const circles = [
    {
      label: 'Films Logged',
      value: diaryEntries.length.toLocaleString(),
      color: '#ff8000',
      films: null,
      diary: true,
    },
    {
      label: 'Hours Watched',
      value: stats.hours.toLocaleString(),
      color: '#00e054',
      films: null,
    },
    {
      label: 'Avg Rating',
      value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—',
      color: '#40bcf4',
      films: films.filter(f => f.rating !== null && f.rating !== undefined),
      title: 'Rated Films',
    },
  ];

  const extras = [
    {
      label: 'Films Watched',
      value: stats.total.toLocaleString(),
      films: films,
      title: 'All Films',
    },
    {
      label: 'Countries',
      value: stats.countries.size.toString(),
      films: null,
      countries: true,
    },
    {
      label: 'Languages',
      value: stats.languages.size.toString(),
      films: null,
      languages: true,
    },
    {
      label: 'This Year',
      value: stats.thisYear.toLocaleString(),
      films: films.filter(f => f.last_watched && parseInt(f.last_watched.substring(0, 4), 10) === currentYear),
      title: `Watched in ${currentYear}`,
    },
    {
      label: 'Rewatches',
      value: stats.rewatches.toLocaleString(),
      films: films.filter(f => (f.rewatch_count || 0) > 0),
      title: 'Rewatched Films',
    },
  ];

  const root = getShadowRoot(container);
  const filmsMap = new Map(films.map(f => [f.letterboxd_id, f]));

  function personCard(label, person, onClick) {
    if (!person) return null;
    const photo = person.photo
      ? h('img', { src: person.photo, alt: person.name, style: 'width:100%;height:100%;object-fit:cover;border-radius:8px;' })
      : h('div', {
          style: 'width:100%;height:100%;background:var(--lbs-bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:36px;color:var(--lbs-text-muted);',
          text: person.name.charAt(0),
        });

    const card = h('div', { className: 'lbs-featured-person', dataset: { person: person.name }, style: 'cursor:pointer' }, [
      h('div', { className: 'lbs-featured-label', text: label }),
      h('div', { className: 'lbs-featured-photo' }, [photo]),
      h('div', { className: 'lbs-featured-name', text: person.name }),
      h('div', { className: 'lbs-featured-count', text: `${person.count} film${person.count !== 1 ? 's' : ''}` }),
    ]);
    card.addEventListener('click', onClick);
    return card;
  }

  const hasFeatured = topDir || topActor;

  const circlesRow = h('div', { className: 'lbs-overview-circles' });
  circles.forEach((c) => {
    const item = h('div', { className: `lbs-circle-item ${c.films || c.diary ? 'lbs-clickable' : ''}` }, [
      h('div', { className: 'lbs-circle', style: `background:${c.color}` }, [
        h('span', { className: 'lbs-circle-value', text: c.value }),
      ]),
      h('div', { className: 'lbs-circle-label', text: c.label }),
    ]);
    if (c.diary) {
      item.addEventListener('click', () => openDiaryModal(root, diaryEntries, filmsMap));
    } else if (c.films) {
      item.addEventListener('click', () => openFilmModal(root, c.title, c.films));
    }
    circlesRow.append(item);
  });

  const extrasRow = h('div', { className: 'lbs-overview-extras' });
  extras.forEach((e) => {
    const item = h('div', { className: `lbs-extra-stat ${e.films || e.countries || e.languages ? 'lbs-clickable' : ''}` }, [
      h('span', { className: 'lbs-extra-value', text: e.value }),
      h('span', { className: 'lbs-extra-label', text: e.label }),
    ]);
    if (e.countries) {
      item.addEventListener('click', () => openCountriesModal(root, films));
    } else if (e.languages) {
      item.addEventListener('click', () => openLanguagesModal(root, films));
    } else if (e.films) {
      item.addEventListener('click', () => openFilmModal(root, e.title, e.films));
    }
    extrasRow.append(item);
  });

  const children = [circlesRow, extrasRow];

  if (hasFeatured) {
    const actorCard = personCard('Most Watched Actor', topActor, () => {
      const actorFilms = films.filter(f => f.cast?.some(c => c.name === topActor.name));
      openFilmModal(root, topActor.name, actorFilms);
    });
    const dirCard = personCard('Most Watched Director', topDir, () => {
      const dirFilms = films.filter(f => f.director === topDir.name);
      openFilmModal(root, topDir.name, dirFilms);
    });
    children.push(h('div', { className: 'lbs-featured-row' }, [
      actorCard,
      h('div', { className: 'lbs-featured-divider' }),
      dirCard,
    ]));
  }

  setChildren(container, children);
}
