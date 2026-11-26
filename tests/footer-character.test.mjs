import test from 'node:test';
import assert from 'node:assert/strict';
import { createFooterCharacter } from '../assets/js/footer-character.js';

function fixture({ loaded = true, overheadLoaded = true } = {}) {
  const target = extra => {
    const listeners = new Map();
    return { listeners, ...extra,
      addEventListener(name, callback) { listeners.set(name, callback); },
      removeEventListener(name) { listeners.delete(name); },
      emit(name, extra = {}) { listeners.get(name)?.({ type: name, ...extra }); }
    };
  };
  const styled = extra => {
    const styles = new Map(), attributes = new Map();
    return target({ ...extra, styles, attributes,
      style: { setProperty(name, value) { styles.set(name, String(value)); }, removeProperty(name) { styles.delete(name); } },
      getAttribute: name => attributes.get(name),
      setAttribute(name, value) { attributes.set(name, value); }
    });
  };
  const sheet = target({ complete: loaded, naturalWidth: loaded ? 1024 : 0 });
  const overhead = styled({ complete: overheadLoaded, naturalWidth: overheadLoaded ? 512 : 0, dataset: { src: 'overhead.webp' } });
  const sprite = styled();
  const button = target({ hidden: true }), message = { textContent: '' };
  const actor = styled({ dataset: { characterState: 'thinking' }, querySelector: selector => ({
    '.footer-character-sprite': sprite, '.footer-character-sheet': sheet,
    '.footer-character-overhead-sheet': overhead, '.footer-character-control': button, '.footer-character-message': message
  })[selector] });
  const inner = {}, box = target(), name = target(), surname = target(), contact = target(), links = target(), inquiry = target(), navigation = target(), credits = target();
  const footer = { querySelector: selector => ({
    '[data-footer-character]': actor, '.footer-inner': inner, '.footer-box-stage': box,
    '.footer-first-name': name, '.footer-last-name': surname, '.footer-contact': contact, '.footer-profiles': links, '.footer-inquiry': inquiry, '.footer-nav': navigation, '.footer-colophon': credits
  })[selector], querySelectorAll: () => [box, name, surname, contact, links, inquiry, navigation, credits] };
  const fonts = target();
  const document = { querySelector: () => footer, fonts, activeElement: null };
  const events = new Map();
  let time = 0, nextId = 0, reads = 0, resize, disconnected = false;
  let scene = {
    width: 1000, height: 600,
    stops: { home: { x: 650, y: 240, size: 240 }, artwork: { x: 650, y: 240, size: 240 },
      name: { x: 450, y: 240, size: 136 }, surname: { x: 650, y: 480, size: 112 }, contact: { x: 820, y: 300, size: 112 }, inquiry: { x: 300, y: 270, size: 96 }, navigation: { x: 220, y: 540, size: 80 }, credits: { x: 450, y: 560, size: 72 }, links: { x: 850, y: 500, size: 136 } },
    rects: { name: { left: 80, right: 380 }, artwork: { left: 780, right: 1000 }, contact: { left: 850, right: 1000 }, inquiry: { left: 100, right: 350, top: 320, bottom: 450 }, links: { left: 800, right: 1000 } },
    obstacles: [{ left: 780, right: 1000, top: 0, bottom: 178 }], solid: [{ left: 780, right: 1000, top: 0, bottom: 178 }]
  };
  const window = target({
    performance: { now: () => time },
    setTimeout(callback, duration) { const id = ++nextId; events.set(id, { at: time + duration, callback, kind: 'timer' }); return id; },
    clearTimeout(id) { events.delete(id); },
    requestAnimationFrame(callback) { const id = ++nextId; events.set(id, { at: time + 16, callback: () => callback(time), kind: 'frame' }); return id; },
    cancelAnimationFrame(id) { events.delete(id); },
    ResizeObserver: class {
      constructor(callback) { resize = callback; }
      observe(node) { assert.ok(node); }
      disconnect() { disconnected = true; }
    }
  });
  function advance(duration) {
    const end = time + duration;
    while (events.size) {
      const [id, event] = [...events].sort((a, b) => a[1].at - b[1].at)[0];
      if (event.at > end) break;
      time = event.at; events.delete(id); event.callback();
    }
    time = end;
  }
  const controller = createFooterCharacter({ document, window, measure() { reads++; return scene; } });
  function until(predicate, duration = 120000) {
    const end = time + duration;
    while (!predicate() && time < end) advance(50);
    assert.ok(predicate(), 'Timed out waiting for character state');
  }
  return { controller, actor, sprite, sheet, overhead, button, message, document, fonts, box, name, surname, contact, links, inquiry, navigation, credits, window, events, advance, until,
    reads: () => reads, resize: () => resize(), disconnected: () => disconnected, setScene: value => { scene = value; }, scene };
}

test('the character waits for its image and starts with a static thought before touring', () => {
  const f = fixture({ loaded: false, overheadLoaded: false });
  f.controller.setRunning(true);
  assert.equal(f.events.size, 0);
  assert.equal(f.overhead.getAttribute('src'), undefined);
  f.sheet.naturalWidth = 1024; f.sheet.emit('load');
  assert.equal(f.actor.dataset.characterState, 'thinking');
  assert.equal(f.overhead.getAttribute('src'), 'overhead.webp');
  assert.equal(f.button.hidden, false);
  assert.equal([...f.events.values()][0].kind, 'timer');
  f.controller.destroy();
});

test('journeys switch to top view, move in both axes, and stand up at different footer stops', () => {
  const f = fixture(); f.controller.setRunning(true); f.advance(12500);
  assert.equal(f.actor.dataset.characterView, 'overhead');
  assert.equal(f.actor.dataset.characterTarget, 'name');
  assert.equal(f.button.hidden, true);
  const x = f.actor.styles.get('--character-x');
  f.advance(400); assert.notEqual(f.actor.styles.get('--character-x'), x);
  f.until(() => f.actor.dataset.characterView === 'standing' && f.actor.dataset.characterState === 'inspecting');
  assert.equal(f.actor.dataset.characterView, 'standing');
  assert.equal(f.actor.styles.get('--character-x'), '450px');
  f.contact.emit('pointerenter');
  f.until(() => f.actor.dataset.characterTarget === 'contact' && f.actor.dataset.characterView === 'overhead');
  f.advance(500);
  assert.equal(f.actor.dataset.characterView, 'overhead');
  assert.notEqual(f.actor.styles.get('--character-y'), '240px');
  f.until(() => f.actor.dataset.characterTarget === 'contact' && f.actor.dataset.characterView === 'standing');
  assert.equal(f.actor.dataset.characterTarget, 'contact');
  assert.equal(f.actor.dataset.characterView, 'standing');
  assert.equal(f.actor.styles.get('--character-x'), '820px');
  f.controller.destroy();
});

test('inspection acts last longer and show several hand gestures before leaving', () => {
  const f = fixture(); f.controller.setRunning(true); f.box.emit('pointerenter');
  f.until(() => f.actor.dataset.characterTarget === 'artwork' && f.actor.dataset.characterState === 'inspecting');
  const poses = new Set();
  for (let time = 0; time < 23000; time += 200) {
    poses.add(Number(f.sprite.styles.get('--character-row')) * 4 + Number(f.sprite.styles.get('--character-column')));
    assert.equal(f.actor.dataset.characterTarget, 'artwork');
    f.advance(200);
  }
  for (const pose of [4, 12, 13, 14, 15]) assert.ok(poses.has(pose), 'Inspection includes pose ' + pose);
  f.controller.destroy();
});

test('the initial contemplation is longer and walking is slower with eased departures', () => {
  const f = fixture(); f.controller.setRunning(true);
  const start = [...f.actor.styles];
  f.advance(11000);
  assert.equal(f.actor.dataset.characterState, 'thinking');
  assert.deepEqual([...f.actor.styles], start);
  f.advance(1500);
  assert.equal(f.actor.dataset.characterView, 'overhead');
  const before = parseFloat(f.actor.styles.get('--character-x'));
  f.advance(1000);
  const travelled = Math.abs(parseFloat(f.actor.styles.get('--character-x')) - before);
  assert.ok(travelled > 0 && travelled < 85, 'A second of travel is a calm step, including easing');
  f.controller.destroy();
});

test('pause freezes travel and pose timers, then resumes without teleporting or remeasuring per frame', () => {
  const f = fixture(); f.controller.setRunning(true); f.advance(12500);
  const position = [...f.actor.styles], reads = f.reads();
  f.advance(100); assert.equal(f.reads(), reads);
  f.controller.setRunning(false);
  const frozen = [...f.actor.styles];
  assert.equal(f.events.size, 0);
  f.advance(5000); assert.deepEqual([...f.actor.styles], frozen);
  f.controller.setRunning(true);
  assert.deepEqual([...f.actor.styles], frozen);
  f.advance(300);
  assert.notDeepEqual([...f.actor.styles], frozen);
  assert.notDeepEqual([...f.actor.styles], position);
  assert.equal(f.reads(), reads + 1);
  f.controller.destroy();
});

test('hover, focus and click wave, with no conversation or automatic movement while keyboard focused', () => {
  for (const event of ['pointerenter', 'focus', 'click']) {
    const f = fixture(); f.controller.setRunning(true);
    if (event === 'focus') f.document.activeElement = f.button;
    f.button.emit(event);
    assert.equal(f.actor.dataset.characterState, 'greeting');
    assert.equal(f.message.textContent, 'Hi!');
    f.advance(600);
    assert.equal(f.sprite.styles.get('--character-row'), '2');
    f.advance(9800);
    assert.notEqual(f.actor.dataset.characterState, 'greeting');
    if (event === 'focus') {
      assert.equal(f.actor.dataset.characterState, 'idle');
      assert.equal(f.events.size, 0);
      f.contact.emit('focusin');
      assert.equal(f.events.size, 0);
      f.document.activeElement = null; f.button.emit('blur');
      assert.equal(f.actor.dataset.characterTarget, 'contact');
    }
    f.controller.destroy();
  }
});

test('new interests queue the latest visit without cutting a journey or reaction short', () => {
  const f = fixture(); f.controller.setRunning(true); f.advance(12500);
  const position = [f.actor.styles.get('--character-x'), f.actor.styles.get('--character-y')];
  let prevented = false;
  f.links.emit('focusin', { preventDefault() { prevented = true; } });
  f.contact.emit('pointerenter');
  assert.equal(f.actor.dataset.characterTarget, 'name');
  assert.deepEqual([f.actor.styles.get('--character-x'), f.actor.styles.get('--character-y')], position);
  assert.equal(prevented, false);
  f.advance(10000);
  assert.equal(f.actor.dataset.characterTarget, 'name', 'The full inspection is still playing');
  f.until(() => f.actor.dataset.characterTarget === 'contact');
  assert.equal(f.actor.dataset.characterView, 'standing', 'The camera eases out before starting the queued walk');
  f.advance(500);
  assert.equal(f.actor.dataset.characterView, 'overhead');
  f.controller.destroy();
});

test('lower footer navigation, surname and credits are independent destinations', () => {
  for (const [key, target] of [['surname', 'surname'], ['navigation', 'navigation'], ['credits', 'credits']]) {
    const f = fixture(); f.controller.setRunning(true);
    f[key].emit('pointerenter');
    f.until(() => f.actor.dataset.characterTarget === target);
    f.until(() => f.actor.dataset.characterView === 'standing' && f.actor.dataset.characterState === 'inspecting');
    assert.equal(f.actor.styles.get('--character-x'), f.scene.stops[target].x + 'px');
    assert.equal(f.actor.styles.get('--character-y'), f.scene.stops[target].y + 'px');
    f.controller.destroy();
  }
});

test('failed overhead images keep standing reactions available and cleanup releases every owned resource', () => {
  const f = fixture({ overheadLoaded: false }); f.controller.setRunning(true);
  f.contact.emit('pointerenter');
  assert.equal(f.actor.dataset.characterView, 'standing');
  assert.ok([...f.events.values()].every(event => event.kind === 'timer'));
  f.button.emit('click'); assert.equal(f.actor.dataset.characterState, 'greeting');
  f.sheet.emit('error'); assert.equal(f.events.size, 0);
  f.sheet.emit('load');
  const lateResize = f.resize, lateLoad = f.overhead.listeners.get('load');
  f.controller.destroy(); lateResize(); lateLoad(); f.controller.setRunning(true); f.advance(60000);
  assert.equal(f.events.size, 0);
  assert.equal(f.actor.styles.size, 0);
  assert.equal(f.sprite.styles.size, 0);
  assert.equal(f.overhead.styles.size, 0);
  assert.equal(f.disconnected(), true);
  assert.equal(f.actor.dataset.characterState, 'thinking');
  for (const node of [f.button, f.sheet, f.overhead, f.box, f.name, f.contact, f.links, f.inquiry, f.surname, f.navigation, f.credits, f.fonts, f.window]) assert.equal(node.listeners.size, 0);
  assert.doesNotThrow(() => createFooterCharacter({ document: { querySelector: () => null }, window: {} }).destroy());
});

test('layout changes restart safely with one clock and do not leave a character outside the footer', () => {
  const f = fixture(); f.controller.setRunning(true); f.advance(12500);
  f.setScene({ ...f.scene, width: 800, stops: { ...f.scene.stops, home: { x: 520, y: 220, size: 216 } } });
  f.resize();
  assert.equal(f.actor.styles.get('--character-x'), '520px');
  assert.equal(f.actor.dataset.characterTarget, 'home');
  assert.equal(f.events.size, 1);
  f.controller.destroy();
});

test('offscreen and paused characters skip layout searches and refresh geometry on resumption', () => {
  const f = fixture();
  f.resize(); f.fonts.emit('loadingdone');
  assert.equal(f.reads(), 0);
  f.controller.setRunning(true);
  assert.equal(f.reads(), 1);
  f.controller.setRunning(false);
  f.setScene({ ...f.scene, width: 800, stops: { ...f.scene.stops, home: { x: 520, y: 220, size: 216 } } });
  f.resize(); f.fonts.emit('loadingdone');
  assert.equal(f.reads(), 1);
  f.controller.setRunning(true);
  assert.equal(f.reads(), 2);
  assert.equal(f.actor.styles.get('--character-x'), '520px');
  f.controller.destroy();
});

test('a paused focus hold resumes touring if hiding the control released focus', () => {
  const f = fixture(); f.controller.setRunning(true);
  f.document.activeElement = f.button; f.button.emit('focus'); f.advance(10400);
  assert.equal(f.actor.dataset.characterState, 'idle');
  f.controller.setRunning(false); f.document.activeElement = null; f.button.emit('blur');
  assert.equal(f.events.size, 0);
  f.controller.setRunning(true);
  assert.ok(f.events.size > 0);
  assert.equal(f.actor.dataset.characterTarget, 'name');
  f.controller.destroy();
});
