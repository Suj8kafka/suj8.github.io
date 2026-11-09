import test from 'node:test';
import assert from 'node:assert/strict';
import { createPortfolioMotion } from '../assets/js/motion.js';

function preview({ loader = false, reduced = false, missing = false } = {}) {
  const target = () => {
    const listeners = new Map(), classes = new Set();
    return { dataset: {}, classList: { contains: value => classes.has(value), add: value => classes.add(value), remove: value => classes.delete(value) },
      addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
      removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
      dispatch(name) { listeners.get(name)?.forEach(callback => callback()); } };
  };
  const root = target(), item = target();
  if (loader) root.classList.add('loader-running');
  const document = Object.assign(target(), { documentElement: root, hidden: false, querySelector: () => null, querySelectorAll: () => [] });
  const window = Object.assign(target(), { navigator: {}, scrollY: 0, innerHeight: 900 });
  let registrations = 0, reverted = false;
  let cleanup;
  const noReveal = () => assert.fail('Already painted content must never be hidden for an entrance');
  const gsap = { from: noReveal, timeline: noReveal,
    context(callback) { callback(); return { revert() {} }; },
    registerPlugin() { registrations++; }, matchMedia() { return {
    add(queries, callback) { cleanup = callback({ conditions: { reduced, compact: true, fine: false } }); },
    revert() { cleanup?.(); reverted = true; }
  }; } };
  const controller = createPortfolioMotion({ document, window, gsap: missing ? null : gsap, ScrollTrigger: missing ? null : { batch: noReveal } });
  return { document, window, root, item, controller, registrations: () => registrations, reverted: () => reverted };
}

test('motion waits for the loader, starts once, and releases its lifecycle listeners', () => {
  const page = preview({ loader: true });
  assert.equal(page.registrations(), 0, 'No GSAP effects behind the loader');
  page.window.dispatch('load'); assert.equal(page.registrations(), 0);
  page.root.classList.remove('loader-running'); page.document.dispatch('loader:done');
  assert.equal(page.registrations(), 1);
  page.document.dispatch('loader:done'); page.window.dispatch('load');
  assert.equal(page.registrations(), 1);
  page.controller.destroy(); assert.equal(page.reverted(), true);
  page.document.dispatch('loader:done'); assert.equal(page.root.dataset.motionEngine, undefined);
});

test('reduced motion keeps sections visible without constructing hero or depth tweens', () => {
  const page = preview({ reduced: true });
  assert.equal(page.root.dataset.motionEngine, 'static');
  assert.equal(page.root.dataset.heroMotion, undefined);
  assert.equal(page.item.classList.contains('is-motion-revealing'), false);
  page.controller.destroy(); assert.equal(page.reverted(), true);
});

test('normal motion never constructs hero fades or section reveal batches after loader completion or tab return', () => {
  const page = preview({ loader: true });
  page.root.classList.remove('loader-running');
  page.document.dispatch('loader:done');
  assert.equal(page.root.dataset.motionEngine, 'gsap');
  assert.equal(page.root.dataset.heroMotion, undefined);
  page.document.hidden = true; page.document.dispatch('visibilitychange');
  page.document.hidden = false; page.document.dispatch('visibilitychange');
  assert.equal(page.registrations(), 1);
  page.controller.destroy();
});

test('missing GSAP or ScrollTrigger leaves the page static and readable', () => {
  const page = preview({ missing: true });
  assert.equal(page.root.dataset.motionEngine, 'static');
  assert.equal(page.item.classList.contains('is-motion-revealing'), false);
  assert.equal(page.registrations(), 0);
  page.controller.destroy(); page.window.dispatch('load');
  assert.equal(page.root.dataset.motionEngine, undefined);
});
