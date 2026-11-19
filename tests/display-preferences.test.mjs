import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { hydrateDisplayPreferences, motionIsReduced } from '../assets/js/display-state.js';
import { displayBootstrapCsp } from '../cloudflare/display-bootstrap-csp.mjs';
import { securityHeaders } from '../cloudflare/security-headers.mjs';

function preview({ stored = null, legacy = null, reduced = false, high = false, blocked = false } = {}) {
  const root = { dataset: {} };
  const motion = { matches: reduced }, contrast = { matches: high };
  const document = { documentElement: root };
  const window = { localStorage: { getItem(key) {
    if (blocked) throw Error('Denied');
    return key === 'portfolio-theme' ? legacy : stored;
  } },
    matchMedia: query => query.includes('reduced-motion') ? motion : contrast };
  return { root, document, window, motion, contrast, state: hydrateDisplayPreferences({ document, window }) };
}

test('first visit applies the monochrome theme plus system motion/contrast before enhancements', () => {
  const page = preview({ reduced: true, high: true });
  assert.deepEqual(page.root.dataset, { layout: 'crafted', motion: 'reduced', sound: 'off',
    contrast: 'high', textScale: '100', dyslexiaSpacing: 'off', theme: 'mono' });
  assert.deepEqual(page.state.overrides, {});
});

test('validated explicit overrides take precedence over OS preferences without accepting arbitrary attributes', () => {
  const page = preview({ reduced: true, high: true, stored: JSON.stringify({ layout: 'reader', motion: 'full', sound: 'on',
    contrast: 'standard', textScale: '130', dyslexiaSpacing: 'on', theme: 'injected' }) });
  assert.deepEqual(page.root.dataset, { layout: 'reader', motion: 'full', sound: 'on',
    contrast: 'standard', textScale: '130', dyslexiaSpacing: 'on', theme: 'mono' });
  assert.equal(page.state.overrides.theme, undefined);
  assert.equal(motionIsReduced(page.root, page.motion), true, 'Reader suspends decorative JS even with full motion');
  assert.equal(motionIsReduced({ dataset: { motion: 'full' } }, page.motion), false);
});

test('theme choices resolve original, dark and system palettes without accepting arbitrary values', () => {
  const page = preview();
  assert.equal(page.state.apply({ theme: 'original' }).theme, 'original');
  assert.equal(page.root.dataset.theme, 'original');
  assert.equal(page.state.apply({ theme: 'dark' }).theme, 'dark');
  assert.equal(page.root.dataset.theme, 'dark');
  page.state.colourScheme.matches = true;
  assert.equal(page.state.apply({ theme: 'auto' }).theme, 'auto');
  assert.equal(page.root.dataset.theme, 'dark');
  page.state.apply({ theme: 'unknown' });
  assert.equal(page.root.dataset.theme, 'mono');
});

test('retired footer theme storage cannot override the new monochrome default', () => {
  for (const legacy of ['light', 'dark', 'auto']) {
    const page = preview({ legacy });
    assert.equal(page.root.dataset.theme, 'mono');
    assert.deepEqual(page.state.overrides, {});
  }
});

test('theme controls live in the display panel instead of the homepage footer', () => {
  const preferences = readFileSync(new URL('../assets/js/display-preferences.js', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(preferences, /\['theme', 'Theme'.*'Monochrome'.*'Original'.*'Dark'.*'System'/);
  assert.doesNotMatch(home, /data-theme-choice|class="footer-theme"/);
});

test('malformed, unavailable and unsupported storage cannot prevent a readable startup', () => {
  for (const stored of ['{broken', 'null', '3', '[]', '{"textScale":"200","sound":"loud","layout":"hidden","__proto__":{"motion":"full"}}']) {
    const page = preview({ stored, reduced: true });
    assert.equal(page.root.dataset.textScale, '100');
    assert.equal(page.root.dataset.sound, 'off');
    assert.equal(page.root.dataset.layout, 'crafted');
  }
  assert.equal(preview({ blocked: true }).root.dataset.motion, 'full');
});

test('motion mutes automatically until the visitor explicitly chooses a sound setting', () => {
  const { state } = preview();
  assert.equal(state.resolve({ motion: 'reduced' }).sound, 'off');
  assert.equal(state.resolve({ motion: 'reduced', sound: 'on' }).sound, 'on');
  assert.equal(state.resolve({ motion: 'full', sound: 'off' }).sound, 'off');
  assert.equal(state.resolve({ motion: 'reduced', sound: 'invalid' }).sound, 'off');
});

test('reset re-evaluates current OS values instead of a snapshot of the first visit', () => {
  const page = preview({ stored: '{"motion":"full","contrast":"standard","textScale":"130"}' });
  page.motion.matches = true; page.contrast.matches = true;
  page.state.apply({});
  assert.equal(page.root.dataset.motion, 'reduced');
  assert.equal(page.root.dataset.contrast, 'high');
  assert.equal(page.root.dataset.textScale, '100');
  assert.equal(page.root.dataset.sound, 'off');
});

test('every public page hydrates the exact same synchronized bootstrap before CSS and the welcome loader', () => {
  const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const inline = home.match(/<script id="display-bootstrap">([\s\S]*?)<\/script>/)[1];
  assert.ok(home.indexOf('id="display-bootstrap"') < home.indexOf('id="loader-bootstrap"'));
  const generated = `window.skDisplayPreferences = (${hydrateDisplayPreferences.toString()})({ document, window });`;
  assert.equal(inline.replaceAll('\r\n', '\n'), generated.replaceAll('\r\n', '\n'));
  const page = preview({ reduced: true });
  vm.runInNewContext(inline, { document: page.document, window: page.window });
  assert.equal(page.root.dataset.motion, 'reduced');
  for (const file of readdirSync(new URL('../blog/', import.meta.url), { recursive: true }).filter(file => /(^|[\\/])index\.html$/.test(file))) {
    const html = readFileSync(new URL(`../blog/${file.replaceAll('\\', '/')}`, import.meta.url), 'utf8');
    if (!html.includes('class="blog-page"')) continue;
    assert.equal(html.match(/<script id="display-bootstrap">([\s\S]*?)<\/script>/)[1], inline, file);
    assert.ok(html.indexOf('id="display-bootstrap"') < html.indexOf('rel="stylesheet"'), file);
    assert.match(html, /display-preferences\.css\?v=/);
  }
});

test('the security policy permits only the exact preference bootstrap without enabling unsafe inline scripts', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const script = html.match(/<script id="display-bootstrap">([\s\S]*?)<\/script>/)[1].replaceAll('\r\n', '\n');
  const hash = `'sha256-${createHash('sha256').update(script).digest('base64')}'`;
  assert.equal(hash, displayBootstrapCsp);
  const policy = securityHeaders['Content-Security-Policy'].split('; ').find(rule => rule.startsWith('script-src '));
  assert.ok(policy.includes(hash));
  assert.ok(!policy.includes("'unsafe-inline'"));
});

test('high-contrast reading text and accent colors meet 7:1 against both theme backgrounds', () => {
  const css = readFileSync(new URL('../assets/css/display-preferences.css', import.meta.url), 'utf8');
  const luminance = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  const blocks = [...css.matchAll(/html\[data-contrast="high"\](?:\[data-theme="dark"\])?\s*\{([^}]+)\}/g)];
  assert.equal(blocks.length, 2);
  for (const [, block] of blocks) {
    const palette = Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[a-f\d]{6})/g)].map(match => [match[1], luminance(match[2])]));
    for (const color of ['--ink', '--muted', '--accent-text', '--orange']) {
      const ratio = (Math.max(palette[color], palette['--paper']) + .05) / (Math.min(palette[color], palette['--paper']) + .05);
      assert.ok(ratio >= 7, `${color}: ${ratio.toFixed(2)}:1`);
    }
  }
});
