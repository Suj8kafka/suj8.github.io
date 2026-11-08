The security Worker adds all six security headers to responses from the existing
GitHub Pages origin, including errors and redirects. It also redirects HTTP to
HTTPS. Deploy it separately from the analytics Worker; the analytics Worker does
not handle requests to the portfolio itself.

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
