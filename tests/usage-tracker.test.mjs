import test from 'node:test';
import assert from 'node:assert/strict';
import { createUsageTracker } from '../assets/js/usage-tracker.js';

function harness({ hostname = 'www.sujeetkhadka.com.np', pathname = '/', hidden = false, navigator = {}, observer = true } = {}) {
  const events = new Map(), sent = [], observed = new Set(), intervals = new Map(), frames = new Map();
  let clock = 0, nextId = 1;
  let observerCallback, disconnected = 0;
  function target() {
    return { addEventListener(name, callback) {
      const key = `${this.key}:${name}`, list = events.get(key) || new Set(); list.add(callback); events.set(key, list);
    }, removeEventListener(name, callback) {
      const key = `${this.key}:${name}`, list = events.get(key); list?.delete(callback); if (!list?.size) events.delete(key);
    } };
  }
  const sections = [{ id: 'work', getBoundingClientRect: () => ({ top: 0, bottom: 1000 }) },
    { id: 'contact', getBoundingClientRect: () => ({ top: 1000, bottom: 2000 }) }];
  const document = { ...target(), key: 'document', hidden,
    hasFocus: () => true,
    documentElement: { scrollHeight: 2400, classList: { contains: () => false } },
    referrer: 'https://www.google.com/private/path?email=secret@example.com#secret',
    querySelectorAll: () => sections };
  const window = { ...target(), key: 'window', navigator,
    innerHeight: 800, scrollY: 0, performance: { now: () => clock },
    setInterval(callback) { const id = nextId++; intervals.set(id, callback); return id; },
    clearInterval(id) { intervals.delete(id); },
    requestAnimationFrame(callback) { const id = nextId++; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    location: { hostname, pathname, origin: `https://${hostname}`, href: `https://${hostname}${pathname}?secret=123#private` } };
  if (observer) window.IntersectionObserver = class {
    constructor(callback) { observerCallback = callback; }
    observe(node) { observed.add(node); }
    unobserve(node) { observed.delete(node); }
    disconnect() { observed.clear(); disconnected++; }
  };
  const tracker = createUsageTracker({ document, window, fetch: async (url, options) => {
    sent.push({ url, options, body: JSON.parse(options.body) }); return new Response(null, { status: 204 });
  } });
  const dispatch = (key, event = {}) => [...(events.get(key) || [])].forEach(callback => callback({ type: key.split(':')[1], ...event }));
  return { document, window, tracker, sent, events, sections, observed, dispatch,
    intersect(entries) { observerCallback(entries); }, get disconnected() { return disconnected; },
    advance(ms) { clock += ms; }, paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); } };
}

test('records a known page and only the referral hostname without device storage or URL details', () => {
  const h = harness();
  assert.deepEqual(h.sent[0].body, { type: 'pageview', path: '/', referrer: 'www.google.com', timing: true });
  assert.equal(h.sent[0].options.credentials, 'omit');
  assert.equal(h.sent[0].options.referrerPolicy, 'no-referrer');
  assert.equal(h.sent[0].options.keepalive, true);
  assert.doesNotMatch(JSON.stringify(h.sent), /secret|email=|private\/path/);
  h.tracker.destroy();
  assert.equal(h.events.size, 0);
  assert.equal(h.observed.size, 0);
});

test('skips development, unknown pages and browsers with privacy signals', () => {
  for (const settings of [{ hostname: '127.0.0.1' }, { hostname: 'preview.example' }, { pathname: '/login/' },
    { navigator: { doNotTrack: '1' } }, { navigator: { globalPrivacyControl: true } }]) {
    const h = harness(settings);
    assert.equal(h.sent.length, 0);
    assert.equal(h.events.size, 0);
  }
});

test('a background page waits until visible and does not count visibility or bfcache restoration as new views', () => {
  const h = harness({ hidden: true });
  assert.equal(h.sent.length, 0);
  h.document.hidden = false;
  h.dispatch('document:visibilitychange');
  h.dispatch('document:visibilitychange');
  h.dispatch('window:pagehide', { persisted: true });
  assert.equal(h.observed.size, 0);
  h.dispatch('window:pageshow', { persisted: true });
  assert.equal(h.sent.length, 1);
  assert.equal(h.observed.size, 2);
  h.dispatch('window:pagehide', { persisted: false });
  assert.equal(h.events.size, 0);
});

test('counts section reach once per load, ignores hidden intersections and sends fixed click labels', () => {
  const h = harness();
  const entry = { target: h.sections[0], isIntersecting: true };
  h.document.hidden = true;
  h.intersect([entry]);
  h.document.hidden = false;
  h.intersect([entry, entry]);
  assert.deepEqual(h.sent[1].body, { type: 'section', path: '/', name: 'work' });
  assert.equal(h.sent.length, 2);
  const control = { href: 'mailto:private@example.com?body=secret', matches: selector => selector === 'a[href]', closest: () => null };
  h.dispatch('document:click', { button: 0, target: { closest: () => control } });
  assert.deepEqual(h.sent[2].body, { type: 'interaction', path: '/', name: 'contact-email' });
  h.dispatch('document:click', { button: 0, target: { closest: () => control } });
  assert.equal(h.sent.length, 3, 'rapid duplicate clicks are bounded');
  h.window.navigator.globalPrivacyControl = true;
  h.intersect([{ target: h.sections[1], isIntersecting: true }]);
  assert.equal(h.sent.length, 3);
  h.tracker.destroy();
});

test('works without IntersectionObserver and does not transmit form typing', () => {
  const h = harness({ observer: false, pathname: '/privacy/' });
  assert.equal(h.sent.length, 1);
  assert.equal(h.events.has('document:input'), false);
  h.dispatch('document:keydown', { key: 'private-form-contents' });
  h.dispatch('document:click', { button: 0, target: { closest: () => null } });
  assert.equal(h.sent.length, 1);
  assert.doesNotMatch(JSON.stringify(h.sent), /private-form-contents/);
  h.tracker.destroy();
});

test('final timing is sent when the tab hides, while respecting a newly enabled privacy signal', () => {
  const h = harness();
  h.paint(); h.advance(5000);
  h.document.hidden = true; h.dispatch('document:visibilitychange');
  assert.deepEqual(h.sent.at(-1).body, { type: 'engagement', path: '/', milliseconds: 5000, sections: { work: 5000 } });
  h.document.hidden = false; h.dispatch('document:visibilitychange'); h.paint(); h.advance(5000);
  h.window.navigator.globalPrivacyControl = true;
  h.dispatch('window:pagehide', { persisted: false });
  assert.equal(h.sent.length, 2);
  assert.equal(h.events.size, 0);
});
