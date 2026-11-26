# Portfolio content and interactions

Read when changing the homepage, selected work, contact flow or accessibility. [Task index](../README.md) · [Verification status](../status.md)

## Ownership and visitor path

- `index.html` owns static content, native links, semantic sections and structured identity. `assets/css/site.css` owns layout; `assets/js/main.js` owns general interactions and skill dialogs.
- Hero → Selected work → focus strip → About → Experience → How I work → Writing → Contact. Desktop navigation: Work, About, Writing, Resume and Get in touch. Mobile: Home, Work, About, Writing, Contact.
- Hero actions lead to `#work` and `#contact`. About retains experience/skills anchors, resume and notebook links. Navbar/About resume links use `docs/Sujeet_Khadka_Resume.pdf`. Contact has one centered project/opportunity card and a native email draft with project, design-help and timeline prompts. Clicking does not send an email; keep a visible direct email fallback.
- Availability is independent; see [availability](availability.md). Welcome/scroll behavior belongs in [motion](motion.md), not the general interaction module.
- The desktop homepage footer pairs Product Sans for its oversized Sujeet/Khadka name with DM Sans for its supporting text and a full-width, theme-aware grid background. The right-hand box matches the inquiry tile’s width and responsive height. Six black/charcoal faces carry abstract interaction studies: a snapping grid, Bézier curve, morphing shape, spring press, connected flow and responsive ripple. Internal face indices remain 1–6; no reference numerals are displayed. Its silhouette stays rectangular: moving seams reveal four surrounding faces (1–4), then top (5), back (3) and bottom (6), returning to front (1). Direction-aware lighting and face darkening emphasize each turn. The footer height stays constant through the animation. The inquiry tile leads to `#contact`, followed by a compact work/about/notebook and social-link strip, then copyright, privacy and back-to-top links with minimal bottom padding. At up to 800px, or 1100px with a coarse pointer, a compact full-name heading replaces the two large name rows, the decorative box/grid are hidden, and a 64px contact prompt replaces the tall inquiry tile. All contact/navigation links retain at least 44px targets and clear the bottom navigation. Reader mode and enlarged text simplify the layout. Motion has a pause/resume control and stops on compact layouts, offscreen, in hidden tabs, for reduced motion, Reader mode and constrained devices.

The desktop footer includes a monochrome outline explorer who rests in the hero's thoughtful pose. He tours eight landmarks: both name rows, artwork, email, inquiry tile, navigation, social links and credits. The tour uses more of the footer, including the safe bottom edge. Overhead travel eases in/out at an average 55px/s; the first contemplation lasts 12 seconds, inspections last about 20–33 seconds and combine several hand gestures with longer thinking holds. Hovering or focusing landmarks queues the latest requested visit without interrupting the current journey/act. Clicking, hovering or focusing his native “Say hi to Sujeet” button waves and pauses to think; a focused button stays stationary until blur. Motion shares the footer's pause and visibility gates and stops in reading/enlarged-text, compact/touch and constrained-device branches. The overhead asset loads only when motion can start; no JavaScript retains a static thinking pose. Footer height and native navigation remain unchanged. Assets and generation prompts are in [footer artwork sources](../../assets/images/footer/README.md).

## Content rules

Shared typography uses the supplied Product Sans regular/bold files for headings (`--display`) and DM Sans for body copy, brief descriptions, links, controls and human-facing labels (`--body`). DM Mono is reserved for technical data and dates. Font sources, loading behavior and provenance are in [the font README](../../assets/fonts/README.md).

Use the confirmed identity and preferences in [status](../status.md). Keep role/location, visible biography, metadata and author markup consistent. Use [SEO](../operations/seo.md) for indexing changes.

The Neptune TechZone / Aama Cure UI/UX Designer role ran from January to June 2026; it is past employment. The [current résumé](../Sujeet_Khadka_Resume.pdf) specifies UI/UX Design Intern in January–March and Junior Designer in April–June. Preserve that distinction in detailed career answers.

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
