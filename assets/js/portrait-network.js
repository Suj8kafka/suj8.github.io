const SVG_NS = 'http://www.w3.org/2000/svg';

export function monochromeFill(fill) {
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(fill || '')) return null;
  const hex = fill.length === 4 ? [...fill.slice(1)].map(value => value + value).join('') : fill.slice(1);
  const channels = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  const gray = Math.round(channels.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0));
  return `rgb(${gray}, ${gray}, ${gray})`;
}

// Sequence the artwork's own shapes by position, without overlay tiles or animation timers.
export function portraitWave(parts, origin, viewBox) {
  const point = {
    x: Math.max(viewBox.x, Math.min(viewBox.x + viewBox.width, origin.x)),
    y: Math.max(viewBox.y, Math.min(viewBox.y + viewBox.height, origin.y))
  };
  const distances = parts.map(part => Math.hypot(part.x - point.x, part.y - point.y));
  const min = Math.min(...distances), range = Math.max(1, Math.max(...distances) - min);
  return parts.map((part, index) => {
    // Tint large background shapes slowly so the smaller details remain perceptible.
    if (part.width * part.height > viewBox.width * viewBox.height * .45) {
      return { delay: 160, duration: 1450, fillLead: 100, outlineDuration: 1600 };
    }
    const phase = (distances[index] - min) / range;
    const variation = ((index * 17) % 37) - 18;
    return { delay: Math.max(0, Math.min(1120, Math.round(phase * 1100 + variation))),
      duration: 650, fillLead: 100, outlineDuration: 850 };
  });
}

function importArtwork(document, window, source) {
  const parsed = new window.DOMParser().parseFromString(source, 'image/svg+xml');
  const root = parsed.documentElement;
  if (root.localName !== 'svg' || parsed.querySelector('parsererror')) throw new Error('Invalid portrait SVG.');
  const allowed = new Set(['svg', 'g', 'path', 'defs', 'clipPath', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'title', 'desc']);
  for (const element of [...root.querySelectorAll('*')]) {
    if (element.namespaceURI !== SVG_NS || !allowed.has(element.localName)) element.remove();
  }
  const elements = [root, ...root.querySelectorAll('*')];
  const ids = new Map(elements.filter(element => element.id).map(element => [element.id, `hero-portrait-${element.id}`]));
  elements.forEach(element => {
    [...element.attributes].forEach(attribute => {
      if (/^on/i.test(attribute.name) || ['style', 'href', 'xlink:href'].includes(attribute.name)) {
        element.removeAttribute(attribute.name);
        return;
      }
      let value = attribute.value;
      ids.forEach((replacement, id) => { value = value.replaceAll(`url(#${id})`, `url(#${replacement})`); });
      if (attribute.name === 'id') value = ids.get(value);
      element.setAttribute(attribute.name, value);
    });
  });
  const svg = document.importNode(root, true);
  svg.setAttribute('class', 'portrait-color-network portrait-path-art');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

export function createPortraitNetwork({ document, window }) {
  const frame = document.querySelector('.portrait-frame');
  const mount = frame?.querySelector('.portrait-vector-mount');
  const image = frame?.querySelector('.portrait-base');
  const control = frame?.querySelector('.portrait-reveal-control');
  if (!mount || !image || !control) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const abort = new window.AbortController();
  const listeners = [];
  let svg, parts = [], viewBox, origin;
  let active = false, hovering = false, focused = false, interactive = false, destroyed = false;

  function listen(target, event, callback) {
    target.addEventListener(event, callback);
    listeners.push(() => target.removeEventListener(event, callback));
  }
  function pointFromEvent(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    origin = point.matrixTransform(matrix.inverse());
  }
  function paint(colour, immediate = false) {
    const wave = colour && interactive && !immediate ? portraitWave(parts, origin, viewBox) : null;
    frame.dataset.pieceTransition = immediate ? 'none' : colour ? 'colour' : 'mono';
    parts.forEach((part, index) => {
      const timing = wave?.[index];
      part.element.style.setProperty('--piece-delay', `${timing?.delay || 0}ms`);
      part.element.style.setProperty('--piece-duration', `${timing?.outlineDuration || 600}ms`);
      part.element.style.transitionDelay = `${timing ? timing.delay + timing.fillLead : 0}ms`;
      part.element.style.transitionDuration = `${immediate ? 0 : timing?.duration || 420}ms`;
      part.element.style.fill = colour ? part.colour : part.monochrome;
    });
  }
  function show(value, immediate = false) {
    if (!interactive) value = true;
    if (active === value) return;
    active = value;
    paint(active, immediate || !interactive);
    frame.dataset.networkActive = String(active);
    control.setAttribute('aria-pressed', String(active));
    control.setAttribute('aria-label', active ? 'Show the vector portrait in monochrome' : 'Show the vector portrait in colour');
  }
  function configure() {
    interactive = !motion.matches && hover.matches;
    frame.dataset.networkMode = interactive ? 'interactive' : 'static';
    control.hidden = !interactive;
    hovering = focused = false;
    active = interactive; // Force the initial/preference update, including monochrome.
    show(!interactive, true);
  }

  const ready = (async () => {
    const response = await window.fetch(frame.dataset.vectorSrc || image.currentSrc || image.src, { signal: abort.signal, cache: 'force-cache' });
    if (!response.ok) throw new Error(`Portrait request returned ${response.status}.`);
    const source = await response.text();
    if (destroyed) return;
    svg = importArtwork(document, window, source);
    mount.append(svg);
    const box = svg.viewBox.baseVal;
    viewBox = { x: box.x, y: box.y, width: box.width, height: box.height };
    if (!(box.width > 0 && box.height > 0)) throw new Error('Portrait SVG has no usable viewBox.');
    origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // Read geometry once in SVG coordinates, before writing any path styles.
    parts = [...svg.querySelectorAll('path')].flatMap(element => {
      const colour = element.getAttribute('fill');
      const monochrome = monochromeFill(colour);
      if (!monochrome) return [];
      const bounds = element.getBBox();
      return [{ element, colour, monochrome, x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
        width: bounds.width, height: bounds.height }];
    });
    if (!parts.length) throw new Error('Portrait SVG has no painted paths.');
    parts.forEach(part => {
      part.element.classList.add('portrait-vector-part');
      part.element.style.setProperty('--piece-strength', part.width * part.height > box.width * box.height * .45 ? '.18' : '.58');
    });
    listen(frame, 'pointerenter', event => {
      if (!interactive || event.pointerType !== 'mouse') return;
      pointFromEvent(event); hovering = true; show(true);
    });
    listen(frame, 'pointermove', event => { if (interactive && event.pointerType === 'mouse') pointFromEvent(event); });
    listen(frame, 'pointerleave', () => { hovering = false; if (!focused) show(false); });
    listen(control, 'focus', () => { focused = true; show(true); });
    listen(control, 'blur', () => { focused = false; if (!hovering) show(false); });
    listen(control, 'click', () => show(!active));
    listen(control, 'keydown', event => { if (event.key === 'Escape') show(false); });
    listen(document, 'visibilitychange', () => { if (document.hidden && interactive) show(false); });
    listen(motion, 'change', configure);
    listen(hover, 'change', configure);
    configure();
    frame.dataset.vectorReady = 'true';
  })().catch(error => {
    svg?.remove();
    if (!destroyed) console.warn('Keeping the static vector portrait.', error);
  });

  return { ready, destroy() {
    destroyed = true;
    abort.abort();
    listeners.forEach(remove => remove());
    svg?.remove();
    delete frame.dataset.networkMode; delete frame.dataset.networkActive; delete frame.dataset.vectorReady; delete frame.dataset.pieceTransition;
    control.hidden = true;
  } };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') createPortraitNetwork({ document, window });
