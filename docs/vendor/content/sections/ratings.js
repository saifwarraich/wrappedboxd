import {
  Chart,
  BarElement, BarController,
  LinearScale, CategoryScale,
  Tooltip, Legend,
} from 'chart.js';
import { computeRatingDistribution, computeOverview } from '../../lib/stats.js';
import { openFilmModal } from '../modal.js';
import { h, setChildren } from '../dom.js';

Chart.register(
  BarElement, BarController,
  LinearScale, CategoryScale,
  Tooltip, Legend
);

let histChartInstance = null;

export function renderRatings(films, container, shadow) {
  const dist = computeRatingDistribution(films);
  const overview = computeOverview(films);

  const layout = h('div', { className: 'lbs-ratings-layout' }, [
    h('div', { className: 'lbs-chart-card lbs-chart-card--full' }, [
      h('h3', { className: 'lbs-chart-title', text: 'Rating Distribution' }),
      h('div', { className: 'lbs-ratings-hist-wrapper' }, [h('canvas', { id: 'lbs-rating-hist' })]),
    ]),
  ]);
  setChildren(container, [layout]);

  const histCtx = container.querySelector('#lbs-rating-hist');
  if (!histCtx) return;

  if (histChartInstance) histChartInstance.destroy();

  const labels = Object.keys(dist);
  const data = Object.values(dist);
  const avgRating = overview.avgRating;

  histChartInstance = new Chart(histCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Films',
        data,
        backgroundColor: '#00e054',
        borderColor: '#00b544',
        borderWidth: 1,
        borderRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick(e, elements) {
        if (!elements.length) return;
        const idx = elements[0].index;
        const rating = parseFloat(labels[idx]);
        const matched = films.filter(f => f.rating === rating);
        const root = shadow || histCtx.getRootNode();
        openFilmModal(root, `★ ${rating.toFixed(1)} — Rated films`, matched);
      },
      scales: {
        x: {
          ticks: { color: '#9ab' },
          grid: { color: '#2a3440' },
        },
        y: {
          ticks: { color: '#9ab', precision: 0 },
          grid: { color: '#2a3440' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw} films — click to view`,
          },
        },
      },
    },
    plugins: [{
      id: 'avgLine',
      afterDraw(chart) {
        if (!avgRating) return;
        const ctx2 = chart.ctx;
        const xAxis = chart.scales.x;
        const yAxis = chart.scales.y;

        const labels2 = chart.data.labels;
        let xPos = null;
        for (let i = 0; i < labels2.length; i++) {
          if (Math.abs(parseFloat(labels2[i]) - avgRating) < 0.01) {
            xPos = xAxis.getPixelForTick(i);
            break;
          }
        }
        if (xPos === null) {
          for (let i = 0; i < labels2.length - 1; i++) {
            const l1 = parseFloat(labels2[i]);
            const l2 = parseFloat(labels2[i + 1]);
            if (avgRating >= l1 && avgRating <= l2) {
              const frac = (avgRating - l1) / (l2 - l1);
              const p1 = xAxis.getPixelForTick(i);
              const p2 = xAxis.getPixelForTick(i + 1);
              xPos = p1 + (p2 - p1) * frac;
              break;
            }
          }
        }

        if (xPos === null) return;

        ctx2.save();
        ctx2.beginPath();
        ctx2.moveTo(xPos, yAxis.top);
        ctx2.lineTo(xPos, yAxis.bottom);
        ctx2.strokeStyle = '#ff8000';
        ctx2.lineWidth = 2;
        ctx2.setLineDash([4, 4]);
        ctx2.stroke();
        ctx2.fillStyle = '#ff8000';
        ctx2.font = '11px sans-serif';
        ctx2.fillText(`Avg: ★${avgRating.toFixed(1)}`, xPos + 4, yAxis.top + 14);
        ctx2.restore();
      },
    }],
  });
}
