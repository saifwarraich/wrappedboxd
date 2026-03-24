import { computeOverview, computeTopDirectors, computeTopActors } from '../../lib/stats.js';

export function renderOverview(films, container) {
  const stats = computeOverview(films);
  const topDir = computeTopDirectors(films, 1)[0] || null;
  const topActor = computeTopActors(films, 1)[0] || null;

  const circles = [
    { label: 'Films Logged',  value: stats.total.toLocaleString(),                              color: '#ff8000' },
    { label: 'Hours Watched', value: stats.hours.toLocaleString(),                              color: '#00e054' },
    { label: 'Avg Rating',    value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—',   color: '#40bcf4' },
  ];

  const extras = [
    { label: 'Countries',  value: stats.countries.size.toString() },
    { label: 'This Year',  value: stats.thisYear.toLocaleString() },
  ];

  function personCard(label, person) {
    if (!person) return '';
    const photo = person.photo
      ? `<img src="${person.photo}" alt="${person.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
      : `<div style="width:100%;height:100%;background:var(--lbs-bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:36px;color:var(--lbs-text-muted);">${person.name.charAt(0)}</div>`;

    return `
      <div class="lbs-featured-person">
        <div class="lbs-featured-label">${label}</div>
        <div class="lbs-featured-photo">${photo}</div>
        <div class="lbs-featured-name">${person.name}</div>
        <div class="lbs-featured-count">${person.count} film${person.count !== 1 ? 's' : ''}</div>
      </div>
    `;
  }

  const hasFeatured = topDir || topActor;

  container.innerHTML = `
    <div class="lbs-overview-circles">
      ${circles.map(c => `
        <div class="lbs-circle-item">
          <div class="lbs-circle" style="background:${c.color}">
            <span class="lbs-circle-value">${c.value}</span>
          </div>
          <div class="lbs-circle-label">${c.label}</div>
        </div>
      `).join('')}
    </div>
    <div class="lbs-overview-extras">
      ${extras.map(e => `
        <div class="lbs-extra-stat">
          <span class="lbs-extra-value">${e.value}</span>
          <span class="lbs-extra-label">${e.label}</span>
        </div>
      `).join('')}
    </div>
    ${hasFeatured ? `
      <div class="lbs-featured-row">
        ${personCard('Most Watched Actor', topActor)}
        <div class="lbs-featured-divider"></div>
        ${personCard('Most Watched Director', topDir)}
      </div>
    ` : ''}
  `;
}
