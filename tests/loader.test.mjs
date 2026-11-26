import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../loader/files/loader.js', import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function preview({ styles = 'ready', returning = false, reduced = false, compact = false, constrained = false, motionPreference, firstPaint = true, saveData = false, hash = '', assets = true, hidden = false, blockedStorage = false, brokenAnimation = false, handwriting = false, nativeProgress = false, trackInk = false } = {}) {
  const frames = new Map(), timers = new Map(), emitted = [];
  const stylesheets = [], wordAnimations = [], work = { storage: 0, fonts: 0, portrait: 0 };
  let clock = 0, sequence = 0;
  function target() {
    const listeners = new Map();
    return {
      style: {}, dataset: {}, attributes: {},
      addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
      removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
      dispatch(name, event = {}) { listeners.get(name)?.forEach(callback => callback(event)); },
      animate(keyframes, options) {
        if (brokenAnimation) throw new Error('Animation unavailable');
        const animation = { keyframes, options, cancelled: false, cancel() { this.cancelled = true; } };
        wordAnimations.push(animation); return animation;
      },
      setAttribute(name, value) { this.attributes[name] = value; }
    };
  }
  const root = target(), body = target(), loader = target(), word = target(), language = target(), fill = target();
  const finishInk = [];
  if (trackInk) {
    const strokes = Array.from({ length: 10 }, () => ({ animationName: 'ld-pen-write',
      finished: new Promise(resolve => finishInk.push(resolve)) }));
    word.getAnimations = () => strokes;
  }
  const skip = target(), bar = target(), heading = Object.assign(target(), { focus() { this.focused = true; } });
  const classes = new Set();
  root.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) };
  loader.classList = { add() {}, remove() {} };
  root.style.overflow = 'auto'; body.style.overflow = 'scroll';
  if (motionPreference) root.dataset.motion = motionPreference;
  loader.querySelector = selector => ({ '.ld-skip': skip, '.ld-bar': bar })[selector];
  const motion = Object.assign(target(), { matches: reduced });
  const template = handwriting ? { content: { cloneNode: () => ({ textContent: 'नमस्ते' }) } } : undefined;
  if (handwriting) word.replaceChildren = (...nodes) => { word.textContent = nodes.map(node => node.textContent).join(''); word.written = word.textContent === 'नमस्ते'; };
  word.animate = (keyframes, options) => {
    if (brokenAnimation) throw new Error('Animation unavailable');
    const animation = { keyframes, options, cancelled: false, cancel() { this.cancelled = true; } };
    wordAnimations.push(animation);
    return animation;
  };
  const progressMotion = { cancelled: 0, keyframes: [],
    cancel() { this.cancelled++; }, effect: { setKeyframes(value) { progressMotion.keyframes = value; } } };
  if (nativeProgress) fill.animate = keyframes => { progressMotion.keyframes = keyframes; return progressMotion; };
  const pending = new Promise(() => {});
  const document = Object.assign(target(), {
    documentElement: root, body, readyState: assets ? 'complete' : 'interactive', hidden, activeElement: {},
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
  const window = Object.assign(target(), { location: { hash, search: '' }, navigator: { deviceMemory: constrained ? 4 : 8, hardwareConcurrency: 8, connection: { saveData } } });
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
  if (firstPaint && !hidden) { advance(0); advance(0); }
  return { root, body, loader, word, language, fill, bar, skip, heading, document, window, motion, emitted, frames, timers, stylesheets, work, wordAnimations, progressMotion, advance, finishInk };
}

test('first desktop and phone visits play every language before Namaste', () => {
  for (const compact of [false, true]) {
    const page = preview({ compact, handwriting: true });
    assert.equal(page.word.textContent, 'Hello');
    assert.equal(page.root.style.overflow, 'hidden');
    for (const [delay, lang] of [[compact ? 700 : 940, 'es'], [compact ? 700 : 940, 'fr'], [compact ? 700 : 940, 'it'], [compact ? 700 : 940, 'de'], [compact ? 770 : 960, 'ne']]) {
      page.advance(delay); assert.equal(page.word.lang, lang);
      assert.equal(page.root.style.overflow, 'hidden');
      assert.equal(page.root.classList.contains('loader-docked'), false);
    }
    assert.equal(page.word.written, true);
    page.advance(compact ? 1250 : 1100); page.advance(219);
    assert.equal(page.root.dataset.loaderDone, 'false');
    page.advance(1); assert.deepEqual(page.emitted, ['loader:done']);
    assert.equal(page.root.style.overflow, 'auto'); assert.equal(page.body.style.overflow, 'scroll');
  }
});

test('returning visits animate a fresh brief Namaste on desktop and phones', () => {
  for (const compact of [false, true]) {
    const page = preview({ compact, returning: true, handwriting: true });
    assert.equal(page.loader.dataset.visit, 'returning');
    assert.equal(page.word.lang, 'ne'); assert.equal(page.word.written, true);
    assert.equal(page.loader.dataset.ink, 'drawing');
    page.advance(860); assert.equal(page.root.dataset.loaderDone, 'false');
    page.advance(390); page.advance(219);
    assert.equal(page.root.dataset.loaderDone, 'false');
    page.advance(1); assert.deepEqual(page.emitted, ['loader:done']);
  }
});

test('a busy frame does not fast-forward through unread greetings', () => {
  const page = preview({ handwriting: true });
  page.advance(2500);
  assert.equal(page.word.lang, 'es', 'Only advance to the next greeting after a stalled timer');
  page.advance(939); assert.equal(page.word.lang, 'es', 'The next greeting retains its full hold');
  page.advance(1); assert.equal(page.word.lang, 'fr');
  page.skip.dispatch('click');
});

test('returning visits preserve section hashes while showing brief Namaste', () => {
  for (const compact of [false, true]) {
    const page = preview({ compact, returning: true, handwriting: true, hash: '#contact' });
    assert.equal(page.word.lang, 'ne'); assert.equal(page.root.style.overflow, 'hidden');
    page.advance(1250); page.advance(220);
    assert.equal(page.root.dataset.loaderDone, 'true');
    assert.equal(page.window.location.hash, '#contact');
  }
});

test('a background startup waits for visibility and then plays the complete brief animation', () => {
  const page = preview({ hidden: true, returning: true, handwriting: true });
  page.advance(10000, false);
  assert.deepEqual(page.emitted, []); assert.equal(page.word.written, undefined);
  page.document.hidden = false; page.document.dispatch('visibilitychange');
  page.advance(0); page.advance(16);
  assert.equal(page.word.written, true); assert.equal(page.root.dataset.loaderDone, 'false');
  page.advance(1250); page.advance(220);
  assert.deepEqual(page.emitted, ['loader:done']);
});

test('the clock and strokes start after paint; a delayed first frame cannot consume the writing sequence', () => {
  const page = preview({ returning: true, handwriting: true, firstPaint: false });
  assert.equal(page.loader.dataset.ink, 'pending');
  page.advance(600, false); page.advance(0); page.advance(16);
  assert.equal(page.loader.dataset.ink, 'drawing');
  page.advance(860); assert.equal(page.root.dataset.loaderDone, 'false');
  page.advance(390); page.advance(220);
  assert.equal(page.root.dataset.loaderDone, 'true');
});

test('all actual strokes must finish before the readable hold and exit fade', async () => {
  const page = preview({ returning: true, handwriting: true, trackInk: true });
  page.advance(1250); assert.equal(page.root.dataset.loaderDone, 'false');
  page.finishInk.slice(0, 9).forEach(finish => finish()); await flush();
  page.advance(150); assert.equal(page.root.dataset.loaderDone, 'false');
  page.finishInk[9](); await flush();
  page.advance(299); assert.equal(page.root.dataset.loaderDone, 'false');
  page.advance(1); page.advance(219); assert.equal(page.root.dataset.loaderDone, 'false');
  page.advance(1); assert.deepEqual(page.emitted, ['loader:done']);
});

test('stalled painting or ink cannot lock the page; late completions cannot restart a skipped welcome', async () => {
  for (const options of [{ firstPaint: false }, { trackInk: true }, { trackInk: true, skip: true }]) {
    const page = preview({ ...options, returning: true, handwriting: true });
    if (options.skip) page.skip.dispatch('click');
    else page.advance(3500, !options.firstPaint);
    assert.equal(page.root.style.overflow, 'auto');
    assert.equal(page.body.style.overflow, 'scroll');
    page.finishInk.forEach(finish => finish()); await flush(); page.advance(1000);
    assert.deepEqual(page.emitted, ['loader:done']);
    assert.equal(page.frames.size, 0); assert.equal(page.timers.size, 0);
  }
});

test('skip, keyboard, scrolling, preferences and hiding an active welcome release its resources once', () => {
  for (const dismiss of [
    p => p.skip.dispatch('click'), p => p.document.dispatch('keydown', { key: 'Tab' }),
    p => p.document.dispatch('keydown', { key: 'Escape' }),
    p => p.window.dispatch('wheel'), p => p.window.dispatch('touchmove'),
    p => { p.document.hidden = true; p.document.dispatch('visibilitychange'); },
    p => p.motion.dispatch('change', { matches: true })
  ]) {
    const page = preview({ returning: true, handwriting: true }); dismiss(page);
    page.advance(10000); assert.deepEqual(page.emitted, ['loader:done']);
    assert.equal(page.frames.size, 0); assert.equal(page.timers.size, 0);
    assert.equal(page.root.style.overflow, 'auto');
  }
  const page = preview(); page.skip.dispatch('click'); assert.equal(page.heading.focused, true);
});

test('back/forward restoration animates a new brief sequence each time', () => {
  const page = preview({ handwriting: true }); page.skip.dispatch('click');
  for (let i = 0; i < 3; i++) {
    page.window.dispatch('pageshow', { persisted: true });
    page.advance(0); page.advance(0);
    assert.equal(page.loader.dataset.visit, 'returning');
    assert.equal(page.word.lang, 'ne'); assert.equal(page.word.written, true);
    assert.equal(page.loader.style.display, '');
    assert.equal(page.root.style.overflow, 'hidden');
    page.advance(1250); page.advance(220);
    assert.equal(page.root.dataset.loaderDone, 'true');
  }
  assert.equal(page.emitted.length, 4);
});

test('visibility during the exit fade cannot restart the intro or preserve a scroll lock', () => {
  const page = preview({ returning: true, handwriting: true });
  page.advance(1250);
  page.document.hidden = true; page.document.dispatch('visibilitychange');
  page.document.hidden = false; page.document.dispatch('visibilitychange');
  page.advance(500);
  assert.deepEqual(page.emitted, ['loader:done']);
  assert.equal(page.root.style.overflow, 'auto');
  assert.equal(page.body.style.overflow, 'scroll');
});

test('leaving a hidden startup cleans up the pending controller before restoring a fresh one', () => {
  const page = preview({ hidden: true, returning: true, handwriting: true });
  page.window.dispatch('pagehide', { persisted: true });
  page.document.hidden = false;
  page.window.dispatch('pageshow', { persisted: true });
  page.document.dispatch('visibilitychange');
  page.advance(0); page.advance(0); page.advance(1250); page.advance(220);
  assert.deepEqual(page.emitted, ['loader:done', 'loader:done']);
  assert.equal(page.root.style.overflow, 'auto');
  assert.equal(page.timers.size, 0);
});

test('slow images/fonts, blocked storage and optional animation failures do not prevent a readable welcome', () => {
  for (const options of [{ assets: false }, { blockedStorage: true }, { brokenAnimation: true }]) {
    const page = preview({ ...options, returning: true, handwriting: true });
    assert.equal(page.word.lang, 'ne'); assert.equal(page.word.written, true);
    assert.equal(page.work.portrait, 0); assert.equal(page.work.fonts, 0);
    page.advance(1250); page.advance(220);
    assert.deepEqual(page.emitted, ['loader:done']);
  }
  const page = preview({ brokenAnimation: true });
  assert.equal(page.word.textContent, 'Hello');
  page.advance(8000); assert.equal(page.root.dataset.loaderDone, 'true');
});

test('progress is native, independent of downloads, monotonic and cancelled on skip', () => {
  const page = preview({ returning: true, nativeProgress: true, assets: false });
  assert.equal(page.progressMotion.keyframes.at(-1).transform, 'scaleX(1)');
  assert.equal(page.frames.size, 0);
  page.advance(1250); assert.equal(page.bar.attributes['aria-valuenow'], '100');
  page.skip.dispatch('click'); assert.equal(page.progressMotion.cancelled, 1);
  assert.equal(page.fill.style.transform, 'scaleX(1)');
});

test('first visits use staggered glyph motion that settles before the fresh handwriting', () => {
  for (const compact of [false, true]) {
    const page = preview({ compact, handwriting: true });
    assert.equal(page.loader.dataset.effects, 'full');
    const glyphs = page.wordAnimations.filter(animation => animation.options.delay !== undefined);
    assert.equal(glyphs.length, 5);
    assert.deepEqual(glyphs.map(animation => animation.options.delay), [0, 22, 44, 66, 88]);
    assert.ok(glyphs.every(animation => animation.keyframes.some(frame => frame.opacity === 1 && frame.transform.includes('translateY(0)'))));
    for (const delay of [compact ? 700 : 940, compact ? 700 : 940, compact ? 700 : 940, compact ? 700 : 940, compact ? 770 : 960]) page.advance(delay);
    assert.equal(page.word.written, true);
    assert.ok(glyphs.every(animation => animation.cancelled));
  }
});

test('returning visits and constrained devices avoid elaborate glyph motion', () => {
  for (const options of [{ returning: true }, { constrained: true }, { returning: true, compact: true }]) {
    const page = preview({ ...options, handwriting: true });
    assert.equal(page.loader.dataset.effects, 'light');
    assert.equal(page.wordAnimations.some(animation => animation.options.delay !== undefined), false);
    page.skip.dispatch('click');
    assert.ok(page.wordAnimations.every(animation => animation.cancelled));
  }
});

test('reduced motion and save-data bypass the intro; explicit Full motion overrides the OS default', () => {
  for (const options of [{ reduced: true }, { motionPreference: 'reduced' }, { saveData: true }, { saveData: true, compact: true }]) {
    const page = preview(options);
    assert.equal(page.root.classList.contains('loader-running'), false);
    assert.equal(page.root.style.overflow, 'auto'); assert.equal(page.frames.size, 0);
    assert.deepEqual(page.emitted, ['loader:done']);
  }
  const full = preview({ reduced: true, motionPreference: 'full', returning: true, handwriting: true });
  assert.equal(full.root.style.overflow, 'hidden'); full.advance(1250); full.advance(220);
  assert.equal(full.root.dataset.loaderDone, 'true');
});

test('the synchronized controller is embedded before page content with no loader download dependency', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(html.match(/<script id="welcome-controller">([\s\S]*?)<\/script>/)[1], source.replaceAll('\r\n', '\n'));
  assert.ok(html.includes(readFileSync(new URL('../loader/files/loader.css', import.meta.url), 'utf8')));
  assert.ok(html.indexOf('id="loader-bootstrap"') < html.indexOf('<body>'));
  assert.ok(html.indexOf('id="ld-namaste-template"') < html.indexOf('id="welcome-controller"'));
  assert.ok(html.indexOf('id="welcome-controller"') < html.indexOf('<header'));
  assert.doesNotMatch(html, /<script\b[^>]*src="loader\/files\/loader\.js/);
});

test('the head watchdog releases a missing controller and preserves reduced-motion bypass', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const boot = html.match(/<script id="loader-bootstrap">([\s\S]*?)<\/script>/)[1];
  for (const reduced of [false, true]) {
    const classes = new Set(), timers = [], events = [];
    const root = { dataset: {}, classList: { add: name => classes.add(name), remove: name => classes.delete(name) } };
    vm.runInNewContext(boot, {
      document: { documentElement: root, hidden: false, dispatchEvent: event => events.push(event.type) },
      window: { location: { hash: '', search: '' } }, URLSearchParams, navigator: {}, matchMedia: () => ({ matches: reduced }),
      setTimeout: callback => timers.push(callback), CustomEvent: class { constructor(type) { this.type = type; } }
    });
    assert.equal(classes.has('loader-running'), !reduced);
    if (!reduced) { timers[0](); assert.equal(classes.has('loader-running'), false); assert.deepEqual(events, ['loader:done']); }
  }
});

test('the head bootstrap reserves the welcome for repeats and direct section links', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const boot = html.match(/<script id="loader-bootstrap">([\s\S]*?)<\/script>/)[1];
  for (const options of [{ hash: '#contact' }, { seen: true }, { count: '2' }, { seen: true, blockedSession: true }]) {
    const classes = new Set(), timers = [];
    const root = { dataset: {}, classList: { add: name => classes.add(name) } };
    const storage = { getItem: key => key === 'portfolio-intro-seen' ? (options.seen ? '1' : null) : options.count || null };
    const window = { location: { hash: options.hash || '', search: '' }, localStorage: storage };
    Object.defineProperty(window, 'sessionStorage', { get() { if (options.blockedSession) throw Error('Blocked'); return storage; } });
    vm.runInNewContext(boot, {
      document: { documentElement: root }, window, URLSearchParams, navigator: {}, matchMedia: () => ({ matches: false }),
      setTimeout: callback => timers.push(callback)
    });
    assert.equal(classes.has('loader-running'), true); assert.equal(timers.length, 1);
  }
});

test('Namaste drawing is local vector geometry with a bounded, ordered stroke sequence', () => {
  const svg = readFileSync(new URL('../loader/files/namaste.svg', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes(svg.trim()), 'The inline template matches the source artwork');
  assert.doesNotMatch(svg, /<image\b|<script\b|<text\b|data:image/i);
  const timing = [...svg.matchAll(/--pen-delay:([\d.]+)ms;--pen-duration:([\d.]+)ms/g)].map(match => [Number(match[1]), Number(match[2])]);
  assert.equal(timing.length, 10);
  for (let index = 0; index < timing.length; index++) {
    assert.ok(timing[index][1] > 0 && timing[index][0] + timing[index][1] <= 860);
    if (index > 0) assert.ok(timing[index][0] >= timing[index - 1][0] + timing[index - 1][1]);
  }
});

test('ordinary returning visits use only brief Namaste and finish within 1.5 seconds after paint', () => {
  for (const compact of [false, true]) {
    const page = preview({ returning: true, compact, handwriting: true });
    assert.equal(page.word.lang, 'ne');
    assert.equal(page.loader.dataset.effects, 'light');
    page.advance(1250); page.advance(220);
    assert.equal(page.root.dataset.loaderDone, 'true');
    assert.equal(page.root.style.overflow, 'auto');
    assert.equal(page.timers.size, 0);
  }
});

test('repeat visits, returning section links and blocked storage show brief Namaste', () => {
  for (const options of [{ returning: true }, { returning: true, hash: '#contact' }, { blockedStorage: true }]) {
    const page = preview(options);
    assert.equal(page.root.classList.contains('loader-running'), true);
    assert.equal(page.word.lang, 'ne');
    assert.equal(page.root.style.overflow, 'hidden');
    page.advance(1250); page.advance(220);
    assert.deepEqual(page.emitted, ['loader:done']);
    assert.equal(page.root.style.overflow, 'auto');
  }
});

test('ordinary back/forward restoration shows brief Namaste and releases scrolling', () => {
  const page = preview({ returning: true, handwriting: true });
  page.advance(1250); page.advance(220);
  page.window.dispatch('pageshow', { persisted: true });
  page.advance(0); page.advance(0);
  assert.equal(page.root.classList.contains('loader-running'), true);
  assert.equal(page.word.lang, 'ne');
  page.advance(1250); page.advance(220);
  assert.equal(page.root.classList.contains('loader-running'), false);
  assert.equal(page.root.style.overflow, 'auto');
  assert.equal(page.timers.size, 0);
});

test('Namaste draws the visible ink directly without a font reveal or finishing overlay', () => {
  const svg = readFileSync(new URL('../loader/files/namaste.svg', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../loader/files/loader.css', import.meta.url), 'utf8');
  assert.doesNotMatch(svg, /<clipPath\b|<mask\b|ld-write-finish|clip-path=/i);
  assert.match(svg, /<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">/);
  const strokes = [...svg.matchAll(/<path\b([^>]+)\/>/g)];
  for (const [, attributes] of strokes) {
    assert.match(attributes, /class="ld-write-stroke"/);
    assert.match(attributes, /pathLength="1"/);
    assert.match(attributes, /d="M[^M]*[CQ][^M]*"/);
  }
  assert.match(css, /var\(--pen-easing, cubic-bezier/);
  assert.doesNotMatch(css, /ld-write-finish|ld-ink-finish/);
});
