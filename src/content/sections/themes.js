import { computeTopKeywords } from '../../lib/stats.js';

export function renderThemes(films, container, onFilterByKeyword) {
  const keywords = computeTopKeywords(films, 50);

  if (!keywords.length) {
    container.innerHTML = `<div class="lbs-empty-state">No theme data available. Enrich your films with TMDB to see keyword themes.</div>`;
    return;
  }

  const maxCount = keywords[0].count;
  const minCount = keywords[keywords.length - 1].count;
  const MIN_SIZE = 11;
  const MAX_SIZE = 22;
  const BRAND_COLORS = ['#ff8000', '#00e054', '#40bcf4'];

  function scaleSize(count) {
    if (maxCount === minCount) return (MIN_SIZE + MAX_SIZE) / 2;
    return MIN_SIZE + ((count - minCount) / (maxCount - minCount)) * (MAX_SIZE - MIN_SIZE);
  }

  container.innerHTML = `
    <div class="lbs-themes-layout">
      <div class="lbs-themes-cloud" id="lbs-themes-cloud">
        ${keywords.map((kw, i) => {
          const size = scaleSize(kw.count);
          const color = BRAND_COLORS[i % BRAND_COLORS.length];
          return `
            <button
              class="lbs-theme-tag"
              data-keyword="${kw.keyword}"
              style="font-size:${size}px; color: ${color}"
              title="${kw.count} films"
            >${kw.keyword}</button>
          `;
        }).join('')}
      </div>
      <div class="lbs-themes-stats">
        <span class="lbs-themes-count">${keywords.length} themes shown</span>
        <span class="lbs-themes-note">Click a theme to filter all stats</span>
      </div>
    </div>
  `;

  container.querySelectorAll('.lbs-theme-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const kw = tag.dataset.keyword;
      if (typeof onFilterByKeyword === 'function') {
        onFilterByKeyword(kw);
      }
    });
  });
}
