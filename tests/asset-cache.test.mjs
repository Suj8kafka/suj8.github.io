import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAssetCache } from '../cloudflare/asset-cache.mjs';
import worker from '../cloudflare/security-headers.mjs';

const originPolicy = 'public, max-age=14400';
const response = (headers = {}, status = 200) => new Response('asset', {
  status, headers: { 'Cache-Control': originPolicy, ...headers }
});
const url = 'https://www.sujeetkhadka.com.np/assets/images/example.webp?v=abc123';

test('versioned static assets get an immutable year while preserving response validators', () => {
  for (const path of ['/assets/images/example.webp?v=abc123', '/assets/fonts/type.woff2?v=abc123',
    '/assets/css/site.css?v=release-2', '/loader/files/loader.js?v=release-2']) {
    for (const method of ['GET', 'HEAD']) {
      const result = response({ ETag: 'original' });
      applyAssetCache(new Request(`https://www.sujeetkhadka.com.np${path}`, { method }), result);
      assert.equal(result.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
      assert.equal(result.headers.get('ETag'), 'original');
    }
  }
});

test('mutable, private, unsuccessful, external and dynamic responses keep origin cache policy', () => {
  const cases = [
    [url.split('?')[0]], [url.replace('abc123', '')], [url.replace('abc123', '%2Fbad')],
    [url.replace('www.sujeetkhadka.com.np', 'example.com')], [url.replace('https:', 'http:')],
    ['https://www.sujeetkhadka.com.np/?v=release'],
    ['https://www.sujeetkhadka.com.np/login/?v=release'],
    ['https://www.sujeetkhadka.com.np/cdn-cgi/rum?v=release'],
    [url, {}, 404], [url, {}, 500], [url, { 'Set-Cookie': 'session=private' }],
    [url, { 'Cache-Control': 'private, max-age=60' }], [url, { 'Cache-Control': 'no-store' }],
    [url, { 'Cache-Control': 'no-cache' }], [url, { 'Content-Type': 'text/html' }],
    [url, { 'Content-Type': 'application/json' }], [url, {}, 200, 'POST']
  ];
  for (const [target, headers = {}, status = 200, method = 'GET'] of cases) {
    const result = response(headers, status), original = result.headers.get('Cache-Control');
    applyAssetCache(new Request(target, { method }), result);
    assert.equal(result.headers.get('Cache-Control'), original, target);
  }
});

test('the security Worker applies cache policy without losing body or security headers', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => response({ 'Content-Type': 'image/webp' });
    const result = await worker.fetch(new Request(url));
    assert.equal(result.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
    assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(await result.text(), 'asset');
  } finally { globalThis.fetch = original; }
});

test('requests carrying authorization never receive the public immutable policy', () => {
  const result = response();
  applyAssetCache(new Request(url, { headers: { Authorization: 'Bearer test-only' } }), result);
  assert.equal(result.headers.get('Cache-Control'), originPolicy);
});
