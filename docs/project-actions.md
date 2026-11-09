## Action hierarchy

The primary client path is **Discuss your project → project inquiry section → Email your project brief**. Portfolio exploration is the main secondary path, labelled **See selected work**. The hero keeps its original headline, image and layout; it has two actions, with one filled button and a quieter work link. Notes remain available in About, navigation and the footer.

| Core action | Previous wording/destination | Updated wording/destination | Measurement ID |
| --- | --- | --- | --- |
| Header | Let's talk → Contact | Discuss a project → Contact | `nav-inquiry` |
| Hero primary | View projects → featured project | Discuss your project → Contact | `hero-inquiry` |
| Hero secondary | Read my notes → blog | See selected work → work section | `hero-work` |
| About CV | View CV → PDF | View design CV (PDF) → same PDF | `about-cv` |
| About writing | About me → blog | Read my design notes → same blog | `about-notes` |
| Contact | Email address → email app | Email your project brief → prefilled email draft | `contact-email` |

The contact heading is “Let’s discuss your project.” Supporting copy asks for the project, design help and timeline. The email subject and body supply those prompts, while visible helper text explicitly says this opens an email draft. The actual address remains visible and copyable. There is no new form or promise that clicking sends an inquiry. Footer contact navigation now says “Project inquiries”; the Notes navigation link was corrected to open the actual blog instead of the work section.

## Files and settings

- `index.html`: six core action labels/destinations and stable measurement attributes, contact instructions and draft, footer/nav wording, updated stylesheet query version.
- `assets/css/site.css`: wrapping and spacing for longer hero/About labels, a quieter secondary work link, visible focus outlines, and contact button/helper styles. Existing colour-contrast fixes are retained. No hero artwork, animation or page section was replaced.
- `tests/project-actions.test.mjs`: primary/secondary routing, native email-draft expectations, valid PDF/blog destinations and measurement identifiers.
- `docs/project-actions.md`: this action inventory and measurement/verification plan.

No hosting, owner access, Firebase rules/data, analytics-service configuration or email-service settings changed. The existing Cloudflare traffic endpoint measures aggregate visits/requests rather than CTA clicks or received inquiries. This change adds no script, cookie, network request or visitor identifier for tracking.

## Measurement plan

Each of the six core links has `data-cta-id`, `data-cta-intent` and `data-cta-version="project-inquiry-v1"`. These are static hooks for a future analytics implementation; they do not currently collect clicks or run an A/B experiment. Keep measurement ID and placement stable if wording changes.

Once measurement is available, record exposure to each variant and clicks by CTA ID, intent, copy version and device category. Compare inquiry-path clicks per eligible visit and portfolio-exploration clicks per visit against a baseline with the previous wording. Separate devices and acquisition sources where possible. This version changes both hierarchy and copy, so treat it as a combined design variant; hold placement and destinations constant in any later wording-only test.

For this mailto flow, `contact-email` clicks indicate email-draft intent, not successful submissions. Count actual project-inquiry emails received as outcomes, deduplicated and reviewed for relevance. Do not emit a successful `contact_submit` event from an anchor click. If a form is added later, count submissions only after a confirmed server-side success. No click history, baseline conversion rate or conversion improvement is claimed by this change.

## Check locally and after publication

Local verification on 2026-11-09: all **104 Node tests** passed, including action-routing and accessibility regressions. Browser checks at 320, 390, 800, 900, 1100 and 1440px passed without horizontal overflow in light and dark themes. Enter on the hero inquiry action moved keyboard focus to the contact heading; the secondary link reached `#work`. The email address, subject and prompts were inspected without opening an email app or sending a message. These checks verify behavior, not conversion improvement. The repeated request also prompted the additional skill-dialog and intro-video keyboard fixes documented in `docs/accessibility.md`.

1. Serve with `.\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1` and open `http://127.0.0.1:8000/`.
2. Confirm the hero's filled “Discuss your project” action reaches the inquiry section and “See selected work” reaches the start of Selected work. Check keyboard focus at Contact, reduced motion, and ordinary anchors without JavaScript.
3. Inspect “Email your project brief”: it should open the correct address with a project-inquiry subject and project/design-help/timeline prompts. Review the draft; no message is sent automatically. The address should remain readable if no email app is configured.
4. Check the header, CV/PDF, design-notes and footer destinations. At 320px and 390px, longer labels should wrap without horizontal overflow. Check dark/light themes and visible keyboard focus.
5. Inspect the six `data-cta-*` labels in DevTools and run `node --test tests/*.test.mjs`. Until an analytics collector is integrated, no CTA counts will appear in the current traffic panel.
6. After publication, repeat these checks on the live URL, then begin the measured comparison when click and inquiry data are available. The wording alone does not establish improved conversion.
