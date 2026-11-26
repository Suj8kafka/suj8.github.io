import { findFooterStop, planFooterRoute } from './footer-character-route.js';

// Layout is measured only on startup, resizing, font completion and resumption.
export function measureFooterScene({ document, window, footer }) {
  const inner = footer.querySelector('.footer-inner');
  const bounds = inner?.getBoundingClientRect();
  if (!bounds?.width || !bounds.height) return null;
  const relative = node => {
    const rect = node?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    let left = rect.left, right = rect.right;
    if (node.matches?.('.footer-name, .footer-description, .footer-details > p, .footer-contact span, .footer-colophon > span') && document.createRange) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const text = range.getBoundingClientRect();
      if (text.width) { left = text.left; right = text.right; }
    }
    return { left: left - bounds.left, right: right - bounds.left, top: rect.top - bounds.top, bottom: rect.bottom - bounds.top };
  };
  const solid = [...footer.querySelectorAll('a, .footer-box-stage, .footer-motion-toggle')].map(relative).filter(Boolean);
  const scenery = [...footer.querySelectorAll('.footer-name, .footer-description, .footer-details > p, .footer-contact span, .footer-colophon > span')].map(relative).filter(Boolean);
  const obstacles = [...solid, ...scenery];
  const rects = Object.fromEntries([['artwork', '.footer-box-stage'], ['name', '.footer-first-name'], ['surname', '.footer-last-name'], ['contact', '.footer-contact'], ['inquiry', '.footer-inquiry'], ['navigation', '.footer-nav'], ['links', '.footer-profiles'], ['credits', '.footer-colophon']].map(([name, selector]) => [name, relative(footer.querySelector(selector))]));
  if (!rects.artwork) return null;
  const rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
  const size = (parseFloat(window.getComputedStyle(footer).getPropertyValue('--footer-tile-height')) || 178) + 4 * rem;
  const home = { x: Math.max(size / 4 + 8, rects.artwork.left - size / 3.4), y: size, size };
  const stops = { home, artwork: home };
  for (const name of ['name', 'contact', 'inquiry', 'navigation', 'credits', 'surname', 'links']) {
    const rect = rects[name];
    if (!rect) continue;
    stops[name] = findFooterStop({ target: { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }, width: bounds.width, height: bounds.height, obstacles, occupied: Object.values(stops).filter(Boolean) });
  }
  return { width: bounds.width, height: bounds.height, obstacles, solid, rects, stops };
}

// Standing holds use one timeout. Only top-view journeys request animation frames.
export function createFooterCharacter({ document, window, measure = measureFooterScene }) {
  const footer = document.querySelector('.portfolio-footer');
  const actor = footer?.querySelector?.('[data-footer-character]');
  const sprite = actor?.querySelector?.('.footer-character-sprite');
  const sheet = actor?.querySelector?.('.footer-character-sheet');
  const overhead = actor?.querySelector?.('.footer-character-overhead-sheet');
  const button = actor?.querySelector?.('.footer-character-control');
  const message = actor?.querySelector?.('.footer-character-message');
  if (!sprite || !sheet || !overhead || !button || !message) return { setRunning() {}, destroy() {} };

  const listeners = [], variants = new Map();
  const tour = ['name', 'inquiry', 'navigation', 'credits', 'links', 'contact', 'surname', 'artwork', 'home'];
  const properties = ['--character-x', '--character-y', '--character-size', '--character-camera-scale', '--character-heading'];
  const spriteProperties = ['--character-column', '--character-row', '--character-facing'];
  let scene, location, currentSize = 242, currentView = 'standing';
  let wanted = false, running = false, destroyed = false, started = false, focusedHold = false;
  let ready = sheet.complete && sheet.naturalWidth > 0, overheadReady = overhead.complete && overhead.naturalWidth > 0;
  let timer = 0, frame = 0, deadline = 0, remaining = 0, elapsed = 0, previous = null, lastPaint = -Infinity;
  let queue = [], cursor = 0, destination = 'home', pending = null, tourIndex = 0;
  const now = () => window.performance.now();
  const listen = (target, name, callback) => {
    target?.addEventListener?.(name, callback);
    listeners.push(() => target?.removeEventListener?.(name, callback));
  };
  const pose = (index, duration, extra = {}) => ({ kind: 'pose', index, duration, view: 'standing', ...extra });
  function cancelClock() {
    window.clearTimeout(timer); window.cancelAnimationFrame(frame);
    timer = 0; frame = 0; previous = null;
  }
  function refresh() {
    if (destroyed || !running) return;
    const next = measure({ document, window, footer, actor });
    if (!next) return;
    const changed = scene && (scene.width !== next.width || scene.height !== next.height);
    scene = next;
    if (!location || changed) {
      location = { ...scene.stops.home };
      currentSize = scene.stops.home.size;
      if (started) { destination = 'home'; play(reactions('home')); }
    }
    return Boolean(changed);
  }
  function setPosition(point) {
    location = { ...location, x: point.x, y: point.y };
    actor.style.setProperty('--character-x', point.x + 'px');
    actor.style.setProperty('--character-y', point.y + 'px');
  }
  function setCameraScale(requested = 1) {
    const margin = Math.min(location.x, scene.width - location.x, location.y, scene.height - location.y);
    actor.style.setProperty('--character-camera-scale', currentView === 'overhead' ? Math.min(requested, margin / 32) : requested);
  }
  function render(step) {
    currentView = step.view || 'standing';
    actor.dataset.characterView = currentView;
    actor.dataset.characterState = step.state || (currentView === 'overhead' ? 'travelling' : 'inspecting');
    actor.dataset.characterTarget = destination;
    actor.dataset.characterActive = 'true';
    setCameraScale(step.scale ?? 1);
    if (step.size) currentSize = step.size;
    actor.style.setProperty('--character-size', currentSize + 'px');
    setPosition(location);
    if (currentView === 'standing') {
      sprite.style.setProperty('--character-column', step.index % 4);
      sprite.style.setProperty('--character-row', Math.floor(step.index / 4));
      sprite.style.setProperty('--character-facing', step.facing || 1);
    }
    message.textContent = step.message || '';
    button.hidden = !running || currentView !== 'standing';
  }
  function reactions(target, at = location) {
    const variant = variants.get(target) || 0;
    variants.set(target, variant + 1);
    const rect = scene?.rects[target], facing = rect && (rect.left + rect.right) / 2 < at.x ? -1 : 1;
    const gesture = (index, duration, extra = {}) => pose(index, duration, { state: 'inspecting', facing: index === 18 ? -facing : facing, ...extra });
    const above = rect && (rect.top + rect.bottom) / 2 < at.y - (at.size || currentSize) / 2;
    if (target === 'home') return [pose(4, 13000, { state: 'thinking' }), pose(15, 9000, { state: 'thinking' }), pose(18, 2800, { state: 'thinking' }), pose(4, 8000, { state: 'thinking' })];
    if (target === 'artwork') return variant % 3 === 0
      ? [gesture(4, 5000), gesture(12, 2800), gesture(13, 3500), gesture(14, 3500), gesture(13, 1800), gesture(15, 7000)]
      : variant % 3 === 1 ? [gesture(4, 4000), gesture(6, 2400), gesture(12, 2600), gesture(14, 3600), gesture(13, 3000), gesture(15, 7000)]
        : [gesture(5, 2000, { message: 'Oh!' }), gesture(6, 2500), gesture(12, 2500), gesture(13, 3500), gesture(14, 3000), gesture(4, 7500)];
    if (target === 'name' || target === 'surname') return variant % 2 === 0
      ? [gesture(18, 2500), gesture(4, 5000), gesture(14, 3500), gesture(above ? 12 : 17, 2800), gesture(13, 3500), gesture(18, 2000), gesture(15, 6500)]
      : [gesture(4, 6000), gesture(14, 3500), gesture(13, 3000), gesture(above ? 12 : 17, 2800), gesture(18, 2400), gesture(15, 7000)];
    if (target === 'contact' || target === 'inquiry') return variant % 2 === 0
      ? [gesture(4, 5000), above ? gesture(12, 3000) : gesture(16, 3000, { facing: facing === 1 ? -1 : 1 }), gesture(14, 3000), gesture(19, 2000), gesture(7, 2000, { facing: 1 }), gesture(4, 6500)]
      : [gesture(15, 6500), gesture(14, 3200), gesture(12, 2800), gesture(6, 2600), gesture(19, 1800), gesture(4, 7000)];
    if (target === 'credits') return [gesture(4, 7000), gesture(18, 3000), gesture(14, 3000), gesture(19, 2400), gesture(15, 8000)];
    return variant % 2 === 0
      ? [gesture(4, 4500), gesture(above ? 12 : 17, 3000), gesture(18, 2500), gesture(14, 3000), gesture(13, 3200), gesture(5, 1400), gesture(15, 6500)]
      : [gesture(4, 5500), gesture(above ? 12 : 17, 2800), gesture(14, 3500), gesture(13, 3200), gesture(18, 2400), gesture(4, 7500)];
  }
  function play(steps) {
    cancelClock();
    queue = steps; cursor = 0; elapsed = 0; focusedHold = false;
    if (running) advance();
    else { render(queue[0]); remaining = queue[0].duration; }
  }
  function visit(target) {
    if (!scene || !location) return;
    const stop = scene.stops[target];
    if (!stop) { play(reactions('home')); return; }
    destination = target;
    if (!overheadReady || Math.hypot(stop.x - location.x, stop.y - location.y) < 8) {
      play(reactions(target)); return;
    }
    const args = { from: location, to: stop, width: scene.width, height: scene.height, radius: 22 };
    const path = planFooterRoute({ ...args, obstacles: scene.obstacles });
    const route = path.length ? path : planFooterRoute({ ...args, obstacles: scene.solid });
    if (!route.length) { play(reactions(target)); return; }
    const departure = currentView === 'standing' ? [
      pose(4, 220, { state: 'departing', scale: .8 }),
      pose(4, 220, { state: 'departing', scale: .5 })
    ] : [];
    const journey = route.slice(1).map((to, index) => ({
      kind: 'move', view: 'overhead', from: { x: route[index].x, y: route[index].y }, to: { x: to.x, y: to.y },
      duration: Math.max(700, Math.hypot(to.x - route[index].x, to.y - route[index].y) / .055)
    }));
    play([...departure, ...journey,
      pose(4, 220, { view: 'overhead', state: 'arriving', scale: .8 }),
      pose(4, 220, { state: 'arriving', size: stop.size, scale: .65 }),
      ...reactions(target, stop)
    ]);
  }
  function finish() {
    if (document.activeElement === button) {
      focusedHold = true;
      render(pose(7, 0, { state: 'idle' }));
      return;
    }
    if (pending) { const target = pending; pending = null; visit(target); return; }
    const target = tour[tourIndex++ % tour.length];
    visit(target);
  }
  function schedule(duration) {
    remaining = duration; deadline = now() + duration;
    timer = window.setTimeout(() => { timer = 0; if (running && !destroyed) { cursor++; elapsed = 0; advance(); } }, duration);
  }
  function tick(time) {
    frame = 0;
    if (!running || destroyed) return;
    const step = queue[cursor];
    if (previous !== null) elapsed += Math.min(time - previous, 100);
    previous = time;
    if (time - lastPaint >= 1000 / 30 || elapsed >= step.duration) {
      lastPaint = time;
      const fraction = Math.min(1, elapsed / step.duration);
      const progress = fraction * fraction * (3 - 2 * fraction);
      setPosition({ x: step.from.x + (step.to.x - step.from.x) * progress, y: step.from.y + (step.to.y - step.from.y) * progress });
      setCameraScale();
      actor.style.setProperty('--character-heading', Math.atan2(step.to.x - step.from.x, step.from.y - step.to.y) * 180 / Math.PI + 'deg');
      const index = Math.floor(elapsed / 220) % 4;
      overhead.style.setProperty('--overhead-column', index % 2);
      overhead.style.setProperty('--overhead-row', Math.floor(index / 2));
    }
    if (elapsed >= step.duration) { cursor++; elapsed = 0; previous = null; advance(); }
    else frame = window.requestAnimationFrame(tick);
  }
  function advance() {
    const step = queue[cursor];
    if (!step) { finish(); return; }
    if (step.kind === 'move') {
      render({ index: 0, view: 'overhead', state: 'travelling' });
      previous = null; lastPaint = -Infinity;
      frame = window.requestAnimationFrame(tick);
    } else { render(step); schedule(step.duration); }
  }
  function update() {
    if (destroyed) return;
    const active = wanted && ready;
    if (active === running) return;
    running = active;
    if (running) {
      const reset = refresh();
      if (!scene) { running = false; return; }
      if (overhead.dataset.src && !overhead.getAttribute('src')) overhead.setAttribute('src', overhead.dataset.src);
      if (reset && started) return;
      if (!started) {
        started = true; currentSize = scene.stops.home.size;
        play([pose(4, 12000, { state: 'thinking', size: currentSize })]);
      } else if (focusedHold) {
        if (document.activeElement === button) render(pose(7, 0, { state: 'idle' }));
        else { focusedHold = false; finish(); }
      }
      else if (queue[cursor]?.kind === 'move') advance();
      else { render(queue[cursor]); schedule(remaining); }
    } else {
      if (timer) remaining = Math.max(0, deadline - now());
      cancelClock();
      button.hidden = true;
    }
  }
  function greet(event) {
    if (!running || destroyed || currentView !== 'standing' || actor.dataset.characterState === 'greeting' || event?.pointerType === 'touch' && event.type === 'pointerenter') return;
    const wave = [8, 9, 10, 11];
    play([pose(7, 300, { state: 'greeting', message: 'Hi!' }),
      ...Array.from({ length: 12 }, (_, index) => pose(wave[index % 4], 220, { state: 'greeting', message: 'Hi!' })),
      pose(7, 1000, { state: 'greeting' }), pose(4, 6000, { state: 'thinking' })]);
  }
  function requestVisit(target, event) {
    if (!running || destroyed || event?.pointerType === 'touch') return;
    // Keep the current journey and full reaction; coalesce interest in other landmarks.
    pending = target;
  }
  listen(button, 'pointerenter', greet); listen(button, 'focus', greet); listen(button, 'click', greet);
  listen(button, 'blur', () => { if (running && focusedHold) { focusedHold = false; finish(); } });
  for (const [selector, target] of [['.footer-box-stage', 'artwork'], ['.footer-first-name', 'name'], ['.footer-last-name', 'surname'], ['.footer-contact', 'contact'], ['.footer-inquiry', 'inquiry'], ['.footer-nav', 'navigation'], ['.footer-profiles', 'links'], ['.footer-colophon', 'credits']]) {
    const element = footer.querySelector(selector);
    listen(element, 'pointerenter', event => requestVisit(target, event));
    listen(element, 'focusin', event => requestVisit(target, event));
  }
  listen(sheet, 'load', () => { ready = sheet.naturalWidth > 0; update(); });
  listen(sheet, 'error', () => { ready = false; update(); });
  listen(overhead, 'load', () => { overheadReady = overhead.naturalWidth > 0; });
  listen(overhead, 'error', () => { overheadReady = false; if (running && currentView === 'overhead') { location = { ...scene.stops.home }; currentSize = scene.stops.home.size; destination = 'home'; play(reactions('home')); } });
  const observer = window.ResizeObserver ? new window.ResizeObserver(refresh) : null;
  observer?.observe(footer.querySelector('.footer-inner'));
  for (const node of footer.querySelectorAll('.footer-motion-toggle, .footer-box-stage, .footer-first-name, .footer-last-name, .footer-contact, .footer-nav, .footer-profiles, .footer-colophon, .footer-inquiry')) observer?.observe(node);
  if (!observer) listen(window, 'resize', refresh);
  listen(document.fonts, 'loadingdone', refresh);
  return {
    setRunning(value) { wanted = Boolean(value); update(); },
    destroy() {
      destroyed = true; running = false; cancelClock();
      observer?.disconnect(); listeners.forEach(remove => remove());
      properties.forEach(name => actor.style.removeProperty(name));
      spriteProperties.forEach(name => sprite.style.removeProperty(name));
      overhead.style.removeProperty('--overhead-column'); overhead.style.removeProperty('--overhead-row');
      for (const name of ['characterActive', 'characterView', 'characterTarget']) delete actor.dataset[name];
      actor.dataset.characterState = 'thinking'; message.textContent = ''; button.hidden = true;
    }
  };
}
