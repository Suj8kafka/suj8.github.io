// Let the browser own scroll positions; a viewport-sized blur fades with scroll speed.
export function createScrollNavigation({ document, window }) {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const connection = window.navigator?.connection;
  const listeners = [];
  const streak = document.createElement('div');
  streak.className = 'scroll-motion';
  streak.setAttribute('aria-hidden', 'true');
  document.body.append(streak);
  let frame = 0, settleTimer = 0, failSafe = 0, active = null, destroyed = false;
  let constrained = (window.navigator?.deviceMemory > 0 && window.navigator.deviceMemory <= 4)
    || (window.navigator?.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 4);
  let fullEffects = false;

  function listen(target, event, callback, options = { passive: true }) {
    target?.addEventListener(event, callback, options);
    listeners.push(() => target?.removeEventListener(event, callback, options));
  }
  function updateEffects() {
    fullEffects = !constrained && !connection?.saveData && !reducedMotion.matches
      && finePointer.matches && window.innerWidth > 800;
    root.dataset.scrollEffects = reducedMotion.matches ? 'minimal' : fullEffects ? 'full' : 'light';
    if (reducedMotion.matches) streak.style.opacity = '0';
  }
  function updateHeader(y) {
    if (!header) return;
    const detached = header.classList.contains('is-detached');
    const next = detached ? y > 8 : y > 28;
    if (next !== detached) header.classList.toggle('is-detached', next);
  }
  function clearTimers() {
    window.clearTimeout(settleTimer); window.clearTimeout(failSafe);
    settleTimer = failSafe = 0;
  }
  function focusDestination(trip) {
    if (!trip.keyboard) return;
    const heading = trip.target.querySelector('h1, h2') || trip.target;
    if (!heading.hasAttribute('tabindex')) {
      heading.setAttribute('tabindex', '-1');
      heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
    }
    heading.focus({ preventScroll: true });
  }
  function finish(cancelled = false) {
    if (!active) return;
    const trip = active;
    active = null;
    clearTimers();
    root.classList.remove('is-anchor-scrolling');
    streak.style.opacity = '0';
    document.dispatchEvent(new window.CustomEvent('scroll-navigation:end'));
    if (!cancelled) focusDestination(trip);
  }
  function cancel() {
    if (!active) return;
    // A single instant request stops the browser's current trip; never fight user input.
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
    finish(true);
  }
  function queueSettle() {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => finish(), 180);
  }
  function onFrame(time) {
    frame = 0;
    if (destroyed) return;
    const y = window.scrollY;
    updateHeader(y);
    if (!active) return;
    const delta = Math.max(16, time - active.previousTime);
    // Use lighter blur if actual scroll frames repeatedly miss their budget.
    active.slowFrames = delta > 45 ? active.slowFrames + 1 : 0;
    if (active.slowFrames >= 3 && fullEffects) { constrained = true; updateEffects(); }
    if (!reducedMotion.matches) {
      const velocity = Math.min(1, Math.abs(y - active.previousY) / delta / 4.5);
      active.speed += (velocity - active.speed) * (1 - Math.exp(-delta / 70));
      streak.style.opacity = (Math.sqrt(active.speed) * .95).toFixed(3);
    }
    active.previousY = y; active.previousTime = time;
    queueSettle();
  }
  function onScroll() {
    if (!destroyed && !document.hidden && !frame) frame = window.requestAnimationFrame(onFrame);
  }
  function onClick(event) {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    if (!link.matches('[data-contact-scroll], [data-back-to-top]')) { cancel(); return; }
    if (link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const target = document.getElementById(link.hasAttribute('data-back-to-top') ? 'top' : 'contact');
    if (!target?.scrollIntoView) return; // Keep the real anchor usable if enhancement is unavailable.
    event.preventDefault();
    cancel();
    const keyboard = event.detail === 0;
    if (reducedMotion.matches) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      updateHeader(window.scrollY);
      focusDestination({ target, keyboard });
      return;
    }
    active = { target, keyboard, previousY: window.scrollY, previousTime: window.performance.now(),
      startedAt: window.performance.now(), speed: 0, slowFrames: 0 };
    root.classList.add('is-anchor-scrolling');
    document.dispatchEvent(new window.CustomEvent('scroll-navigation:start'));
    target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    queueSettle(); // Also clean up clicks made when already at the destination.
    failSafe = window.setTimeout(() => finish(true), 4000);
  }
  function onMotionChange() {
    updateEffects();
    if (reducedMotion.matches && active) {
      const trip = active;
      cancel();
      trip.target.scrollIntoView({ block: 'start', behavior: 'instant' });
      focusDestination(trip);
    }
  }
  const navigationKeys = new Set(['Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
  listen(document, 'click', onClick, { passive: false });
  listen(window, 'scroll', onScroll);
  listen(document, 'scrollend', () => {
    // Ignore scrollend from a previous trip cancelled by a rapid second click.
    if (active && window.performance.now() - active.startedAt > 80) finish();
  });
  listen(window, 'wheel', cancel);
  listen(window, 'touchmove', cancel);
  listen(window, 'pointerdown', cancel);
  listen(document, 'keydown', event => { if (navigationKeys.has(event.key)) cancel(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) cancel(); });
  listen(window, 'pagehide', cancel);
  listen(window, 'resize', () => { updateEffects(); onScroll(); });
  listen(reducedMotion, 'change', onMotionChange);
  listen(finePointer, 'change', updateEffects);
  listen(connection, 'change', updateEffects);
  updateEffects(); updateHeader(window.scrollY);

  return { destroy() {
    cancel(); destroyed = true;
    window.cancelAnimationFrame(frame); clearTimers();
    listeners.forEach(remove => remove());
    streak.remove(); delete root.dataset.scrollEffects;
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createScrollNavigation({ document, window });
