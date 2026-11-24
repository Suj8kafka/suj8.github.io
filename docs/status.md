# Verification and outstanding work

Last status update: **25 November 2026**. This page records evidence, not a continuous health check. Source/configuration describes intended behavior; use the relevant runbook to verify current live state.

| Area | Last recorded evidence | Still unverified or pending |
| --- | --- | --- |
| Footer and motion assessment | 25 November local working-tree review: welcome startup and responsive footer browser checks passed. Fixed ribbon cleanup throwing after GSAP detached its trigger during responsive/preference changes; added regression coverage and updated the dynamic import cache versions. [Scope and evidence](history/footer-assessment-2026-11-25.md). | Local changes remain unpublished. External services were blocked during browser QA; their live health and production security headers were not assessed. |
| Mobile loading changes | 23 November local changes: CLS reproduced at 0.303, then zero after critical-CSS note positioning. Final mobile Lighthouse with prepared headers: Performance 99 / Best Practices 100. Responsive geometry matched the original across four widths and three themes; regression and generated-asset checks passed. [Measurement conditions and limits](history/mobile-loading-2026-11-23.md). | Source was pushed as recorded below. The post-push live mobile PageSpeed API request returned 429 (daily quota exceeded); a live score and production deferred tracking remain unverified. |
| Static portfolio | Performance/Resume release `f9ee247101cb9872e1d63e3e9f057d4b70fe4907` pushed to `origin/master` on 23 November; read-only `ls-remote` confirmed the same commit. Public homepage GET returned 200 with the new performance bundle and Resume link; the new Resume PDF HEAD returned 200 with `application/pdf`. Full Node tests and generated-asset checks passed before the push. Local preview on port 5500 returned 200 and remains running. | The unauthenticated Pages build API returned 404, so build metadata is unavailable; the public content checks establish that the changed homepage/PDF are being served. Matching security Worker deployment remains separate. |
| Main site and notebook | Read-only GETs on 22 November: homepage, notebook, Carrom and 2048 UX pages returned 200 with expected www canonicals; robots and sitemap returned 200. The full seven-article release was verified on 15 November at `0c4c2c359c7fff8eccb4ba2cfbdc42df107512ce`. | Post-push public content and Google-selected canonicals. |
| Google Search Console | Owner screenshot on 22 November confirms www URL-prefix property, sitemap **Success**, 11 discovered pages. Earlier non-www property shows an intentional redirecting homepage. | www homepage URL Inspection, actual indexing, performance baseline and ranking gains. Discovered does not mean indexed. |
| Old blog host | 22 November GET still returned 200 with non-www homepage canonical. | Redirect Worker cutover, live route review and per-URL verification. |
| Analytics Worker / D1 | Deployment recorded 18 November: traffic, `/usage?days=7` and `/usage?days=all` returned 200; daily/monthly analytics migrations were applied. | Current service health and current migration state; do not infer assistant migration activation from this record. |
| Security headers and asset caching | Post-push homepage GET on 23 November returned an enforced CSP that does not include the prepared display-bootstrap hash. Source includes the matching display/welcome hashes and requested HSTS/COOP policies; no Worker was deployed during this Git push. | Matching security Worker deployment requires separate authorization. Current route/proxy state, inherited-HSTS subdomain readiness and the remaining cache/indexing policy were not audited for this release. |
| Portfolio assistant | Dedicated Worker, knowledge migration and browser integration exist in source. Migration `0004-neptune-experience-ended.sql` corrects Neptune TechZone employment to January–June 2026; local SQLite checks verified scope and reapplication. | The employment correction has not been applied remotely. Live Worker, AI binding/quota, rate-limit namespace, D1 knowledge migration and matching CSP deployment remain unverified. |
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
