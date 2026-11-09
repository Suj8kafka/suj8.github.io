import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/site.css', import.meta.url), 'utf8');
const attrs = text => Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));

test('company logos use native image alternatives and decorative fallback initials are hidden', () => {
  const logos = [...html.matchAll(/<div class="company-logo"[^>]*>([\s\S]*?)<\/div>/g)];
  assert.equal(logos.length, 4);
  for (const [source, contents] of logos) {
    const wrapper = source.slice(0, source.indexOf('>'));
    assert.equal(wrapper.includes('aria-label'), false);
    const image = attrs(contents.match(/<img\b[^>]*>/)[0]);
    assert.ok(image.alt.length > 5);
    assert.match(contents, /<span aria-hidden="true">/);
  }
});

test('named generic containers have roles that permit accessible names', () => {
  for (const [opening] of html.matchAll(/<div\b[^>]*\baria-label(?:ledby)?="[^"]+"[^>]*>/g)) {
    assert.ok(['group', 'status', 'img', 'progressbar', 'region'].includes(attrs(opening).role), opening);
  }
});

test('the play button name matches its visible label and controls the actual video', () => {
  const [, opening, content] = html.match(/(<button\b[^>]*id="introPlay"[^>]*>)([\s\S]*?)<\/button>/);
  const attributes = attrs(opening);
  const visible = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  assert.equal(visible, 'Play with sound');
  assert.equal(attributes['aria-label'], undefined, 'Use the visible text as the single naming source');
  assert.equal(attributes.type, 'button');
  assert.match(html, new RegExp(`<video\\b[^>]*id="${attributes['aria-controls']}"`));
});

test('project images have useful descriptions while grouped toolkit decorations stay empty', () => {
  const projectImages = [...html.matchAll(/<img\b[^>]*src="assets\/images\/selected-work\/[^>]*>/g)];
  assert.equal(projectImages.length, 4);
  for (const [opening] of projectImages) assert.ok(attrs(opening).alt.length >= 30);
  assert.match(html, /alt="Aama Cure maternity-care illustration/);
  for (const [opening] of html.matchAll(/<img\b[^>]*src="assets\/images\/tool-icons\/[^>]*>/g)) assert.equal(attrs(opening).alt, '');
});

test('every homepage image explicitly declares a meaningful or decorative alternative', () => {
  for (const [opening] of html.matchAll(/<img\b[^>]*>/g)) {
    const image = attrs(opening);
    assert.equal(typeof image.alt, 'string', `Missing alt: ${image.src}`);
    if (image.alt === '') assert.match(image.src, /^assets\/images\/tool-icons\//);
    else assert.ok(image.alt.trim().length > 5, `Unhelpful alt: ${image.src}`);
  }
  assert.match(html, /class="footer-toolkit-dump"[^>]*role="img"/);
});

function variables(selector) {
  const block = css.match(selector)[1];
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)].map(match => [match[1], match[2]]));
}
function luminance(hex) {
  const [r, g, b] = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return r * .2126 + g * .7152 + b * .0722;
}
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test('small accent text, primary-button hover and play-button colours meet AA contrast in both themes', () => {
  const light = variables(/:root\s*\{([^}]+)\}/);
  const dark = { ...light, ...variables(/\[data-theme="dark"\]\s*\{([^}]+)\}/) };
  for (const theme of [light, dark]) {
    assert.ok(ratio(theme['--accent-text'], theme['--paper']) >= 4.5);
    assert.ok(ratio('#ffffff', theme['--intro-button-bg']) >= 4.5);
  }
});
