# Display and accessibility preferences

Read for theme, Reader layout, motion/sound choices, contrast or saved state. [Task index](../README.md) · [Source generation](../development.md)

## Source and state

`assets/js/display-state.js` owns self-contained first-paint hydration and validation; `display-preferences.js` owns the native Display popover, persistence and preference events. Styling is in `assets/css/display-preferences.css` and `assets/css/site.css`. Current homepage/notebook pages use this shared UI; external sites retain their own preferences.

Only explicit choices persist in `sk-a11y-prefs`. Invalid/malformed/unavailable storage falls back safely; failure is reported in the panel. Other tabs synchronize choices. The default theme is Monochrome; available choices are Monochrome, Original, Dark and System (`mono`, `original`, `dark`, `auto`). System resolves through the OS color preference. Theme persistence also mirrors supported values to the legacy `portfolio-theme` key.

Other resolved settings live as HTML data attributes: layout, motion, sound, contrast, text scale and dyslexia spacing. Unset motion/contrast follow the OS. The popover uses native radio groups; Tab follows normal order, Escape/outside clicks dismiss, CSS anchor positioning has fixed/legacy fallbacks, and the panel scrolls within short viewports.

## Behavior contracts

- **Crafted / Reader:** Reader uses a centered 65ch column and suspends decorative work. Keep text, project images, metrics, links and media controls available. `motionIsReduced()` treats Reader as reduced decorative motion.
- **Motion:** Reduced stops GSAP depth, ribbon, portrait animation, live cursors, notebook motion and smooth anchors. Device/save-data constraints still apply. Explicit video playback remains possible.
- **Sound:** Defaults off under reduced motion unless explicitly chosen on. Native media mute and the popover stay synchronized; changing settings never calls play.
- **Contrast / text:** High contrast strengthens surfaces/text without recoloring project images; forced-colors respects native system behavior. Text supports 100/115/130% root sizing. Extra spacing uses `.04em` letters, `.12em` words and `1.75` line height; it is a preference, not a medical claim.
- **Portrait palette:** In Monochrome, portrait reveal can temporarily show Original colors. Reset/reversal restores the resolved preference. Explicit theme changes cancel transient state; cleanup cancels palette timers. Follow the actual `portrait:palette-reveal`/`portrait:palette-reset` events.
- **Reset:** Clears `sk-a11y-prefs` and the legacy theme key, then resolves defaults/OS choices. Do not clear unrelated site data.

## Updating first-paint hydration

After changing the hydration function, run from the repository root:

```powershell
node scripts/sync-display-preferences.mjs
node scripts/build-critical-styles.mjs
node --test tests/display-preferences.test.mjs tests/critical-styles.test.mjs
```

The sync script injects the exact function before styles/welcome and regenerates `cloudflare/display-bootstrap-csp.mjs`. Match HTML and Worker changes for an authorized release; stale deployed CSP can block inline hydration even if the external module later applies settings. Saved Reader/enlarged-text choices request full CSS before paint; ordinary Crafted visits retain deferred styling.

## Verify

Run preference tests plus affected motion/media tests. Browser-check storage failures, cross-tab updates, OS changes, reset/reload, portrait reversal, native keyboard dismissal, light/dark/monochrome, media mute, 130% text, spacing and short/narrow viewports. Check no overflow and CSP-constrained hydration. A reflow check does not replace manual browser zoom/screen-reader review or establish full WCAG conformance. Actual deployment evidence belongs in [status](../status.md).
