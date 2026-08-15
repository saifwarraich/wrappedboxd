import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { computeLanguageBreakdown } from '../../lib/stats.js';
import { openFilmModal } from '../modal.js';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

let languagesChartInstance = null;

export function renderLanguages(films, container) {
  const breakdown = computeLanguageBreakdown(films);

  const entries = Object.entries(breakdown)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  if (!entries.length) {
    container.innerHTML = `<div class="lbs-empty-state">No language data available.</div>`;
    return;
  }

  const maxCount = Math.max(...entries.map(e => e.count));
  const topLanguage = entries[0];

  container.innerHTML = `
    <div class="lbs-decades-layout">
      <div class="lbs-chart-card lbs-chart-card--full">
        <h3 class="lbs-chart-title">Films by Language</h3>
        <div class="lbs-decades-chart-wrapper">
          <canvas id="lbs-languages-chart"></canvas>
        </div>
      </div>
      ${topLanguage ? `<div class="lbs-decades-highlight">Most watched language: <strong>${topLanguage.language}</strong> — ${topLanguage.count} films</div>` : ''}
    </div>
  `;

  const ctx = container.querySelector('#lbs-languages-chart');
  if (!ctx) return;

  if (languagesChartInstance) languagesChartInstance.destroy();

  const labels = entries.map(e => e.language);
  const data = entries.map(e => e.count);

  const backgroundColors = entries.map(e => {
    if (e.language === topLanguage?.language) return '#00e054';
    const ratio = e.count / maxCount;
    const opacity = 0.3 + ratio * 0.6;
    return `rgba(0, 224, 84, ${opacity})`;
  });

  languagesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Films',
        data,
        backgroundColor: backgroundColors,
        borderColor: 'transparent',
        borderRadius: 3,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, elements) => {
        if (!elements.length) return;
        const language = entries[elements[0].index].language;
        const languageFilms = films.filter(f => f.languages && f.languages.includes(language));
        openFilmModal(container.getRootNode(), language, languageFilms);
      },
      onHover: (event, elements) => {
        event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
      },
      scales: {
        x: {
          ticks: { color: '#9ab' },
          grid: { color: '#2a3440' },
        },
        y: {
          ticks: { color: '#9ab' },
          grid: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw} films`,
          },
        },
      },
    },
  });
}
