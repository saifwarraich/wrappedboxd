// Small DOM-construction helpers used in place of innerHTML assignment.
// Building elements via createElement/textContent instead of parsing HTML
// strings avoids the "unsafe assignment to innerHTML" class of warnings
// from store review linters (and is safe against injection by construction,
// since no HTML parsing of dynamic data ever happens).

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'className') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
}

export function setEmptyState(container, text) {
  clear(container);
  container.append(h('div', { className: 'lbs-empty-state', text }));
}

export function setChildren(container, children) {
  clear(container);
  append(container, children);
}
