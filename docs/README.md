# Documentation map

Choose the row matching your task. Read that guide and its linked source files; history is optional. For a general introduction, use the [project README](../README.md). Agents start with [AGENTS.md](../AGENTS.md).

| Task | Read |
| --- | --- |
| Local setup, repository structure, generated assets, test selection | [Development](development.md) |
| Determine what was pushed, deployed or still unverified | [Status](status.md) |
| Homepage content, projects, contact actions, accessibility | [Portfolio](features/portfolio.md) |
| Welcome, portrait, GSAP, scrolling, mobile navigation | [Motion and navigation](features/motion.md) |
| Theme, Reader mode, sound, contrast, saved preferences | [Display preferences](features/display-preferences.md) |
| Notebook articles, legacy URLs, original content preservation | [Blog](features/blog.md) |
| Availability badge, owner editor, public Firebase presence/cursors | [Availability and presence](features/availability.md) |
| Public dashboard, page events, active-time metrics | [Analytics behavior](features/analytics.md) |
| D1 analytics setup, retention and traffic credentials | [Analytics runbook](../cloudflare/ANALYTICS.md) |
| Portfolio assistant UI, retrieval and response handling | [Assistant](features/assistant.md) |
| Publish site/Workers or apply assistant migrations | [Deployment runbook](operations/deployment.md) |
| Firebase providers, owner access, rules and live troubleshooting | [Firebase runbook](operations/firebase.md) |
| CSP, security headers, source noindex headers, browser caching | [Security runbook](../cloudflare/SECURITY.md) |
| Indexing, canonical URLs, sitemap, name searches, AI discovery | [SEO runbook](operations/seo.md) |
| Why an earlier implementation changed; dated lab evidence | [History index](history/README.md) |

## Where information belongs

- `features/`: current behavior, code ownership, constraints and focused verification.
- `operations/` and the two code-adjacent Cloudflare runbooks: authorized operational procedures. Actual verification dates belong in `status.md`.
- `history/`: dated decisions, audits and release measurements. “Current” inside a historical record means current at that time.
- `performance/`: original JSON measurement artifacts; retain their paths.
- Asset provenance and licenses stay beside the fonts, project images and vendored GSAP. Preserved blog-source README files are archival artifacts, not project instructions.

Update the existing guide when behavior changes. Add a file only for a distinct task or substantial dated evidence. Keep current guides short and link to source for implementation detail. In status updates, identify the date, commit or service, verification method and remaining uncertainty; do not repeat old test counts as current results.
