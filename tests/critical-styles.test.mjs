import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criticalStyles } from '../scripts/build-critical-styles.mjs';
import { activatePageStyles } from '../assets/js/page-styles.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/site.css', import.meta.url), 'utf8');
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve(); };

test('generated first-screen CSS is synchronized, bounded and loads only the headline font', () => {
  const generated = criticalStyles(css);
  assert.equal(html.match(/<style id="critical-styles">\n([\s\S]*?)<\/style>/)[1], generated);
  assert.ok(Buffer.byteLength(generated) < 16000);
  assert.equal([...generated.matchAll(/@font-face/g)].length, 1);
  assert.match(generated, /assets\/fonts\/space-grotesk-latin\.woff2/);
  assert.doesNotMatch(generated, /src: url\("\.\.\/fonts/);
  assert.match(html, /<link id="page-styles"[^>]*media="print"/);
  const deferred = html.match(/<link id="page-styles"[^>]*>/)[0];
  assert.doesNotMatch(deferred, /\shref=/);
  assert.match(deferred, /\sdata-href="assets\/css\/site\.css/);
  assert.match(html, /<noscript><link rel="stylesheet" href="assets\/css\/site\.css/);
  assert.match(generated, /\.hero\s*\{/);
  assert.match(generated, /max-width: 800px/);
});

function preview({ loaded = true, decode = 'ready', hash = '', compact = false, checkLayoutReads = false } = {}) {
  const events = new Map(), frames = new Map(), emitted = [];
  let nextId = 0, finishDecode;
  const pending = new Promise(resolve => { finishDecode = resolve; });
  const sheet = { sheet: loaded ? {} : null, media: 'print', dataset: { href: 'assets/css/site.css' },
    addEventListener(name, callback) { events.set(name, callback); }
  };
  const links = [], scrolling = new Map();
  const document = { documentElement: { dataset: { pageStyles: 'pending' } },
    getElementById: id => id === 'page-styles' ? sheet : links.find(link => link.id === id),
    createElement: () => ({}), head: { append: link => links.push(link) },
    addEventListener: (name, callback) => scrolling.set(`document:${name}`, callback),
    removeEventListener: name => scrolling.delete(`document:${name}`),
    querySelector: () => ({ decode: () => decode === 'pending' ? pending : decode === 'failed' ? Promise.reject(new Error('Broken image')) : Promise.resolve() }),
    dispatchEvent: event => emitted.push(event.type)
  };
  const window = { location: { hash }, CustomEvent: class { constructor(type) { this.type = type; } },
    matchMedia: () => ({ matches: compact }),
    get scrollY() {
      assert.equal(checkLayoutReads, false, 'Stylesheet startup and activation must not query scroll geometry');
      return 0;
    },
    addEventListener: (name, callback) => scrolling.set(name, callback),
    removeEventListener: name => scrolling.delete(name),
    requestAnimationFrame(callback) { frames.set(++nextId, callback); }
  };
  const ready = activatePageStyles({ document, window });
  return { document, sheet, frames, emitted, ready, finishDecode, links, scroll: () => scrolling.get('scroll')?.({ type: 'scroll' }),
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
