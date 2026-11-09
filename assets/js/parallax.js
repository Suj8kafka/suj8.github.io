const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// ScrollTrigger caches geometry on refresh; GSAP interpolates only CSS custom properties.
export function createParallax({ document, window, gsap = window.gsap, ScrollTrigger = window.ScrollTrigger, light = false }) {
  if (!gsap || !ScrollTrigger) return { destroy() {} };
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const portrait = document.querySelector('.portrait-frame');
  const layers = new Set(), triggers = [], pointers = [], listeners = [];
  let paused = false, destroyed = false;
  const suspended = () => document.hidden || root.classList.contains('loader-running') || root.classList.contains('is-anchor-scrolling');
  function listen(target, name, callback) {
    target?.addEventListener(name, callback, { passive: true });
    listeners.push(() => target?.removeEventListener(name, callback));
  }
  function depth(element, anchor, from, to, end, image = false) {
    if (!element || !anchor) return;
    layers.add(element);
    element.classList.add(image ? 'parallax-image' : 'parallax-depth');
    const tween = gsap.fromTo(element, from, {
      ...to, ease: 'none', scrollTrigger: {
        trigger: anchor, start: image || end === 'bottom top' ? 'top bottom' : 'top top',
        end, scrub: light ? .18 : .35, invalidateOnRefresh: true,
        onToggle: trigger => element.classList.toggle('is-parallax-active', !paused && trigger.isActive)
      }
    });
    triggers.push(tween.scrollTrigger);
  }
  const context = gsap.context(() => {
    const heroLayer = (element, max, small, speed, rotate = false) => {
      const distance = light ? small : max;
      const offset = Math.sign(speed) * distance;
      const from = { '--parallax-y': '0px' }, to = { '--parallax-y': `${offset}px` };
      if (rotate) { from['--parallax-rotate'] = '0deg'; to['--parallax-rotate'] = `${offset * .07}deg`; }
      depth(element, hero, from, to, () => `+=${distance / Math.abs(speed)}`);
    };
    heroLayer(document.querySelector('.hero-art'), 32, 12, .11);
    heroLayer(document.querySelector('.note-one'), 44, 12, -.16, true);
    heroLayer(document.querySelector('.note-two'), 24, 8, .08, true);
    const scenery = [...document.querySelectorAll('.hero-landscape-layer')];
    scenery.forEach((element, index) => heroLayer(element, (index + 1) * 14, (index + 1) * 4, (index + 1) * .04));
    document.querySelectorAll('.selected-work-image:not(.selected-work-brand-image):not(.image-placeholder) img').forEach(image => {
      const anchor = image.closest('.selected-work-image');
      const distance = () => Math.max(0, Math.min(light ? 7 : 14, (anchor?.clientHeight || 0) * .08 - 2));
      image.style.setProperty('--parallax-scale', '1.16');
      depth(image, anchor, { '--parallax-y': () => `${-distance()}px` },
        { '--parallax-y': () => `${distance()}px` }, 'bottom top', true);
    });
    document.querySelectorAll('.section-illustration').forEach((element, index) => {
      const distance = (light ? 18 : 60) * (index % 2 ? -1 : 1);
      depth(element, element.parentElement,
        { '--section-offset': `${-distance}px`, '--parallax-rotate': `${-distance * .07}deg` },
        { '--section-offset': `${distance}px`, '--parallax-rotate': `${distance * .07}deg` }, 'bottom top');
    });
    if (light) return;
    const state = { x: 0, y: 0, tiltX: 0, tiltY: 0 };
    const quick = (property, render) => {
      const move = gsap.quickTo(state, property, { duration: .45, ease: 'power3.out', onUpdate: render });
      pointers.push(move); return move;
    };
    const sceneX = quick('x', () => scenery.forEach((element, index) => element.style.setProperty('--scene-x', `${state.x * (index + 1) * -6}px`)));
    const sceneY = quick('y', () => scenery.forEach((element, index) => element.style.setProperty('--scene-pointer-y', `${state.y * (index + 1) * -4}px`)));
    if (portrait) { layers.add(portrait); portrait.classList.add('parallax-depth'); }
    const tiltX = quick('tiltX', () => portrait?.style.setProperty('--portrait-tilt-x', `${state.tiltX}deg`));
    const tiltY = quick('tiltY', () => portrait?.style.setProperty('--portrait-tilt-y', `${state.tiltY}deg`));
    listen(hero, 'pointermove', event => {
      if (suspended() || event.pointerType !== 'mouse') return;
      const rect = hero.getBoundingClientRect();
      sceneX(clamp((event.clientX - rect.left) / rect.width - .5, -.5, .5));
      sceneY(clamp((event.clientY - rect.top) / rect.height - .5, -.5, .5));
    });
    listen(portrait, 'pointermove', event => {
      if (suspended() || event.pointerType !== 'mouse') return;
      const rect = portrait.getBoundingClientRect();
      tiltX(clamp(.5 - (event.clientY - rect.top) / rect.height, -.5, .5) * 5);
      tiltY(clamp((event.clientX - rect.left) / rect.width - .5, -.5, .5) * 6);
    });
    const resetScene = () => { if (!suspended()) { sceneX(0); sceneY(0); } };
    const resetTilt = () => { if (!suspended()) { tiltX(0); tiltY(0); } };
    listen(hero, 'pointerleave', resetScene);
    listen(portrait, 'pointerleave', resetTilt);
    listen(window, 'blur', () => { resetScene(); resetTilt(); });
  });
  function sync() {
    if (destroyed) return;
    const next = suspended();
    if (next === paused) return;
    paused = next;
    if (paused) {
      triggers.forEach(trigger => trigger.disable(false, false));
      pointers.forEach(move => move.tween.pause());
      layers.forEach(element => element.classList.remove('is-parallax-active'));
    } else {
      triggers.forEach(trigger => { trigger.enable(false); trigger.update(); });
    }
  }
  listen(document, 'scroll-navigation:start', sync);
  listen(document, 'scroll-navigation:end', sync);
  listen(document, 'visibilitychange', sync);
  listen(document, 'loader:done', sync);
  sync();
  return { destroy() {
    if (destroyed) return;
    destroyed = true;
    listeners.forEach(remove => remove());
    context.revert();
    layers.forEach(element => {
      element.classList.remove('parallax-image', 'parallax-depth', 'is-parallax-active');
      ['--parallax-y', '--parallax-scale', '--parallax-rotate', '--section-offset', '--scene-x', '--scene-pointer-y', '--portrait-tilt-x', '--portrait-tilt-y']
        .forEach(property => element.style.removeProperty(property));
    });
  } };
}
