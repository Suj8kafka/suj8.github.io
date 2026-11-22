> Historical record. Statements such as “current”, “local” and “not deployed” describe the recorded work, not today’s state. Use the [task index](../README.md) and [status](../status.md) for current guidance. Paths in code spans retain their original historical spelling.

# Search visibility and blog migration — 15 November 2026

## Branded search and AI discovery audit — 22 November 2026

The owner confirmed the public name is **Sujeet Khadka**, Lalitpur location and the described design work, has a senior's LinkedIn recommendation rather than client testimonials, and has client work limited to Upwork. The owner declined adding recommendation/testimonial content at this stage; leave it off the portfolio and do not make it a dependency. Search Console was added only a few days ago, so a three-month baseline is unavailable. Do not invent outcomes, reviews, aliases or client endorsements.

The owner initially confirmed the selected Search Console property was the URL-prefix `https://sujeetkhadka.com.np/`, which excludes the canonical www host. Their screenshot shows the non-www homepage under **Page with redirect**, last crawled 7 November 2026, with validation started 19 November and one pending URL, zero failed. This is expected exclusion for an intentional redirecting source; it does not establish whether the www destination is indexed. Keep the redirect and existing www canonicals. A subsequent screenshot confirms the owner selected `https://www.sujeetkhadka.com.np/` and submitted its sitemap: **Success**, 11 discovered pages, submitted and last read 22 November 2026. Sitemap discovery does not prove those pages are indexed. A Domain property is an optional broader alternative requiring DNS verification. Property setup affects reporting coverage, not ranking directly. Canonical-homepage URL Inspection remains outstanding.

### Verified observations

Read-only public HTTP GET checks on 22 November returned 200 for the homepage, `robots.txt`, `sitemap.xml`, `/blog/`, `/blog/carrom-karrom/` and `/blog/2048-ux-case-study/`. The four HTML pages had their expected self-referencing www canonicals and no `X-Robots-Tag` response header. This is a fetchability check, not proof of Google indexing or verified bot access through Cloudflare.

The old `https://blog.sujeetkhadka.com.np/` still returned 200 with a canonical of `https://sujeetkhadka.com.np/`, rather than redirecting to the maintained notebook. An anonymous exact-name search returned the old blog, Behance and Dribbble among the reviewed results; it did not return the main homepage in that sample. Other people also appeared for the exact name and for “Sujit Khadka”. These observations are not a Google rank report and do not establish the cause of poor rankings. Consolidation is a verified technical priority; indexing, query performance and Google's chosen canonical still require Search Console evidence.

### Local changes in this pass

- The visible hero now connects the full name, UI/UX role and Lalitpur, Nepal in one introduction. The eyebrow identifies both UI/UX and product design. The existing name-first title, main headline and earlier junior-role edits are retained.
- The biography describes user flows, wireframes, Figma prototyping, usability testing and developer handoff. Two descriptive, ordinary HTML links lead directly to the Carrom and 2048 case studies, making evidence available without opening a dialog or running a chat assistant.
- The existing `Person` graph now lists six design subjects under `knowsAbout`; each appears in visible page content. This helps describe the person consistently but is not a ranking boost or special AI eligibility markup.
- Only the homepage sitemap modification date advances to `2026-11-22`. Existing crawler permissions remain unchanged: the wildcard `Allow: /` already permits search crawlers, including OAI-SearchBot. Cloudflare's live bot policies remain unverified.
- SEO regression coverage checks static identity, visible/schema agreement, author-linked case-study destinations and open public crawling. The loader artwork, archived content, existing professional profile links and Worker sources are unchanged by this pass.

At the audit stage, the edits remained local. The owner subsequently submitted the sitemap in the www Search Console property and explicitly authorized pushing the reviewed SEO code. Cloudflare deployment remains separate. No account connection, Cloudflare configuration, DNS edit or live Firebase change was performed in this pass.

Validation: all 270 tests passed with `node --test tests/*.test.mjs` on Node v24.15.0, including SEO, accessibility, loader artwork synchronization and legacy redirects. `git diff --check` passed. Browser layout was not checked in this pass; live indexing, crawler-specific edge access and ranking gains are not established by these tests.

### Search targets and expectations

Google says capitalization does not affect a search, so “Sujeet Khadka” and “sujeet khadka” do not need separate pages or repeated keyword variations. “Sujit Khadka” is a different spelling associated with other people; the owner does not use it. Do not add it as a `Person.alternateName` or create a doorway page for it. Track whether Google connects the spelling naturally, while keeping the real identity consistent. First position cannot be guaranteed, even for a person's own name.

For broader searches, start with specific, supported subjects such as “mobile app UI/UX designer Nepal”, “Figma prototyping Nepal”, “Nepali mobile game UI design” and “Sujeet Khadka UI/UX designer”. The general query “UI/UX designer in Nepal” has multiple intents and established competing portfolios and directories. The proposed focus is a content strategy based on the work already shown, not a claim about keyword volume or difficulty.

### What helps with chatbot discovery

For Google AI Overviews and AI Mode, Google applies the usual SEO foundations: crawlable, indexable pages eligible for snippets, useful text, internal links and structured data matching visible content. It explicitly says no extra AI text file or special schema is required. An `llms.txt` file is not required for these Google features.

For ChatGPT search, OpenAI documents OAI-SearchBot as its search crawler and recommends allowing its published IP ranges. GPTBot controls potential training use independently; allowing training is not a prerequisite for search discovery. The repository already allows search crawling. Before changing Cloudflare, inspect actual bot events and verify crawler identity; a user-agent string alone is not proof of a legitimate bot. Do not disable edge security broadly.

Recommendation strategy: make first-hand project evidence easy to cite and keep the same name, role, location and portfolio URL on public profiles. Accurate public project credits from collaborators can also help substantiate the work. The owner prefers to omit testimonials and recommendation quotations for now. These suggestions make identity and work verifiable; they are not documented guarantees of inclusion or ordering in any chatbot answer. A model answering without current web retrieval may not know recent site changes; there is no site edit that forces inclusion across chatbots.

### Next work, ordered by dependency

1. **Diagnose with Search Console.** The www property and successful sitemap submission are now confirmed; keep the existing non-www property for redirect monitoring. Supply the www homepage URL Inspection result (indexed status, Google-selected canonical, last crawl and exclusion reason) and any Page indexing issues. Google says a newly added site can take up to a week to generate report data; empty reports alone do not prove deindexing. Establish a baseline using whatever data becomes available, then export Queries and Pages once populated. Check Manual actions and Security issues. Compare branded and non-branded queries separately, including country and device. Never supply login credentials.
2. **Publish after separate owner authorization.** Release the reviewed local changes. Then inspect current Cloudflare routes and activate the already-prepared old-blog redirects only after confirming all seven destination articles are live. Verify old URLs individually and keep redirects working long term. This consolidates obsolete URLs; it does not itself promise a rank increase.
3. **Submit and measure.** Submit the main sitemap and request indexing for the updated homepage and important articles in Search Console. Set up Bing Webmaster Tools using its supported verification flow and submit the same sitemap. No Bing property was created during this audit.
4. **Build evidence with the owner.** Respect the decision to omit testimonials and recommendation quotations. Confirm the existing LinkedIn, Behance, Dribbble and GitHub URLs before changing profile references. Add an Aama Cure case study once the owner can supply approved screens, precise responsibility, constraints, decisions and evidence of outcomes. Separate shipped results from independent redesign concepts; use measured figures only when supported.
5. **Review equivalent periods.** Record a baseline now, then compare the next 28 days with the preceding 28 after indexing catches up. Track branded clicks/impressions/CTR/average position, chosen landing pages, relevant non-branded queries and actual inquiries. Google aggregates AI-feature traffic in its normal Web performance reporting; it is not a separate chatbot-rank metric. Bing's AI Performance preview reports citations and cited pages across supported AI experiences, not universal chatbot ranking. For manual chatbot sampling, record exact prompts, date, model/search mode and cited URLs; do not treat one answer as a stable position.

An optional OpenSEO integration was discovered and suggested for connected Search Console analysis, but was not installed or connected in this pass. Exported reports remain sufficient; using an integration is not required.

### Current primary references

- [Google: capitalization and search basics](https://support.google.com/websearch/answer/134479?hl=en)
- [Google: newly added properties and empty Search Console reports](https://support.google.com/webmasters/answer/96568)
- [Google: property scope and data collection](https://support.google.com/webmasters/answer/34592)
- [Google: Page with redirect and indexing status](https://support.google.com/webmasters/answer/7440203)
- [Google: no one can guarantee a first-place ranking](https://developers.google.com/search/docs/fundamentals/do-i-need-seo)
- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [OpenAI: search and training crawler controls](https://developers.openai.com/api/docs/bots)
- [Bing: AI Performance public preview and measurement limits](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)

## Follow-up relevance audit — 20 November 2026

An anonymous search check for variants of “junior UI/UX designer Nepal” surfaced job boards, professional profiles and the still-live `blog.sujeetkhadka.com.np` homepage, but not the main portfolio among the reviewed results. A direct fetch confirmed the main homepage is crawlable and had been crawled recently, so the observed gap is not evidence of a basic crawl block. Search results vary by location, history and time; Search Console remains the source of truth for the site's impressions, indexed URL, selected canonical and exclusions.

The local homepage now targets the intended role more clearly without adding a duplicate landing page: its search description, visible biography, `Person` job title and `ProfilePage` description identify a junior UI/UX designer in Nepal; the original portfolio title and hero positioning remain intact; and the existing shipped work and case studies remain the supporting evidence. The homepage sitemap date is updated to `2026-11-20`, and automated SEO coverage protects the search-intent wording. These changes are local until the owner separately authorizes publication.

The largest unresolved consolidation issue is unchanged: the old blog host still serves competing portfolio content instead of permanently redirecting each old URL to its matching main-domain page. The scoped redirect Worker and tests are already prepared. Publishing it requires a separate review of the live Cloudflare route and explicit authorization, followed by public redirect checks and Search Console monitoring.

The homepage is the primary destination for **Sujeet Khadka** and the designer's professional identity. The notebook and individual articles support that identity with first-hand project writing and distinct subject matter. Moving URLs is not a guarantee of higher rankings, and structured data does not guarantee a rich result or first position. No Google Search Console account, indexing report, manual-action report, or search-performance data was available during this audit.

## Publication status

The reviewed homepage, notebook, animation, SEO metadata, legacy aliases, and assets were pushed to `origin/master` in commit `0c4c2c359c7fff8eccb4ba2cfbdc42df107512ce` on 15 November 2026. GitHub Pages reported that exact commit built successfully. Direct public checks confirmed the homepage, notebook, all seven articles, sitemap, stylesheet, and both blog modules return 200 with the expected content. Every primary page has its expected title, self-referencing canonical, and static structured data; the sitemap includes all seven articles. An archived HTML download also retained its expected content hash.

The old blog homepage still returns 200 without redirecting. Cloudflare redirect and source-indexing policies remain prepared source only; they were not deployed by the Git push. Google indexing, selected canonicals, and ranking changes are still unverified. The exact published application snapshot passed all 208 Node tests; separate analytics edits and the transferred source repository were left local.

## Before-publication findings

Direct HTTP GET checks on 15 November 2026 found:

| Public URL | Observed response |
| --- | --- |
| `https://www.sujeetkhadka.com.np/` | 200, self-referencing canonical, `index, follow`; navigation still links to the blog subdomain. |
| `https://sujeetkhadka.com.np/` | 301 to the canonical www homepage. |
| `http://www.sujeetkhadka.com.np/` | 301 to HTTPS on the canonical host. |
| `https://www.sujeetkhadka.com.np/blog/` | 404 from GitHub Pages. |
| `https://www.sujeetkhadka.com.np/blog/carrom-karrom/` | 404 from GitHub Pages. |
| Main-domain `robots.txt` | 200, crawling allowed, main-domain sitemap declared. |
| Main-domain `sitemap.xml` | 200, but lists only the homepage and privacy page. |
| `https://blog.sujeetkhadka.com.np/` | 200 with the original blog; declares the non-www main homepage as its canonical rather than the new notebook URL. |
| Old Carrom `.html` URL | 301 to an extensionless URL on the old subdomain, then 200; does not redirect to the new main-domain article. |

At the time of that audit, the migration was not live and the new notebook and Carrom article could not be indexed while returning 404. The subsequent GitHub Pages publication resolved those missing destinations, as recorded above. The audit does **not** establish why the existing homepage is below another result for the owner's name: that requires Google's indexing and performance data. Audit details are in the ignored local artifact `.tmp/seo-live-audit.json`; post-publication checks are in `.tmp/blog-publication-report.json`. No account or DNS changes were made.

## Prepared local improvements

- The homepage title, description and social metadata identify Sujeet Khadka as a product and UI/UX designer in Lalitpur, Nepal. The existing `Person` ID (`/#person`) and professional profile links are retained. Its structured address now matches the visible Lalitpur biography rather than saying Kathmandu. `WebSite` and `ProfilePage` connect the site and portfolio to that same person.
- Every article has a distinct subject-specific title and description, linked visible author name, author biography, two relevant internal story links, and static `BlogPosting`, `WebPage`, and `BreadcrumbList` markup. They reference the same author and canonical host. This is inert JSON-LD in the served HTML, available without JavaScript execution; it does not require relaxing the script CSP.
- The notebook has `CollectionPage`, `Blog`, and seven-item catalogue markup, a visible author introduction, and topic paths linking directly to all seven articles. Existing search/filter controls and design-workspace motion remain optional enhancements.
- `max-image-preview:large` permits larger search previews; it is not a ranking promise. Article markup uses existing project images where available. Three short web-project notes omit an article image rather than incorrectly identifying the author's portrait as project imagery. Unknown original publication dates are omitted; the existing visible revision dates are used for `dateModified`.
- The 2048 case study explicitly identifies conflicting archived download totals as unverified. Original authored text, transferred source files, and source ZIP remain preserved; no new research results or download figures were invented.
- The prepared old-host Worker redirects known old URLs to their matching canonical destinations, serves a crawlable `robots.txt`, and points its sitemap to the main-domain sitemap. Unmatched URLs return 404 rather than redirecting to an unrelated homepage.
- The prepared security Worker adds `X-Robots-Tag: noindex, nofollow` to preserved raw website/source copies under `/Blogpage/`, `/archive/`, and `/assets/documents/blog/source-pages/`. Archived HTML is delivered as a plain-text attachment, so its intentionally stale CSS, script, image, and link references are not treated as a second live website. Other preserved downloads under `/assets/documents/blog/` retain `noindex, follow`. The maintained `/blog/` pages, `/blog/archive/` overview and current CV are excluded from these rules. Do not add robots disallows for the source paths: crawlers must be able to fetch their noindex headers. This header policy takes effect only after the security Worker is published.

## Search-intent map

These are relevant target subjects, not claims of current rankings or search volume.

| Search intent / example query | Primary destination | Supporting content |
| --- | --- | --- |
| Sujeet Khadka; Sujeet Khadka UI/UX designer; product designer in Nepal | `/` | Visible identity, location, selected work, professional profiles, and CV. |
| Sujeet Khadka blog; UI/UX design case studies | `/blog/` | Authored notebook, topic navigation, seven distinct stories. |
| Carrom Karrom UI design; lightweight mobile game design | `/blog/carrom-karrom/` | Older-device constraints, app size, design assets, development credits, original evidence. |
| 2048 UX case study; undo interaction design; game theme design | `/blog/2048-ux-case-study/` | Research notes, theme choice, feedback, recovery, Figma, and original screens. |
| 2048 Dark Mode project; mobile puzzle UI | `/blog/2048-dark-mode/` | Project features and gameplay video; separate from the UX case study. |
| Nakka Nepali game; Nepali board game UI | `/blog/nakka/` | Traditional-game context, offline play and archived project notes. |
| Nepali festival countdown interface | `/blog/nepali-festive-counter/` | Festival countdown project and original live-preview link. |
| Portfolio UI design; The Progress Bar np | `/blog/the-progress-bar-np/` | Hierarchy, project discovery, responsive layout and the original project link. |
| Bus reservation system Figma UI | `/blog/bus-reservation-system/` | Honest school-project scope, interface direction and source repository. |

Keep future writing grounded in actual work: problem, personal role and collaborators, dated evidence, constraints, alternative designs, decisions, original artifacts, and lessons. The short project notes should remain short until there is more evidence to add. Do not create near-duplicate pages for spelling variants, buy links, add hidden keywords, or invent testimonials, ratings, research, or results. A deeper Aama Cure case study needs the evidence listed in `portfolio-homepage.md` before publication.

## Publication order and remaining steps

Steps 1–2 were completed after the owner authorized the Git push. Worker publication in step 3 still requires authorization.

1. Review and publish the main-site notebook, its assets, the homepage links and SEO changes, legacy main-domain aliases, and updated sitemap to the existing GitHub Pages origin. Preserve unrelated working-tree changes and exclude local caches, credentials, and QA artifacts from the release. Keep the GitHub Pages origin and canonical www host.
2. Confirm the canonical notebook and **all seven** article URLs return 200 with readable HTML, correct titles and self-referencing canonicals. Check the deployed sitemap contains them. Do not activate old-host redirects while destinations return 404.
3. After inspecting current Cloudflare routing, publish the scoped old-blog redirect Worker. Publish the reviewed security Worker source for the preserved-source noindex headers and existing festival iframe policy; keep other Workers and live Firebase configuration outside this change. Keep old-host TLS and hosting/domain access available.
4. Check the old homepage and every old article URL redirect directly to their matching final URL. Query strings must survive; avoid redirect chains. Verify that an invented old article returns a real 404 and the old `robots.txt` still allows crawling. Google's site-move guidance recommends retaining redirects for at least a year; keeping working legacy links indefinitely is preferable.
5. Complete the Search Console steps below and monitor crawl/indexing data. Do not describe the migration as completed until the public HTTP checks pass.

## Search Console steps for the owner

1. Open [Google Search Console](https://search.google.com/search-console/) using the Google account you normally use for the site. Check the property selector for an existing `sujeetkhadka.com.np` Domain property or `https://www.sujeetkhadka.com.np/` URL-prefix property. If it exists, open it; do not create a second verification unnecessarily.
2. If no property exists, add the canonical HTTPS www URL-prefix property and use a verification method Google supplies, such as its HTML file or HTML meta tag. Only use the exact public filename/token supplied by Google; never invent one. A Domain property covers protocols and subdomains but requires DNS verification. DNS changes require separate approval under this project's instructions.
3. Use the top URL Inspection field for the exact homepage URL. Read the indexed result, especially **Page indexing** and **Google-selected canonical**. Record whether it is indexed, the last crawl and the stated exclusion reason if any. Use **Test live URL** to check current fetchability; a successful live test does not prove indexing or predict Google's selected canonical. Also review **Manual actions** and **Security issues** before drawing conclusions about rankings.
4. After publication, inspect `/blog/` and priority articles such as Carrom and 2048. Confirm the live test sees the complete page and its markup. Submit `sitemap.xml` in **Sitemaps**, then request indexing for the homepage, notebook and a few important updated articles. Repeated requests do not guarantee faster indexing.
5. Verify the old blog property as well. After working redirects are active, check whether **Change of Address** supports this subdomain-to-main-domain-path move for the verified properties. Google documents moves to a path on another domain, but account ownership and its pre-checks still apply. Use the tool only when the offered source and destination accurately describe this move; permanent per-page redirects remain necessary.
6. In **Performance → Search results**, start a baseline with the exact query `Sujeet Khadka`; compare country and device filters and inspect the landing-page URLs. Track clicks, impressions and average position for the branded query separately from the topic queries above. Results vary by time, location, device and search history; average position is not a universal fixed rank. Compare equivalent periods after crawling has caught up, and use query/page data to choose the next content improvements.

Where you control professional profiles, keep the same full name, current role and main website URL on LinkedIn, Behance, GitHub, Figma and Medium. Update old website links to the primary portfolio or the exact relevant article. For identical syndicated articles, use the publishing platform's canonical controls where available; do not canonicalize unrelated essays to a project page. These account edits were not performed.

## Validation and limits

Run `node --test tests/*.test.mjs`. SEO coverage checks shared author identity, valid JSON, visible/schema consistency, unique metadata, canonical URLs, revision dates, catalogue and related links, sitemap destinations, crawlable migration responses, and scoped duplicate-source noindex headers. The existing source-content and archive-hash checks must continue to pass.

Local browser checks and final test counts are recorded in `blog-migration.md`. These tests do not establish Google indexing, Google-selected canonicals, structured-data rich-result eligibility, or ranking gains. After publication, use Google's Rich Results Test and Search Console URL Inspection on the actual production URLs.

## Official references

- [Google: site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google: canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: article and author markup](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: profile pages](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [Google: site names](https://developers.google.com/search/docs/appearance/site-names)
- [Google: helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Search Console: properties and verification](https://support.google.com/webmasters/answer/34592)
- [Search Console: URL Inspection](https://support.google.com/webmasters/answer/9012289)
- [Search Console: Change of Address](https://support.google.com/webmasters/answer/9370220)
- [Search Console: search performance](https://support.google.com/webmasters/answer/7576553)
