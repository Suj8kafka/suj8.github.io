import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/main.js', import.meta.url), 'utf8');

function page() {
  const documentListeners = new Map(), frames = new Map();
  let nextFrame = 0;
  let document;
  function element() {
    const listeners = new Map(), classes = new Set(), attributes = new Map();
    return {
      dataset: {}, hidden: false, textContent: '', innerHTML: '',
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      addEventListener(name, callback) {
        const callbacks = listeners.get(name) || [];
        callbacks.push(callback); listeners.set(name, callbacks);
      },
      fire(name, event = {}) { for (const callback of listeners.get(name) || []) callback(event); },
      setAttribute: (name, value) => attributes.set(name, value),
      getAttribute: name => attributes.get(name),
      getClientRects: () => [{}],
      focus() { document.activeElement = this; }
    };
  }
  const modal = element(), dialog = element(), close = element(), card = element(), secondCard = element(), background = element();
  card.dataset.skill = 'research';
  secondCard.dataset.skill = 'design';
  let controls = [close];
  dialog.querySelectorAll = () => controls;
  dialog.contains = target => target === dialog || controls.includes(target);
  const selectors = new Map([
    ['.skill-modal', modal], ['.skill-dialog', dialog], ['.skill-dialog-close', close],
    ['.skill-dialog-visual', element()], ['.skill-dialog-description', element()], ['.skill-stack', element()]
  ]);
  const ids = new Map(['skill-dialog-category', 'skill-dialog-title', 'year'].map(id => [id, element()]));
  document = {
    documentElement: element(), body: element(), activeElement: card,
    querySelector: selector => selectors.get(selector),
    querySelectorAll: selector => selector === '.skill-card-trigger' ? [card, secondCard] : [],
    getElementById: id => ids.get(id),
    addEventListener(name, callback) {
      const callbacks = documentListeners.get(name) || [];
      callbacks.push(callback); documentListeners.set(name, callbacks);
    }
  };
  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: frame => frames.delete(frame)
  };
  vm.runInNewContext(source, { document, window, localStorage: { getItem() {}, setItem() {} } });
  function key(key, shiftKey = false) {
    const event = { key, shiftKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const callback of documentListeners.get('keydown') || []) callback(event);
    return event;
  }
  return { document, modal, dialog, close, card, secondCard, background, frames, element, key,
    open: (opener = card) => opener.fire('click'), controls: next => { controls = next; },
    paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); } };
}

test('opening a skill dialog focuses its close button after two frames and contains both Tab directions', () => {
  const view = page(); view.open();
  assert.equal(view.document.activeElement, view.card);
  view.paint();
  assert.equal(view.document.activeElement, view.card);
  view.paint();
  assert.equal(view.document.activeElement, view.close);
  assert.equal(view.modal.getAttribute('aria-hidden'), 'false');
  for (const shift of [false, true]) {
    assert.equal(view.key('Tab', shift).defaultPrevented, true);
    assert.equal(view.document.activeElement, view.close);
  }
});

test('Escape restores the opener without a pending frame stealing focus after closing', () => {
  const view = page(); view.open();
  assert.equal(view.frames.size, 1);
  assert.equal(view.key('Escape').defaultPrevented, true);
  assert.equal(view.modal.getAttribute('aria-hidden'), 'true');
  assert.equal(view.document.activeElement, view.card);
  assert.equal(view.frames.size, 0);
  view.paint();
  assert.equal(view.document.activeElement, view.card);
  assert.equal(view.key('Tab').defaultPrevented, false);
});

test('rapid reopening cancels the previous focus frame and restores the latest opener', () => {
  const view = page(); view.open(); view.open(view.secondCard);
  assert.equal(view.frames.size, 1);
  view.paint(); view.paint();
  assert.equal(view.document.activeElement, view.close);
  view.key('Escape');
  assert.equal(view.document.activeElement, view.secondCard);
});

test('closing between the two frames cancels the remaining focus request', () => {
  const view = page(); view.open(); view.paint();
  assert.equal(view.frames.size, 1);
  view.key('Escape');
  assert.equal(view.frames.size, 0);
  view.paint();
  assert.equal(view.document.activeElement, view.card);
});

test('Tab wraps multiple dialog controls and recovers focus that has moved behind the modal', () => {
  const view = page(), extra = view.element();
  view.controls([view.close, extra]); view.open(); view.paint(); view.paint();
  assert.equal(view.key('Tab').defaultPrevented, false, 'Browser handles ordinary movement inside the dialog');
  extra.focus();
  assert.equal(view.key('Tab').defaultPrevented, true);
  assert.equal(view.document.activeElement, view.close);
  assert.equal(view.key('Tab', true).defaultPrevented, true);
  assert.equal(view.document.activeElement, extra);
  for (const shift of [false, true]) {
    view.background.focus();
    assert.equal(view.key('Tab', shift).defaultPrevented, true);
    assert.equal(view.document.activeElement, shift ? extra : view.close);
  }
});

test('a dialog without visible controls keeps keyboard focus on the dialog itself', () => {
  const view = page(); view.open(); view.controls([]);
  assert.equal(view.key('Tab').defaultPrevented, true);
  assert.equal(view.document.activeElement, view.dialog);
});
