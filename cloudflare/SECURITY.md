The security Worker adds all six security headers to responses from the existing
GitHub Pages origin, including errors and redirects. It also redirects HTTP to
HTTPS. Deploy it separately from the analytics Worker; the analytics Worker does
not handle requests to the portfolio itself.

Current deployment status (2026-11-09): live checks found all six headers missing
on the apex redirect and the www homepage. The Worker and its tests are prepared
locally, but the user has deferred Cloudflare work. **Pushing this repository does
not deploy this Worker or activate response headers.** GitHub Pages publishes the
static portfolio separately; there is no automatic Worker deployment workflow.
Do not treat a successful Git push or local tests as evidence of live headers.

The prepared Worker also applies [versioned static-asset caching](../docs/asset-delivery.md).
Only explicitly versioned public asset URLs receive `public, max-age=31536000,
immutable`. HTML, login pages, mutable module URLs, failures and private responses
retain the origin cache policy. This caching change also requires a separate
Worker deployment; it is not activated by a Git push. Preserve query parameters
in the Cloudflare cache key so different asset versions remain distinct.

Both portfolio DNS records must be proxied through Cloudflare (orange cloud).
Keep the existing GitHub Pages origin and use Cloudflare Full (strict) TLS.

From the repository root, with Wrangler installed and authenticated to the zone:

```powershell
npx wrangler deploy --config cloudflare/wrangler.security.jsonc
```

The route configuration attaches the Worker to both portfolio hostnames without
changing the blog or other subdomains. GitHub Pages does not apply custom response
headers from repository files, so these protections become active only after the
Worker is deployed. Publishing the HTML change also loads the extracted video
script under the CSP. Deploy that change before activating the Worker.

The CSP permits the site's current external fonts, particles script, Firebase
modules/auth/database connections, IP country lookup, opt-in reverse geocoding,
and analytics endpoint. Inline executable scripts and embedding are blocked.
JSON-LD remains a non-executable metadata block. Archived pages use older scripts
that are deliberately outside this allowlist; their interactive effects may be
blocked. Inline styles remain allowed for the current animation implementation.

HSTS lasts one year and intentionally does not opt independent subdomains into
HSTS or request preload. Geolocation remains restricted to this origin so the
existing opt-in visitor feature works; camera and microphone are disabled.

After deployment, inspect the actual edge responses:

```powershell
node scripts/check-security-headers.mjs
```

This dependency-free check compares all six headers with `security-headers.mjs`
on HTTPS apex/www homepages, `/login/`, a missing-page response, and every manual
redirect hop. It separately checks HTTP upgrades without requiring HSTS on an
HTTP response. Missing or unexpected policy values, HTTPS downgrades, redirect
loops and request failures produce a nonzero exit code. It prints statuses and
header names, never response bodies or credentials. Optional URL arguments limit
the targets. Run `node --test tests/security-header-check.test.mjs` for its mocked
tests; those tests do not establish deployed protection.

Individual response inspection remains available:

```powershell
curl.exe -I https://www.sujeetkhadka.com.np/
curl.exe -I https://sujeetkhadka.com.np/
curl.exe -I https://www.sujeetkhadka.com.np/missing-page
curl.exe -I http://www.sujeetkhadka.com.np/
```

Verify all six headers on HTTPS responses and an HTTPS Location on HTTP responses.
In a browser, check the console for CSP violations while opening skill dialogs,
changing themes, playing the intro video, and viewing presence/analytics.

Cloudflare's implementation guidance:
https://developers.cloudflare.com/workers/examples/security-headers/
