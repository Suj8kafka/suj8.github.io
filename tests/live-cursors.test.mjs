import test from 'node:test';
import assert from 'node:assert/strict';
import { CURSOR_COLORS, cursorColor, isRecentCursor, createLiveCursors } from '../assets/js/live-cursors.js';

test('rejects stale, malformed, out-of-bounds and hidden cursor data', () => {
  const cursor = { visible: true, section: 'work', x: .5, y: .25, updatedAt: 10000 };
  assert.equal(isRecentCursor(cursor, 11000), true);
  for (const change of [
    { visible: false }, { x: -1 }, { x: Infinity }, { y: 1.1 },
    { x: '.5' }, { section: null }, { updatedAt: 0 }, { updatedAt: 20000 }
  ]) assert.equal(isRecentCursor({ ...cursor, ...change }, 11000), false);
});

test('only uses the cursor palette instead of arbitrary incoming CSS', () => {
  for (const color of CURSOR_COLORS) assert.equal(cursorColor(color), color);
  assert.equal(cursorColor('#356dff'), CURSOR_COLORS[0]);
  assert.equal(cursorColor('url(https://untrusted.example)'), CURSOR_COLORS[0]);
});

test('every muted cursor color keeps white labels readable', () => {
  for (const color of CURSOR_COLORS) {
    const channels = color.match(/[a-f0-9]{2}/g).map(value => parseInt(value, 16) / 255);
    const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    const luminance = linear.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    assert.ok(1.05 / (luminance + .05) >= 4.5, `${color}: white label contrast`);
    const max = Math.max(...channels), min = Math.min(...channels);
    assert.ok((max - min) / (1 - Math.abs(max + min - 1)) <= .35, `${color}: muted saturation`);
  }
});

function cursorPage({ width = 1200, height = 800, heroTop = 100, heroHeight = 500 } = {}) {
  const events = {}, nodes = [];
  const region = (id, left, top, width, height) => ({
    id, getBoundingClientRect: () => ({ left, top, width, height, right: left + width, bottom: top + height })
  });
  const hero = region('hero', 200, heroTop, width - 400, heroHeight);
  const regions = [region('', 0, 0, width, 90), hero,
    region('', 0, heroTop + heroHeight, width, 50), region('', 0, 720, width, 80)];
  const cursors = createLiveCursors({
    document: {
      hidden: false, documentElement: { classList: { contains: () => false } },
      querySelectorAll: selector => selector.includes('.site-header') ? regions : [hero],
      createElement() {
        const label = {};
        const node = { dataset: {}, style: { setProperty() {} },
          append() {}, setAttribute() {}, querySelector: () => label,
          remove() { this.removed = true; } };
        nodes.push(node);
        return node;
      },
      body: { append() {} }, addEventListener: (name, listener) => { events[name] = listener; }
    },
    window: {
      innerWidth: width, innerHeight: height, location: { pathname: '/' },
      addEventListener: (name, listener) => { events[name] = listener; },
      setTimeout() {}, clearTimeout() {}
    },
    now: () => 10000, onChange() {}
  });
  return { cursors, events, nodes, move(x, y, excluded = false) {
    events.pointermove({ pointerType: 'mouse', clientX: x, clientY: y,
      target: { closest: () => excluded ? {} : null } });
    return cursors.cursor;
  } };
}

test('tracks continuously across gutters, the header, unnumbered sections, gaps and footer', () => {
  const page = cursorPage();
  const points = [[10, 10], [1, 300], [1199, 300], [600, 625], [600, 95], [600, 690], [1199, 799]];
  for (const [x, y] of points) {
    const cursor = page.move(x, y);
    assert.equal(cursor.visible, true, `Cursor at ${x}, ${y}`);
    assert.ok(cursor.x >= 0 && cursor.x <= 1 && cursor.y >= 0 && cursor.y <= 1);
    page.cursors.render({ peer: { path: '/', label: 'Visitor', color: page.cursors.color, cursor } }, 'self');
    const node = page.nodes.find(node => node.className === 'visitor-cursor');
    assert.equal(node.removed, undefined, `Rendered cursor at ${x}, ${y}`);
    assert.equal(node.style.transform, `translate3d(${x}px, ${y}px, 0)`);
  }
  assert.equal(page.move(600, 625).section, '@region-2');
  assert.equal(page.move(600, 95).section, '@viewport');
  assert.equal(page.move(600, 300, true).visible, false, 'Private inputs and dialogs are excluded');
  assert.equal(page.move(1200, 300).visible, false, 'Outside browser bounds');
  page.move(600, 300);
  page.events.pointerleave();
  assert.equal(page.cursors.cursor.visible, false, 'Leaving the page hides the cursor');
});

test('gutter positions map across viewport sizes while staying anchored to the same content', () => {
  const sender = cursorPage();
  const receiver = cursorPage({ width: 900, heroTop: -200, heroHeight: 800 });
  const peer = { path: '/', label: 'Visitor', color: sender.cursors.color, cursor: sender.move(1199, 350) };
  assert.equal(peer.cursor.section, '@hero');
  receiver.cursors.render({ peer }, 'self');
  const node = receiver.nodes.find(node => node.className === 'visitor-cursor');
  assert.equal(node.style.transform, 'translate3d(899.25px, 200px, 0)');
  assert.equal(node.dataset.edgeX, 'right');
  assert.equal(node.dataset.edgeY, 'top');
  peer.cursor = { ...peer.cursor, section: '@viewport', y: .999 };
  receiver.cursors.render({ peer }, 'self');
  assert.equal(node.dataset.edgeY, 'bottom', 'Label and arrow turn inward at the bottom edge');
  receiver.cursors.render({ peer: { ...peer, path: '/another-page' } }, 'self');
  assert.equal(node.removed, true, 'Other pages do not leak cursors into this page');
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
  clock = 16000;
  for (const [id, timer] of [...timers]) { if (timer.time <= clock) { timers.delete(id); timer.fn(); } }
  assert.equal(node.dataset.idle, 'true');
  assert.equal([...timers.values()][0].time, 18000);
  clock = 18000;
  for (const [id, timer] of [...timers]) { if (timer.time <= clock) { timers.delete(id); timer.fn(); } }
  assert.equal(node.removed, true, 'Idle cursors expire without a presence render loop');
  assert.equal(timers.size, 0);
  cursors.clear();
  assert.equal(node.removed, true);
  assert.equal(timers.size, 0);
});
