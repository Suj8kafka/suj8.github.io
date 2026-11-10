// Cache public reports at the edge as well as in browsers. This reduces D1 reads
// and GraphQL calls; it does not change the Workers request allowance.
export async function cacheAnalytics(request, ctx, produce, cache = globalThis.caches?.default) {
  const url = new URL(request.url);
  if (!cache || !ctx?.waitUntil || request.method !== 'GET'
    || (url.pathname !== '/' && url.pathname !== '/usage')) return produce();
  if (url.pathname === '/usage') {
    const days = url.searchParams.get('days') || '7';
    if (!['1', '7', '30'].includes(days)) return produce();
    url.search = `?days=${days}&version=20261110-sidebar`;
  } else url.search = '?version=20261110-sidebar';
  const key = new Request(url.href);
  try { const response = await cache.match(key); if (response) return response; } catch {}
  const response = await produce();
  if (response.ok && response.headers.get('cache-control')?.includes('public')) {
    ctx.waitUntil(cache.put(key, response.clone()).catch(() => {}));
  }
  return response;
}
