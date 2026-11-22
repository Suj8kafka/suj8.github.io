# Availability, presence and live cursors

Read for public settings, owner editing or anonymous live connections. [Task index](../README.md) · [Firebase setup](../operations/firebase.md)

## Availability ownership

- `assets/js/availability.js`: validation, defaults, display model and safe text updates.
- `assets/js/availability-client.js`: public read/subscription and static fallback behavior.
- `login/index.html`, `assets/js/admin-bootstrap.js`, `assets/js/admin.js`: owner UI and separately authenticated app.
- `database.rules.json`: actual server authorization and field constraints; `firebase.json` and `.firebaserc` select rules/project.
- `assets/js/firebase-config.js` and `assets/js/firebase-database.js`: pinned 13.0.0 browser SDK and shared transport setup.

The owner editor saves only `siteSettings/availability`, after checking the signed-in non-anonymous user under `owners/<uid>`. Browser clients cannot alter the owner allowlist or delete settings. Public settings are readable without owner sign-in. The preview remains local until a confirmed successful save; failures must remain visible.

| Field | Contract |
| --- | --- |
| `status` | `open`, `limited` or `closed` |
| `label` | Trimmed string, at most 24 characters |
| `note` | Trimmed string, at most 160 characters |
| `workTypes` | Boolean `freelance`, `projects`, `fullTime`, `contract` values; at least one selected unless closed |

Keep client fields and database validation aligned. Use `textContent`; never render owner-controlled markup. The badge, details, hero engagement, sidebar and contact copy derive from the same settings. Preserve readable fallback availability when services fail.

Owner authentication uses session persistence with an in-memory fallback, isolated from public anonymous identities. No public sign-up flow is provided. Changes to providers, owner access, data or rules are authorized operational work, covered by the [Firebase runbook](../operations/firebase.md).

## Presence and cursors

`assets/js/firebase-presence.js` uses a separate anonymous in-memory identity per page, registers disconnect cleanup and removes only its own record on exit. Live presence is approximate: background tabs may persist while suspended, and stale peers are filtered locally. It is independent of Cloudflare analytics; `visitor-panel.js` must remain usable when Firebase fails.

`assets/js/live-cursors.js` sends section-relative positions at most ten times per second. Input contents and exact input-field positions are not shared. Reduced motion disables sending/display; the sidebar checkbox also disables both. Remote cursor opacity drops after three idle seconds and hides after five; heartbeats do not reset this movement timer. Hidden tabs hide cursors while retaining their connection record.

The shared database module calls `forceWebSockets()` before database consumers create references/listeners. This avoids Firebase long-polling iframe behavior but removes fallback on networks blocking WebSockets. Static content remains usable; real connection health needs browser verification.

## Verify

Run `availability`, `admin`, `sidebar-availability`, `presence`, `live-cursors`, `firebase-transport` and relevant `enhancements`/`visitor-panel` tests. Include denied owner access, failed save/read, closed availability and malformed fields.

For authorized live checks, use two visible browser windows, verify cursor position and idle handling, tab visibility, opt-out and reduced motion. Verify a scoped owner save, sign-out and denied access separately. Node stubs do not establish live rules correctness. Record outcomes in [status](../status.md).
