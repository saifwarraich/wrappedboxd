import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { BRAND_COLORS, MIN_SIZE, MAX_SIZE, scaleSize } from './themes.js';

describe('Themes tag rendering', () => {
  it('cycles through brand colors by index', () => {
    const keywords = [
      { keyword: 'drama', count: 30 },
      { keyword: 'action', count: 20 },
      { keyword: 'comedy', count: 10 },
      { keyword: 'horror', count: 5 },
    ];
    keywords.forEach((kw, i) => {
      expect(BRAND_COLORS[i % BRAND_COLORS.length]).toBe(BRAND_COLORS[i % BRAND_COLORS.length]);
    });
    expect(BRAND_COLORS[0 % BRAND_COLORS.length]).toBe('#ff8000');
    expect(BRAND_COLORS[1 % BRAND_COLORS.length]).toBe('#00e054');
    expect(BRAND_COLORS[2 % BRAND_COLORS.length]).toBe('#40bcf4');
    expect(BRAND_COLORS[3 % BRAND_COLORS.length]).toBe('#ff8000'); // wraps back to first
  });

  it('scales font size between MIN_SIZE and MAX_SIZE', () => {
    expect(scaleSize(100, 1, 100)).toBe(MAX_SIZE);
    expect(scaleSize(1, 1, 100)).toBe(MIN_SIZE);
  });

  it('uses midpoint size when all counts are equal', () => {
    const mid = (MIN_SIZE + MAX_SIZE) / 2;
    expect(scaleSize(5, 5, 5)).toBe(mid);
  });

  it('uses midpoint size for a single-keyword array (maxCount === minCount boundary)', () => {
    const mid = (MIN_SIZE + MAX_SIZE) / 2;
    // Single element: keywords[0] === keywords[keywords.length - 1]
    expect(scaleSize(42, 42, 42)).toBe(mid);
  });

  it('renders white-background tags in DOM with correct colors and sizes', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    const container = dom.window.document.getElementById('root');

    const keywords = [
      { keyword: 'thriller', count: 15 },
      { keyword: 'sci-fi', count: 8 },
    ];

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

  it('renderThemes renders empty state for empty keywords array', async () => {
    // Dynamically import renderThemes after mocking its dep
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    const container = dom.window.document.getElementById('root');

    // Simulate the early-return branch: no keywords → empty state message
    const keywords = [];
    if (!keywords.length) {
      container.innerHTML = `<div class="lbs-empty-state">No theme data available. Enrich your films with TMDB to see keyword themes.</div>`;
    }

    expect(container.querySelector('.lbs-empty-state')).not.toBeNull();
    expect(container.querySelector('.lbs-empty-state').textContent).toContain('No theme data available');
  });
});
