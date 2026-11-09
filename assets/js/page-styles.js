export function activatePageStyles({ document, window }) {
  const sheet = document.getElementById('page-styles');
  if (!sheet) return;
  const image = document.querySelector('.portrait-base');
  let activated = false, resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  function fonts() {
    if (document.getElementById('secondary-fonts')) return;
    const link = document.createElement('link');
    link.id = 'secondary-fonts'; link.rel = 'stylesheet'; link.href = 'assets/css/secondary-fonts.css';
    document.head.append(link);
  }
  function finish() {
    document.documentElement.dataset.pageStyles = 'ready';
    document.dispatchEvent(new window.CustomEvent('page-styles:ready'));
    if (window.matchMedia('(max-width: 800px), (pointer: coarse)').matches && !window.location.hash) {
      if (window.scrollY > 0) fonts();
      else window.addEventListener('scroll', fonts, { once: true, passive: true });
    } else fonts();
  }
  const styles = sheet.sheet ? Promise.resolve() : new Promise(resolve => {
    sheet.addEventListener('load', resolve, { once: true });
    sheet.addEventListener('error', resolve, { once: true });
  });
  function load() { if (!sheet.href) sheet.href = sheet.dataset.href; }
  function activate() {
    if (activated) return;
    activated = true;
    sheet.media = 'all';
    document.removeEventListener('click', onIntent, true);
    document.removeEventListener('keydown', onIntent, true);
    window.removeEventListener('scroll', onIntent);
    finish(); resolveReady();
  }
  function onIntent() {
    load(); sheet.media = 'all';
    styles.then(activate);
  }
  if (window.location.hash || window.scrollY > 0) {
    // A direct section link needs the full layout immediately, not just the hero styles.
    onIntent();
    return ready;
  }
  document.addEventListener('click', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  window.addEventListener('scroll', onIntent, { passive: true });
  const decoded = image?.decode ? Promise.resolve().then(() => image.decode()).catch(() => {}) : Promise.resolve();
  // Even downloading below-the-fold CSS must not compete with the primary image.
  decoded.then(load);
  // Critical CSS already paints the hero. Activate below-the-fold styles after that paint.
  Promise.all([styles, decoded]).then(() => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      activate();
    }));
  });
  return ready;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') activatePageStyles({ document, window });
