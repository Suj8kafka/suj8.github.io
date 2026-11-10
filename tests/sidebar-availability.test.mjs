import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServices } from '../assets/js/enhancements.js';

test('a Firebase loading failure keeps the independent analytics sidebar available', async context => {
  context.mock.method(console, 'warn', () => {});
  const button = { dataset: { analyticsReady: 'true' } };
  await loadServices({ querySelector: selector => selector === '.live-presence' ? button : null }, {
    presence: () => Promise.reject(new Error('Firebase unavailable')), availability: () => {}
  });
  assert.equal(button.disabled, false);
});
