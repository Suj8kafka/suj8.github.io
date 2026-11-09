import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/js/intro-video.js', import.meta.url), 'utf8');
function preview({ rejected = false } = {}) {
  const document = { activeElement: null };
  function element() {
    const listeners = new Map(), classes = new Set();
    return { controls: false, disabled: false,
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      addEventListener: (name, callback) => listeners.set(name, callback),
      dispatch: (name, event) => listeners.get(name)?.(event),
      focus() { document.activeElement = this; },
      removeAttribute(name) { if (name === 'tabindex') delete this.tabIndex; }
    };
  }
  const box = element(), video = element(), button = element();
  document.getElementById = id => ({ introVideo: box, introVid: video, introPlay: button })[id];
  video.play = () => rejected ? Promise.reject(new Error('Playback refused')) : Promise.resolve();
  video.pause = () => {};
  vm.runInNewContext(source, { document, IntersectionObserver: class { observe() {} } });
  button.focus();
  return { document, box, video, button };
}

test('keyboard playback moves focus into native controls and completion restores the play button', async () => {
  const page = preview();
  await page.button.dispatch('click', { detail: 0 });
  assert.equal(page.document.activeElement, page.video);
  assert.equal(page.video.controls, true);
  assert.equal(page.video.tabIndex, 0);
  assert.equal(page.button.disabled, true);
  assert.equal(page.box.classList.contains('playing'), true);
  page.video.dispatch('ended');
  assert.equal(page.document.activeElement, page.button);
  assert.equal(page.button.disabled, false);
  assert.equal(page.video.controls, false);
  assert.equal(page.video.tabIndex, undefined);
  assert.equal(page.box.classList.contains('playing'), false);
});

test('failed keyboard playback keeps a visible, enabled and focused retry control', async () => {
  const page = preview({ rejected: true });
  await page.button.dispatch('click', { detail: 0 });
  assert.equal(page.document.activeElement, page.button);
  assert.equal(page.button.disabled, false);
  assert.equal(page.video.controls, false);
  assert.equal(page.box.classList.contains('playing'), false);
});

test('playback completion does not move focus away from another part of the page', async () => {
  const page = preview();
  await page.button.dispatch('click', { detail: 1 });
  const other = {};
  page.document.activeElement = other;
  page.video.dispatch('ended');
  assert.equal(page.document.activeElement, other);
  assert.equal(page.button.disabled, false);
});
