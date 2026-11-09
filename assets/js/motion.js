import { createParallax } from './parallax.js?v=20261108-gsap';
import { createScrollTrail } from './scroll-trail.js?v=20261109-ribbon';

export function createPortfolioMotion({ document, window, gsap = window.gsap, ScrollTrigger = window.ScrollTrigger }) {
  const root = document.documentElement;
  const listeners = [];
  let media, started = false, destroyed = false;
  function listen(target, name, callback) {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  }
  function start() {
    if (started || destroyed || document.hidden || root.classList.contains('loader-running')) return;
    started = true;
    if (!gsap || !ScrollTrigger) { root.dataset.motionEngine = 'static'; return; }
    gsap.registerPlugin(ScrollTrigger);
    media = gsap.matchMedia();
    media.add({ all: 'all', reduced: '(prefers-reduced-motion: reduce)', compact: '(max-width: 800px)', fine: '(pointer: fine)' }, context => {
      const { reduced, compact, fine } = context.conditions;
      const constrained = (window.navigator.deviceMemory > 0 && window.navigator.deviceMemory <= 4)
        || (window.navigator.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 4)
        || window.navigator.connection?.saveData;
      const light = compact || !fine || constrained;
      root.dataset.motionEngine = reduced ? 'static' : 'gsap';
      root.dataset.motionTier = light ? 'light' : 'full';
      // Content stays at its painted opacity and position. Starting a `from`
      // reveal after the loader or first intersection caused visible -> hidden flashes.
      if (reduced) return;
      const depth = createParallax({ document, window, gsap, ScrollTrigger, light });
      const trail = createScrollTrail({ document, window, gsap, ScrollTrigger, light });
      return () => { trail.destroy(); depth.destroy(); };
    });
  }
  listen(document, 'loader:done', start);
  listen(document, 'visibilitychange', start);
  listen(window, 'load', start);
  if (root.dataset.loaderDone === 'true' || !root.classList.contains('loader-running')) start();
  return { destroy() {
    destroyed = true; media?.revert(); listeners.forEach(remove => remove());
    delete root.dataset.motionEngine; delete root.dataset.motionTier;
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const boot = () => createPortfolioMotion({ document, window });
  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
}
