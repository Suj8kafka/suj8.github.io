# Analytics behavior and privacy

Read for public reports, event collection or metric definitions. [Task index](../README.md) · [Service runbook](../../cloudflare/ANALYTICS.md)

## Independent systems

| System | Meaning and source |
| --- | --- |
| Firebase presence | Approximate current connections and cursors; [presence guide](availability.md) |
| Cloudflare traffic | 24-hour requests/visits, paths and countries from hostname-scoped GraphQL; visits are estimates, not unique people |
| Custom public usage | Browser activity → validated Worker `/collect` → D1 aggregate counters → public `/usage` reports |
| Google Analytics | Separate Google tag/private owner reports; not a data source for the public D1 dashboard |

`assets/js/analytics-config.js` owns endpoint and fixed labels. `usage-tracker.js` collects known events; `engagement-tracker.js` measures foreground time; `analytics-report.js`, `privacy.js` and `visitor-panel.js` present reports. Worker ownership: `cloudflare/analytics-worker.js`, `usage-analytics.js`, `analytics-cache.js`. The public page is `privacy/index.html`.

Maintained pages keep the Google data-layer bootstrap in the head but schedule its network script through `deferred-analytics.js`. Load or first pointer/key/scroll interaction triggers two paint opportunities, then one initializer per idle callback (timer fallback). Google loads only on production hosts. The optional `analytics.bundle.js` is fetched afterward; its usage and visitor-panel factories initialize in separate idle tasks. Custom collection/engagement therefore starts after deferred startup, not at initial navigation. Local QA can initialize the panel but never submits Google/custom analytics.

## Collection and reporting contracts

- Custom usage runs only on production home/privacy pages. Localhost, preview and `/login/` do not submit. DNT and GPC disable this tracker; they do not disable independent Firebase presence or infrastructure processing.
- No persistent visitor identity, cookie, local-storage ID, fingerprint or individual browsing history is created by the custom tracker. Google Analytics is separate and may use cookies/client identifiers; keep the public privacy text accurate.
- `POST /collect` validates origin, content type, 1 KiB body limit, fixed page/section/event labels, allowed fields and duration bounds. Store daily aggregate increments, coarse device/browser families and approximate country, not raw IP/UA, arbitrary URLs, form values, queries, hashes or pointer coordinates. Referral hosts become fixed categories.
- Sections and scroll milestones count once per load. Rapid duplicate clicks are throttled; at most 80 non-timing events per page. Clicks represent intent, not delivered email, completed downloads or conversions.
- `GET /usage?days=1|7|30|all` returns totals and breakdowns. The API defaults to seven days; privacy UI requests All Time by default. Numeric ranges have zero-filled UTC daily series; All Time combines retained daily and monthly history into a monthly series.
- Missing D1 binding is 503; database failure is 502. Successful empty data and service failures must remain distinct. An older Worker's explicit unsupported-All-Time response can fall back to a labelled seven-day report; other failures remain visible.
- Successful report ranges cache separately for five minutes. Collection and errors do not cache. Daily rows older than the most recent 90 UTC dates are atomically combined into permanent monthly aggregates and deleted in the same batch. Missing monthly storage must fail before deleting daily history.

## Active time

Count only while the document is visible, window focused and welcome complete; pause after 60 seconds without activity. Attribute time at a reading point 38% down the viewport; gaps/open dialogs can contribute to page time without a section. Flush buffered milliseconds roughly every 15 seconds and on blur/visibility/departure. Delivery is best effort; omit sampling gaps over 30 seconds.

Cap measurement at one hour and 240 timing requests per load. Accept integer 1–30,000 ms increments. Page and section counters update atomically, with section totals bounded by page time. Input events refresh activity but their values do not enter analytics.

“Time per page load” divides active milliseconds by timing-enabled page loads in the selected period. Across UTC boundaries, time may exist without its original load; show no ratio when the denominator is zero. This is not unique-visitor count, session duration or proof of attention. Scroll milestones measure position reached, not reading.

## Verify

Run `deferred-analytics`, `usage-analytics`, `usage-tracker`, `engagement-tracker`, `analytics-worker`, `analytics-cache`, `visitor-panel`, `privacy` and `google-tag` tests as relevant. Check service errors independently: one failed report must not hide another successful block.

Browser-check sidebar focus/Escape/resizing, public range changes, empty/failing reports and privacy signals. For authorized timing checks, switch focus, remain idle for over a minute and verify pauses/resumption. Account for report caching. No local test proves live collection, unique visitors or abuse-proof counts. Dated activation and limits belong in [history](../history/analytics-implementation-2026-11-18.md); current verification belongs in [status](../status.md).
