# Historical evidence

Read a record only for its specific decision, audit or measurement. [Current task guides](../README.md) and [verification status](../status.md) take priority for ongoing work. Original paths in code spans and statements such as “current” or “not deployed” describe the historical snapshot. Relative Markdown file links have been adjusted for the move.

## Find a record

| Topic | Dated evidence |
| --- | --- |
| Repository background, original agent instructions, early dead ends | [Repository snapshot — 8 November](repository-2026-11-08.md) |
| Initial mobile asset/startup changes | [Mobile performance](mobile-performance-2026-11-09.md), [rendering](mobile-rendering-2026-11-09.md) |
| Forced-layout reductions | [Mobile reflow — 9 November](mobile-reflow-2026-11-09.md) |
| Welcome timing and local measurements | [Welcome performance — 9 November](welcome-performance-2026-11-09.md) |
| Original bottom navigation QA | [Mobile navigation — 9 November](mobile-navigation-2026-11-09.md) |
| Shared Firebase WebSocket transport and Lighthouse attribution | [Lighthouse follow-up — 9 November](lighthouse-2026-11-09.md) |
| Responsive images and prepared browser caching | [Asset delivery — 9 November](asset-delivery-2026-11-09.md) |
| Keyboard/semantics/contrast measurements | [Accessibility — 9 November](accessibility-2026-11-09.md) |
| Earlier first-screen and security release | [Security/performance — 9 November](security-performance-2026-11-09.md) |
| Portfolio content and design refinements | [Refinement — 10 November](refinement-2026-11-10.md) |
| Earlier security findings and limits | [Security review — 11 November](security-review-2026-11-11.md) |
| Homepage evidence and changed action hierarchy | [Homepage — 15 November](portfolio-homepage-2026-11-15.md), [actions — 15 November](project-actions-2026-11-15.md) |
| Notebook migration, URL inventory and browser QA | [Blog migration — 15 November](blog-migration-2026-11-15.md) |
| Public analytics implementation, definitions and activation | [Implementation — through 18 November](analytics-implementation-2026-11-18.md), [activation record](analytics-activation-2026-11-18.md) |
| Branded search, migration and Search Console diagnosis | [Search audits — through 22 November](search-visibility-2026-11-22.md) |

Original JSON measurement artifacts remain in [performance](../performance/). They describe specific conditions; local lab scores, user-supplied reports and live checks are different evidence. Some raw screenshots/reports referenced in the records were temporary `.tmp/` artifacts and may not be available on another checkout.

## Decisions carried into current guides

- No delayed entrance fades over already painted content; native scrolling remains native: [motion](../features/motion.md).
- Separate owner authentication from anonymous presence; retain WebSocket-only transport and its network limitation: [availability](../features/availability.md).
- Service errors remain visible; usage is aggregate activity, not unique people or successful conversions: [analytics](../features/analytics.md).
- Preserve original blog text, downloads, hashes and asset provenance: [blog](../features/blog.md).
- Static publication, Worker activation and remote data changes remain separate authorized operations: [deployment](../operations/deployment.md).

The 22 November documentation reorganization consolidated the short loader, portrait, scrolling and GSAP notes into the current motion guide, split analytics behavior from operations, and added the general README, task map and status record. It did not change application code or deploy services.
