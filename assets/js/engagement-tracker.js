// Estimate foreground reading time. Only fixed section names and counters leave this controller.
export function createEngagementTracker({ document, window, sections = [], send,
  now = () => window.performance.now() }) {
  const idleMs = 60000;
  const reportMs = 15000;
  const maximumMs = 3600000;
  let destroyed = false, leaving = false, focused = document.hasFocus();
  let lastTick = now(), lastActivity = lastTick, lastPointer = -Infinity;
  let eligible = canMeasure(), activeSection = '', timer = 0, frame = 0;
  let pageTime = 0, measured = 0;
  const sectionTime = new Map(), depths = new Set(), listeners = [];
  function listen(target, name, callback, options) {
    target.addEventListener(name, callback, options);
    listeners.push(() => target.removeEventListener(name, callback, options));
  }
  function canMeasure() {
    return !document.hidden && focused && !leaving
      && !document.documentElement.classList.contains('loader-running');
  }
  function account(time = now()) {
    const elapsed = time - lastTick;
    // Long gaps can be device sleep or a suspended browser, not time spent reading.
    const amount = eligible && elapsed >= 0 && elapsed <= reportMs * 2
      ? Math.floor(Math.max(0, Math.min(time, lastActivity + idleMs) - lastTick)) : 0;
    const value = Math.min(amount, maximumMs - measured);
    if (value > 0) {
      if (pageTime + value > 30000) flush();
      pageTime += value;
      measured += value;
      const covered = document.querySelector?.('.skill-modal.is-open, .presence-panel.is-open');
      if (activeSection && !covered) sectionTime.set(activeSection, (sectionTime.get(activeSection) || 0) + value);
    }
    lastTick = time;
  }
  function flush() {
    if (!pageTime) return;
    send('engagement', { milliseconds: pageTime, sections: Object.fromEntries(sectionTime) });
    pageTime = 0;
    sectionTime.clear();
  }
  function stopTimer() { window.clearInterval(timer); timer = 0; }
  function startTimer() {
    if (timer || !eligible || measured >= maximumMs || now() >= lastActivity + idleMs) return;
    timer = window.setInterval(() => {
      account();
      flush();
      if (!eligible || now() >= lastActivity + idleMs || measured >= maximumMs) stopTimer();
    }, reportMs);
  }
  function viewport() {
    frame = 0;
    if (destroyed || !eligible) return;
    account();
    const point = window.innerHeight * .38;
    const section = sections.find(section => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= point && bounds.bottom > point;
    });
    activeSection = section ? section.id || 'hero' : '';
    if (!sections.length || now() >= lastActivity + idleMs) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    // A short page that cannot scroll does not imply that every milestone was read.
    if (scrollable <= 0) return;
    const percent = (Math.max(0, window.scrollY) + 8) / scrollable * 100;
    for (const depth of [25, 50, 75, 100]) {
      if (percent >= depth && !depths.has(depth)) {
        depths.add(depth);
        send('depth', { name: String(depth) });
      }
    }
  }
  function queueViewport() {
    if (!destroyed && eligible && !frame) frame = window.requestAnimationFrame(viewport);
  }
  function activity(event) {
    if (destroyed || leaving || document.hidden) return;
    const time = now();
    if (event.type === 'pointermove' && time - lastPointer < 1000) return;
    if (event.type === 'pointermove') lastPointer = time;
    account(time);
    lastActivity = time;
    eligible = canMeasure();
    startTimer();
  }
  function refresh() {
    account();
    focused = document.hasFocus();
    eligible = canMeasure();
    if (eligible) {
      lastActivity = now();
      startTimer();
      queueViewport();
    } else {
      flush();
      stopTimer();
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  for (const name of ['pointerdown', 'pointermove', 'keydown', 'touchstart']) {
    listen(document, name, activity, { passive: true });
  }
  listen(window, 'scroll', event => { activity(event); queueViewport(); }, { passive: true });
  listen(window, 'resize', queueViewport, { passive: true });
  listen(window, 'blur', () => {
    account(); focused = false; eligible = false; flush(); stopTimer();
  });
  listen(window, 'focus', refresh);
  listen(document, 'visibilitychange', refresh);
  listen(document, 'loader:done', refresh);
  listen(window, 'pagehide', () => {
    account(); flush(); leaving = true; eligible = false; stopTimer();
    window.cancelAnimationFrame(frame); frame = 0;
  });
  listen(window, 'pageshow', event => {
    if (event.persisted) { leaving = false; refresh(); }
  });
  queueViewport();
  startTimer();
  return { destroy() {
    if (destroyed) return;
    account(); flush(); destroyed = true;
    stopTimer();
    window.cancelAnimationFrame(frame);
    listeners.forEach(remove => remove());
  } };
}
