# Footer and motion assessment — 25 November 2026

Reviewed the uncommitted footer changes over `b481c95`, preserving the new
design, font assets and unrelated working-tree material. No site or Worker
was published, and no live data or access settings changed.

## Finding and fix

Responsive resizing and display preference changes reproduced an uncaught
`Cannot read properties of null (reading 'kill')` in `scroll-trail.js`.
GSAP's media context can revert a tween and detach its ScrollTrigger before
the ribbon controller runs its own cleanup. The unconditional trigger access
then interrupted cleanup and motion reinitialization. This shared motion code
predated the footer changes; the assessment does not establish that the footer
introduced the error.

Cleanup now tolerates an already-detached trigger while still disconnecting
the observer, cancelling pending work, removing listeners and removing the
ribbon SVG. A regression test simulates that GSAP teardown order, including a
pending resize frame. Cache versions were updated through the dynamic motion
import chain so a future publication can deliver the fix to returning visitors.

## Verification

- All 292 Node tests passed, including the new lifecycle regression.
- Performance bundle/CSS generation, critical styles, footer SVG generation
  and image/font content versions passed their consistency checks.
- Headless Brave/Chromium, served from the checkout on `127.0.0.1:8000`,
  verified fresh/returning desktop welcome, phone greetings and docking,
  handwritten Namaste, Skip focus, reduced motion, Reader mode, Save Data,
  direct section links, blocked-loader watchdog recovery and no-JavaScript
  startup. The welcome source and its embedded artwork/styles were unchanged.
- Footer layout passed at 320, 390, 600, 768, 1024, 1440 and 1920 CSS pixels
  across monochrome, dark and original themes. No horizontal overflow or
  clipped footer content was detected; mobile footer links cleared the bottom
  navigation. Enlarged text and extra reading spacing also reflowed.
- Footer turns, pause/resume, retained visitor pause across preference changes,
  reduced-motion static artwork and Reader mode were checked in the browser.
  The final run reported no uncaught page errors or local HTTP asset failures.

Temporary browser harness, JSON results, screenshots and test output are under
ignored `.tmp/damage-*`. They are local evidence, not durable release artifacts.
External requests were blocked to isolate rendering and avoid live visitor
writes. No live Firebase, assistant, analytics, deployed CSP, real-device or
production performance verification is implied by these checks.
