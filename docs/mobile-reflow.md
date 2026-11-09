# Mobile Lighthouse follow-up — 2026-11-09

The supplied production report scored 98 and attributed 44 ms of forced layout
to `page-styles.js`, with additional navigation measurements. Local changes:

- The stylesheet controller uses scroll events instead of querying `scrollY`
  during startup or after changing the stylesheet's media. Scroll restoration
  events and direct fragment links still prioritize full styling.
- The native scroll controller uses media queries for header breakpoints, skips
  initial phone scroll-position reads and avoids geometry reads on inactive
  phone scroll frames. Active anchor scrolling keeps its existing behavior.
- Mobile navigation selects the initial item from the URL, waits for a paint
  after stylesheet/welcome changes, and pauses section measurements while the
  welcome covers the page. Cleanup cancels both owned animation frames.
- Entry script query versions were updated. Welcome timing, image delivery,
  fonts, third-party services and hosting configuration were preserved.

## Measurements and limits

Local Lighthouse 13.6.0, Brave/Chromium 156, simulated mobile defaults, Python
HTTP without production compression or caching. Visitor service URLs were
blocked to avoid writing live visitor records. The baseline server served the
committed `0696ac8` entry point and controllers; the changed server used the
working tree. These are individual runs, not a statistical comparison.

| Metric | Committed baseline | Completed changes |
| --- | --- | --- |
| Performance score | 96 | 95 |
| LCP | 2.440 s | 2.862 s |
| Total blocking time | 132 ms | 42 ms |
| Speed Index | 2.596 s | 2.380 s |
| Layout shift | 0 | 0 |
| Forced reflow sources | Stylesheet activation | None listed |

Exploratory runs while the controllers were being revised varied from 90 to 98.
The completed-code run removes the reported forced-reflow sources and reduces
blocking, but does **not** demonstrate an improved overall score or achieve 100.
Production must be measured separately after publication. The requested phone
welcome remains five seconds; a Lighthouse score is not a measurement of when
that overlay finishes. [Measurement summary](performance/mobile-reflow-2026-11-09.json).

The supplied cache warnings describe four-hour HTTP response lifetimes. Those
require an edge/origin policy change; HTML cannot set them. The legacy
JavaScript warning identifies Cloudflare's injected analytics beacon, which is
outside the repository's JavaScript. Neither service configuration was changed.

## Validation

The Node suite covers layout-read avoidance, restoration scroll events,
deferred navigation measurement and cleanup. Real browser checks cover the
phone welcome ending in Namaste, fixed navigation, contact scrolling, direct
contact links, no horizontal overflow, no-JavaScript styling and no page errors.
No deployment, Firebase writes, DNS or Cloudflare configuration changes were made.
