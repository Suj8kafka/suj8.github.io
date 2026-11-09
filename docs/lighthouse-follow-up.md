# Lighthouse follow-up — 2026-11-09

The reported deprecated `unload` listener is inside Firebase Realtime Database's
`/.lp?dframe=…` long-polling iframe, rather than the portfolio SVG or loader.
All three database consumers now import a shared `assets/js/firebase-database.js`
module. It calls Firebase's documented `forceWebSockets()` before any database
reference or listener is created, and re-exports the pinned 13.0.0 SDK.
Module evaluation configures transport once, including when public settings and
presence load concurrently. Authentication and database rules are unchanged.

This disables long-polling fallback: on networks that block WebSockets, live
presence, live availability updates and owner saves cannot connect. Published
availability remains readable. Verify successful presence, availability changes
and owner saves in a real browser before release; Node stubs cannot establish
network transport health. No live writes or deployment were performed here.

Reference: https://firebase.google.com/docs/reference/js/database#forcewebsockets

The provided performance score was 98. The remaining headings alone do not
identify the resources responsible for estimated cache, image or JavaScript
savings, forced layout, long tasks or non-composited animations. Use the expanded
Lighthouse report (preferably exported JSON) to attribute those costs before
changing assets or motion. Cache lifetimes require response-header evidence;
HTML metadata cannot set HTTP caching policy. Third-party cache headers and SDK
internals are controlled by their hosts.

Validation: `node --test tests/*.test.mjs` passed 120/120 tests. This does not
predict the production Lighthouse score or verify the deprecation is absent in
a fresh browser audit. Existing unrelated performance edits were preserved.
