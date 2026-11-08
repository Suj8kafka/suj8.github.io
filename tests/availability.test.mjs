import test from 'node:test';
import assert from 'node:assert/strict';
import { availabilityView, validateAvailability, applyAvailability, DEFAULT_AVAILABILITY } from '../assets/js/availability.js';

test('badge and hover details reflect the selected work types', () => {
  const view = availabilityView({ ...DEFAULT_AVAILABILITY,
    workTypes: { freelance: true, projects: true, fullTime: false, contract: false } });
  assert.equal(view.label, 'Open to work');
  assert.equal(view.details, 'Open to freelance work and project work.');
  assert.equal(view.engagement, 'Open to freelance and project work.');
  assert.ok(!view.details.includes('full-time'));
});

test('closed availability does not advertise selected work types', () => {
  const view = availabilityView({ ...DEFAULT_AVAILABILITY, status: 'closed', note: 'Back in January.' });
  assert.equal(view.label, 'Not taking work');
  assert.equal(view.details, 'Not currently taking new work.');
  assert.equal(view.note, 'Back in January.');
});

test('validates length, status and work types before saving', () => {
  for (const change of [
    { status: '__proto__' }, { status: 'anything' }, { label: 'x'.repeat(25) },
    { note: 'x'.repeat(161) }, { workTypes: {} }, { label: null },
    { workTypes: { freelance: false, projects: false, fullTime: false, contract: false } }
  ]) assert.throws(() => validateAvailability({ ...DEFAULT_AVAILABILITY, ...change }));
  assert.doesNotThrow(() => validateAvailability({ ...DEFAULT_AVAILABILITY, status: 'closed',
    workTypes: { freelance: false, projects: false, fullTime: false, contract: false } }));
});

test('normalizes editor input without mutating existing settings', () => {
  const input = { ...DEFAULT_AVAILABILITY, label: '  Booking projects  ', note: '  Two slots available.  ' };
  const normalized = validateAvailability(input);
  assert.equal(normalized.label, 'Booking projects');
  assert.equal(normalized.note, 'Two slots available.');
  normalized.workTypes.contract = false;
  assert.equal(DEFAULT_AVAILABILITY.workTypes.contract, true);
});

test('applies text safely and only updates the supplied preview or document scope', () => {
  const label = { textContent: '', innerHTML: 'unchanged' };
  const details = { textContent: '', innerHTML: 'unchanged' };
  const engagement = { textContent: '', dataset: {} };
  const badge = { dataset: {} };
  const scope = { querySelectorAll: selector => ({
    '[data-availability-label]': [label], '[data-availability-details]': [details],
    '[data-availability-engagement]': [engagement], '.availability-badge': [badge]
  })[selector] };
  applyAvailability(scope, { ...DEFAULT_AVAILABILITY, label: '<b>Available</b>', note: '<img src=x onerror=alert(1)>' });
  assert.equal(label.textContent, '<b>Available</b>');
  assert.ok(details.textContent.includes('<img src=x onerror=alert(1)>'));
  assert.equal(label.innerHTML, 'unchanged');
  assert.equal(details.innerHTML, 'unchanged');
  assert.ok(engagement.textContent.includes('full-time'));
  assert.equal(engagement.dataset.availabilityStatus, 'open');
  assert.ok(!engagement.textContent.includes('<img'));
  assert.equal(badge.dataset.availabilityStatus, 'open');
  applyAvailability(scope, { ...DEFAULT_AVAILABILITY, status: 'closed' });
  assert.equal(engagement.dataset.availabilityStatus, 'closed');
  assert.equal(engagement.textContent, 'Not currently taking new work.');
});
