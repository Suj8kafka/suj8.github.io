# Mobile loading and layout stability — 23 November 2026

Local changes were prepared without publishing the site or deploying a Worker.
The user's reported mobile CLS was 0.303. The original checkout reproduced
0.303 in Lighthouse and approximately 0.299 in a separate Chromium observer.

## Layout and assets

The hero landscape and its SVGs were already absolutely positioned. Critical CSS
excluded `.art-note`, `.note-one` and `.note-two`; the notes briefly entered
normal flow before full styling arrived. That changed the hero height and moved
its landscape. Including the final note positioning in critical CSS removed
the measured shift without changing final geometry. The landscape also declares
its container width/height explicitly; existing oversized SVG layers, crop and
transform-based parallax were retained.

Preference and assistant styles are generated inline. The homepage uses a
approximately 22 KB deferred controls bundle, a separately scheduled 11 KB
analytics bundle, and a 77,173-byte generated stylesheet from the readable
87,335-byte source. Shared module imports use consistent cache versions.

The preserved 364,484-byte WALL·E PNG has a transparent 270×307 WebP derivative
of 20,288 bytes (94.4% smaller). Low fetch priority preserves its visible hero
placement without triggering a visible-image lazy-loading warning. Nakka has
96px/192px variants; eSewa has 240px/400px variants; Aama Cure's existing
responsive sources remain. Source artwork and original image provenance remain.

## Measurement

The [machine-readable summary](../performance/mobile-loading-2026-11-23.json)
records mobile Lighthouse after each change group. Full reports, screenshots and
browser probes are temporary `.tmp/perf-*` artifacts, not durable release files.

| Local run | Performance | FCP / LCP | CLS | Total blocking time |
| --- | --- | --- | --- | --- |
| Original checkout | 84 | 1.36 s | 0.303 | 71 ms |
| Hero reservation only | 100 | 1.36 s | 0 | 78 ms |
| Final with prepared security headers | 99 | 1.72 s | 0 | 47 ms |

These are local simulated mobile measurements, **not PageSpeed Insights or
CrUX**. Firebase and visitor service URLs were blocked. The original eager
Google script was included in the initial runs; the new localhost guard excludes
Google/custom collection from final local runs. The isolated hero fix therefore
provides the cleanest comparison. Production startup with deferred Google still
needs measurement after authorized publication. Scores varied from 98 to 100
in completed optimized runs.

The final header-backed Lighthouse run reported no console errors, Issues-panel
findings or non-composited animations in its sample. This does not establish
that every interaction animation is composited. Existing visual drawing and
theme effects were retained. A separate 4× CPU observer still recorded rendering
tasks up to 363 ms; deferred initializers do not eliminate stylesheet/layout work.

All 283 Node tests, critical/inline-style synchronization, media content-version
checks, bundle reproducibility and `git diff --check` passed.

## Browser and security verification

Original-versus-updated browser comparisons covered 320, 390, 800 and 1440px in
Monochrome, Original and Dark themes. Hero, portrait, section and project-image
geometry matched within 0.5px; no changes exceeded that tolerance. Hero screenshot
pixel differences above an eight-level channel threshold were below 0.24% on
390px and 0.06% on 1440px, consistent with image encoding changes. Assistant
open/close and native Work anchors passed under the prepared CSP. The original
page's unnamed textarea warnings were corrected with a `name` attribute.

No-JavaScript rendering and saved dark Reader mode at 130% text passed without
horizontal overflow. Saved reading startup reuses the early stylesheet link;
browser resource entries confirm only one full-stylesheet request in that mode.

The prepared CSP was missing the welcome bootstrap hash. A header-backed
preview reproduced the violation and Best Practices 92. Generating and allowing
that exact hash restored Best Practices 100 without allowing arbitrary inline
scripts. Tests now check all three executable inline startup scripts. HSTS with
subdomain inheritance and COOP are prepared in the security Worker; email/password
owner authentication remains unchanged.

GitHub Pages publication and deployment of the security Worker require separate
authorization. Verify independently hosted subdomains support HTTPS before
activating inherited HSTS. Matching site/Worker CSP hashes must be coordinated.
No Firebase rules/data, owner access, DNS or remote migrations changed.
