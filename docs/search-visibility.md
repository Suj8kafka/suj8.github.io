# Search visibility and blog migration — 15 November 2026

The homepage is the primary destination for **Sujeet Khadka** and the designer's professional identity. The notebook and individual articles support that identity with first-hand project writing and distinct subject matter. Moving URLs is not a guarantee of higher rankings, and structured data does not guarantee a rich result or first position. No Google Search Console account, indexing report, manual-action report, or search-performance data was available during this audit.

## Public-site findings

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

The migration prepared in this checkout is not live. Google cannot index the new notebook and Carrom article while they return 404. This does **not** establish why the existing homepage is below another result for the owner's name: that requires Google's indexing and performance data. Audit details are in the ignored local artifact `.tmp/seo-live-audit.json`; no publication, account changes, or DNS changes were made.

## Prepared local improvements

- The homepage title, description and social metadata identify Sujeet Khadka as a product and UI/UX designer in Lalitpur, Nepal. The existing `Person` ID (`/#person`) and professional profile links are retained. Its structured address now matches the visible Lalitpur biography rather than saying Kathmandu. `WebSite` and `ProfilePage` connect the site and portfolio to that same person.
- Every article has a distinct subject-specific title and description, linked visible author name, author biography, two relevant internal story links, and static `BlogPosting`, `WebPage`, and `BreadcrumbList` markup. They reference the same author and canonical host. This is inert JSON-LD in the served HTML, available without JavaScript execution; it does not require relaxing the script CSP.
- The notebook has `CollectionPage`, `Blog`, and seven-item catalogue markup, a visible author introduction, and topic paths linking directly to all seven articles. Existing search/filter controls and design-workspace motion remain optional enhancements.
- `max-image-preview:large` permits larger search previews; it is not a ranking promise. Article markup uses existing project images where available. Three short web-project notes omit an article image rather than incorrectly identifying the author's portrait as project imagery. Unknown original publication dates are omitted; the existing visible revision dates are used for `dateModified`.
- The 2048 case study explicitly identifies conflicting archived download totals as unverified. Original authored text, transferred source files, and source ZIP remain preserved; no new research results or download figures were invented.
- The prepared old-host Worker redirects known old URLs to their matching canonical destinations, serves a crawlable `robots.txt`, and points its sitemap to the main-domain sitemap. Unmatched URLs return 404 rather than redirecting to an unrelated homepage.
- The prepared security Worker adds `X-Robots-Tag: noindex, follow` to preserved raw website/source copies under `/Blogpage/`, `/archive/`, and `/assets/documents/blog/`. It keeps these files downloadable without having duplicate source websites compete in search. The maintained `/blog/` pages, `/blog/archive/` overview and current CV are excluded from that rule. Do not add robots disallows for these source paths: crawlers must be able to fetch their noindex headers. This header policy takes effect only after the security Worker is published.

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

## Publication order — requires owner approval

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
