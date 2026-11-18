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
  assert.match(html, /Who is this developer\?/);
  assert.match(html, /What technologies does he use\?/);
  assert.match(html, /Tell me about his projects/);
  assert.match(html, /Professional experience/);
  assert.match(html, /How can I contact him\?/);
  assert.match(html, /maxlength="500"/);
});

test('assistant renders text safely and does not use HTML injection', async () => {
  const source = await readFile(new URL('assets/js/portfolio-assistant.js', root), 'utf8');
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML/);
  assert.match(source, /body\.textContent = text/);
  assert.match(source, /body: JSON\.stringify\(\{ question: cleaned \}\)/);
  assert.match(html, /conversations are not stored/i);
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
