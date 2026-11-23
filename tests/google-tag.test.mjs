import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { securityHeaders } from '../cloudflare/security-headers.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const tagId = 'G-0000C91B56';
const externalTag = '<script type="module" src="/assets/js/deferred-analytics.js?v=20261123-performance"></script>';
const inlineTag = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
`;
const completeTag = `<!-- Google tag -->\n${externalTag}\n<script>${inlineTag}</script>`;

function pageFiles(directory) {
  const files = [];
  for (const entry of readdirSync(new URL(`${directory}/`, root), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...pageFiles(path));
    else if (/\.html?$/i.test(entry.name)) files.push(path);
  }
  return files;
}

const pages = ['index.html', '404.html', 'privacy/index.html', 'login/index.html',
  ...pageFiles('blog'), ...pageFiles('pages')].sort();

test('maintained pages queue the Google tag once and defer its network request', () => {
  assert.equal(pages.length, 28);
  for (const path of pages) {
    const html = read(path).replaceAll('\r\n', '\n');
    assert.equal(html.split('deferred-analytics.js?v=').length - 1, 1, path);
    assert.doesNotMatch(html, /<script[^>]+src="https:\/\/www\.googletagmanager\.com/);
    assert.equal(html.split('window.dataLayer = window.dataLayer || [];').length - 1, 1, path);
    assert.ok(html.includes(`<head>\n${completeTag}\n`), `${path}: tag must immediately follow <head>`);
  }
  assert.equal(read('assets/js/deferred-analytics.js').split(`gtm.js?id=${tagId}`).length - 1, 1);
});

test('the CSP permits only the exact Google bootstrap and Analytics endpoints', () => {
  const csp = securityHeaders['Content-Security-Policy'];
  const hash = `'sha256-${createHash('sha256').update(inlineTag).digest('base64')}'`;
  const scripts = csp.split('; ').find(rule => rule.startsWith('script-src '));
  const images = csp.split('; ').find(rule => rule.startsWith('img-src '));
  const connections = csp.split('; ').find(rule => rule.startsWith('connect-src '));
  assert.ok(scripts.includes(hash));
  assert.ok(scripts.includes('https://www.googletagmanager.com'));
  assert.ok(!scripts.includes("'unsafe-inline'"));
  assert.ok(images.includes('https://www.googletagmanager.com'));
  assert.ok(images.includes('https://*.google-analytics.com'));
  assert.ok(connections.includes('https://www.googletagmanager.com'));
  assert.ok(connections.includes('https://*.google-analytics.com'));
  assert.ok(connections.includes('https://*.google.com'));
});

test('preserved source copies and markup fragments are not rewritten as measured pages', () => {
  assert.doesNotMatch(read('archive/legacy-homepage.html'), new RegExp(tagId));
  assert.doesNotMatch(read('assets/documents/blog/source-pages/index.html'), new RegExp(tagId));
  assert.doesNotMatch(read('loader/files/loader-markup.html'), new RegExp(tagId));
});
