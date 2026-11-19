import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const site = read('assets/css/site.css');
const blog = read('assets/css/blog.css');
const privacy = read('assets/css/privacy.css');
const admin = read('assets/css/admin.css');
const assistant = read('assets/css/portfolio-assistant.css');
const display = read('assets/css/display-preferences.css');
const loader = read('loader/files/loader.css');
const home = read('index.html');

test('the shared type ramp reserves small text for secondary information', () => {
  assert.match(site, /--type-caption:\s*\.8125rem;/);
  assert.match(site, /--type-label:\s*\.875rem;/);
  assert.match(site, /--type-body:\s*1rem;/);
  assert.match(site, /--type-body-large:\s*1\.0625rem;/);
  assert.match(site, /body\s*\{[^}]*font:\s*400 var\(--type-body\)\/1\.6 var\(--body\)/s);
  assert.match(site, /\.hero-intro\s*\{[^}]*font-size:\s*1\.0625rem/s);
  assert.match(site, /\.mobile-nav a\s*\{[^}]*font:\s*500 \.875rem\/1\.3/s);
});

test('public reading and control surfaces use the shared body and label sizes', () => {
  assert.match(blog, /\.story-body\s*\{\s*font-size:\s*var\(--type-body-large\)/);
  assert.match(blog, /\.notebook-search input\s*\{\s*font-size:\s*var\(--type-body\)/);
  assert.match(privacy, /\.policy-copy p\s*\{\s*font-size:\s*var\(--type-body\)/);
  assert.match(privacy, /\.analytics-controls :is\(select, button\)[\s\S]*font-size:\s*var\(--type-label\)/);
  assert.match(display, /\.display-trigger,[\s\S]*font-size:\s*var\(--type-label\)/);
});

test('forms and the portfolio companion do not fall below normal UI sizes', () => {
  assert.match(admin, /\.admin-page input:not\(\[type="checkbox"\]\),[\s\S]*font-size:\s*var\(--type-body\)/);
  assert.match(admin, /\.admin-back,[\s\S]*font-size:\s*var\(--type-label\)/);
  assert.match(assistant, /\.assistant-message\s*\{\s*font-size:\s*var\(--type-body\)/);
  assert.match(assistant, /\.assistant-input-row textarea\s*\{\s*font-size:\s*var\(--type-body\)/);
  assert.match(assistant, /\.assistant-send,[\s\S]*font-size:\s*var\(--type-label\)/);
});

test('loader language labels stay synchronized and readable', () => {
  assert.match(loader, /html\.loader-docked \.ld-language\s*\{[^}]*font-size:\s*13px/);
  assert.match(loader, /@media \(max-height: 420px\)[\s\S]*\.ld-language\s*\{[^}]*font-size:\s*13px/);
  assert.match(home, /html\.loader-docked \.ld-language\s*\{[^}]*font-size:\s*13px/);
  assert.match(home, /@media \(max-height: 420px\)[\s\S]*\.ld-language\s*\{[^}]*font-size:\s*13px/);
});
