import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheAnalytics } from '../cloudflare/analytics-cache.js';

test('normalizes public report keys and reuses cached data without another upstream query', async () => {
  const entries = new Map(), pending = [];
  const cache = { match: async key => entries.get(key.url)?.clone(), put: async (key, response) => { entries.set(key.url, response); } };
  const ctx = { waitUntil: promise => pending.push(promise) };
  let queries = 0;
  const produce = async () => { queries++; return Response.json({ count: 42 }, { headers: { 'cache-control': 'public, max-age=300' } }); };
  for (const suffix of ['?days=7&noise=1', '?days=7&noise=2']) {
    const response = await cacheAnalytics(new Request(`https://analytics.example/usage${suffix}`), ctx, produce, cache);
    await Promise.all(pending);
    assert.deepEqual(await response.json(), { count: 42 });
  }
  assert.equal(queries, 1);
});

test('never caches collection requests, errors or invalid report ranges', async () => {
  let reads = 0, writes = 0;
  const cache = { match: async () => { reads++; }, put: async () => { writes++; } };
  const ctx = { waitUntil() {} };
  for (const request of [new Request('https://analytics.example/collect', { method: 'POST' }),
    new Request('https://analytics.example/usage?days=bad'), new Request('https://analytics.example/private')]) {
    await cacheAnalytics(request, ctx, async () => Response.json({}), cache);
  }
  assert.equal(reads, 0);
  await cacheAnalytics(new Request('https://analytics.example/'), ctx, async () => Response.json({ error: 'unavailable' }, { status: 503 }), cache);
  assert.equal(writes, 0);
});
