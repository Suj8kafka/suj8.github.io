import { motionIsReduced } from './display-state.js?v=20261123-performance';

// One short, cancellable clock. Original glyphs reserve their natural width;
// only decorative pseudo-elements change while link names stay stable.
export function createHeaderLetters({ document, window, root, nav }) {
  if (!document.createElement || !nav.querySelectorAll) return { play() {}, stop() {}, destroy() {} };
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cached = new Map(), names = new Map(), listeners = [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let timer = 0, active = [], destroyed = false;
  const allowed = () => !destroyed && !document.hidden && !motionIsReduced(root, media)
    && !window.navigator?.connection?.saveData
    && !(window.navigator?.deviceMemory > 0 && window.navigator.deviceMemory <= 4)
    && !(window.navigator?.hardwareConcurrency > 0 && window.navigator.hardwareConcurrency <= 4);
  for (const link of nav.querySelectorAll('a')) {
    names.set(link, link.getAttribute('aria-label'));
    if (!link.getAttribute('aria-label')) link.setAttribute('aria-label', link.textContent.trim().replace(/\s+/g, ' '));
  }
  function stop() {
    window.clearTimeout(timer); timer = 0;
    for (const letter of active) { letter.removeAttribute('data-shuffling'); letter.removeAttribute('data-glyph'); }
    active = [];
  }
  function prepare(node) {
    const text = node.textContent, previous = cached.get(node);
    if (previous?.text === text) return previous.letters;
    const letters = [];
    const children = Array.from(text, character => {
      const letter = document.createElement('i');
      letter.className = 'header-letter'; letter.textContent = character;
      letter.setAttribute('aria-hidden', 'true');
      if (character.trim()) letters.push(letter);
      return letter;
    });
    node.replaceChildren(...children);
    cached.set(node, { text, letters });
    return letters;
  }
  function play(nodes) {
    stop();
    if (!allowed()) return;
    active = nodes.flatMap(prepare);
    let step = 0;
    function tick() {
      timer = 0;
      if (!allowed()) { stop(); return; }
      active.forEach((letter, position) => {
        const settled = step >= 3 + Math.ceil((position + 1) / active.length * 9);
        if (settled) { letter.removeAttribute('data-shuffling'); letter.removeAttribute('data-glyph'); }
        else {
          letter.setAttribute('data-shuffling', '');
          letter.setAttribute('data-glyph', alphabet[(step * 7 + position * 13) % alphabet.length]);
        }
      });
      if (++step <= 12 && active.length) timer = window.setTimeout(tick, 28);
      else stop();
    }
    tick();
  }
  for (const [target, event] of [[document, 'visibilitychange'], [document, 'display-preferences:change'], [media, 'change']]) {
    const callback = () => { if (!allowed()) stop(); };
    target?.addEventListener?.(event, callback);
    listeners.push(() => target?.removeEventListener?.(event, callback));
  }
  return { play, stop, destroy() {
    destroyed = true; stop(); listeners.forEach(remove => remove());
    cached.forEach(({ text }, node) => { if (node.textContent === text) node.textContent = text; });
    cached.clear();
    names.forEach((name, link) => { if (name === null || name === undefined) link.removeAttribute('aria-label'); else link.setAttribute('aria-label', name); });
  } };
}
