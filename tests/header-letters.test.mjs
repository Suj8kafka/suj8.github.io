import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeaderLetters } from '../assets/js/header-letters.js';

function fixture({ reduced = false, saveData = false, memory = 8, cores = 8 } = {}) {
  const nodes = [], timers = new Map();
  let sequence = 0;
  function node(text = '') {
    const attributes = new Map(), listeners = new Map();
    const value = { children: [], plain: text,
      get textContent() { return this.children.length ? this.children.map(child => child.textContent).join('') : this.plain; },
      set textContent(text) { this.plain = text; this.children = []; },
      replaceChildren(...children) { this.children = children; this.plain = ''; },
      setAttribute: (name, text) => attributes.set(name, text),
      getAttribute: name => attributes.get(name) ?? null,
      removeAttribute: name => attributes.delete(name),
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: name => listeners.delete(name),
      emit: name => listeners.get(name)?.(), listenerCount: () => listeners.size
    };
    nodes.push(value); return value;
  }
  const labels = ['Work', 'About', 'Writing', 'Resume'].map(node);
  const links = ['Work', 'About', 'Writing', 'Resume PDF'].map(node);
  links.at(-1).setAttribute('aria-label', 'Open resume PDF');
  const root = { dataset: { motion: reduced ? 'reduced' : 'full' } };
  const document = { ...node(), hidden: false, createElement: () => node() };
  const media = node();
  const window = { navigator: { connection: { saveData }, deviceMemory: memory, hardwareConcurrency: cores },
    matchMedia: () => media,
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id)
  };
  const nav = { querySelectorAll: () => links };
  const effect = createHeaderLetters({ document, window, root, nav });
  const letters = () => labels.flatMap(label => label.children);
  function tick() { const jobs = [...timers.values()]; timers.clear(); jobs.forEach(job => job.callback()); }
  return { effect, root, document, media, labels, links, timers, tick, letters,
    listeners: () => nodes.reduce((total, value) => total + value.listenerCount(), 0) };
}

test('letters scramble individually while natural text and accessible link names remain stable', () => {
  const f = fixture(); f.effect.play(f.labels);
  assert.deepEqual(f.labels.map(label => label.textContent), ['Work', 'About', 'Writing', 'Resume']);
  assert.deepEqual(f.links.map(link => link.getAttribute('aria-label')), ['Work', 'About', 'Writing', 'Open resume PDF']);
  assert.equal(f.timers.size, 1);
  assert.ok(f.letters().every(letter => letter.getAttribute('aria-hidden') === 'true'));
  const glyphs = f.letters().map(letter => letter.getAttribute('data-glyph'));
  assert.ok(new Set(glyphs).size > 1);
  f.tick(); assert.notDeepEqual(f.letters().map(letter => letter.getAttribute('data-glyph')), glyphs);
  for (let frame = 0; frame < 15; frame++) { assert.ok(f.timers.size <= 1); f.tick(); }
  assert.equal(f.timers.size, 0);
  assert.ok(f.letters().every(letter => letter.getAttribute('data-shuffling') === null));
  f.effect.destroy();
});

test('rapid replacements cancel the old clock and settle the latest section without changing source text', () => {
  const f = fixture(); f.effect.play(f.labels);
  f.labels[0].textContent = 'Experience';
  f.effect.play([f.labels[0]]);
  assert.equal(f.timers.size, 1); assert.equal(f.labels[0].textContent, 'Experience');
  for (let frame = 0; frame < 15; frame++) f.tick();
  assert.equal(f.labels[0].children.length, 10);
  assert.ok(f.labels[0].children.every(letter => letter.getAttribute('data-shuffling') === null));
  f.effect.destroy();
});

test('reduced motion and constrained devices keep plain text without a timer', () => {
  for (const options of [{ reduced: true }, { saveData: true }, { memory: 4 }, { cores: 2 }]) {
    const f = fixture(options); f.effect.play(f.labels);
    assert.equal(f.timers.size, 0); assert.equal(f.letters().length, 0);
    assert.equal(f.labels[0].textContent, 'Work'); f.effect.destroy();
  }
});

test('preference and visibility changes immediately settle an active effect; cleanup restores labels and resources', () => {
  const f = fixture(); f.effect.play(f.labels);
  f.root.dataset.motion = 'reduced'; f.document.emit('display-preferences:change');
  assert.equal(f.timers.size, 0); assert.ok(f.letters().every(letter => letter.getAttribute('data-shuffling') === null));
  f.root.dataset.motion = 'full'; f.effect.play(f.labels);
  f.document.hidden = true; f.document.emit('visibilitychange'); assert.equal(f.timers.size, 0);
  f.document.hidden = false; f.effect.play(f.labels); assert.equal(f.timers.size, 1);
  f.effect.destroy();
  assert.equal(f.timers.size, 0); assert.equal(f.listeners(), 0); assert.equal(f.letters().length, 0);
  assert.equal(f.links[0].getAttribute('aria-label'), null);
  assert.equal(f.links.at(-1).getAttribute('aria-label'), 'Open resume PDF');
  f.effect.play(f.labels); assert.equal(f.timers.size, 0);
});
