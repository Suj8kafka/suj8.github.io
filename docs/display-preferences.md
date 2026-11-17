# Display and accessibility preferences

The homepage and current notebook pages share a native **Display** popover. No dependencies or account are required. Light / Dark / Auto continues to use the existing theme controls and `portfolio-theme` key.

Preferences live on `<html>`: `data-layout`, `data-motion`, `data-sound`, `data-contrast`, `data-text-scale` and `data-dyslexia-spacing`. Only explicit visitor choices are saved in `sk-a11y-prefs`; unset motion and contrast follow system changes. Invalid values, malformed JSON and unavailable storage fall back safely. Storage failure is reported inside the panel. Changes in another tab update the current page.

- **Crafted / Reader:** Reader uses a centered 65ch column, collapses project, skills and article layouts, and suspends decorative JS. The `.decorative-only` utility hides artwork; project text, metrics, images, video controls and links remain available. Pages on other domains, including Medium, retain their own display settings.
- **Full / Reduced motion:** Reduced motion stops GSAP depth, the scroll ribbon, portrait interaction, live cursors, notebook animations and smooth anchor scrolling. Content remains visible. Device/data-saving limits continue to apply. Explicit video playback remains available.
- **Sound:** The intro video and native mute control share the same setting. Reduced motion defaults to muted unless the visitor explicitly chose Sound on. Changing preferences never starts playback.
- **Contrast:** High contrast uses solid light/dark surfaces and stronger text and separators. It does not recolor project images. Forced-colors mode retains native system colors and selected-control outlines.
- **Text / spacing:** 100%, 115%, 130% root sizing; text and flow spacing use rem. Extra spacing uses `.04em` letters, `.12em` words and `1.75` line height. These are reading preferences, not a medical treatment or a claim of universal dyslexia suitability.

Reset removes only `sk-a11y-prefs` and re-evaluates current system preferences. It preserves theme choice and other site data. The panel uses native radio groups and a nonmodal `popover="auto"` dialog: Tab follows normal form navigation; Escape and outside clicks dismiss. CSS anchors and position-try options position it near the trigger; fixed positioning and a small legacy popover fallback cover missing browser APIs. The panel scrolls within its viewport at narrow widths and enlarged text.

## Updating the bootstrap

`assets/js/display-state.js` owns the self-contained hydration function. After changing it, run:

```powershell
node scripts/sync-display-preferences.mjs
node scripts/build-critical-styles.mjs
node --test tests/*.test.mjs
```

The sync script injects the exact function before styles and the welcome bootstrap, and regenerates `cloudflare/display-bootstrap-csp.mjs`. The security Worker permits this specific SHA-256 hash while continuing to reject arbitrary inline scripts. Publish matching HTML and Worker changes together only after deployment authorization; a stale deployed CSP will block first-paint hydration, although the external module still applies preferences after startup. No deployment was performed for this feature.

Saved reading layouts request the full homepage stylesheet before paint rather than waiting for portrait decoding. Default Crafted visits retain the existing critical CSS and deferred enhancements. Keep asset query versions aligned when changing cacheable files.

## Verification

Node tests cover state validation, storage failures, OS defaults, sound precedence, reset resolution, synchronization of generated HTML/CSP, high-contrast text colors, and live GSAP/notebook teardown and resumption, alongside existing feature tests. Local Chrome checks exercise 320–1440px layouts with 130% text and extra spacing, native keyboard and light dismissal, two-way mute synchronization, system changes, reset, reload, article navigation and legacy popover fallback. Short viewports (720×450, 360×225 and 320×225) keep the panel inside the screen and allow scrolling its controls. The hashed bootstrap also applies saved reading choices with application modules blocked under the Worker's actual CSP. Narrow CSS viewports exercise reflow equivalent to zooming a wider screen; they do not replace manual browser zoom, screen-reader testing or a full WCAG conformance audit.
