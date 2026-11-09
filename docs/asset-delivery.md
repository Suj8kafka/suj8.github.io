# Image delivery and browser caching — 2026-11-09

The supplied production audit scored 99. Its remaining diagnostics identified
four-hour first-party cache lifetimes and oversized Aama Cure/Nakka images.
These changes reduce the diagnosed costs; they do not establish a score of 100.

## Images

Aama Cure now has 640×320, 960×480 and 1280×640 WebP candidates, with the
existing 1774×887 WebP retained for larger displays. The `sizes` declaration
matches the one-, two- and four-column card layouts. PNG fallback, alternative
text, aspect ratio, lazy loading and the existing centered crop remain intact.
New images were resized from the source PNG with high-quality canvas smoothing
and WebP quality 0.8. No new illustration was generated.

Nakka uses a separately named 369×800 WebP encoded from the original JPEG at
quality 0.45. Its complete source framing and original JPEG fallback remain.

| Resource | Previous WebP | New WebP |
| --- | --- | --- |
| Aama Cure, 640px | 61,216 bytes | 14,256 bytes |
| Aama Cure, 960px | 61,216 bytes | 25,008 bytes |
| Aama Cure, 1280px | 61,216 bytes | 38,016 bytes |
| Nakka, 369px | 34,162 bytes | 21,378 bytes |

A real 390px-wide browser at 2× pixel density selected the 960px Aama Cure
candidate. Together with Nakka, that saves 48,992 bytes (about 48 KiB) compared
with the old WebPs. A 1440px-wide 2× desktop selected the 640px Aama Cure
candidate for its narrower four-column card. Both viewports loaded all requested
assets without 404s or horizontal overflow. These byte savings concern project
images, not the hero portrait's LCP resource.

## Prepared caching policy

`cloudflare/asset-cache.mjs` is called by the existing security Worker. It applies
`Cache-Control: public, max-age=31536000, immutable` only to successful GET/HEAD
responses on the two portfolio hostnames, under `/assets/` or `/loader/files/`,
with an approved static extension and a nonempty `v` query version.

It preserves origin cache policy for unversioned assets, HTML, JSON, login paths,
errors, redirects, authenticated requests and responses with cookies or explicit
private/no-store/no-cache directives. Existing validators remain intact. It does
not change edge cache eligibility, cache keys or any zone settings.

Public image and font URLs in the homepage and font stylesheets now carry a
12-character SHA-256 content version. After changing one of these files, run:

```powershell
node scripts/version-public-media.mjs
node scripts/build-critical-styles.mjs
node scripts/version-public-media.mjs --check
node scripts/build-critical-styles.mjs --check
node --test tests/*.test.mjs
```

Continue bumping the `v` release value on changed CSS/JS URLs before publication.
Keep query parameters in the edge cache key. Purging the CDN does not purge
browser caches: a changed asset must be referenced by a changed version URL.

**This Worker change is local and undeployed.** A GitHub Pages push publishes
static assets but does not activate the cache policy. Cloudflare publication
requires separate owner authorization under `AGENTS.md`. Check the actual HTTPS
response headers after deployment, including a versioned asset, an unversioned
module, `/login/` and a missing asset. Do not apply a year-long browser TTL to all
HTML or all mutable asset URLs.

Cloudflare's injected email-decoding script and third-party analytics beacon
were preserved. Their TTLs/polyfills are not controlled by this source change.
The report identifies no useful preconnect candidates, so no hints were added.

The five scored metric values (FCP, LCP, Speed Index, TBT and CLS) are needed to
identify the final score limiter. Unscored diagnostics are not direct point
deductions. No production 100-point result has been verified.

## Verification

All 131 Node tests pass, media content versions and critical CSS are synchronized,
and Wrangler 4.158.0 builds the Worker successfully with `--dry-run`. The local
Lighthouse 13.6.0 image-delivery audit passes with zero wasted bytes listed.
Overall local performance is 95: FCP 1.461 s, LCP 2.709 s, TBT 90 ms, Speed Index
2.461 s and CLS 0. This was simulated mobile on uncompressed Python HTTP with
visitor service URLs blocked to avoid live writes. It is not a production
99-to-100 comparison. The edge policy was not active during that local audit.
[Measurement summary](performance/image-delivery-2026-11-09.json).

References: [Lighthouse scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/),
[Cloudflare browser cache TTL](https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/),
[Worker/browser caching](https://developers.cloudflare.com/workers/reference/how-the-cache-works/).
