# Portfolio content and interactions

Read when changing the homepage, selected work, contact flow or accessibility. [Task index](../README.md) · [Verification status](../status.md)

## Ownership and visitor path

- `index.html` owns static content, native links, semantic sections and structured identity. `assets/css/site.css` owns layout; `assets/js/main.js` owns general interactions and skill dialogs.
- Hero → Selected work → focus strip → About → Experience → How I work → Writing → Contact. Desktop navigation: Work, About, Writing, CV and Get in touch. Mobile: Home, Work, About, Writing, Contact.
- Hero actions lead to `#work` and `#contact`. About retains experience/skills anchors, CV and notebook links. Contact has one centered project/opportunity card and a native email draft with project, design-help and timeline prompts. Clicking does not send an email; keep a visible direct email fallback.
- Availability is independent; see [availability](availability.md). Welcome/scroll behavior belongs in [motion](motion.md), not the general interaction module.

## Content rules

Use the confirmed identity and preferences in [status](../status.md). Keep role/location, visible biography, metadata and author markup consistent. Use [SEO](../operations/seo.md) for indexing changes.

The Neptune TechZone / Aama Cure UI/UX Designer role ran from January to June 2026; it is past employment.

Experience uses a compact vertical timeline in reverse chronological order, with dates beside each role on desktop and above it on phones. A subtle grid remains behind the desktop dates. All descriptions are visible without hover; only native text links indicate navigation, including a direct Aama Cure product link. Reader mode removes the grid and timeline decoration.

Fine-pointer hover and focus within a timeline row accent its marker and logo border, lift the logo by 2px and emphasize the role label. Text links adjust their underline on hover/focus and press. These are bounded CSS transitions with no extra tab stops or JavaScript; reduced motion stops transforms, and Reader mode keeps the rows static.

| Project | Current framing | Evidence constraints |
| --- | --- | --- |
| Aama Cure | Shipped Android/iOS maternity-care product; link to the live product | Describe actual contribution. No invented research participants, outcomes or combined-platform totals. Collect approved evidence before a deeper case study. |
| Carrom Karrom | Lightweight game for older phones; links to its case study | The 50K+ Google Play threshold was verified in the 15 November audit. It is not active users or proof of causal design impact; recheck before updating it. |
| eSewa | Independent redesign proposal linked to its authored case study | Keep proposal status explicit; do not imply employment, endorsement or a shipped eSewa change. |
| Nakka | Additional game project | Do not restore previously unconfirmed role/download claims without evidence. |

Image provenance stays in [selected-work sources](../../assets/images/selected-work/README.md). Preserve truthful alternative text, reserved aspect ratios and responsive sources. The Aama image is maternity-care illustration; describe what is shown rather than calling it an app screenshot.

All six cards in More projects & experiments share a compact preview beside the text. Nakka and 2048 use existing game screens; the other cards use their archived project artwork, contained without cropping.

## Accessibility and measurement contracts

- Preserve the skip link, heading hierarchy, real anchors, visible keyboard focus, safe-area spacing and readable static fallback.
- Social profile icons reveal their brand palettes on hover and keyboard focus, including Figma's five colors and LinkedIn/YouTube's white details. LinkedIn uses the Font Awesome square badge geometry, and Dribbble uses the unmodified mark geometry from its [official media kit](https://dribbble.com/media-kit), with pink (#ea4c89) on hover and keyboard focus in both themes. Social links retain their original 200ms transitions, 3px hover lift and shadow treatment, using CSS without JavaScript or extra requests. GitHub and Medium use light marks in dark mode.
- Named generic containers need an appropriate role. Meaningful images have descriptive alternatives; decorative icons/images remain silent.
- Skill dialogs contain Tab/Shift+Tab, close on Escape and restore the opener. Video keyboard activation moves focus to native controls after successful playback; rejection leaves a retry control. Completion must not steal focus from elsewhere.
- Theme, contrast and Reader controls are owned by [display preferences](display-preferences.md). Keep reduced-motion branches and content visible during startup.
- CTA attributes identify design placements; the current tracker does not report CTA copy variants or per-intent conversions. `project-open`, `resume-download` and `contact-email` are aggregate clicks, not downloads completed or messages delivered. See [analytics](analytics.md).

## Verify

Run `project-actions`, `accessibility`, `typography`, `skill-modal-keyboard` and `intro-video` tests as relevant; filenames and command syntax are in [development](../development.md). Regenerate critical CSS and inspect cache versions after CSS edits.

Browser-check narrow phones, landscape and desktop in both themes, enlarged text, keyboard dialogs/contact navigation, no JavaScript and reduced motion. Automated contrast or Lighthouse results alone do not establish full accessibility conformance. Historical browser evidence is in the [history index](../history/README.md).
