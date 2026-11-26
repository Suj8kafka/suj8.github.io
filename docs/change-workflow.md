# Making changes without losing existing behavior

Use this workflow for implementation work. [Task index](README.md) · [Development commands](development.md)

## Before editing

1. Inspect `git status`. Identify existing local edits and untracked material; keep them out of unrelated work.
2. Select the feature guide through the task index and read its contracts, owned source and relevant tests. For shared CSS, startup or preferences, follow the affected consumers into their guides. History is evidence when needed, not the current specification.
3. State a short scope note in the progress update: the requested outcome, behavior that must stay the same and what will verify the change. Keep this in the task conversation; do not create a new Markdown file per session.
4. Run the relevant existing tests before editing. For broad repairs, run the full suite. Record existing failures separately from new failures. An existing defect is not permission to weaken its expected behavior.

## During implementation

Optimize or repair the implementation while preserving its feature contract. A request such as “make the site faster” keeps the existing visitor experience unless the user asks to change it. For example, first visits retain the full greeting sequence and returning visits retain brief Namaste; removing their overlay is a product change.

Before changing a test expectation or a feature contract, identify the user instruction that changes that behavior. If there is none, repair the implementation. Do not add a special query parameter or silently change fixture defaults to make the old experience appear covered. Normal homepage visits must be tested as normal visits.

For an explicitly requested behavior change, retain coverage for unaffected scenarios and add coverage for the requested difference. Update the owning feature guide in the same change. Fix adjacent defects only when needed for the requested outcome; identify unrelated issues without silently expanding the task.

## Check shared boundaries

Select checks from the affected feature guides and the development test map. Shared changes need both sides of their boundary checked:

| Change | Existing behavior to exercise |
| --- | --- |
| Welcome or first paint | First and returning desktop/phone visits, reload/restoration, section hashes, Skip, slow/failed assets, preference bypass; full styling and optional startup still complete |
| Shared CSS or responsive layout | Homepage and any affected notebook/owner surfaces, narrow/coarse layouts, light/dark, enlarged text and Reader mode, visible native links and controls |
| Preferences or motion | Default and saved settings, OS overrides, change while running, tab/viewport pause, cleanup and static fallback |
| Shared modules or generated files | Every importing entry, generated bundles/inline styles/artwork, cache query versions and matching CSP hashes |
| Service/UI integration | Loading, success, empty and failure states; unavailable services keep independent features usable; local tests do not establish live health |

Keep concrete contracts and focused scenarios in each feature guide. This table routes cross-feature checks; it does not replace those guides or require every browser scenario for a prose-only edit.

## Before handing back implementation work

1. Run the relevant focused tests after changes and do browser checks appropriate to the affected interactions. Verify ordinary entry paths, not only a debug URL. Reuse local preview; do not write real visitor/service data during QA.
2. Regenerate only the affected artifacts using the development guide. Review the resulting diff and inspect cache references.
3. Run the read-only verification command:

   ```powershell
   node scripts/verify-project.mjs
   ```

   This runs the full Node suite and checks generated files without fixing them. Missing generation tooling is a failed prerequisite, not a skipped success. Install the pinned tool only when needed using the documented setup, then rerun the failed check.

4. Compare the final behavior with the original scope note and feature contract. Review any changed test expectations. Passing tests alone cannot approve an unintended product change.
5. Report what changed, what was verified and material limits. Update current guides for intended behavior changes and status/history for dated evidence. Keep existing documentation chunks current; avoid duplicate summaries and session transcripts.

## Automated checks and release limits

`.github/workflows/verify.yml` runs the same verifier on pushes and pull requests with read-only repository permissions. It installs only the pinned generation tool into `.tmp/` and does not deploy. Until the workflow is committed/pushed and a hosted run succeeds, it is prepared local configuration. Required status checks or branch protection are not configured by adding a workflow.

Local tests and CI detect covered regressions; human review of the feature contracts and appropriate browser checks remain necessary. A green check does not prove live Firebase, Workers, layout or accessibility behavior. Publication, security Worker activation and data migrations retain their separate authorization boundaries in `AGENTS.md`.
