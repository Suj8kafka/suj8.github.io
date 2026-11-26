import test from 'node:test';
import assert from 'node:assert/strict';
import { createFooterMotion } from '../assets/js/footer-motion.js';

function fixture({ reduced = false, compact = false, saveData = false, observerSupport = true, memory = 8 } = {}) {
  const target = () => {
    const listeners = new Map();
    return { listeners,
      addEventListener(name, callback) { listeners.set(name, callback); },
      removeEventListener(name) { listeners.delete(name); },
      emit(name) { listeners.get(name)?.(); }
    };
  };
  const button = Object.assign(target(), { hidden: true });
  const footer = { dataset: {}, querySelector: () => button };
  const document = Object.assign(target(), { hidden: false, documentElement: { dataset: {} }, querySelector: () => footer });
  const media = Object.assign(target(), { matches: reduced });
  const compactMedia = Object.assign(target(), { matches: compact });
  const connection = Object.assign(target(), { saveData });
  const artwork = { running: false, destroyed: false, setRunning(value) { this.running = value; }, destroy() { this.destroyed = true; } };
  const companion = { running: false, destroyed: false, setRunning(value) { this.running = value; }, destroy() { this.destroyed = true; } };
  let observe, disconnected = false;
  const window = { navigator: { connection, deviceMemory: memory, hardwareConcurrency: 8 }, matchMedia: query => query.includes('max-width') ? compactMedia : media };
  if (observerSupport) window.IntersectionObserver = class {
    constructor(callback) { observe = callback; }
    observe(node) { assert.equal(node, footer); }
    disconnect() { disconnected = true; }
  };
  const controller = createFooterMotion({ document, window, graphics: () => artwork, character: () => companion });
  return { button, footer, document, media, compactMedia, connection, controller, artwork, companion,
    enter: () => observe?.([{ isIntersecting: true }]), leave: () => observe?.([{ isIntersecting: false }]),
    disconnected: () => disconnected };
}

test('illustration runs only in view and in a visible tab; user pause survives both', () => {
  const f = fixture();
  assert.equal(f.footer.dataset.footerMotion, 'paused');
  f.enter(); assert.equal(f.footer.dataset.footerMotion, 'running');
  f.document.hidden = true; f.document.emit('visibilitychange');
  assert.equal(f.footer.dataset.footerMotion, 'paused');
  f.document.hidden = false; f.document.emit('visibilitychange');
  assert.equal(f.footer.dataset.footerMotion, 'running');
  f.button.emit('click'); assert.equal(f.button.textContent, 'Resume motion');
  f.leave(); f.enter(); assert.equal(f.footer.dataset.footerMotion, 'paused');
  f.button.emit('click'); assert.equal(f.footer.dataset.footerMotion, 'running');
  f.leave(); assert.equal(f.footer.dataset.footerMotion, 'paused');
  f.controller.destroy();
});

test('motion preferences and Reader mode update immediately, including explicit OS overrides', () => {
  const f = fixture({ reduced: true }); f.enter();
  assert.equal(f.footer.dataset.footerMotion, 'paused'); assert.equal(f.button.hidden, true);
  f.document.documentElement.dataset.motion = 'full'; f.document.emit('display-preferences:change');
  assert.equal(f.footer.dataset.footerMotion, 'running');
  f.document.documentElement.dataset.layout = 'reader'; f.document.emit('display-preferences:change');
  assert.equal(f.footer.dataset.footerMotion, 'paused');
  delete f.document.documentElement.dataset.layout;
  f.document.documentElement.dataset.motion = 'reduced'; f.document.emit('display-preferences:change');
  assert.equal(f.footer.dataset.footerMotion, 'paused');
  delete f.document.documentElement.dataset.motion;
  f.media.matches = false; f.media.emit('change');
  assert.equal(f.footer.dataset.footerMotion, 'running');
  f.controller.destroy();
});

test('save data, constrained devices and missing observers retain a static illustration', () => {
  for (const options of [{ saveData: true }, { memory: 4 }, { observerSupport: false }]) {
    const f = fixture(options); f.enter();
    assert.equal(f.footer.dataset.footerMotion, 'paused'); assert.equal(f.button.hidden, true);
    if (options.saveData) {
      f.connection.saveData = false; f.connection.emit('change');
      assert.equal(f.footer.dataset.footerMotion, 'running');
    }
    f.controller.destroy();
  }
});

test('cleanup disconnects observation, removes listeners and ignores late observations', () => {
  const f = fixture(); f.enter(); f.controller.destroy();
  assert.equal(f.disconnected(), true);
  for (const target of [f.button, f.document, f.media, f.compactMedia, f.connection]) assert.equal(target.listeners.size, 0);
  f.enter(); assert.equal(f.footer.dataset.footerMotion, 'paused');
  assert.equal(f.button.hidden, true);
  assert.equal(f.artwork.destroyed, true);
  assert.equal(f.companion.destroyed, true);
  assert.doesNotThrow(() => createFooterMotion({ document: { querySelector: () => null }, window: {} }).destroy());
});

test('the outline character shares visibility, pause and motion gates and stops in hidden reading layouts', () => {
  const f = fixture(); f.enter();
  assert.equal(f.companion.running, true);
  f.leave(); assert.equal(f.companion.running, false);
  f.enter(); f.button.emit('click'); assert.equal(f.companion.running, false);
  f.button.emit('click'); assert.equal(f.companion.running, true);
  f.document.hidden = true; f.document.emit('visibilitychange');
  assert.equal(f.companion.running, false);
  f.document.hidden = false; f.document.emit('visibilitychange');
  for (const [key, value] of [['textScale', '115'], ['textScale', '130'], ['dyslexiaSpacing', 'on'], ['layout', 'reader'], ['motion', 'reduced']]) {
    f.document.documentElement.dataset[key] = value;
    f.document.emit('display-preferences:change');
    assert.equal(f.companion.running, false, `${key} stops the character`);
    delete f.document.documentElement.dataset[key];
    f.document.emit('display-preferences:change');
    assert.equal(f.companion.running, true);
  }
  f.controller.destroy();
});

test('compact layouts stop hidden artwork and restore desktop motion while retaining user pause', () => {
  const f = fixture({ compact: true }); f.enter();
  assert.equal(f.footer.dataset.footerMotion, 'paused');
  assert.equal(f.artwork.running, false);
  assert.equal(f.button.hidden, true);
  f.compactMedia.matches = false; f.compactMedia.emit('change');
  assert.equal(f.artwork.running, true);
  assert.equal(f.button.hidden, false);
  f.button.emit('click');
  f.compactMedia.matches = true; f.compactMedia.emit('change');
  f.compactMedia.matches = false; f.compactMedia.emit('change');
  assert.equal(f.artwork.running, false, 'A saved pause survives breakpoint changes');
  f.button.emit('click'); assert.equal(f.artwork.running, true);
  f.compactMedia.matches = true; f.compactMedia.emit('change');
  assert.equal(f.artwork.running, false);
  f.controller.destroy();
});

test('interaction studies and face turns share user pause, tab visibility and reading preferences', () => {
  const f = fixture();
  assert.equal(f.artwork.running, false);
  f.enter(); assert.equal(f.artwork.running, true);
  f.button.emit('click'); assert.equal(f.artwork.running, false);
  f.leave(); f.enter(); assert.equal(f.artwork.running, false);
  f.button.emit('click'); assert.equal(f.artwork.running, true);
  f.document.hidden = true; f.document.emit('visibilitychange'); assert.equal(f.artwork.running, false);
  f.document.hidden = false; f.document.emit('visibilitychange'); assert.equal(f.artwork.running, true);
  f.document.documentElement.dataset.motion = 'reduced'; f.document.emit('display-preferences:change');
  assert.equal(f.artwork.running, false);
  f.controller.destroy();
});
