export function createPrivacyIllustration({ document, window }) {
  const illustration = document.querySelector('[data-privacy-illustration]');
  const toggle = document.querySelector('[data-privacy-illustration-toggle]');
  if (!illustration) return { destroy() {} };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = window.navigator?.connection;
  const constrained = Boolean(connection?.saveData
    || (window.navigator?.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 2)
    || (window.navigator?.deviceMemory > 0 && window.navigator.deviceMemory <= 2));
  const listeners = [];
  const listen = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  let destroyed = false, suspended = false, paused = false;
  let visible = !window.IntersectionObserver;

  function update() {
    const canAnimate = !destroyed && !suspended && !document.hidden && visible
      && !paused && !constrained && !reducedMotion.matches;
    illustration.dataset.illustrationRunning = String(canAnimate);
    illustration.dataset.illustrationPaused = String(paused);
    if (toggle) {
      toggle.hidden = destroyed || constrained || reducedMotion.matches;
      toggle.textContent = paused ? 'Play animation' : 'Pause animation';
      toggle.setAttribute('aria-pressed', String(paused));
    }
  }

  let observer;
  if (window.IntersectionObserver) {
    observer = new window.IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      update();
    });
    observer.observe(illustration);
  }
  if (toggle) listen(toggle, 'click', () => { paused = !paused; update(); });
  listen(document, 'visibilitychange', update);
  listen(reducedMotion, 'change', update);
  listen(window, 'pagehide', event => {
    suspended = true;
    update();
    if (!event.persisted) destroy();
  });
  listen(window, 'pageshow', () => { suspended = false; update(); });
  update();

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    observer?.disconnect();
    listeners.forEach(remove => remove());
    delete illustration.dataset.illustrationRunning;
    delete illustration.dataset.illustrationPaused;
  }
  return { destroy };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  createPrivacyIllustration({ document, window });
}
