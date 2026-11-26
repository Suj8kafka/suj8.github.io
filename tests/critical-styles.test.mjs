import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criticalStyles, inlineStyles } from '../scripts/build-critical-styles.mjs';
import { activatePageStyles } from '../assets/js/page-styles.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/site.css', import.meta.url), 'utf8');
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };

test('critical CSS compaction preserves quoted values, descendant selectors and calc operators', () => {
  const generated = criticalStyles('.hero :focus-visible { content: "a ; b, \\"quoted\\""; width: calc(100% - 2px); color: var(--ink); }');
  assert.ok(generated.includes('.hero :focus-visible{'));
  assert.ok(generated.includes('content:"a ; b, \\"quoted\\"";'));
  assert.ok(generated.includes('width:calc(100% - 2px);'));
});

test('generated first-screen CSS is synchronized, bounded and loads only the headline font', () => {
  const generated = criticalStyles(css);
  assert.equal(html.match(/<style id="critical-styles">\n([\s\S]*?)<\/style>/)[1], generated);
  assert.ok(Buffer.byteLength(generated) < 16500);
  assert.equal([...generated.matchAll(/@font-face/g)].length, 1);
  assert.match(generated, /assets\/fonts\/Product%20Sans%20Bold\.ttf/);
  assert.doesNotMatch(generated, /src: url\("\.\.\/fonts/);
  assert.match(html, /<link id="page-styles"[^>]*media="print"/);
  const deferred = html.match(/<link id="page-styles"[^>]*>/)[0];
  assert.doesNotMatch(deferred, /\shref=/);
  assert.match(deferred, /\sdata-href="assets\/css\/site\.min\.css/);
  assert.match(html, /<noscript><link rel="stylesheet" href="assets\/css\/site\.min\.css/);
  assert.match(generated, /\.hero\s*\{/);
  assert.match(generated, /max-width:\s*800px/);
  assert.match(generated, /html\[data-page-transitions="pending"\]/);
  assert.match(generated, /html\.loader-running\[data-page-styles="pending"\] main > section:not\(\.hero\)/,
    'Offscreen layout containment must be temporary and leave no-JavaScript pages alone');
});

test('decorative notes and landscape keep their final positioning before deferred CSS arrives', () => {
  const generated = criticalStyles(css);
  assert.match(generated, /\.art-note\{position:absolute/);
  assert.match(generated, /\.note-one\{top:-20px;right:21px\}/);
  assert.match(generated, /\.note-two\{bottom:39px;left:-24px/);
  assert.match(generated, /\.hero-landscape\{[^}]*position:absolute[^}]*width:100%;height:100%/);
  assert.match(generated, /\.hero-landscape-layer\{position:absolute/);
});

test('preference and assistant CSS is synchronized inline and makes no blocking stylesheet requests', () => {
  for (const name of ['display-preferences', 'portfolio-assistant']) {
    const source = readFileSync(new URL(`../assets/css/${name}.css`, import.meta.url), 'utf8');
    const embedded = html.match(new RegExp(`<style id="${name}-styles">\\n([\\s\\S]*?)<\\/style>`))[1];
    assert.equal(embedded, inlineStyles(source));
    assert.ok(html.indexOf(`id="${name}-styles"`) < html.indexOf('</head>'));
    assert.doesNotMatch(html, new RegExp(`<link[^>]+${name}\\.css`));
  }
});

function preview({ loaded = true, decode = 'ready', hash = '', compact = false, checkLayoutReads = false, reading = false } = {}) {
  const events = new Map(), frames = new Map(), timers = new Map(), emitted = [];
  let nextId = 0, finishDecode;
  const pending = new Promise(resolve => { finishDecode = resolve; });
  const sheet = { sheet: loaded ? {} : null, media: 'print', dataset: { href: 'assets/css/site.css' },
    addEventListener(name, callback) { events.set(name, callback); }
  };
  if (reading) { sheet.href = 'assets/css/site.min.css'; sheet.media = 'all'; }
  const links = [], scrolling = new Map();
  const document = { documentElement: { dataset: { pageStyles: 'pending' } },
    getElementById: id => (reading ? id === 'reading-styles' : id === 'page-styles') ? sheet : links.find(link => link.id === id),
    createElement: () => ({}), head: { append: link => links.push(link) },
    addEventListener: (name, callback) => scrolling.set(`document:${name}`, callback),
    removeEventListener: name => scrolling.delete(`document:${name}`),
    querySelector: () => ({ decode: () => decode === 'pending' ? pending : decode === 'failed' ? Promise.reject(new Error('Broken image')) : Promise.resolve() }),
    dispatchEvent: event => emitted.push(event.type)
  };
  const window = { location: { hash }, CustomEvent: class { constructor(type) { this.type = type; } },
    matchMedia: () => ({ matches: compact }),
    setTimeout(callback) { const id = ++nextId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    get scrollY() {
      assert.equal(checkLayoutReads, false, 'Stylesheet startup and activation must not query scroll geometry');
      return 0;
    },
    addEventListener: (name, callback) => scrolling.set(name, callback),
    removeEventListener: name => scrolling.delete(name),
    requestAnimationFrame(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  const ready = activatePageStyles({ document, window });
  return { document, sheet, frames, timers, emitted, ready, finishDecode, links, scroll: () => scrolling.get('scroll')?.({ type: 'scroll' }),
    expireImageBudget() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); },
    loaded() { events.get('load')?.(); },
    paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); }
  };
}

test('full styling waits for a decoded portrait and two paint opportunities', async () => {
  const page = preview(); await flush();
  assert.equal(page.sheet.media, 'print');
  page.paint(); assert.equal(page.sheet.media, 'print');
  page.paint(); await page.ready;
  assert.equal(page.sheet.media, 'all');
  assert.equal(page.document.documentElement.dataset.pageStyles, 'ready');
  assert.deepEqual(page.emitted, ['page-styles:ready']);
});

test('saved reading layout reuses the early stylesheet instead of loading a duplicate', async () => {
  const page = preview({ reading: true }); await flush();
  page.paint(); page.paint(); await page.ready;
  assert.equal(page.sheet.href, 'assets/css/site.min.css');
  assert.equal(page.document.documentElement.dataset.pageStyles, 'ready');
  assert.equal(page.sheet.media, 'all');
});

test('initial stylesheet activation settles before enabling colour and layout transitions', async () => {
  const page = preview();
  page.document.documentElement.dataset.pageTransitions = 'pending';
  await flush(); page.paint(); page.paint(); await page.ready;
  assert.equal(page.document.documentElement.dataset.pageTransitions, 'pending');
  page.paint();
  assert.equal(page.document.documentElement.dataset.pageTransitions, 'pending');
  page.paint();
  assert.equal(page.document.documentElement.dataset.pageTransitions, 'ready');
});

test('stylesheet startup and activation never query scroll geometry', async () => {
  const page = preview({ compact: true, checkLayoutReads: true });
  await flush(); page.paint(); page.paint(); await page.ready;
  assert.equal(page.sheet.media, 'all');
  const direct = preview({ compact: true, hash: '#contact', loaded: false, checkLayoutReads: true });
  direct.loaded(); await direct.ready;
  assert.equal(direct.sheet.media, 'all');
});

test('restored-position scroll events activate layout before the portrait decodes', async () => {
  const page = preview({ compact: true, loaded: false, decode: 'pending', checkLayoutReads: true });
  page.scroll();
  assert.equal(page.sheet.media, 'all');
  page.loaded(); await page.ready;
  assert.equal(page.links[0].href, 'assets/css/secondary-fonts.css');
});

test('phone secondary fonts wait for scroll; desktop and direct links keep their full font families', async () => {
  const phone = preview({ compact: true }); await flush(); phone.paint(); phone.paint(); await phone.ready;
  assert.equal(phone.links.length, 0);
  phone.scroll(); phone.scroll(); assert.equal(phone.links.length, 1);
  assert.equal(phone.links[0].href, 'assets/css/secondary-fonts.css');
  const desktop = preview(); await flush(); desktop.paint(); desktop.paint(); await desktop.ready;
  assert.equal(desktop.links.length, 1);
});

test('late stylesheet/image completion and a broken portrait do not leave the page unstyled', async () => {
  const page = preview({ loaded: false, decode: 'pending' });
  await flush(); assert.equal(page.frames.size, 0);
  assert.equal(page.sheet.href, undefined, 'Do not compete with a still-decoding hero');
  page.finishDecode(); await flush(); assert.equal(page.frames.size, 0);
  page.loaded(); await flush(); page.paint(); page.paint(); await page.ready;
  assert.equal(page.sheet.media, 'all');
  const broken = preview({ decode: 'failed' }); await flush();
  broken.paint(); broken.paint(); await broken.ready; assert.equal(broken.sheet.media, 'all');
});

test('reader interaction prioritizes full styling even when the portrait is slow', async () => {
  const page = preview({ loaded: false, decode: 'pending' });
  page.scroll();
  assert.equal(page.sheet.href, 'assets/css/site.css');
  assert.equal(page.sheet.media, 'all');
  page.loaded(); await page.ready;
  assert.equal(page.document.documentElement.dataset.pageStyles, 'ready');
});

test('direct section links activate full layout immediately, including with slow portrait decoding', async () => {
  const page = preview({ loaded: false, decode: 'pending', hash: '#contact' });
  assert.equal(page.sheet.media, 'all');
  assert.equal(page.frames.size, 0);
  page.loaded(); await page.ready;
  assert.deepEqual(page.emitted, ['page-styles:ready']);
});

test('a stalled portrait cannot indefinitely delay full styling; late decode is harmless', async () => {
  const page = preview({ loaded: false, decode: 'pending' });
  await flush();
  assert.equal(page.sheet.href, undefined);
  page.expireImageBudget(); await flush();
  assert.equal(page.sheet.href, 'assets/css/site.css');
  page.loaded(); await flush(); page.paint(); page.paint(); await page.ready;
  assert.equal(page.document.documentElement.dataset.pageStyles, 'ready');
  assert.equal(page.timers.size, 0);
  page.finishDecode(); await flush(); page.paint(); page.paint();
  assert.deepEqual(page.emitted, ['page-styles:ready']);
});

test('suspended painting cannot hold back a loaded stylesheet', async () => {
  const page = preview(); await flush();
  assert.equal(page.sheet.media, 'print');
  page.expireImageBudget(); await page.ready;
  assert.equal(page.sheet.media, 'all');
  assert.equal(page.document.documentElement.dataset.pageStyles, 'ready');
  assert.equal(page.timers.size, 0);
  page.paint(); page.paint();
  assert.deepEqual(page.emitted, ['page-styles:ready']);
});
