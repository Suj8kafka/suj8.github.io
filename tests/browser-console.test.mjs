import test from 'node:test';
import assert from 'node:assert/strict';
import { redactUrl, redactText, consoleIssues } from '../scripts/check-browser-console.mjs';

test('console reports preserve asset versions while removing URL credentials and tokens', () => {
  assert.equal(redactUrl('https://user:password@example.com/sdk.js?key=private&v=123#secret'), 'https://example.com/sdk.js?v=123');
  assert.equal(redactUrl('https://example.com/collect?token=private'), 'https://example.com/collect');
  assert.equal(redactUrl('https://example.com/api?v=private'), 'https://example.com/api');
  const message = redactText('Failed https://example.com/sdk?key=private and public key AIzaShouldNotAppearInReports');
  assert.ok(!message.includes('private'));
  assert.ok(!message.includes('AIzaShouldNotAppearInReports'));
});

test('console sign-off fails for CSP, preload, runtime and network errors without double-counting CSP failures', () => {
  const issues = consoleIssues({ violations: [{}], logs: [
    { level: 'error', source: 'security', text: 'CSP blocked' },
    { level: 'warning', source: 'other', text: 'The resource was preloaded using link preload but not used within a few seconds.' },
    { level: 'warning', source: 'other', text: 'Unexpected browser warning' },
    { level: 'error', source: 'network', text: 'Failed request' }
  ], failures: [{ reason: 'csp' }, { reason: 'net::ERR_FAILED' }, { reason: 'net::ERR_ABORTED', cancelled: true }], exceptions: ['Uncaught'] });
  assert.deepEqual(issues, { csp: 1, preload: 1, otherWarnings: 1, otherErrors: 1, network: 1, runtime: 1 });
  assert.deepEqual(consoleIssues({}), { csp: 0, preload: 0, otherWarnings: 0, otherErrors: 0, network: 0, runtime: 0 });
});
