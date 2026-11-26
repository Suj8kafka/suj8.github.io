import { readFileSync, writeFileSync } from 'node:fs';
import { syncBootstrapCsp } from './sync-bootstrap-csp.mjs';

const check = process.argv.includes('--check');
const normalize = text => text.replaceAll('\r\n', '\n');
const controller = normalize(readFileSync('loader/files/loader.js', 'utf8'));
const css = readFileSync('loader/files/loader.css', 'utf8');
const svg = readFileSync('loader/files/namaste.svg', 'utf8').trim();
let html = readFileSync('index.html', 'utf8');
html = html.replace(/<style id="welcome-styles">[\s\S]*?<\/style>/, () => `<style id="welcome-styles">${css}</style>`)
  .replace(/<template id="ld-namaste-template">[\s\S]*?<\/template>/, () => `<template id="ld-namaste-template">${svg}</template>`)
  .replace(/\s*<script(?: id="welcome-controller")?(?: src="loader\/files\/loader\.js[^"<>]*" defer)?>[\s\S]*?<\/script>/g,
    match => /welcome-controller|loader\/files\/loader\.js/.test(match) ? '' : match);
html = html.replace(/(<\/svg><\/template>)/, () => `</svg></template>\n  <script id="welcome-controller">${controller}</script>`);
if (check) {
  if (normalize(html) !== normalize(readFileSync('index.html', 'utf8'))) throw new Error('Welcome inline sources are stale. Run node scripts/sync-welcome.mjs.');
  syncBootstrapCsp({ check: true });
  console.log('Welcome CSS, controller and artwork synchronized.');
} else {
  writeFileSync('index.html', html);
  syncBootstrapCsp();
  console.log('Welcome CSS, controller, artwork and CSP hashes generated.');
}
