import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitorPanel } from '../assets/js/visitor-panel.js';

function usage() {
  return { days: 7, pageViews: 5, interactions: 2, activeTimeMs: 60000, timingPageViews: 5, averageActiveTimeMs: 12000,
    updatedAt: '2026-11-10T12:00:00Z',
    daily: Array.from({ length: 7 }, (_, i) => ({ date: `2026-11-0${i + 1}`, value: i ? 0 : 5 })),
    breakdowns: { pages: [{ name: '/', value: 5 }], referrers: [], countries: [], browsers: [], devices: [],
      interactions: [], sections: [], pageTime: [{ name: '/', value: 60000 }], sectionTime: [{ name: 'work', value: 30000 }], scrollDepth: [] } };
}
const traffic = () => ({ requests: 50, visits: 12, paths: [{ name: '/', value: 50 }], countries: [], updatedAt: '2026-11-10T12:00:00Z' });

function harness(fetch) {
  const nodes = new Map();
  function node() {
    const listeners = new Map(), classes = new Set();
    return { listeners, dataset: {}, children: [], textContent: '', hidden: true,
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name),
        toggle(name, force) { if (force) classes.add(name); else classes.delete(name); } },
      addEventListener(name, callback) { listeners.set(name, callback); }, removeEventListener(name) { listeners.delete(name); },
      dispatch(name, event = {}) { return listeners.get(name)?.(event); }, focus() { document.activeElement = this; },
      setAttribute(name, value) { this[name] = value; }, append(...items) { this.children.push(...items); },
      replaceChildren(...items) { this.children = items; },
      querySelector: get, querySelectorAll: all };
  }
  function get(selector) { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); }
  const trafficStats = ['requests', 'visits'].map(value => { const item = node(); item.dataset.cloudflareStat = value; return item; });
  const usageStats = ['pageViews', 'interactions', 'activeTimeMs', 'averageActiveTimeMs'].map(value => {
    const item = node(); item.dataset.sidebarUsageStat = value; return item;
  });
  const lists = ['paths', 'countries'].map(value => { const item = node(); item.dataset.cloudflareList = value; return item; });
  function all(selector) {
    if (selector === '[data-cloudflare-stat]') return trafficStats;
    if (selector === '[data-sidebar-usage-stat]') return usageStats;
    if (selector === '[data-cloudflare-list]') return lists;
    return [get('.presence-panel-close'), get('[data-cloudflare-refresh]')];
  }
  const document = { ...node(), querySelector: get, createElement: node };
  const timers = new Map();
  const window = { ...node(), setTimeout(callback) { const id = timers.size + 1; timers.set(id, callback); return id; }, clearTimeout: id => timers.delete(id) };
  let now = 0;
  const controller = createVisitorPanel({ document, window, fetch, now: () => now });
  return { get, document, window, controller, trafficStats, usageStats, lists, timers, setTime(value) { now = value; } };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('sidebar opens without Firebase and loads independently labelled traffic and usage reports', async () => {
  let calls = 0;
  const h = harness(async url => { calls++; return Response.json(url.includes('/usage') ? usage() : traffic()); });
  assert.equal(h.get('.live-presence').disabled, false);
  h.get('.live-presence').dispatch('click'); await flush();
  assert.equal(calls, 2);
  assert.equal(h.get('.presence-panel').classList.contains('is-open'), true);
  assert.equal(h.document.activeElement, h.get('.presence-panel-close'));
  assert.equal(h.trafficStats[0].textContent, '50');
  assert.equal(h.usageStats[2].textContent, '1m 0s');
  assert.equal(h.get('[data-sidebar-section-time]').children[0].children[0].textContent, 'Selected work');
  assert.match(h.get('[data-sidebar-usage-status]').textContent, /7 days/);
  h.get('.presence-panel-close').dispatch('click'); h.get('.live-presence').dispatch('click'); await flush();
  assert.equal(calls, 2, 'reopening within five minutes reuses loaded data');
  h.document.dispatch('keydown', { key: 'Escape', preventDefault() {} });
  assert.equal(h.document.activeElement, h.get('.live-presence'));
  h.controller.destroy();
  assert.equal(h.window.listeners.size, 0);
});

test('one service failing does not hide the other report and a failed refresh hides stale counts', async () => {
  let failTraffic = true, failUsage = false;
  const h = harness(async url => {
    const isUsage = url.includes('/usage');
    if (isUsage ? failUsage : failTraffic) return new Response('', { status: 503 });
    return Response.json(isUsage ? usage() : traffic());
  });
  await h.controller.load();
  assert.equal(h.get('.cloudflare-analytics-grid').hidden, true);
  assert.equal(h.get('[data-sidebar-usage-grid]').hidden, false);
  assert.match(h.get('.cloudflare-analytics .cloudflare-analytics-status').textContent, /not configured/);
  failTraffic = false; await h.controller.load();
  assert.equal(h.get('.cloudflare-analytics-grid').hidden, false);
  failTraffic = true; failUsage = true; await h.controller.load();
  assert.equal(h.get('.cloudflare-analytics-grid').hidden, true);
  assert.equal(h.get('[data-sidebar-usage-grid]').hidden, true);
  assert.equal(h.get('[data-sidebar-section-time]').children.length, 0);
  assert.equal(h.get('[data-cloudflare-refresh]').disabled, false);
  h.controller.destroy();
});

test('timeouts show errors and page departure aborts requests and removes listeners', async () => {
  const h = harness((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const loading = h.controller.load();
  [...h.timers.values()][0](); await loading;
  assert.match(h.get('.cloudflare-analytics .cloudflare-analytics-status').textContent, /timed out/);
  assert.match(h.get('[data-sidebar-usage-status]').textContent, /timed out/);
  assert.equal(h.get('[data-cloudflare-refresh]').disabled, false);
  h.window.dispatch('pagehide', { persisted: false });
  assert.equal(h.window.listeners.size, 0);
  assert.equal(h.document.listeners.size, 0);
});

test('closing after resizing restores focus to a visible link when the desktop opener is hidden', async () => {
  const h = harness(async url => Response.json(url.includes('/usage') ? usage() : traffic()));
  h.get('.live-presence').dispatch('click'); await flush();
  h.get('.live-presence').getClientRects = () => [];
  h.get('.presence-panel-close').dispatch('click');
  assert.equal(h.document.activeElement, h.get('.wordmark'));
  h.controller.destroy();
});
