(() => {
  const box = document.getElementById('introVideo');
  const vid = document.getElementById('introVid');
  const btn = document.getElementById('introPlay');
  if (!box || !vid || !btn) return;

  function reset() {
    const restoreFocus = document.activeElement === vid;
    box.classList.remove('playing');
    btn.disabled = false;
    vid.controls = false;
    vid.removeAttribute('tabindex');
    if (restoreFocus) btn.focus({ preventScroll: true });
  }
  btn.addEventListener('click', async event => {
    btn.disabled = true;
    vid.controls = true;
    try {
      await vid.play();
      vid.tabIndex = 0;
      box.classList.add('playing');
      if (event.detail === 0) vid.focus({ preventScroll: true });
    } catch {
      reset(); // Keep the named play control available if playback is refused.
      if (event.detail === 0) btn.focus({ preventScroll: true });
    }
  });
  vid.addEventListener('ended', () => { reset(); vid.currentTime = 0; });
  vid.addEventListener('error', reset);
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) vid.pause();
  }, { threshold: .2 }).observe(box);
})();
