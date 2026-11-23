# Verification and outstanding work

Last status update: **23 November 2026**. This page records evidence, not a continuous health check. Source/configuration describes intended behavior; use the relevant runbook to verify current live state.

| Area | Last recorded evidence | Still unverified or pending |
| --- | --- | --- |
| Static portfolio | UI commit `dd703a1b26d0b795380338f855753497e2d845bf` pushed to `origin/master` on 23 November; local and remote branches matched. All 270 Node tests and generated-style/media-version checks passed. Post-push GETs confirmed the new homepage at `https://www.sujeetkhadka.com.np/`; fresh requests for the stylesheet and 5,912-byte 2048 thumbnail returned 200 with the expected release content. | Earlier cached asset requests still served the prior CSS or a thumbnail 404 while deployment propagated. The unauthenticated Pages build API returned 404, so exact build status was unavailable. Final public browser behavior and live PageSpeed scores were not audited. |
| Main site and notebook | Read-only GETs on 22 November: homepage, notebook, Carrom and 2048 UX pages returned 200 with expected www canonicals; robots and sitemap returned 200. The full seven-article release was verified on 15 November at `0c4c2c359c7fff8eccb4ba2cfbdc42df107512ce`. | Post-push public content and Google-selected canonicals. |
| Google Search Console | Owner screenshot on 22 November confirms www URL-prefix property, sitemap **Success**, 11 discovered pages. Earlier non-www property shows an intentional redirecting homepage. | www homepage URL Inspection, actual indexing, performance baseline and ranking gains. Discovered does not mean indexed. |
| Old blog host | 22 November GET still returned 200 with non-www homepage canonical. | Redirect Worker cutover, live route review and per-URL verification. |
| Analytics Worker / D1 | Deployment recorded 18 November: traffic, `/usage?days=7` and `/usage?days=all` returned 200; daily/monthly analytics migrations were applied. | Current service health and current migration state; do not infer assistant migration activation from this record. |
| Security headers and asset caching | 11 November security review found six expected headers missing. Current source includes caching, CSP and preserved-source noindex policies. | Current deployed policy/version and route/proxy state; a Git push does not deploy this Worker. |
| Portfolio assistant | Dedicated Worker, knowledge migration and browser integration exist in source. | Live Worker, AI binding/quota, rate-limit namespace, D1 knowledge migration and matching CSP deployment are not verified by the implementation record. |
| Firebase owner editor and presence | Local authorization/validation tests exist. Older notes record anonymous sign-in success, presence writes failing and expired CLI authentication. | Current providers, deployed rules, owner allowlist, presence writes and end-to-end owner saving; older failures are not a fresh health check. |

Test totals and Lighthouse scores remain tied to their recorded snapshots. Local checks do not establish live service health.

## Next actions

1. Inspect the www homepage in Search Console and record indexing status and Google-selected canonical. Keep the www canonical and non-www redirect.
2. After separate owner authorization, inspect Cloudflare routes and publish the old-blog redirect only once every target is available. Verify all legacy mappings and unknown-path 404 behavior.
3. Before changing a live service, check its current state and use its runbook. Update only the affected status row after verification.
4. Collect approved Aama Cure project evidence before writing a deeper case study: exact contribution, dates, constraints, decisions, shipped screens and supported outcomes.
5. Before work on analytics/presence abuse resistance, revisit the [11 November security findings](history/security-review-2026-11-11.md): client-reported activity, collection/replay budgets and malformed-event handling. Confirm which findings still apply to current source; this documentation task did not retest exploit scenarios or change protections.

## Confirmed content decisions

- Public name: **Sujeet Khadka**; “Sujit Khadka” is not an owner-confirmed alias.
- Location: Lalitpur, Nepal; UI/UX and product design work is confirmed.
- Keep recommendations/testimonials off the portfolio at the owner's request. Their absence does not block technical SEO work.
- The untracked `Blogpage/` source checkout remains untouched; preserved files and ZIP under `assets/documents/blog/` are separate tracked artifacts.

For the evidence behind these entries, use the [history index](history/README.md). Do not treat historical setup instructions as current deployment authorization.
