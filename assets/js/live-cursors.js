export const CURSOR_COLORS = ['#5f7288', '#796783', '#56776c', '#916c59', '#79764f'];
const LEGACY_COLORS = ['#356dff', '#b045b8', '#237c64', '#bc4d30', '#7161c4'];
const IDLE_MS = 5000;
const FADE_MS = 3000;

export function cursorColor(value) {
  if (CURSOR_COLORS.includes(value)) return value;
  return CURSOR_COLORS[Math.max(0, LEGACY_COLORS.indexOf(value))];
}

export function isRecentCursor(cursor, now) {
  return cursor?.visible === true && typeof cursor.section === 'string'
    && Number.isFinite(cursor.x) && cursor.x >= 0 && cursor.x <= 1
    && Number.isFinite(cursor.y) && cursor.y >= 0 && cursor.y <= 1
    && Number.isFinite(cursor.updatedAt) && Math.abs(now - cursor.updatedAt) < IDLE_MS;
}

// Anchor vertical positions to content; use the viewport width so page gutters are included.
export function createLiveCursors({ document, window, onChange, now, enabled = () => true }) {
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  let cursor = { x: 0, y: 0, section: 'hero', visible: false, updatedAt: 0 };
  let lastPointer = null;
  let layer = null;
  let destroyed = false;
  const nodes = new Map();
  const idleTimers = new Map();
  const allowed = () => !destroyed && enabled() && !motion?.matches;
  const sections = () => [...document.querySelectorAll('main > section[id], main > section.hero')];
  const regions = () => [...document.querySelectorAll('main > section, .site-header, .footer-toolkit, .site-footer')]
    .map((element, index) => ({ element, key: `@${element.id || `region-${index}`}` }));

  function hide() {
    lastPointer = null;
    if (!cursor.visible) return;
    cursor = { ...cursor, visible: false, updatedAt: now() };
    onChange();
  }

  function capture() {
    if (!lastPointer || !allowed() || document.hidden) return hide();
    const { x, y } = lastPointer;
    if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return hide();
    const region = regions().find(({ element }) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && y >= rect.top && y <= rect.bottom;
    });
    // Uncovered layout gaps still share a cursor instead of creating dead zones.
    const rect = region?.element.getBoundingClientRect() || { top: 0, height: window.innerHeight };
    const normalizedX = x / window.innerWidth;
    const normalizedY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
    const sectionId = region?.key || '@viewport';
    if (cursor.visible && cursor.x === normalizedX && cursor.y === normalizedY && cursor.section === sectionId) return;
    cursor = {
      x: normalizedX, y: normalizedY, section: sectionId, visible: true, updatedAt: now()
    };
    onChange();
  }

  function removeCursor(key) {
    window.clearTimeout(idleTimers.get(key));
    idleTimers.delete(key);
    nodes.get(key)?.remove();
    nodes.delete(key);
  }

  function clear() {
    for (const key of nodes.keys()) removeCursor(key);
  }

  function render(visitors, selfKey) {
    if (!allowed() || document.hidden || document.documentElement.classList.contains('loader-running')) {
      clear();
      return;
    }
    const visible = new Set();
    let regionElements;
    let sectionElements;
    const bounds = new Map();
    function regionBounds(key, viewportWidth) {
      if (bounds.has(key)) return bounds.get(key);
      let rect;
      if (key === '@viewport') rect = { top: 0, height: window.innerHeight };
      else {
        const anchor = viewportWidth
          ? (regionElements ||= regions()).find(region => region.key === key)?.element
          : (sectionElements ||= sections()).find(element => (element.id || 'hero') === key);
        rect = anchor?.getBoundingClientRect();
      }
      bounds.set(key, rect);
      return rect;
    }
    for (const [key, visitor] of Object.entries(visitors)) {
      if (!visitor || key === selfKey || visitor.path !== (window.location?.pathname || '/') || !isRecentCursor(visitor.cursor, now())) continue;
      const regionKey = visitor.cursor.section;
      const viewportWidth = regionKey.startsWith('@');
      // Older tabs still send positions relative to the section's content width.
      const rect = regionBounds(regionKey, viewportWidth);
      if (!rect || rect.height <= 0) continue;
      const x = viewportWidth ? visitor.cursor.x * window.innerWidth : rect.left + visitor.cursor.x * rect.width;
      const y = rect.top + visitor.cursor.y * rect.height;
      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'live-cursors';
        layer.setAttribute('aria-hidden', 'true');
        document.body.append(layer);
      }
      let node = nodes.get(key);
      if (!node) {
        node = document.createElement('div');
        node.className = 'visitor-cursor';
        // Static decorative markup; visitor-provided text is assigned via textContent below.
        node.innerHTML = '<svg viewBox="0 0 24 28" width="16" height="19" aria-hidden="true"><path d="M2 2 7 24 11.5 15 21 11.5Z" /></svg><span></span>';
        layer.append(node);
        nodes.set(key, node);
      }
      node.style.setProperty('--cursor-color', cursorColor(visitor.color));
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      node.dataset.edgeX = x > window.innerWidth - 140 ? 'right' : 'left';
      node.dataset.edgeY = y > window.innerHeight - 44 ? 'bottom' : 'top';
      const age = Math.max(0, now() - visitor.cursor.updatedAt);
      node.dataset.idle = String(age >= FADE_MS);
      const updatedAt = String(visitor.cursor.updatedAt);
      // Heartbeats keep presence alive without restarting the cursor's idle timer.
      if (node.dataset.updatedAt !== updatedAt) {
        window.clearTimeout(idleTimers.get(key));
        idleTimers.delete(key);
        node.dataset.updatedAt = updatedAt;
        if (age < FADE_MS) {
          idleTimers.set(key, window.setTimeout(() => {
            node.dataset.idle = 'true';
            idleTimers.set(key, window.setTimeout(() => removeCursor(key), IDLE_MS - FADE_MS));
          }, FADE_MS - age));
        } else idleTimers.set(key, window.setTimeout(() => removeCursor(key), IDLE_MS - age));
      }
      node.querySelector('span').textContent = typeof visitor.label === 'string' ? visitor.label.slice(0, 40) : 'Visitor';
      visible.add(key);
    }
    for (const [key, node] of nodes) {
      if (!visible.has(key)) removeCursor(key);
    }
  }

  function onPointerMove(event) {
    if (event.pointerType === 'touch' || !allowed()
      || event.target?.closest?.('input, textarea, select, [contenteditable], .presence-panel, .skill-modal, #loader')) return hide();
    lastPointer = { x: event.clientX, y: event.clientY };
    capture();
  }
  function onMotionChange() { hide(); clear(); }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', hide);
  motion?.addEventListener('change', onMotionChange);

  return { color, get cursor() { return cursor; }, capture, hide, render, clear, destroy() {
    destroyed = true;
    hide();
    clear();
    layer?.remove();
    layer = null;
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', hide);
    motion?.removeEventListener('change', onMotionChange);
  } };
}
