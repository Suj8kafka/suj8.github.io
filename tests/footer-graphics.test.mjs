import test from 'node:test';
import assert from 'node:assert/strict';
import { createFooterGraphics } from '../assets/js/footer-graphics.js';
import { createInteractionFrame, interactionVariants } from '../assets/js/interaction-studies.js';

test('six distinct studies animate within their responsive surfaces', () => {
  const signatures = new Set();
  for (const variant of interactionVariants) {
    signatures.add(JSON.stringify(createInteractionFrame({ variant })));
    for (const [width, height] of [[280, 134], [398, 178]]) for (const time of [0, 1, 3, 8, 16, 25, 40]) {
      for (const shape of createInteractionFrame({ variant, time, width, height })) {
        assert.ok(shape.opacity >= 0 && shape.opacity <= 1);
        for (const point of shape.points) {
          assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
          assert.ok(point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height, variant + ' fits its surface');
        }
      }
    }
    assert.notDeepEqual(createInteractionFrame({ variant, time: 0 }), createInteractionFrame({ variant, time: 1 }), variant + ' moves');
  }
  assert.equal(signatures.size, 6);
});

function fixture({ contextAvailable = true } = {}) {
  let draws = 0, observerCallback, disconnected = false;
  const frames = new Map(); let nextId = 0;
  const context = { setTransform() {}, clearRect() { draws++; }, beginPath() {}, lineTo() {}, moveTo() {}, closePath() {}, fill() {}, stroke() {} };
  const phase = { currentTime: 0 };
  const elements = interactionVariants.map(variant => ({
    dataset: { studyVariant: variant }, parentElement: { getAnimations: () => [phase] },
    querySelector: () => ({ getContext: () => contextAvailable ? context : null })
  }));
  const box = { clientWidth: 398, clientHeight: 178, querySelectorAll: () => elements };
  const window = { devicePixelRatio: 1,
    requestAnimationFrame(callback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class {
      constructor(callback) { observerCallback = callback; }
      observe(node) { assert.equal(node, box); }
      disconnect() { disconnected = true; }
    }
  };
  const renderer = createFooterGraphics({ document: { querySelector: () => box }, window });
  return { renderer, frames, elements, phase, box,
    draws: () => draws, disconnected: () => disconnected,
    resize() { observerCallback?.(); },
    tick(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); }
  };
}

test('rendering is capped, draws only relevant faces, and stops without a queued frame', () => {
  const f = fixture();
  assert.equal(f.draws(), 6, 'Every face gets a static first frame');
  assert.equal(f.frames.size, 0, 'Static startup schedules no motion');
  f.renderer.setRunning(true); f.tick(0);
  assert.equal(f.draws(), 7, 'Only the visible face animates during a hold');
  f.tick(16); assert.equal(f.draws(), 7, 'Intermediate refreshes avoid repainting');
  f.phase.currentTime = 3000; f.tick(40);
  assert.equal(f.draws(), 9, 'A turn paints the outgoing and incoming faces');
  f.renderer.setRunning(false); assert.equal(f.frames.size, 0);
  const paused = f.draws(); f.tick(1000); assert.equal(f.draws(), paused);
  f.renderer.setRunning(true); assert.equal(f.frames.size, 1);
  f.renderer.destroy(); assert.equal(f.frames.size, 0); assert.equal(f.disconnected(), true);
  assert.ok(f.elements.every(element => !element.dataset.graphicReady), 'Cleanup restores the static SVG fallback');
  f.resize(); assert.equal(f.draws(), paused, 'Late resize callbacks do nothing after cleanup');
});

test('missing canvas and missing markup leave the static artwork untouched', () => {
  const f = fixture({ contextAvailable: false });
  f.renderer.setRunning(true); assert.equal(f.frames.size, 0);
  assert.ok(f.elements.every(element => !element.dataset.graphicReady));
  f.renderer.destroy();
  assert.doesNotThrow(() => createFooterGraphics({ document: { querySelector: () => null }, window: {} }).destroy());
});
