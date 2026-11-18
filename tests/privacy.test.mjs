import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPrivacyDashboard, validateUsage, formatDuration } from '../assets/js/privacy.js';

const groups = ['pages', 'referrers', 'countries', 'browsers', 'devices', 'interactions', 'sections', 'pageTime', 'sectionTime', 'scrollDepth'];
function usage(days = 7) {
  return { days, pageViews: 5, interactions: 2, updatedAt: '2026-11-10T10:00:00Z',
    activeTimeMs: 60000, timingPageViews: 5, averageActiveTimeMs: 12000,
    ...(days === 'all' ? { monthly: ['09', '10', '11'].map((month, i) => ({ date: `2026-${month}`, value: i === 0 ? 5 : 0 })) }
      : { daily: Array.from({ length: days }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, value: i === 0 ? 5 : 0 })) }),
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
function harness(fetch, period = '7') {
  const nodes = new Map();
  const get = selector => {
    if (!nodes.has(selector)) nodes.set(selector, element());
    return nodes.get(selector);
  };
  get('[data-analytics-period]').value = period;
  const choices = ['light', 'dark', 'auto'].map(value => { const node = element(); node.dataset.themeChoice = value; return node; });
  const document = { querySelector: get, querySelectorAll: () => choices,
    createElement: () => element(), documentElement: { dataset: {} } };
  const timers = new Map();
  const media = { ...element(), matches: false };
  const window = { ...element(), matchMedia: () => media,
    setTimeout(callback, delay) { const id = timers.size + 1; timers.set(id, { callback, delay }); return id; },
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

test('validates all-time monthly reports without accepting incomplete or mismatched history', () => {
  assert.equal(validateUsage(usage('all'), 'all').pageViews, 5);
  const yearBoundary = usage('all');
  yearBoundary.monthly = [{ date: '2025-12', value: 2 }, { date: '2026-01', value: 3 }];
  validateUsage(yearBoundary, 'all');
  for (const change of [data => { data.days = 7; }, data => { delete data.monthly; },
    data => { data.monthly = []; }, data => { data.monthly[0].value = -1; },
    data => { data.monthly[0].value = '5'; }, data => { data.monthly[0].value = 2; },
    data => { data.monthly[0].date = '2026-99'; }, data => { data.monthly[0].date = '2026-09-01'; },
    data => { data.monthly[1].date = '2026-09'; }, data => { data.monthly.splice(1, 1); }]) {
    const data = usage('all'); change(data);
    assert.throws(() => validateUsage(data, 'all'));
  }
  assert.throws(() => validateUsage(usage('all'), 7));
});

test('loads all-time totals and switches to seven-day and thirty-day daily reports', async () => {
  const requests = [];
  let fail = false;
  const h = harness(async url => {
    requests.push(url);
    if (fail && url.includes('/usage')) return new Response('', { status: 502 });
    const period = new URL(url).searchParams.get('days');
    return Response.json(url.includes('/usage') ? usage(period === 'all' ? 'all' : Number(period))
      : { requests: 42, visits: 6, updatedAt: '2026-11-10T10:00:00Z' });
  }, 'all');
  await flush();
  assert.ok(requests.some(url => url.endsWith('/usage?days=all')));
  assert.equal(h.get('[data-usage-stat="pageViews"]').textContent, '5');
  assert.equal(h.get('[data-usage-stat="activeTimeMs"]').textContent, '1m 0s');
  assert.equal(h.get('[data-daily-chart]').children.length, 3);
  assert.equal(h.get('[data-daily-chart]').children[0].children[1].textContent, '2026-09');
  assert.equal(h.get('[data-daily-chart]').attributes['aria-label'], 'Monthly page views, all time');
  assert.equal(h.get('[data-chart-period]').textContent, 'Monthly · UTC');
  assert.match(h.get('[data-usage-status]').textContent, /All recorded usage/);
  for (const days of ['7', '30']) {
    h.get('[data-analytics-period]').value = days;
    await h.get('[data-analytics-period]').dispatch('change');
    assert.equal(h.get('[data-daily-chart]').children.length, Number(days));
    assert.equal(h.get('[data-daily-chart]').dataset.interval, 'day');
    assert.equal(h.get('[data-chart-period]').textContent, 'Daily · UTC');
  }
  h.get('[data-analytics-period]').value = 'all';
  await h.get('[data-analytics-period]').dispatch('change');
  assert.equal(h.get('[data-daily-chart]').dataset.interval, 'month');
  fail = true;
  await h.get('[data-analytics-refresh]').dispatch('click');
  assert.equal(h.get('[data-usage-stat="pageViews"]').textContent, '—');
  assert.equal(h.get('[data-daily-chart]').children.length, 0);
  assert.equal(h.get('[data-usage-status]').dataset.state, 'error');
  assert.equal(h.get('[data-edge-stat="requests"]').textContent, '42');
  h.dashboard.destroy();
});

test('a legacy service falls back from unsupported All Time to a clearly labelled seven-day report', async () => {
  const requests = [];
  let supportsAllTime = false;
  const h = harness(async url => {
    requests.push(url);
    if (!url.includes('/usage')) return Response.json({ requests: 42, visits: 6, updatedAt: '2026-11-10T10:00:00Z' });
    const period = new URL(url).searchParams.get('days');
    if (period === 'all' && !supportsAllTime) return Response.json({ error: 'Choose 1, 7 or 30 days' }, { status: 400 });
    return Response.json(usage(period === 'all' ? 'all' : Number(period)));
  }, 'all');
  await flush();
  assert.ok(requests.some(url => url.endsWith('/usage?days=all')));
  assert.ok(requests.some(url => url.endsWith('/usage?days=7')));
  assert.equal(h.get('[data-analytics-period]').value, '7');
  assert.equal(h.get('[data-usage-stat="pageViews"]').textContent, '5');
  assert.equal(h.get('[data-usage-status]').dataset.state, 'ready');
  assert.match(h.get('[data-usage-status]').textContent, /All Time is not available.*Showing the last 7 days/);
  assert.equal(h.get('[data-daily-chart]').children.length, 7);
  assert.equal(h.get('[data-daily-chart]').dataset.interval, 'day');
  assert.equal(h.get('[data-chart-period]').textContent, 'Daily · UTC');
  assert.equal(h.get('[data-edge-stat="requests"]').textContent, '42');
  assert.equal(h.get('[data-analytics-refresh]').disabled, false);
  supportsAllTime = true;
  h.get('[data-analytics-period]').value = 'all';
  await h.get('[data-analytics-period]').dispatch('change');
  assert.equal(h.get('[data-daily-chart]').dataset.interval, 'month');
  assert.doesNotMatch(h.get('[data-usage-status]').textContent, /not available/);
  h.dashboard.destroy();
});

test('All Time service errors do not turn into successful recent or empty reports', async () => {
  for (const failure of [
    Response.json({ error: 'Usage analytics could not be loaded' }, { status: 502 }),
    Response.json({ error: 'Usage analytics is not configured yet' }, { status: 503 }),
    Response.json({ error: 'Another bad request' }, { status: 400 })
  ]) {
    const requests = [];
    const h = harness(async url => {
      requests.push(url);
      return url.includes('/usage') ? failure.clone()
        : Response.json({ requests: 42, visits: 6, updatedAt: '2026-11-10T10:00:00Z' });
    }, 'all');
    await flush();
    assert.equal(requests.filter(url => url.includes('/usage')).length, 1);
    assert.equal(h.get('[data-analytics-period]').value, 'all');
    assert.equal(h.get('[data-usage-stat="pageViews"]').textContent, '—');
    assert.equal(h.get('[data-usage-status]').dataset.state, 'error');
    assert.equal(h.get('[data-edge-stat="requests"]').textContent, '42');
    h.dashboard.destroy();
  }
});

test('a late unsupported-range response cannot change a newer selected period', async () => {
  let finishOld;
  const requests = [];
  const h = harness(url => {
    requests.push(url);
    if (url.endsWith('/usage?days=all')) return new Promise(resolve => { finishOld = resolve; });
    const period = new URL(url).searchParams.get('days');
    return Promise.resolve(Response.json(url.includes('/usage') ? usage(Number(period))
      : { requests: 42, visits: 6, updatedAt: '2026-11-10T10:00:00Z' }));
  }, 'all');
  h.get('[data-analytics-period]').value = '30';
  await h.get('[data-analytics-period]').dispatch('change');
  finishOld(Response.json({ error: 'Choose 1, 7 or 30 days' }, { status: 400 }));
  await flush();
  assert.equal(h.get('[data-analytics-period]').value, '30');
  assert.equal(h.get('[data-daily-chart]').children.length, 30);
  assert.ok(!requests.some(url => url.endsWith('/usage?days=7')));
  h.dashboard.destroy();
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
  const timer = [...h.timers.values()][0];
  assert.equal(timer.delay, 12000);
  timer.callback();
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
  assert.match(privacy, /Google Analytics may use first-party cookies/);
  assert.match(privacy, /<code>_ga<\/code>/);
  assert.match(privacy, /Google Analytics data safeguards/);
  assert.match(privacy, /datetime="2026-11-18">18 November 2026/);
  assert.match(privacy, /<option value="all" selected>All Time<\/option>/);
  assert.match(privacy, /<option value="7">Last 7 days<\/option>/);
  assert.match(privacy, /<option value="30">Last 30 days<\/option>/);
  assert.match(privacy, /monthly aggregates, which have no automatic expiry/);
});
