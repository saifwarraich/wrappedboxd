import { computeOverview, computeTopDirectors, computeTopActors } from '../../lib/stats.js';
import { openFilmModal, openDiaryModal, openCountriesModal, openLanguagesModal } from '../modal.js';

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

  function personCard(label, person) {
    if (!person) return '';
    const photo = person.photo
      ? `<img src="${person.photo}" alt="${person.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
      : `<div style="width:100%;height:100%;background:var(--lbs-bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:36px;color:var(--lbs-text-muted);">${person.name.charAt(0)}</div>`;

    return `
      <div class="lbs-featured-person" data-person="${person.name}">
        <div class="lbs-featured-label">${label}</div>
        <div class="lbs-featured-photo">${photo}</div>
        <div class="lbs-featured-name">${person.name}</div>
        <div class="lbs-featured-count">${person.count} film${person.count !== 1 ? 's' : ''}</div>
      </div>
    `;
  }

  const hasFeatured = topDir || topActor;

  container.innerHTML = `
    <div class="lbs-overview-circles">
      ${circles.map((c, i) => `
        <div class="lbs-circle-item ${c.films || c.diary ? 'lbs-clickable' : ''}" data-circle="${i}">
          <div class="lbs-circle" style="background:${c.color}">
            <span class="lbs-circle-value">${c.value}</span>
          </div>
          <div class="lbs-circle-label">${c.label}</div>
        </div>
      `).join('')}
    </div>
    <div class="lbs-overview-extras">
      ${extras.map((e, i) => `
        <div class="lbs-extra-stat ${e.films || e.countries || e.languages ? 'lbs-clickable' : ''}" data-extra="${i}">
          <span class="lbs-extra-value">${e.value}</span>
          <span class="lbs-extra-label">${e.label}</span>
        </div>
      `).join('')}
    </div>
    ${hasFeatured ? `
      <div class="lbs-featured-row">
        ${personCard('Most Watched Actor', topActor)}
        <div class="lbs-featured-divider"></div>
        ${personCard('Most Watched Director', topDir)}
      </div>
    ` : ''}
  `;

  const root = getShadowRoot(container);
  const filmsMap = new Map(films.map(f => [f.letterboxd_id, f]));

  // Circle clicks
  container.querySelectorAll('.lbs-circle-item[data-circle]').forEach(el => {
    const c = circles[parseInt(el.dataset.circle)];
    if (c.diary) {
      el.addEventListener('click', () => openDiaryModal(root, diaryEntries, filmsMap));
    } else if (c.films) {
      el.addEventListener('click', () => openFilmModal(root, c.title, c.films));
    }
  });

  // Extra stat clicks
  container.querySelectorAll('.lbs-extra-stat[data-extra]').forEach(el => {
    const e = extras[parseInt(el.dataset.extra)];
    if (e.countries) {
      el.addEventListener('click', () => openCountriesModal(root, films));
    } else if (e.languages) {
      el.addEventListener('click', () => openLanguagesModal(root, films));
    } else if (e.films) {
      el.addEventListener('click', () => openFilmModal(root, e.title, e.films));
    }
  });

  // Featured person clicks
  if (topActor) {
    const actorEl = container.querySelector(`.lbs-featured-person[data-person="${topActor.name}"]`);
    if (actorEl) {
      actorEl.style.cursor = 'pointer';
      actorEl.addEventListener('click', () => {
        const actorFilms = films.filter(f => f.cast?.some(c => c.name === topActor.name));
        openFilmModal(getShadowRoot(container), topActor.name, actorFilms);
      });
    }
  }
  if (topDir) {
    const dirEl = container.querySelector(`.lbs-featured-person[data-person="${topDir.name}"]`);
    if (dirEl) {
      dirEl.style.cursor = 'pointer';
      dirEl.addEventListener('click', () => {
        const dirFilms = films.filter(f => f.director === topDir.name);
        openFilmModal(getShadowRoot(container), topDir.name, dirFilms);
      });
    }
  }
}
