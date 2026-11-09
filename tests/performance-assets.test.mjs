import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const html = read('index.html').toString();
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));

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
  for (const [width, budget] of [[440, 40000], [880, 80000]]) {
    const bytes = read(`assets/images/sujeet-hero-${width}.webp`);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length < budget && bytes.length < vector.length * .15, 'A mobile fallback must remain substantially smaller than the vector');
  }
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
