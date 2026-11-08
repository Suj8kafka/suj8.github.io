import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_AVAILABILITY, WORK_TYPES, validateAvailability, applyAvailability } from '../assets/js/availability.js';

const source = readFileSync(new URL('../assets/js/admin.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from '[^']+';\s*/gm, '');
const flush = () => new Promise(resolve => setImmediate(resolve));

function editor({ allowed = true, deniedSave = false, accessError = null, settingsError = null } = {}) {
  const nodes = new Map();
  const handlers = new Map();
  const writes = [];
  let authCallback;
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      value: '', checked: false, disabled: false, hidden: false, dataset: {}, type: 'password',
      textContent: '', reportValidity: () => true, focus() {}, setAttribute() {},
      addEventListener: (event, fn) => handlers.set(`${id}:${event}`, fn),
      elements: { namedItem: name => node(`field:${name}`) },
      querySelectorAll: () => []
    });
    return nodes.get(id);
  }
  const auth = { currentUser: null };
  const context = {
    document: { getElementById: node, documentElement: { dataset: {} } },
    window: { confirm: () => true, addEventListener() {} },
    initializeApp: (_, name) => { assert.equal(name, 'portfolio-admin'); return {}; },
    initializeAuth: (_, options) => { assert.equal(options.persistence[0], 'session'); return auth; },
    browserSessionPersistence: 'session', inMemoryPersistence: 'memory',
    firebaseConfig: {}, getDatabase: () => ({}), ref: (_, path) => path,
    get: async path => {
      if (path.startsWith('owners/') && accessError) throw accessError;
      if (path === 'siteSettings/availability' && settingsError) throw settingsError;
      return { exists: () => path.startsWith('owners/') ? allowed : false,
        val: () => path.startsWith('owners/') ? allowed : null };
    },
    set: async (path, data) => { if (deniedSave) throw { code: 'PERMISSION_DENIED' }; writes.push({ path, data }); },
    serverTimestamp: () => 123,
    signInWithEmailAndPassword: async () => {},
    sendPasswordResetEmail: async () => {},
    signOut: async () => {},
    onAuthStateChanged: (_, fn) => { authCallback = fn; },
    DEFAULT_AVAILABILITY, WORK_TYPES, validateAvailability, applyAvailability,
    setTimeout, clearTimeout
  };
  vm.runInNewContext(source, context);
  return { node, writes,
    async signIn() { auth.currentUser = { uid: 'owner-id', email: 'owner@example.com' }; authCallback(auth.currentUser); await flush(); },
    event: (id, event) => handlers.get(`${id}:${event}`)({ preventDefault() {} })
  };
}

test('authorized owner can edit a private preview, then save one scoped availability record', async () => {
  const page = editor();
  await page.signIn();
  assert.equal(page.node('editor-panel').hidden, false);
  assert.equal(page.node('editor-fields').disabled, false);
  page.node('field:label').value = 'Booking projects';
  page.node('field:contract').checked = false;
  page.event('availability-form', 'input');
  assert.equal(page.writes.length, 0);
  await page.event('availability-form', 'submit');
  assert.equal(page.writes.length, 1);
  assert.equal(page.writes[0].path, 'siteSettings/availability');
  assert.equal(page.writes[0].data.label, 'Booking projects');
  assert.equal(page.writes[0].data.workTypes.contract, false);
  assert.equal(page.writes[0].data.updatedAt, 123);
  assert.ok(page.node('save-message').textContent.startsWith('Saved.'));
});

test('an authenticated account without owner authorization cannot save', async () => {
  const page = editor({ allowed: false });
  await page.signIn();
  assert.equal(page.node('editor-panel').hidden, true);
  assert.equal(page.node('editor-fields').disabled, true);
  assert.equal(page.node('account-id').textContent, 'owner-id');
  assert.ok(page.node('login-message').textContent.includes('has not been authorized'));
  await page.event('availability-form', 'submit');
  assert.equal(page.writes.length, 0);
});

test('permission failure is not reported as a successful save', async () => {
  const page = editor({ deniedSave: true });
  await page.signIn();
  await page.event('availability-form', 'submit');
  assert.equal(page.writes.length, 0);
  assert.equal(page.node('save-message').dataset.error, 'true');
  assert.ok(page.node('save-message').textContent.includes('permission'));
  assert.equal(page.node('editor-fields').disabled, false);
});

test('distinguishes blocked rules from missing authorization and a connection failure', async () => {
  const blocked = editor({ accessError: { code: 'PERMISSION_DENIED' } });
  await blocked.signIn();
  assert.ok(blocked.node('login-message').textContent.includes('rules are blocking'));
  const offline = editor({ accessError: new Error('Connection timed out') });
  await offline.signIn();
  assert.ok(offline.node('login-message').textContent.includes('Could not reach the database'));
});

test('settings read failures do not incorrectly report missing owner authorization', async () => {
  const page = editor({ settingsError: new Error('Connection timed out') });
  await page.signIn();
  assert.ok(page.node('login-message').textContent.includes('Your account is authorized'));
  assert.equal(page.node('editor-fields').disabled, true);
});
