export function createMobileNavigation({ document, window }) {
  const nav = document.querySelector('.mobile-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links.map(link => document.getElementById(link.getAttribute('href').slice(1)));
  const compact = window.matchMedia('(max-width: 800px), (max-width: 1100px) and (pointer: coarse)');
  let frame = 0, paintFrame = 0, destroyed = false;
  function select(current) {
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function update() {
    frame = 0;
    if (destroyed || !compact.matches) return;
    if (document.documentElement?.dataset.pageStyles === 'pending'
      || document.documentElement?.classList.contains('loader-running')) return;
    const line = Math.min(window.innerHeight * .35, 220);
    let current = 0;
    targets.forEach((target, index) => { if (target && target.getBoundingClientRect().top <= line) current = index; });
    select(current);
  }
  function queue() { if (!destroyed && !frame) frame = window.requestAnimationFrame(update); }
  function afterPaint() {
    if (destroyed || paintFrame) return;
    // CSS activation can invalidate the whole document. Allow that frame to
    // paint before measuring section positions for the navigation highlight.
    paintFrame = window.requestAnimationFrame(() => { paintFrame = 0; queue(); });
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('pageshow', afterPaint);
  document.addEventListener('page-styles:ready', afterPaint);
  document.addEventListener('loader:done', afterPaint);
  // The URL supplies the initial selection without a synchronous startup layout.
  select(Math.max(0, links.findIndex(link => link.getAttribute('href') === window.location?.hash)));
  return { destroy() {
    destroyed = true;
    window.cancelAnimationFrame(frame);
    window.cancelAnimationFrame(paintFrame);
    window.removeEventListener('scroll', queue);
    window.removeEventListener('resize', queue);
    window.removeEventListener('pageshow', afterPaint);
    document.removeEventListener('page-styles:ready', afterPaint);
    document.removeEventListener('loader:done', afterPaint);
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createMobileNavigation({ document, window });
