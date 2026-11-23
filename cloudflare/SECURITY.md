# Edge security and caching runbook

Read for response headers, CSP, cache policy or preserved-source indexing. [Deployment boundaries](../docs/operations/deployment.md) · [Recorded live evidence](../docs/status.md)

## Source and routing

`cloudflare/wrangler.security.jsonc` routes `security-headers.mjs` on the apex and www portfolio hosts, in front of the existing GitHub Pages origin. It does not configure the independent old-blog host. Inspect existing routes, proxy status and TLS before live changes; preserve the origin and use the intended Full (strict) configuration.

The Worker sets seven headers on success, error and redirect responses: CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Cross-Origin-Opener-Policy, Referrer-Policy and Permissions-Policy. It upgrades HTTP to HTTPS. Prepared HSTS is `max-age=31536000; includeSubDomains`; COOP is `same-origin`. Permissions-Policy retains same-origin opt-in geolocation while disabling unrelated capabilities. Use `securityHeaders` in source for exact policy values. Before deploying the inherited HSTS policy, verify HTTPS on independently hosted subdomains as well as the apex/www routes. The owner editor uses email/password authentication; it does not depend on a cross-origin OAuth popup.

Pushing GitHub Pages files does not deploy this Worker or activate its headers/cache/indexing policy. Historical reports of missing headers are in [status](../docs/status.md); recheck current responses before diagnosis.

## CSP and preserved-source contracts

Allow only the current required external script, media, frame, image and connection origins. Inline display hydration and welcome startup use the generated `display-bootstrap-csp.mjs` hashes; the Google data-layer bootstrap has its specific hash. Regenerate after changing either inline startup script with `node scripts/sync-display-preferences.mjs`. Arbitrary inline executable scripts remain blocked. JSON-LD is metadata. Inline styles remain allowed for the existing animation implementation.

When changing inline bootstraps, endpoints, Firebase imports or the festival iframe, inspect all exact hashes/origins and browser violations. Match generated HTML and CSP using [display-preference steps](../docs/features/display-preferences.md). Do not assume a local test proves compatibility with scripts Cloudflare injects at the live edge. Coordinate matching site/Worker changes within the approved release.

Prepared indexing rules preserve history without treating raw source copies as active websites:

- `/Blogpage/`, `/archive/`, `/assets/documents/blog/source-pages/`: `X-Robots-Tag: noindex, nofollow`; HTML downloads as a plain-text attachment with original bytes preserved.
- Other downloads under `/assets/documents/blog/`: `noindex, follow`.
- Maintained `/blog/` pages, its archive overview and the current CV are excluded from these rules.

Do not add robots disallows that stop crawlers fetching these noindex headers. These rules require actual Worker deployment.

## Versioned browser caching

`asset-cache.mjs` adds `public, max-age=31536000, immutable` only for eligible successful GET/HEAD public static responses under `/assets/` or `/loader/files/`, on the portfolio hosts, with an approved extension and nonempty `v` query version.

Preserve origin policy for HTML, unversioned/mutable paths, login/dynamic data, redirects/errors, authorization/cookies and private/no-store/no-cache responses. Keep validators and query parameters in cache keys. The policy does not itself change edge cache eligibility or zone settings. Browser caches need changed version URLs for changed content; a CDN purge is insufficient. Use [development](../docs/development.md) for version generation.

## Deploy and verify

After authorization for this specific Worker and any required route/DNS changes:

```powershell
npx wrangler deploy --config cloudflare/wrangler.security.jsonc
node scripts/check-security-headers.mjs
```

The read-only checker compares actual policies to source on HTTPS apex/www, login, missing-page responses and redirect hops; it checks HTTP upgrades separately. Missing policy, downgrade, loop or fetch failure exits nonzero. Optional URL arguments narrow its targets. It prints statuses/header names, not bodies or credentials.

Also inspect a versioned asset, unversioned module, login, missing asset and preserved download. Browser-check themes, welcome, dialogs, media, assistant, Firebase and analytics for CSP failures. Inspect legitimate crawler traffic and actual edge bot policies when diagnosing SEO; do not broadly bypass security based on a claimed user-agent string.

Run `security-headers`, `security-header-check`, `asset-cache` and relevant bootstrap tests. Record deployment/version and actual response checks in [status](../docs/status.md). Local mocked headers are not deployed protection.
