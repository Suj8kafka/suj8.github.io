// Apply at the Cloudflare edge in front of the existing GitHub Pages origin.
import { applyAssetCache } from './asset-cache.mjs';
import { displayBootstrapCsp, loaderBootstrapCsp } from './display-bootstrap-csp.mjs';
export const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' ${displayBootstrapCsp} ${loaderBootstrapCsp} 'sha256-jYHg7tXSuuVUqjy+JeRT8vyG97+Spkw5IFHdQEBbmrw=' https://www.googletagmanager.com https://www.gstatic.com https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js`,
    // Inline styles are used by animations, particles.js and the noscript loader fallback.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://www.googletagmanager.com https://*.google-analytics.com",
    "media-src 'self'",
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://*.asia-southeast1.firebasedatabase.app wss://*.asia-southeast1.firebasedatabase.app https://ipwho.is https://api.bigdatacloud.net https://nameless-truth-99f0.sujeetkhadka00001.workers.dev https://portfolio-assistant.sujeetkhadka00001.workers.dev https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com",
    "frame-src https://sujeet-portfolio.firebaseapp.com https://nepalifestivecount.netlify.app https://www.googletagmanager.com",
    "upgrade-insecure-requests"
  ].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Keep the visitor panel's explicit location opt-in available.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), payment=(), usb=()"
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let response;
    if (url.protocol === "http:") {
      url.protocol = "https:";
      response = new Response(null, { status: 308, headers: { Location: url.href } });
    } else {
      try {
        const origin = await fetch(request);
        response = new Response(origin.body, origin);
      } catch {
        // Even an origin connection failure gets the same protection as a normal response.
        response = new Response('The portfolio is temporarily unavailable.', {
          status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }
    }
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.headers.set(name, value);
    }
    // Preserve downloadable history without indexing duplicate source websites.
    let path = url.pathname.toLowerCase();
    try { path = decodeURIComponent(path).toLowerCase(); } catch {}
    const preservedSourcePrefixes = ['/blogpage', '/archive', '/assets/documents/blog/source-pages'];
    const isPreservedSource = preservedSourcePrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
    const isPreservedDownload = path === '/assets/documents/blog' || path.startsWith('/assets/documents/blog/');
    if (isPreservedSource || isPreservedDownload) {
      response.headers.set('X-Robots-Tag', isPreservedSource ? 'noindex, nofollow' : 'noindex, follow');
    }
    // Archived HTML is source material, not a second live website. Serving it as
    // a plain-text attachment preserves every byte without exposing its stale
    // CSS, script and image references as crawlable page dependencies.
    if (isPreservedSource && /^text\/html\b/i.test(response.headers.get('Content-Type') || '')) {
      response.headers.set('Content-Type', 'text/plain; charset=utf-8');
      response.headers.set('Content-Disposition', 'attachment');
    }
    applyAssetCache(request, response);
    return response;
  }
};
