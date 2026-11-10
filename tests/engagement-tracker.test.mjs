import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngagementTracker } from '../assets/js/engagement-tracker.js';

function harness({ focused = true, hidden = false, loader = false } = {}) {
  let clock = 0, nextId = 1;
  const listeners = new Map(), timers = new Map(), frames = new Map(), sent = [];
  function target(key) {
    return { addEventListener(name, callback) {
      const list = listeners.get(`${key}:${name}`) || new Set(); list.add(callback); listeners.set(`${key}:${name}`, list);
    }, removeEventListener(name, callback) {
      const list = listeners.get(`${key}:${name}`); list?.delete(callback); if (!list?.size) listeners.delete(`${key}:${name}`);
    } };
  }
  const document = { ...target('document'), hidden, focused, loader,
    hasFocus: () => document.focused,
    documentElement: { scrollHeight: 2400, classList: { contains: () => document.loader } } };
  const window = { ...target('window'), innerHeight: 800, scrollY: 0,
    setInterval(callback) { const id = nextId++; timers.set(id, callback); return id; },
    clearInterval(id) { timers.delete(id); },
    requestAnimationFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); } };
  const sections = [{ id: 'work', getBoundingClientRect: () => ({ top: -window.scrollY, bottom: 1200 - window.scrollY }) },
    { id: 'contact', getBoundingClientRect: () => ({ top: 1200 - window.scrollY, bottom: 2400 - window.scrollY }) }];
  const controller = createEngagementTracker({ document, window, sections, now: () => clock,
    send: (type, details) => sent.push({ type, ...details }) });
  function dispatch(key, details = {}) {
    const type = key.slice(key.indexOf(':') + 1);
    [...(listeners.get(key) || [])].forEach(callback => callback({ type, ...details }));
  }
  function paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); }
  paint();
  return { document, window, controller, sent, timers, frames, listeners, dispatch, paint,
    advance(ms) { clock += ms; },
    tick(ms = 15000) { clock += ms; [...timers.values()].forEach(callback => callback()); } };
}
const total = h => h.sent.filter(event => event.type === 'engagement').reduce((sum, event) => sum + event.milliseconds, 0);

test('batches foreground time and attributes each interval to the section at the reading point', () => {
  const h = harness();
  h.advance(5000);
  h.window.scrollY = 1200;
  h.dispatch('window:scroll'); h.paint();
  h.tick(10000);
  const report = h.sent.find(event => event.type === 'engagement');
  assert.deepEqual(report, { type: 'engagement', milliseconds: 15000, sections: { work: 5000, contact: 10000 } });
  assert.equal(h.timers.size, 1);
  h.controller.destroy();
  assert.equal(h.timers.size, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.listeners.size, 0);
});

test('hidden pages and unfocused windows flush previous time and pause until foregrounded again', () => {
  const h = harness();
  h.advance(5000); h.document.hidden = true;
  h.dispatch('document:visibilitychange');
  assert.equal(total(h), 5000);
  assert.equal(h.timers.size, 0);
  h.advance(120000); h.document.hidden = false;
  h.dispatch('document:visibilitychange'); h.paint();
  h.advance(3000); h.document.focused = false; h.dispatch('window:blur');
  assert.equal(total(h), 8000);
  h.advance(120000); h.document.focused = true;
  h.dispatch('window:focus'); h.paint();
  h.tick();
  assert.equal(total(h), 23000);
  h.controller.destroy();
});

test('idle time stops at sixty seconds and resumes on activity without counting the idle gap', () => {
  const h = harness();
  for (let i = 0; i < 5; i++) h.tick();
  assert.equal(total(h), 60000);
  assert.equal(h.timers.size, 0);
  h.advance(300000); h.dispatch('document:keydown', { key: 'private-text' });
  assert.equal(h.timers.size, 1);
  h.tick();
  assert.equal(total(h), 75000);
  assert.doesNotMatch(JSON.stringify(h.sent), /private-text/);
  h.controller.destroy();
});

test('welcome overlay, browser suspension and bfcache absence are excluded from time', () => {
  const h = harness({ loader: true });
  h.advance(6000); h.document.loader = false;
  h.dispatch('document:loader:done'); h.paint();
  h.tick();
  assert.equal(total(h), 15000);
  h.tick(120000); // A delayed heartbeat after device sleep is not reading time.
  assert.equal(total(h), 15000);
  h.dispatch('document:pointerdown'); h.advance(4000);
  h.dispatch('window:pagehide', { persisted: true });
  assert.equal(total(h), 19000);
  h.advance(120000); h.dispatch('window:pageshow', { persisted: true }); h.paint();
  h.tick();
  assert.equal(total(h), 34000);
  h.controller.destroy();
});

test('scroll depth counts each milestone once and does not read layout in every scroll callback', () => {
  const h = harness();
  h.window.scrollY = 1600;
  h.dispatch('window:scroll'); h.dispatch('window:scroll');
  assert.equal(h.frames.size, 1);
  h.paint();
  assert.deepEqual(h.sent.filter(event => event.type === 'depth').map(event => event.name), ['25', '50', '75', '100']);
  h.window.scrollY = 0; h.dispatch('window:scroll'); h.paint();
  h.window.scrollY = 1600; h.dispatch('window:scroll'); h.paint();
  assert.equal(h.sent.filter(event => event.type === 'depth').length, 4);
  h.controller.destroy();
});

test('starts paused when unfocused and bounds timing to one hour per page load', () => {
  const h = harness({ focused: false });
  h.tick(); assert.equal(total(h), 0);
  h.document.focused = true; h.dispatch('window:focus'); h.paint();
  for (let i = 0; i < 250; i++) { h.dispatch('document:pointerdown'); h.tick(); }
  assert.equal(total(h), 3600000);
  assert.equal(h.timers.size, 0);
  assert.ok(h.sent.filter(event => event.type === 'engagement').every(event => event.milliseconds <= 30000));
  h.controller.destroy();
});

test('dialog time stays in page totals and delayed reports never exceed the collection bound', () => {
  const h = harness();
  h.document.querySelector = () => ({ dialog: true });
  h.tick();
  assert.deepEqual(h.sent[0], { type: 'engagement', milliseconds: 15000, sections: {} });
  h.document.querySelector = () => null;
  for (let i = 0; i < 8; i++) { h.advance(5000); h.dispatch('document:pointerdown'); }
  h.controller.destroy();
  assert.equal(total(h), 55000);
  assert.ok(h.sent.filter(event => event.type === 'engagement').every(event => event.milliseconds <= 30000));
});
