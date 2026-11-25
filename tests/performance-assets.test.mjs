import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const html = read('index.html').toString();
const blogHtml = read('blog/index.html').toString();
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));

test('selected-work imagery offers smaller responsive WebP sources without changing aspect ratios', () => {
  const source = html.match(/<source srcset="assets\/images\/selected-work\/aama-cure-home-640[\s\S]*?>/)[0];
  for (const width of [640, 960, 1280]) {
    assert.match(source, new RegExp(`aama-cure-home-${width}\\.webp\\?v=[a-f0-9]+ ${width}w`));
    const bytes = read(`assets/images/selected-work/aama-cure-home-${width}.webp`);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length < read('assets/images/selected-work/aama-cure-home.webp').length);
  }
  assert.match(source, /sizes="\(max-width: 800px\)/);
  assert.match(html, /<source srcset="assets\/images\/selected-work\/nakka-screen-96\.webp\?v=/);
  assert.ok(read('assets/images/selected-work/nakka-screen-0-compact.webp').length
    < read('assets/images/selected-work/nakka-screen-0.webp').length * .7);
});

test('small project previews and WALL-E use appropriately sized variants', () => {
  const wallE = attributes(html.match(/<img\b[^>]*wall-e-270\.webp[^>]*>/)[0]);
  assert.equal(wallE.fetchpriority, 'low');
  assert.equal(wallE.decoding, 'async');
  assert.ok(read('assets/images/wall-e-270.webp').length < read('assets/images/WallE.png').length * .1);
  assert.ok(read('assets/images/selected-work/nakka-screen-96.webp').length < 8000);
  assert.match(html, /nakka-screen-96\.webp\?v=[a-f0-9]+ 96w[^>]*sizes="44px"/);
  const esewa = attributes(html.match(/<img\b[^>]*src="assets\/images\/selected-work\/esewa-redesign\.webp[^>]*>/)[0]);
  assert.match(esewa.srcset, /esewa-redesign-240\.webp\?v=[a-f0-9]+ 240w/);
  assert.match(esewa.srcset, /esewa-redesign-400\.webp\?v=[a-f0-9]+ 400w/);
  assert.ok(esewa.sizes);
  assert.equal(esewa.loading, 'lazy');
});

test('homepage uses one deferred app bundle and no eager tracking modules', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*\bsrc="([^"]+)"[^>]*)>/g)];
  assert.equal(scripts.filter(([, , src]) => src.includes('portfolio.bundle.js')).length, 1);
  assert.equal(scripts.some(([, , src]) => /usage-tracker|visitor-panel|googletagmanager/.test(src)), false);
  for (const [, attributes] of scripts) assert.match(attributes, /type="module"|\bdefer\b/);
  const paths = scripts.map(([, , src]) => src.split('?')[0]);
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(html.match(/data-styles-href="\/?([^"]+)"/)[1], html.match(/data-href="([^"]+)"/)[1]);
});

test('notebook cards use compact thumbnails while archival originals remain available', () => {
  const names = ['carrom-karrom', 'bus-reservation-system', 'nakka', '2048', 'connectum', 'nepali-festive-counter'];
  for (const name of names) {
    const path = `assets/images/blog/${name}-icon-192.png`;
    const bytes = read(path);
    const version = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    assert.ok(bytes.length < 100000, `${path} should stay below 100 KB`);
    assert.match(blogHtml, new RegExp(`${name}-icon-192\\.png\\?v=${version}`));
  }
  assert.equal([...blogHtml.matchAll(/-icon-192\.png\?v=/g)].length, names.length);
  assert.equal([...blogHtml.matchAll(/-icon-192\.png\?v=[^"\s]+" width="192" height="192"/g)].length, names.length);
});

test('public image and font cache versions match their file contents', () => {
  for (const source of [html, read('assets/css/site.css').toString(), read('assets/css/secondary-fonts.css').toString()]) {
    for (const [url, path, version] of source.matchAll(/((?:assets\/(?:images|fonts)\/|\.\.\/fonts\/)[\w./% -]+?\.(?:webp|png|jpe?g|svg|woff2|ttf))\?v=([a-f0-9]{12})/g)) {
      const local = decodeURIComponent(path.replace(/^\.\.\/fonts\//, 'assets/fonts/'));
      assert.equal(version, createHash('sha256').update(read(local)).digest('hex').slice(0, 12), url);
    }
  }
});

test('hero uses one responsive image preload matching its eagerly discoverable WebP image', () => {
  const preloads = [...html.matchAll(/<link\b[^>]*\bas="image"[^>]*>/g)];
  assert.equal(preloads.length, 1);
  const preload = attributes(preloads[0][0]);
  const image = attributes(html.match(/<img\b[^>]*class="portrait-base"[^>]*>/)[0]);
  assert.equal(preload.imagesrcset, image.srcset);
  assert.equal(preload.imagesizes, image.sizes);
  assert.equal(preload.href, image.src);
  assert.equal(image.loading, 'eager');
  assert.equal(image.fetchpriority, 'high');
  assert.equal(image.width, '1145'); assert.equal(image.height, '1527');
  const vector = read('assets/images/sujeet-hero- vector2.svg');
  for (const [width, budget] of [[440, 40000], [640, 40000], [880, 80000]]) {
    const bytes = read(`assets/images/sujeet-hero-${width}.webp`);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length < budget && bytes.length < vector.length * .15, 'A mobile fallback must remain substantially smaller than the vector');
  }
});

test('only the headline font is preloaded and welcome CSS needs no extra request', () => {
  const fonts = [...html.matchAll(/<link\b[^>]*\bas="font"[^>]*>/g)];
  assert.equal(fonts.length, 1);
  assert.match(fonts[0][0], /Product%20Sans%20Bold\.ttf/);
  assert.equal(attributes(fonts[0][0]).type, 'font/ttf');
  assert.doesNotMatch(html, /<link\b[^>]*href="loader\/files\/loader\.css/);
  const css = read('assets/css/site.css').toString();
  assert.match(css, /#loader\s*\{\s*display:\s*none/);
  const secondary = read('assets/css/secondary-fonts.css').toString();
  const faces = [...secondary.matchAll(/@font-face\s*\{([^}]+)\}/g)];
  assert.equal(faces.length, 3);
  faces.forEach(face => assert.match(face[1], /font-display:\s*optional/));
  const video = attributes(html.match(/<video\b[^>]*id="introVid"[^>]*>/)[0]);
  assert.equal(video.loading, 'lazy'); assert.equal(video.preload, 'none');
});

test('critical HTML leaves optional libraries to the scheduler and uses valid locally hosted fonts', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(match => match[1]);
  assert.ok(scripts.some(src => src.startsWith('assets/js/enhancements.js')));
  assert.equal(scripts.some(src => /gsap|ScrollTrigger|portrait-network|firebase-presence|availability-client|\/motion\.js/.test(src)), false);
  assert.equal(html.includes('fonts.googleapis.com'), false);
  for (const file of ['dm-mono-400-latin.woff2', 'dm-mono-500-latin.woff2', 'dm-sans-latin.woff2', 'space-grotesk-latin.woff2']) {
    assert.equal(read(`assets/fonts/${file}`).toString('ascii', 0, 4), 'wOF2');
  }
  for (const file of ['Product Sans Regular.ttf', 'Product Sans Bold.ttf']) assert.equal(read(`assets/fonts/${file}`).readUInt32BE(0), 0x00010000, 'Valid supplied TrueType font');
  for (const family of ['DM-Mono', 'DM-Sans', 'Space-Grotesk']) assert.match(read(`assets/fonts/${family}-OFL.txt`).toString(), /SIL OPEN FONT LICENSE/i);
});
