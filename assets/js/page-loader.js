(() => {
  const loader = document.querySelector('.page-loader');
  if (!loader) return;
  const word = loader.querySelector('.loader-word');
  const language = loader.querySelector('.loader-language');
  const fill = loader.querySelector('.loader-progress-fill');
  const sessionKey = 'portfolio-welcome-v2';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false;
  try { seen = sessionStorage.getItem(sessionKey) === 'seen'; } catch {}
  if (seen || reducedMotion) {
    loader.remove();
    return;
  }

  // A brief selection, not a ranking or an exhaustive list of Nepal's languages.
  const greetings = [
    ['नमस्ते', 'Nepali', 'ne'],
    ['प्रणाम', 'Maithili', 'mai'],
    ['राम राम', 'Bhojpuri', 'bho'],
    ['फ्याफुल्ला', 'Tamang', 'taj'],
    ['ज्वजलपा', 'Nepal Bhasa', 'new'],
    ['सेवारो', 'Limbu', 'lif']
  ];
  const duration = 800 + greetings.length * 450;
  const startedAt = performance.now();
  let finished = false;
  let frame;
  const previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  const siblings = [...document.body.children].filter(element =>
    element !== loader && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName));
  const previousInert = siblings.map(element => element.inert);
  siblings.forEach(element => { element.inert = true; });

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(failSafe);
    fill.style.transform = 'scaleX(1)';
    loader.classList.add('is-hidden');
    document.documentElement.style.overflow = previousOverflow;
    siblings.forEach((element, index) => { element.inert = previousInert[index]; });
    if (loader.contains(document.activeElement)) {
      document.querySelector('.wordmark')?.focus({ preventScroll: true });
    }
    try { sessionStorage.setItem(sessionKey, 'seen'); } catch {}
    setTimeout(() => loader.remove(), 300);
  }

  loader.querySelector('.loader-skip').addEventListener('click', finish);
  // Never wait for window.load, remote fonts, Firebase, or analytics.
  const failSafe = setTimeout(finish, 4200);
  let activeIndex = -1;
  function tick(now) {
    if (finished) return;
    const elapsed = now - startedAt;
    fill.style.transform = `scaleX(${Math.min(1, elapsed / duration)})`;
    const index = Math.floor((elapsed - 800) / 450);
    if (index >= 0 && index < greetings.length && index !== activeIndex) {
      activeIndex = index;
      const [text, label, lang] = greetings[index];
      word.classList.remove('loader-hello');
      word.textContent = text;
      word.lang = lang;
      language.textContent = label;
      word.getAnimations().forEach(animation => animation.cancel());
      word.animate([
        { opacity: 0, filter: 'blur(10px)', transform: 'translateY(8px)' },
        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)', offset: .22 },
        { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)', offset: .8 },
        { opacity: 0, filter: 'blur(8px)', transform: 'translateY(-6px)' }
      ], { duration: 450, easing: 'ease', fill: 'both' });
    }
    if (elapsed >= duration) finish();
    else frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
})();
