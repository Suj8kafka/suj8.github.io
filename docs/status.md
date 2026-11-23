# Verification and outstanding work

Last status update: **23 November 2026**. This page records evidence, not a continuous health check. Source/configuration describes intended behavior; use the relevant runbook to verify current live state.

| Area | Last recorded evidence | Still unverified or pending |
| --- | --- | --- |
| Static portfolio | Experience timeline commit `ddb20e9f4e51d1d9347a7aea0e16d3d0fb3e43d7` pushed to `origin/master` on 23 November; local and remote branches matched. All 272 Node tests and generated-style/media-version checks passed. Local browser checks covered 320–1440px, three themes, hover/focus feedback, static text during interaction, saved/system reduced motion, Reader mode, enlarged text and no JavaScript. | Initial post-push homepage and versioned stylesheet GETs returned 200 but still served the previous release. The unauthenticated Pages build API returned 404; deployment completion and public browser behavior remain unverified. |
| Main site and notebook | Read-only GETs on 22 November: homepage, notebook, Carrom and 2048 UX pages returned 200 with expected www canonicals; robots and sitemap returned 200. The full seven-article release was verified on 15 November at `0c4c2c359c7fff8eccb4ba2cfbdc42df107512ce`. | Post-push public content and Google-selected canonicals. |
| Google Search Console | Owner screenshot on 22 November confirms www URL-prefix property, sitemap **Success**, 11 discovered pages. Earlier non-www property shows an intentional redirecting homepage. | www homepage URL Inspection, actual indexing, performance baseline and ranking gains. Discovered does not mean indexed. |
| Old blog host | 22 November GET still returned 200 with non-www homepage canonical. | Redirect Worker cutover, live route review and per-URL verification. |
| Analytics Worker / D1 | Deployment recorded 18 November: traffic, `/usage?days=7` and `/usage?days=all` returned 200; daily/monthly analytics migrations were applied. | Current service health and current migration state; do not infer assistant migration activation from this record. |
| Security headers and asset caching | Read-only homepage GETs on 23 November returned an enforced CSP. Its script hashes did not include either the pre-release or updated source display-bootstrap hash. No Worker was deployed as part of the timeline Git push. | Matching security Worker/CSP deployment requires separate authorization. Current route/proxy state, remaining headers and cache/indexing policy were not audited in this release. |
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
