/* js/core/dom.js */

export const $ = id => document.getElementById(id);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' err' : '');
  t.textContent = msg;
  $('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// Re-lanza una animacion CSS de "pop" / "bump" sobre un elemento
export function pop(el, cls = 'pop') {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
