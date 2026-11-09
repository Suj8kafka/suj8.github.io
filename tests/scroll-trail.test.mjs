import test from 'node:test';
import assert from 'node:assert/strict';
import { createWavePath, createScrollTrail } from '../assets/js/scroll-trail.js';

function preview({ light = false, initial = .25 } = {}) {
  const listeners = new Map(), children = [], calls = [];
  let height = 4000, width = 1200, observed = false, disconnected = false, resize, frame;
  const main = { append: node => children.push(node), getBoundingClientRect: () => ({ height, width }) };
  const document = {
    hidden: false, querySelector: () => main,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
    createElementNS(namespace, name) {
      const node = { name, attrs: {}, style: {}, children: [],
        setAttribute(key, value) { this.attrs[key] = String(value); },
        classList: { add(value) { node.ready = value; } },
        append(...nodes) { this.children.push(...nodes); },
        getTotalLength: () => height * 1.02,
        getPointAtLength: distance => ({ x: 16, y: distance / 1.02 }),
        remove() { children.splice(children.indexOf(this), 1); }
      };
      return node;
    }
  };
  const window = {
    ResizeObserver: class {
      constructor(callback) { resize = callback; }
      observe() { observed = true; }
      disconnect() { disconnected = true; }
    },
    requestAnimationFrame(callback) { frame = callback; return 1; },
    cancelAnimationFrame() { frame = undefined; }
  };
  let tween;
  const gsap = { fromTo(state, from, options) {
    calls.push(options);
    const trigger = { progress: initial, enabled: true, refreshes: 0,
      disable() { this.enabled = false; }, enable() { this.enabled = true; },
      getTween: () => ({ pause() { trigger.paused = true; } }),
      refresh() { this.refreshes++; options.scrollTrigger.onRefresh(this); },
      kill() { this.killed = true; }
    };
    tween = { scrollTrigger: trigger,
      progress(value) { state.progress = value; options.onUpdate(); },
      kill() { this.killed = true; }
    };
    return tween;
  } };
  const controller = createScrollTrail({ document, window, gsap, ScrollTrigger: {}, light });
  const [svg] = children, [path] = svg.children;
  return { controller, document, children, listeners, svg, path, tween, calls,
    resize(nextHeight, nextWidth = width) { height = nextHeight; width = nextWidth; resize(); }, flushResize() { const callback = frame; frame = undefined; callback?.(); },
    get observed() { return observed; }, get disconnected() { return disconnected; }
  };
}

test('broad ribbon bends span the page and remain inside desktop and mobile bounds', () => {
  for (const [height, width] of [[1, 375], [500, 375], [4000, 1200], [12000, 1920]]) {
    const points = createWavePath(height, width).match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g).map(Number);
    assert.equal(points.at(-1), height);
    for (let index = 0; index < points.length; index += 2) {
      assert.ok(points[index] >= 0 && points[index] <= width);
      assert.ok(points[index + 1] >= 0 && points[index + 1] <= height);
    }
    const firstBend = points[2];
    assert.ok(firstBend - width / 2 > Math.min(width * .3, 400), 'A sweeping curve, not a gutter ripple');
  }
});

test('ribbon draws continuously from the start and retracts when scrolling back', () => {
  const page = preview({ initial: .6 });
  assert.equal(Number(page.path.style.strokeDashoffset), 1632);
  assert.equal(page.svg.ready, 'is-ready');
  assert.equal(page.svg.attrs['aria-hidden'], 'true');
  assert.equal(page.path.style.strokeDasharray, '4080 4080');
  assert.equal(page.svg.children.length, 1, 'The stroke itself has a rounded end; there is no separate dot');
  page.tween.progress(.8); const forward = Number(page.path.style.strokeDashoffset);
  page.tween.progress(.3); const backward = Number(page.path.style.strokeDashoffset);
  assert.ok(backward > forward);
  assert.equal(Number(page.path.style.strokeDashoffset), 2856);
  assert.equal(page.calls[0].scrollTrigger.scrub, .3);
  assert.equal(page.listeners.has('scroll'), false);
  page.controller.destroy();
});

test('content resize refreshes geometry and hidden tabs suspend the owned animation', () => {
  const page = preview();
  assert.equal(page.observed, true);
  page.resize(8000); page.flushResize();
  assert.equal(page.svg.attrs.viewBox, '0 0 1200 8000');
  assert.equal(Number(page.path.style.strokeDashoffset), 6120);
  const desktopPath = page.path.attrs.d;
  page.resize(8000, 375); page.flushResize();
  assert.equal(page.svg.attrs.viewBox, '0 0 375 8000');
  assert.notEqual(page.path.attrs.d, desktopPath, 'Width-only changes reshape the ribbon');
  page.document.hidden = true; page.listeners.get('visibilitychange')();
  assert.equal(page.tween.scrollTrigger.enabled, false);
  assert.equal(page.tween.scrollTrigger.paused, true);
  page.document.hidden = false; page.listeners.get('visibilitychange')();
  assert.equal(page.tween.scrollTrigger.enabled, true);
  page.controller.destroy(); page.controller.destroy();
  assert.equal(page.disconnected, true);
  assert.equal(page.children.length, 0);
  assert.equal(page.listeners.size, 0);
  assert.equal(page.tween.killed, true);
  assert.equal(page.tween.scrollTrigger.killed, true);
});

test('lighter devices use shorter scrub lag; missing dependencies create no decoration', () => {
  const page = preview({ light: true });
  assert.equal(page.calls[0].scrollTrigger.scrub, .15);
  page.controller.destroy();
  const controller = createScrollTrail({ document: { querySelector: () => null }, window: {} });
  controller.destroy();
});
