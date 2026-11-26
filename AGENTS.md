# Agent entrypoint

Maintain Sujeet Khadka's public portfolio. The public entry is `index.html`; the owner's availability editor is `login/index.html`.

## Read only what the task needs

- Start here. Use [the task index](docs/README.md) to select the relevant feature guide and its source files before edits. For shared startup, styling or cross-feature changes, also read the affected guides; do not read unrelated documentation by default.
- [Development](docs/development.md) has the architecture, local commands and test map. [Status](docs/status.md) records dated verification and pending live work.
- [Historical records](docs/history/README.md) are optional evidence, not current instructions. Read a specific record only when investigating its decision or measurement.
- Keep current behavior in its feature guide, operational steps in its runbook, and dated evidence in history. Avoid duplicating session transcripts or test totals across guides.

## Preserve behavior while changing the project

Follow the [change workflow](docs/change-workflow.md) for implementation work. Before editing, identify the requested change, the documented behavior to preserve, affected consumers and baseline checks. A broad request to fix speed or bugs does not by itself authorize removing features, changing visit rules or redesigning interactions.

- Treat documented feature contracts and existing regression expectations as constraints. Do not rewrite either to make an unrequested behavior change pass. When a user explicitly changes a contract, name that change and update its guide and tests together.
- Exercise ordinary entry paths in regression tests. Never make a special query flag, saved preference or altered fixture default stand in for a normal visitor. Welcome must retain the full first visit and brief returning Namaste unless the user changes that requirement.
- Keep changes scoped. Shared CSS, startup events, preferences and generated assets require checks for their existing consumers as well as the new feature. Preserve unrelated dirty/untracked work.
- Run focused checks while working and `node scripts/verify-project.mjs` before completing implementation. The verifier checks without regenerating assets or publishing. Report pre-existing failures and verification limits; do not label an unchecked feature as working.
- Update the existing feature guide only for an intended behavior change. Record dated checks in status/history; do not turn an accidental regression into the new documented specification.

## Commands

Run from the repository root in PowerShell. Plain HTML, CSS and browser JavaScript; no framework, bundler, package manifest, install step or configured linter.

```powershell
.\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1
node --test tests/*.test.mjs
node --test tests/availability.test.mjs
```

Use `http://127.0.0.1:8000/`; stop the server with Ctrl+C. Existing local Python 3.13.5 and Node v24.15.0 were verified, not declared minimums. A portable setup when `.venv` is absent remains undocumented. Source is served directly; there is no build command.

## Working rules

- Inspect `git status` before edits. Preserve unrelated changes and untracked material, including `Blogpage/`; do not stage it incidentally.
- Match surrounding style: two-space JavaScript, camelCase identifiers, kebab-case filenames/classes, existing ES modules and injected document/window controller factories. Cleanup releases listeners, timers, observers and animation state.
- Run relevant existing tests; extend `node:test` / `node:assert/strict` coverage for behavior changes. Mocked tests do not verify browser layout or live services.
- Preserve native anchors, readable static content, fallback availability, CSS theme variables and `[data-theme="dark"]`, reduced motion and constrained-device branches. Keep painted content visible during motion startup.
- Active welcome assets are `loader/files/loader.js` and `loader/files/loader.css`; keep embedded welcome CSS and the Namaste SVG template synchronized with their sources. The alternate `assets/js/page-loader.js` and `assets/css/page-loader.css` are inactive.
- Retain pinned Firebase browser SDK 13.0.0 and vendored GSAP/ScrollTrigger 3.15.1. Never edit minified vendor files or remove notices.
- Preserve the space in `assets/images/sujeet-hero- vector2.svg` (URL `%20`). Inspect CSS/script/import query versions after changing cacheable assets; see [development](docs/development.md) for generation commands.
- Use `textContent` for availability text, validate before writes, and align database rules with client fields. Report service/save failures visibly; never turn errors into successful empty results.
- Preserve `CNAME`, `robots.txt`, `sitemap.xml`, original blog evidence and licensed asset provenance.

## Authorization and live boundaries

- Obtain authorization before publishing site or Worker changes, modifying live Firebase rules/data, changing owner access or altering DNS. Treat a GitHub Pages push, four independent Cloudflare Worker deployments and remote database migrations as separate actions.
- Never expose private Worker credentials to the browser or copy secrets, API keys or `.env` contents into documentation or commits.
- Never open the database to unauthenticated writes or replace the whole database to update one owner. Owner writes are scoped to `siteSettings/availability` after checking `owners/<uid>`.
- Publishing code does not configure providers, allowlists, rules or secrets. Check [status](docs/status.md) and the relevant runbook before live work; dated observations are not guarantees of current health.
