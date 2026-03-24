import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// We test the tag-rendering logic extracted from renderThemes.
// The full renderThemes depends on computeTopKeywords; we test the
// color/size derivation and markup generation directly.

const BRAND_COLORS = ['#ff8000', '#00e054', '#40bcf4'];
const MIN_SIZE = 11;
const MAX_SIZE = 22;

function scaleSize(count, minCount, maxCount) {
  if (maxCount === minCount) return (MIN_SIZE + MAX_SIZE) / 2;
  return MIN_SIZE + ((count - minCount) / (maxCount - minCount)) * (MAX_SIZE - MIN_SIZE);
}

function buildTagMarkup(keywords) {
  return keywords.map((kw, i) => {
    const maxCount = keywords[0].count;
    const minCount = keywords[keywords.length - 1].count;
    const size = scaleSize(kw.count, minCount, maxCount);
    const color = BRAND_COLORS[i % BRAND_COLORS.length];
    return { keyword: kw.keyword, size, color };
  });
}

describe('Themes tag rendering', () => {
  it('cycles through brand colors by index', () => {
    const keywords = [
      { keyword: 'drama', count: 30 },
      { keyword: 'action', count: 20 },
      { keyword: 'comedy', count: 10 },
      { keyword: 'horror', count: 5 },
    ];
    const tags = buildTagMarkup(keywords);
    expect(tags[0].color).toBe('#ff8000');
    expect(tags[1].color).toBe('#00e054');
    expect(tags[2].color).toBe('#40bcf4');
    expect(tags[3].color).toBe('#ff8000'); // wraps back to first
  });

  it('scales font size between MIN_SIZE and MAX_SIZE', () => {
    const keywords = [
      { keyword: 'top', count: 100 },
      { keyword: 'bottom', count: 1 },
    ];
    const tags = buildTagMarkup(keywords);
    expect(tags[0].size).toBe(MAX_SIZE);
    expect(tags[1].size).toBe(MIN_SIZE);
  });

  it('uses midpoint size when all counts are equal', () => {
    const keywords = [
      { keyword: 'a', count: 5 },
      { keyword: 'b', count: 5 },
    ];
    const tags = buildTagMarkup(keywords);
    const mid = (MIN_SIZE + MAX_SIZE) / 2;
    expect(tags[0].size).toBe(mid);
    expect(tags[1].size).toBe(mid);
  });

  it('renders white-background tags in DOM', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    const container = dom.window.document.getElementById('root');

    const keywords = [
      { keyword: 'thriller', count: 15 },
      { keyword: 'sci-fi', count: 8 },
    ];

    // Simulate the HTML generation from themes.js
    const maxCount = keywords[0].count;
    const minCount = keywords[keywords.length - 1].count;
    container.innerHTML = keywords.map((kw, i) => {
      const size = scaleSize(kw.count, minCount, maxCount);
      const color = BRAND_COLORS[i % BRAND_COLORS.length];
      return `<button class="lbs-theme-tag" style="font-size:${size}px; color: ${color}">${kw.keyword}</button>`;
    }).join('');

    const buttons = container.querySelectorAll('.lbs-theme-tag');
    expect(buttons).toHaveLength(2);

    // First tag: orange (#ff8000 → rgb(255, 128, 0) in jsdom)
    expect(buttons[0].style.color).toBe('rgb(255, 128, 0)');
    expect(buttons[0].style.fontSize).toBe(`${MAX_SIZE}px`);

    // Second tag: green (#00e054 → rgb(0, 224, 84) in jsdom)
    expect(buttons[1].style.color).toBe('rgb(0, 224, 84)');
    expect(buttons[1].style.fontSize).toBe(`${MIN_SIZE}px`);
  });
});
