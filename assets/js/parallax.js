const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createParallax({ document, window }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const layers = [];
  const listeners = [];
  let frame = 0;
  let previousTime = 0;
  let destroyed = false;
  const hero = document.querySelector('.hero');
  const portrait = document.querySelector('.portrait-frame');
  const suspended = () => reducedMotion.matches || document.hidden
    || document.documentElement.classList.contains('loader-running');
  const compact = () => window.innerWidth <= 800 || !finePointer.matches;

  function listen(target, event, callback) {
    target?.addEventListener(event, callback, { passive: true });
    listeners.push(() => target?.removeEventListener(event, callback));
  }

  function add(element, anchor, options) {
    if (!element || !anchor) return;
    const layer = { element, anchor, property: '--parallax-y', value: 0, target: 0, unit: 'px', ...options };
    element.classList.add(options.image ? 'parallax-image' : 'parallax-depth');
    if (options.image) element.style.setProperty('--parallax-scale', String(options.scale));
    layers.push(layer);
    return layer;
  }

  add(document.querySelector('.hero-art'), hero, { type: 'hero', max: 32, small: 12, speed: .11 });
  add(document.querySelector('.note-one'), hero, { type: 'hero', max: 44, small: 12, speed: -.16, rotate: true });
  add(document.querySelector('.note-two'), hero, { type: 'hero', max: 24, small: 8, speed: .08, rotate: true });
  const scenery = [...document.querySelectorAll('.hero-landscape-layer')].map((element, index) => {
    const depth = index + 1;
    add(element, hero, { type: 'hero', max: depth * 14, small: depth * 4, speed: depth * .04 });
    return {
      x: add(element, hero, { type: 'pointer', property: '--scene-x' }),
      y: add(element, hero, { type: 'pointer', property: '--scene-pointer-y' }),
      depth
    };
  });
  document.querySelectorAll('.selected-work-image:not(.selected-work-brand-image):not(.image-placeholder) img')
    .forEach(element => add(element, element.closest('.selected-work-image'),
      { type: 'center', max: 14, small: 7, image: true, scale: 1.16 }));
  document.querySelectorAll('.section-illustration').forEach((element, index) => {
    add(element, element.parentElement, { type: 'center', max: 60, small: 18,
      direction: index % 2 ? -1 : 1, property: '--section-offset', rotate: true });
  });
  const tiltX = add(portrait, hero, { type: 'pointer', property: '--portrait-tilt-x', unit: 'deg' });
  const tiltY = add(portrait, hero, { type: 'pointer', property: '--portrait-tilt-y', unit: 'deg' });

  function reset() {
    layers.forEach(layer => {
      layer.value = layer.target = 0;
      layer.element.style.removeProperty(layer.property);
      layer.element.style.removeProperty('--parallax-rotate');
      layer.element.classList.remove('is-parallax-active');
    });
  }

  function pauseNavigation() {
    if (!document.documentElement.classList.contains('is-anchor-scrolling')) return false;
    window.cancelAnimationFrame(frame);
    frame = previousTime = 0;
    // Freeze existing transforms instead of reading every layer during a long anchor trip.
    layers.forEach(layer => layer.element.classList.remove('is-parallax-active'));
    return true;
  }

  function measure() {
    const bounds = new Map();
    const small = compact();
    // Read layout before writing transforms; shared anchors are measured once per frame.
    layers.forEach(layer => {
      if (!bounds.has(layer.anchor)) bounds.set(layer.anchor, layer.anchor.getBoundingClientRect());
    });
    layers.forEach(layer => {
      const rect = bounds.get(layer.anchor);
      layer.element.classList.toggle('is-parallax-active', rect.bottom > 0 && rect.top < window.innerHeight);
      if (layer.type === 'pointer') {
        if (small) layer.target = 0;
        return;
      }
      let distance = small ? layer.small : layer.max;
      if (layer.image) {
        distance = Math.min(distance, Math.max(0, rect.height * (layer.scale - 1) / 2 - 2));
      }
      layer.target = layer.type === 'hero'
        ? clamp(Math.max(0, -rect.top) * layer.speed, -distance, distance)
        : clamp((window.innerHeight / 2 - rect.top - rect.height / 2)
          / Math.max(1, (window.innerHeight + rect.height) / 2), -1, 1) * distance * (layer.direction || 1);
    });
  }

  function animate(time) {
    frame = 0;
    if (destroyed) return;
    if (suspended()) { reset(); return; }
    if (pauseNavigation()) return;
    measure();
    const delta = previousTime ? Math.min(64, time - previousTime) : 16;
    const smoothing = 1 - Math.exp(-delta / 90);
    previousTime = time;
    let moving = false;
    layers.forEach(layer => {
      const difference = layer.target - layer.value;
      layer.value += difference * smoothing;
      if (Math.abs(layer.target - layer.value) < .05) layer.value = layer.target;
      else moving = true;
      layer.element.style.setProperty(layer.property, `${layer.value.toFixed(3)}${layer.unit}`);
      if (layer.rotate) layer.element.style.setProperty('--parallax-rotate', `${(layer.value * .07).toFixed(3)}deg`);
    });
    if (moving) frame = window.requestAnimationFrame(animate);
    else previousTime = 0;
  }

  function refresh() {
    if (destroyed) return;
    if (suspended()) {
      window.cancelAnimationFrame(frame);
      frame = previousTime = 0;
      reset();
      return;
    }
    if (pauseNavigation()) return;
    if (!frame) frame = window.requestAnimationFrame(animate);
  }

  function untilt() {
    if (tiltX) tiltX.target = 0;
    if (tiltY) tiltY.target = 0;
    refresh();
  }

  function resetScenery() {
    scenery.forEach(layer => { layer.x.target = layer.y.target = 0; });
    refresh();
  }

  function resetPointers() {
    untilt();
    resetScenery();
  }

  listen(hero, 'pointermove', event => {
    if (suspended() || compact() || event.pointerType !== 'mouse') return;
    const rect = hero.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width - .5, -.5, .5);
    const y = clamp((event.clientY - rect.top) / rect.height - .5, -.5, .5);
    scenery.forEach(layer => {
      layer.x.target = -x * layer.depth * 6;
      layer.y.target = -y * layer.depth * 4;
    });
    refresh();
  });
  listen(hero, 'pointerleave', resetScenery);

  listen(portrait, 'pointermove', event => {
    if (suspended() || compact() || event.pointerType !== 'mouse' || !tiltX || !tiltY) return;
    const rect = portrait.getBoundingClientRect();
    tiltX.target = clamp(.5 - (event.clientY - rect.top) / rect.height, -.5, .5) * 5;
    tiltY.target = clamp((event.clientX - rect.left) / rect.width - .5, -.5, .5) * 6;
    refresh();
  });
  listen(portrait, 'pointerleave', untilt);
  listen(window, 'blur', resetPointers);
  listen(window, 'scroll', refresh);
  listen(window, 'resize', refresh);
  listen(window, 'load', refresh);
  listen(document, 'loader:done', refresh);
  listen(document, 'scroll-navigation:start', refresh);
  listen(document, 'scroll-navigation:end', refresh);
  listen(document, 'visibilitychange', refresh);
  listen(reducedMotion, 'change', refresh);
  listen(finePointer, 'change', resetPointers);
  refresh();

  return {
    destroy() {
      destroyed = true;
      window.cancelAnimationFrame(frame);
      listeners.forEach(remove => remove());
      reset();
      layers.forEach(layer => {
        layer.element.classList.remove('parallax-image', 'parallax-depth');
        layer.element.style.removeProperty('--parallax-scale');
      });
    }
  };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createParallax({ document, window });
