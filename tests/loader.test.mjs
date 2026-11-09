import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../loader/files/loader.js', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function preview({ returning = false, reduced = false, compact = false, saveData = false, hash = '', assets = true, blockedStorage = false, brokenAnimation = false, handwriting = false } = {}) {
  const frames = new Map(), timers = new Map(), emitted = [];
  let clock = 0, sequence = 0;
  function target() {
    const listeners = new Map();
    return {
      style: {}, dataset: {}, attributes: {},
      addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
      removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
      dispatch(name, event = {}) { listeners.get(name)?.forEach(callback => callback(event)); },
      setAttribute(name, value) { this.attributes[name] = value; }
    };
  }
  const root = target(), body = target(), loader = target(), word = target(), language = target(), fill = target();
  const skip = target(), bar = target(), heading = Object.assign(target(), { focus() { this.focused = true; } });
  const classes = new Set();
  root.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) };
  loader.classList = { add() {} };
  root.style.overflow = 'auto'; body.style.overflow = 'scroll';
  loader.querySelector = selector => ({ '.ld-skip': skip, '.ld-bar': bar })[selector];
  const motion = Object.assign(target(), { matches: reduced });
  const template = handwriting ? { content: { cloneNode: () => ({ textContent: 'नमस्ते' }) } } : undefined;
  if (handwriting) word.replaceChildren = node => { word.textContent = node.textContent; word.written = true; };
  word.animate = () => { if (brokenAnimation) throw new Error('Animation unavailable'); return { cancel() {} }; };
  const pending = new Promise(() => {});
  const document = Object.assign(target(), {
    documentElement: root, body, readyState: assets ? 'complete' : 'interactive', hidden: false, activeElement: {},
    fonts: { ready: assets ? Promise.resolve() : pending },
    getElementById: id => ({ loader, 'ld-word': word, 'ld-lang': language, 'ld-fill': fill, 'hero-title': heading, 'ld-namaste-template': template })[id],
    querySelector: () => ({ decode: () => assets ? Promise.resolve() : pending }),
    dispatchEvent(event) { emitted.push(event.type); this.dispatch(event.type, event); }
  });
  loader.contains = element => element === skip;
  const storage = { values: new Map(returning ? [['portfolio-intro-seen', '1']] : []),
    getItem(key) { if (blockedStorage) throw new Error('Storage blocked'); return this.values.get(key) || null; },
    setItem(key, value) { if (blockedStorage) throw new Error('Storage blocked'); this.values.set(key, value); } };
  const window = Object.assign(target(), { location: { hash }, navigator: { connection: { saveData } } });
  const local = { ...storage, values: new Map(storage.values) };
  vm.runInNewContext(source, {
    document, window, localStorage: local, sessionStorage: storage,
    matchMedia: query => query.includes('max-width') ? { matches: compact } : motion,
    performance: { now: () => clock }, console: { warn() {} }, CustomEvent: class { constructor(type) { this.type = type; } },
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, at: clock + delay }); return id; },
    clearTimeout: id => timers.delete(id)
  });
  function advance(ms, paint = true) {
    clock += ms;
    if (paint) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(clock)); }
    for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.callback(); }
  }
  return { root, body, loader, word, language, fill, bar, skip, heading, document, window, motion, emitted, frames, advance };
}

test('returning visits show Namaste with a monotonic progress bar and finish exactly once', async () => {
  const page = preview({ returning: true }); await flush();
  assert.equal(page.loader.dataset.visit, 'returning');
  assert.equal(page.word.textContent, 'नमस्ते');
  assert.equal(page.word.lang, 'ne');
  assert.equal(page.root.classList.contains('loader-running'), true);
  page.advance(525); assert.equal(page.bar.attributes['aria-valuenow'], '50');
  page.advance(525); assert.equal(page.bar.attributes['aria-valuenow'], '100');
  page.advance(180);
  assert.equal(page.loader.style.display, 'none');
  assert.equal(page.root.style.overflow, 'auto'); assert.equal(page.body.style.overflow, 'scroll');
  assert.equal(page.root.dataset.loaderDone, 'true');
  assert.deepEqual(page.emitted, ['loader:done']);
  assert.equal(page.heading.focused, undefined, 'Automatic dismissal does not move focus');
  page.skip.dispatch('click'); page.window.dispatch('pagehide'); page.advance(5000);
  assert.deepEqual(page.emitted, ['loader:done']);
});

test('first visits show Hello, then handwritten Namaste, and finish at nine seconds', async () => {
  const page = preview({ handwriting: true }); await flush();
  assert.equal(page.loader.dataset.visit, 'first');
  assert.equal(page.word.textContent, 'Hello');
  page.advance(4500);
  assert.equal(page.root.classList.contains('loader-running'), true, 'The old first-visit timeout must not cut the longer intro short');
  page.advance(3219); assert.equal(page.word.textContent, 'Hello');
  page.advance(1); assert.equal(page.word.textContent, 'नमस्ते');
  assert.equal(page.word.written, true);
  page.advance(1100); page.advance(179);
  assert.equal(page.root.dataset.loaderDone, 'false', 'Keep the intro visible until nine seconds');
  page.advance(1);
  assert.equal(page.root.dataset.loaderDone, 'true');
  assert.deepEqual(page.emitted, ['loader:done']);
});

test('first visits remain bounded at nine seconds when assets are slow and recover from stalled frames', async () => {
  const slow = preview({ assets: false }); await flush();
  slow.advance(7720); slow.advance(1100); slow.advance(180);
  assert.equal(slow.root.dataset.loaderDone, 'true');
  assert.equal(slow.root.style.overflow, 'auto');
  const stalled = preview();
  stalled.advance(8999, false);
  assert.equal(stalled.root.dataset.loaderDone, 'false');
  stalled.advance(21, false);
  assert.equal(stalled.root.dataset.loaderDone, 'true');
  assert.equal(stalled.body.style.overflow, 'scroll');
});

test('deep links and reduced motion bypass the overlay without locking scrolling', () => {
  for (const options of [{ hash: '#featured-project' }, { reduced: true }]) {
    const page = preview(options);
    assert.equal(page.root.classList.contains('loader-running'), false);
    assert.equal(page.root.style.overflow, 'auto'); assert.equal(page.body.style.overflow, 'scroll');
    assert.deepEqual(page.emitted, ['loader:done']);
  }
});

test('first-time mobile and save-data visits show content immediately, even when assets are slow', () => {
  for (const options of [{ compact: true }, { saveData: true }]) {
    const page = preview({ ...options, assets: false });
    assert.equal(page.loader.style.display, 'none');
    assert.equal(page.root.classList.contains('loader-running'), false);
    assert.equal(page.root.style.overflow, 'auto');
    assert.equal(page.body.style.overflow, 'scroll');
    assert.equal(page.frames.size, 0);
    assert.deepEqual(page.emitted, ['loader:done']);
    page.advance(10000);
    assert.deepEqual(page.emitted, ['loader:done']);
  }
});

test('scroll intent, keyboard, visibility changes and the skip button restore the usable page', () => {
  for (const dismiss of [
    page => page.document.dispatch('keydown', { key: 'Tab' }),
    page => page.window.dispatch('wheel'), page => page.window.dispatch('touchmove'),
    page => { page.document.hidden = true; page.document.dispatch('visibilitychange'); },
    page => page.motion.dispatch('change', { matches: true }),
    page => page.skip.dispatch('click')
  ]) {
    const page = preview({ returning: true }); dismiss(page);
    assert.equal(page.root.classList.contains('loader-running'), false);
    assert.equal(page.body.style.overflow, 'scroll');
    assert.deepEqual(page.emitted, ['loader:done']);
  }
  const skipped = preview(); skipped.skip.dispatch('click'); assert.equal(skipped.heading.focused, true);
});

test('slow assets, stalled frames, blocked storage and animation failures cannot leave the loader stuck', async () => {
  const slow = preview({ returning: true, assets: false }); await flush();
  slow.advance(1050); assert.equal(slow.bar.attributes['aria-valuenow'], '92');
  assert.equal(slow.root.classList.contains('loader-running'), true);
  slow.advance(750); slow.advance(180);
  assert.equal(slow.root.dataset.loaderDone, 'true');
  const stalled = preview({ returning: true }); stalled.advance(2100, false);
  assert.equal(stalled.root.style.overflow, 'auto'); assert.equal(stalled.body.style.overflow, 'scroll');
  const blocked = preview({ blockedStorage: true }); await flush();
  assert.equal(blocked.loader.dataset.visit, 'returning'); blocked.advance(1050); blocked.advance(180);
  assert.equal(blocked.root.dataset.loaderDone, 'true');
  const broken = preview({ brokenAnimation: true }); broken.advance(7720);
  assert.equal(broken.root.dataset.loaderDone, 'true'); assert.equal(broken.root.style.overflow, 'auto');
});

test('Namaste uses the pen-stroke artwork and holds the completed word before dismissing', async () => {
  const page = preview({ returning: true, handwriting: true }); await flush();
  assert.equal(page.word.written, true);
  assert.equal(page.word.dataset.writing, 'true');
  page.advance(880);
  assert.equal(page.root.classList.contains('loader-running'), true, 'Finished ink has a readable hold');
  page.advance(170); page.advance(180);
  assert.equal(page.root.dataset.loaderDone, 'true');
});

test('Namaste drawing is local vector geometry with a bounded, ordered stroke sequence', () => {
  const svg = readFileSync(new URL('../loader/files/namaste.svg', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(svg.trim()), 'The inline template matches the source artwork');
  assert.doesNotMatch(svg, /<image\b|<script\b|<text\b|data:image/i);
  const timing = [...svg.matchAll(/--pen-delay:([\d.]+)ms;--pen-duration:([\d.]+)ms/g)].map(match => [Number(match[1]), Number(match[2])]);
  assert.equal(timing.length, 18);
  for (let index = 0; index < timing.length; index++) {
    assert.ok(timing[index][1] > 0 && timing[index][0] + timing[index][1] <= 761);
    if (index > 0) assert.ok(timing[index][0] >= timing[index - 1][0] + timing[index - 1][1]);
  }
});
