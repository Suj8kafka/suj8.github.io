> Historical record. Statements such as “current”, “local” and “not deployed” describe the recorded work, not today’s state. Use the [task index](../README.md) and [status](../status.md) for current guidance. Paths in code spans retain their original historical spelling.

# Portfolio homepage — 15 November 2026

## Visitor path

The hero identifies Sujeet as a product designer in Nepal, describes his contribution from research to developer collaboration, and leads to Selected work. Aama Cure's shipped Android/iOS experience and Carrom Karrom's Google Play download milestone supply immediate project context. Availability still uses the existing owner-managed settings and static fallback.

Desktop navigation is Work, About, Writing and CV, with a separate Get in touch link. Mobile navigation is Home, Work, About, Writing and Contact. The existing experience and skills anchors remain reachable through About. The page order is Hero, Selected work, static focus strip, About, Experience, How I work, Writing and Contact.

## Project evidence

- Aama Cure has a full-width feature with its existing maternity illustration, product scope, research/prototyping contribution and delivery responsibilities. Its link honestly opens the live product. This homepage update does not introduce a research case study or report measured usability results.
- Carrom Karrom and the independent eSewa proposal are supporting features. The eSewa card explicitly identifies its proposal status, and it appears once rather than again in Writing.
- Nakka moves to the additional-project grid with its existing preview and game listing. Its previously unconfirmed role and download count are omitted from the new compact description.
- The Carrom 50K+ Google Play milestone was verified against the [public listing](https://play.google.com/store/apps/details/Carrom_Karrom?hl=en_US&id=com.bloggernepal.carrom) during the preceding audit. It is a download threshold, not active users or a causal design result. Unverified rating/review totals are omitted. The existing store-preview image depicts an earlier listing with a lower milestone; it remains historical product imagery.
- The [Aama Cure listing](https://play.google.com/store/apps/details?id=com.aamacure.mobile&hl=en) retrieved during that audit showed 1K+. No 50K+ claim is assigned to Aama Cure. Verify any newer combined-platform totals and their measurement dates before use.

## Interaction and delivery

The homepage remains buildless HTML, CSS and browser JavaScript. The larger Aama illustration has an updated responsive `sizes` hint, and the portrait preload and image hints match the smaller mobile portrait. The stylesheet cache version is updated in both enhanced and no-JavaScript links.

Contact uses one centered “I have a project” card, with supporting text welcoming projects, product challenges and opportunities on a team. Its native email draft prompts for the project or opportunity, design help and timeline; it does not send a message automatically. A visible native email link is available when visitors prefer their own message. Existing aggregate usage tracking remains in place without service changes; see [project-actions.md](project-actions-2026-11-15.md).

A keyboard skip link focuses the main content. Section scroll margins account for the desktop header and mobile layout. The former continuous focus marquee is static, and mobile skill cards use shorter text-led layouts while retaining their native dialog buttons. Reduced-motion overrides cover the revised project-card interaction. Existing loader artwork, service modules, database rules and vendor libraries were not edited.

The critical-style generator now compacts whitespace outside quoted values to retain the existing 16 KB budget. Its regression coverage preserves escaped quoted text, descendant selectors and spaces required by `calc()` arithmetic.

## Validation

Single-card follow-up: all 228 Node tests pass, including the shared contact draft and the existing display-preference, critical-style and loader checks. The browser harness stopped before collecting results, so visual verification of this follow-up remains incomplete. The browser checks below were recorded before the contact cards were combined.

- `node --test tests/*.test.mjs`: 189 tests passed, including the changed action hierarchy, separate draft subjects/prompts, real navigation destinations, mobile ordering, critical CSS, availability and existing loader/artwork checks.
- Rendered local Brave/Chromium checks: 320, 390, 800, 900, 1100 and 1440 CSS pixels, each in light and dark themes. No horizontal overflow, clipped inspected headings/content, or broken loaded images. Checked the three featured cards and single/two-column contact layout.
- Browser interactions: keyboard activation of the primary work link; contact arrival/focus; skip-link focus; skill-dialog Escape/focus restoration; readable no-JavaScript layout; normal-motion startup with visible content; reduced-motion behavior.
- Third-party visitor/Firebase/analytics/location requests were blocked in browser QA. Live service health, email delivery, actual media playback, manual screen-reader operation and production performance were not verified by these checks.
- Browser report and screenshots: `.tmp/portfolio-home-browser.json` and `.tmp/portfolio-home-*.png` (local QA artifacts).

These checks establish local behavior, not conversion uplift or complete accessibility conformance. No publication was performed.

## Aama Cure case-study evidence still needed

Before writing the deeper public story, collect the project dates, team and exact ownership; research methods, recruitment and participant counts; observed problems; original flows and failed iterations; constraints and decisions; which designs shipped; and any dated task or product metrics with their denominators. Separate original evidence from newly conducted retrospective evaluation. Use permitted, anonymized artifacts.
