import { computeTopKeywords } from '../../lib/stats.js';
import { h, setChildren, setEmptyState } from '../dom.js';

export const BRAND_COLORS = ['#ff8000', '#00e054', '#40bcf4'];
export const MIN_SIZE = 11;
export const MAX_SIZE = 22;

export function scaleSize(count, minCount, maxCount) {
  if (maxCount === minCount) return (MIN_SIZE + MAX_SIZE) / 2;
  return MIN_SIZE + ((count - minCount) / (maxCount - minCount)) * (MAX_SIZE - MIN_SIZE);
}

export function renderThemes(films, container, onFilterByKeyword) {
  const keywords = computeTopKeywords(films, 50);

  if (!keywords.length) {
    setEmptyState(container, 'No theme data available. Enrich your films with TMDB to see keyword themes.');
    return;
  }

  const maxCount = keywords[0].count;
  const minCount = keywords[keywords.length - 1].count;

  const cloud = h('div', { className: 'lbs-themes-cloud', id: 'lbs-themes-cloud' });
  for (const [i, kw] of keywords.entries()) {
    const size = scaleSize(kw.count, minCount, maxCount);
    const color = BRAND_COLORS[i % BRAND_COLORS.length];
    const tag = h('button', {
      className: 'lbs-theme-tag',
      dataset: { keyword: kw.keyword },
      style: `font-size:${size}px; color: ${color}`,
      title: `${kw.count} films`,
      text: kw.keyword,
    });
    tag.addEventListener('click', () => {
      if (typeof onFilterByKeyword === 'function') onFilterByKeyword(kw.keyword);
    });
    cloud.append(tag);
  }

  const layout = h('div', { className: 'lbs-themes-layout' }, [
    cloud,
    h('div', { className: 'lbs-themes-stats' }, [
      h('span', { className: 'lbs-themes-count', text: `${keywords.length} themes shown` }),
      h('span', { className: 'lbs-themes-note', text: 'Click a theme to filter all stats' }),
    ]),
  ]);
  setChildren(container, [layout]);
}
