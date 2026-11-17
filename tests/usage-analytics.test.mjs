import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../cloudflare/analytics-worker.js';
import { pruneUsage } from '../cloudflare/usage-analytics.js';
import { validateUsage } from '../assets/js/analytics-report.js';

function database() {
  const db = new DatabaseSync(':memory:');
  const migrations = new URL('../cloudflare/migrations/', import.meta.url);
  for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    db.exec(readFileSync(new URL(file, migrations), 'utf8'));
  }
  const statements = [];
  const binding = {
    prepare(sql) {
      return { bind(...values) {
        statements.push({ sql, values });
        return {
          execute: () => db.prepare(sql).run(...values),
          async all() { return { success: true, results: db.prepare(sql).all(...values) }; },
          async run() { db.prepare(sql).run(...values); return { success: true }; }
        };
      } };
    },
    async batch(prepared) {
      db.exec('BEGIN');
      try {
        prepared.forEach(item => item.execute());
        db.exec('COMMIT');
        return prepared.map(() => ({ success: true }));
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  };
  return { db, binding, statements };
}
function collect(event = { type: 'pageview', path: '/', referrer: 'www.google.com' }, headers = {}) {
  const request = new Request('https://analytics.example/collect', { method: 'POST',
    headers: { origin: 'https://www.sujeetkhadka.com.np', 'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (iPhone; Mobile) AppleWebKit/605 Version/17 Safari/604', ...headers },
    body: JSON.stringify(event) });
  Object.defineProperty(request, 'cf', { value: { country: 'NP' } });
  return request;
}
const report = days => new Request(`https://analytics.example/usage?days=${days}`);

test('usage endpoints remain independent of private Cloudflare GraphQL credentials', async () => {
  const { db, binding } = database();
  try {
    const env = { ANALYTICS_DB: binding };
    const result = await worker.fetch(collect(), env);
    assert.equal(result.status, 204);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(result.headers.get('access-control-allow-origin'), 'https://www.sujeetkhadka.com.np');
    await worker.fetch(collect(), env);
    await worker.fetch(collect({ type: 'interaction', path: '/', name: 'project-open' }), env);
    await worker.fetch(collect({ type: 'section', path: '/', name: 'work' }), env);
    const response = await worker.fetch(report(7), env);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.pageViews, 2);
    assert.equal(data.interactions, 1);
    assert.equal(data.daily.length, 7);
    assert.equal(data.daily.at(-1).value, 2);
    assert.equal(data.daily.slice(0, -1).every(item => item.value === 0), true);
    assert.deepEqual(data.breakdowns.pages, [{ name: '/', value: 2 }]);
    assert.deepEqual(data.breakdowns.referrers, [{ name: 'Google', value: 2 }]);
    assert.deepEqual(data.breakdowns.devices, [{ name: 'Mobile', value: 2 }]);
    assert.deepEqual(data.breakdowns.browsers, [{ name: 'Safari', value: 2 }]);
    assert.deepEqual(data.breakdowns.countries, [{ name: 'NP', value: 2 }]);
    assert.deepEqual(data.breakdowns.sections, [{ name: 'work', value: 1 }]);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  } finally { db.close(); }
});

test('stores only daily counters with fixed labels, never raw network or referral identifiers', async () => {
  const { db, binding, statements } = database();
  try {
    await worker.fetch(collect({ type: 'pageview', path: '/', referrer: 'private-name.example.com' }, {
      'cf-connecting-ip': '192.0.2.10', 'user-agent': 'PrivateBrowserIdentifier/123'
    }), { ANALYTICS_DB: binding });
    const stored = JSON.stringify(statements);
    assert.doesNotMatch(stored, /192\.0\.2\.10|PrivateBrowserIdentifier|private-name/);
    const rows = db.prepare('SELECT * FROM daily_metrics').all();
    assert.equal(rows.length, 6);
    assert.deepEqual(Object.keys(rows[0]), ['day', 'metric', 'label', 'count']);
    assert.ok(rows.some(row => row.label === 'Other websites'));
    for (const event of [
      { type: 'pageview', path: '/login/' },
      { type: 'pageview', path: '/?email=private@example.com' },
      { type: 'pageview', path: '/', email: 'private@example.com' },
      { type: 'interaction', path: '/', name: 'arbitrary-private-event' },
      { type: 'section', path: '/', name: 'private-section' },
      { type: 'section', path: '/privacy/', name: 'work' },
      { type: 'interaction', path: '/', name: 'project-open', referrer: 'unexpected.com' }
    ]) assert.equal((await worker.fetch(collect(event), { ANALYTICS_DB: binding })).status, 400);
    assert.equal(db.prepare("SELECT count FROM daily_metrics WHERE metric = 'pageviews'").get().count, 1);
  } finally { db.close(); }
});

test('rejects unapproved origins, oversized bodies and content types before storing anything', async () => {
  const { db, binding } = database();
  try {
    const env = { ANALYTICS_DB: binding };
    for (const origin of ['https://attacker.example', 'null', 'http://www.sujeetkhadka.com.np']) {
      assert.equal((await worker.fetch(collect(undefined, { origin }), env)).status, 403);
    }
    assert.equal((await worker.fetch(collect(undefined, { 'content-type': 'text/plain' }), env)).status, 415);
    assert.equal((await worker.fetch(collect({ type: 'pageview', path: '/', referrer: 'a'.repeat(5000) }), env)).status, 400);
    const preflight = await worker.fetch(new Request('https://analytics.example/collect', { method: 'OPTIONS',
      headers: { origin: 'https://sujeetkhadka.com.np' } }), env);
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-headers'), 'Content-Type');
    assert.equal(preflight.headers.get('vary'), 'Origin');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM daily_metrics').get().count, 0);
  } finally { db.close(); }
});

test('browser privacy signals cause no writes even when the browser tracker is bypassed', async () => {
  const { db, binding } = database();
  try {
    for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }]) {
      assert.equal((await worker.fetch(collect(undefined, headers), { ANALYTICS_DB: binding })).status, 204);
    }
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM daily_metrics').get().count, 0);
  } finally { db.close(); }
});

test('stores elapsed milliseconds atomically, ranks sections and reports time per measured page load', async () => {
  const { db, binding } = database();
  const env = { ANALYTICS_DB: binding };
  try {
    await worker.fetch(collect({ type: 'pageview', path: '/', timing: true }), env);
    // Earlier page loads without the timing marker do not dilute the new average.
    await worker.fetch(collect({ type: 'pageview', path: '/' }), env);
    for (const event of [
      { type: 'engagement', path: '/', milliseconds: 15000, sections: { work: 10000, about: 5000 } },
      { type: 'engagement', path: '/', milliseconds: 10000, sections: { about: 10000 } },
      { type: 'depth', path: '/', name: '75' }
    ]) assert.equal((await worker.fetch(collect(event), env)).status, 204);
    const data = await (await worker.fetch(report(7), env)).json();
    assert.equal(data.pageViews, 2);
    assert.equal(data.timingPageViews, 1);
    assert.equal(data.activeTimeMs, 25000);
    assert.equal(data.averageActiveTimeMs, 25000);
    assert.deepEqual(data.breakdowns.sectionTime, [{ name: 'about', value: 15000 }, { name: 'work', value: 10000 }]);
    assert.deepEqual(data.breakdowns.pageTime, [{ name: '/', value: 25000 }]);
    assert.deepEqual(data.breakdowns.scrollDepth, [{ name: '75', value: 1 }]);
    assert.equal(db.prepare("SELECT count FROM daily_metrics WHERE metric = 'pageTime'").get().count, 25000);
  } finally { db.close(); }
});

test('validates timing bounds, section sums, allowed labels and separate event fields', async () => {
  const { db, binding } = database();
  const event = { type: 'engagement', path: '/', milliseconds: 15000, sections: { work: 15000 } };
  try {
    const invalid = [
      ...[0, -1, 30001, 1.5, '15000', null].map(milliseconds => ({ ...event, milliseconds })),
      { ...event, sections: { work: 10000, contact: 10000 } },
      { ...event, sections: { private: 1000 } }, { ...event, sections: { work: -100 } },
      { ...event, sections: { work: '100' } }, { ...event, sections: [] },
      { ...event, path: '/privacy/' }, { ...event, userId: 'not-allowed' },
      { type: 'pageview', path: '/', timing: 'true' },
      { type: 'pageview', path: '/', milliseconds: 1000 },
      { type: 'depth', path: '/', name: '82' }, { type: 'depth', path: '/privacy/', name: '25' }
    ];
    for (const payload of invalid) assert.equal((await worker.fetch(collect(payload), { ANALYTICS_DB: binding })).status, 400, JSON.stringify(payload));
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM daily_metrics').get().count, 0);
    assert.equal((await worker.fetch(collect({ ...event, path: '/privacy/', sections: {} }), { ANALYTICS_DB: binding })).status, 204);
    const data = await (await worker.fetch(report(7), { ANALYTICS_DB: binding })).json();
    assert.equal(data.averageActiveTimeMs, null, 'Time may arrive without a measured page load, e.g. across a UTC boundary');
  } finally { db.close(); }
});

test('distinguishes unavailable storage from a real empty period; validates ranges and failures', async () => {
  for (const request of [collect(), report(7), report('all')]) {
    const result = await worker.fetch(request, {});
    assert.equal(result.status, 503);
    assert.equal(result.headers.get('cache-control'), 'no-store');
  }
  const { db, binding } = database();
  try {
    for (const days of [1, 7, 30]) {
      const data = await (await worker.fetch(report(days), { ANALYTICS_DB: binding })).json();
      assert.equal(data.pageViews, 0);
      assert.equal(data.daily.length, days);
    }
    for (const days of [0, -1, 365, 'bad']) assert.equal((await worker.fetch(report(days), { ANALYTICS_DB: binding })).status, 400);
    for (const broken of [
      { prepare() { throw new Error('private database details'); }, batch() { throw new Error('private database details'); } },
      { prepare() { return { bind() { return { all: async () => ({ success: false }), run: async () => ({ success: false }) }; } }; },
        batch: async () => [{ success: false }] }
    ]) {
      for (const request of [collect(), report(7), report('all')]) {
        const response = await worker.fetch(request, { ANALYTICS_DB: broken });
        assert.equal(response.status, 502);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.doesNotMatch(await response.text(), /private database/);
      }
    }
    assert.equal((await worker.fetch(new Request('https://analytics.example/usage', { method: 'POST' }), {})).status, 405);
    assert.equal((await worker.fetch(new Request('https://analytics.example/collect'), {})).status, 405);
  } finally { db.close(); }
});

test('daily retention archives expired counters and reports exclude dates outside the selected window', async () => {
  const { db, binding } = database();
  try {
    const day = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
    for (const offset of [-100, -90, -89, -30, -7, -6, 0, 1]) {
      db.prepare("INSERT INTO daily_metrics VALUES (?, 'pageviews', 'all', 1)").run(day(offset));
    }
    await pruneUsage({ ANALYTICS_DB: binding });
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM daily_metrics').get().count, 6);
    assert.equal(db.prepare('SELECT SUM(count) AS count FROM monthly_metrics').get().count, 2);
    const data = await (await worker.fetch(report(7), { ANALYTICS_DB: binding })).json();
    assert.equal(data.pageViews, 2);
    await worker.scheduled({}, {}); // An unbound optional database does not break the Worker.
  } finally { db.close(); }
});

test('all-time reports combine archived months and daily activity without changing rolling totals', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-12T12:00:00Z') });
  const { db, binding } = database();
  const env = { ANALYTICS_DB: binding };
  try {
    const metrics = count => [['pageviews', 'all', count], ['pages', '/', count], ['timingPageViews', 'all', count],
      ['pageTime', '/', count * 1000], ['sectionTime', 'work', count * 500],
      ['interactions', 'project-open', count], ['sections', 'work', count],
      ['scrollDepth', '75', count], ['countries', 'NP', count], ['referrers', 'Google', count],
      ['browsers', 'Chrome', count], ['devices', 'Desktop', count]];
    for (const [date, count] of [['2025-12-31', 2], ['2026-08-14', 3], ['2026-08-15', 4],
      ['2026-10-13', 5], ['2026-10-14', 6], ['2026-11-05', 7], ['2026-11-06', 8],
      ['2026-11-12', 9], ['2026-11-13', 100]]) {
      for (const [metric, label, value] of metrics(count)) {
        db.prepare('INSERT INTO daily_metrics VALUES (?, ?, ?, ?)').run(date, metric, label, value);
      }
    }
    const read = async days => {
      const response = await worker.fetch(report(days), env);
      assert.equal(response.status, 200);
      return validateUsage(await response.json(), days);
    };
    const before = await read('all');
    assert.equal(before.pageViews, 44, 'Includes older available history and excludes future days');
    assert.equal(before.activeTimeMs, 44000);
    assert.equal(before.averageActiveTimeMs, 1000);
    assert.equal(before.interactions, 44);
    for (const metric of ['pages', 'countries', 'sections', 'scrollDepth', 'referrers', 'browsers', 'devices']) {
      assert.equal(before.breakdowns[metric][0].value, 44);
    }
    assert.equal(before.breakdowns.sectionTime[0].value, 22000);
    assert.deepEqual(before.monthly, [
      { date: '2025-12', value: 2 }, ...['01', '02', '03', '04', '05', '06', '07'].map(month => ({ date: `2026-${month}`, value: 0 })),
      { date: '2026-08', value: 7 }, { date: '2026-09', value: 0 },
      { date: '2026-10', value: 11 }, { date: '2026-11', value: 24 }
    ]);
    assert.equal((await read(1)).pageViews, 9);
    assert.equal((await read(7)).pageViews, 17);
    assert.equal((await read(30)).pageViews, 30);
    await pruneUsage(env);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM daily_metrics WHERE day < '2026-08-15'").get().count, 0);
    assert.deepEqual(await read('all'), before, 'Archiving preserves every total and breakdown');
    // Another old day in an already archived month is added once on the next run.
    for (const [metric, label, value] of metrics(1)) {
      db.prepare('INSERT INTO daily_metrics VALUES (?, ?, ?, ?)').run('2026-08-13', metric, label, value);
    }
    await pruneUsage(env);
    const after = await read('all');
    assert.equal(after.pageViews, 45);
    assert.equal(after.monthly.find(item => item.date === '2026-08').value, 8);
    await pruneUsage(env);
    assert.deepEqual(await read('all'), after, 'Retrying retention does not count the same history twice');
    assert.equal((await read(7)).pageViews, 17);
    assert.equal((await read(30)).pageViews, 30);
  } finally { db.close(); }
});

test('empty all-time reports are valid, and activity without views still establishes history', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-12T12:00:00Z') });
  const { db, binding } = database();
  const env = { ANALYTICS_DB: binding };
  try {
    let data = validateUsage(await (await worker.fetch(report('all'), env)).json(), 'all');
    assert.equal(data.pageViews, 0);
    assert.equal(data.averageActiveTimeMs, null);
    assert.deepEqual(data.monthly, [{ date: '2026-11', value: 0 }]);
    db.prepare("INSERT INTO daily_metrics VALUES ('2026-09-01', 'pageTime', '/', 1000)").run();
    data = validateUsage(await (await worker.fetch(report('all'), env)).json(), 'all');
    assert.equal(data.activeTimeMs, 1000);
    assert.deepEqual(data.monthly, ['09', '10', '11'].map(month => ({ date: `2026-${month}`, value: 0 })));
    db.prepare("INSERT INTO monthly_metrics VALUES ('2026-12', 'pageviews', 'all', 100)").run();
    data = validateUsage(await (await worker.fetch(report('all'), env)).json(), 'all');
    assert.equal(data.pageViews, 0, 'Future archived months are excluded');
  } finally { db.close(); }
});

test('a failed archive or delete rolls back the entire retention batch', async () => {
  const { db, binding } = database();
  const env = { ANALYTICS_DB: binding };
  try {
    db.prepare("INSERT INTO daily_metrics VALUES ('2000-01-01', 'pageviews', 'all', 3)").run();
    db.exec("CREATE TRIGGER fail_archive BEFORE INSERT ON monthly_metrics BEGIN SELECT RAISE(ABORT, 'archive failed'); END;");
    await assert.rejects(pruneUsage(env));
    assert.equal(db.prepare('SELECT SUM(count) AS count FROM daily_metrics').get().count, 3);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM monthly_metrics').get().count, 0);
    db.exec('DROP TRIGGER fail_archive');
    db.exec("CREATE TRIGGER fail_delete BEFORE DELETE ON daily_metrics BEGIN SELECT RAISE(ABORT, 'delete failed'); END;");
    await assert.rejects(pruneUsage(env));
    assert.equal(db.prepare('SELECT SUM(count) AS count FROM daily_metrics').get().count, 3);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM monthly_metrics').get().count, 0);
    db.exec('DROP TRIGGER fail_delete');
    await pruneUsage(env);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM daily_metrics').get().count, 0);
    assert.equal(db.prepare('SELECT SUM(count) AS count FROM monthly_metrics').get().count, 3);
    await assert.rejects(pruneUsage({ ANALYTICS_DB: { ...binding, batch: async () => [{ success: false }] } }));
  } finally { db.close(); }
});

test('missing monthly history storage produces an error and never discards daily counters', async () => {
  const { db, binding } = database();
  const env = { ANALYTICS_DB: binding };
  try {
    db.exec('DROP TABLE monthly_metrics');
    db.prepare("INSERT INTO daily_metrics VALUES ('2000-01-01', 'pageviews', 'all', 3)").run();
    const response = await worker.fetch(report('all'), env);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await worker.fetch(report(7), env)).status, 200);
    await assert.rejects(pruneUsage(env));
    assert.equal(db.prepare('SELECT SUM(count) AS count FROM daily_metrics').get().count, 3);
  } finally { db.close(); }
});
