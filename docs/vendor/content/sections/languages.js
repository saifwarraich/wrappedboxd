import { Chart, BarElement, BarController, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { computeLanguageBreakdown } from '../../lib/stats.js';
import { openFilmModal } from '../modal.js';
import { h, setChildren, setEmptyState } from '../dom.js';

Chart.register(BarElement, BarController, CategoryScale, LinearScale, Tooltip);

let languagesChartInstance = null;

export function renderLanguages(films, container) {
  const breakdown = computeLanguageBreakdown(films);

  const entries = Object.entries(breakdown)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  if (!entries.length) {
    setEmptyState(container, 'No language data available.');
    return;
  }

  const maxCount = Math.max(...entries.map(e => e.count));
  const topLanguage = entries[0];

  const canvas = h('canvas', { id: 'lbs-languages-chart' });
  const layout = h('div', { className: 'lbs-decades-layout' }, [
    h('div', { className: 'lbs-chart-card lbs-chart-card--full' }, [
      h('h3', { className: 'lbs-chart-title', text: 'Films by Language' }),
      h('div', { className: 'lbs-decades-chart-wrapper' }, [canvas]),
    ]),
    topLanguage ? h('div', { className: 'lbs-decades-highlight' }, [
      'Most watched language: ',
      h('strong', { text: topLanguage.language }),
      ` — ${topLanguage.count} films`,
    ]) : null,
  ]);
  setChildren(container, [layout]);

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
        const languageFilms = films.filter(f => f.original_language === language);
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
