import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServices, scheduleEnhancements } from '../assets/js/enhancements.js';

const flush = async () => { for (let index = 0; index < 5; index++) await Promise.resolve(); };

test('a blocked presence module shows an unavailable state while availability still loads', async context => {
  context.mock.method(console, 'warn', () => {});
  const label = {}, dot = { dataset: {} }, button = {};
  let availabilityLoaded = false;
  const document = { querySelector: selector => ({ '.live-presence-label': label, '.live-presence-dot': dot, '.live-presence': button })[selector] };
  await loadServices(document, {
    presence: () => Promise.reject(new Error('Network unavailable')),
    availability: () => { availabilityLoaded = true; }
  });
  assert.equal(availabilityLoaded, true);
  assert.equal(label.textContent, 'Live presence unavailable');
  assert.equal(dot.dataset.state, 'error');
  assert.equal(button.disabled, true);
});

test('presence failure is visible even while availability never resolves', async context => {
  context.mock.method(console, 'warn', () => {});
  const label = {}, dot = { dataset: {} };
  loadServices({ querySelector: selector => ({ '.live-presence-label': label, '.live-presence-dot': dot })[selector] }, {
    presence: () => Promise.reject(new Error('Blocked presence')),
    availability: () => new Promise(() => {})
  });
  await flush();
  assert.equal(label.textContent, 'Live presence unavailable');
  assert.equal(dot.dataset.state, 'error');
});

function preview({ compact = true, reduced = false, ready = true, loader = false, constrained = false, idleSupport = true, failMotion = false, decode = 'ready', scrollY = 0 } = {}) {
  function target() {
    const events = new Map();
    return { events,
      addEventListener(name, callback) { events.set(name, callback); },
      removeEventListener(name) { events.delete(name); },
      dispatch(name) { events.get(name)?.(); }
    };
  }
  let finishDecode;
  const decoding = new Promise(resolve => { finishDecode = resolve; });
  const image = { decode: () => decode === 'pending' ? decoding : decode === 'failed' ? Promise.reject(new Error('Broken image')) : Promise.resolve() };
  const document = Object.assign(target(), { hidden: false, readyState: ready ? 'complete' : 'interactive', querySelector: () => image,
    documentElement: { classList: { contains: () => loader } } });
  const frames = new Map(), idle = new Map(), timers = new Map(), calls = [];
  let nextId = 0;
  const window = Object.assign(target(), {
    scrollY,
    navigator: { connection: { saveData: constrained } },
    matchMedia: query => ({ matches: query.includes('reduce') ? reduced : query.includes('max-width') ? compact : true }),
    requestAnimationFrame(callback) { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(callback) { timers.set(++nextId, callback); return nextId; },
    clearTimeout(id) { timers.delete(id); }
  });
  if (idleSupport) Object.assign(window, {
    requestIdleCallback(callback) { idle.set(++nextId, callback); return nextId; },
    cancelIdleCallback(id) { idle.delete(id); }
  });
  const controller = scheduleEnhancements({ document, window,
    motion() { calls.push('motion'); if (failMotion) throw new Error('Blocked motion'); },
    portrait() { calls.push('portrait'); }, services() { calls.push('services'); }
  });
  const run = callbacks => { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback()); };
  return { document, window, controller, calls, frames, idle, timers, finishDecode,
    paint: () => run(frames), background: () => { run(idle); run(timers); },
    finishLoader() { loader = false; document.dispatch('loader:done'); }
  };
}

test('mobile decorative work waits for image decode and two paints; GSAP starts only on first scroll', async () => {
  const page = preview({ ready: false });
  assert.equal(page.frames.size, 1, 'Live services have their own paint queue');
  page.document.readyState = 'complete'; page.window.dispatch('load');
  await flush();
  page.paint(); await flush(); assert.deepEqual(page.calls, []);
  page.paint(); await flush(); assert.deepEqual(page.calls, []);
  page.background(); await flush();
  assert.deepEqual(page.calls, ['services']);
  page.window.dispatch('scroll'); await flush();
  assert.deepEqual(page.calls, ['services', 'motion']);
  page.window.dispatch('scroll'); await flush();
  page.window.dispatch('load'); page.document.dispatch('visibilitychange');
  page.paint(); page.paint(); page.background(); await flush();
  assert.equal(page.calls.length, 2);
});

test('desktop portrait is deferred with the intro and constrained/reduced-motion devices avoid it', async () => {
  const desktop = preview({ compact: false, loader: true });
  desktop.paint(); desktop.paint(); desktop.background(); await flush();
  assert.deepEqual(desktop.calls, ['services'], 'Live UI connects during the welcome');
  desktop.finishLoader(); await flush(); desktop.paint(); desktop.paint(); desktop.background(); await flush();
  assert.deepEqual(desktop.calls, ['services', 'motion', 'portrait']);
  for (const options of [{ compact: false, constrained: true }, { compact: false, reduced: true }]) {
    const page = preview(options); await flush(); page.paint(); page.paint(); page.background(); await flush();
    assert.equal(page.calls.includes('portrait'), false);
    assert.equal(page.calls.includes('motion'), !options.reduced);
  }
});

test('failure of a motion enhancement does not prevent services or portrait startup', async context => {
  context.mock.method(console, 'warn', () => {});
  const page = preview({ compact: false, failMotion: true });
  await flush();
  page.paint(); page.paint(); page.background(); await flush();
  assert.deepEqual(page.calls, ['services', 'motion', 'portrait']);
});

test('hidden tabs wait until visible; cleanup cancels idle and timeout fallbacks', async () => {
  const hidden = preview(); hidden.document.hidden = true;
  await flush();
  hidden.paint(); hidden.paint(); hidden.background(); await flush();
  assert.deepEqual(hidden.calls, []);
  hidden.document.hidden = false; hidden.document.dispatch('visibilitychange');
  hidden.paint(); hidden.paint(); hidden.background(); await flush();
  assert.deepEqual(hidden.calls, ['services']);
  for (const idleSupport of [true, false]) {
    const page = preview({ idleSupport }); await flush(); page.paint(); page.paint(); page.controller.destroy();
    page.background(); await flush();
    assert.deepEqual(page.calls, []);
    assert.equal(page.window.events.size, 0); assert.equal(page.document.events.size, 0);
  }
});

test('slow decoding gates decoration but keeps live services usable; decode failure and restored scroll recover', async () => {
  const slow = preview({ decode: 'pending' }); await flush();
  slow.paint(); slow.paint(); slow.background(); await flush(); assert.deepEqual(slow.calls, ['services']);
  slow.finishDecode(); await flush(); slow.paint(); slow.paint(); slow.background(); await flush();
  assert.deepEqual(slow.calls, ['services']);
  const failed = preview({ decode: 'failed', scrollY: 120 }); await flush();
  failed.paint(); failed.paint(); failed.background(); await flush();
  assert.deepEqual(failed.calls, ['services', 'motion']);
  const destroyed = preview({ decode: 'pending' }); destroyed.controller.destroy();
  destroyed.finishDecode(); await flush(); assert.equal(destroyed.frames.size, 0);
});

test('live services start while full styles are pending; decoration waits', async () => {
  const page = preview({ ready: false });
  page.document.documentElement.dataset = { pageStyles: 'pending' };
  page.document.readyState = 'complete'; page.window.dispatch('load'); await flush();
  page.paint(); page.paint(); page.background(); await flush();
  assert.deepEqual(page.calls, ['services']);
  page.document.documentElement.dataset.pageStyles = 'ready';
  page.document.dispatch('page-styles:ready'); await flush();
  page.paint(); page.paint(); page.background(); await flush();
  assert.deepEqual(page.calls, ['services']);
});
