import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { computeDecades } from '../../lib/stats.js';
import { openFilmModal } from '../modal.js';
import { h, setChildren, setEmptyState } from '../dom.js';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

let decadesChartInstance = null;

export function renderDecades(films, container) {
  const decades = computeDecades(films);

  const entries = Object.entries(decades)
    .map(([d, c]) => ({ decade: parseInt(d, 10), count: c }))
    .sort((a, b) => a.decade - b.decade);

  if (!entries.length) {
    setEmptyState(container, 'No decade data available.');
    return;
  }

  const maxCount = Math.max(...entries.map(e => e.count));
  const topDecade = entries.find(e => e.count === maxCount);

  const canvas = h('canvas', { id: 'lbs-decades-chart' });
  const layout = h('div', { className: 'lbs-decades-layout' }, [
    h('div', { className: 'lbs-chart-card lbs-chart-card--full' }, [
      h('h3', { className: 'lbs-chart-title', text: 'Films by Decade' }),
      h('div', { className: 'lbs-decades-chart-wrapper' }, [canvas]),
    ]),
    topDecade ? h('div', { className: 'lbs-decades-highlight' }, [
      'Most watched decade: ',
      h('strong', { text: `${topDecade.decade}s` }),
      ` — ${topDecade.count} films`,
    ]) : null,
  ]);
  setChildren(container, [layout]);

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
      onClick: (event, elements) => {
        if (!elements.length) return;
        const decade = entries[elements[0].index].decade;
        const decadeFilms = films.filter(f => f.decade === decade || (f.year && Math.floor(f.year / 10) * 10 === decade));
        openFilmModal(container.getRootNode(), `${decade}s`, decadeFilms);
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
