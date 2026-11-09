import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const html = read('index.html').toString();
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
  assert.match(html, /<source srcset="assets\/images\/selected-work\/nakka-screen-0-compact\.webp\?v=/);
  assert.ok(read('assets/images/selected-work/nakka-screen-0-compact.webp').length
    < read('assets/images/selected-work/nakka-screen-0.webp').length * .7);
});

test('public image and font cache versions match their file contents', () => {
  for (const source of [html, read('assets/css/site.css').toString(), read('assets/css/secondary-fonts.css').toString()]) {
    for (const [url, path, version] of source.matchAll(/((?:assets\/(?:images|fonts)\/|\.\.\/fonts\/)[\w./% -]+?\.(?:webp|png|jpe?g|svg|woff2))\?v=([a-f0-9]{12})/g)) {
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

test('only the headline font is preloaded and normal visits never request welcome CSS', () => {
  const fonts = [...html.matchAll(/<link\b[^>]*\bas="font"[^>]*>/g)];
  assert.equal(fonts.length, 1);
  assert.match(fonts[0][0], /space-grotesk-latin\.woff2/);
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
  for (const family of ['DM-Mono', 'DM-Sans', 'Space-Grotesk']) assert.match(read(`assets/fonts/${family}-OFL.txt`).toString(), /SIL OPEN FONT LICENSE/i);
});
