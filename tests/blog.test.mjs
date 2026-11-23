import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { inflateRawSync } from 'node:zlib';
import { createBlogController } from '../assets/js/blog.js';
import redirect, { blogDestination, legacyArticles, legacyFiles } from '../cloudflare/blog-redirect.mjs';
import { securityHeaders } from '../cloudflare/security-headers.mjs';

const origin = 'https://www.sujeetkhadka.com.np';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pages = ['blog/index.html', 'blog/archive/index.html', ...Object.values(legacyArticles).map(slug => `blog/${slug}/index.html`)];
const googleTagInline = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
`;
const decodeHtml = source => source.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
  if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' }[entity.toLowerCase()];
});
const contentText = html => decodeHtml(html.replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function node(dataset = {}, textContent = '') {
  const events = new Map();
  return { dataset, textContent, hidden: false, value: '', attributes: {},
    addEventListener(name, callback) {
      if (!events.has(name)) events.set(name, new Set());
      events.get(name).add(callback);
    },
    removeEventListener(name, callback) { events.get(name)?.delete(callback); },
    emit(name, event = {}) { events.get(name)?.forEach(callback => callback(event)); },
    setAttribute(name, value) { this.attributes[name] = value; },
    listenerCount: () => [...events.values()].reduce((count, callbacks) => count + callbacks.size, 0)
  };
}
function harness({ stored = null, dark = false, blockedStorage = false, article = false } = {}) {
  const system = Object.assign(node(), { matches: dark });
  const choices = ['light', 'dark', 'auto'].map(themeChoice => node({ themeChoice }));
  const topics = ['all', 'design', 'games', 'web'].map(notebookTopic => node({ notebookTopic }));
  const cards = [node({ topic: 'design' }, 'Figma dark mode 2048 case study'),
    node({ topic: 'games' }, 'Nakka mobile game Figma'), node({ topic: 'web' }, 'Festival web countdown')];
  const filters = node(), search = node(), count = node(), empty = node(), themeControls = node();
  const one = { '[data-notebook-filters]': filters, '[data-notebook-search]': search,
    '[data-notebook-count]': count, '[data-notebook-empty]': empty, '[data-blog-theme]': themeControls };
  const many = { '[data-theme-choice]': choices, '[data-notebook-topic]': topics, '[data-notebook-card]': cards };
  const document = { documentElement: { dataset: {} },
    querySelector: selector => article && selector !== '[data-blog-theme]' ? null : one[selector],
    querySelectorAll: selector => article && selector !== '[data-theme-choice]' ? [] : many[selector] || [] };
  const saved = [];
  const window = { matchMedia: () => system, localStorage: {
    getItem(key) { assert.equal(key, 'portfolio-theme'); if (blockedStorage) throw new Error('blocked'); return stored; },
    setItem(key, value) { if (blockedStorage) throw new Error('blocked'); saved.push([key, value]); }
  } };
  const controller = createBlogController({ document, window });
  return { document, controller, system, choices, topics, cards, filters, search, count, empty, themeControls, saved };
}

test('notebook filters combine topic with all search words and recover from empty results', () => {
  const page = harness();
  assert.equal(page.filters.hidden, false);
  assert.equal(page.count.textContent, '3 stories');
  page.search.value = '  FIGMA   mobile ';
  page.search.emit('input');
  assert.deepEqual(page.cards.map(card => card.hidden), [true, false, true]);
  assert.equal(page.count.textContent, '1 story');
  page.topics[1].emit('click');
  assert.ok(page.cards.every(card => card.hidden));
  assert.equal(page.empty.hidden, false);
  assert.equal(page.count.textContent, '0 stories');
  assert.equal(page.topics[1].attributes['aria-pressed'], 'true');
  page.search.value = '';
  page.search.emit('input');
  assert.deepEqual(page.cards.map(card => card.hidden), [false, true, true]);
  page.topics[0].emit('click');
  assert.ok(page.cards.every(card => !card.hidden));
  assert.equal(page.empty.hidden, true);
  let prevented = false;
  page.filters.emit('submit', { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

test('blog filtering leaves themes to Display preferences and cleanup releases owned listeners', () => {
  const article = harness({ article: true });
  assert.equal(article.document.documentElement.dataset.theme, undefined);
  article.controller.destroy();
  assert.equal(article.system.listenerCount(), 0);
  assert.ok(article.choices.every(choice => choice.listenerCount() === 0));
  const page = harness();
  page.topics[1].emit('click');
  page.controller.destroy();
  assert.ok([...page.choices, ...page.topics, page.filters, page.search, page.system].every(item => item.listenerCount() === 0));
  assert.ok(page.cards.every(card => !card.hidden));
  assert.equal(page.filters.hidden, true);
  assert.equal(page.count.textContent, '3 stories');
});

test('all migrated pages are static, indexable, linked locally and share the portfolio styles', () => {
  const sitemap = read('sitemap.xml');
  for (const path of pages) {
    const html = read(path);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, path);
    assert.match(html, /<main[^>]+id="blog-main"[^>]+tabindex="-1"/);
    assert.match(html, /href="#blog-main">Skip to content/);
    assert.match(html, /\/assets\/css\/site\.css\?v=/);
    assert.match(html, /\/assets\/css\/blog\.css\?v=/);
    assert.doesNotMatch(html, /blog\.sujeetkhadka|tailwindcss/i);
    for (const [, attributes, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc=/.test(attributes)) continue;
      if (/\bid="display-bootstrap"/.test(attributes)) continue; // Synchronized pre-paint preferences; CSP hash is tested separately.
      if (content.replaceAll('\r\n', '\n') === googleTagInline) continue;
      assert.match(attributes, /\btype="application\/ld\+json"/, 'Only inert structured data may be inline');
      assert.doesNotThrow(() => JSON.parse(content));
    }
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
    assert.equal(canonical, origin + '/' + path.replace(/index\.html$/, ''));
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
    for (const [, raw] of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) {
      if (raw.startsWith('http') || raw.startsWith('mailto:')) continue;
      const url = new URL(raw.replaceAll('&amp;', '&'), canonical);
      const target = decodeURIComponent(url.pathname).slice(1) + (url.pathname.endsWith('/') ? 'index.html' : '');
      assert.ok(existsSync(new URL(`../${target}`, import.meta.url)), `${path}: missing ${target}`);
      if (url.hash && url.pathname === new URL(canonical).pathname) {
        assert.ok(html.includes(`id="${url.hash.slice(1)}"`), `${path}: missing ${url.hash}`);
      }
      if (url.pathname.startsWith('/assets/') && url.pathname.match(/\.(?:webp|png|mp4|svg|pdf|docx|zip)$/)) {
        const bytes = readFileSync(new URL(`../${target}`, import.meta.url));
        assert.equal(url.searchParams.get('v'), createHash('sha256').update(bytes).digest('hex').slice(0, 12));
      }
    }
  }
  const index = read('blog/index.html');
  assert.equal([...index.matchAll(/data-notebook-card\b/g)].length, 7);
  assert.match(index, /data-notebook-filters hidden/);
  assert.doesNotMatch(index, /<article[^>]*\bhidden\b/);
  assert.match(read('blog/2048-dark-mode/index.html'), /<video[^>]*controls[^>]*preload="none"/);
  assert.match(read('blog/carrom-karrom/index.html'), /About the Developer/);
  assert.match(read('blog/carrom-karrom/index.html'), /Sagar Devkota/);
  assert.match(read('blog/nakka/index.html'), /The game is archived for now/);
  assert.doesNotMatch(read('index.html'), /href="https:\/\/blog\.sujeetkhadka\.com\.np/);
});

test('every original article and lowercase pretty URL maps permanently to its new canonical route', () => {
  const originalFiles = ['Carrom-karrom-a-mobile-game.html', 'Nakka-Nepali-Traditional-Game.htm',
    '2048-dark-mode.htm', '2048-Puzzle-Case-Study.html', 'Festive-Counter.htm',
    'The-Progress-Bar-np.html', 'Bus-reservation-system.html'];
  const actualFiles = readdirSync(new URL('../pages/', import.meta.url));
  for (const filename of originalFiles) {
    assert.ok(actualFiles.includes(filename), `Preserve exact filename case for GitHub Pages: ${filename}`);
    const alias = read(`pages/${filename}`);
    const target = new URL(blogDestination(`https://blog.sujeetkhadka.com.np/pages/${filename}`)).pathname;
    assert.ok(alias.includes(`href="${target}"`));
  }
  for (const [legacy, slug] of Object.entries(legacyArticles)) {
    for (const suffix of ['', '/', '.htm', '.html', '/index.html']) {
      const from = `https://blog.sujeetkhadka.com.np/pages/${legacy}${suffix}?ref=old#section`;
      assert.equal(blogDestination(from), `${origin}/blog/${slug}/?ref=old#section`);
      const result = redirect.fetch(new Request(from));
      assert.equal(result.status, 301);
      assert.equal(result.headers.get('Location'), `${origin}/blog/${slug}/?ref=old#section`);
    }
    const alias = read(`pages/${legacy}/index.html`);
    assert.match(alias, /<meta http-equiv="refresh"/);
    assert.ok(alias.includes(`href="/blog/${slug}/"`));
    assert.ok(alias.includes(`href="${origin}/blog/${slug}/"`));
  }
  assert.equal(blogDestination('https://blog.sujeetkhadka.com.np/pages/Carrom-karrom-a-mobile-game.html'), `${origin}/blog/carrom-karrom/`);
  for (const path of ['/', '/index.html']) {
    assert.equal(blogDestination(`https://blog.sujeetkhadka.com.np${path}`), `${origin}/blog/`);
  }
  for (const path of ['/unknown', '/pages/__proto__', '/pages/toString', '/%ZZ', '/blog/missing-story/']) {
    assert.equal(blogDestination(`https://blog.sujeetkhadka.com.np${path}`), null);
    const response = redirect.fetch(new Request(`https://blog.sujeetkhadka.com.np${path}`));
    assert.equal(response.status, 404, 'Unknown URLs must not become irrelevant home-page redirects');
    assert.equal(response.headers.get('Location'), null);
  }
  assert.equal(blogDestination('https://blog.sujeetkhadka.com.np/blog/nakka/'), `${origin}/blog/nakka/`);
  for (const path of ['/blog1.html', '/blog2.html', '/blog3.html', '/htm.html', '/zportfo.htm', '/originalindex.txt', '/blog/archive/']) {
    assert.equal(blogDestination(`https://blog.sujeetkhadka.com.np${path}`), `${origin}/blog/archive/`);
  }
  assert.equal(blogDestination('https://blog.sujeetkhadka.com.np/blog/documents/'), `${origin}/blog/`);
  assert.equal(blogDestination('https://blog.sujeetkhadka.com.np/Sujeet_Khadka_Resume2026.pdf'), `${origin}/assets/documents/blog/resume-2026.pdf`);
  assert.equal(redirect.fetch(new Request('https://example.com/')).status, 404);
});

test('the old host remains crawlable and points its sitemap to the canonical site', async () => {
  const robots = redirect.fetch(new Request('https://blog.sujeetkhadka.com.np/robots.txt'));
  assert.equal(robots.status, 200);
  assert.match(robots.headers.get('Content-Type'), /text\/plain/);
  const body = await robots.text();
  assert.match(body, /User-agent: \*\nAllow: \//);
  assert.match(body, /Sitemap: https:\/\/www\.sujeetkhadka\.com\.np\/sitemap\.xml/);
  const sitemap = redirect.fetch(new Request('https://blog.sujeetkhadka.com.np/sitemap.xml'));
  assert.equal(sitemap.status, 301);
  assert.equal(sitemap.headers.get('Location'), `${origin}/sitemap.xml`);
});

test('complete original article text and all imported files are retained', () => {
  const manifest = JSON.parse(read('docs/blog-content-manifest.json'));
  assert.equal(manifest.articles.length, 6);
  for (const article of manifest.articles) {
    const html = read(article.path);
    const body = html.match(/<div class="original-blog-content">([\s\S]*?)<\/div>\s*<p class="story-credit">/)[1];
    const text = contentText(body);
    assert.equal(createHash('sha256').update(text).digest('hex'), article.textSha256, `Retain the complete authored body: ${article.path}`);
    const source = new URL(`../${manifest.sourceRoot}/${article.source}`, import.meta.url);
    if (existsSync(source)) {
      const original = readFileSync(source, 'utf8').match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
      assert.equal(createHash('sha256').update(contentText(original)).digest('hex'), article.textSha256, `Match the transferred offline article: ${article.source}`);
    }
    for (const heading of article.sections) assert.ok(decodeHtml(body).includes(heading), `${article.path}: ${heading}`);
    for (const heading of article.originalHeadings) assert.ok(contentText(html).includes(heading), `${article.path}: ${heading}`);
  }
  for (const asset of manifest.assets) {
    const bytes = readFileSync(new URL(`../${asset.path}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.path);
  }
  const index = read('blog/index.html');
  for (const name of ['carrom-karrom', 'nakka', '2048', 'bus-reservation-system', 'connectum', 'nepali-festive-counter']) {
    assert.ok(index.includes(`/assets/images/blog/${name}-icon-192.png`), name);
  }
  assert.match(index, /About Sujeet Khadka/);
  assert.match(index, /Current Focus:/);
});

test('the blog omits duplicate document links and retires its document gallery', () => {
  for (const path of pages) {
    assert.doesNotMatch(read(path), /href="[^"]*(?:\/blog\/documents\/?|\.pdf(?:\?|"|#)|\.docx(?:\?|"|#)|\/Docs\/cv\.html)/i, path);
  }
  const redirect = read('blog/documents/index.html');
  assert.match(redirect, /http-equiv="refresh" content="0; url=\/blog\/"/);
  assert.match(redirect, /data-blog-destination href="\/blog\/"/);
  assert.doesNotMatch(read('sitemap.xml'), /\/blog\/documents\//);
  assert.equal(blogDestination('https://blog.sujeetkhadka.com.np/Docs/cv.html'), `${origin}/blog/`);
  assert.match(read('index.html'), /href="docs\/Sujeet_Khadka_Resume\.pdf"/);
});

test('all original homepage wording and its project context remain visible', () => {
  const manifest = JSON.parse(read('docs/blog-content-manifest.json'));
  const text = contentText(read(manifest.homepage.path));
  assert.equal(manifest.homepage.blocks.length, 37);
  for (const block of manifest.homepage.blocks) assert.ok(text.includes(block.text), `Missing original homepage context: ${block.text}`);
  assert.match(read('blog/index.html'), /href="\/blog\/archive\/"/);
});

test('the downloadable source archive preserves every transferred website file byte for byte', () => {
  const manifest = JSON.parse(read('docs/blog-content-manifest.json'));
  const archive = readFileSync(new URL(`../${manifest.sourceArchive.path}`, import.meta.url));
  assert.equal(createHash('sha256').update(archive).digest('hex'), manifest.sourceArchive.sha256);
  const entries = new Map();
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(archive.readUInt16LE(offset + 6) & 8, 0, 'Archive entries must declare their size');
    const method = archive.readUInt16LE(offset + 8), size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26), extraLength = archive.readUInt16LE(offset + 28);
    const name = archive.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    const start = offset + 30 + nameLength + extraLength;
    const compressed = archive.subarray(start, start + size);
    const data = method === 0 ? compressed : inflateRawSync(compressed);
    assert.ok(!name.split('/').includes('.git'), 'Git metadata does not belong in the website archive');
    entries.set(name, { bytes:data.length, sha256:createHash('sha256').update(data).digest('hex') });
    offset = start + size;
  }
  assert.equal(entries.size, manifest.sourceFiles.length);
  assert.equal(entries.size, manifest.sourceArchive.entries);
  for (const file of manifest.sourceFiles) {
    assert.deepEqual(entries.get(file.path), { bytes:file.bytes, sha256:file.sha256 }, file.path);
    const source = new URL(`../${manifest.sourceRoot}/${file.path}`, import.meta.url);
    if (existsSync(source)) assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'), file.sha256, `Transferred source was changed: ${file.path}`);
  }
  for (const download of manifest.sourceDownloads) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(`../${download.path}`, import.meta.url))).digest('hex'), download.sha256);
    assert.equal(entries.get(download.source).sha256, download.sha256);
  }
});

test('original photo and document URLs resolve to real local files after the domain cutover', () => {
  for (const [path, target] of Object.entries(legacyFiles)) {
    assert.equal(blogDestination(`https://blog.sujeetkhadka.com.np${encodeURI(path)}?source=old`), `${origin}${target}?source=old`);
    const local = target.slice(1) + (target.endsWith('/') ? 'index.html' : '');
    assert.ok(existsSync(new URL(`../${local}`, import.meta.url)), target);
  }
  assert.match(read('blog/nepali-festive-counter/index.html'), /<iframe[^>]+src="https:\/\/nepalifestivecount\.netlify\.app"[^>]+loading="lazy"[^>]+sandbox="allow-scripts allow-same-origin"/);
  const framePolicy = securityHeaders['Content-Security-Policy'].split('; ').find(rule => rule.startsWith('frame-src '));
  assert.equal(framePolicy, 'frame-src https://sujeet-portfolio.firebaseapp.com https://nepalifestivecount.netlify.app https://www.googletagmanager.com');
});

test('the blog footer stays clean after theme controls move into Display preferences', () => {
  const stylesheet = read('assets/css/blog.css');
  assert.doesNotMatch(stylesheet, /\.footer-theme\b/);
  for (const path of pages) {
    const html = read(path);
    assert.match(html, /<footer class="site-footer blog-footer">/);
    assert.doesNotMatch(html, /data-theme-choice|data-blog-theme/);
  }
});

test('legacy main-domain aliases preserve queries and fragments without a script injection', () => {
  let replaced;
  const destination = { getAttribute: () => '/blog/nakka/', href: '' };
  runInNewContext(read('assets/js/blog-legacy.js'), {
    URL, document: { querySelector: () => destination },
    window: { location: { origin, search: '?source=old', hash: '#reflection', replace(url) { replaced = url; } } }
  });
  assert.equal(replaced, `${origin}/blog/nakka/?source=old#reflection`);
  assert.equal(destination.href, replaced);
});
