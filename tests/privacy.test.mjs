import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPrivacyDashboard, validateUsage, formatDuration } from '../assets/js/privacy.js';

const groups = ['pages', 'referrers', 'countries', 'browsers', 'devices', 'interactions', 'sections', 'pageTime', 'sectionTime', 'scrollDepth'];
function usage(days = 7) {
  return { days, pageViews: 5, interactions: 2, updatedAt: '2026-11-10T10:00:00Z',
    activeTimeMs: 60000, timingPageViews: 5, averageActiveTimeMs: 12000,
    daily: Array.from({ length: days }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, value: i === 0 ? 5 : 0 })),
    breakdowns: Object.fromEntries(groups.map(key => [key, [{ name: key === 'pages' || key === 'pageTime' ? '/' : '<script>untrusted</script>',
      value: key === 'pageTime' ? 60000 : key === 'sectionTime' ? 30000 : 5 }]])) };
}
function element() {
  const listeners = new Map();
  return { textContent: '', dataset: {}, children: [], attributes: {}, disabled: false,
    style: { setProperty(name, value) { this[name] = value; } },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    dispatch(name, event) { return listeners.get(name)?.(event); }, listeners };
}
function harness(fetch) {
  const nodes = new Map();
  const get = selector => {
    if (!nodes.has(selector)) nodes.set(selector, element());
    return nodes.get(selector);
  };
  get('[data-analytics-period]').value = '7';
  const choices = ['light', 'dark', 'auto'].map(value => { const node = element(); node.dataset.themeChoice = value; return node; });
  const document = { querySelector: get, querySelectorAll: () => choices,
    createElement: () => element(), documentElement: { dataset: {} } };
  const timers = new Map();
  const media = { ...element(), matches: false };
  const window = { ...element(), matchMedia: () => media,
    setTimeout(callback) { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); }, localStorage: { getItem: () => 'dark', setItem() {} } };
  const dashboard = createPrivacyDashboard({ document, window, fetch });
  return { get, nodes, choices, document, window, timers, dashboard };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('validates reports, rejecting missing, inconsistent, negative and nonnumeric counts', () => {
  assert.equal(validateUsage(usage(), 7).pageViews, 5);
  for (const change of [data => { data.pageViews = -1; }, data => { data.pageViews = '5'; },
    data => { data.days = 30; }, data => { data.daily.pop(); }, data => { data.breakdowns.pages = null; },
    data => { data.daily[0].value = 1; }, data => { data.updatedAt = 'bad'; },
    data => { data.breakdowns.countries[0].value = -1; }, data => { data.activeTimeMs = -1; },
    data => { data.averageActiveTimeMs = 999; }, data => { data.timingPageViews = 6; },
    data => { data.breakdowns.sectionTime[0].value = 60001; }]) {
    const data = usage(); change(data);
    assert.throws(() => validateUsage(data, 7));
  }
});

test('renders real counts with text nodes, preserves theme and clears stale data after failure', async () => {
  let fail = false;
  const h = harness(async url => {
    if (fail) return new Response('', { status: 503 });
    return Response.json(url.includes('/usage') ? usage() : { requests: 42, visits: 6, updatedAt: '2026-11-10T10:00:00Z' });
  });
  await flush();
  assert.equal(h.get('[data-usage-stat="pageViews"]').textContent, '5');
  assert.equal(h.get('[data-edge-stat="requests"]').textContent, '42');
  assert.equal(h.get('[data-usage-stat="activeTimeMs"]').textContent, '1m 0s');
  assert.equal(h.get('[data-usage-stat="averageActiveTimeMs"]').textContent, '12s');
  assert.equal(h.document.documentElement.dataset.theme, 'dark');
  const country = h.get('[data-usage-list="countries"]').children[0];
  assert.equal(country.children[0].textContent, '<script>untrusted</script>');
  assert.equal(h.get('[data-daily-chart]').children.length, 7);
  fail = true;
  await h.get('[data-analytics-refresh]').dispatch('click');
  assert.equal(h.get('[data-usage-stat="pageViews"]').textContent, '—');
  assert.equal(h.get('[data-edge-stat="requests"]').textContent, '—');
  assert.equal(h.get('[data-usage-stat="activeTimeMs"]').textContent, '—');
  assert.equal(h.get('[data-daily-chart]').children.length, 0);
  assert.match(h.get('[data-usage-status]').textContent, /not connected/);
  assert.equal(h.get('[data-usage-status]').dataset.state, 'error');
  assert.equal(h.get('[data-analytics-refresh]').disabled, false);
  h.dashboard.destroy();
  assert.equal(h.window.listeners.size, 0);
  assert.equal(h.get('[data-analytics-refresh]').listeners.size, 0);
});

test('formats durations and distinguishes missing timing coverage from recorded zero active time', async () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(10), '<1s');
  assert.equal(formatDuration(90000), '1m 30s');
  assert.equal(formatDuration(3660000), '1h 1m');
  const data = usage();
  data.activeTimeMs = 0; data.timingPageViews = 0; data.averageActiveTimeMs = null;
  data.breakdowns.pageTime = []; data.breakdowns.sectionTime = [];
  validateUsage(data, 7);
  const h = harness(async url => Response.json(url.includes('/usage') ? data
    : { requests: 0, visits: 0, updatedAt: data.updatedAt }));
  await flush();
  assert.equal(h.get('[data-usage-stat="activeTimeMs"]').textContent, '—');
  assert.equal(h.get('[data-usage-stat="averageActiveTimeMs"]').textContent, '—');
  data.timingPageViews = 5; data.averageActiveTimeMs = 0;
  await h.get('[data-analytics-refresh]').dispatch('click');
  assert.equal(h.get('[data-usage-stat="activeTimeMs"]').textContent, '0s');
  assert.equal(h.get('[data-usage-stat="averageActiveTimeMs"]').textContent, '0s');
  h.dashboard.destroy();
});

test('changing the period ignores late responses from an older request', async () => {
  let resolveOld;
  const h = harness(url => {
    if (url.includes('days=7')) return new Promise(resolve => { resolveOld = resolve; });
    return Promise.resolve(Response.json(url.includes('/usage') ? usage(1)
      : { requests: 1, visits: 1, updatedAt: '2026-11-10T10:00:00Z' }));
  });
  h.get('[data-analytics-period]').value = '1';
  await h.get('[data-analytics-period]').dispatch('change');
  resolveOld(Response.json(usage(7)));
  await flush();
  assert.equal(h.get('[data-daily-chart]').children.length, 1);
  assert.equal(h.get('[data-analytics-refresh]').disabled, false);
  h.dashboard.destroy();
});

test('aborted requests produce a visible timeout and refresh remains usable', async () => {
  const h = harness((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  [...h.timers.values()][0]();
  await flush();
  assert.match(h.get('[data-usage-status]').textContent, /timed out/);
  assert.match(h.get('[data-edge-status]').textContent, /timed out/);
  assert.equal(h.get('[data-analytics-refresh]').disabled, false);
  assert.equal(h.timers.size, 0);
  h.dashboard.destroy();
});

test('footer opens a standalone dashboard before the readable policy and never offers browser exclusion', () => {
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const privacy = readFileSync(new URL('../privacy/index.html', import.meta.url), 'utf8');
  assert.match(home, /<footer[\s\S]*href="\/privacy\/"/);
  assert.ok(privacy.indexOf('id="analytics-title"') < privacy.indexOf('id="privacy-policy"'));
  assert.doesNotMatch(privacy, /exclude this browser|data-opt-out|umami\.is\/script/i);
  assert.match(privacy, /<noscript>/);
  assert.match(privacy, /ipwho\.is/);
  assert.match(privacy, /BigDataCloud/);
  assert.match(privacy, /Global Privacy Control/);
});
