import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { monochromeFill, portraitWave, createPortraitNetwork } from '../assets/js/portrait-network.js';

test('the supplied vector2 portrait contains its original painted paths, without an embedded photo', () => {
  const svg = readFileSync(new URL('../assets/images/sujeet-hero-%20vector2.svg', import.meta.url), 'utf8');
  assert.match(svg, /viewBox="0 0 1145 1527"/);
  assert.ok((svg.match(/<path\b/g) || []).length > 1000);
  assert.doesNotMatch(svg, /<image\b|data:image|<script\b|\son\w+=/i);
  for (const [, fill] of svg.matchAll(/<path\b[^>]*\bfill="([^"]+)"/g)) {
    assert.ok(monochromeFill(fill), `The original color ${fill} can transition to monochrome`);
  }
});

test('monochrome keeps each shape luminance and accepts only supported solid colors', () => {
  assert.equal(monochromeFill('#808080'), 'rgb(128, 128, 128)');
  assert.equal(monochromeFill('#f00'), 'rgb(54, 54, 54)');
  assert.equal(monochromeFill('#00ff00'), 'rgb(182, 182, 182)');
  assert.equal(monochromeFill('#FFFFFF'), 'rgb(255, 255, 255)');
  for (const value of [null, '', 'none', 'url(https://example.test)', '#invalid']) assert.equal(monochromeFill(value), null);
});

const viewBox = { x: 0, y: 0, width: 1145, height: 1527 };
const parts = Array.from({ length: 1643 }, (_, index) => ({
  x: (index % 41) / 40 * viewBox.width, y: Math.floor(index / 41) / 40 * viewBox.height, width: 8, height: 8
}));

test('the slower color wave outlines each part before filling and finishes within two seconds', () => {
  const wave = portraitWave(parts, { x: 0, y: 0 }, viewBox);
  assert.equal(wave.length, parts.length);
  assert.ok(wave[0].delay < wave.at(-1).delay);
  assert.ok(new Set(wave.map(part => part.delay)).size > 100, 'Detailed staggering across the artwork');
  for (const part of wave) {
    assert.ok(Number.isFinite(part.delay) && part.delay >= 0);
    assert.ok(part.duration >= 600 && part.delay + part.fillLead + part.duration <= 2000);
    assert.ok(part.fillLead >= 100, 'Puzzle outlines start before the color fill');
    assert.ok(part.outlineDuration >= part.fillLead + part.duration);
    assert.ok(part.delay + part.outlineDuration <= 2000);
  }
  const reverse = portraitWave(parts, { x: viewBox.width, y: viewBox.height }, viewBox);
  assert.ok(reverse.at(-1).delay < reverse[0].delay, 'Entering from another edge reverses the wave');
});

test('large backgrounds tint slowly and out-of-frame hover positions are clamped', () => {
  const background = { x: 572.5, y: 763.5, width: viewBox.width, height: viewBox.height };
  const wave = portraitWave([background, ...parts], { x: 0, y: 0 }, viewBox);
  assert.ok(wave[0].delay > 0 && wave[0].duration >= 1400, 'Large wall colors do not flash on immediately');
  assert.deepEqual(portraitWave(parts, { x: -100, y: -100 }, viewBox), portraitWave(parts, { x: 0, y: 0 }, viewBox));
  assert.deepEqual(portraitWave([], { x: 0, y: 0 }, viewBox), []);
});

function pendingPortrait(fetch, vectorSrc) {
  const control = { hidden: true }, mount = { append() { throw new Error('Fallback must not insert an SVG'); } };
  const image = { src: 'https://portfolio.test/assets/images/sujeet-hero-440.webp' };
  const frame = { dataset: vectorSrc ? { vectorSrc } : {}, querySelector: selector => ({ '.portrait-vector-mount': mount,
    '.portrait-base': image, '.portrait-reveal-control': control })[selector] };
  const controller = createPortraitNetwork({ document: { querySelector: () => frame },
    window: { AbortController, fetch, matchMedia: () => ({ matches: false }) } });
  return { frame, control, controller };
}

test('a failed inline request retains the regular SVG image and hides the inactive control', async context => {
  context.mock.method(console, 'warn', () => {});
  const page = pendingPortrait(async () => ({ ok: false, status: 404 }));
  await page.controller.ready;
  assert.equal(page.control.hidden, true);
  assert.equal(page.frame.dataset.vectorReady, undefined);
});

test('desktop enhancement fetches the explicit vector source rather than parsing the raster fallback', async context => {
  context.mock.method(console, 'warn', () => {});
  let requested;
  const source = 'assets/images/sujeet-hero-%20vector2.svg';
  const page = pendingPortrait(async url => { requested = url; return { ok: false, status: 404 }; }, source);
  await page.controller.ready;
  assert.equal(requested, source);
  assert.equal(page.control.hidden, true);
});

test('destroying a pending portrait aborts loading and cannot insert late artwork', async () => {
  let resolve, signal;
  const page = pendingPortrait((url, options) => {
    signal = options.signal;
    return new Promise(done => { resolve = done; });
  });
  page.controller.destroy();
  assert.equal(signal.aborted, true);
  resolve({ ok: true, text: async () => '<svg />' });
  await page.controller.ready;
  assert.equal(page.control.hidden, true);
  assert.equal(page.frame.dataset.vectorReady, undefined);
});
