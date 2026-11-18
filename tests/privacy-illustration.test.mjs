import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivacyIllustration } from '../assets/js/privacy-illustration.js';

function target() {
  const listeners = new Map();
  return {
    hidden: false, dataset: {}, attributes: {}, textContent: '',
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    dispatch(name, event = {}) { listeners.get(name)?.(event); },
    setAttribute(name, value) { this.attributes[name] = value; },
    listeners
  };
}

test('runs only while visible and supports pause, resume and cleanup', () => {
  const illustration = target();
  const toggle = target();
  const document = { ...target(), hidden: false,
    querySelector(selector) { return selector.includes('toggle') ? toggle : illustration; } };
  const media = { ...target(), matches: false };
  let observer;
  const window = { ...target(), navigator: { hardwareConcurrency: 8, deviceMemory: 8 },
    matchMedia: () => media,
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observer = this; }
      observe() {}
      disconnect() { this.disconnected = true; }
    } };
  const controller = createPrivacyIllustration({ document, window });
  assert.equal(illustration.dataset.illustrationRunning, 'false');
  observer.callback([{ isIntersecting: true }]);
  assert.equal(illustration.dataset.illustrationRunning, 'true');
  toggle.dispatch('click');
  assert.equal(illustration.dataset.illustrationRunning, 'false');
  assert.equal(toggle.textContent, 'Play animation');
  toggle.dispatch('click');
  assert.equal(illustration.dataset.illustrationRunning, 'true');
  controller.destroy();
  assert.equal(observer.disconnected, true);
  assert.equal(toggle.listeners.size, 0);
  assert.equal('illustrationRunning' in illustration.dataset, false);
});

test('keeps the illustration static for reduced motion and constrained devices', () => {
  for (const settings of [{ reduced: true }, { saveData: true }]) {
    const illustration = target();
    const toggle = target();
    const document = { ...target(), hidden: false,
      querySelector(selector) { return selector.includes('toggle') ? toggle : illustration; } };
    const media = { ...target(), matches: Boolean(settings.reduced) };
    const window = { ...target(), navigator: { connection: { saveData: Boolean(settings.saveData) } },
      matchMedia: () => media };
    const controller = createPrivacyIllustration({ document, window });
    assert.equal(illustration.dataset.illustrationRunning, 'false');
    assert.equal(toggle.hidden, true);
    controller.destroy();
  }
});
