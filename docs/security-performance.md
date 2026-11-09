Current welcome behavior supersedes the intro descriptions below: first desktop visits run for six seconds ending with animated Namaste; returning desktop visits show Namaste only. Phones retain their five-second sequence. See [loading-screen behavior](loading-screen.md).

# Security and first-screen performance release — 2026-11-09

Historical release record: the later requested [mobile welcome](loading-screen.md) restores a five-second phone intro. The lab timings below were measured without that overlay and are not measurements of the current mobile welcome.

## Intro and initial rendering

Normal visits now show the portfolio without an intro overlay on desktop as well as phones. `loader/files/loader.js` completes before reading storage, waiting for assets, requesting intro CSS or locking scrolling. `index.html` removes the eager loader stylesheet and updates the loader script cache version. The original Namaste SVG and matching inline template are unchanged; deliberate preview at `/?intro=1` loads its stylesheet on demand. Preview failure or Skip leaves the page usable. See [loading-screen behavior](loading-screen.md).

The release includes the previously prepared rendering improvements: responsive 34 KB 640px portrait, matching image preload, generated first-screen CSS, deferred full stylesheet and secondary fonts, lazy intro-video poster and phone GSAP loaded on scroll. See [the file inventory and generation commands](mobile-rendering.md). The accessibility and action-label changes prepared in the same working tree are included too; see [accessibility](accessibility.md) and [project actions](project-actions.md).

## Performance evidence

Final local Lighthouse 13.6.0 simulated mobile runs:

| Metric | Local baseline | Final runs |
| --- | --- | --- |
| LCP | 3.614s | 2.781s, 2.104s, 2.785s |
| Speed Index | 1.751s | 1.121s, 1.052s, 1.122s |
| Total Blocking Time | 0ms | 110ms, 118ms, 208ms |
| Layout shift | 0.0013 | 0, 0, 0 |
| Performance score | 90 | 95, 98, 92 |
| Accessibility score | 100 | 100, 100, 100 |

Median LCP is 2.781s, about 23% lower than this local baseline. Two runs still exceed 2.5s, and blocking time is higher than the baseline. This is a measured improvement in first-screen speed, not a claim that every target is met. Mobile already skipped the intro before this release; the mobile results cover the combined image/CSS/font changes and cannot be attributed solely to removing the desktop intro.

Conditions: headless Brave/Chromium 156, default Lighthouse simulated mobile throttling, local uncompressed Python HTTP, three separate navigation audits without interaction, visitor/Firebase requests consistently blocked to avoid creating visitor records. These timings are separate from raw trace phases, production PageSpeed results and the reported real-user LCP. Earlier local runs had a 2.260s median; the final median demonstrates the variation between batches. [Summarized evidence](performance/security-performance-2026-11-09.json) retains all three final runs and the limitations.

## Security headers

A live HEAD check on 2026-11-09 confirmed the apex HTTPS redirect and the final www homepage were missing all six reported headers. Requests already pass through Cloudflare, but the security Worker is not active on those responses. The existing Worker in `cloudflare/security-headers.mjs` supplies CSP, frame protection, HSTS, nosniff, referrer policy and permissions policy. It now also returns those headers on an origin connection failure, using a generic uncached 502 response without private connection details. Existing tests cover successes, origin errors, redirects and HTTP upgrades.

Wrangler 4.158.0 built the Worker successfully with `--dry-run`. **Cloudflare deployment is deferred at the user's request. A GitHub code push does not activate these headers.** No DNS, TLS, live Worker, Firebase or owner-access settings changed. Route activation is a separate [Cloudflare deployment step](https://developers.cloudflare.com/workers/configuration/routing/routes/); see [the deployment and verification guide](../cloudflare/SECURITY.md).

## Verification

- `node --test tests/*.test.mjs` passed all **113 tests** in the final run. `node scripts/build-critical-styles.mjs --check` confirmed synchronized first-screen CSS.
- Browser checks passed at 320–1440px in light/dark themes, including dialog/video keyboard focus, inquiry actions, phone scroll ribbon, direct contact fragment and no-JavaScript full styling. A normal cold desktop visit made no intro stylesheet request or overlay; explicit preview and Skip worked. Video focus tests stubbed media playback rather than downloading the video.
- Run mobile Lighthouse three times after publication and inspect the portrait LCP, Speed Index, TBT and CLS. These local timings do not predict the exact production score or immediately update field data.
- Run `node scripts/check-security-headers.mjs` after the later Cloudflare deployment. Until then, missing-header failures are expected. It checks real response headers rather than assuming source configuration is live.
