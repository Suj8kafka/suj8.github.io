# Analytics service runbook

Read for Cloudflare traffic credentials, D1 migrations, deployment or retention. [Behavior and metric definitions](../docs/features/analytics.md) · [Recorded status](../docs/status.md)

## Source and configuration

`wrangler.analytics.jsonc` selects `analytics-worker.js`, the hostname-scoped traffic query, `ANALYTICS_DB` binding and daily `15 0 * * *` cron. Usage routes are implemented in `usage-analytics.js`; successful reports cache through `analytics-cache.js`.

The browser endpoint is configured in `assets/js/analytics-config.js`. Inspect the config before changing its URL; never copy a private token into browser code. Traffic GraphQL uses:

- `CLOUDFLARE_API_TOKEN`: encrypted Worker Secret, Zone → Analytics → Read, restricted to this site's zone.
- `CLOUDFLARE_ZONE_TAG`: zone identifier in Worker variables.
- `SITE_HOSTNAME`: canonical www hostname in Worker variables.

Only the token is a credential. D1 usage collection/reporting is independent of that GraphQL token. Traffic misconfiguration must not be reported as zero activity or hide successful usage data.

## Existing database and migrations

Reuse the configured `portfolio-usage` D1 database; do not create a replacement as part of an update. Analytics uses binding `ANALYTICS_DB`; the assistant uses `PORTFOLIO_DB` for the same database. Both configs share the `migrations/` directory, so inspect all pending migrations and remote state before applying them.

- `migrations/0001-usage-analytics.sql` creates the daily usage counters.
- `migrations/0002-monthly-usage-history.sql` adds monthly aggregates; missing storage must fail before any archival deletes.
- `migrations/0003-portfolio-assistant.sql` adds assistant knowledge. Applying shared pending migrations may change that schema/data too; scope approval accordingly.

For this installation, use the actual migration filenames listed in the repository. After explicit authorization for the pending remote changes and Worker deployment:

```powershell
npx wrangler d1 migrations apply ANALYTICS_DB --remote --config cloudflare/wrangler.analytics.jsonc
npx wrangler deploy --config cloudflare/wrangler.analytics.jsonc
```

Static publication and the security Worker remain separate. Preserve existing variables, database binding, Worker name and cron. Do not overwrite the existing database or change Firebase rules to enable analytics.

## Verify the activated service

1. Check the traffic endpoint, `/usage?days=7` and `/usage?days=all` independently. Expect meaningful 200 reports when configured; distinguish real empty periods from 502/503 failures. GraphQL has its own upstream timeout budget.
2. Verify a normal authorized production interaction appears after the five-minute report cache expires. Avoid generating live visitor records during routine local tests.
3. Confirm DNT/GPC produces no custom collection while public reports remain readable. Check focus/idle timing behavior using the [analytics guide](../docs/features/analytics.md).
4. Confirm the retention cron: keep the most recent 90 UTC dates in daily storage, atomically archive older counts into monthly totals, and retain monthly totals. Never discard daily rows on a failed archive. All Time cannot recover history deleted before this implementation.
5. Review actual account usage/quotas in Cloudflare before capacity changes. Historical Free-plan limits are dated evidence, not a current entitlement or guarantee against abuse.
6. Record date, service/version, migrations applied, checked endpoints and limits in [status](../docs/status.md).

Run `analytics-worker`, `analytics-cache`, `usage-analytics`, `usage-tracker`, `engagement-tracker`, `visitor-panel` and `privacy` tests as relevant. These do not establish live configuration or trusted human activity. Origin validation is not authentication against non-browser clients; review the dated [abuse findings](../docs/history/security-review-2026-11-11.md) before related work.

Firebase presence is a separate service: use [availability/presence](../docs/features/availability.md) and the [Firebase runbook](../docs/operations/firebase.md). Earlier presence permission failures do not describe this Worker's current health.
