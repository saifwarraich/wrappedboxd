import { Chart, ArcElement, DoughnutController, BarElement, BarController, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { computeGenreBreakdown } from '../../lib/stats.js';
import { openFilmModal } from '../modal.js';

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
    container.innerHTML = `<div class="lbs-empty-state">No genre data available. Enrich your films with TMDB to see genre stats.</div>`;
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

  container.innerHTML = `
    <div class="lbs-genres-layout">
      <div class="lbs-genres-charts">
        <div class="lbs-chart-card">
          <h3 class="lbs-chart-title">Genre Breakdown</h3>
          <div class="lbs-doughnut-wrapper">
            <canvas id="lbs-genre-doughnut"></canvas>
          </div>
        </div>
        <div class="lbs-chart-card lbs-chart-card--wide">
          <h3 class="lbs-chart-title">Genres by Year</h3>
          <div class="lbs-bar-wrapper">
            <canvas id="lbs-genre-bar"></canvas>
          </div>
        </div>
      </div>
      <div class="lbs-genre-pills">
        ${sortedGenres.slice(0, 20).map(([genre, count], i) => `
          <div class="lbs-genre-pill" data-genre="${genre}" style="cursor:pointer">
            <span class="lbs-genre-dot" style="background:${GENRE_COLORS[i % GENRE_COLORS.length]}"></span>
            <span class="lbs-genre-name">${genre}</span>
            <span class="lbs-genre-count">${count}</span>
            <span class="lbs-genre-pct">${Math.round((count / totalFilms) * 100)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

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

  // Genre pill clicks
  container.querySelectorAll('.lbs-genre-pill[data-genre]').forEach(pill => {
    pill.addEventListener('click', () => {
      const genre = pill.dataset.genre;
      const genreFilms = films.filter(f => f.genres && f.genres.includes(genre));
      openFilmModal(getShadowRoot(container), genre, genreFilms);
    });
  });

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
