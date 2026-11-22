# Welcome, motion and navigation

Read when changing startup, portrait behavior, GSAP or scrolling. [Task index](../README.md) · [Development commands](../development.md)

## Ownership and startup

| Component | Source |
| --- | --- |
| Welcome and handwritten Namaste | `loader/files/loader.js`, `loader/files/loader.css`, `loader/files/namaste.svg`; inline bootstrap/CSS/template in `index.html` |
| Full stylesheet activation | `assets/js/page-styles.js`, `scripts/build-critical-styles.mjs` |
| Optional enhancement scheduling | `assets/js/enhancements.js` |
| GSAP lifecycle and depth | `assets/js/motion.js`, `assets/js/parallax.js` |
| Decorative ribbon | `assets/js/scroll-trail.js` |
| Native anchor trips and blur | `assets/js/scroll-navigation.js` |
| Bottom navigation | `assets/js/mobile-navigation.js`, `assets/css/site.css` |
| Portrait color interaction | `assets/js/portrait-network.js` |

The scheduler waits for page load, full styling, portrait decoding, welcome completion, two paint opportunities and idle time. It launches presence and availability independently; motion waits for first scroll on compact screens. Failed optional enhancements must not block the others. `loader:done` is a startup signal; motion also handles load, visibility and preference changes.

First paint uses generated critical CSS and the responsive portrait. Full styling follows portrait decoding; interaction and direct section links prioritize it. Secondary fonts wait for first phone scroll. See [development](../development.md) for generation and cache-version steps.

## Welcome contract

- First desktop visit: Hello, Hola, Bonjour, Ciao, Hallo, then handwritten Namaste; six seconds including exit. Returning desktop visits use a brief Namaste.
- Phones: full five-second sequence; reveal the portfolio and restore scrolling after 500 ms, finishing in a dismissible 184px panel above bottom navigation.
- Reduced motion, save-data, direct section links and hidden startup bypass the overlay. No JavaScript leaves it hidden. A nine-second bootstrap watchdog releases the page if the deferred script fails; late scripts cannot restart the intro.
- Skip, scrolling/navigation input and visibility changes clean up timers and release the page. Closing the phone panel restores appropriate focus. Progress uses a browser animation rather than a continuous JS loop.
- Keep loader CSS equal to inline `#welcome-styles`. Keep the ten-path pen-stroke artwork equal to `#ld-namaste-template`; use the visible strokes, not a font substitute or filled-word fade.
- The alternate `assets/js/page-loader.js` and `assets/css/page-loader.css` are inactive.

## Depth, portrait and navigation contracts

Content stays visible during startup and scrolling. Delayed entrance `from` tweens previously hid painted content; preserve this decision. GSAP/ScrollTrigger 3.15.1 remain vendored and unmodified. Use cached ScrollTrigger ranges, bounded depth and controller cleanup; do not introduce a document-level smoothing wrapper or per-layer layout reads on every scroll frame.

Compact, coarse-pointer and constrained devices use lighter effects. Reduced motion creates no parallax/ribbon. Hidden tabs and native anchor trips pause owned depth triggers; resumption preserves transforms. Reader mode and changed display preferences must stop/revert decorative work. The ribbon scrubs a decorative SVG and measures geometry on refresh; it does not pin or hide content.

Portrait fallback: responsive 440/640/880px WebP, original 1145×1527 ratio, matching preload/srcset, meaningful alt. Only unconstrained fine-pointer desktop visits with normal motion fetch the SVG after content is visible. Preserve the space in `assets/images/sujeet-hero- vector2.svg` and `%20` URL. Prefix SVG IDs when inlining. Pointer color waves use original path colors; focus reveals color, Enter toggles, Escape dismisses. Failure keeps the raster fallback readable.

Anchors use one native `scrollIntoView` request, with keyboard-aware heading focus and no extra scripted scroll loop. Scroll-speed-responsive viewport blur changes opacity, then hides when idle; reduced motion jumps instantly without blur. Repeated navigation replaces a trip; wheel/touch/pointer/navigation keys interrupt it. Completion uses `scrollend`, debounce fallback and a cleanup timeout.

The five-link bottom bar appears up to 800px, or 1100px with coarse pointer. Keep safe-area padding, 44px-or-larger targets, visible labels and native anchors. `aria-current="location"` updates are frame-batched; footer content must clear the bar.

## Verify

Start with `loader`, `critical-styles`, `enhancements`, `motion`, `parallax`, `scroll-trail`, `scroll-navigation`, `mobile-navigation` and `portrait-network` tests as relevant. The loader tests protect inline source synchronization.

Browser-check a fresh and returning desktop visit, phone and landscape, all greetings, Skip/focus, direct links, failed loader/SVG, no JavaScript, reduced motion, Reader mode and constrained startup. Keep screenshots/Lighthouse evidence dated with environment and service-blocking conditions. [Historical performance records](../history/README.md) are not current production scores.
