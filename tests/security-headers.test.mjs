import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { securityHeaders } from '../cloudflare/security-headers.mjs';

test('adds six security headers to success, error and redirect responses, preserving origin content', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const status of [200, 404, 500, 301]) {
      globalThis.fetch = async () => new Response('origin content', {
        status, headers: { 'Content-Type': 'text/html', Location: '/destination', 'X-Frame-Options': 'SAMEORIGIN' }
      });
      const response = await worker.fetch(new Request('https://www.sujeetkhadka.com.np/'));
      assert.equal(response.status, status);
      assert.equal(await response.text(), 'origin content');
      assert.equal(response.headers.get('Location'), '/destination');
      assert.equal(response.headers.get('Content-Type'), 'text/html');
      assert.equal(Object.keys(securityHeaders).length, 6);
      for (const [name, value] of Object.entries(securityHeaders)) assert.equal(response.headers.get(name), value);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HTTP redirects directly to HTTPS preserving path and query without calling origin', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw Error('Must not call insecure origin'); };
  try {
    const response = await worker.fetch(new Request('http://sujeetkhadka.com.np/work?q=design'));
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('Location'), 'https://sujeetkhadka.com.np/work?q=design');
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('CSP blocks embedding and inline executable scripts while allowing site dependencies', () => {
  const csp = securityHeaders['Content-Security-Policy'];
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(csp.includes("object-src 'none'"));
  const scripts = csp.split('; ').find(value => value.startsWith('script-src '));
  assert.ok(!scripts.includes("'unsafe-inline'"));
  assert.ok(!scripts.includes("'unsafe-eval'"));
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(/<script\s*>/i.test(html), false);
  assert.ok(html.includes('src="assets/js/intro-video.js"'));
  assert.ok(csp.includes('wss://*.asia-southeast1.firebasedatabase.app'));
  assert.ok(securityHeaders['Permissions-Policy'].includes('geolocation=(self)'));
});
