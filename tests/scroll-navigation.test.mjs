import test from 'node:test';
import assert from 'node:assert/strict';
import { createScrollNavigation } from '../assets/js/scroll-navigation.js';

function preview({ reduced = false, fine = true, width = 1440, memory = 8, cores = 8, saveData = false, missingContact = false } = {}) {
  let time = 0, sequence = 0;
  const frames = new Map(), timers = new Map(), requests = [], events = [];
  function element() {
    const listeners = new Map(), classes = new Set(), attributes = new Map();
    return {
      style: {}, dataset: {}, target: '',
      classList: { contains: value => classes.has(value), add: value => classes.add(value), remove: value => classes.delete(value),
        toggle(value, present) { if (present) classes.add(value); else classes.delete(value); } },
      addEventListener(name, callback, options) {
        if (!listeners.has(name)) listeners.set(name, new Map());
        listeners.get(name).set(callback, options);
      },
      removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
      dispatch(name, event = {}) {
        for (const [callback, options] of [...(listeners.get(name) || [])]) {
          callback(event); if (options?.once) listeners.get(name).delete(callback);
        }
      },
      setAttribute: (key, value) => attributes.set(key, value),
      hasAttribute: key => attributes.has(key),
      removeAttribute: key => attributes.delete(key),
      append(child) { this.child = child; }, remove() { this.removed = true; },
      querySelector: () => null,
      focus(options) { this.focused = options; },
      closest(selector) { return selector === 'a[href]' ? this : null; },
      matches(selector) { return selector.includes('data-contact-scroll') && (attributes.has('data-contact-scroll') || attributes.has('data-back-to-top')); }
    };
  }
  const root = element(), header = element(), body = element();
  const contact = element(), top = element(), contactHeading = element(), heroHeading = element();
  contact.querySelector = () => contactHeading; top.querySelector = () => heroHeading;
  const contactLink = element(), topLink = element(), otherLink = element();
  contactLink.setAttribute('data-contact-scroll', ''); topLink.setAttribute('data-back-to-top', '');
  const motion = Object.assign(element(), { matches: reduced });
  const pointer = Object.assign(element(), { matches: fine });
  const connection = Object.assign(element(), { saveData });
  const window = Object.assign(element(), {
    scrollY: 0, innerWidth: width, navigator: { deviceMemory: memory, hardwareConcurrency: cores, connection },
    performance: { now: () => time }, CustomEvent: class { constructor(type) { this.type = type; } },
    matchMedia: query => query.includes('reduced-motion') ? motion
      : query.includes('min-width') ? { get matches() { return window.innerWidth > 800; } }
      : query.includes('max-width') ? { get matches() { return window.innerWidth <= 800 || (!fine && window.innerWidth <= 1100); } }
      : pointer,
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, at: time + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    scrollTo(options) { requests.push({ method: 'scrollTo', ...options }); this.scrollY = options.top; }
  });
  contact.scrollIntoView = options => {
    requests.push({ method: 'scrollIntoView', destination: 'contact', ...options });
    if (options.behavior === 'instant') window.scrollY = 5000;
  };
  top.scrollIntoView = options => {
    requests.push({ method: 'scrollIntoView', destination: 'top', ...options });
    if (options.behavior === 'instant') window.scrollY = 0;
  };
  const document = Object.assign(element(), {
    documentElement: root, body, hidden: false, createElement: element,
    querySelector: () => header,
    getElementById: id => id === 'top' ? top : missingContact ? null : contact,
    dispatchEvent(event) { events.push(event.type); this.dispatch(event.type, event); }
  });
  const controller = createScrollNavigation({ document, window });
  function advance(ms = 16) {
    time += ms;
    const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time));
    for (const [id, timer] of [...timers]) if (timer.at <= time) { timers.delete(id); timer.callback(); }
  }
  function click(link = contactLink, overrides = {}) {
    const event = { target: link, button: 0, detail: 1, preventDefault() { this.defaultPrevented = true; }, ...overrides };
    document.dispatch('click', event); return event;
  }
  function scroll(y, ms = 16) { window.scrollY = y; window.dispatch('scroll'); advance(ms); }
  return { controller, root, body, header, document, window, motion, pointer, connection, frames, timers, requests, events,
    contactLink, topLink, otherLink, contactHeading, heroHeading, click, scroll, advance };
}

test('both links use a single native smooth request, without forcing positions or running an idle loop', () => {
  const page = preview();
  assert.equal(page.click().defaultPrevented, true);
  assert.equal(page.root.classList.contains('is-anchor-scrolling'), true);
  for (const y of [200, 600, 1600, 3500, 5000]) page.scroll(y);
  assert.deepEqual(page.requests, [{ method: 'scrollIntoView', destination: 'contact', block: 'start', behavior: 'smooth' }]);
  assert.ok(Number(page.body.child.style.opacity) > 0, 'Blur follows the native scroll speed');
  page.advance(100); page.document.dispatch('scrollend');
  assert.equal(page.root.classList.contains('is-anchor-scrolling'), false);
  assert.equal(page.body.child.style.opacity, '0');
  assert.equal(page.timers.size, 0); assert.equal(page.frames.size, 0);
  page.click(page.topLink);
  page.scroll(0, 120);
  assert.ok(Number(page.body.child.style.opacity) > 0, 'Blur is also visible while returning to the top');
  page.document.dispatch('scrollend');
  assert.equal(page.requests.at(-1).destination, 'top');
  assert.equal(page.requests.at(-1).behavior, 'smooth');
  assert.equal(page.header.classList.contains('is-detached'), false);
  assert.deepEqual(page.events, ['scroll-navigation:start', 'scroll-navigation:end', 'scroll-navigation:start', 'scroll-navigation:end']);
});

test('scroll bursts share one pending frame and settle without scrollend support', () => {
  const page = preview(); page.click();
  for (let i = 0; i < 40; i++) { page.window.scrollY = i * 100; page.window.dispatch('scroll'); }
  assert.equal(page.frames.size, 1);
  page.advance(16); assert.equal(page.frames.size, 0);
  page.advance(180);
  assert.equal(page.root.classList.contains('is-anchor-scrolling'), false);
  assert.equal(page.timers.size, 0);
  assert.equal(page.requests.length, 1);
});

test('device hints and late frames reduce blur rather than silently hiding it', () => {
  for (const options of [{ memory: 4 }, { cores: 2 }, { saveData: true }, { fine: false }, { width: 390 }]) {
    const page = preview(options); page.click(); page.scroll(1200);
    assert.equal(page.root.dataset.scrollEffects, 'light');
    assert.ok(Number(page.body.child.style.opacity) > 0, 'Slower devices still show blur');
    assert.equal(page.body.child.style.transform, undefined);
    assert.equal(page.requests[0].behavior, 'smooth');
    page.advance(180); assert.equal(page.timers.size, 0);
  }
  const adaptive = preview(); adaptive.click();
  adaptive.scroll(500, 50); adaptive.scroll(1000, 50); adaptive.scroll(1500, 50);
  assert.equal(adaptive.root.dataset.scrollEffects, 'light', 'Repeatedly late frames use lighter blur');
  assert.ok(Number(adaptive.body.child.style.opacity) > 0);
  assert.equal(adaptive.requests.length, 1);
});

test('wheel, touch, pointer, navigation keys, hidden pages and other links cancel without a jump or stuck state', () => {
  for (const interrupt of [
    page => page.window.dispatch('wheel'), page => page.window.dispatch('touchmove'),
    page => page.window.dispatch('pointerdown'), page => page.document.dispatch('keydown', { key: 'Escape' }),
    page => page.document.dispatch('keydown', { key: 'Tab' }),
    page => { page.document.hidden = true; page.document.dispatch('visibilitychange'); },
    page => page.window.dispatch('pagehide'), page => page.click(page.otherLink)
  ]) {
    const page = preview(); page.click(undefined, { detail: 0 }); page.scroll(1500); interrupt(page);
    assert.deepEqual(page.requests.at(-1), { method: 'scrollTo', top: 1500, behavior: 'instant' });
    assert.equal(page.root.classList.contains('is-anchor-scrolling'), false);
    assert.equal(page.timers.size, 0);
    assert.equal(page.contactHeading.focused, undefined, 'Cancellation does not steal focus');
    page.advance(5000);
    assert.equal(page.requests.length, 2, 'Old callbacks cannot restart the trip');
  }
});

test('rapid opposite or repeated clicks replace the current trip cleanly', () => {
  const page = preview(); page.click(); page.scroll(2000);
  page.click(page.topLink);
  page.document.dispatch('scrollend'); // Late event from cancelling the old trip.
  assert.equal(page.root.classList.contains('is-anchor-scrolling'), true);
  page.scroll(1000, 100); page.click(page.topLink); page.scroll(0, 100);
  page.document.dispatch('scrollend');
  assert.equal(page.root.classList.contains('is-anchor-scrolling'), false);
  assert.equal(page.timers.size, 0);
  assert.equal(page.requests.at(-1).destination, 'top');
});

test('reduced motion jumps instantly and keyboard arrivals focus the destination without a second scroll', () => {
  const page = preview({ reduced: true });
  assert.equal(page.root.dataset.scrollEffects, 'minimal');
  assert.equal(page.body.child.style.opacity, '0');
  page.click(undefined, { detail: 0 });
  assert.equal(page.requests[0].behavior, 'instant');
  assert.equal(page.root.classList.contains('is-anchor-scrolling'), false);
  assert.deepEqual(page.contactHeading.focused, { preventScroll: true });
  assert.equal(page.contactHeading.hasAttribute('tabindex'), true);
  page.contactHeading.dispatch('blur'); assert.equal(page.contactHeading.hasAttribute('tabindex'), false);
  assert.equal(page.timers.size, 0);
  const toggled = preview(); toggled.click(); toggled.scroll(1200);
  toggled.motion.matches = true; toggled.motion.dispatch('change');
  assert.equal(toggled.requests.at(-1).behavior, 'instant');
  assert.equal(toggled.requests.at(-1).destination, 'contact');
  assert.equal(toggled.root.classList.contains('is-anchor-scrolling'), false);
  assert.equal(toggled.root.dataset.scrollEffects, 'minimal');
  assert.equal(toggled.body.child.style.opacity, '0');
  const keyboard = preview(); keyboard.click(undefined, { detail: 0 }); keyboard.scroll(5000, 150);
  keyboard.document.dispatch('scrollend');
  assert.deepEqual(keyboard.contactHeading.focused, { preventScroll: true });
});

test('modified clicks, missing targets and other anchors retain their normal browser behavior', () => {
  const page = preview();
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { button: 1 }, { shiftKey: true }, { defaultPrevented: true }]) {
    page.click(undefined, options);
  }
  page.click(page.otherLink);
  page.contactLink.target = '_blank'; page.click();
  assert.equal(page.requests.length, 0);
  const missing = preview({ missingContact: true });
  assert.equal(missing.click().defaultPrevented, undefined);
  assert.equal(missing.requests.length, 0);
});

test('same-position clicks settle and destroying an active controller releases timers, frames and listeners', () => {
  const same = preview(); same.click(same.topLink); same.advance(180);
  assert.equal(same.root.classList.contains('is-anchor-scrolling'), false);
  assert.equal(same.timers.size, 0);
  const page = preview(); page.click(); page.window.dispatch('scroll'); page.controller.destroy();
  assert.equal(page.frames.size, 0); assert.equal(page.timers.size, 0);
  assert.equal(page.body.child.removed, true);
  assert.equal(page.root.dataset.scrollEffects, undefined);
  page.click(); page.window.dispatch('scroll');
  assert.equal(page.requests.length, 2); assert.equal(page.frames.size, 0);
});
