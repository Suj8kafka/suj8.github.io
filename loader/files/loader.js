/* Full welcome on visits one and two; brief greeting from visit three onward. */
(() => {
  const VISIT_COUNT_KEY = 'portfolio-visit-count';
  const loader = document.getElementById('loader');
  if (!loader) return;
  const root = document.documentElement;
  const word = document.getElementById('ld-word');
  const language = document.getElementById('ld-lang');
  const fill = document.getElementById('ld-fill');
  const skip = loader.querySelector('.ld-skip');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function registerVisit(storage) {
    const savedCount = Number(storage.getItem(VISIT_COUNT_KEY));
    const previousCount = Number.isSafeInteger(savedCount) && savedCount >= 0 ? savedCount : 0;
    const nextCount = Math.min(previousCount + 1, Number.MAX_SAFE_INTEGER);
    storage.setItem(VISIT_COUNT_KEY, String(nextCount));
    return nextCount;
  }
  let visitCount = 3;
  try {
    visitCount = registerVisit(localStorage);
  } catch {
    // Fall back to counting within this tab, or use the brief intro if both are blocked.
    try { visitCount = registerVisit(sessionStorage); } catch {}
  }
  const returningVisitor = visitCount >= 3;
  const fullGreetings = [
    { text: 'Hello', label: 'English', lang: 'en', font: 'headline', duration: 700 },
    { text: '你好', label: 'Mandarin', lang: 'zh', font: 'sc' },
    { text: 'नमस्ते', label: 'Hindi', lang: 'hi' },
    { text: 'Hola', label: 'Spanish', lang: 'es', font: 'headline' },
    { text: 'مرحبا', label: 'Arabic', lang: 'ar', font: 'ar', dir: 'rtl' },
    { text: 'নমস্কার', label: 'Bengali', lang: 'bn', font: 'bn' },
    { text: 'Bonjour', label: 'French', lang: 'fr', font: 'headline' },
    { text: 'Привет', label: 'Russian', lang: 'ru', font: 'headline' },
    { text: 'Olá', label: 'Portuguese', lang: 'pt', font: 'headline' },
    { text: 'السلام علیکم', label: 'Urdu', lang: 'ur', font: 'ar', dir: 'rtl' },
    { text: 'नमस्कार', label: 'Nepali', lang: 'ne' },
    { text: 'प्रणाम', label: 'Maithili', lang: 'mai' },
    { text: 'राम राम', label: 'Bhojpuri', lang: 'bho' },
    { text: 'नमस्ते', label: 'Tharu', lang: 'thl' },
    { text: 'फ्याफुल्ला', label: 'Tamang', lang: 'taj' },
    { text: 'ज्वजलपा', label: 'Nepal Bhasa', lang: 'new' },
    { text: 'प्रणाम', label: 'Bajjika', lang: 'bjj' },
    { text: 'राम राम', label: 'Awadhi', lang: 'awa' },
    { text: 'नमस्कार', label: 'Doteli', lang: 'dty' },
    { text: 'सेवारो', label: 'Limbu', lang: 'lif' }
  ];
  const greetings = returningVisitor
    ? [{ text: 'नमस्ते', label: 'Welcome back', lang: 'ne', duration: 700 }]
    : fullGreetings.map(greeting => ({ duration: 450, ...greeting }));
  loader.dataset.visit = returningVisitor ? 'returning' : 'first';
  const duration = greetings.reduce((sum, greeting) => sum + greeting.duration, 0);
  const navigationKeys = new Set(['Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
  let running = false;
  let completed = false;
  let failSafe;
  let exitTimer;
  let frame;
  let animation;
  let previousOverflow;
  let previousBodyOverflow;
  let startedAt;
  let activeIndex = -1;

  function onKey(event) {
    if (navigationKeys.has(event.key)) complete();
    // Preserve the key's normal action after restoring the page.
  }
  function onScrollIntent() { complete(); }
  function onMotionChange(event) { if (event.matches) complete(); }
  function onPageHide() { complete(); }

  function complete(moveFocus = false) {
    if (completed) return;
    completed = true;
    running = false;
    clearTimeout(failSafe);
    clearTimeout(exitTimer);
    cancelAnimationFrame(frame);
    animation?.cancel();
    const focusWasInside = loader.contains(document.activeElement);
    loader.style.display = 'none';
    root.classList.remove('loader-running');
    if (previousOverflow !== undefined) root.style.overflow = previousOverflow;
    if (previousBodyOverflow !== undefined) document.body.style.overflow = previousBodyOverflow;
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('wheel', onScrollIntent);
    window.removeEventListener('touchmove', onScrollIntent);
    window.removeEventListener('pagehide', onPageHide);
    motion.removeEventListener('change', onMotionChange);
    // Never steal focus on automatic dismissal; restore it when a control disappears.
    if (moveFocus || focusWasInside) {
      const heading = document.getElementById('hero-title');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
    root.dataset.loaderDone = 'true';
    document.dispatchEvent(new CustomEvent('loader:done'));
  }

  function tick(now) {
    if (!running) return;
    try {
      const elapsed = now - startedAt;
      fill.style.transform = 'scaleX(' + Math.min(1, elapsed / duration) + ')';
      if (elapsed >= duration) {
        loader.classList.add('is-exiting');
        exitTimer = setTimeout(complete, 180);
        return;
      }
      let boundary = 0;
      const index = greetings.findIndex(greeting => {
        boundary += greeting.duration;
        return elapsed < boundary;
      });
      if (index !== activeIndex) {
        activeIndex = index;
        const greeting = greetings[index];
        animation?.cancel();
        word.textContent = greeting.text;
        word.lang = greeting.lang;
        word.dataset.f = greeting.font || 'dev';
        word.dir = greeting.dir || 'ltr';
        language.textContent = greeting.label;
        loader.dataset.palette = String(index % 3);
        // Directional motion blur at the edges; most of each hold stays sharp and still.
        animation = word.animate([
          { opacity: 0, filter: 'blur(7px)', transform: 'translateX(12px) scaleX(1.03)' },
          { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0) scaleX(1)', offset: .16 },
          { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0) scaleX(1)', offset: .9 },
          { opacity: index === greetings.length - 1 ? 1 : 0,
            filter: index === greetings.length - 1 ? 'blur(0px)' : 'blur(5px)',
            transform: index === greetings.length - 1 ? 'translateX(0)' : 'translateX(-8px) scaleX(1.02)' }
        ], { duration: greeting.duration, easing: 'linear', fill: 'both' });
      }
      frame = requestAnimationFrame(tick);
    } catch (error) {
      console.warn('Welcome animation unavailable.', error);
      complete();
    }
  }

  function run() {
    if (running || completed) return;
    running = true;
    root.dataset.loaderDone = 'false';
    failSafe = setTimeout(complete, duration + 700);
    previousOverflow = root.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    root.classList.add('loader-running');
    // The decorative overlay never hides the portfolio from assistive technology.
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('wheel', onScrollIntent, { passive: true });
    window.addEventListener('touchmove', onScrollIntent, { passive: true });
    window.addEventListener('pagehide', onPageHide);
    motion.addEventListener('change', onMotionChange);
    startedAt = performance.now();
    frame = requestAnimationFrame(tick);
  }

  skip.addEventListener('click', () => complete(true));
  if (motion.matches || window.location.hash || document.hidden) complete();
  else run();
})();
