import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createLiveCursors, cursorColor } from '../assets/js/live-cursors.js';
import { firebaseConfig } from '../assets/js/firebase-config.js';

const databaseRules = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));

const source = readFileSync(new URL('../assets/js/firebase-presence.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from "[^"]+";\s*/gm, '');

function browser({ resolveLocation = false, uid = 'window-id', denyWrites = false, pendingAuth = false } = {}) {
  const listeners = new Map();
  const errors = new Map();
  const events = {};
  const intervals = [];
  const clearedIntervals = [];
  const timers = [];
  const timerDelays = [];
  const activeTimers = new Map();
  const frames = new Map();
  const unsubscribed = [];
  const writes = [];
  const removals = [];
  const label = { textContent: '' };
  const dot = { dataset: {} };
  const elements = [];
  function element(tagName) {
    const node = {
      tagName, children: [], dataset: {}, className: '', attributes: {},
      classList: { add() {}, remove() {} },
      style: { setProperty(name, value) { this[name] = value; } },
      addEventListener() {}, removeEventListener() {},
      setAttribute(name, value) { this.attributes[name] = value; },
      append(...nodes) { this.children.push(...nodes); },
      querySelector() { return this.label ||= element('span'); },
      remove() { this.removed = true; }
    };
    Object.defineProperty(node, 'innerHTML', { set() { this.children = []; } });
    elements.push(node);
    return node;
  }
  const list = element('div');
  const countryChart = element('div');
  const analyticsStatus = element('div'), analyticsGrid = element('div');
  let now = Date.now();
  class ClockDate extends Date { static now() { return now; } }
  let finishAuth;
  const credential = { user: { uid } };
  const authPromise = pendingAuth ? new Promise(resolve => { finishAuth = () => resolve(credential); }) : Promise.resolve(credential);
  const removeEventListener = (name, callback) => { if (events[name] === callback) delete events[name]; };
  const section = { id: 'about', getBoundingClientRect: () => ({ top: 0, bottom: 1000, left: 0, right: 1280, width: 1280, height: 1000 }) };
  const document = {
    hidden: false,
    documentElement: { classList: { contains: () => false } },
    body: element('body'),
    createElement: element,
    querySelector: selector => ({ '.live-presence-label': label, '.live-presence-dot': dot, '.live-presence-list': list, '.country-chart': countryChart,
      '.cloudflare-analytics-status': analyticsStatus, '.cloudflare-analytics-grid': analyticsGrid })[selector] || null,
    querySelectorAll: selector => selector.startsWith('main > section') ? [section] : [],
    addEventListener: (name, callback) => { events[name] = callback; }, removeEventListener
  };
  const context = vm.createContext({
    document, console: { error() {}, warn() {} }, AbortSignal, Date: ClockDate, createLiveCursors, cursorColor, firebaseConfig,
    window: {
      innerHeight: 800, innerWidth: 1280, location: { pathname: '/' },
      addEventListener: (name, callback) => { events[name] = callback; },
      removeEventListener,
      setInterval: callback => intervals.push(callback),
      clearInterval: id => clearedIntervals.push(id),
      setTimeout: (callback, delay) => { const id = timers.push(callback); timerDelays.push(delay); activeTimers.set(id, callback); return id; },
      clearTimeout: id => activeTimers.delete(id),
      requestAnimationFrame: callback => { const id = frames.size + 1; frames.set(id, callback); return id; },
      cancelAnimationFrame: id => frames.delete(id)
    },
    initializeApp: () => ({}),
    inMemoryPersistence: 'memory',
    initializeAuth: (_, options) => { assert.equal(options.persistence, 'memory'); return {}; },
    signInAnonymously: () => authPromise,
    getDatabase: () => ({}),
    ref: (_, path) => ({ path, key: path.split('/').at(-1) }),
    onDisconnect: reference => ({ remove: async () => writes.push(['cleanup', reference.path]) }),
    set: async (reference, value) => {
      writes.push(['set', reference.path, value]);
      if (denyWrites) throw new Error('PERMISSION_DENIED');
    },
    remove: async reference => removals.push(reference.path),
    onValue: (reference, callback, error) => {
      listeners.set(reference.path, callback); errors.set(reference.path, error);
      return () => { unsubscribed.push(reference.path); listeners.delete(reference.path); };
    },
    serverTimestamp: () => now,
    runTransaction: async () => { throw new Error('Analytics denied'); },
    // An indefinitely stalled location service must not block presence startup.
    fetch: () => resolveLocation
      ? Promise.resolve({ ok: true, json: async () => ({ success: true, country: 'Nepal' }) })
      : new Promise(() => {})
  });
  vm.runInContext(source, context);
  return { context, document, listeners, errors, events, intervals, clearedIntervals, timers, timerDelays, activeTimers, frames,
    writes, removals, label, list, countryChart, analyticsStatus, analyticsGrid, elements, unsubscribed, finishAuth,
    get now() { return now; },
    advance(ms) { now += ms; },
    paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); }
  };
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
  assert.equal(page.intervals.length, 1, 'Only the presence heartbeat repeats');
  assert.equal(page.removals.length, 0);
  connected(snapshot(false));
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
  page.paint();
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
  }
  await flush();
  assert.equal(page.writes.length, writeCount);
  assert.equal(page.label.textContent, 'Live presence unavailable');
});

test('connection alone does not claim a live visitor count before a snapshot is available', async () => {
  const page = browser();
  await flush();
  page.listeners.get('.info/connected')(snapshot(true));
  await flush();
  assert.notEqual(page.label.textContent, 'You’re here alone');
  page.listeners.get('presence')(snapshot({}));
  assert.equal(page.label.textContent, 'You’re here alone');
});

test('disconnects and denied reads replace cached visitor rows with an honest status', async () => {
  const page = browser();
  await flush();
  const connected = page.listeners.get('.info/connected');
  connected(snapshot(true)); await flush();
  page.listeners.get('presence')(snapshot({ peer: { lastSeen: page.now, label: 'Old visitor' } }));
  assert.equal(page.label.textContent, '1 other here');
  connected(snapshot(false));
  assert.equal(page.list.children.length, 1);
  assert.equal(page.list.children[0].textContent, 'Reconnecting live');
  connected(snapshot(true)); await flush();
  page.errors.get('presence')(new Error('PERMISSION_DENIED'));
  assert.equal(page.list.children[0].textContent, 'Live presence unavailable');
  connected(snapshot(false)); connected(snapshot(true)); await flush();
  assert.equal(page.label.textContent, 'Live presence unavailable', 'A transport reconnect cannot repair a cancelled read subscription');
  page.errors.get('analytics/countries')(new Error('PERMISSION_DENIED'));
  assert.equal(page.countryChart.textContent, 'Country visits are temporarily unavailable.');
});

test('visitor expiry is scheduled once at the stale boundary without render polling', async () => {
  const page = browser();
  await flush();
  page.listeners.get('.info/connected')(snapshot(true)); await flush();
  page.listeners.get('presence')(snapshot({ peer: { lastSeen: page.now - 119990 }, future: { lastSeen: page.now + 60000 }, bad: { lastSeen: 'now' } }));
  assert.equal(page.label.textContent, '1 other here');
  assert.equal(page.intervals.length, 1);
  assert.equal(page.timerDelays.at(-1), 11);
  page.advance(11);
  page.timers.at(-1)();
  assert.equal(page.label.textContent, 'You’re here alone');
});

test('rapid scroll and resize events share one viewport measurement per frame', async () => {
  const page = browser();
  await flush();
  page.listeners.get('.info/connected')(snapshot(true)); await flush();
  for (let index = 0; index < 30; index++) { page.events.scroll(); page.events.resize(); }
  assert.equal(page.frames.size, 1);
  page.paint();
  page.timers.at(-1)();
  assert.equal(page.writes.at(-1)[2].section, 'about');
});

test('leaving releases subscriptions, animation frames and listeners, including pending authentication', async () => {
  const page = browser();
  await flush();
  page.events.scroll();
  page.events.pagehide({ persisted: false });
  assert.equal(page.frames.size, 0);
  assert.equal(page.unsubscribed.length, 4);
  assert.equal(page.clearedIntervals.length, 1);
  assert.deepEqual(Object.keys(page.events), []);
  const pending = browser({ pendingAuth: true });
  pending.events.pagehide({ persisted: false });
  pending.finishAuth(); await flush();
  assert.equal(pending.listeners.size, 0);
  assert.equal(pending.writes.length, 0);
});

test('back/forward restoration resumes one heartbeat and registers disconnect cleanup again', async () => {
  const page = browser();
  await flush();
  page.listeners.get('.info/connected')(snapshot(true)); await flush();
  page.events.pagehide({ persisted: true });
  assert.equal(page.unsubscribed.length, 0);
  page.events.pageshow({ persisted: true }); await flush();
  assert.equal(page.intervals.length, 2);
  assert.equal(page.clearedIntervals.length, 1);
  assert.equal(page.writes.filter(write => write[0] === 'cleanup').length, 2);
});
