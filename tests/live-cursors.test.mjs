import test from 'node:test';
import assert from 'node:assert/strict';
import { cursorColor, isRecentCursor, createLiveCursors } from '../assets/js/live-cursors.js';

test('rejects stale, malformed, out-of-bounds and hidden cursor data', () => {
  const cursor = { visible: true, section: 'work', x: .5, y: .25, updatedAt: 10000 };
  assert.equal(isRecentCursor(cursor, 11000), true);
  for (const change of [
    { visible: false }, { x: -1 }, { x: Infinity }, { y: 1.1 },
    { x: '.5' }, { section: null }, { updatedAt: 0 }, { updatedAt: 20000 }
  ]) assert.equal(isRecentCursor({ ...cursor, ...change }, 11000), false);
});

test('only uses the cursor palette instead of arbitrary incoming CSS', () => {
  assert.equal(cursorColor('#356dff'), '#356dff');
  assert.equal(cursorColor('url(https://untrusted.example)'), '#356dff');
});

test('reduced motion and the opt-out suppress both cursor capture and rendering', () => {
  for (const reduced of [true, false]) {
    const events = {};
    let changed = 0;
    const cursors = createLiveCursors({
      document: {
        addEventListener() {},
        createElement() { throw new Error('Decorative cursors must not render'); }
      },
      window: {
        matchMedia: () => ({ matches: reduced, addEventListener() {} }),
        addEventListener: (name, callback) => { events[name] = callback; }
      },
      enabled: () => reduced,
      now: () => 11000,
      onChange: () => { changed++; }
    });
    events.pointermove({ pointerType: 'mouse', clientX: 100, clientY: 100 });
    cursors.render({ other: { cursor: { visible: true, section: 'hero', x: .5, y: .5, updatedAt: 10000 } } }, 'self');
    assert.equal(cursors.cursor.visible, false);
    assert.equal(changed, 0);
  }
});

test('idle cursor fades at three seconds, ignores heartbeats, and restores opacity on movement', () => {
  let clock = 10000;
  let nextId = 0;
  const timers = new Map();
  const elements = [];
  function element() {
    const node = {
      dataset: {}, style: { setProperty() {} },
      setAttribute() {}, append() {},
      querySelector() { return {}; }, remove() { this.removed = true; }
    };
    elements.push(node);
    return node;
  }
  const cursors = createLiveCursors({
    document: {
      documentElement: { classList: { contains: () => false } },
      querySelectorAll: () => [{ id: 'work', getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }) }],
      createElement: element, body: { append() {} }, addEventListener() {}
    },
    window: {
      location: { pathname: '/' }, innerWidth: 1000, innerHeight: 1000,
      addEventListener() {},
      setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, time: clock + delay }); return id; },
      clearTimeout(id) { timers.delete(id); }
    },
    now: () => clock, onChange() {}
  });
  const peer = { path: '/', label: 'Visitor', color: '#356dff',
    cursor: { visible: true, section: 'work', x: .5, y: .5, updatedAt: clock } };
  cursors.render({ peer }, 'self');
  const node = elements.find(element => element.className === 'visitor-cursor');
  assert.equal(node.dataset.idle, 'false');
  clock = 12999;
  cursors.render({ peer: { ...peer, lastSeen: clock } }, 'self');
  assert.equal(node.dataset.idle, 'false');
  assert.equal([...timers.values()][0].time, 13000);
  clock = 13000;
  for (const [id, timer] of [...timers]) { timers.delete(id); timer.fn(); }
  assert.equal(node.dataset.idle, 'true');
  peer.cursor = { ...peer.cursor, x: .6, updatedAt: clock };
  cursors.render({ peer }, 'self');
  assert.equal(node.dataset.idle, 'false');
  cursors.clear();
  assert.equal(node.removed, true);
  assert.equal(timers.size, 0);
});
