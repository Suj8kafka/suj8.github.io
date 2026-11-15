# Blog migration to the main portfolio

Prepared locally on 15 November 2026. Publication, the old-host redirect, and DNS changes have not been performed.

## Content and design

The source of truth is now the transferred `Blogpage/` folder inside this repository: `C:\Users\Suj8Kafka\Desktop\suj8.github.io\Blogpage`. Its nested `Blogpage/` directory contains the maintained website; the outer folder also contains older pages and early drafts. All 47 supplied website files are preserved byte for byte in `assets/documents/blog/original-blog-source.zip`, with original filenames and folder structure. Git metadata is excluded from this website archive. The transferred source files and Git repositories remain untouched.

`/blog/archive/` keeps earlier homepages, the earlier 2048 article, original post drafts, the animated 404 experiment, portfolio experiment, document index, and original project notes accessible as downloads. It also links the complete ZIP, including all original CSS, JavaScript, media, documents, and metadata. Early drafts are kept as historical material instead of being presented as new authored posts.

The main portfolio now links to `/blog/`. This is a static project notebook with seven readable HTML stories, native links, a table of contents on each article, related-story navigation, and optional search and topic filters. All stories remain available if JavaScript fails or is disabled. The notebook uses the portfolio’s stylesheet, local fonts, CSS theme variables, `portfolio-theme` preference, and Light / Dark / Auto controls.

All six substantive source articles retain their full original authored text, original titles, section headings, lists, credits, and links. A note identifies the write-ups as original material whose figures and future plans reflect their original publication. All 37 original homepage text blocks are retained, including the complete featured-project descriptions, Connectum's development context, Blog & Insights summaries, and About section. Project icons and profile links are also retained. The empty bus reservation source page is preserved in the ZIP and represented in the current notebook by a short note grounded in its existing homepage description and repository.

Original media is copied locally under `assets/images/blog/` and `assets/videos/blog/`: six project icons, both blog identity images, both 2048 screenshots, both original Carrom photos/analytics screenshots downloaded from their linked Medium URLs, and the gameplay video. The video retains native controls with `preload="none"`. The original festival-site preview is retained as a lazy, sandboxed iframe with its direct site link. The security Worker source permits that specific preview origin; publishing that Worker change remains a separate approval step.

The old Facebook-hosted Progress Bar photo is unavailable (the original hostname timed out and an alternate CDN host returned HTTP 403). Its replacement is a local copy of the live project's own icon. This is recorded explicitly in `docs/blog-content-manifest.json`.

At the owner's request, duplicate PDF/Word hyperlinks, the original-resume link, and “browse documents” have been removed from the blog. `/blog/documents/` now redirects to `/blog/` and is absent from the sitemap. The archive also omits the original document-index link. The files remain preserved in the untouched source and source ZIP; existing file URLs still resolve. The main portfolio's current CV link remains available. `docs/blog-content-manifest.json` records the transferred source root, original file hashes, ZIP inventory, homepage text blocks, article headings/text hashes, imported assets, archive files, and the unavailable photo. No new browser dependencies or build step are needed; edit the static HTML directly.

Every notebook page uses the same `site-footer` and `footer-theme` classes as the homepage. The blog-specific button sizing was removed, so typography, padding, shape, selected appearance, and Light / Dark / Auto behavior come from the shared styles and portfolio preference.

## Subtle blog motion

`assets/js/blog-motion.js` adds a two-pixel reading-progress line and up to four pixels of depth on the featured image while scrolling. CSS adds small icon/arrow movements and a fine accent rule when hovering or focusing stories. Text never waits for an entrance animation or fades out.

Scroll motion uses the browser's animation frame API, with one queued frame per scroll burst and no idle JavaScript animation loop. Content resizing or filtering refreshes cached geometry. Hidden tabs and bfcache suspension stop pending work; cleanup removes its listeners, observers, styles, and progress indicator. Reduced-motion preference changes are respected immediately, and data-saving or constrained devices keep the static version. No animation libraries or other dependencies are downloaded for this behavior.

The notebook landing-page heading includes a responsive inline SVG design workspace: a wireframe, component selection, typography/color palette, prototype, and designer cursor. A twelve-second CSS loop moves through wireframing, refinement, and testing. Its visible pause/play button preserves a visitor's pause choice when leaving the viewport or changing motion preferences. The controller pauses the scene offscreen, in hidden tabs, and during bfcache suspension; cleanup disconnects both observers and releases its controls. Without JavaScript, with reduced motion, or on constrained/data-saving devices, the complete illustration stays static and its pause control stays hidden. The existing article and hover motion remains in place.

## URL map

The canonical host follows the existing portfolio metadata and sitemap: `https://www.sujeetkhadka.com.np`. The blog is on this main domain, under `/blog/`.

| Previous blog path | New main-domain path |
| --- | --- |
| `/` or `/index.html` | `/blog/` |
| `/pages/Carrom-karrom-a-mobile-game.html` | `/blog/carrom-karrom/` |
| `/pages/Nakka-Nepali-Traditional-Game.htm` | `/blog/nakka/` |
| `/pages/2048-dark-mode.htm` | `/blog/2048-dark-mode/` |
| `/pages/2048-Puzzle-Case-Study.html` | `/blog/2048-ux-case-study/` |
| `/pages/Festive-Counter.htm` | `/blog/nepali-festive-counter/` |
| `/pages/The-Progress-Bar-np.html` | `/blog/the-progress-bar-np/` |
| `/pages/Bus-reservation-system.html` | `/blog/bus-reservation-system/` |
| `/Sujeet_Khadka_Resume2026.pdf` | `/assets/documents/blog/resume-2026.pdf` |
| `/Docs/cv.html` or `/blog/documents/` | `/blog/` |
| `/blog1.html`–`/blog3.html`, `/htm.html`, `/zportfo.htm`, `/originalindex.txt` | `/blog/archive/` |

The prepared cutover Worker also maps all original local media and document URLs through `cloudflare/blog-legacy-files.mjs`, preserving direct image, video, and download links as well as article links.

Main-domain `/pages/` aliases cover the original filenames and lowercase extensionless directory URLs. These are GitHub Pages compatible HTML redirects with a visible fallback link and canonical metadata. The script preserves query strings and fragments. With JavaScript disabled, the HTML refresh and link still reach the article, but do not preserve query strings or fragments. The separate old-host Worker also accepts lowercase filenames and both `.htm` and `.html` variants.

`sitemap.xml` includes the canonical notebook, article, and archive URLs alongside the existing portfolio and privacy URLs. The retired documents route and other legacy aliases use `noindex, follow`.

## Review and publication

Serve the repository root over HTTP using the existing local server command in `AGENTS.md`; open `/blog/`. Review a notebook search, topic filtering, Light / Dark / Auto, a mobile article, the screenshots, the video, and a legacy `/pages/` URL. Run `node --test tests/*.test.mjs`.

Publishing and the domain cutover require separate owner authorization under `AGENTS.md`. After that authorization:

1. Publish the reviewed main-site files to the existing GitHub Pages origin. With Worker publication also authorized, publish the prepared narrow `frame-src` addition in the security Worker so the restored festival preview can load. Verify `/blog/`, each article, original media/documents, the preview, and legacy aliases on the production main domain.
2. Inspect the current Cloudflare routes, redirect rules, existing blog hosting, and DNS before enabling a cutover. Their live configuration has not been verified here.
3. Use `cloudflare/blog-redirect.mjs` with the separate `cloudflare/wrangler.blog-redirect.jsonc` as the prepared old-host redirect, or configure equivalent Cloudflare redirects. It serves only `blog.sujeetkhadka.com.np`, returns HTTP 301 for the mappings above, accepts original/lowercase filenames and extensionless paths, preserves queries, and returns 404 for unknown blog paths. Its `robots.txt` allows crawling and its sitemap points to the canonical main-domain sitemap. It does not fetch the old origin or modify the existing analytics/security Workers. An HTTP client does not transmit URL fragments; browsers can inherit fragments across a redirect, and main-domain HTML aliases explicitly preserve them in JavaScript.
4. Verify the old blog homepage and each old article URL produce a single redirect to a successful canonical main-domain page. Check both HTTP and HTTPS and preserve the old host’s TLS. Keep the old-host redirect available for existing bookmarks and search results; do not remove the domain record before its replacement is working.

The old-host Worker is source preparation only. Adding HTML aliases on the main domain cannot redirect requests that still arrive at the separately hosted blog subdomain. No changes to Firebase, owner access, or existing Worker deployments are required for the local content migration.

## Search visibility follow-up

The public HTTP audit on 15 November 2026 found `/blog/` and `/blog/carrom-karrom/` still returning 404, the live sitemap listing only the homepage/privacy URLs, and old-host articles still being served without redirects to the new main-domain paths. The local migration must be published before its SEO improvements can affect those URLs. See [search-visibility.md](search-visibility.md) for the evidence, prepared author/article metadata, search-intent map, ordered publication checks, and step-by-step Google Search Console setup and diagnosis.

The redirect Worker now returns 404 for unknown paths instead of redirecting them to an unrelated notebook homepage. Its `robots.txt` permits crawling during the move, and its sitemap redirects to the canonical main-domain sitemap. The prepared security Worker excludes preserved raw source websites and downloads from indexing through scoped response headers; the active notebook, archive overview, current CV and portfolio stay indexable. These policies require their separate reviewed Worker publication.

The owner subsequently authorized a Git push. Commit `0c4c2c359c7fff8eccb4ba2cfbdc42df107512ce` was pushed to `origin/master` and GitHub Pages reported it built successfully on 15 November 2026. The public homepage, notebook, all seven articles, updated sitemap, and animation assets were verified with successful responses and expected metadata/content. The old blog homepage still returns 200; redirect and indexing Worker publication remain pending. See the publication status in `search-visibility.md` for the checked scope and remaining work.

## Validation

- Publication snapshot: `node --test tests/*.test.mjs` passed all 208 tests against the exact staged files, independently of the separate unpublished analytics edits. Coverage includes the source-content audit, document-link removal, shared SEO identity and static structured data, canonical metadata, migration crawler responses, scoped source noindex headers, scroll frame batching, design-loop pause/resume, reduced-motion changes, resizing, bfcache, cleanup, constrained devices, and existing portfolio regressions.
- `.gitattributes` preserves archived download bytes without Git line-ending conversion. Release checks verified the ZIP's 47 original entries and all individual source-download hashes from the staged Git blobs.
- SEO update: headless Chrome checked the homepage, notebook, and seven articles in Light and Dark at 1440, 800, 390, and 320 CSS pixels (72 combinations). No visible heading/topic-link overflow, broken loaded images, runtime exceptions or failed local requests were found. With JavaScript disabled, the homepage, notebook and 2048 case study retained their readable content and parseable author/page/article markup. External services and the third-party iframe were blocked for these local checks; this does not validate production crawling or Google's Rich Results Test.
- Design-workspace update: headless Chrome checked the landing page in Light and Dark at 1440, 1024, 800, 390, and 320 CSS pixels. All ten layouts kept the illustration and text within the viewport without overlapping. Checks verified actual cursor movement, keyboard pause/play, offscreen pausing, reduced-motion changes, data-saving and JavaScript-disabled static versions, and existing article/scroll motion. No runtime exceptions or failed resource requests were observed.
- Headless Chromium: notebook, all seven articles, and archive checked in Light and Dark at 1440, 800, 390, and 320 CSS pixels. All 72 combinations loaded without horizontal overflow, missing local images, runtime exceptions, or failed local resource requests.
- The source ZIP was decompressed during tests; all 47 entries matched the transferred files in byte count and SHA-256. All 10 remaining individual archived-page downloads also matched their originals. The transferred source folder was not edited.
- The homepage and notebook theme controls were compared using their actual computed styles in Light, Dark, and Auto at desktop and mobile widths, after scrolling the homepage footer into view so its deferred fonts loaded. Their button typography, sizing rules, colours, selected states, group size, borders, padding, and shadows matched.
- Duplicate PDF/Word links are absent from the blog; the retired document gallery redirects to the notebook. Article photos and screenshots still link to their full-size local originals.
- Browser checks verified image depth on scroll, hover movement, reading progress, immediate reduced-motion changes, and the static data-saving fallback. Text remained fully visible throughout.
- Browser interactions checked: combined search/topic filtering and empty-state recovery, Auto following system appearance, theme preference across article navigation, an original mixed-case legacy URL preserving its query and fragment, and native video controls with media served successfully.
- With browser JavaScript disabled: all seven story links and complete article content remained readable; the optional filter controls stayed hidden.
- Local screenshots were inspected for desktop/mobile layout and readability. These checks do not verify the live domain cutover, external project uptime, or existing production service health.
