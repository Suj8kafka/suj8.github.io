import { motionIsReduced } from './display-state.js?v=20261123-performance';
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
  return import('./motion.js?v=20261125-motion-cleanup');
}

export async function loadServices(document, {
  presence = () => import('./firebase-presence.js?v=20261123-performance'),
  availability = () => import('./availability-client.js')
} = {}) {
  const live = Promise.resolve().then(presence).catch(error => {
    const label = document.querySelector('.live-presence-label');
    const dot = document.querySelector('.live-presence-dot');
    const button = document.querySelector('.live-presence');
    if (label) label.textContent = 'Live presence unavailable';
    if (dot) dot.dataset.state = 'error';
    if (button) button.disabled = button.dataset?.analyticsReady !== 'true';
    console.warn('Live presence could not be loaded.', error);
    throw error;
  });
  return Promise.allSettled([live, Promise.resolve().then(availability)]);
}

export function scheduleEnhancements({ document, window, motion = () => loadMotion(document, window),
  portrait = () => import('./portrait-network.js?v=20261123-performance'),
  services = () => loadServices(document) }) {
  let started = false, queued = false, destroyed = false, frame = 0, idle = 0, timer = 0;
  let imageReady = false, decoding = false, motionStarted = false;
  let servicesStarted = false, servicesQueued = false, servicesFrame = 0, servicesIdle = 0, servicesTimer = 0;
  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  const launch = task => Promise.resolve().then(task).catch(error => console.warn('Optional portfolio enhancement unavailable.', error));
  function queueServices() {
    if (destroyed || servicesStarted || servicesQueued || document.hidden || document.readyState === 'loading') return;
    servicesQueued = true;
    const start = () => {
      servicesQueued = false;
      if (destroyed || servicesStarted || document.hidden) return;
      servicesStarted = true;
      launch(services);
    };
    // Live UI needs no portrait, full stylesheet or completed welcome animation.
    servicesFrame = window.requestAnimationFrame(() => {
      servicesFrame = window.requestAnimationFrame(() => {
        if (window.requestIdleCallback) servicesIdle = window.requestIdleCallback(start, { timeout: 1500 });
        else servicesTimer = window.setTimeout(start, 250);
      });
    });
  }
  function run() {
    queued = false;
    if (destroyed || started || document.hidden || document.documentElement.classList.contains('loader-running')) return;
    started = true;
    const reduced = motionIsReduced(document.documentElement, window.matchMedia('(prefers-reduced-motion: reduce)'));
    const compact = window.matchMedia('(max-width: 800px)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const constrained = window.navigator.connection?.saveData
      || (window.navigator.deviceMemory > 0 && window.navigator.deviceMemory <= 4)
      || (window.navigator.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 4);
    const startMotion = () => {
      if (destroyed || motionStarted || document.hidden || motionIsReduced(document.documentElement, window.matchMedia('(prefers-reduced-motion: reduce)'))) return;
      motionStarted = true;
      launch(motion);
    };
    listen(document, 'display-preferences:change', startMotion);
    if (!reduced) {
      if (compact) {
        // The ribbon/parallax is useful once the reader scrolls, not while the hero paints.
        listen(window, 'scroll', startMotion);
        if (window.scrollY > 0) startMotion();
      } else startMotion();
    }
    // Mobile/reduced-motion visitors keep the lightweight colour image, without 1,643 inline paths.
    let portraitStarted = false;
    const startPortrait = () => {
      if (destroyed || portraitStarted || compact || !fine || constrained
        || motionIsReduced(document.documentElement, window.matchMedia('(prefers-reduced-motion: reduce)'))) return;
      portraitStarted = true;
      launch(portrait);
    };
    listen(document, 'display-preferences:change', startPortrait);
    startPortrait();
  }
  function queue() {
    queueServices();
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
    window.cancelAnimationFrame(servicesFrame);
    window.cancelIdleCallback?.(servicesIdle);
    window.clearTimeout(servicesTimer);
    listeners.forEach(remove => remove());
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') scheduleEnhancements({ document, window });
