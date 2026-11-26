import { motionIsReduced } from './display-state.js?v=20261123-performance';
import { createFooterGraphics } from './footer-graphics.js';
import { createFooterCharacter } from './footer-character.js';

// CSS owns the turns; canvas motion shares the same visibility and pause gate.
export function createFooterMotion({ document, window, graphics = createFooterGraphics, character = createFooterCharacter }) {
  const footer = document.querySelector('.portfolio-footer');
  const button = footer?.querySelector('.footer-motion-toggle');
  if (!footer || !button) return { destroy() {} };
  const artwork = graphics({ document, window });
  const companion = character({ document, window });
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 800px), (max-width: 1100px) and (pointer: coarse)');
  const connection = window.navigator.connection;
  const listeners = [];
  let visible = false, userPaused = false, destroyed = false;
  const listen = (target, name, callback) => {
    target?.addEventListener?.(name, callback);
    listeners.push(() => target?.removeEventListener?.(name, callback));
  };
  function update() {
    if (destroyed) return;
    const constrained = connection?.saveData
      || (window.navigator.deviceMemory > 0 && window.navigator.deviceMemory <= 4)
      || (window.navigator.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 4);
    const allowed = !compact.matches && !constrained && !motionIsReduced(document.documentElement, media)
      && Boolean(window.IntersectionObserver);
    footer.dataset.footerMotion = allowed && visible && !document.hidden && !userPaused ? 'running' : 'paused';
    artwork.setRunning(footer.dataset.footerMotion === 'running');
    const preferences = document.documentElement.dataset;
    companion.setRunning(footer.dataset.footerMotion === 'running'
      && !['115', '130'].includes(preferences.textScale) && preferences.dyslexiaSpacing !== 'on');
    button.hidden = !allowed;
    button.textContent = userPaused ? 'Resume motion' : 'Pause motion';
  }
  const observer = window.IntersectionObserver ? new window.IntersectionObserver(entries => {
    if (destroyed) return;
    visible = entries.some(entry => entry.isIntersecting);
    update();
  }, { threshold: 0 }) : null;
  observer?.observe(footer);
  listen(button, 'click', () => { userPaused = !userPaused; update(); });
  listen(document, 'visibilitychange', update);
  listen(document, 'display-preferences:change', update);
  listen(media, 'change', update);
  listen(compact, 'change', update);
  listen(connection, 'change', update);
  update();
  return { destroy() {
    destroyed = true;
    observer?.disconnect();
    listeners.forEach(remove => remove());
    artwork.destroy();
    companion.destroy();
    footer.dataset.footerMotion = 'paused';
    button.hidden = true;
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createFooterMotion({ document, window });
