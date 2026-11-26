/* Embedded before page content: no network, image or font dependency at startup. */
(() => {
  function startWelcome(restored = false) {
    const loader = document.getElementById('loader');
    if (!loader) return;
    const root = document.documentElement;
    if (!restored && root.dataset.loaderDone === 'true') return;
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
    const reduced = () => root.dataset.layout === 'reader' || (root.dataset.motion ? root.dataset.motion === 'reduced' : motion.matches);
    const constrained = (window.navigator.deviceMemory > 0 && window.navigator.deviceMemory <= 4)
      || (window.navigator.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 4);
    const seenKey = 'portfolio-intro-seen';
    const exitDuration = 220;
    const firstVisitDuration = compact ? 5000 : 6000;
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
    const brief = returning;
    const namaste = { text: 'नमस्ते', label: 'Namaste · Nepali', lang: 'ne', font: 'dev', duration: brief ? 1250 : compact ? 1250 : 1100 };
    const greetings = brief ? [namaste] : [
      { text: 'Hello', label: 'English', lang: 'en', font: 'headline', duration: compact ? 700 : 940 },
      { text: 'Hola', label: 'Spanish', lang: 'es', font: 'headline', duration: compact ? 700 : 940 },
      { text: 'Bonjour', label: 'French', lang: 'fr', font: 'headline', duration: compact ? 700 : 940 },
      { text: 'Ciao', label: 'Italian', lang: 'it', font: 'headline', duration: compact ? 700 : 940 },
      { text: 'Hallo', label: 'German', lang: 'de', font: 'headline', duration: compact ? 770 : 960 },
      namaste
    ];
    const duration = greetings.reduce((sum, greeting) => sum + greeting.duration, 0);
    loader.dataset.visit = returning ? 'returning' : 'first';
    loader.dataset.mode = compact ? 'mobile' : 'desktop';
    loader.dataset.effects = !brief && !constrained ? 'full' : 'light';
    loader.dataset.ink = 'pending';
    loader.dataset.phase = 'pending';
    loader.style.display = '';
    loader.classList.remove('is-exiting');
    const navigationKeys = new Set(['Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);
    let running = false, completed = false, started = false;
    let waitingForPaint = true;
    let waitingForInk = false, inkFinishedAt = Infinity;
    let failSafe, greetingTimer, exitTimer, frame, progressAnimation;
    const animations = [];
    let previousOverflow, previousBodyOverflow;
    let activeIndex = -1, displayedProgress = 0, greetingStartedAt = 0;

    function clearAnimations() {
      animations.splice(0).forEach(animation => animation.cancel());
    }
    function animate(element, keyframes, options) {
      if (typeof element?.animate !== 'function') return;
      try {
        const animation = element.animate(keyframes, options);
        if (waitingForPaint) animation.pause?.();
        animations.push(animation);
      } catch { /* Keep the static greeting readable. */ }
    }
    function watchInk() {
      let strokes;
      try { strokes = word.getAnimations?.({ subtree: true }).filter(effect => effect.animationName === 'ld-pen-write') || []; }
      catch { return; } // CSS drawing remains usable if animation inspection is unavailable.
      if (!strokes.length) return;
      waitingForInk = true;
      Promise.all(strokes.map(effect => effect.finished)).then(() => {
        if (completed) return;
        inkFinishedAt = performance.now();
        tick(inkFinishedAt);
      }, () => {
        if (completed) return;
        waitingForInk = false;
        tick(performance.now());
      });
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
      clearTimeout(failSafe); clearTimeout(greetingTimer); clearTimeout(exitTimer); cancelAnimationFrame(frame);
      clearAnimations();
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
      document.removeEventListener('display-preferences:change', onMotionChange);
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
    function onMotionChange(event) {
      if (root.dataset.layout === 'reader' || (root.dataset.motion ? root.dataset.motion === 'reduced' : event.matches ?? motion.matches)) complete();
    }
    function onPageHide() { complete(); }
    function onVisibility() {
      if (!started && !document.hidden) run();
      else if (started && document.hidden) complete();
    }

    function showGreeting(index, now = performance.now()) {
      if (index === activeIndex) return;
      activeIndex = index;
      greetingStartedAt = now;
      const greeting = greetings[index];
      clearAnimations();
      const writing = greeting.lang === 'ne' && handwriting?.content && typeof word.replaceChildren === 'function';
      if (writing) word.replaceChildren(handwriting.content.cloneNode(true));
      else if (loader.dataset.effects === 'full' && typeof word.replaceChildren === 'function') {
        const letters = [...greeting.text].map(letter => {
          const span = document.createElement('span');
          span.className = 'ld-letter'; span.textContent = letter;
          return span;
        });
        word.replaceChildren(...letters);
        letters.forEach((letter, position) => animate(letter, [
          { opacity: 0, transform: 'translateY(110%) rotate(9deg) scale(.85)', offset: 0 },
          { opacity: 1, transform: 'translateY(-4%) rotate(-2deg) scale(1.02)', offset: .22 },
          { opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1)', offset: .4 },
          { opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1)', offset: 1 }
        ], { delay: position * 22, duration: greeting.duration - position * 22, easing: 'cubic-bezier(.22,.7,.25,1)', fill: 'both' }));
      } else word.textContent = greeting.text;
      word.lang = greeting.lang; word.dataset.f = greeting.font;
      word.dataset.writing = String(!!writing);
      language.textContent = greeting.label;
      loader.dataset.palette = String(index % 3);
      loader.dataset.greeting = greeting.lang;
      const echo = document.getElementById('ld-echo');
      if (echo) {
        echo.textContent = writing ? '' : greeting.text;
        if (!writing) animate(echo, [
          { opacity: 0, transform: 'translateX(6%) scale(.92)' },
          { opacity: .12, transform: 'translateX(0) scale(1)', offset: .4 },
          { opacity: 0, transform: 'translateX(-6%) scale(1.08)' }
        ], { duration: greeting.duration, easing: 'ease-in-out', fill: 'both' });
      }
      animate(language, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, fill: 'both' });
      if (writing && !waitingForPaint) watchInk();
      else if (!writing && loader.dataset.effects === 'light') {
        animate(word, [
          { opacity: .35, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 180, easing: 'ease-out', fill: 'both' });
      }
    }
    function tick(now) {
      if (!running || waitingForPaint) return;
      clearTimeout(greetingTimer);
      try {
        if (now - greetingStartedAt >= greetings[activeIndex].duration && activeIndex < greetings.length - 1) showGreeting(activeIndex + 1, now);
        const age = now - greetingStartedAt;
        const spent = greetings.slice(0, activeIndex).reduce((sum, greeting) => sum + greeting.duration, 0);
        setProgress(Math.min(1, (spent + age) / duration));
        const inkHoldRemaining = waitingForInk ? Math.max(0, inkFinishedAt + 300 - now) : 0;
        if (activeIndex === greetings.length - 1 && age >= greetings[activeIndex].duration && inkHoldRemaining === 0) {
          setProgress(1);
          running = false;
          loader.classList.add('is-exiting');
          exitTimer = setTimeout(complete, exitDuration);
          return;
        }
        // Wake only for the next greeting. The browser animates the progress bar.
        const next = age < greetings[activeIndex].duration ? greetings[activeIndex].duration - age : inkHoldRemaining;
        if (!Number.isFinite(next)) return; // Stroke completion or the independent watchdog wakes us.
        greetingTimer = setTimeout(() => tick(performance.now()), Math.max(1, next));
      } catch (error) {
        console.warn('Welcome animation unavailable.', error);
        complete();
      }
    }
    function run() {
      if (started || completed) return;
      started = true; running = true;
      root.dataset.loaderDone = 'false';
      failSafe = setTimeout(complete, brief ? 2500 : firstVisitDuration + 2000);
      previousOverflow = root.style.overflow; previousBodyOverflow = document.body.style.overflow;
      root.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
      root.classList.add('loader-running');
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('wheel', onScrollIntent, { passive: true });
      window.addEventListener('touchmove', onScrollIntent, { passive: true });
      motion.addEventListener('change', onMotionChange);
      document.addEventListener('display-preferences:change', onMotionChange);
      try {
        showGreeting(0);
        if (typeof fill.animate === 'function') progressAnimation = fill.animate([
          { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }
        ], { duration, easing: 'linear', fill: 'forwards' });
        progressAnimation?.pause?.();
        // Let the brief SVG reach a painted frame before spending its reading time.
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(paintedAt => {
            if (completed) return;
            waitingForPaint = false;
            greetingStartedAt = paintedAt;
            loader.dataset.ink = 'drawing';
            loader.dataset.phase = 'playing';
            // Restart native effects from the first visible frame, including warm reloads.
            animations.forEach(animation => { animation.currentTime = 0; animation.play?.(); });
            if (brief) watchInk();
            if (progressAnimation) { progressAnimation.currentTime = 0; progressAnimation.play?.(); }
            tick(paintedAt);
          });
        });
      } catch { complete(); }
    }

    skip.addEventListener('click', onSkip);
    // Returning visitors get brief Namaste; only accessibility/data-saving
    // preferences bypass the welcome.
    if (window.navigator?.connection?.saveData || reduced()) { complete(); return; }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    root.classList.add('loader-running');
    if (!document.hidden) run();
  }
  startWelcome();
  window.addEventListener('pageshow', event => { if (event.persisted) startWelcome(true); });
})();
