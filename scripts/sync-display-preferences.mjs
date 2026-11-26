import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { syncBootstrapCsp } from './sync-bootstrap-csp.mjs';
import { hydrateDisplayPreferences } from '../assets/js/display-state.js';

const pages = ['index.html', ...readdirSync('blog', { recursive: true }).filter(path => /(^|[\\/])index\.html$/.test(path)).map(path => `blog/${path}`)];
const bootstrap = `<script id="display-bootstrap">window.skDisplayPreferences = (${hydrateDisplayPreferences.toString()})({ document, window });</script>`;
let updated = 0;
for (const path of pages) {
  let html = readFileSync(path, 'utf8');
  if (path !== 'index.html' && !html.includes('class="blog-page"')) {
    html = html.replace(/\s*<script id="display-bootstrap">[\s\S]*?<\/script>/, '')
      .replace(/\s*<link rel="stylesheet" href="\/assets\/css\/display-preferences[^>]+>/, '')
      .replace(/\s*<script type="module" src="\/assets\/js\/display-preferences[^>]+><\/script>/, '');
    writeFileSync(path, html);
    continue;
  }
  html = html.includes('id="display-bootstrap"')
    ? html.replace(/<script id="display-bootstrap">[\s\S]*?<\/script>/, bootstrap)
    : html.replace(/(<meta charset="[^"]+">)/i, `$1\n  ${bootstrap}`);
  if (!html.includes('/assets/css/display-preferences.css') && !html.includes('id="display-preferences-styles"')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="/assets/css/display-preferences.css?v=20261123-experience-timeline">\n  <script type="module" src="/assets/js/display-preferences.js?v=20261123-experience-timeline"></script>\n</head>');
  }
  html = html.replace(/(\/assets\/css\/display-preferences\.css\?v=)[^"\s]+/, (_, prefix) => `${prefix}20261123-experience-timeline`)
    .replace(/(\/assets\/js\/display-preferences\.js\?v=)[^"\s]+/, (_, prefix) => `${prefix}20261123-experience-timeline`)
    .replace(/((?:href|data-href)="\/assets\/css\/site\.css\?v=)[^"\s]+/, (_, prefix) => `${prefix}20261123-experience-timeline`)
    .replace(/(src="\/assets\/js\/blog\.js\?v=)[^"\s]+/, (_, prefix) => `${prefix}20261123-performance`)
    .replace(/(<meta name="theme-color" content=")[^"]+/, '$1#ffffff');
  writeFileSync(path, html);
  updated++;
}
syncBootstrapCsp();
console.log(`Display bootstrap synchronized across ${updated} public pages.`);
