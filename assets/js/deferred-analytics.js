export function scheduleAnalytics({ document, window,
  analytics = () => import('./analytics.bundle.js?v=820b33c000bf') }) {
  let started = false, destroyed = false, idle = 0, timer = 0, frame = 0;
  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback, { passive: true });
    listeners.push(() => target.removeEventListener(name, callback));
  };
  const clean = () => listeners.splice(0).forEach(remove => remove());
  const tasks = [];
  function queue() {
    if (destroyed || !tasks.length) return;
    const run = () => {
      if (destroyed) return;
      const task = tasks.shift();
      Promise.resolve().then(task).catch(error => console.warn('Optional analytics unavailable.', error)).finally(queue);
    };
    if (window.requestIdleCallback) idle = window.requestIdleCallback(run, { timeout: 2000 });
    else timer = window.setTimeout(run, 250);
  }
  function start() {
    if (started || destroyed || document.hidden) return;
    started = true;
    clean();
    const production = ['sujeetkhadka.com.np', 'www.sujeetkhadka.com.np'].includes(window.location.hostname);
    if (production) tasks.push(() => {
      const tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://www.googletagmanager.com/gtm.js?id=G-0000C91B56';
      document.head.append(tag);
    });
    const usage = production && ['/', '/privacy', '/privacy/'].includes(window.location.pathname);
    const panel = !!document.querySelector('.presence-panel');
    if (usage || panel) tasks.push(async () => {
      const module = await analytics();
      if (destroyed) return;
      if (usage) tasks.push(() => { if (!destroyed) controllers.push(module.createUsageTracker({ document, window })); });
      if (panel) tasks.push(() => { if (!destroyed) controllers.push(module.createVisitorPanel({ document, window })); });
    });
    // Yield two paints after load/interaction, then run one initializer per idle task.
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(queue);
    });
  }
  const controllers = [];
  listen(window, 'load', start);
  listen(document, 'pointerdown', start);
  listen(document, 'keydown', start);
  listen(window, 'scroll', start);
  listen(document, 'visibilitychange', () => { if (document.readyState === 'complete') start(); });
  if (document.readyState === 'complete') start();
  return { destroy() {
    destroyed = true;
    clean(); tasks.length = 0;
    window.cancelAnimationFrame(frame);
    window.cancelIdleCallback?.(idle);
    window.clearTimeout(timer);
    controllers.forEach(controller => controller.destroy());
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') scheduleAnalytics({ document, window });
