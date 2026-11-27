import { createHeaderLetters } from './header-letters.js';
// Share the scroll-navigation frame; cache section bounds between layout changes.
export function createHeaderLocation({ document, window, header, compact, initialY = 0, queue }) {
  const nav = header?.querySelector('.nav');
  const status = header?.querySelector('[data-header-location]');
  const label = status?.querySelector('[data-header-section]');
  const prefix = status?.querySelector('[data-header-prefix]');
  if (!nav || !status || !label || !prefix) return { update() {}, refresh() {}, destroy() {} };
  const slot = header.querySelector('.header-navigation') || header;

  const root = document.documentElement, listeners = [];
  const letters = createHeaderLetters({ document, window, root, nav });
  const navLabels = [...(nav.querySelectorAll?.('[data-nav-label]') || [])];
  const sections = [
    [document.querySelector('.hero'), 'Introduction'],
    [document.getElementById('work'), 'Selected work'],
    [document.getElementById('about'), 'About me'],
    [document.getElementById('experience'), 'Experience'],
    [document.getElementById('skills'), 'How I work'],
    [document.getElementById('writing'), 'Writing'],
    [document.getElementById('contact'), 'Contact'],
    [document.querySelector('.portfolio-footer'), 'Footer']
  ].filter(([target]) => target);
  let bounds = [], dirty = true, lastY = initialY, direction = 0, distance = 0;
  let reading = false, hovering = false, focused = header.contains(document.activeElement) && document.activeElement !== status;
  let current = -1, paintFrame = 0, destroyed = false, labelChanged = false;
  const enabled = () => !compact.matches && root.dataset.layout !== 'reader'
    && root.dataset.pageStyles !== 'pending' && !root.classList.contains('loader-running');
  const listen = (target, event, callback) => {
    target?.addEventListener?.(event, callback);
    listeners.push(() => target?.removeEventListener?.(event, callback));
  };
  function paint() {
    const canShow = enabled();
    const showing = canShow && reading && !hovering && !focused;
    if (nav.hidden !== showing) nav.hidden = showing;
    if (status.hidden !== !showing) status.hidden = !showing;
    const mode = showing ? 'location' : 'navigation';
    const previous = header.dataset.navigationMode;
    nav.inert = showing;
    if (nav.getAttribute('aria-hidden') !== String(showing)) nav.setAttribute('aria-hidden', String(showing));
    if (previous !== mode) header.dataset.navigationMode = mode;
    const expanded = String(!showing);
    if (status.getAttribute('aria-expanded') !== expanded) status.setAttribute('aria-expanded', expanded);
    if (!canShow) letters.stop();
    else if ((previous && previous !== mode) || (showing && labelChanged)) letters.play(showing ? [prefix, label] : navLabels);
    labelChanged = false;
  }
  function reveal() { reading = false; distance = 0; paint(); }
  function afterPaint() {
    if (destroyed) return;
    dirty = true;
    if (!enabled()) reveal();
    if (!paintFrame) paintFrame = window.requestAnimationFrame(() => {
      paintFrame = 0;
      if (!destroyed) queue();
    });
  }
  function update(y) {
    if (destroyed) return;
    y = Math.max(0, y);
    const delta = lastY === null ? 0 : y - lastY;
    lastY = y;
    if (!enabled() || !sections.length) { reveal(); return; }
    if (delta) {
      const next = Math.sign(delta);
      if (next !== direction) { direction = next; distance = 0; }
      distance += Math.abs(delta);
      if (direction > 0 && distance >= 32) reading = true;
      if (direction < 0 && distance >= 12) reading = false;
    }
    if (y <= 96) reading = false;
    if (reading) {
      if (dirty) {
        bounds = sections.map(([target, title]) => {
          const rect = target.getBoundingClientRect();
          return { top: rect.top + y, bottom: rect.bottom + y, title };
        });
        dirty = false;
      }
      const line = y + Math.min(window.innerHeight * .3, 200);
      let selected = 0;
      bounds.forEach((section, position) => { if (section.top <= line) selected = position; });
      if (y + window.innerHeight >= bounds.at(-1).bottom - 8) selected = bounds.length - 1;
      if (current !== selected) {
        current = selected;
        label.textContent = bounds[selected].title;
        labelChanged = true;
        status.setAttribute('aria-label', `Current section: ${bounds[selected].title}. Show navigation`);
      }
    }
    paint();
  }
  listen(slot, 'pointerenter', event => { if (event.pointerType !== 'touch') { hovering = true; paint(); } });
  listen(slot, 'pointerleave', () => { hovering = false; paint(); });
  listen(header, 'focusin', event => { focused = event.target !== status; paint(); });
  listen(header, 'focusout', event => { focused = event.relatedTarget !== status && header.contains(event.relatedTarget); paint(); });
  listen(status, 'click', () => { reveal(); nav.querySelector('a')?.focus({ preventScroll: true }); });
  listen(document, 'keydown', event => { if (event.key === 'Tab' || event.key === 'Escape') reveal(); });
  listen(document, 'page-styles:ready', afterPaint);
  listen(document, 'loader:done', afterPaint);
  listen(document, 'display-preferences:change', afterPaint);
  listen(document.fonts, 'loadingdone', afterPaint);
  listen(window, 'pageshow', () => { lastY = null; reveal(); afterPaint(); });
  const observer = window.ResizeObserver ? new window.ResizeObserver(afterPaint) : null;
  sections.forEach(([target]) => observer?.observe(target));
  return {
    update,
    refresh() { lastY = null; direction = 0; reveal(); afterPaint(); },
    destroy() {
      destroyed = true;
      window.cancelAnimationFrame(paintFrame);
      observer?.disconnect(); listeners.forEach(remove => remove());
      letters.destroy();
      nav.hidden = false; nav.inert = false; nav.removeAttribute('aria-hidden'); status.hidden = true;
      status.setAttribute('aria-label', 'Show navigation'); status.removeAttribute('aria-expanded');
      label.textContent = 'Introduction';
      delete header.dataset.navigationMode;
    }
  };
}
