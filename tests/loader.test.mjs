import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../loader/files/loader.js', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function preview({ intro = false, styles = 'ready', returning = false, reduced = false, compact = false, saveData = false, hash = '', assets = true, blockedStorage = false, brokenAnimation = false, handwriting = false } = {}) {
  const frames = new Map(), timers = new Map(), emitted = [];
  const stylesheets = [], work = { storage: 0, fonts: 0, portrait: 0 };
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
    getElementById: id => ({ loader, 'ld-word': word, 'ld-lang': language, 'ld-fill': fill, 'hero-title': heading, 'ld-namaste-template': template })[id],
    querySelector: () => { work.portrait++; return { decode: () => assets ? Promise.resolve() : pending }; },
    createElement: target,
    head: { append(stylesheet) { stylesheets.push(stylesheet); if (styles === 'ready') stylesheet.dispatch('load'); } },
    dispatchEvent(event) { emitted.push(event.type); this.dispatch(event.type, event); }
  });
  Object.defineProperty(document, 'fonts', { get() { work.fonts++; return { ready: assets ? Promise.resolve() : pending }; } });
  loader.contains = element => element === skip;
  const storage = { values: new Map(returning ? [['portfolio-intro-seen', '1']] : []),
    getItem(key) { work.storage++; if (blockedStorage) throw new Error('Storage blocked'); return this.values.get(key) || null; },
    setItem(key, value) { work.storage++; if (blockedStorage) throw new Error('Storage blocked'); this.values.set(key, value); } };
  const window = Object.assign(target(), { location: { hash, search: intro ? '?intro=1' : '' }, navigator: { connection: { saveData } } });
  const local = { ...storage, values: new Map(storage.values) };
  vm.runInNewContext(source, {
    document, window, URLSearchParams, localStorage: local, sessionStorage: storage,
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
  return { root, body, loader, word, language, fill, bar, skip, heading, document, window, motion, emitted, frames, timers, stylesheets, work, advance };
}

test('normal desktop visits show the first welcome or returning Namaste', async () => {
  for (const returning of [false, true]) {
    const page = preview({ returning, handwriting: true }); await flush();
    assert.equal(page.loader.dataset.visit, returning ? 'returning' : 'first');
    assert.equal(page.word.lang, returning ? 'ne' : 'en');
    assert.equal(page.stylesheets.length, 1);
    page.advance(returning ? 1050 : 5820);
    page.advance(180);
    assert.equal(page.root.dataset.loaderDone, 'true');
    assert.deepEqual(page.emitted, ['loader:done']);
  }
});

test('returning explicit previews show Namaste with a monotonic progress bar and finish exactly once', async () => {
  const page = preview({ intro: true, returning: true }); await flush();
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

test('first explicit previews show Hello, then handwritten Namaste, and finish at six seconds', async () => {
  const page = preview({ intro: true, handwriting: true }); await flush();
  assert.equal(page.loader.dataset.visit, 'first');
  assert.equal(page.word.textContent, 'Hello');
  page.advance(4500);
  assert.equal(page.root.classList.contains('loader-running'), true, 'The first welcome must remain visible before Namaste');
  page.advance(219); assert.equal(page.word.textContent, 'Hello');
  page.advance(1); assert.equal(page.word.textContent, 'नमस्ते');
  assert.equal(page.word.written, true);
  page.advance(1100); page.advance(179);
  assert.equal(page.root.dataset.loaderDone, 'false', 'Keep the intro visible until six seconds');
  page.advance(1);
  assert.equal(page.root.dataset.loaderDone, 'true');
  assert.deepEqual(page.emitted, ['loader:done']);
});

test('first explicit previews remain bounded at six seconds when assets are slow and recover from stalled frames', async () => {
  const slow = preview({ intro: true, assets: false }); await flush();
  slow.advance(4720); slow.advance(1100); slow.advance(180);
  assert.equal(slow.root.dataset.loaderDone, 'true');
  assert.equal(slow.root.style.overflow, 'auto');
  const stalled = preview({ intro: true });
  stalled.advance(5999, false);
  assert.equal(stalled.root.dataset.loaderDone, 'false');
  stalled.advance(1, false);
  assert.equal(stalled.root.dataset.loaderDone, 'true');
  assert.equal(stalled.body.style.overflow, 'scroll');
});

test('deep links and reduced motion bypass the overlay without locking scrolling', () => {
  for (const options of [{ hash: '#featured-project' }, { reduced: true }, { compact: true, hash: '#contact' }, { compact: true, reduced: true }]) {
    const page = preview({ ...options, intro: true });
    assert.equal(page.root.classList.contains('loader-running'), false);
    assert.equal(page.root.style.overflow, 'auto'); assert.equal(page.body.style.overflow, 'scroll');
    assert.deepEqual(page.emitted, ['loader:done']);
  }
});

test('save-data visits bypass the intro on phones and desktop, even when assets are slow', () => {
  for (const options of [{ saveData: true, compact: true }, { saveData: true }]) {
    const page = preview({ ...options, intro: true, assets: false });
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

test('mobile cycles five languages and finishes with animated Namaste at exactly five seconds', async () => {
  const page = preview({ compact: true, handwriting: true }); await flush();
  assert.equal(page.loader.dataset.mode, 'mobile');
  assert.equal(page.word.textContent, 'Hello');
  for (const [delay, text, lang] of [[700, 'Hola', 'es'], [700, 'Bonjour', 'fr'], [700, 'Ciao', 'it'], [700, 'Hallo', 'de']]) {
    page.advance(delay);
    assert.equal(page.word.textContent, text);
    assert.equal(page.word.lang, lang);
  }
  page.advance(770);
  assert.equal(page.word.lang, 'ne');
  assert.equal(page.word.written, true);
  page.advance(880);
  assert.equal(page.root.dataset.loaderDone, 'false', 'Completed ink remains readable');
  page.advance(370); page.advance(179);
  assert.equal(page.root.dataset.loaderDone, 'false');
  page.advance(1);
  assert.equal(page.root.dataset.loaderDone, 'true');
  assert.deepEqual(page.emitted, ['loader:done']);
  assert.equal(page.body.style.overflow, 'scroll');
});

test('mobile full sequence remains five seconds for returning visitors and slow or blocked assets', async () => {
  for (const options of [{ returning: true }, { assets: false }, { blockedStorage: true }]) {
    const page = preview({ compact: true, ...options }); await flush();
    assert.equal(page.word.textContent, 'Hello');
    page.advance(3570); assert.equal(page.word.lang, 'ne');
    page.advance(1250); page.advance(180);
    assert.equal(page.root.dataset.loaderDone, 'true');
  }
  const stalled = preview({ compact: true });
  stalled.advance(5000, false);
  assert.equal(stalled.root.dataset.loaderDone, 'true');
});

test('phone welcome can be skipped immediately and stylesheet failure never locks scrolling', () => {
  const phone = preview({ compact: true });
  phone.skip.dispatch('click');
  assert.equal(phone.root.dataset.loaderDone, 'true');
  assert.equal(phone.heading.focused, true);
  const failed = preview({ compact: true, styles: 'pending' });
  failed.stylesheets[0].dispatch('error');
  assert.equal(failed.root.dataset.loaderDone, 'true');
  assert.equal(failed.body.style.overflow, 'scroll');
});

test('scroll intent, keyboard, visibility changes and the skip button restore the usable page', () => {
  for (const dismiss of [
    page => page.document.dispatch('keydown', { key: 'Tab' }),
    page => page.window.dispatch('wheel'), page => page.window.dispatch('touchmove'),
    page => { page.document.hidden = true; page.document.dispatch('visibilitychange'); },
    page => page.motion.dispatch('change', { matches: true }),
    page => page.skip.dispatch('click')
  ]) {
    const page = preview({ intro: true, returning: true }); dismiss(page);
    assert.equal(page.root.classList.contains('loader-running'), false);
    assert.equal(page.body.style.overflow, 'scroll');
    assert.deepEqual(page.emitted, ['loader:done']);
  }
  const skipped = preview({ intro: true }); skipped.skip.dispatch('click'); assert.equal(skipped.heading.focused, true);
});

test('slow assets, stalled frames, blocked storage and animation failures cannot leave the loader stuck', async () => {
  const slow = preview({ intro: true, returning: true, assets: false }); await flush();
  slow.advance(1050); assert.equal(slow.bar.attributes['aria-valuenow'], '92');
  assert.equal(slow.root.classList.contains('loader-running'), true);
  slow.advance(750); slow.advance(180);
  assert.equal(slow.root.dataset.loaderDone, 'true');
  const stalled = preview({ intro: true, returning: true }); stalled.advance(2100, false);
  assert.equal(stalled.root.style.overflow, 'auto'); assert.equal(stalled.body.style.overflow, 'scroll');
  const blocked = preview({ intro: true, blockedStorage: true }); await flush();
  assert.equal(blocked.loader.dataset.visit, 'returning'); blocked.advance(1050); blocked.advance(180);
  assert.equal(blocked.root.dataset.loaderDone, 'true');
  const broken = preview({ intro: true, brokenAnimation: true }); broken.advance(7720);
  assert.equal(broken.root.dataset.loaderDone, 'true'); assert.equal(broken.root.style.overflow, 'auto');
});

test('Namaste uses the pen-stroke artwork and holds the completed word before dismissing', async () => {
  const page = preview({ intro: true, returning: true, handwriting: true }); await flush();
  assert.equal(page.word.written, true);
  assert.equal(page.word.dataset.writing, 'true');
  page.advance(880);
  assert.equal(page.root.classList.contains('loader-running'), true, 'Finished ink has a readable hold');
  page.advance(170); page.advance(180);
  assert.equal(page.root.dataset.loaderDone, 'true');
});

test('eligible welcomes request intro CSS and stylesheet failure never locks the page', () => {
  const page = preview({ intro: true, styles: 'pending' });
  assert.equal(page.stylesheets.length, 1);
  assert.match(page.stylesheets[0].href, /^loader\/files\/loader\.css\?/);
  assert.equal(page.root.classList.contains('loader-running'), false);
  assert.equal(page.root.style.overflow, 'auto');
  page.stylesheets[0].dispatch('error');
  assert.deepEqual(page.emitted, ['loader:done']);
  page.stylesheets[0].dispatch('load');
  assert.equal(page.root.classList.contains('loader-running'), false);
  const stalled = preview({ intro: true, styles: 'pending' });
  stalled.advance(2500);
  assert.deepEqual(stalled.emitted, ['loader:done']);
  assert.equal(stalled.body.style.overflow, 'scroll');
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
