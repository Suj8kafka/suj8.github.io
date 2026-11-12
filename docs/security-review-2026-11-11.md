# Security review — 11 November 2026

The site is not manipulation-proof. Restricting database access and validating
input are different from establishing that an activity report came from a real
person. The current design has useful authorization boundaries, but both live
presence and custom usage counters still need abuse protection.

This was a read-only production review and an offline code review. No Firebase
rules, owner access, production records, Worker settings or deployments were
changed. Crafted analytics requests ran against the actual Worker module with
an in-memory SQLite database, never the production collector. The working tree's
pre-existing edits were preserved.

## Findings

### 1. Custom usage counters can be inflated — high priority

`cloudflare/usage-analytics.js` checks the supplied Origin, the event's fields,
known labels, size and duration bounds. It does not require a verified session
or bot-verification token, reject event replay, or enforce a server-side request
budget. `cloudflare/wrangler.analytics.jsonc` declares no rate-limiter binding.

The Origin header limits ordinary browser cross-origin submissions. An external
HTTP client can supply that header itself. The 80-event, 240-timing-report and
one-hour limits in browser JavaScript can also be bypassed by calling the API
directly.

Offline evidence: three unauthenticated page-view submissions each returned 204
and produced three recorded views. A separate claim of 30,000 milliseconds also
returned 204 immediately and added that amount of active time. An unapproved
Origin returned 403. This demonstrates input validation and repeatable forgery,
not a production write or an arbitrary database-access vulnerability.

Impact: false page views, clicks, referrers and engagement; consumption of the
Free plan's Worker/D1 quotas; reports becoming unavailable when limits are hit.
Prepared SQL parameters and fixed metric names prevent these event values from
becoming arbitrary SQL statements.

Recommended changes: server-side limits for collection and public reads,
bot-verified short-lived sessions, replay protection, and server-maintained
elapsed-time budgets. Session issuance itself must have abuse protection;
signing a token from an unrestricted public endpoint is insufficient. These
controls reduce abuse and cannot prove that a human actually read a section.

### 2. Live presence is client-reported — high priority

The repository rules restrict a presence write to the authenticated UID's own
record. That is a useful isolation boundary, assuming the deployed rules match.
Anonymous sign-in, however, establishes an identity rather than a trustworthy
human visitor. Someone can open multiple tabs or establish multiple anonymous
identities and submit their own presence records.

The current schema permits visitor-supplied labels, sections, locations and
timestamps within broad bounds. A visitor can therefore misrepresent their own
label, location or activity. This is distinct from obtaining owner privileges
or permission to overwrite another UID's record.

`analytics/countries` also permits any authenticated identity to increment a
country counter. Each increment is constrained to +1, but repeated increments
and arbitrary country labels remain possible under the repository rules.

Recommended changes: verify the deployed rules, narrow field patterns and
allowed values, avoid treating self-reported locations as verified facts, and
introduce App Check with monitored enforcement and reviewed provider quotas.
Consider server-controlled presence issuance, timestamps and connection budgets
if stronger resistance to spoofing is required. Presence should continue to be
described as approximate connections, not a count of unique people.

### 3. Prepared security headers are absent live — medium priority

HEAD requests to the www homepage, `/privacy/`, `/login/`, and the apex redirect
found all six policies in `cloudflare/security-headers.mjs` absent:

- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- Referrer-Policy
- Permissions-Policy

HTTPS pages load successfully, but the prepared edge security policy is not
currently applied to these responses. This is a gap in browser-side defenses;
it is not evidence that a database has been breached.

Do not deploy the prepared policy unchanged without compatibility checks. Its
script policy currently excludes the inline `loader-bootstrap` script and
Cloudflare's automatically injected Web Analytics beacon. Review those sources,
test a report-only policy, then enforce the intended policy and verify redirects
and error responses as well as successful pages.

### 4. Malformed event keys can escape error handling — lower priority

The collector calls `Object.hasOwn` with event type, path and name values before
requiring those values to be strings. Some JSON objects fail property-key
conversion. Offline probes reproduced unhandled TypeErrors for malformed type,
path and section-name objects. This should be rejected as a controlled 400
response before accessing the database. No production malformed requests were
sent, and this finding did not demonstrate data disclosure or code execution.

## Existing protections and verification limits

- Repository rules default to denied access. Availability editing requires a
  non-anonymous identity whose `owners/<uid>` value is true; browser clients
  cannot grant themselves owner access under those rules.
- Live unauthenticated shallow reads returned 401 for the database root,
  `/presence` and `/owners`. Public availability returned 200, as intended.
  These read checks do not establish that all deployed write rules are correct.
- The cached Firebase CLI login could not authenticate. Exact deployed rules,
  owner permissions, App Check settings and account MFA were not verified.
- D1 is accessed through the Worker binding. The collection API exposes fixed
  counter increments, not arbitrary SQL or general-purpose database writes.
- Cloudflare's analytics API token is held in a Worker Secret and is not sent to
  the public dashboard. The network-traffic endpoint reads Cloudflare's own
  estimates. Visitors cannot directly choose those stored Cloudflare numbers,
  but generating traffic can increase requests and distort apparent visits.
- Visitor text is rendered with `textContent`, and cursor colors are restricted
  to the palette. This reduces the reviewed data paths' script-injection risk;
  it is not a complete cross-site scripting audit of every page or dependency.
- Existing focused tests passed for admin access, presence, analytics and the
  security-header Worker. Passing code tests does not verify remote deployment
  configuration or establish protection against abuse.

## Suggested order

1. Harden the custom collector against repeated and malformed submissions, with
   rate and session budgets selected for normal multi-tab visitors and Free-plan
   limits. Verify all changes in local tests before publishing.
2. Refresh Firebase access for a read-only inspection of deployed rules and
   owner access, then prepare stricter rules and App Check rollout separately.
3. Update and test the edge security policy, including the loader and optional
   Cloudflare beacon, then deploy after authorization.
4. Verify strong account authentication/MFA and monitor rejected requests and
   resource quotas. No public analytics system can promise zero fake activity.

References:

- [Firebase rules basics](https://firebase.google.com/docs/rules/basics)
- [Firebase App Check and its limits](https://firebase.google.com/docs/app-check)
- [Cloudflare Worker rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
