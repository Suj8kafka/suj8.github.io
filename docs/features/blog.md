# Project notebook and legacy content

Read for article edits, notebook behavior, preservation or legacy URL changes. [Task index](../README.md) · [SEO](../operations/seo.md)

## Maintained content

`blog/index.html` is a static catalogue of seven stories on the canonical www host. Individual `blog/<slug>/index.html` pages have readable article content, table of contents, linked author identity, related stories and static JSON-LD. Filtering in `assets/js/blog.js` and motion in `assets/js/blog-motion.js` are optional; all articles remain accessible without scripts. Current pages share [display preferences](display-preferences.md).

The original transferred `Blogpage/` checkout is untracked source material. Do not stage or rewrite it incidentally. Tracked preservation is governed by [the content manifest](../blog-content-manifest.json): original article text/headings, all supplied source files, original homepage text blocks, document/media inventories and hashes. The ZIP at `assets/documents/blog/original-blog-source.zip` preserves 47 source website files byte for byte, excluding Git metadata. Keep preserved source README files unchanged.

`blog/archive/index.html` presents historical downloads. Raw sources live under `assets/documents/blog/source-pages/`; current media lives under `assets/images/blog/` and `assets/videos/blog/`. Preserve original credits, links, evidence and the unavailable Progress Bar photo explanation. Early drafts and dated download figures must remain identified as historical, not presented as new claims.

## URL ownership

| Old article stem under `/pages/` | Maintained article under `/blog/` |
| --- | --- |
| `Carrom-karrom-a-mobile-game.html` | `carrom-karrom/` |
| `Nakka-Nepali-Traditional-Game.htm` | `nakka/` |
| `2048-dark-mode.htm` | `2048-dark-mode/` |
| `2048-Puzzle-Case-Study.html` | `2048-ux-case-study/` |
| `Festive-Counter.htm` | `nepali-festive-counter/` |
| `The-Progress-Bar-np.html` | `the-progress-bar-np/` |
| `Bus-reservation-system.html` | `bus-reservation-system/` |

Main-domain `/pages/` aliases use GitHub Pages-compatible HTML redirects and visible fallback links. `assets/js/blog-legacy.js` preserves query strings/fragments; no-JavaScript refreshes reach the target but do not preserve them. `/blog/documents/` redirects to `/blog/`; duplicate document links stay removed. Existing original asset/document URLs must still resolve.

The separate `cloudflare/blog-redirect.mjs` handles the old blog hostname only. Its `legacyArticles`, `blogDestination` and `blog-legacy-files.mjs` own the complete mappings, including original media/downloads and historical pages. Known URLs receive permanent per-page redirects with query preservation; unknown URLs return 404. The old robots file stays crawlable and the sitemap points to the canonical sitemap. A main-site push does not activate this Worker.

## Change and verify

- Keep canonical/author IDs, metadata, bylines and sitemap destinations consistent. Do not invent original publication dates; visible revision dates and schema must agree.
- Keep article and author images semantically appropriate. The festival preview stays lazy and sandboxed with a direct fallback link; its allowed origin is explicit in the security Worker.
- Run `blog`, `blog-motion`, `seo` and `security-headers` tests as relevant. Source-content, ZIP and asset-hash checks must continue to pass.
- Browser-check filters, article links/media, themes/Reader mode, keyboard access and no JavaScript. Service-blocked local QA does not verify production crawling or rich results.
- For old-host cutover, follow [deployment](../operations/deployment.md); verify all seven targets before redirecting traffic. Consult [status](../status.md) for the latest actual observation.

Detailed migration, publication evidence and original inventories are preserved in [the migration record](../history/blog-migration-2026-11-15.md).
