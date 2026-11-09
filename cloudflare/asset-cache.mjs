const hosts = new Set(['sujeetkhadka.com.np', 'www.sujeetkhadka.com.np']);
const assetPath = /^\/(?:assets\/|loader\/files\/).+\.(?:css|js|woff2|webp|png|jpe?g|svg|ico)$/i;

export function applyAssetCache(request, response) {
  const url = new URL(request.url);
  const version = url.searchParams.get('v');
  if (!hosts.has(url.hostname) || url.protocol !== 'https:'
    || !['GET', 'HEAD'].includes(request.method) || response.status !== 200
    || request.headers.has('Authorization')
    || !assetPath.test(url.pathname) || !version || !/^[\w.-]{1,80}$/.test(version)
    || response.headers.has('Set-Cookie')
    || /(?:private|no-store|no-cache)/i.test(response.headers.get('Cache-Control') || '')
    || /(?:text\/html|application\/json)/i.test(response.headers.get('Content-Type') || '')) return;

  // Only explicitly versioned static assets receive an immutable browser TTL.
  // HTML, login responses, errors, and mutable ES-module imports keep origin policy.
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
}
