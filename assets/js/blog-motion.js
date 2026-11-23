import { motionIsReduced } from './display-state.js?v=20261123-performance';
const clamp = value => Math.max(0, Math.min(1, value));

export function createBlogMotion({ document, window }) {
  const noop = { refresh() {}, destroy() {} };
  if (!window.requestAnimationFrame || !document.createElement || !document.body?.append) return noop;
  const connection = window.navigator?.connection;
  if (connection?.saveData || (window.navigator?.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 2)
    || (window.navigator?.deviceMemory > 0 && window.navigator.deviceMemory <= 2)) return noop;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const image = document.querySelector('.notebook-feature-image img');
  const design = document.querySelector('[data-design-loop]');
  const pause = document.querySelector('[data-design-pause]');
  const root = document.documentElement;
  const progress = document.createElement('div');
  progress.className = 'blog-reading-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.hidden = true;
  document.body.append(progress);

  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback, { passive: true });
    listeners.push(() => target.removeEventListener(name, callback));
  };
  let frame = 0, maximum = 0, needsMeasure = true, destroyed = false, suspended = false;
  let lastProgress = -1, lastOffset = -1;
  let designVisible = !window.IntersectionObserver, designPaused = false;
  function updateDesign() {
    if (!design) return;
    design.dataset.designRunning = String(!destroyed && !suspended && !document.hidden
      && !motionIsReduced(root, reducedMotion) && designVisible && !designPaused);
    design.dataset.designPaused = String(designPaused);
    if (pause) {
      pause.hidden = destroyed || motionIsReduced(root, reducedMotion);
      pause.textContent = designPaused ? 'Play animation' : 'Pause animation';
    }
  }
  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  }
  function paint() {
    frame = 0;
    if (destroyed || suspended || document.hidden || motionIsReduced(root, reducedMotion)) return;
    if (needsMeasure) {
      maximum = Math.max(0, root.scrollHeight - window.innerHeight);
      needsMeasure = false;
    }
    const position = Math.max(0, window.scrollY || 0);
    const value = maximum ? clamp(position / maximum) : 0;
    if (value !== lastProgress) {
      progress.style.setProperty('--reading-progress', String(value));
      lastProgress = value;
    }
    const offset = clamp(position / 650) * 4;
    if (image && offset !== lastOffset) {
      image.style.setProperty('--blog-image-offset', `${offset.toFixed(2)}px`);
      lastOffset = offset;
    }
  }
  function schedule() {
    if (!destroyed && !suspended && !document.hidden && !motionIsReduced(root, reducedMotion) && !frame) frame = window.requestAnimationFrame(paint);
  }
  function refresh() {
    needsMeasure = true;
    schedule();
  }
  function updatePreference() {
    stop();
    progress.hidden = motionIsReduced(root, reducedMotion);
    root.dataset.blogMotion = motionIsReduced(root, reducedMotion) ? 'off' : 'active';
    updateDesign();
    if (motionIsReduced(root, reducedMotion)) {
      image?.style.removeProperty('--blog-image-offset');
      lastOffset = -1;
    } else refresh();
  }
  function visibility() {
    updateDesign();
    if (document.hidden) stop();
    else refresh();
  }
  let observer;
  let designObserver;
  if (design && window.IntersectionObserver) {
    designObserver = new window.IntersectionObserver(entries => {
      designVisible = entries.some(entry => entry.isIntersecting);
      updateDesign();
    });
    designObserver.observe(design);
  }
  if (design && pause) listen(pause, 'click', () => {
    designPaused = !designPaused;
    updateDesign();
  });
  const main = document.querySelector('.blog-main');
  if (window.ResizeObserver && main) {
    observer = new window.ResizeObserver(refresh);
    observer.observe(main);
  }
  listen(window, 'scroll', schedule);
  listen(window, 'resize', refresh);
  listen(document, 'visibilitychange', visibility);
  listen(reducedMotion, 'change', updatePreference);
  listen(document, 'display-preferences:change', updatePreference);
  listen(window, 'pagehide', event => {
    suspended = true;
    updateDesign();
    stop();
    if (!event.persisted) destroy();
  });
  listen(window, 'pageshow', () => { suspended = false; updateDesign(); refresh(); });
  updatePreference();
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    updateDesign();
    stop();
    observer?.disconnect();
    designObserver?.disconnect();
    if (design) {
      delete design.dataset.designRunning;
      delete design.dataset.designPaused;
    }
    listeners.forEach(remove => remove());
    image?.style.removeProperty('--blog-image-offset');
    delete root.dataset.blogMotion;
    progress.remove();
  }
  return { refresh, destroy };
}
