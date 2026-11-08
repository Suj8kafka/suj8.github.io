import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createLiveCursors } from '../assets/js/live-cursors.js';
import { firebaseConfig } from '../assets/js/firebase-config.js';

const databaseRules = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));

const source = readFileSync(new URL('../assets/js/firebase-presence.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from "[^"]+";\s*/gm, '');

function browser({ resolveLocation = false, uid = 'window-id', denyWrites = false } = {}) {
  const listeners = new Map();
  const events = {};
  const intervals = [];
  const timers = [];
  const writes = [];
  const removals = [];
  const label = { textContent: '' };
  const dot = { dataset: {} };
  const elements = [];
  function element(tagName) {
    const node = {
      tagName, children: [], dataset: {}, className: '', attributes: {},
      style: { setProperty(name, value) { this[name] = value; } },
      setAttribute(name, value) { this.attributes[name] = value; },
      append(...nodes) { this.children.push(...nodes); },
      querySelector() { return this.label ||= element('span'); },
      remove() { this.removed = true; }
    };
    elements.push(node);
    return node;
  }
  const section = { id: 'about', getBoundingClientRect: () => ({ top: 0, bottom: 1000, left: 0, right: 1280, width: 1280, height: 1000 }) };
  const document = {
    hidden: false,
    documentElement: { classList: { contains: () => false } },
    body: element('body'),
    createElement: element,
    querySelector: selector => ({ '.live-presence-label': label, '.live-presence-dot': dot })[selector] || null,
    querySelectorAll: selector => selector.startsWith('main > section') ? [section] : [],
    addEventListener: (name, callback) => { events[name] = callback; }
  };
  const context = vm.createContext({
    document, console: { error() {}, warn() {} }, AbortSignal, Date, createLiveCursors, firebaseConfig,
    window: {
      innerHeight: 800, innerWidth: 1280, location: { pathname: '/' },
      addEventListener: (name, callback) => { events[name] = callback; },
      setInterval: callback => intervals.push(callback),
      setTimeout: callback => timers.push(callback), clearTimeout() {}
    },
    initializeApp: () => ({}),
    inMemoryPersistence: 'memory',
    initializeAuth: (_, options) => { assert.equal(options.persistence, 'memory'); return {}; },
    signInAnonymously: async () => ({ user: { uid } }),
    getDatabase: () => ({}),
    ref: (_, path) => ({ path, key: path.split('/').at(-1) }),
    onDisconnect: reference => ({ remove: async () => writes.push(['cleanup', reference.path]) }),
    set: async (reference, value) => {
      writes.push(['set', reference.path, value]);
      if (denyWrites) throw new Error('PERMISSION_DENIED');
    },
    remove: async reference => removals.push(reference.path),
    onValue: (reference, callback) => listeners.set(reference.path, callback),
    serverTimestamp: () => Date.now(),
    runTransaction: async () => { throw new Error('Analytics denied'); },
    // An indefinitely stalled location service must not block presence startup.
    fetch: () => resolveLocation
      ? Promise.resolve({ ok: true, json: async () => ({ success: true, country: 'Nepal' }) })
      : new Promise(() => {})
  });
  vm.runInContext(source, context);
  return { context, document, listeners, events, intervals, timers, writes, removals, label, elements };
}

const flush = () => new Promise(resolve => setImmediate(resolve));
const snapshot = value => ({ val: () => value });

test('database rules allow authenticated reads and only owner presence writes', () => {
  assert.equal(databaseRules.rules.presence['.read'], 'auth != null');
  assert.match(databaseRules.rules.presence.$uid['.write'], /auth\.uid === \$uid/);
  assert.match(databaseRules.rules.presence.$uid['.validate'], /lastSeen/);
});

test('starts without pointer support or location response and registers cleanup before publishing', async () => {
  const page = browser();
  await flush();
  assert.ok(page.listeners.has('presence'));
  page.listeners.get('.info/connected')(snapshot(true));
  await flush();
  assert.deepEqual(page.writes.map(write => write[0]), ['cleanup', 'set']);
});

test('tab switching retains presence; hidden tabs heartbeat; page exit removes only this page', async () => {
  const page = browser();
  await flush();
  page.listeners.get('.info/connected')(snapshot(true));
  await flush();
  page.document.hidden = true;
  page.events.visibilitychange();
  page.intervals[0]();
  assert.equal(page.removals.length, 0);
  assert.equal(page.writes.at(-1)[0], 'set');
  page.events.pagehide();
  assert.deepEqual(page.removals, ['presence/window-id']);
});

test('filters stale visitors locally, reports disconnects, and re-registers on reconnect', async () => {
  const page = browser();
  await flush();
  const connected = page.listeners.get('.info/connected');
  connected(snapshot(true));
  await flush();
  page.listeners.get('presence')(snapshot({ other: { lastSeen: Date.now() }, stale: { lastSeen: Date.now() - 400000 } }));
  assert.equal(page.label.textContent, '1 other here');
  page.intervals[1]();
  assert.equal(page.removals.length, 0);
  connected(snapshot(false));
  page.intervals[1]();
  assert.equal(page.label.textContent, 'Reconnecting live');
  connected(snapshot(true));
  await flush();
  assert.equal(page.writes.filter(write => write[0] === 'cleanup').length, 2);
});

test('section changes publish promptly', async () => {
  const page = browser();
  await flush();
  page.listeners.get('.info/connected')(snapshot(true));
  await flush();
  page.events.scroll();
  page.timers.at(-1)();
  assert.equal(page.writes.at(-1)[2].section, 'about');
});

test('denied country analytics does not prevent live subscriptions or publishing', async () => {
  const page = browser({ resolveLocation: true });
  await flush();
  assert.ok(page.listeners.has('presence'));
  page.listeners.get('.info/connected')(snapshot(true));
  await flush();
  assert.equal(page.writes.at(-1)[0], 'set');
  assert.equal(page.writes.at(-1)[2].country, 'Nepal');
});

test('two pages exchange normalized live cursor positions without rendering their own cursor', async () => {
  const first = browser({ uid: 'first' });
  const second = browser({ uid: 'second' });
  await flush();
  for (const page of [first, second]) page.listeners.get('.info/connected')(snapshot(true));
  await flush();
  first.events.pointermove({ pointerType: 'mouse', clientX: 640, clientY: 250,
    target: { closest: selector => selector === 'main' ? {} : null } });
  first.timers.at(-1)();
  await flush();
  const presence = first.writes.at(-1)[2];
  assert.equal(presence.cursor.x, .5);
  assert.equal(presence.cursor.y, .25);
  second.listeners.get('presence')(snapshot({ first: presence }));
  first.listeners.get('presence')(snapshot({ first: presence }));
  const cursor = second.elements.find(node => node.className === 'visitor-cursor');
  assert.equal(cursor.style.transform, 'translate3d(640px, 250px, 0)');
  assert.equal(second.label.textContent, '1 other here');
  assert.ok(!first.elements.some(node => node.className === 'visitor-cursor'));
});

test('cursor updates are throttled and touch input is not shared', async () => {
  const page = browser();
  await flush();
  page.listeners.get('.info/connected')(snapshot(true));
  await flush();
  const initialWrites = page.writes.length;
  const target = { closest: selector => selector === 'main' ? {} : null };
  for (let index = 0; index < 30; index++) page.events.pointermove({ pointerType: 'mouse', clientX: index, clientY: 100, target });
  assert.equal(page.timers.length, 1);
  page.timers[0]();
  await flush();
  assert.equal(page.writes.length, initialWrites + 1);
  page.events.pointermove({ pointerType: 'touch', clientX: 50, clientY: 100, target });
  page.timers.at(-1)();
  assert.equal(page.writes.at(-1)[2].cursor.visible, false);
});

test('permission-denied writes show unavailable and stop repeated heartbeat failures', async () => {
  const page = browser({ denyWrites: true });
  await flush();
  page.listeners.get('.info/connected')(snapshot(true));
  await flush();
  const writeCount = page.writes.length;
  assert.equal(page.label.textContent, 'Live presence unavailable');
  for (let index = 0; index < 3; index++) {
    page.intervals[0]();
    page.intervals[1]();
  }
  await flush();
  assert.equal(page.writes.length, writeCount);
  assert.equal(page.label.textContent, 'Live presence unavailable');
});
