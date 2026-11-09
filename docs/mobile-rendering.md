# Mobile rendering follow-up — 2026-11-09

The existing hero remains visible without entrance fades. The main change removes the full stylesheet, secondary fonts and phone animation downloads from the portrait's initial loading path. The subsequent release also disables the automatic intro on every normal visit; the original artwork is available only at `/?intro=1`. See [the security and performance release notes](security-performance.md) for the final pre-push checks.

## Measured result

Actual Lighthouse 13.6.0 mobile performance and accessibility audits against local HTTP:

| Measurement | Before | Final three runs |
| --- | --- | --- |
| LCP | 3.614s | 2.260s, 2.860s, 2.256s |
| Median LCP | 3.614s (one baseline) | 2.260s |
| Performance | 90 | 98, 95, 97 |
| Accessibility | 100 | 100, 100, 100 |
| Layout shift | 0.0013 | 0, 0, 0 |

The median improved by about 37%. One final run still exceeds 2.5 seconds; the result does not establish that every phone visit meets the target. Lighthouse continued to identify the portrait as LCP and chose the new 640px WebP. Initial rendering had no Lighthouse-flagged blocking stylesheet and requested only the heading font. Summarized evidence is in [the measurement report](performance/mobile-rendering-2026-11-09.json).

Conditions: Lighthouse's default simulated mobile throttling, headless Brave/Chromium 156, fresh audit navigation, local Python HTTP server, Firebase/analytics blocked consistently to avoid visitor records. Scores and lab timings vary. The trace's unthrottled render-delay phases and simulated headline LCP are separate measurements. Local HTTP does not reproduce the production CDN, geography or service requests. These are not deployed results or an update to the reported 3.1s real-user LCP. The earlier `mobile-performance.md` report used a different PerformanceObserver method.

## Files and behavior

- `index.html`: generated inline first-screen CSS (13,400 bytes); one heading-font preload and a matching responsive portrait preload/srcset; deferred full stylesheet and a no-JavaScript stylesheet fallback; no eager loader stylesheet (only explicit previews request it); the intro video uses native lazy loading with `preload="none"` to avoid requesting its poster during initial rendering. Updated cache query strings for changed entry scripts/styles.
- `assets/images/sujeet-hero-640.webp`: new 640 × 854 portrait, 34,044 bytes, generated from the existing SVG at WebP quality 0.76. It is about 47% smaller than the previously selected 64,070-byte 880px image. The original SVG and other sizes remain available.
- `assets/css/site.css`: retains the heading font and hides the inactive loader by default. Existing accessibility colors and CTA styling remain.
- `assets/css/secondary-fonts.css`: DM Sans and DM Mono declarations moved here with `font-display: optional` to avoid a late font swap. No new font binaries or external font service.
- `assets/js/page-styles.js`: starts downloading the full stylesheet after the portrait decodes, then activates it after two paint opportunities. Clicks, keys and scrolling prioritize that download. Direct section links and restored positions load the full layout immediately. Desktop/direct links load secondary fonts after full styling; phone visits without a fragment wait for first scroll. Image failure does not prevent styling. With JavaScript disabled, normal stylesheet links provide the complete page.
- `assets/js/enhancements.js`: waits for full styling and portrait decoding in addition to existing load/loader/paint/idle gates. Phone GSAP starts on first scroll or a restored scroll position. Reduced motion and independent live-service handling remain.
- `scripts/build-critical-styles.mjs`: generates the homepage's initial CSS subset from `site.css`. After changing that stylesheet, run `node scripts/build-critical-styles.mjs`. `--check` and the regression tests detect stale generated CSS. This is a maintenance helper; the site still serves plain source files without a bundler.
- `scripts/mobile-performance.mjs`: adds the 640px export and an optional `--check-scroll` browser check.
- `tests/critical-styles.test.mjs`, `tests/enhancements.test.mjs`, `tests/performance-assets.test.mjs`: verify CSS synchronization, priority interaction, image-failure handling, direct links, delayed phone fonts/motion, responsive assets and preloads. All 94 repository tests passed.
- `assets/fonts/README.md`, `docs/site-motion.md`, `docs/hero-vector-portrait.md`, `docs/mobile-performance.md`, this guide and its JSON evidence record the current behavior.

No hosting, Firebase, owner access, DNS or analytics settings changed. Publication and Cloudflare activation are separate; see the release notes for push and verification status.

## Check it

1. Start `.\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/`.
2. In Chrome DevTools Lighthouse, select Mobile, Performance and Accessibility, then analyze a navigation with storage cleared. Repeat three times and compare median LCP. Inspect the LCP element, not just the performance score.
3. In Network with cache disabled, confirm one matching portrait WebP, only Space Grotesk initially, and no initial mobile GSAP or intro-poster request. Scroll: the faint ribbon and secondary fonts should load. Check the existing light/dark hero appearance and keyboard inquiry navigation.
4. Open `/?check=direct#contact` in a new tab and allow native smooth scrolling to settle. The contact section should be visible. Disable JavaScript and reload the root: project grids, links and contact content should remain fully styled with no welcome overlay on mobile.
5. Run `node --test tests/*.test.mjs` and `node scripts/build-critical-styles.mjs --check`. Browser checks also passed at 320–1440px without horizontal overflow, with the phone scroll ribbon, direct contact link and no-JavaScript layout. Normal desktop visits must show no intro; `/?intro=1` checks its explicit preview and skip control separately.
6. After publishing, run [mobile PageSpeed Insights](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fsujeetkhadka.com.np%2F&form_factor=mobile). Real-user data needs subsequent traffic and will not immediately reflect a deployment.

Primary references: [Google's LCP optimization guidance](https://web.dev/articles/optimize-lcp), [font loading guidance](https://web.dev/articles/font-best-practices), and [Chrome's native video lazy-loading documentation](https://developer.chrome.com/docs/modern-web-guidance/guides/performance/lazy-load-video-and-audio). Browsers without native video lazy loading may still request the poster early; `preload="none"` remains the media fallback.
