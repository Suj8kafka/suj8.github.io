import test from 'node:test';
import assert from 'node:assert/strict';
import { createParallax } from '../assets/js/parallax.js';

function preview({ width = 1440, fine = true, reduced = false, loader = false } = {}) {
  let scroll = 0, time = 0, sequence = 0;
  const frames = new Map();
  const target = () => {
    const events = new Map();
    return {
      addEventListener(name, callback) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(callback); },
      removeEventListener(name, callback) { events.get(name)?.delete(callback); },
      dispatch(name, event = {}) { events.get(name)?.forEach(callback => callback(event)); }
    };
  };
  function element(top = 0, height = 740) {
    const properties = new Map(), classes = new Set();
    return Object.assign(target(), {
      clientHeight: height,
      style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key),
        getPropertyValue: key => properties.get(key) || '' },
      classList: { add: (...values) => values.forEach(value => classes.add(value)),
        remove: (...values) => values.forEach(value => classes.delete(value)), contains: value => classes.has(value),
        toggle(value, present) { if (present) classes.add(value); else classes.delete(value); } },
      getBoundingClientRect: () => ({ top: top - scroll, bottom: top + height - scroll, left: 900, width: 400, height })
    });
  }
  const hero = element(), art = element(), portrait = element(100, 545), image = element(100, 545);
  const noteOne = element(), noteTwo = element(), project = element(980, 245), projectImage = element(980, 245);
  const scenery = [element(), element(), element()];
  const section = element(1800, 1000), illustration = element();
  illustration.parentElement = section;
  projectImage.closest = () => project;
  const elements = { '.hero': hero, '.hero-art': art, '.portrait-frame': portrait,
    '.portrait-frame img': image, '.note-one': noteOne, '.note-two': noteTwo };
  const reducedMotion = Object.assign(target(), { matches: reduced });
  const pointer = Object.assign(target(), { matches: fine });
  const root = element();
  if (loader) root.classList.add('loader-running');
  const document = Object.assign(target(), {
    hidden: false, documentElement: root, querySelector: selector => elements[selector] || null,
    querySelectorAll: selector => selector === '.section-illustration' ? [illustration]
      : selector === '.hero-landscape-layer' ? scenery : [projectImage]
  });
  const window = Object.assign(target(), {
    innerWidth: width, innerHeight: 900,
    matchMedia: query => query.includes('reduced-motion') ? reducedMotion : pointer,
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  const controller = createParallax({ document, window });
  function step() {
    time += 16;
    const callbacks = [...frames.values()]; frames.clear();
    callbacks.forEach(callback => callback(time));
  }
  function settle() {
    for (let count = 0; frames.size && count < 150; count++) step();
    assert.equal(frames.size, 0, 'Animation stops when its transforms settle');
  }
  return { controller, document, window, root, frames, reducedMotion, hero, scenery, portrait, art, image, projectImage,
    illustration, step, settle, value: (node, name = '--parallax-y') => parseFloat(node.style.getPropertyValue(name)) || 0,
    scrollTo(value) { scroll = value; window.dispatch('scroll'); } };
}

test('adds layered scroll depth with smooth bounded motion and coalesces scroll frames', () => {
  const page = preview();
  page.settle();
  page.scrollTo(100);
  for (let i = 0; i < 30; i++) page.window.dispatch('scroll');
  assert.equal(page.frames.size, 1, 'One pending frame handles a burst of scroll events');
  page.step();
  const firstStep = page.value(page.art);
  page.settle();
  assert.ok(firstStep > 0 && firstStep < page.value(page.art), 'Scroll depth eases into position');
  assert.equal(page.value(page.image), 0, 'The complete portrait canvas stays unshifted inside its frame');
  assert.equal(page.image.classList.contains('parallax-image'), false, 'The original canvas is not zoomed for overscan');
  const beforeProject = page.value(page.projectImage);
  page.scrollTo(1200); page.settle();
  assert.ok(page.value(page.projectImage) > beforeProject, 'Project previews drift as they cross the viewport');
  assert.equal(page.value(page.art), 32, 'Portrait travel is bounded before the next section');
});

test('reduced motion, loading and hidden pages immediately stop animation and reset transforms', () => {
  const page = preview({ loader: true });
  assert.equal(page.frames.size, 0);
  page.scrollTo(300);
  assert.equal(page.frames.size, 0, 'No movement behind the loader');
  page.root.classList.remove('loader-running'); page.document.dispatch('loader:done'); page.settle();
  assert.ok(page.value(page.art) > 0);
  page.scrollTo(400);
  page.reducedMotion.matches = true; page.reducedMotion.dispatch('change');
  assert.equal(page.frames.size, 0);
  assert.equal(page.art.style.getPropertyValue('--parallax-y'), '');
  assert.equal(page.illustration.style.getPropertyValue('--section-offset'), '');
  page.scrollTo(500);
  assert.equal(page.frames.size, 0);
  page.reducedMotion.matches = false; page.reducedMotion.dispatch('change'); page.settle();
  assert.ok(page.value(page.art) > 0);
  page.document.hidden = true; page.document.dispatch('visibilitychange');
  assert.equal(page.frames.size, 0); assert.equal(page.value(page.art), 0);
  page.document.hidden = false; page.document.dispatch('visibilitychange'); page.settle();
  assert.ok(page.value(page.art) > 0);
  const initiallyReduced = preview({ reduced: true });
  assert.equal(initiallyReduced.frames.size, 0);
});

test('mobile and coarse pointers use shorter travel and never tilt the portrait', () => {
  const desktop = preview(); desktop.scrollTo(400); desktop.settle();
  for (const options of [{ width: 390 }, { fine: false }]) {
    const page = preview(options); page.scrollTo(400); page.settle();
    assert.equal(page.value(page.image), 0, 'Mobile also preserves the unzoomed canvas');
    assert.ok(page.value(page.art) < desktop.value(desktop.art));
    page.portrait.dispatch('pointermove', { pointerType: 'mouse', clientX: 1300, clientY: 110 }); page.settle();
    assert.equal(page.value(page.portrait, '--portrait-tilt-y'), 0);
  }
});

test('scenery has separate depth speeds and bounded mouse movement without an idle animation loop', () => {
  const page = preview(); page.scrollTo(200); page.settle();
  const travel = page.scenery.map(element => page.value(element));
  assert.ok(travel[0] > 0 && travel[1] > travel[0] && travel[2] > travel[1]);
  page.hero.dispatch('pointermove', { pointerType: 'mouse', clientX: 1290, clientY: -100 }); page.settle();
  const drift = page.scenery.map(element => Math.abs(page.value(element, '--scene-x')));
  assert.ok(drift[0] > 0 && drift[1] > drift[0] && drift[2] > drift[1]);
  assert.ok(drift[2] <= 9, 'Foreground drift stays within its overscan');
  page.hero.dispatch('pointerleave'); page.settle();
  assert.equal(page.value(page.scenery[2], '--scene-x'), 0);
  page.reducedMotion.matches = true; page.reducedMotion.dispatch('change');
  for (const element of page.scenery) {
    assert.equal(page.value(element), 0);
    assert.equal(page.value(element, '--scene-x'), 0);
    assert.equal(page.value(element, '--scene-pointer-y'), 0);
  }
  assert.equal(page.frames.size, 0);
  const mobile = preview({ width: 390 }); mobile.scrollTo(200); mobile.settle();
  assert.ok(mobile.value(mobile.scenery[2]) < travel[2]);
  mobile.hero.dispatch('pointermove', { pointerType: 'mouse', clientX: 1290, clientY: 110 }); mobile.settle();
  assert.equal(mobile.value(mobile.scenery[2], '--scene-x'), 0);
});

test('mouse tilt is bounded, resets on leave, and cleanup cancels frames and removes listeners', () => {
  const page = preview(); page.settle();
  page.portrait.dispatch('pointermove', { pointerType: 'touch', clientX: 1300, clientY: 110 }); page.settle();
  assert.equal(page.value(page.portrait, '--portrait-tilt-y'), 0);
  page.portrait.dispatch('pointermove', { pointerType: 'mouse', clientX: 1290, clientY: 110 }); page.settle();
  assert.ok(page.value(page.portrait, '--portrait-tilt-y') > 0);
  assert.ok(Math.abs(page.value(page.portrait, '--portrait-tilt-y')) <= 3);
  assert.ok(Math.abs(page.value(page.portrait, '--portrait-tilt-x')) <= 2.5);
  page.portrait.dispatch('pointerleave'); page.settle();
  assert.equal(page.value(page.portrait, '--portrait-tilt-y'), 0);
  page.scrollTo(300); page.controller.destroy();
  assert.equal(page.frames.size, 0);
  assert.equal(page.image.classList.contains('parallax-image'), false);
  assert.equal(page.art.style.getPropertyValue('--parallax-y'), '');
  page.window.dispatch('scroll'); page.portrait.dispatch('pointermove', { pointerType: 'mouse' });
  assert.equal(page.frames.size, 0, 'A destroyed controller never restarts');
});

test('anchor navigation freezes parallax until arrival, without an animation loop or a reset jump', () => {
  const page = preview(); page.scrollTo(100); page.settle();
  const before = page.value(page.art);
  page.root.classList.add('is-anchor-scrolling'); page.document.dispatch('scroll-navigation:start');
  assert.equal(page.frames.size, 0);
  assert.equal(page.art.classList.contains('is-parallax-active'), false);
  for (const y of [200, 600, 1200, 1800]) page.scrollTo(y);
  assert.equal(page.frames.size, 0, 'The native scroll owns every frame of the anchor trip');
  assert.equal(page.value(page.art), before, 'Freeze the current transform instead of snapping to zero');
  page.root.classList.remove('is-anchor-scrolling'); page.document.dispatch('scroll-navigation:end'); page.settle();
  assert.ok(page.value(page.art) > before, 'Normal parallax resumes at the final scroll position');
});
