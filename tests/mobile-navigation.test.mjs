import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMobileNavigation } from '../assets/js/mobile-navigation.js';

function preview({ compact = true, welcoming = false } = {}) {
  const events = new Map(), frames = new Map();
  let sequence = 0, geometryReads = 0;
  const positions = [0, 900, 2000, 3500, 5000];
  const ids = ['top', 'work', 'skills', 'about', 'contact'];
  const links = ids.map(id => {
    const attributes = new Map([['href', `#${id}`]]);
    return { getAttribute: name => attributes.get(name), setAttribute: (name, value) => attributes.set(name, value), removeAttribute: name => attributes.delete(name) };
  });
  const listen = prefix => ({
    addEventListener: (name, callback) => events.set(`${prefix}:${name}`, callback),
    removeEventListener: name => events.delete(`${prefix}:${name}`)
  });
  const window = { ...listen('window'), innerHeight: 844, scrollY: 0,
    matchMedia: () => ({ matches: compact }),
    requestAnimationFrame(callback) { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: id => frames.delete(id)
  };
  const document = { ...listen('document'),
    documentElement: { dataset: { pageStyles: 'ready' }, classList: { contains: () => welcoming } },
    querySelector: () => ({ querySelectorAll: () => links }),
    getElementById: id => ({ getBoundingClientRect() {
      geometryReads++;
      return { top: positions[ids.indexOf(id)] - window.scrollY };
    } })
  };
  const controller = createMobileNavigation({ document, window });
  return { links, frames, events, controller, reads: () => geometryReads,
    finishWelcome() { welcoming = false; events.get('document:loader:done')?.(); },
    scroll(y) { window.scrollY = y; events.get('window:scroll')?.(); },
    paint() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); }
  };
}

test('bottom navigation highlights the current section and batches scroll updates', () => {
  const page = preview();
  assert.equal(page.links[0].getAttribute('aria-current'), 'location');
  page.scroll(950); page.scroll(1100);
  assert.equal(page.frames.size, 1);
  page.paint();
  assert.equal(page.links[1].getAttribute('aria-current'), 'location');
  assert.equal(page.links[0].getAttribute('aria-current'), undefined);
  page.scroll(5100); page.paint();
  assert.equal(page.links[4].getAttribute('aria-current'), 'location');
});

test('startup avoids geometry reads and CSS activation paints before navigation measures', () => {
  const page = preview();
  assert.equal(page.reads(), 0);
  page.events.get('document:page-styles:ready')();
  page.paint(); assert.equal(page.reads(), 0);
  page.paint(); assert.equal(page.reads(), 5);
  page.events.get('document:page-styles:ready')();
  page.controller.destroy();
  assert.equal(page.frames.size, 0);
});

test('the hidden bottom navigation waits until the welcome ends before measuring', () => {
  const page = preview({ welcoming: true });
  page.scroll(1000); page.paint();
  assert.equal(page.reads(), 0);
  page.finishWelcome(); page.paint();
  assert.equal(page.reads(), 0);
  page.paint();
  assert.equal(page.links[1].getAttribute('aria-current'), 'location');
});

test('desktop does no active-section work and cleanup releases navigation listeners', () => {
  const page = preview({ compact: false });
  page.scroll(5100); page.paint();
  assert.equal(page.links[4].getAttribute('aria-current'), undefined);
  page.controller.destroy();
  assert.equal(page.events.size, 0);
  assert.equal(page.frames.size, 0);
});

test('five labelled mobile links retain real destinations and decorative icons', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const nav = html.match(/<nav class="mobile-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const anchors = [...nav.matchAll(/<a href="#([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.equal(anchors.length, 5);
  for (const [, id, contents] of anchors) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(contents, /<span>[^<]+<\/span>/);
    assert.match(contents, /aria-hidden="true"/);
  }
});
