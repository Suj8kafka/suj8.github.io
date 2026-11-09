import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function rules(source) {
  const result = [];
  let start = 0, depth = 0, opening = -1, quote = '';
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quote) { if (char === '\\') index++; else if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') { if (depth === 0) opening = index; depth++; }
    if (char === '}') {
      depth--;
      if (depth === 0) {
        result.push({ selector: source.slice(start, opening).trim(), body: source.slice(opening + 1, index) });
        start = index + 1;
      }
    }
  }
  if (depth || quote || source.slice(start).trim()) throw new Error('Unbalanced stylesheet.');
  return result;
}

const criticalClass = /\.(?:hero[\w-]*|portrait[\w-]*|art-note|note-one|note-two|site-header|mobile-nav|wordmark|nav(?:-contact)?|header-tools|live-presence[\w-]*|live-counter|availability[\w-]*|button[\w-]*|text-link|eyebrow|status-dot|icon(?:-sprite)?|image-caption|landscape[\w-]*)(?![\w-])/;
const globalSelector = /(?:^|,)\s*(?::root|\[data-theme|html\b|body\b|\*(?![\w-])|a(?=[\s.:{,]|$)|h[123](?=[\s.:{,]|$)|p(?=[\s.:{,]|$))/;

export function criticalStyles(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  function select(css) {
    return rules(css).flatMap(({ selector, body }) => {
      if (/^@media\b/.test(selector)) {
        const inner = select(body);
        return inner ? [`${selector}{${inner}}`] : [];
      }
      if (selector === '@font-face') return /Space Grotesk/.test(body) ? [`${selector}{${body.trim()}}`] : [];
      if (selector.startsWith('@')) return [];
      // These states cannot occur before the full sheet and enhancements are ready.
      if (/\.is-detached|parallax|\.scroll-trail|\.live-presence-list|\.live-presence-item|\.availability-tooltip/.test(selector)) return [];
      if (/\.portrait-(?:vector|path|reveal|hint|color)/.test(selector) && !/\.portrait-base/.test(selector)) return [];
      if (selector.includes(':hover') && !selector.includes('h1 em')) return [];
      if (selector.startsWith('[data-theme') && !criticalClass.test(selector) && selector !== '[data-theme="dark"]') return [];
      const essential = criticalClass.test(selector) || globalSelector.test(selector)
        || /^#loader\b/.test(selector) || /^\.section(?:\s|$)/.test(selector);
      return essential ? [`${selector}{${body.trim()}}`] : [];
    }).join('\n');
  }
  return `${select(clean).replaceAll('../fonts/', 'assets/fonts/')}\n`
    + '.presence-panel,.skill-modal{visibility:hidden;pointer-events:none;position:fixed;inset:0}\n'
    + '.live-presence-list,.availability-tooltip{position:absolute;visibility:hidden;opacity:0}\n'
    + 'img,video{max-width:100%}\n';
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const css = readFileSync('assets/css/site.css', 'utf8');
  const html = readFileSync('index.html', 'utf8');
  const generated = `<style id="critical-styles">\n${criticalStyles(css)}</style>`;
  const existing = html.match(/<style id="critical-styles">[\s\S]*?<\/style>/);
  if (process.argv.includes('--check')) {
    if (existing?.[0] !== generated) throw new Error('Critical CSS is stale. Run node scripts/build-critical-styles.mjs.');
  } else {
    const marker = '  <link id="page-styles"';
    const updated = existing ? html.replace(existing[0], generated) : html.replace(marker, `  ${generated}\n${marker}`);
    if (updated === html && !existing) throw new Error('Could not find homepage stylesheet.');
    writeFileSync('index.html', updated);
  }
  console.log(`Critical CSS: ${Buffer.byteLength(generated)} bytes; ${process.argv.includes('--check') ? 'synchronized' : 'generated'}.`);
}
