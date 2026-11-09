# Project overview
Maintain Sujeet Khadka's public portfolio for prospective clients and employers, with selected work, skills, contact information, live visitors and availability. Use `/login/` for the owner's availability editor.

## Tech stack
- Work in plain HTML, CSS and browser JavaScript; there is no framework or bundler.
- Use the existing Firebase browser SDK imports pinned to 13.0.0 (Authentication and Realtime Database).
- Preserve locally vendored GSAP and ScrollTrigger 3.15.1. Cloudflare Workers provide analytics and edge security headers; GitHub Pages is the documented site origin.
- Run the built-in Node test runner; Node v24.15.0 is verified. Treat this as a verified version, not a declared minimum.

## Commands
Run from the repository root in PowerShell.
- Install: no dependency installation is required for static files or Node tests; no package manifest or lockfile exists.
- Dev/run: `.\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1`, then visit `http://127.0.0.1:8000/`; stop with Ctrl+C. This uses an existing local Python 3.13.5 environment, not a tracked dependency.
- Build: no build command exists; serve the source files directly.
- Test all: `node --test tests/*.test.mjs`
- Test one file: `node --test tests/availability.test.mjs`
- Lint/format: no configured command or formatter exists; match the surrounding code.
- UNKNOWN: portable local-server setup when the existing `.venv` is absent; no setup procedure is recorded.

## Architecture
- Treat `index.html` as the public entry point and `login/index.html` as the owner entry point.
- Use `assets/css/` for site/admin styling and `assets/js/` for browser behavior; `main.js` handles themes, dialogs and general interactions.
- Follow the active loader in `loader/files/loader.js` and `loader/files/loader.css`. Its `loader:done` event starts `assets/js/motion.js`, which owns GSAP parallax through `parallax.js`; `scroll-navigation.js` coordinates native anchor scrolling.
- Keep portrait behavior in `portrait-network.js`, and local media in `assets/images/`, `assets/videos/` and `images/`; retain GSAP under `assets/vendor/gsap/`.
- Follow `firebase-presence.js` into anonymous presence and `live-cursors.js`; follow `availability-client.js` into public settings. `admin.js` uses a separate authenticated app to save `siteSettings/availability` after checking `owners/<uid>`.
- Keep authorization and validation in `database.rules.json`; `firebase.json` selects it and `.firebaserc` selects the project.
- Use `cloudflare/` for two independent Workers and Wrangler configs, `tests/` for Node tests, `docs/` for feature notes and the CV, and `archive/` for legacy HTML.
- Retain `CNAME`, `robots.txt` and `sitemap.xml` as domain/indexing metadata.

## Conventions
- Match local style: two-space JavaScript indentation, camelCase functions/variables, kebab-case filenames and CSS classes; quote style varies by module.
- Follow existing ES-module exports and injected `document`/`window` controller factories where used; release owned listeners, timers and animation state in controller cleanup.
- Use CSS custom properties and `[data-theme="dark"]` for themes; preserve reduced-motion and constrained-device branches.
- Preserve native anchors, readable static content and fallback availability when enhancements fail. Report failed saves visibly; do not turn service errors into successful empty results.
- Use `textContent` for availability text and validate settings before writing. Keep database constraints aligned with client fields.
- Extend relevant `node:test` / `node:assert/strict` tests for behavior changes; follow their existing DOM stubs and VM harnesses. Account for browser behavior separately from mocked tests.

## Boundaries
- **Always do:** inspect the working tree before editing, preserve unrelated changes, run relevant existing tests, and keep loader SVG artwork synchronized between `loader/files/namaste.svg` and the inline template in `index.html`.
- **Ask first:** obtain authorization before publishing site/Worker changes, changing live Firebase rules/data, changing owner access, or altering DNS. Treat deployment as separate from local edits.
- **Never do:** commit secrets or copy API keys or `.env` contents into documentation; expose private Worker credentials to the browser; open the database to unauthenticated writes; replace the entire database to update one owner; modify vendored minified GSAP files or remove their notices.

## Known gotchas
- Use HTTP locally: browser modules and SVG fetches need a served origin. Root-relative login assets need the repository root as the server root.
- Distinguish active `loader/files/` assets from the unreferenced `assets/js/page-loader.js` and `assets/css/page-loader.css`.
- Preserve the space in `assets/images/sujeet-hero- vector2.svg`; its browser URL encodes it as `%20`.
- Inspect query-string versions on stylesheet/script URLs and module imports when changing cached assets.
- Keep painted content visible throughout motion startup; use depth without delayed entrance fades that hide already visible content.
- Do not assume code publication configures Firebase providers, owner allowlists, database rules or Worker secrets. Existing deployment notes report service failures; current live state is unverified.
- UNKNOWN: current live Firebase/Cloudflare configuration and deployment health; see the feature deployment notes before live work.

## More context
Past decisions, progress and dead ends: docs/HISTORY.md. Read it when working on areas it covers, not by default.
