/* Full greeting sequence; phones reveal the page early and finish in a small panel. */
(() => {
  const loader = document.getElementById('loader');
  if (!loader) return;
  const root = document.documentElement;
  if (root.dataset.loaderDone === 'true') return;
  const compact = matchMedia('(max-width: 800px), (pointer: coarse)').matches;
  const word = document.getElementById('ld-word');
  const language = document.getElementById('ld-lang');
  const fill = document.getElementById('ld-fill');
  const progress = loader.querySelector('.ld-bar');
  const skip = loader.querySelector('.ld-skip');
  const handwriting = document.getElementById('ld-namaste-template');
  if (!word || !language || !fill || !skip) return;
  clearTimeout(window.loaderBootTimeout);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const seenKey = 'portfolio-intro-seen';
  const exitDuration = 180;
  const firstVisitDuration = compact ? 5000 : 6000; // Includes Namaste and the exit fade.
  const revealDuration = 500;
  let returning = false, storageAvailable = false;
  function remember(storage) {
    const savedCount = Number(storage.getItem('portfolio-visit-count'));
    const seen = storage.getItem(seenKey) === '1' || (Number.isSafeInteger(savedCount) && savedCount > 0);
    storage.setItem(seenKey, '1');
    return seen;
  }
  try { returning = remember(sessionStorage); storageAvailable = true; } catch {}
  try { returning = remember(localStorage) || returning; storageAvailable = true; } catch {}
  if (!storageAvailable) returning = true;
  const namaste = { text: 'नमस्ते', label: 'Namaste · Nepali', lang: 'ne', font: 'dev', duration: compact ? 1250 : returning ? 1050 : 1100 };
  const greetings = returning && !compact ? [namaste] : [
    { text: 'Hello', label: 'English', lang: 'en', font: 'headline', duration: compact ? 700 : 940 },
    { text: 'Hola', label: 'Spanish', lang: 'es', font: 'headline', duration: compact ? 700 : 940 },
    { text: 'Bonjour', label: 'French', lang: 'fr', font: 'headline', duration: compact ? 700 : 940 },
    { text: 'Ciao', label: 'Italian', lang: 'it', font: 'headline', duration: compact ? 700 : 940 },
    { text: 'Hallo', label: 'German', lang: 'de', font: 'headline', duration: compact ? 770 : 960 },
    namaste
  ];
  const duration = greetings.reduce((sum, greeting) => sum + greeting.duration, 0);
  const maximumDuration = compact ? duration : returning ? 1800 : duration;
  loader.dataset.visit = compact ? 'mobile' : returning ? 'returning' : 'first';
  loader.dataset.mode = compact ? 'mobile' : 'desktop';
  const navigationKeys = new Set(['Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
  let running = false, completed = false, ready = false;
  let failSafe, revealTimer, greetingTimer, exitTimer, frame, animation, progressAnimation, startedAt;
  let previousOverflow, previousBodyOverflow;
  let activeIndex = -1, displayedProgress = 0;

  function revealPage() {
    if (completed || !compact) return;
    root.classList.add('loader-docked');
    root.style.overflow = previousOverflow;
    document.body.style.overflow = previousBodyOverflow;
    skip.textContent = '×';
    skip.setAttribute('aria-label', 'Skip intro');
  }
  function setProgress(value) {
    displayedProgress = Math.max(displayedProgress, Math.min(1, value));
    if (displayedProgress === 1) { progressAnimation?.cancel(); progressAnimation = null; }
    if (!progressAnimation) fill.style.transform = `scaleX(${displayedProgress})`;
    progress?.setAttribute('aria-valuenow', String(Math.round(displayedProgress * 100)));
  }
  function complete(moveFocus = false) {
    if (completed) return;
    completed = true; running = false;
    clearTimeout(failSafe); clearTimeout(revealTimer); clearTimeout(greetingTimer); clearTimeout(exitTimer); cancelAnimationFrame(frame);
    animation?.cancel();
    setProgress(1);
    const focusWasInside = loader.contains(document.activeElement);
    loader.style.display = 'none';
    root.classList.remove('loader-running');
    root.classList.remove('loader-docked');
    if (previousOverflow !== undefined) root.style.overflow = previousOverflow;
    if (previousBodyOverflow !== undefined) document.body.style.overflow = previousBodyOverflow;
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('wheel', onScrollIntent);
    window.removeEventListener('touchmove', onScrollIntent);
    window.removeEventListener('pagehide', onPageHide);
    motion.removeEventListener('change', onMotionChange);
    skip.removeEventListener('click', onSkip);
    if (moveFocus || focusWasInside) {
      const heading = document.getElementById('hero-title');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
    root.dataset.loaderDone = 'true';
    document.dispatchEvent(new CustomEvent('loader:done'));
  }
  function onKey(event) { if (navigationKeys.has(event.key)) complete(); }
  function onSkip() { complete(true); }
  function onScrollIntent() { complete(); }
  function onMotionChange(event) { if (event.matches) complete(); }
  function onPageHide() { complete(); }
  function onVisibility() { if (document.hidden) complete(); }

  function showGreeting(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    const greeting = greetings[index];
    animation?.cancel();
    const writing = greeting.lang === 'ne' && handwriting?.content && typeof word.replaceChildren === 'function';
    if (writing) word.replaceChildren(handwriting.content.cloneNode(true));
    else word.textContent = greeting.text;
    word.lang = greeting.lang; word.dataset.f = greeting.font;
    word.dataset.writing = String(!!writing);
    language.textContent = greeting.label;
    loader.dataset.palette = String(index % 3);
    if (!writing && index > 0 && typeof word.animate === 'function') {
      animation = word.animate([
        { opacity: .35, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 180, easing: 'ease-out', fill: 'both' });
    }
  }
  function tick(now) {
    if (!running) return;
    clearTimeout(greetingTimer);
    try {
      const elapsed = now - startedAt;
      const timeProgress = Math.min(1, elapsed / duration);
      setProgress(ready ? timeProgress : Math.min(.92, timeProgress * .92));
      let boundary = 0;
      let index = greetings.findIndex(greeting => { boundary += greeting.duration; return elapsed < boundary; });
      if (index < 0) index = greetings.length - 1;
      showGreeting(index);
      if (elapsed >= duration && (ready || elapsed >= maximumDuration)) {
        setProgress(1);
        running = false;
        loader.classList.add('is-exiting');
        exitTimer = setTimeout(complete, exitDuration);
        return;
      }
      // Wake only for the next greeting. The browser animates the progress bar.
      const next = elapsed < duration ? boundary : maximumDuration;
      greetingTimer = setTimeout(() => tick(performance.now()), Math.max(1, next - elapsed));
    } catch (error) {
      console.warn('Welcome animation unavailable.', error);
      complete();
    }
  }
  function run() {
    if (running || completed) return;
    running = true;
    root.dataset.loaderDone = 'false';
    failSafe = setTimeout(complete, compact ? firstVisitDuration : returning ? maximumDuration + 200 : firstVisitDuration);
    previousOverflow = root.style.overflow; previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
    root.classList.add('loader-running');
    if (compact) revealTimer = setTimeout(revealPage, revealDuration);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('wheel', onScrollIntent, { passive: true });
    window.addEventListener('touchmove', onScrollIntent, { passive: true });
    window.addEventListener('pagehide', onPageHide);
    motion.addEventListener('change', onMotionChange);
    startedAt = performance.now();
    try {
      showGreeting(0);
      if (typeof fill.animate === 'function') progressAnimation = fill.animate([
        { transform: 'scaleX(0)' }, { transform: 'scaleX(.92)' }
      ], { duration, easing: 'linear', fill: 'forwards' });
      frame = requestAnimationFrame(tick);
    } catch { complete(); }
  }

  skip.addEventListener('click', onSkip);
  // Keep accessibility, data-saving and direct section navigation immediate.
  if (window.navigator?.connection?.saveData || motion.matches || window.location.hash || document.hidden) { complete(); return; }
  const loaded = document.readyState === 'complete' ? Promise.resolve()
    : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
  const image = document.querySelector('.portrait-base');
  const decoded = image && typeof image.decode === 'function' ? Promise.resolve().then(() => image.decode()) : Promise.resolve();
  Promise.allSettled([loaded, decoded, document.fonts?.ready || Promise.resolve()]).then(() => {
    ready = true;
    if (completed) return;
    progressAnimation?.effect?.setKeyframes([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]);
    if (running && performance.now() - startedAt >= duration) tick(performance.now());
  });
  // Inline welcome styles are available before the first paint.
  run();
})();
