import { Chart, ArcElement, DoughnutController, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { computeGenreBreakdown } from '../../lib/stats.js';
import { openFilmModal } from '../modal.js';
import { h, setChildren, setEmptyState } from '../dom.js';

Chart.register(ArcElement, DoughnutController, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend);

const GENRE_COLORS = [
  '#00e054', '#00b544', '#00c96e', '#1db954', '#2ecc71',
  '#16a085', '#1abc9c', '#27ae60', '#2980b9', '#3498db',
  '#8e44ad', '#9b59b6', '#e74c3c', '#c0392b', '#e67e22',
  '#f39c12', '#d35400', '#ff8000', '#795548', '#607d8b',
];

let doughnutChartInstance = null;
let barChartInstance = null;

function getShadowRoot(container) {
  return container.getRootNode();
}

export function renderGenres(films, container) {
  const breakdown = computeGenreBreakdown(films);
  const { totals, byYear } = breakdown;

  const sortedGenres = Object.entries(totals)
    .sort(([, a], [, b]) => b - a);

  if (!sortedGenres.length) {
    setEmptyState(container, 'No genre data available. Enrich your films with TMDB to see genre stats.');
    return;
  }

  const totalFilms = sortedGenres.reduce((sum, [, c]) => sum + c, 0);

  // Years with >= 5 films
  const validYears = Object.keys(byYear)
    .filter(yr => {
      const yearTotal = Object.values(byYear[yr]).reduce((s, c) => s + c, 0);
      return yearTotal >= 5;
    })
    .sort((a, b) => a - b);

  const pillsContainer = h('div', { className: 'lbs-genre-pills' });
  for (const [i, [genre, count]] of sortedGenres.slice(0, 20).entries()) {
    const pill = h('div', { className: 'lbs-genre-pill', dataset: { genre }, style: 'cursor:pointer' }, [
      h('span', { className: 'lbs-genre-dot', style: `background:${GENRE_COLORS[i % GENRE_COLORS.length]}` }),
      h('span', { className: 'lbs-genre-name', text: genre }),
      h('span', { className: 'lbs-genre-count', text: String(count) }),
      h('span', { className: 'lbs-genre-pct', text: `${Math.round((count / totalFilms) * 100)}%` }),
    ]);
    pill.addEventListener('click', () => {
      const genreFilms = films.filter(f => f.genres && f.genres.includes(genre));
      openFilmModal(getShadowRoot(container), genre, genreFilms);
    });
    pillsContainer.append(pill);
  }

  const layout = h('div', { className: 'lbs-genres-layout' }, [
    h('div', { className: 'lbs-genres-charts' }, [
      h('div', { className: 'lbs-chart-card' }, [
        h('h3', { className: 'lbs-chart-title', text: 'Genre Breakdown' }),
        h('div', { className: 'lbs-doughnut-wrapper' }, [h('canvas', { id: 'lbs-genre-doughnut' })]),
      ]),
      h('div', { className: 'lbs-chart-card lbs-chart-card--wide' }, [
        h('h3', { className: 'lbs-chart-title', text: 'Genres by Year' }),
        h('div', { className: 'lbs-bar-wrapper' }, [h('canvas', { id: 'lbs-genre-bar' })]),
      ]),
    ]),
    pillsContainer,
  ]);
  setChildren(container, [layout]);

  // Doughnut chart
  const doughnutCtx = container.querySelector('#lbs-genre-doughnut');
  if (doughnutCtx) {
    if (doughnutChartInstance) doughnutChartInstance.destroy();
    const top10 = sortedGenres.slice(0, 10);
    doughnutChartInstance = new Chart(doughnutCtx, {
      type: 'doughnut',
      data: {
        labels: top10.map(([g]) => g),
        datasets: [{
          data: top10.map(([, c]) => c),
          backgroundColor: GENRE_COLORS.slice(0, top10.length),
          borderColor: '#1c2228',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        onClick: (event, elements) => {
          if (!elements.length) return;
          const genre = top10[elements[0].index][0];
          const genreFilms = films.filter(f => f.genres && f.genres.includes(genre));
          openFilmModal(getShadowRoot(container), genre, genreFilms);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} films`,
            },
          },
        },
      },
    });
  }

  // Stacked bar chart
  const barCtx = container.querySelector('#lbs-genre-bar');
  if (barCtx && validYears.length > 0) {
    if (barChartInstance) barChartInstance.destroy();
    const topGenres = sortedGenres.slice(0, 8).map(([g]) => g);

    const datasets = topGenres.map((genre, i) => ({
      label: genre,
      data: validYears.map(yr => (byYear[yr] && byYear[yr][genre]) || 0),
      backgroundColor: GENRE_COLORS[i % GENRE_COLORS.length],
      borderWidth: 0,
    }));

    barChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: validYears,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (!elements.length) return;
          const el = elements[0];
          const year = parseInt(validYears[el.index], 10);
          const genre = topGenres[el.datasetIndex];
          const title = `${genre} — ${year}`;
          const genreYearFilms = films.filter(f =>
            f.genres && f.genres.includes(genre) &&
            f.last_watched && f.last_watched.startsWith(String(year))
          );
          openFilmModal(getShadowRoot(container), title, genreYearFilms);
        },
        onHover: (event, elements) => {
          event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: '#9ab' },
            grid: { color: '#2a3440' },
          },
          y: {
            stacked: true,
            ticks: { color: '#9ab' },
            grid: { color: '#2a3440' },
          },
        },
        plugins: {
          legend: {
            labels: { color: '#9ab', boxWidth: 12, padding: 8 },
          },
          tooltip: { mode: 'index', intersect: false },
        },
      },
    });
  }
}
