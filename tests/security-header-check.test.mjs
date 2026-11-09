import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSecurityHeaders, defaultTargets } from '../scripts/check-security-headers.mjs';
import { securityHeaders } from '../cloudflare/security-headers.mjs';

const response = (status = 200, extra = {}) => new Response(null, { status, headers: { ...securityHeaders, ...extra } });
const target = 'https://www.sujeetkhadka.com.np/';

test('default audit covers both hostnames, login, a missing page and HTTP upgrades', async () => {
  assert.equal(defaultTargets.length, 8);
  const seen = [];
  const result = await auditSecurityHeaders({ fetchImpl: async (url, options) => {
    seen.push(url);
    assert.equal(options.method, 'HEAD'); assert.equal(options.redirect, 'manual');
    if (url.startsWith('http:')) return new Response(null, { status: 308, headers: { Location: url.replace('http:', 'https:') } });
    return response(url.includes('not-found') ? 404 : 200);
  } });
  assert.equal(result.ok, true);
  for (const url of defaultTargets) assert.ok(seen.includes(url));
});

test('missing and misconfigured headers fail without exposing response bodies', async () => {
  const headers = { ...securityHeaders, 'X-Frame-Options': 'SAMEORIGIN' };
  delete headers['Content-Security-Policy'];
  const result = await auditSecurityHeaders({ targets: [target], fetchImpl: async () => new Response('private body', { headers }) });
  assert.equal(result.ok, false);
  assert.deepEqual(result.checks[0].issues, ['Missing Content-Security-Policy', 'Unexpected X-Frame-Options']);
  assert.equal(JSON.stringify(result).includes('private body'), false);
});

test('each HTTPS redirect hop must have the policy, including redirects to relative locations', async () => {
  const result = await auditSecurityHeaders({ targets: [target], fetchImpl: async url => url === target
    ? new Response(null, { status: 301, headers: { Location: '/login/' } }) : response() });
  assert.equal(result.checks.length, 2);
  assert.equal(result.checks[1].url, `${target}login/`);
  assert.equal(result.checks[1].issues.length, 0);
  assert.equal(result.ok, false);
});

test('HTTPS downgrades are rejected before following them', async () => {
  let calls = 0;
  const result = await auditSecurityHeaders({ targets: [target], fetchImpl: async () => {
    calls++; return response(302, { Location: 'http://www.sujeetkhadka.com.np/' });
  } });
  assert.equal(calls, 1);
  assert.deepEqual(result.checks[0].issues, ['Redirect must use HTTPS']);
});

test('HTTP requires an immediate HTTPS upgrade but not HSTS on the HTTP response', async () => {
  const pass = await auditSecurityHeaders({ targets: ['http://www.sujeetkhadka.com.np/'], fetchImpl: async url => url.startsWith('http:')
    ? new Response(null, { status: 308, headers: { Location: target } }) : response() });
  assert.equal(pass.ok, true);
  const fail = await auditSecurityHeaders({ targets: ['http://www.sujeetkhadka.com.np/'], fetchImpl: async () => response() });
  assert.deepEqual(fail.checks[0].issues, ['HTTP must redirect to HTTPS']);
});

test('network errors, missing redirect locations, loops and excessive hops fail finitely', async () => {
  for (const fetchImpl of [async () => { throw new Error('network'); }, async () => response(302), async () => response(302, { Location: target })]) {
    const result = await auditSecurityHeaders({ targets: [target], fetchImpl });
    assert.equal(result.ok, false);
  }
  let calls = 0;
  const result = await auditSecurityHeaders({ targets: [target], maxRedirects: 2, fetchImpl: async () => response(302, { Location: `/hop-${++calls}` }) });
  assert.equal(calls, 3);
  assert.deepEqual(result.checks.at(-1).issues, ['Too many redirects']);
});
