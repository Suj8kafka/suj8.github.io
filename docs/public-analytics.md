# Public analytics and privacy

The portfolio footer links to `/privacy/`: public usage analytics first, followed
by a policy describing the actual site services. The live studio also links here.
There is no browser-exclusion button. The new tracker honours Do Not Track and
Global Privacy Control; these signals do not disable the independent Firebase
presence feature or infrastructure security processing.

## Recommended storage and data flow

Use Cloudflare D1 for the public usage history and retain Firebase for live
presence and availability. This reuses the existing Worker, keeps analytical
queries behind a server, and avoids changing the Firebase presence rules or
exposing a writable analytics database to visitors. This recommendation is for
the custom public page and section-time measurements requested here. Umami Cloud
remains an alternative when its ready-made dashboard is the priority.

```text
Visitor's browser → validated Worker /collect → D1 daily totals
                                               ↓
Public /privacy/ page ← read-only Worker /usage report
```

The database stores historical totals after activation; visitors do not need to
be online for their earlier activity to remain in those totals. It stores no
individual visitor histories. The report is readable without Firebase sign-in.

The dashboard includes page loads, referral categories, countries, browser/device
families, clicks, sections reached, active time per page and section, and scroll
milestones. These are activity counts, not unique people or returning visitors.
There is no persistent identity linking page loads.

### What “time spent” means

`assets/js/engagement-tracker.js` estimates active time using a monotonic clock:

- Count while the document is visible, its window has focus and the welcome
  overlay has finished. Pause after 60 seconds without input or scrolling.
- Attribute time to the portfolio section covering the reading point 38% down
  the viewport. Time in gaps or open skill/live-studio dialogs remains in the
  page total without a section label.
- Send buffered milliseconds approximately every 15 seconds, on blur, on a
  visibility change and on departure. Page departure uses a keepalive request;
  delivery is still not guaranteed. Exclude sampling gaps over 30 seconds to
  avoid treating browser/device suspension as reading.
- Stop at one hour of measured time per page load. The outer tracker also caps
  timing requests at 240 per page load, separately from the 80 non-timing events.
- Store page-time and section-time increments in the same database transaction.
  A report cannot attribute more time to sections than to its page. Only known
  public pages/sections and integer durations of 1–30,000 ms are accepted.

“Time per page load” divides active milliseconds received during a selected
period by page loads marked as timing-enabled during that same period. It does
not include old page loads without timing support in its denominator. A page can
span a UTC date boundary; a period may therefore contain time without its initial
page load. In that case the ratio is unavailable when its denominator is zero,
while the total active time remains visible. This is not a session-duration or
unique-visitor metric.

Scroll milestones record each 25%, 50%, 75% and bottom position once per portfolio
page load, including jumps made by anchors. They measure position reached rather
than proof of reading. Time estimates cannot establish attention or eye movement.
Input event types only refresh the idle timer; key values, input contents and
pointer coordinates do not enter this analytics stream.

The reference site's public policy does not reveal its private dashboard or
establish that it measures active time per section. Umami's documented built-in
visit duration uses the first and last event timestamps for visits with multiple
pages; section-level active time still needs dedicated instrumentation. See
[Umami metric definitions](https://docs.umami.is/docs/metric-definitions).

## Local implementation

- `assets/js/usage-tracker.js` runs on the production home and privacy pages only.
  Localhost, previews and `/login/` do not submit usage events. No visitor ID,
  cookie, local-storage entry or fingerprint is created by this tracker.
- `assets/js/analytics-config.js` shares the endpoint and fixed page, section and
  interaction/depth labels with the Worker and dashboard. The original Cloudflare
  traffic endpoint and Firebase presence remain independent.
- `POST /collect` validates the site origin, content type, 1 KiB body limit,
  allowed fields, event labels and elapsed-time bounds. It stores only daily
  aggregate increments, including milliseconds for `pageTime` and `sectionTime`.
  Browser/device families and the approximate country come from request metadata;
  the full user agent and network address are not stored in D1. Referral hosts
  become fixed source categories; unknown hosts become “Other websites”.
- `GET /usage?days=1|7|30` returns public totals and breakdowns, including zero-filled
  UTC days, active milliseconds, timing-enabled page loads and the time-per-load
  ratio. It needs a D1 binding, not a Cloudflare GraphQL API token. No binding
  returns 503; failed reads/writes return 502. Neither is a successful empty report.
- The root endpoint still returns Cloudflare requests and visits for 24 hours.
  Those are network estimates, not page views or unique visitors. Existing
  GraphQL credentials remain in Worker secrets and are never sent to the browser.
- Reports cache for five minutes. POST responses are never cached. A daily cron
  deletes counters older than the most recent 90 UTC dates.

Sections count once per page load. Clicks cover project, article, CV, email,
social and notebook links, skill details and theme choices. These measure clicks,
not completed downloads, delivered email or conversions. Rapid duplicate clicks
are throttled and a page submits at most 80 non-timing events. No form contents, arbitrary
link text, queries, hashes, campaign tags or full referral URLs are submitted.
Blocked scripts, privacy signals, bots and failed requests affect counts. The
public collector does not establish unique people or provide abuse-proof counts.
Origin checks constrain browser submissions; they are not authentication against
non-browser clients. Apply Cloudflare rate limits if abuse becomes a concern.

## Service activation (requires owner authorization)

Activation was authorized on 10 November 2026. The `portfolio-usage` D1 database
was created in APAC, the counter-table migration applied, and the analytics
Worker deployed with its D1 binding. Both its traffic and usage endpoints
returned HTTP 200. The owner stored the read-only traffic token directly as a
Worker Secret; it is absent from source files. Firebase rules/data, owner access,
DNS and account plans were not changed. Static website publication is tracked
separately from the Worker deployment.

The steps below describe setup on a new account. The current database ID and zone
ID are already configured; do not create another database for this installation.

After authorization, create a D1 database in the same account as the existing
analytics Worker, for example:

```powershell
npx wrangler d1 create portfolio-usage
```

Use the returned **real database ID** in `cloudflare/wrangler.analytics.jsonc`,
preserving the existing Worker name, variables and daily cron:

```jsonc
"d1_databases": [{
  "binding": "ANALYTICS_DB",
  "database_name": "portfolio-usage",
  "database_id": "<ID returned by Cloudflare>",
  "migrations_dir": "migrations"
}]
```

Create the table before publishing the Worker:

```powershell
npx wrangler d1 migrations apply ANALYTICS_DB --remote --config cloudflare/wrangler.analytics.jsonc
npx wrangler deploy --config cloudflare/wrangler.analytics.jsonc
```

Publishing site files to the existing GitHub Pages origin is a separate step.
Keep the security Worker and Firebase configuration intact. For the existing
Cloudflare traffic totals, see `cloudflare/ANALYTICS.md` for the two required
Worker secrets; detailed usage works independently of those secrets.

Once deployed, verify `/usage?days=7` returns a report, load the production home,
open a project and visit `/privacy/`. After the five-minute cache expires, check
the resulting counts. Confirm the `15 0 * * *` cron is enabled for retention.
Also check a browser with DNT or GPC: it should submit no usage requests while
the public report remains readable. Do not claim historical usage before service
activation. If setup is missing, the dashboard intentionally displays an error
instead of invented values.

## Cloudflare Free plan and the right sidebar

The right sidebar is owned by `assets/js/visitor-panel.js`, independently of the
Firebase presence module. It remains available if Firebase cannot load. It shows
seven-day page views, interactions, active time, time per page load and the top
three sections by active time. A separate block shows the existing Cloudflare
requests, visits, top paths and countries over 24 hours. Both services retain
their own error states; a failure in one does not hide successful data from the
other. Escape and close return focus to the opener, or to the wordmark if the
desktop opener became hidden after resizing.

Verified published Free-plan allowances on 10 November 2026:

| Resource | Allowance |
| --- | --- |
| Workers requests | 100,000 per day, shared by account Workers |
| D1 rows read | 5 million per day |
| D1 rows written | 100,000 per day |
| D1 storage | 5 GB total; 500 MB per Free database |
| D1 databases | 10 per Free account |

The public reports use a five-minute Cache API cache at the Worker edge, in
addition to browser caching. This reduces GraphQL calls and D1 reads; cache hits
still count as Worker requests. Successful reports only are cached, and query
noise cannot create unlimited distinct report keys. Collection and errors are
not cached. Daily counters use a primary key without extra secondary indexes,
and the daily retention job limits historical rows. Each timing batch writes
one page-time counter plus its section-time counters; it is not one database row
per individual visitor event. Actual usage depends on traffic and navigation.
Breakdown totals are grouped in SQL so longer report periods do not send every
daily row back to the Worker for JavaScript aggregation.

No paid plan, Analytics Engine, KV, Queues or other paid service was activated.
On Free, exhausting the daily D1 limits causes query errors until the quota
resets. The report displays service failures instead of successful empty data;
there is no guarantee that unusually heavy or abusive traffic stays within the
allowance. Review Cloudflare's usage dashboard as traffic grows.

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/).

For timing, use two browser windows: spend about 20 seconds on the Work section,
switch to another window, then return and scroll to Contact. Only the foreground
intervals should appear in the section-time totals. Leave the page untouched for
over a minute and confirm that its time counters stop until activity resumes.
The existing `daily_metrics` table also stores these counters; no second table,
Firebase rules change or additional migration is needed for time measurements.

## Verification

```powershell
node --test tests/usage-analytics.test.mjs tests/usage-tracker.test.mjs tests/engagement-tracker.test.mjs tests/privacy.test.mjs
node --test tests/*.test.mjs
```

The storage tests execute the actual migration and SQL against Node's built-in
SQLite, wrapped in a D1-compatible test binding. Browser controller tests cover
privacy filtering, lifecycle cleanup, request races, rendering and failure states.
These tests do not verify the live Cloudflare account or production deployment.

The initial implementation passed 162 tests on 10 November 2026. Local headless Chrome
also exercised the dashboard with clearly isolated API fixtures: desktop and
mobile layouts, date-range changes, themes and setup failures. Fixture values
were not added to the site or used as production statistics.

The engagement extension passed 173 tests on 10 November 2026. A further local
Chrome check verified duration formatting, section rankings, 1440/390/320-pixel
layouts, period changes, themes, failed reports clearing time values, and the
timing controller against real DOM geometry with a controlled clock. Live data
collection and the remote D1 database remain unverified and unconfigured locally.

After activation was authorized, the final isolated release passed 171 tests.
The working checkout passed 179 tests, including its pre-existing local fixes.
Chrome checks confirmed the independent sidebar works with Firebase blocked,
handles 320-pixel layouts, restores visible focus on close, hides stale data on
service failure, and links to the full report. The live Worker returned real
Cloudflare traffic and an initially empty D1 report. The site publishes through
the existing GitHub Pages `master` branch; unrelated local edits are excluded
from the release.

Implementation references:

- [D1 database binding and transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Worker request metadata](https://developers.cloudflare.com/workers/runtime-apis/request/)
- [Reference privacy page reviewed for the requested features](https://www.sapkotarupak.com.np/privacy)

The implementation uses the portfolio's existing Cloudflare service, rather than
adding an Umami account or copying the reference site's policy claims.
