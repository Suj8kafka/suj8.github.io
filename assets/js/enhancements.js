function script(document, src) {
  return new Promise((resolve, reject) => {
    const element = document.createElement('script');
    element.src = src; element.async = true;
    element.onload = resolve;
    element.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.append(element);
  });
}

async function loadMotion(document, window) {
  if (!window.gsap) await script(document, 'assets/vendor/gsap/gsap.min.js');
  if (!window.ScrollTrigger) await script(document, 'assets/vendor/gsap/ScrollTrigger.min.js');
  return import('./motion.js?v=20261109-mobile-lcp');
}

export async function loadServices(document, {
  presence = () => import('./firebase-presence.js?v=20261112-presence'),
  availability = () => import('./availability-client.js')
} = {}) {
  const results = await Promise.allSettled([Promise.resolve().then(presence), Promise.resolve().then(availability)]);
  if (results[0].status === 'rejected') {
    const label = document.querySelector('.live-presence-label');
    const dot = document.querySelector('.live-presence-dot');
    const button = document.querySelector('.live-presence');
    if (label) label.textContent = 'Live presence unavailable';
    if (dot) dot.dataset.state = 'error';
    if (button) button.disabled = button.dataset?.analyticsReady !== 'true';
    console.warn('Live presence could not be loaded.', results[0].reason);
  }
  return results;
}

export function scheduleEnhancements({ document, window, motion = () => loadMotion(document, window),
  portrait = () => import('./portrait-network.js?v=20261109-mobile-lcp'),
  services = () => loadServices(document) }) {
  let started = false, queued = false, destroyed = false, frame = 0, idle = 0, timer = 0;
  let imageReady = false, decoding = false, motionStarted = false;
  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  function run() {
    queued = false;
    if (destroyed || started || document.hidden || document.documentElement.classList.contains('loader-running')) return;
    started = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = window.matchMedia('(max-width: 800px)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const constrained = window.navigator.connection?.saveData
      || (window.navigator.deviceMemory > 0 && window.navigator.deviceMemory <= 4)
      || (window.navigator.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 4);
    const launch = task => Promise.resolve().then(task).catch(error => console.warn('Optional portfolio enhancement unavailable.', error));
    launch(services);
    const startMotion = () => {
      if (destroyed || motionStarted || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      motionStarted = true;
      launch(motion);
    };
    if (!reduced) {
      if (compact) {
        // The ribbon/parallax is useful once the reader scrolls, not while the hero paints.
        listen(window, 'scroll', startMotion);
        if (window.scrollY > 0) startMotion();
      } else startMotion();
    }
    // Mobile/reduced-motion visitors keep the lightweight colour image, without 1,643 inline paths.
    if (!reduced && !compact && fine && !constrained) launch(portrait);
  }
  function queue() {
    if (destroyed || started || queued || document.readyState !== 'complete' || document.hidden
      || document.documentElement.dataset?.pageStyles === 'pending'
      || document.documentElement.classList.contains('loader-running')) return;
    if (!imageReady) {
      if (decoding) return;
      decoding = true;
      const image = document.querySelector?.('.portrait-base');
      const decoded = image?.decode ? Promise.resolve().then(() => image.decode()) : Promise.resolve();
      const done = () => { if (!destroyed) { imageReady = true; queue(); } };
      decoded.then(done, done); // A broken image must not block the remaining enhancements.
      return;
    }
    queued = true;
    // Give loaded content two paint opportunities before requesting background work.
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        if (window.requestIdleCallback) idle = window.requestIdleCallback(run, { timeout: 1500 });
        else timer = window.setTimeout(run, 250);
      });
    });
  }
  listen(window, 'load', queue);
  listen(document, 'loader:done', queue);
  listen(document, 'page-styles:ready', queue);
  listen(document, 'visibilitychange', queue);
  queue();
  return { destroy() {
    destroyed = true;
    window.cancelAnimationFrame(frame);
    window.cancelIdleCallback?.(idle);
    window.clearTimeout(timer);
    listeners.forEach(remove => remove());
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') scheduleEnhancements({ document, window });
