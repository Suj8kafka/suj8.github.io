export function activatePageStyles({ document, window }) {
  // Saved reading preferences can load the full sheet before this module runs.
  // Reuse that link rather than issuing a second request from the deferred link.
  const sheet = document.getElementById('reading-styles') || document.getElementById('page-styles');
  if (!sheet) return;
  const image = document.querySelector('.portrait-base');
  // Scroll events (including restored positions) signal intent without a geometry
  // read that can synchronously lay out the entire page during module startup.
  let scrolled = false;
  let activated = false, resolveReady, imageTimer, activationTimer, frame;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  function fonts() {
    if (document.getElementById('secondary-fonts')) return;
    const link = document.createElement('link');
    link.id = 'secondary-fonts'; link.rel = 'stylesheet'; link.href = 'assets/css/secondary-fonts.css';
    document.head.append(link);
  }
  function finish() {
    document.documentElement.dataset.pageStyles = 'ready';
    // Apply the full sheet without tweening from the temporary critical styles.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      document.documentElement.dataset.pageTransitions = 'ready';
    }));
    document.dispatchEvent(new window.CustomEvent('page-styles:ready'));
    if (window.matchMedia('(max-width: 800px), (pointer: coarse)').matches && !window.location.hash) {
      if (scrolled) fonts();
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
    window.clearTimeout(imageTimer);
    window.clearTimeout(activationTimer);
    window.cancelAnimationFrame(frame);
    sheet.media = 'all';
    document.removeEventListener('click', onIntent, true);
    document.removeEventListener('keydown', onIntent, true);
    window.removeEventListener('scroll', onIntent);
    finish(); resolveReady();
  }
  function onIntent(event) {
    if (event?.type === 'scroll') scrolled = true;
    load(); sheet.media = 'all';
    styles.then(activate);
  }
  if (window.location.hash) {
    // A direct section link needs the full layout immediately, not just the hero styles.
    onIntent();
    return ready;
  }
  document.addEventListener('click', onIntent, true);
  document.addEventListener('keydown', onIntent, true);
  window.addEventListener('scroll', onIntent, { passive: true });
  const decoded = image?.decode ? Promise.resolve().then(() => image.decode()).catch(() => {}) : Promise.resolve();
  // Give the primary image a head start, but never leave the rest of the page
  // waiting indefinitely on a slow or stalled image request.
  const imageBudget = new Promise(resolve => { imageTimer = window.setTimeout(resolve, 800); });
  const contentReady = Promise.race([decoded, imageBudget]);
  contentReady.then(() => { window.clearTimeout(imageTimer); load(); });
  // Critical CSS already paints the hero. Activate below-the-fold styles after that paint.
  Promise.all([styles, contentReady]).then(() => {
    if (activated) return;
    // Background/restoring tabs can suspend animation frames. Full styling must
    // still become usable once its resources are ready.
    activationTimer = window.setTimeout(activate, 150);
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(activate);
    });
  });
  return ready;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') activatePageStyles({ document, window });
