import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeaderLocation } from '../assets/js/header-location.js';

function fixture({ compact = false, pending = false, welcoming = false, reader = false, initialY = 0, focusedInitially = false } = {}) {
  const nodes = [], frames = new Map();
  let nextId = 0, reads = 0, queued = 0, resized, disconnected = false;
  const node = () => {
    const events = new Map(), attributes = new Map();
    const value = { dataset: {}, hidden: false, textContent: '',
      addEventListener(name, callback) { events.set(name, callback); },
      removeEventListener(name) { events.delete(name); },
      emit(name, event = {}) { events.get(name)?.(event); },
      setAttribute(name, text) { attributes.set(name, text); },
      getAttribute(name) { return attributes.get(name); },
      removeAttribute(name) { attributes.delete(name); },
      querySelector: () => null, listeners: () => events.size
    };
    nodes.push(value); return value;
  };
  const root = node(), header = node(), nav = node(), status = node(), label = node(), prefix = node(), slot = node(), first = node();
  root.dataset = { pageStyles: pending ? 'pending' : 'ready', layout: reader ? 'reader' : 'default' };
  root.classList = { contains: () => welcoming };
  status.hidden = true; label.textContent = 'Introduction'; prefix.textContent = 'Viewing';
  nav.querySelector = () => first;
  status.querySelector = selector => selector === '[data-header-section]' ? label : prefix;
  header.querySelector = selector => selector === '.nav' ? nav : selector === '.header-navigation' ? slot : status;
  header.contains = target => [first, status].includes(target);
  const ids = ['top', 'work', 'about', 'experience', 'skills', 'writing', 'contact', 'footer'];
  const positions = [0, 900, 2000, 2900, 3800, 4900, 5900, 7000];
  const window = { ...node(), innerHeight: 900, scrollY: initialY,
    requestAnimationFrame(callback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class {
      constructor(callback) { resized = callback; }
      observe() {}
      disconnect() { disconnected = true; }
    }
  };
  const targets = ids.map((id, position) => ({ getBoundingClientRect() {
    reads++;
    return { top: positions[position] - window.scrollY, bottom: (positions[position + 1] || 7800) - window.scrollY };
  } }));
  const document = { ...node(), documentElement: root, fonts: node(), activeElement: null,
    getElementById: id => targets[ids.indexOf(id)],
    querySelector: selector => selector === '.hero' ? targets[0] : targets.at(-1)
  };
  first.focus = options => { first.focusOptions = options; document.activeElement = first; header.emit('focusin'); };
  if (focusedInitially) document.activeElement = first;
  const media = { matches: compact };
  const controller = createHeaderLocation({ document, window, header, compact: media, initialY, queue() { queued++; } });
  return { controller, root, header, nav, status, label, prefix, slot, first, document, window, media, positions, frames,
    update(y) { window.scrollY = y; controller.update(y); },
    paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
    finishWelcome() { welcoming = false; document.emit('loader:done'); },
    resize: () => resized(), reads: () => reads, queued: () => queued, disconnected: () => disconnected,
    listeners: () => nodes.reduce((total, target) => total + target.listeners(), 0)
  };
}

test('downward reading shows the section; deliberate upward scrolling or the top restores navigation', () => {
  const f = fixture();
  assert.equal(f.reads(), 0, 'No initial section layout is forced');
  f.update(40); assert.equal(f.nav.hidden, false);
  f.update(900);
  assert.equal(f.nav.hidden, true); assert.equal(f.status.hidden, false);
  assert.equal(f.label.textContent, 'Selected work'); assert.equal(f.prefix.textContent, 'Viewing');
  assert.equal(f.nav.inert, true); assert.equal(f.nav.getAttribute('aria-hidden'), 'true');
  assert.match(f.status.getAttribute('aria-label'), /Current section: Selected work.*Show navigation/);
  f.update(895); assert.equal(f.status.hidden, false, 'Tiny scroll reversals do not flicker');
  f.update(883); assert.equal(f.nav.hidden, false); assert.equal(f.status.hidden, true);
  f.update(940); assert.equal(f.status.hidden, false);
  f.update(0); assert.equal(f.nav.hidden, false);
  f.controller.destroy();
});

test('location covers all homepage sections and recognizes the footer at the document end', () => {
  const f = fixture();
  for (const [y, text] of [[150, 'Introduction'], [1000, 'Selected work'], [2050, 'About me'],
    [2950, 'Experience'], [3850, 'How I work'], [4950, 'Writing'], [5950, 'Contact'], [6900, 'Footer']]) {
    f.update(y); assert.equal(f.label.textContent, text);
  }
  assert.equal(f.reads(), 8, 'Scroll updates reuse the section bounds');
  f.controller.destroy();
});

test('hover, keyboard and the status button restore usable native links without hiding focused controls', () => {
  const f = fixture(); f.update(1000);
  f.slot.emit('pointerenter', { pointerType: 'touch' }); assert.equal(f.nav.hidden, true);
  f.slot.emit('pointerenter', { pointerType: 'mouse' }); assert.equal(f.nav.hidden, false);
  assert.equal(f.nav.inert, false); assert.equal(f.nav.getAttribute('aria-hidden'), 'false');
  f.slot.emit('pointerleave'); assert.equal(f.nav.hidden, true);
  f.header.emit('focusin'); f.update(1100); assert.equal(f.nav.hidden, false);
  f.header.emit('focusout', { relatedTarget: null }); assert.equal(f.nav.hidden, true);
  f.document.emit('keydown', { key: 'Tab' }); assert.equal(f.nav.hidden, false);
  f.update(1200); assert.equal(f.nav.hidden, true);
  f.header.emit('focusin', { target: f.status });
  assert.equal(f.status.hidden, false, 'Focusing the status button must not hide it before activation');
  f.status.emit('click'); assert.equal(f.nav.hidden, false);
  assert.equal(f.document.activeElement, f.first); assert.deepEqual(f.first.focusOptions, { preventScroll: true });
  f.update(2200); assert.equal(f.nav.hidden, false);
  f.controller.destroy();
  const early = fixture({ focusedInitially: true }); early.update(1000);
  assert.equal(early.nav.hidden, false, 'Focus acquired before enhancement startup remains available');
  early.controller.destroy();
});

test('compact screens, Reader mode, welcome and pending styling keep the normal navigation without layout work', () => {
  for (const options of [{ compact: true }, { reader: true }, { welcoming: true }, { pending: true }]) {
    const f = fixture(options); f.update(1200);
    assert.equal(f.nav.hidden, false); assert.equal(f.status.hidden, true); assert.equal(f.reads(), 0);
    f.controller.destroy();
  }
  const f = fixture({ welcoming: true }); f.update(1200); f.finishWelcome(); f.paint();
  assert.equal(f.reads(), 0); assert.equal(f.queued(), 1);
  f.update(1300); assert.equal(f.status.hidden, false);
  f.root.dataset.layout = 'reader'; f.document.emit('display-preferences:change');
  assert.equal(f.nav.hidden, false); assert.equal(f.status.hidden, true);
  assert.equal(f.nav.inert, false); assert.equal(f.nav.getAttribute('aria-hidden'), 'false');
  f.controller.destroy();
});

test('fonts and resize refresh cached section positions once while restored positions do not imply downward input', () => {
  const f = fixture({ initialY: 2100 }); f.update(2100);
  assert.equal(f.nav.hidden, false); assert.equal(f.reads(), 0);
  f.update(2150); assert.equal(f.label.textContent, 'About me'); assert.equal(f.reads(), 8);
  f.positions[2] = 2600;
  f.document.fonts.emit('loadingdone'); f.document.fonts.emit('loadingdone');
  assert.equal(f.frames.size, 1); assert.equal(f.reads(), 8);
  f.paint(); f.update(2150);
  assert.equal(f.label.textContent, 'Selected work'); assert.equal(f.reads(), 16);
  f.controller.refresh(); f.media.matches = true; f.update(0);
  assert.equal(f.nav.hidden, false); assert.equal(f.status.hidden, true);
  f.controller.destroy();
});

test('cleanup restores navigation and releases observers, listeners and pending frames', () => {
  const f = fixture(); f.update(1000); f.resize();
  assert.equal(f.frames.size, 1); assert.ok(f.listeners() > 0);
  f.controller.destroy();
  assert.equal(f.frames.size, 0); assert.equal(f.listeners(), 0); assert.equal(f.disconnected(), true);
  assert.equal(f.nav.hidden, false); assert.equal(f.status.hidden, true);
  assert.equal(f.nav.inert, false); assert.equal(f.nav.getAttribute('aria-hidden'), undefined);
  assert.equal(f.header.dataset.navigationMode, undefined);
  f.update(2000); f.resize(); assert.equal(f.frames.size, 0);
  assert.doesNotThrow(() => createHeaderLocation({ header: null }).destroy());
});
