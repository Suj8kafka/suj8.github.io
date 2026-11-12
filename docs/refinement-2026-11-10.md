# Portfolio refinement — 2026-11-10

The local refinement preserves the existing PageSpeed optimizations and analytics
configuration. One baseline mobile Lighthouse run scored 95 for performance;
four subsequent runs scored 96, 99, 96 and 96. These results show no local
performance-score regression; they do not establish the production PageSpeed score.

| Local Lighthouse 13.6.0 | Before | After |
| --- | --- | --- |
| Performance | 95 (one run) | 96 median; 96–99 across four runs |
| Accessibility | Not collected in baseline | 100 in all four runs |
| Best practices | Not collected in baseline | 100 in all four runs |
| SEO | Not collected in baseline | 100 in all four runs |
| LCP | 2.715 s | 2.675 s median; 2.125–2.784 s |
| Total blocking time | 101 ms | 65 ms median; 57–90 ms |
| Cumulative layout shift | 0 | 0 in all four runs |

LCP variability overlaps the baseline, so these timings should not be presented
as a proven speed improvement. The existing hero preload, responsive WebPs,
deferred fonts/services/GSAP, device constraints and loader sequence remain.
No dependency, render-blocking request or new preload was added.

Measurements use the existing installed headless Brave browser against a local,
uncompressed Python HTTP server, cold cache, Lighthouse simulated mobile
throttling, 4× CPU slowdown and a 412 × 823 viewport at DPR 1.75. Firebase,
Cloudflare and location services were blocked consistently to avoid live visitor
writes. Actual third-party costs, production caching, compression and security
headers are outside these measurements. PageSpeed Insights uses both Lighthouse
lab data and separate real-user data; see [Google's explanation](https://developers.google.com/speed/docs/insights/v5/about).
Compact audit and browser results are in
[the measurement record](performance/refinement-2026-11-10.json).

## Changes

- `index.html`: actual eSewa redesign imagery and descriptive alternative text;
  consistent destination labels on all four project cards; clearer About heading;
  truthful inactive live-studio fallback; initial country-loading text; refreshed
  stylesheet/module cache versions and generated critical CSS.
- `assets/css/site.css`: readable toolkit text and focus rings in both themes,
  including its charcoal card; improved project/experience/writing heading leading
  and wrapping; two project columns through tablet widths; proportional desktop
  About columns and a readable stacked tablet layout; consistent About action
  spacing and space above its copy on phones. Both dialog close targets and the
  video play target are at least 44 px. Mobile section decorations no longer
  overlap copy. Writing hover feedback moves only its arrow, avoiding padding
  reflow. Experience hover movement is smaller, with readable text on pastel fills;
  reduced motion suppresses the affected card and arrow transforms.
- `assets/images/selected-work/esewa-redesign.webp` and its `README.md`: the
  published homepage redesign replaces the official brand visual. The full
  640 × 1385 screen is 42,198 bytes and remains lazy-loaded. Nakka's thumbnail
  contains the full app screen instead of enlarging a narrow crop. Artwork
  provenance is documented; no screens, research results or metrics were invented.
- `assets/js/enhancements.js`: a failed presence-module import displays an
  unavailable state while public availability loads independently.
- `assets/js/firebase-presence.js`: counts wait for both an acknowledged presence
  write and a received snapshot. Disconnects and read/write errors clear cached
  visitor rows and cursors. One expiry timeout replaces the one-second render
  interval; scroll/resize reads share an animation frame. Failed analytics
  refreshes hide prior figures; country read failures show an error. Page exit
  releases subscriptions, listeners, frames and timers; back/forward restoration
  resumes the heartbeat and disconnect registration. A delayed sign-in cannot
  start subscriptions after final page exit.
- `assets/js/live-cursors.js`: peers sharing a region reuse its bounds within a
  render; idle cursors expire through their own timers. The controller now releases
  its owned pointer/media listeners and DOM layer during destruction.
- `tests/enhancements.test.mjs`, `tests/presence.test.mjs` and
  `tests/live-cursors.test.mjs`: added service-failure, snapshot-readiness, stale-data,
  expiry, frame-batching, failed-refresh and lifecycle regressions.

The Cloudflare Workers, Firebase SDK version/rules/configuration, owner access,
six existing CTA measurement IDs and their inquiry flow were preserved. Existing
uncommitted loader artwork/style/test/documentation changes were preserved; the
loader artwork synchronization check still passes.

## Review and verification

Reviewed the hero/header, selected and additional work, marquee, experience,
toolkit/dialog, writing, About/video, contact, illustrated footer/theme controls
and owner login. Existing metadata, canonical/social URLs, image alternatives,
landmarks and heading hierarchy remain intact.

- Browser layout and toolkit text contrast checks pass at 320, 375, 390, 430,
  768, 800, 900, 1024, 1280, 1440 and 1920 px in both themes: no horizontal
  page overflow or clipped headings/content, and toolkit text contrast ≥ 4.5:1.
- Browser keyboard checks confirm six named skill buttons and six headings in
  the accessibility tree; Enter/Space open details, Escape restores opener focus,
  and pointer activation opens the correct content. The contact CTA focuses its
  heading and clears mobile navigation; selected-work navigation and themes work.
- Actual local video playback starts with Enter, exposes/focuses its native
  controls, and pauses outside the viewport.
- Reduced-motion and JavaScript-disabled checks retain visible content, usable
  static styling and no welcome obstruction. Owner login has no mobile overflow;
  sign-in itself was not exercised.
- All 35 checked local asset/document destinations exist; no fragment destination
  is missing. The local preview server returns HTTP 404 for an unknown path.
- `node --test tests/*.test.mjs`: **146/146 pass**, up from 138 baseline tests.
  Syntax checks for the three changed modules pass. Critical CSS and public
  media content versions are synchronized. `git diff --check` passes; Git emits
  its existing LF/CRLF conversion notices.
- The site serves source directly. There is no production build, configured
  linter or type checker to run, and no dependencies were installed.

Live Firebase connections, owner saves, Worker health, external destination
availability, deployed 404 handling and non-Chromium browsers remain unverified.
No production publication or live configuration/data change was performed.
Run production PageSpeed Insights after an approved deployment before comparing
against earlier production scores.
