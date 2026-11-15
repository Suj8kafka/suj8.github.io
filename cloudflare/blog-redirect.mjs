// Optional cutover Worker for the old blog host. Deploy only after the main-site pages are live.
import { legacyFiles } from './blog-legacy-files.mjs';
export { legacyFiles };
export const legacyArticles = {
  'carrom-karrom-a-mobile-game': 'carrom-karrom',
  'nakka-nepali-traditional-game': 'nakka',
  '2048-dark-mode': '2048-dark-mode',
  '2048-puzzle-case-study': '2048-ux-case-study',
  'festive-counter': 'nepali-festive-counter',
  'the-progress-bar-np': 'the-progress-bar-np',
  'bus-reservation-system': 'bus-reservation-system'
};

export function blogDestination(input) {
  const source = new URL(input);
  const path = source.pathname.toLowerCase().replace(/\/+$/, '').replace(/\.html?$/, '').replace(/\/index$/, '');
  const legacy = path.startsWith('/pages/') ? path.slice(7) : '';
  const article = Object.hasOwn(legacyArticles, legacy) ? legacyArticles[legacy] : null;
  let target = article ? `/blog/${article}/` : ['', '/blog', '/blog/documents'].includes(path) ? '/blog/' : null;
  if (path === '/blog' || path.startsWith('/blog/')) {
    const slug = path.slice(6).replace(/\/index$/, '');
    if (['archive', ...Object.values(legacyArticles)].includes(slug)) target = `/blog/${slug}/`;
  }
  if (['/blog1', '/blog2', '/blog3', '/htm', '/zportfo', '/originalindex.txt'].includes(path)) target = '/blog/archive/';
  let originalFile = source.pathname.toLowerCase();
  try { originalFile = decodeURIComponent(originalFile); } catch {}
  if (Object.hasOwn(legacyFiles, originalFile)) {
    target = legacyFiles[originalFile];
  }
  if (!target) return null;
  const destination = new URL(target, 'https://www.sujeetkhadka.com.np');
  destination.search = source.search;
  destination.hash = source.hash;
  return destination.href;
}

export default {
  fetch(request) {
    const source = new URL(request.url);
    if (source.hostname !== 'blog.sujeetkhadka.com.np') {
      return new Response('Not found', { status: 404 });
    }
    if (source.pathname === '/robots.txt') {
      return new Response('User-agent: *\nAllow: /\n\nSitemap: https://www.sujeetkhadka.com.np/sitemap.xml\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
      });
    }
    const destination = source.pathname === '/sitemap.xml'
      ? 'https://www.sujeetkhadka.com.np/sitemap.xml' : blogDestination(request.url);
    if (!destination) {
      return new Response('This old blog URL was not found. Visit https://www.sujeetkhadka.com.np/blog/ for the project notebook.', {
        status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    return new Response(null, {
      status: 301,
      headers: { Location: destination, 'Cache-Control': 'public, max-age=3600' }
    });
  }
};
