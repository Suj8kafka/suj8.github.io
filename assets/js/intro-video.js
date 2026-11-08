(() => {
      const box = document.getElementById('introVideo');
      const vid = document.getElementById('introVid');
      const btn = document.getElementById('introPlay');
      if (!box || !vid || !btn) return;

      btn.addEventListener('click', () => {
        vid.controls = true;
        vid.play();
        box.classList.add('playing');
      });
      vid.addEventListener('ended', () => {
        box.classList.remove('playing');
        vid.controls = false;
        vid.currentTime = 0;
      });
      new IntersectionObserver(([e]) => { if (!e.isIntersecting) vid.pause(); }, { threshold: .2 }).observe(box);
    })();
