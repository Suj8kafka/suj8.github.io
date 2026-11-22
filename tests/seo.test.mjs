import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { legacyArticles } from '../cloudflare/blog-redirect.mjs';

const origin = 'https://www.sujeetkhadka.com.np';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const decode = source => source.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, entity) => {
  if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return { amp:'&', quot:'"', apos:"'", lt:'<', gt:'>' }[entity.toLowerCase()];
});
const text = source => decode(source.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const attributes = source => Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1],decode(match[2])]));
const meta = (html, name) => [...html.matchAll(/<meta\b[^>]+>/g)].map(match => attributes(match[0]))
  .find(item => item.name === name || item.property === name)?.content;
const canonical = html => [...html.matchAll(/<link\b[^>]+>/g)].map(match => attributes(match[0])).find(item => item.rel === 'canonical')?.href;
function graph(html) {
  const blocks = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'Keep one coherent graph per page');
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data['@context'], 'https://schema.org');
  return data['@graph'];
}
const stories = Object.values(legacyArticles).map(slug => ({ path:`blog/${slug}/index.html`, url:`${origin}/blog/${slug}/` }));
const pages = [{ path:'index.html', url:`${origin}/` }, { path:'blog/index.html', url:`${origin}/blog/` }, ...stories];

test('the homepage and articles identify the same real person and profile without duplicate identities', () => {
  const homepage = read('index.html'), entities = graph(homepage);
  const person = entities.find(item => item['@type'] === 'Person');
  const website = entities.find(item => item['@type'] === 'WebSite');
  const profile = entities.find(item => item['@type'] === 'ProfilePage');
  assert.equal(person['@id'], `${origin}/#person`);
  assert.equal(person.name, 'Sujeet Khadka');
  assert.equal(person.url, `${origin}/`);
  assert.equal(person.address.addressLocality, 'Lalitpur');
  assert.match(homepage, /based in Lalitpur, Nepal/);
  assert.equal(website.name, person.name);
  assert.equal(website.publisher['@id'], person['@id']);
  assert.equal(profile.mainEntity['@id'], person['@id']);
  assert.equal(profile.url, `${origin}/`);
  for (const url of person.sameAs) assert.ok((homepage + read('blog/index.html')).includes(`href="${url}"`), url);
  for (const page of pages) {
    const author = graph(read(page.path)).find(item => item['@type'] === 'Person');
    assert.equal(author['@id'], person['@id'], page.path);
    assert.equal(author.name, person.name, page.path);
    assert.equal(author.url, person.url, page.path);
  }
});

test('the homepage clearly targets junior UI/UX designer searches in Nepal', () => {
  const homepage = read('index.html');
  const title = decode(homepage.match(/<title>([\s\S]*?)<\/title>/)[1]);
  const entities = graph(homepage);
  const person = entities.find(item => item['@type'] === 'Person');
  const profile = entities.find(item => item['@type'] === 'ProfilePage');
  assert.equal(title, 'Sujeet Khadka | Product & UI/UX Designer in Nepal');
  assert.match(meta(homepage, 'description'), /junior UI\/UX designer in Lalitpur, Nepal/i);
  assert.equal(text(homepage.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]), 'Clearer mobile experiences,from idea to release.');
  assert.match(text(homepage.match(/<p class="hero-intro">([\s\S]*?)<\/p>/)[1]), /Sujeet Khadka.*research.*interaction design/i);
  assert.equal(person.jobTitle, 'Junior UI/UX and Product Designer');
  assert.equal(profile.name, title);
});

test('the static homepage connects the designer, location and skills to readable case studies', () => {
  const homepage = read('index.html');
  const hero = text(homepage.match(/<p class="hero-intro">([\s\S]*?)<\/p>/)[1]);
  const body = text(homepage.split('</head>')[1]);
  const person = graph(homepage).find(item => item['@type'] === 'Person');
  assert.match(hero, /Sujeet Khadka, a UI\/UX designer based in Lalitpur, Nepal/);
  assert.ok(person.knowsAbout.length > 0);
  for (const skill of person.knowsAbout) {
    assert.ok(body.toLowerCase().includes(skill.toLowerCase()), `Skill must be visible without scripts: ${skill}`);
  }
  const evidence = homepage.match(/<div class="about-section-links" role="group" aria-label="Design case studies">([\s\S]*?)<\/div>/)[1];
  const links = [...evidence.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
  assert.equal(links.length, 2);
  for (const [, path, label] of links) {
    assert.ok(label.length > 20, 'Case-study links should describe their subject');
    const article = read(path.slice(1) + 'index.html');
    assert.equal(canonical(article), origin + path);
    assert.equal(graph(article).find(item => item['@type'] === 'BlogPosting').author['@id'], person['@id']);
  }
});

test('public crawling stays allowed for search engines and AI search without a separate bot restriction', () => {
  const robots = read('robots.txt').replace(/#.*$/gm, '');
  assert.deepEqual([...robots.matchAll(/^User-agent:\s*(.+)$/gmi)].map(match => match[1].trim()), ['*']);
  assert.match(robots, /^Allow:\s*\/\s*$/m);
  assert.doesNotMatch(robots, /^Disallow:\s*\S/m);
  assert.doesNotMatch(meta(read('index.html'), 'robots'), /noindex|nosnippet/i);
});

test('search and share metadata agree on the identity, topic and canonical URL of every primary page', () => {
  const titles = new Set(), descriptions = new Set();
  for (const page of pages) {
    const html = read(page.path), title = decode(html.match(/<title>([\s\S]*?)<\/title>/)[1]);
    const description = meta(html, 'description');
    assert.equal(canonical(html), page.url, page.path);
    assert.equal(meta(html, 'og:url'), page.url);
    assert.equal(meta(html, 'og:title'), title);
    assert.equal(meta(html, 'twitter:title'), title);
    assert.equal(meta(html, 'og:description'), description);
    assert.equal(meta(html, 'twitter:description'), description);
    assert.match(title, /Sujeet Khadka/);
    assert.match(description, /Sujeet Khadka/);
    assert.match(meta(html, 'robots'), /max-image-preview:large/);
    assert.doesNotMatch(meta(html, 'robots'), /noindex/);
    assert.equal(titles.has(title), false, `Duplicate title: ${page.path}`);
    assert.equal(descriptions.has(description), false, `Duplicate description: ${page.path}`);
    titles.add(title); descriptions.add(description);
  }
});

test('article markup matches visible headlines, linked bylines, revision dates and project imagery', () => {
  for (const page of stories) {
    const html = read(page.path), entities = graph(html);
    const article = entities.find(item => item['@type'] === 'BlogPosting');
    const webpage = entities.find(item => item['@type'] === 'WebPage');
    assert.equal(article.headline, text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1]), page.path);
    assert.equal(article.url, page.url);
    assert.equal(article.author['@id'], `${origin}/#person`);
    assert.equal(article.mainEntityOfPage['@id'], webpage['@id']);
    assert.equal(webpage.mainEntity['@id'], article['@id']);
    assert.equal(article.isPartOf['@id'], `${origin}/blog/#blog`);
    assert.equal(article.description, meta(html, 'description'));
    assert.equal(article.dateModified, html.match(/Revised <time datetime="([^"]+)"/)[1]);
    assert.equal(article.datePublished, undefined, 'Unknown original publication dates must not be fabricated');
    assert.match(html, /<div class="story-meta"><span>By <a href="\/#about" rel="author">Sujeet Khadka<\/a>/);
    if (article.image) {
      const image = new URL(article.image);
      assert.equal(image.origin, origin);
      assert.ok(existsSync(new URL(`..${decodeURIComponent(image.pathname)}`, import.meta.url)));
      assert.doesNotMatch(image.pathname, /sujeet-at-exhibition/, 'Article images must represent the project');
    }
    const breadcrumb = entities.find(item => item['@type'] === 'BreadcrumbList');
    assert.equal(breadcrumb['@id'], webpage.breadcrumb['@id']);
    assert.deepEqual(breadcrumb.itemListElement.map(item => item.position), [1,2,3]);
    assert.deepEqual(breadcrumb.itemListElement.map(item => item.item), [`${origin}/`,`${origin}/blog/`,page.url]);
    assert.equal(breadcrumb.itemListElement.at(-1).name, article.headline);
  }
});

test('the notebook catalogue and topic paths lead crawlers and readers to all seven complete stories', () => {
  const html = read('blog/index.html'), entities = graph(html);
  const catalogue = entities.find(item => item['@type'] === 'ItemList');
  const collection = entities.find(item => item['@type'] === 'CollectionPage');
  assert.equal(collection.mainEntity['@id'], catalogue['@id']);
  assert.equal(catalogue.numberOfItems, 7);
  assert.deepEqual(catalogue.itemListElement.map(item => item.position), [1,2,3,4,5,6,7]);
  assert.deepEqual(new Set(catalogue.itemListElement.map(item => item.url)), new Set(stories.map(item => item.url)));
  const guide = html.match(/<section class="notebook-topics-guide"[^>]*>([\s\S]*?)<\/section>/)[1];
  for (const page of stories) {
    assert.ok(guide.includes(`href="${new URL(page.url).pathname}"`), page.path);
    const story = read(page.path);
    const related = story.match(/<aside class="story-related"[^>]*>([\s\S]*?)<\/aside>/)[1];
    const links = [...related.matchAll(/href="([^"]+)"/g)].map(match => new URL(match[1], origin).href);
    assert.equal(new Set(links).size, 2);
    for (const link of links) {
      assert.notEqual(link, page.url);
      assert.ok(stories.some(item => item.url === link), link);
    }
  }
});

test('every sitemap entry is a real canonical indexable page and private or duplicate sources are excluded', () => {
  const sitemap = read('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, urls.length);
  for (const page of pages) assert.ok(urls.includes(page.url), page.path);
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, origin);
    assert.doesNotMatch(parsed.pathname, /\/login\/|\/Blogpage\/|\/pages\/|\/assets\/documents\//i);
    const html = read(parsed.pathname.slice(1) + 'index.html');
    assert.equal(canonical(html), url);
    assert.doesNotMatch(meta(html, 'robots') || '', /noindex/);
  }
  assert.match(read('robots.txt'), /Sitemap: https:\/\/www\.sujeetkhadka\.com\.np\/sitemap\.xml/);
  assert.match(read('login/index.html'), /name="robots" content="noindex, nofollow"/);
});

test('privacy sharing metadata is complete and the custom 404 offers crawlable recovery links', () => {
  const privacy = read('privacy/index.html');
  const description = meta(privacy, 'description');
  assert.match(meta(privacy, 'robots'), /max-image-preview:large/);
  for (const name of ['og:site_name', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt',
    'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
    assert.ok(meta(privacy, name), `Missing ${name}`);
  }
  assert.equal(meta(privacy, 'og:description'), description);
  assert.equal(meta(privacy, 'twitter:description'), description);

  const missing = read('404.html');
  assert.equal([...missing.matchAll(/<h1\b/g)].length, 1);
  assert.equal(meta(missing, 'robots'), 'noindex, follow');
  assert.ok(meta(missing, 'description').length >= 100);
  for (const destination of ['/', '/#work', '/blog/', '/#contact']) {
    assert.match(missing, new RegExp(`href="${destination.replace('/', '\\/')}"`));
  }
  assert.ok(existsSync(new URL('../assets/css/error.css', import.meta.url)));
});
