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

  function scaleSize(count) {
    if (maxCount === minCount) return (MIN_SIZE + MAX_SIZE) / 2;
    return MIN_SIZE + ((count - minCount) / (maxCount - minCount)) * (MAX_SIZE - MIN_SIZE);
  }

  function scaleOpacity(count) {
    if (maxCount === minCount) return 0.7;
    return 0.4 + ((count - minCount) / (maxCount - minCount)) * 0.6;
  }

  container.innerHTML = `
    <div class="lbs-themes-layout">
      <div class="lbs-themes-cloud" id="lbs-themes-cloud">
        ${keywords.map(kw => {
          const size = scaleSize(kw.count);
          const opacity = scaleOpacity(kw.count);
          return `
            <button
              class="lbs-theme-tag"
              data-keyword="${kw.keyword}"
              style="font-size:${size}px; color: rgba(0,224,84,${opacity})"
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
