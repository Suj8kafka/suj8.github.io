import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlogMotion } from '../assets/js/blog-motion.js';

function events() {
  const listeners = new Map();
  return {
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    emit(name, event = {}) { listeners.get(name)?.forEach(callback => callback(event)); },
    listenerCount: () => [...listeners.values()].reduce((sum, callbacks) => sum + callbacks.size, 0)
  };
}
function style() {
  const values = new Map();
  return { setProperty: (name, value) => values.set(name, value), removeProperty: name => values.delete(name),
    get: name => values.get(name), values };
}
function preview({ reduced = false, saveData = false, cores = 8, memory = 8, hero = true, intersection = true } = {}) {
  const frames = new Map(), media = { ...events(), matches:reduced };
  const image = { style:style() }, children = [];
  const design = { dataset:{} }, pause = { ...events(), hidden:true, textContent:'' };
  let nextId = 0, reads = 0, height = 2000, observer, designObserver;
  const root = { dataset:{}, get scrollHeight() { reads++; return height; } };
  const document = { ...events(), documentElement:root, hidden:false,
    body:{ append: node => children.push(node) },
    createElement() {
      return { style:style(), hidden:false, attrs:{}, setAttribute(name, value) { this.attrs[name] = value; },
        remove() { children.splice(children.indexOf(this), 1); } };
    },
    querySelector: selector => ({ '.notebook-feature-image img':image, '.blog-main':{},
      '[data-design-loop]':hero ? design : null, '[data-design-pause]':hero ? pause : null })[selector]
  };
  const window = { ...events(), innerHeight:1000, scrollY:0,
    navigator:{ connection:{ saveData }, hardwareConcurrency:cores, deviceMemory:memory },
    matchMedia: () => media,
    requestAnimationFrame(callback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
    IntersectionObserver: intersection ? class {
      constructor(callback) { this.callback = callback; designObserver = this; }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    } : undefined
  };
  const controller = createBlogMotion({ document, window });
  return { document, window, root, image, media, children, frames, controller, design, pause,
    get designObserver() { return designObserver; },
    get observer() { return observer; }, get reads() { return reads; },
    setHeight(value) { height = value; },
    paint() { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback()); }
  };
}

test('blog scroll motion batches bursts, clamps progress, and leaves no idle animation loop', () => {
  const page = preview();
  assert.equal(page.frames.size, 1);
  page.paint();
  assert.equal(page.children[0].style.get('--reading-progress'), '0');
  assert.equal(page.frames.size, 0);
  page.window.scrollY = 500;
  for (let index = 0; index < 20; index++) page.window.emit('scroll');
  assert.equal(page.frames.size, 1);
  page.paint();
  assert.equal(page.children[0].style.get('--reading-progress'), '0.5');
  assert.equal(page.reads, 1, 'Scroll callbacks must reuse measured geometry');
  assert.equal(page.frames.size, 0);
  page.window.scrollY = 4000;
  page.window.emit('scroll'); page.paint();
  assert.equal(page.children[0].style.get('--reading-progress'), '1');
  assert.equal(page.image.style.get('--blog-image-offset'), '4.00px');
  assert.ok([...page.image.style.values.keys()].every(name => name === '--blog-image-offset'));
  page.controller.destroy();
});

test('reduced motion cancels work immediately and can resume at the same scroll position', () => {
  const page = preview({ reduced:true });
  assert.equal(page.frames.size, 0);
  assert.equal(page.children[0].hidden, true);
  page.window.scrollY = 500;
  page.media.matches = false; page.media.emit('change'); page.paint();
  const offset = page.image.style.get('--blog-image-offset');
  assert.equal(page.children[0].hidden, false);
  page.window.emit('scroll');
  page.media.matches = true; page.media.emit('change');
  assert.equal(page.frames.size, 0);
  assert.equal(page.children[0].hidden, true);
  assert.equal(page.image.style.get('--blog-image-offset'), undefined);
  page.media.matches = false; page.media.emit('change'); page.paint();
  assert.equal(page.image.style.get('--blog-image-offset'), offset);
  page.controller.destroy();
});

test('content resize, hidden tabs, bfcache and cleanup keep motion bounded', () => {
  const page = preview(); page.paint();
  page.window.scrollY = 500;
  page.setHeight(3000); page.observer.callback(); page.paint();
  assert.equal(page.children[0].style.get('--reading-progress'), '0.25');
  page.window.emit('scroll');
  page.document.hidden = true; page.document.emit('visibilitychange');
  assert.equal(page.frames.size, 0);
  page.document.hidden = false; page.document.emit('visibilitychange');
  page.window.emit('pagehide', { persisted:true });
  assert.equal(page.frames.size, 0);
  page.window.emit('scroll'); assert.equal(page.frames.size, 0);
  page.window.emit('pageshow', { persisted:true }); assert.equal(page.frames.size, 1);
  page.controller.destroy();
  assert.equal(page.frames.size, 0);
  assert.equal(page.children.length, 0);
  assert.equal(page.image.style.get('--blog-image-offset'), undefined);
  assert.equal(page.root.dataset.blogMotion, undefined);
  assert.equal(page.observer.disconnected, true);
  assert.equal(page.window.listenerCount() + page.document.listenerCount() + page.media.listenerCount(), 0);
});

test('data-saving and constrained devices keep the static notebook without scheduling motion', () => {
  for (const options of [{ saveData:true }, { cores:2 }, { memory:2 }]) {
    const page = preview(options);
    assert.equal(page.frames.size, 0);
    assert.equal(page.children.length, 0);
    assert.equal(page.window.listenerCount(), 0);
    assert.equal(page.design.dataset.designRunning, undefined);
    assert.equal(page.pause.hidden, true);
    page.controller.refresh(); page.controller.destroy();
  }
});

test('the design loop runs only in view and preserves the visitor pause choice', () => {
  const page = preview(); page.paint();
  assert.equal(page.design.dataset.designRunning, 'false');
  assert.equal(page.pause.hidden, false);
  assert.equal(page.designObserver.target, page.design);
  page.designObserver.callback([{ isIntersecting:true }]);
  assert.equal(page.design.dataset.designRunning, 'true');
  assert.equal(page.frames.size, 0, 'CSS owns the loop without a JavaScript frame loop');
  page.pause.emit('click');
  assert.equal(page.design.dataset.designRunning, 'false');
  assert.equal(page.pause.textContent, 'Play animation');
  page.designObserver.callback([{ isIntersecting:false }]);
  page.designObserver.callback([{ isIntersecting:true }]);
  assert.equal(page.design.dataset.designRunning, 'false');
  page.pause.emit('click');
  assert.equal(page.design.dataset.designRunning, 'true');
  assert.equal(page.pause.textContent, 'Pause animation');
  page.designObserver.callback([{ isIntersecting:false }]);
  assert.equal(page.design.dataset.designRunning, 'false');
  page.controller.destroy();
  assert.equal(page.designObserver.disconnected, true);
  assert.deepEqual(page.design.dataset, {});
  assert.equal(page.pause.hidden, true);
  assert.equal(page.pause.listenerCount(), 0);
});

test('design animation follows reduced motion, visibility and bfcache suspension', () => {
  const page = preview({ reduced:true, intersection:false });
  assert.equal(page.design.dataset.designRunning, 'false');
  assert.equal(page.pause.hidden, true);
  page.media.matches = false; page.media.emit('change');
  assert.equal(page.design.dataset.designRunning, 'true');
  page.document.hidden = true; page.document.emit('visibilitychange');
  assert.equal(page.design.dataset.designRunning, 'false');
  page.document.hidden = false; page.document.emit('visibilitychange');
  assert.equal(page.design.dataset.designRunning, 'true');
  page.window.emit('pagehide', { persisted:true });
  assert.equal(page.design.dataset.designRunning, 'false');
  page.window.emit('pageshow', { persisted:true });
  assert.equal(page.design.dataset.designRunning, 'true');
  page.pause.emit('click');
  page.media.matches = true; page.media.emit('change');
  assert.equal(page.pause.hidden, true);
  page.media.matches = false; page.media.emit('change');
  assert.equal(page.design.dataset.designRunning, 'false', 'Preferences must not override a visitor pause');
  page.controller.destroy();
});

test('articles retain scroll motion without a design scene or its observer', () => {
  const page = preview({ hero:false }); page.paint();
  assert.equal(page.designObserver, undefined);
  page.window.scrollY = 500;
  page.window.emit('scroll'); page.paint();
  assert.equal(page.children[0].style.get('--reading-progress'), '0.5');
  page.controller.destroy();
});
