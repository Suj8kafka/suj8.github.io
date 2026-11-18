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

test('an origin connection failure still returns all six headers without exposing error details', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('private origin connection details'); };
  try {
    const response = await worker.fetch(new Request('https://www.sujeetkhadka.com.np/'));
    assert.equal(response.status, 502);
    for (const [name, value] of Object.entries(securityHeaders)) assert.equal(response.headers.get(name), value);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await response.text(), /private origin/);
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
  const bareInlineScripts = [...html.matchAll(/<script\s*>([\s\S]*?)<\/script>/gi)];
  assert.equal(bareInlineScripts.length, 1);
  assert.match(bareInlineScripts[0][1], /window\.dataLayer/);
  assert.match(html, /src="assets\/js\/intro-video\.js(?:\?[^"\s]+)?"/);
  assert.ok(csp.includes('wss://*.asia-southeast1.firebasedatabase.app'));
  assert.ok(csp.includes('https://www.googletagmanager.com'));
  assert.ok(csp.includes('https://*.google-analytics.com'));
  assert.ok(securityHeaders['Permissions-Policy'].includes('geolocation=(self)'));
});

test('preserved source websites download as non-crawlable text while other downloads remain noindex', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('preserved content', { headers:{ 'Content-Type':'text/html' } });
  try {
    for (const path of ['/Blogpage', '/Blogpage/Blogpage/index.html', '/%42logpage/index.html', '/archive/legacy-homepage.html',
      '/assets/documents/blog/source-pages/index.html']) {
      const response = await worker.fetch(new Request(`https://www.sujeetkhadka.com.np${path}`));
      assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow', path);
      assert.equal(response.headers.get('Content-Type'), 'text/plain; charset=utf-8', path);
      assert.equal(response.headers.get('Content-Disposition'), 'attachment', path);
      assert.equal(await response.text(), 'preserved content');
      assert.equal(response.status, 200);
    }
    const download = await worker.fetch(new Request('https://www.sujeetkhadka.com.np/assets/documents/blog/original-blog-source.zip'));
    assert.equal(download.headers.get('X-Robots-Tag'), 'noindex, follow');
    assert.equal(download.headers.get('Content-Disposition'), null);
    for (const path of ['/', '/blog/', '/blog/carrom-karrom/', '/blog/archive/', '/docs/sujeet-khadka-cv-2026.pdf', '/archive-work/']) {
      const response = await worker.fetch(new Request(`https://www.sujeetkhadka.com.np${path}`));
      assert.equal(response.headers.get('X-Robots-Tag'), null, path);
    }
  } finally { globalThis.fetch = originalFetch; }
});
