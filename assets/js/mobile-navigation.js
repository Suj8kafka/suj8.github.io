export function createMobileNavigation({ document, window }) {
  const nav = document.querySelector('.mobile-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links.map(link => document.getElementById(link.getAttribute('href').slice(1)));
  const compact = window.matchMedia('(max-width: 800px), (max-width: 1100px) and (pointer: coarse)');
  let frame = 0, destroyed = false;
  function update() {
    frame = 0;
    if (destroyed || !compact.matches) return;
    const line = Math.min(window.innerHeight * .35, 220);
    let current = 0;
    targets.forEach((target, index) => { if (target && target.getBoundingClientRect().top <= line) current = index; });
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function queue() { if (!destroyed && !frame) frame = window.requestAnimationFrame(update); }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  window.addEventListener('pageshow', queue);
  document.addEventListener('page-styles:ready', queue);
  document.addEventListener('loader:done', queue);
  update();
  return { destroy() {
    destroyed = true;
    window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', queue);
    window.removeEventListener('resize', queue);
    window.removeEventListener('pageshow', queue);
    document.removeEventListener('page-styles:ready', queue);
    document.removeEventListener('loader:done', queue);
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createMobileNavigation({ document, window });
