import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/analytics-worker.js';

const request = () => new Request('https://analytics.example/');
const env = { CLOUDFLARE_API_TOKEN: 'test-token', CLOUDFLARE_ZONE_TAG: 'test-zone' };

test('unconfigured analytics returns a non-cacheable error rather than zero metrics', async () => {
  const response = await worker.fetch(request(), {});
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

test('queries hostname-scoped adaptive groups and maps counts, visits, paths and countries', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.cloudflare.com/client/v4/graphql');
    const body = JSON.parse(options.body);
    assert.equal(options.headers.authorization, 'Bearer test-token');
    assert.equal(body.variables.hostname, 'www.sujeetkhadka.com.np');
    assert.ok(body.query.includes('httpRequestsAdaptiveGroups'));
    assert.ok(!body.query.includes('groupBy:'));
    assert.equal(Date.parse(body.variables.datetime_leq) - Date.parse(body.variables.datetime_geq), 86400000);
    return Response.json({ data: { viewer: { zones: [{
      totals: [{ count: 240, sum: { visits: 38 } }],
      paths: [{ dimensions: { clientRequestPath: '/work' }, count: 40 }],
      countries: [{ dimensions: { clientCountryName: 'NP' }, count: 150 }]
    }] } } });
  };
  try {
    const response = await worker.fetch(request(), env);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.requests, 240);
    assert.equal(data.visits, 38);
    assert.deepEqual(data.paths, [{ name: '/work', value: 40 }]);
    assert.deepEqual(data.countries, [{ name: 'NP', value: 150 }]);
    assert.ok(!JSON.stringify(data).includes('test-token'));
  } finally { globalThis.fetch = original; }
});

test('upstream errors, empty zones, and network failures return 502', async () => {
  const original = globalThis.fetch;
  try {
    for (const upstream of [
      async () => new Response('', { status: 403 }),
      async () => Response.json({ errors: [{ message: 'Access denied' }] }),
      async () => Response.json({ data: { viewer: { zones: [] } } }),
      async () => { throw new Error('Connection failed'); }
    ]) {
      globalThis.fetch = upstream;
      const response = await worker.fetch(request(), env);
      assert.equal(response.status, 502);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  } finally { globalThis.fetch = original; }
});

test('supports CORS preflight and rejects unsupported methods', async () => {
  const preflight = await worker.fetch(new Request('https://analytics.example/', { method: 'OPTIONS' }), {});
  assert.equal(preflight.status, 200);
  const response = await worker.fetch(new Request('https://analytics.example/', { method: 'POST' }), env);
  assert.equal(response.status, 405);
});
