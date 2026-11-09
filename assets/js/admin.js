import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { initializeAuth, browserSessionPersistence, inMemoryPersistence, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import { getDatabase, ref, get, set, serverTimestamp } from './firebase-database.js';
import { firebaseConfig } from './firebase-config.js';
import { DEFAULT_AVAILABILITY, WORK_TYPES, validateAvailability, applyAvailability } from './availability.js';

const $ = id => document.getElementById(id);
const loginForm = $('login-form');
const settingsForm = $('availability-form');
let auth;
let database;
let owner = false;
let revision = 0;
let dirty = false;
let saving = false;

function message(id, text, error = false) {
  $(id).textContent = text;
  $(id).dataset.error = String(error);
}

function authError(error) {
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password': return 'Check your email and password and try again.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait before trying again.';
    case 'auth/network-request-failed': return 'Could not connect. Check your connection and try again.';
    case 'auth/operation-not-allowed': return 'Email and password sign-in has not been enabled yet.';
    default: return 'Sign-in could not be completed. Please try again.';
  }
}

async function read(path) {
  let timeout;
  try {
    return await Promise.race([
      get(ref(database, path)),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Connection timed out')), 10000); })
    ]);
  } finally { clearTimeout(timeout); }
}

function readForm() {
  return validateAvailability({
    status: settingsForm.elements.namedItem('status').value,
    label: settingsForm.elements.namedItem('label').value,
    note: settingsForm.elements.namedItem('note').value,
    workTypes: Object.fromEntries(WORK_TYPES.map(([key]) => [key, settingsForm.elements.namedItem(key).checked]))
  });
}

function fillForm(settings) {
  const valid = validateAvailability(settings);
  for (const key of ['status', 'label', 'note']) settingsForm.elements.namedItem(key).value = valid[key];
  for (const [key] of WORK_TYPES) settingsForm.elements.namedItem(key).checked = valid.workTypes[key];
  applyAvailability($('editor-panel'), valid);
}

function preview() {
  dirty = true;
  try {
    applyAvailability($('editor-panel'), readForm());
    message('save-message', 'Unsaved changes.');
  } catch (error) { message('save-message', error.message, true); }
}
settingsForm.addEventListener('input', preview);
settingsForm.addEventListener('change', preview);

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!auth || !loginForm.reportValidity()) return;
  $('login-submit').disabled = true;
  message('login-message', 'Signing in…');
  try {
    await signInWithEmailAndPassword(auth, $('login-email').value.trim(), $('login-password').value);
  } catch (error) { message('login-message', authError(error), true); }
  finally { $('login-password').value = ''; $('login-submit').disabled = false; }
});

$('password-toggle').addEventListener('click', () => {
  const show = $('login-password').type === 'password';
  $('login-password').type = show ? 'text' : 'password';
  $('password-toggle').textContent = show ? 'Hide password' : 'Show password';
  $('password-toggle').setAttribute('aria-pressed', String(show));
});

$('reset-password').addEventListener('click', async () => {
  if (!auth || !$('login-email').reportValidity()) { $('login-email').focus(); return; }
  $('reset-password').disabled = true;
  try {
    await sendPasswordResetEmail(auth, $('login-email').value.trim());
    message('login-message', 'If an account exists for that email, you’ll receive a password reset link.');
  } catch { message('login-message', 'Could not send a reset request. Please try again later.', true); }
  finally { $('reset-password').disabled = false; }
});

settingsForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving || !owner || !auth.currentUser) return;
  let settings;
  try { settings = readForm(); }
  catch (error) { message('save-message', error.message, true); return; }
  const saveRevision = revision;
  saving = true;
  $('editor-fields').disabled = true;
  message('save-message', 'Saving…');
  try {
    await set(ref(database, 'siteSettings/availability'), { ...settings, updatedAt: serverTimestamp() });
    if (saveRevision === revision && owner) {
      dirty = false;
      message('save-message', 'Saved. Your portfolio will show the updated availability.');
    }
  } catch (error) {
    if (saveRevision === revision) message('save-message', error.code === 'PERMISSION_DENIED'
      ? 'You do not have permission to save. Check editor access and sign in again.'
      : 'Changes were not confirmed. Check your connection before trying again.', true);
  } finally {
    saving = false;
    if (saveRevision === revision && owner) $('editor-fields').disabled = false;
  }
});

async function logout() {
  if (dirty && !window.confirm('Discard your unsaved availability changes?')) return;
  try { await signOut(auth); }
  catch { message('save-message', 'Could not sign out. Please try again.', true); }
}
$('sign-out').addEventListener('click', logout);
$('access-signout').addEventListener('click', logout);
window.addEventListener('beforeunload', event => {
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});

async function userChanged(user) {
  const activeRevision = ++revision;
  const wasSignedIn = !$('editor-panel').hidden || !$('account-access').hidden;
  owner = false;
  dirty = false;
  $('editor-fields').disabled = true;
  $('editor-panel').hidden = true;
  $('login-panel').hidden = false;
  $('account-access').hidden = true;
  $('login-form').hidden = Boolean(user);
  $('reset-password').hidden = Boolean(user);
  if (!user) {
    message('login-message', '');
    if (wasSignedIn) $('login-email').focus();
    return;
  }
  message('login-message', 'Checking editor access…');
  let accessConfirmed = false;
  try {
    const access = await read(`owners/${user.uid}`);
    if (activeRevision !== revision) return;
    if (access.val() !== true) {
      const error = new Error('No editor access');
      error.code = 'editor/not-authorized';
      throw error;
    }
    accessConfirmed = true;
    const availability = await read('siteSettings/availability');
    if (activeRevision !== revision) return;
    fillForm(availability.exists() ? availability.val() : DEFAULT_AVAILABILITY);
    owner = true;
    $('signed-in-email').textContent = user.email || 'Owner';
    $('login-panel').hidden = true;
    $('editor-panel').hidden = false;
    $('editor-fields').disabled = false;
    message('save-message', availability.exists() ? 'Your current published settings.' : 'Save once to publish your first availability settings.');
    $('editor-title').focus({ preventScroll: true });
  } catch (error) {
    if (activeRevision !== revision) return;
    $('account-id').textContent = user.uid;
    $('account-access').hidden = false;
    if (accessConfirmed) {
      message('login-message', 'Your account is authorized, but availability settings could not be loaded.', true);
      $('access-help').textContent = 'Check the saved availability settings and database rules, then reload. Your account ID is:';
    } else if (error.code === 'editor/not-authorized') {
      message('login-message', 'Signed in successfully. This account has not been authorized as an editor yet.', true);
      $('access-help').textContent = 'In Firebase Realtime Database → Data, add this account ID under owners with the boolean value true:';
    } else if (error.code === 'PERMISSION_DENIED' || error.code === 'database/permission-denied') {
      message('login-message', 'Signed in successfully, but database rules are blocking the editor access check.', true);
      $('access-help').textContent = 'Publish the updated database.rules.json, then check the owner entry for this account ID:';
    } else {
      message('login-message', 'Could not reach the database to verify editor access. Check your connection and reload.', true);
      $('access-help').textContent = 'Your permissions have not been determined. Your account ID is:';
    }
  }
}

try {
  // Separate from the site's anonymous visitor app; closing the tab ends the owner session.
  const app = initializeApp(firebaseConfig, 'portfolio-admin');
  auth = initializeAuth(app, { persistence: [browserSessionPersistence, inMemoryPersistence] });
  database = getDatabase(app);
  onAuthStateChanged(auth, user => { userChanged(user); }, () => {
    message('login-message', 'Could not restore your sign-in. Reload and try again.', true);
  });
  document.documentElement.dataset.adminReady = 'true';
  $('login-submit').disabled = false;
  $('reset-password').disabled = false;
} catch {
  document.documentElement.dataset.adminReady = 'true';
  message('login-message', 'Sign-in could not initialize. Reload and try again.', true);
}
