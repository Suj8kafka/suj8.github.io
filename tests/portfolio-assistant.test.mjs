import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isSafeAssistantLink } from '../assets/js/portfolio-assistant.js';

const root = new URL('../', import.meta.url);

test('homepage includes the accessible assistant controls and all suggested questions', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /data-portfolio-assistant/);
  assert.match(html, /aria-controls="portfolio-assistant-panel"/);
  assert.match(html, /role="dialog" aria-modal="false"/);
  assert.match(html, /Who is Sujeet and what does he do\?/);
  assert.match(html, /What skills and technologies does Sujeet work with\?/);
  assert.match(html, /Tell me about Sujeet’s selected projects/);
  assert.match(html, /What is Sujeet’s professional experience\?/);
  assert.match(html, /How can I contact Sujeet\?/);
  assert.match(html, /maxlength="500"/);
  assert.match(html, /Ask about Sujeet/);
  assert.match(html, /WALL·E’s portfolio guide/);
  assert.match(html, /assets\/images\/WallE\.png/);
  assert.match(html, /class="assistant-companion"/);
  assert.match(html, /class="assistant-greeting" aria-hidden="true">Hello!/);
  const hero = html.slice(html.indexOf('<section class="hero"'), html.indexOf('<section class="selected-work'));
  assert.match(hero, /data-portfolio-assistant/);
  assert.match(hero, /data-assistant-flip/);
  assert.match(hero, /portrait-face portrait-front/);
  assert.match(hero, /portrait-face portrait-back/);
  assert.equal(html.match(/data-portfolio-assistant/g)?.length, 1);
});

test('assistant renders text safely and does not use HTML injection', async () => {
  const source = await readFile(new URL('assets/js/portfolio-assistant.js', root), 'utf8');
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML/);
  assert.match(source, /body\.textContent = text/);
  assert.match(source, /body: JSON\.stringify\(\{ question: cleaned \}\)/);
  assert.match(html, /conversations are not stored/i);
});

test('assistant uses WALL-E as a portrait flip control with a reduced-motion path', async () => {
  const css = await readFile(new URL('assets/css/portfolio-assistant.css', root), 'utf8');
  assert.match(css, /\.assistant-panel-header/);
  assert.match(css, /\.portfolio-assistant\[data-open\] \.portrait-flip \{ transform: rotateY\(180deg\)/);
  assert.match(css, /--assistant-size: 84px/);
  assert.match(css, /@keyframes assistant-stroll/);
  assert.match(css, /@keyframes assistant-facing/);
  assert.match(css, /translate3d\(calc\(100cqi - var\(--assistant-size\)\)/);
  assert.match(css, /html\[data-motion="reduced"\] \.assistant-companion/);
  assert.match(css, /assistant-companion:is\(:hover, :focus-within\) \{ animation-play-state: paused/);
  assert.match(css, /\.assistant-launcher:is\(:hover, :focus-visible\) \+ \.assistant-greeting/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(css, /\.portfolio-assistant\s*\{[^}]*position:\s*fixed/s);
  assert.doesNotMatch(css, /portfolio-assistant-robot-sprite/);
});

test('assistant controller flips the portrait and restores it after closing', async () => {
  const source = await readFile(new URL('assets/js/portfolio-assistant.js', root), 'utf8');
  assert.match(source, /root\.setAttribute\('data-open', ''\)/);
  assert.match(source, /root\.removeAttribute\('data-open'\)/);
  assert.match(source, /front\?\.setAttribute\('inert', ''\)/);
  assert.match(source, /front\?\.removeAttribute\('inert'\)/);
  assert.match(source, /panel\.setAttribute\('aria-hidden', 'false'\)/);
  assert.match(source, /panel\.setAttribute\('aria-hidden', 'true'\)/);
});

test('default portfolio palette uses a white canvas with black and gray shades', async () => {
  const css = await readFile(new URL('assets/css/site.css', root), 'utf8');
  const palette = css.match(/:root\s*\{([^}]+)\}/)[1];
  assert.match(palette, /--paper: #ffffff/);
  assert.match(palette, /--ink: #111111/);
  assert.match(palette, /--muted: #5b5b5b/);
  assert.match(palette, /--accent: #303030/);
});

test('assistant link validation accepts same-site and HTTPS links only', () => {
  const site = 'https://www.sujeetkhadka.com.np';
  assert.equal(isSafeAssistantLink('/blog/', site), true);
  assert.equal(isSafeAssistantLink('https://aamacure.com', site), true);
  assert.equal(isSafeAssistantLink('javascript:alert(1)', site), false);
  assert.equal(isSafeAssistantLink('http://example.com', site), false);
});

test('security policy permits only the dedicated assistant Worker origin', async () => {
  const source = await readFile(new URL('cloudflare/security-headers.mjs', root), 'utf8');
  assert.match(source, /connect-src[^\n]+https:\/\/portfolio-assistant\.sujeetkhadka00001\.workers\.dev/);
  assert.doesNotMatch(source, /connect-src[^\n]+https:\/\/\*\.workers\.dev/);
});

test('assistant Worker reuses the existing D1 database and adds no conversation store', async () => {
  const assistant = JSON.parse(await readFile(new URL('cloudflare/wrangler.assistant.jsonc', root), 'utf8'));
  const analytics = JSON.parse(await readFile(new URL('cloudflare/wrangler.analytics.jsonc', root), 'utf8'));
  assert.equal(assistant.d1_databases[0].database_id, analytics.d1_databases[0].database_id);
  assert.equal(assistant.d1_databases[0].database_name, 'portfolio-usage');
  const migration = await readFile(new URL('cloudflare/migrations/0003-portfolio-assistant.sql', root), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS portfolio_knowledge/);
  assert.doesNotMatch(migration, /CREATE TABLE[^;]*(conversation|message|question)/i);
});
