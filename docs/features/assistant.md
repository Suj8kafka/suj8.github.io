# Portfolio assistant

Read for assistant UI, request handling or knowledge retrieval. [Task index](../README.md) · [Deployment](../operations/deployment.md)

## Source and flow

| Component | Source |
| --- | --- |
| WALL·E launcher, portrait flip and one-question form | `assets/js/portfolio-assistant.js`, `assets/css/portfolio-assistant.css`, hero markup in `index.html` |
| Validation, retrieval, guarded model call and errors | `cloudflare/portfolio-assistant.js` |
| Worker, AI/rate-limit/D1 bindings and model selection | `cloudflare/wrangler.assistant.jsonc` |
| Additive knowledge table and seed records | `cloudflare/migrations/0003-portfolio-assistant.sql` |
| Neptune TechZone employment end date correction | `cloudflare/migrations/0004-neptune-experience-ended.sql` |
| Résumé-aligned Neptune internship/junior periods and responsibilities | `cloudflare/migrations/0005-neptune-resume-roles.sql` |
| Owner/résumé-confirmed Upwork start in August 2025 | `cloudflare/migrations/0006-upwork-start-2025.sql` |

The character walks along the portrait's top edge and supports pointer/keyboard activation. Opening flips the portrait to reveal the assistant; closing restores it without covering the rest of the page. Preserve focus, reduced motion and static portfolio content.

The homepage inlines the assistant CSS and bundles its controller with other homepage controls. WALL·E uses a transparent 270×307 WebP derivative at low fetch priority; the original PNG remains preserved. The launcher can appear within the initial viewport, so it is not lazy-loaded. Project images remain lazy and use responsive sources. Rebuild inline CSS/bundles with the [development commands](../development.md).

The browser sends one question at a time with no previous-message history. The Worker checks origin, method, content type, payload shape and a 500-character question limit, then applies its configured 12-per-minute native rate limiter. Obvious off-topic, unknown-personal and prompt/credential requests receive fixed responses without a model call.

Portfolio questions retrieve active `portfolio_knowledge` records from the existing `portfolio-usage` D1 database via `PORTFOLIO_DB`. Category/title/keyword/content scoring selects at most six records. Workers AI is instructed to answer from that evidence. There are no embeddings, Vectorize index, agent loop or conversation table. Model selection belongs to the config; check it there instead of duplicating it in guides.

## Change contracts

- Render answers with `textContent`. Links come from trusted knowledge fields and are protocol-checked by both Worker and browser.
- Unknown information and service/quota failures remain explicit. Do not invent availability, qualifications, outcomes or personal facts.
- The current [résumé](../Sujeet_Khadka_Resume.pdf) records Neptune TechZone as a UI/UX Design Intern in January–March 2026, followed by Junior Designer in April–June 2026. Keep the two completed periods distinct; do not describe this as current employment. The scoped follow-up migration preserves other knowledge and record identity/link fields.
- Upwork freelance work started in August 2025 and remains ongoing. Migration `0006` corrects only that entry's start year and keywords while preserving its other facts, links and all unrelated knowledge. Keep previously applied migrations unchanged.
- No private key or Worker credential belongs in browser code. Do not log/store conversations as part of a UI change.
- Keep the homepage endpoint, Worker URL and security CSP `connect-src` aligned. Live deployment and remote migrations are separate authorized actions.
- This small on-site assistant does not determine recommendations in external chatbots; see [SEO](../operations/seo.md).

## Verify

```powershell
node --test tests/portfolio-assistant.test.mjs tests/portfolio-assistant-worker.test.mjs
```

These tests require no live AI call. Browser-check desktop/mobile portrait state, keyboard focus, close, dark mode, reduced motion, trusted response links and visible errors.

The production Worker rejects localhost origins. Authorized Wrangler development can use the development environment value without committing it to production. Workers AI development requests can consume live account allocation. Deployment, migration inspection and health/origin checks are in [the deployment runbook](../operations/deployment.md); last recorded evidence is in [status](../status.md).
