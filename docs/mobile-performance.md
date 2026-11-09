## Result

Local cold-cache mobile measurement on 2026-11-09: **9.904s before → 2.368s median after**. Three optimized runs measured 2.368s, 2.316s and 2.408s. The LCP candidate remained the hero portrait: the original SVG before, the responsive 880px WebP afterward. The first optimized run requested GSAP at 3.054s, after the 2.368s contentful paint. Mobile made no request for the original vector and created no inline SVG portrait.

Conditions: headless Chromium/Brave, 390 × 844 CSS pixels, DPR 2, 4× CPU slowdown, 1.6 Mbps download, 150ms latency, fresh browser profile and empty cache per run, measured for 16 seconds without interaction. Firebase/analytics requests were blocked consistently to avoid real visitor records. These are local browser PerformanceObserver measurements, **not Lighthouse scores, verified production results or updated CrUX field data**. Local HTTP does not reproduce the production CDN, server geography or third-party service costs. Raw relevant timings are retained in `docs/performance/mobile-lcp-2026-11-09.json`.

## What changed

- `index.html`: one responsive WebP hero preload, matching the eager image's `srcset` and `sizes`; retained intrinsic portrait dimensions and accessible text; preloaded the locally hosted heading font; removed the remote Google Fonts stylesheet and eager GSAP, vector, Firebase/presence and availability scripts; added the enhancement scheduler. The existing hero layout and wording are unchanged.
- `assets/images/sujeet-hero-440.webp` and `assets/images/sujeet-hero-880.webp`: derivatives of the existing vector, at 440 × 587 / 24,664 bytes and 880 × 1174 / 64,070 bytes. Both use WebP quality 0.82. The 880px image is about 91% smaller than the 711,449-byte source SVG. The baseline also fetched that original SVG twice. The source artwork remains untouched.
- `loader/files/loader.js`: compact screens, coarse pointers and save-data visits bypass the full-screen welcome immediately. Desktop first/returning-visit animation remains. The same completion event fires once and scrolling stays available. Loader SVG artwork is unchanged.
- `assets/js/enhancements.js`: waits for page load and welcome completion, two animation frames and idle time (with a bounded timeout fallback), then independently starts optional motion and live services. It loads GSAP core before ScrollTrigger and then the motion module. Desktop vector enhancement is restricted to fine-pointer, normal-motion, unconstrained devices. Failures remain isolated; scheduling stops for hidden tabs and supports cleanup.
- `assets/js/portrait-network.js`: desktop interaction reads the original SVG from `data-vector-src`, keeping the initial raster separate from the optional vector source.
- `assets/css/site.css`: four local `@font-face` rules with `font-display: swap`; existing typography, layout and motion styling remain.
- `assets/fonts/dm-mono-400-latin.woff2`, `dm-mono-500-latin.woff2`, `dm-sans-latin.woff2`, `space-grotesk-latin.woff2`: unmodified Latin subsets, about 89 KB total, replacing the Google Fonts stylesheet dependency and unused language families. `DM-Mono-OFL.txt`, `DM-Sans-OFL.txt`, `Space-Grotesk-OFL.txt` retain the licenses; `assets/fonts/README.md` records provenance.
- `scripts/mobile-performance.mjs`: repeatable cold-cache browser measurement, screenshot capture and optional raster regeneration (`--export-portrait`). `scripts/fetch-portfolio-fonts.mjs` records pinned font distribution URLs and restores the licensed files.
- `tests/enhancements.test.mjs`, `tests/performance-assets.test.mjs`, `tests/loader.test.mjs`, `tests/portrait-network.test.mjs`: scheduling, mobile bypass, failure isolation, source selection and asset-size/preload regressions. All 77 Node tests pass.
- `docs/loading-screen.md`, `docs/site-motion.md`, `docs/hero-vector-portrait.md`: updated behavior and image documentation, alongside this guide and its timing report.

No hosting, Firebase, Worker or DNS settings were changed. The homepage is static HTML served directly; no server-rendering framework or build process was introduced. Deployment status and the live performance score must be verified separately from these local results.

## Check locally

1. Run `.\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1` from the repository root.
2. Open `http://127.0.0.1:8000/` with a phone-size viewport and empty storage. The homepage should appear without a welcome overlay, with the existing hero image and layout. In Network, confirm only one hero WebP loads and no `sujeet-hero-%20vector2.svg` is requested on mobile. GSAP and live-service modules should start later.
3. In Chrome DevTools, disable cache, select mobile network and CPU throttling, then record a cold reload in Performance or run a mobile Lighthouse audit. Inspect the measured LCP element rather than only the overall score. Actual results vary by device and environment.
4. To repeat the recorded local test, run `node scripts/mobile-performance.mjs --browser "C:/path/to/chrome.exe" --output .tmp/mobile-check.json`. The default browser path is the Brave installation used for the recorded measurement. A built-in Node WebSocket implementation is required; the repository's verified Node 24 works. The command writes a JSON report and screenshot, and opens no visible browser window.
5. Check a fine-pointer desktop separately: the original welcome is retained and the vector colour interaction and scroll ribbon should activate after it completes. `--desktop --fast` performs this smoke check; `--fast --no-js` checks the mobile static fallback. Both browser smoke checks passed with no horizontal overflow.
6. Run `node --test tests/*.test.mjs`.

## Check after publication

Run the [mobile PageSpeed Insights test](https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fsujeetkhadka.com.np%2F&form_factor=mobile) after publishing. Check the final hostname if the apex redirects. Confirm the new hero URL, no mobile overlay, and lower lab LCP. Google's [LCP guidance](https://web.dev/articles/optimize-lcp) targets 2.5s or less for at least 75% of visits. Real-user results require new traffic and will not immediately reflect a deployment; do not substitute the local median for the site's existing field result.
