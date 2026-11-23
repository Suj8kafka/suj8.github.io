# Development

Read for local setup, source ownership or test selection. [Task index](README.md) · [Live status](status.md)

## Run and verify

Use PowerShell from the repository root. Checked-in files are served directly; no dependency installation or application build is required for preview. There is no configured linter.

```powershell
.\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` or `/login/`; Ctrl+C stops the server. Use HTTP because browser modules and SVG fetches need a served origin. The server root must be the checkout root for root-relative URLs. The existing environment uses Python 3.13.5; provisioning it on a fresh machine is not documented. Node v24.15.0 is verified for tests, not a declared minimum.

```powershell
node --test tests/availability.test.mjs
node --test tests/*.test.mjs
```

Tests use Node's built-in runner, assertions, DOM stubs and VM harnesses. Run the focused files for your change and the full suite before release. Check `git diff --check`. Browser layout, focus behavior, reduced motion and live service health need separate verification. Keep temporary measurements/screenshots in ignored `.tmp/`; avoid writing real visitor events during local QA.

## Source ownership

| Area | Entry points |
| --- | --- |
| Public pages | `index.html`, `blog/`, `privacy/index.html`, `404.html` |
| Owner editor | `login/index.html`, `assets/js/admin-bootstrap.js`, `assets/js/admin.js`, `assets/css/admin.css` |
| Shared styling and interactions | `assets/css/site.css`, `assets/js/main.js`; generated `site.min.css` and `portfolio.bundle.js` |
| First paint and optional startup | `assets/js/page-styles.js`, `assets/js/enhancements.js`, `loader/files/loader.js` |
| Depth, ribbon, native anchor scrolling | `motion.js`, `parallax.js`, `scroll-trail.js`, `scroll-navigation.js` in `assets/js/` |
| Portrait and mobile navigation | `assets/js/portrait-network.js`, `assets/js/mobile-navigation.js` |
| Preferences | `display-state.js`, `display-preferences.js` in `assets/js/`, `assets/css/display-preferences.css` |
| Availability and live connections | `availability.js`, `availability-client.js`, `firebase-presence.js`, `live-cursors.js` in `assets/js/` |
| Analytics | `deferred-analytics.js`, `analytics-entry.js`, `analytics-config.js`, `usage-tracker.js`, `engagement-tracker.js`, `visitor-panel.js`, `privacy.js` in `assets/js/`; `cloudflare/analytics-worker.js` |
| Assistant | `assets/js/portfolio-assistant.js`, `assets/css/portfolio-assistant.css`, `cloudflare/portfolio-assistant.js` |
| Firebase selection and validation | `firebase.json`, `.firebaserc`, `database.rules.json`, `assets/js/firebase-config.js`, `assets/js/firebase-database.js` |
| Edge services | Four `cloudflare/wrangler.*.jsonc` configs; [deployment map](operations/deployment.md) |
| Media, original evidence, domain metadata | `assets/images/`, `assets/videos/`, `images/`, `assets/documents/blog/`, `archive/`, `CNAME`, `robots.txt`, `sitemap.xml` |

Keep GSAP under `assets/vendor/gsap/`; preserve SDK pins, licenses and source archives. The active loader is under `loader/files/`; the alternate `page-loader` CSS/JS is not referenced by the homepage.

## Generated and cached assets

After changing `assets/css/site.css`, `display-preferences.css` or `portfolio-assistant.css`, regenerate the synchronized head styles:

```powershell
node scripts/build-critical-styles.mjs
node scripts/build-critical-styles.mjs --check
```

The homepage inlines preference/assistant styles and critical hero CSS. Keep decorative notes positioned in critical CSS: allowing them into normal flow before full styling changes the hero height and shifts its landscape. Preserve the landscape's oversized layers and mobile crop.

`portfolio-entry.js` and `analytics-entry.js` are the two bundle sources. Edit their imported modules, not the generated bundles. The analytics factories are initialized only by `deferred-analytics.js`. After edits to either entry's dependency graph or `site.css`, regenerate the two JavaScript bundles and minified stylesheet using esbuild **0.28.2**. It is generation-only tooling; put it in ignored `.tmp/`, outside the public runtime:

```powershell
npm install --no-save --prefix .tmp/performance-tools esbuild@0.28.2
node scripts/build-performance-assets.mjs --esbuild-module .tmp/performance-tools/node_modules/esbuild
node scripts/build-performance-assets.mjs --esbuild-module .tmp/performance-tools/node_modules/esbuild --check
node scripts/build-critical-styles.mjs
```

An existing esbuild 0.28.2 module directory can be supplied instead of installing another copy. The generator updates content versions for its outputs, including the homepage's saved-preference stylesheet reservation and the deferred analytics import. Regenerate inline styles after media versioning. Shared module imports use one version per path; inspect references in both HTML and nested imports after changing a shared source.

After changing preference hydration in `assets/js/display-state.js`, first run `node scripts/sync-display-preferences.mjs`, then regenerate critical CSS. This also updates the CSP hash; see [preferences](features/display-preferences.md) before publication.

After changing versioned public images/fonts, run `node scripts/version-public-media.mjs`, then the critical-style generator; verify with `node scripts/version-public-media.mjs --check`. Inspect stylesheet/script URLs and nested module import `v` values manually for other cached edits. Preserve the space in `assets/images/sujeet-hero- vector2.svg` and its `%20` browser URL.

Keep `loader/files/loader.css` equal to embedded `#welcome-styles` and `loader/files/namaste.svg` synchronized with the inline template. Existing loader tests enforce these contracts.

## Focused tests

All names below are under `tests/` and end in `.test.mjs`.

| Changed area | Start with |
| --- | --- |
| Homepage, contact, semantics | `project-actions`, `accessibility`, `typography`, `skill-modal-keyboard`, `intro-video` |
| Welcome and first paint | `loader`, `critical-styles`, `enhancements`, `performance-assets` |
| Motion and navigation | `motion`, `parallax`, `scroll-trail`, `scroll-navigation`, `mobile-navigation`, `portrait-network` |
| Preferences | `display-preferences`, plus affected motion/media tests |
| Availability or Firebase | `availability`, `admin`, `sidebar-availability`, `presence`, `live-cursors`, `firebase-transport` |
| Analytics | `analytics-worker`, `analytics-cache`, `usage-analytics`, `usage-tracker`, `engagement-tracker`, `visitor-panel`, `privacy`, `google-tag` |
| Assistant | `portfolio-assistant`, `portfolio-assistant-worker` |
| Blog and SEO | `blog`, `blog-motion`, `seo` |
| Edge policy | `security-headers`, `security-header-check`, `asset-cache` |

Publishing is a separate authorized operation. Use the [deployment runbook](operations/deployment.md); update [status](status.md) with actual evidence rather than assuming a push activated a service.
