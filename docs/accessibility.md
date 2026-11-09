## Result

The local mobile Lighthouse accessibility audit improved from **92/100 to 100/100** with Lighthouse CLI 13.6.0 in Chromium/Brave on 2026-11-09. The before run reproduced all three reported rule categories: four prohibited logo labels, the play button's insufficient contrast, and its mismatched visible/accessible name. The blue case-study text's light-theme contrast was separately confirmed at 3.96:1 before the fix. All three rules pass after the change, and no automatic accessibility audits fail in the local after report.

Independent rendered-browser checks at 320, 390, 800, 900, 1100 and 1440px verified light and dark contrast, no horizontal overflow, keyboard focus on the play button, its native accessible name, and all four native image names. The current Lighthouse recheck is also 100/100 with no failed automatic audits. A summary of the measurements and affected nodes is in `docs/performance/accessibility-2026-11-09.json`.

The latest complete Node run passes **104 tests**. Browser keyboard checks pass for skill-dialog Tab/Shift+Tab containment, Escape restoring the opener, video-control focus and retry after playback rejection. Playback promises were stubbed for those focus checks so the full video was not downloaded; actual media playback and a manual screen-reader review remain separate checks.

These are local automated/browser checks, not a new audit of the deployed URL or a complete manual screen-reader review. Lighthouse runs blocked visitor/Firebase/analytics requests to avoid creating real visitor records during QA.

## Changes

- `index.html`: removed `aria-label` from the four generic `.company-logo` wrappers and put accurate descriptions on their images: Okay Journey, KMAG, Neptune TechZone and Upwork. Fallback initials are decorative (`aria-hidden="true"`); adjacent company headings remain available if an image fails.
- `index.html`: removed the unnecessary generic hero wrapper label; its image already has descriptive alt text. Added `role="group"` to named country-chart, analytics, skill-stack and social-link containers so their names are permitted when those UI areas are exposed.
- `index.html`: removed the overriding `aria-label` from `#introPlay`. Its accessible name now comes directly from the visible “Play with sound” text. Added `type="button"` and `aria-controls="introVid"`.
- `index.html`: improved all four project image descriptions. The Aama Cure picture is described as maternity-care artwork, not a screenshot of an app interface. Carrom Karrom describes the store listing and gameplay previews; Nakka describes the actual start-screen controls and forest illustration; eSewa is identified as a logo illustrating the redesign case study. Decorative toolkit images keep empty alt text, with a descriptive name on the existing composite illustration.
- All **22 homepage images** explicitly have `alt`: nine meaningful alternatives (portrait, four projects, four logos), and 13 decorative toolkit icons with empty alternatives inside one named composite illustration. The external scan's 77% figure does not describe the current local HTML. Decorative images should remain silent according to [WAI's image decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/).
- `assets/css/site.css`: added `--accent-text` for readable blue text without changing the decorative accent/stroke variable. Small blue text, header contact text and primary-button hover now use it. Changed the orange play-button background and corrected its invalid font shorthand to the intended 14px body font. The hero layout, artwork and motion are unchanged. The homepage stylesheet query version was updated.
- `tests/accessibility.test.mjs`: regression checks cover the logo semantics, named containers, visible/accessibility name match, descriptive versus decorative image alternatives, and AA colour ratios.
- `assets/js/main.js`: contains Tab and Shift+Tab within an open skill dialog. Escape restores the opener, with pending focus work cancelled on close. `tests/skill-modal-keyboard.test.mjs` checks actual controller behavior.
- `assets/js/intro-video.js` and `assets/css/site.css`: successful keyboard playback moves focus into native video controls and removes the custom play control from keyboard/assistive-technology access while hidden. Completion restores the play control; failed playback leaves an enabled retry button. Completion does not steal focus if the visitor has moved elsewhere. `tests/intro-video.test.mjs` verifies these cases. `index.html` bumps both changed script URLs and the stylesheet URL; generated first-screen CSS remains synchronized.
- `tests/security-headers.test.mjs`: accepts the intro script's cache query string while continuing to require an external script compatible with the existing CSP. No security headers changed.
- `docs/accessibility.md` and `docs/performance/accessibility-2026-11-09.json`: this verification guide and measured audit evidence.

| Element | Light theme | Dark theme |
| --- | --- | --- |
| Case-study text | `#2457d9` on `#f5f3ee`: **5.50:1** | `#78a0ff` on `#151b19`: **6.88:1** |
| Header contact text | **5.50:1** | **6.88:1** |
| Play with sound | White on `#bd4117`: **5.34:1** | White on `#bd4117`: **5.34:1** |

All are above the 4.5:1 normal-text threshold in [WCAG's contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The play-button name also follows [Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html).

No hosting, server, Firebase, DNS, authentication or deployment settings changed. The application has no new dependency; Lighthouse was used through the temporary npm execution cache. The changes are local until published.

## Verify

1. Serve the repository using `.\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/`.
2. In Chrome DevTools, open **Lighthouse**, select **Accessibility**, select mobile and **Analyze page load**. The reported `aria-prohibited-attr`, `color-contrast` and `label-content-name-mismatch` audits should pass. Repeat with desktop and switch the footer theme control between Light and Dark.
3. Inspect the four company images in DevTools' Accessibility pane: their native image names should match their logo alt text, and the wrapper should not carry an `aria-label`. Inspect the play button: role **button**, name **Play with sound**, matching the visible label.
4. Navigate with Tab through the hero actions, skill cards, video, CV/notes and contact links. Press Enter on a skill card: Tab/Shift+Tab must stay inside the dialog; Escape must restore the card. Press Enter on Play with sound: focus must move into native video controls, and the invisible custom button must not remain a Tab stop. On completion, the play button returns. Check project images and the decorative toolkit with a screen reader; meaningful images should be described and individual decorative icons should not add duplicate announcements.
5. Run `node --test tests/*.test.mjs`. To reproduce the CLI audit, set `CHROME_PATH` to a Chromium browser executable and run `npx.cmd --yes lighthouse@13.6.0 http://127.0.0.1:8000/ --only-categories=accessibility --output=html --output-path=.tmp/accessibility.html --chrome-flags="--headless --disable-gpu"`. The recorded QA run also blocked `*firebase*`, `*cloudflare*` and `*identitytoolkit*` through a temporary Lighthouse configuration.
6. After publication, rerun the same Lighthouse check on `https://sujeetkhadka.com.np/` and inspect the final redirected hostname. A successful local report does not establish that the live site has deployed these files.
