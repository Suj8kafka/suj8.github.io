import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleAnalytics } from '../assets/js/deferred-analytics.js';

const flush = async () => { for (let index = 0; index < 20; index++) await Promise.resolve(); };
function preview({ complete = false, production = true, panel = true, idle = true, hidden = false, analytics } = {}) {
  const handlers = new Map(), frames = new Map(), tasks = new Map(), scripts = [], calls = [];
  let nextId = 0;
  function target(prefix) { return {
    addEventListener: (name, callback) => handlers.set(`${prefix}:${name}`, callback),
    removeEventListener: name => handlers.delete(`${prefix}:${name}`)
  }; }
  const document = { ...target('document'), hidden, readyState: complete ? 'complete' : 'loading',
    head: { append: script => scripts.push(script) }, createElement: () => ({}),
    querySelector: () => panel ? {} : null };
  const window = { ...target('window'), location: { hostname: production ? 'www.sujeetkhadka.com.np' : '127.0.0.1', pathname: '/' },
    requestAnimationFrame: callback => { frames.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: callback => { tasks.set(++nextId, callback); return nextId; },
    clearTimeout: id => tasks.delete(id), cancelIdleCallback: id => tasks.delete(id) };
  if (idle) window.requestIdleCallback = window.setTimeout;
  const module = { createUsageTracker: () => { calls.push('usage'); return { destroy: () => calls.push('destroy-usage') }; },
    createVisitorPanel: () => { calls.push('panel'); return { destroy: () => calls.push('destroy-panel') }; } };
  const controller = scheduleAnalytics({ document, window, analytics: analytics || (async () => { calls.push('import'); return module; }) });
  const run = map => { const entry = map.entries().next().value; if (entry) { map.delete(entry[0]); entry[1](); } };
  return { controller, document, calls, scripts, handlers, frames, tasks, module,
    event: (target, name) => handlers.get(`${target}:${name}`)?.(),
    paint: () => run(frames), task: async () => { run(tasks); await flush(); } };
}

test('analytics waits for load/interaction and two paints, with one initializer per idle task', async () => {
  const page = preview();
  assert.equal(page.tasks.size, 0);
  assert.equal(page.calls.length, 0);
  page.event('window', 'load'); page.event('document', 'pointerdown');
  assert.equal(page.scripts.length, 0);
  page.paint(); assert.equal(page.tasks.size, 0);
  page.paint(); assert.equal(page.tasks.size, 1);
  await page.task(); assert.equal(page.scripts.length, 1);
  assert.match(page.scripts[0].src, /googletagmanager/);
  assert.equal(page.scripts[0].async, true);
  await page.task(); assert.deepEqual(page.calls, ['import']);
  await page.task(); assert.deepEqual(page.calls, ['import', 'usage']);
  await page.task(); assert.deepEqual(page.calls, ['import', 'usage', 'panel']);
  assert.equal(page.tasks.size, 0);
  assert.equal(page.handlers.size, 0);
  page.controller.destroy();
  assert.deepEqual(page.calls.slice(-2), ['destroy-usage', 'destroy-panel']);
});

test('interaction can start analytics before load and timeout fallback still yields between initializers', async () => {
  const page = preview({ idle: false });
  page.event('document', 'keydown'); page.paint(); page.paint();
  for (let index = 0; index < 4; index++) await page.task();
  assert.equal(page.scripts.length, 1);
  assert.deepEqual(page.calls, ['import', 'usage', 'panel']);
});

test('localhost does not load Google or custom collection and keeps the optional visitor panel', async () => {
  const page = preview({ complete: true, production: false });
  page.paint(); page.paint(); await page.task(); await page.task();
  assert.equal(page.scripts.length, 0);
  assert.deepEqual(page.calls, ['import', 'panel']);
  const empty = preview({ complete: true, production: false, panel: false });
  empty.paint(); empty.paint();
  assert.equal(empty.tasks.size, 0);
});

test('hidden startup waits for visibility and destroy cancels queued work and listeners', async () => {
  const page = preview({ complete: true, hidden: true });
  assert.equal(page.frames.size, 0);
  page.document.hidden = false;
  page.event('document', 'visibilitychange');
  page.paint(); page.paint(); page.controller.destroy();
  await page.task();
  assert.equal(page.tasks.size, 0);
  assert.equal(page.handlers.size, 0);
  assert.equal(page.scripts.length, 0);
});

test('destroy during module download prevents late controller creation', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const page = preview({ complete: true, production: false, analytics: () => pending });
  page.paint(); page.paint(); await page.task(); page.controller.destroy();
  resolve(page.module); await flush();
  assert.equal(page.tasks.size, 0);
  assert.deepEqual(page.calls, []);
});
