import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { computeDecades } from '../../lib/stats.js';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

let decadesChartInstance = null;

export function renderDecades(films, container) {
  const decades = computeDecades(films);

  const entries = Object.entries(decades)
    .map(([d, c]) => ({ decade: parseInt(d, 10), count: c }))
    .sort((a, b) => a.decade - b.decade);

  if (!entries.length) {
    container.innerHTML = `<div class="lbs-empty-state">No decade data available.</div>`;
    return;
  }

  const maxCount = Math.max(...entries.map(e => e.count));
  const topDecade = entries.find(e => e.count === maxCount);

  container.innerHTML = `
    <div class="lbs-decades-layout">
      <div class="lbs-chart-card lbs-chart-card--full">
        <h3 class="lbs-chart-title">Films by Decade</h3>
        <div class="lbs-decades-chart-wrapper">
          <canvas id="lbs-decades-chart"></canvas>
        </div>
      </div>
      ${topDecade ? `<div class="lbs-decades-highlight">Most watched decade: <strong>${topDecade.decade}s</strong> — ${topDecade.count} films</div>` : ''}
    </div>
  `;

  const ctx = container.querySelector('#lbs-decades-chart');
  if (!ctx) return;

  if (decadesChartInstance) decadesChartInstance.destroy();

  const labels = entries.map(e => `${e.decade}s`);
  const data = entries.map(e => e.count);

  const backgroundColors = entries.map(e => {
    if (e.decade === topDecade?.decade) return '#00e054';
    const ratio = e.count / maxCount;
    const opacity = 0.3 + ratio * 0.6;
    return `rgba(0, 224, 84, ${opacity})`;
  });

  decadesChartInstance = new Chart(ctx, {
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
