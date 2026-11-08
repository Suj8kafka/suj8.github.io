The right-hand visitor panel fetches aggregate metrics from:
https://nameless-truth-99f0.sujeetkhadka00001.workers.dev

The endpoint returned HTTP 503 during verification. The Worker source returns
this status when its API token or zone ID is missing. Set both in the Cloudflare
dashboard under Workers & Pages > nameless-truth-99f0 > Settings > Variables and
Secrets:

- `CLOUDFLARE_API_TOKEN`: an encrypted secret with Zone > Analytics > Read,
  restricted to the `sujeetkhadka.com.np` zone.
- `CLOUDFLARE_ZONE_TAG`: that zone's ID, available on its Overview page.
- `SITE_HOSTNAME`: `www.sujeetkhadka.com.np` (already in the Wrangler config).

Keep the API token in Worker secrets. The public site needs only the endpoint URL.

Deploy the updated analytics Worker using an authenticated Cloudflare account:

```powershell
npx wrangler deploy --config cloudflare/wrangler.analytics.jsonc
```

This is separate from the security-header Worker. It returns requests, visits,
top paths, top countries and a timestamp for the last 24 hours. Queries are
restricted to the configured hostname. Visits are not unique visitors and are
separate from Firebase's current anonymous connections. Cloudflare may sample
these metrics; the sidebar labels them as traffic estimates.

The sidebar fetches when opened, offers Refresh analytics, and caches successful
responses for five minutes. Configuration and network errors remain visible
instead of displaying misleading zero counts. A refreshed panel may use the
Worker's five-minute cache.

Firebase live presence is independent of this endpoint. Each page uses a separate
anonymous in-memory identity, queues its own disconnect cleanup, and sends cursor
positions at most ten times per second. Cursor coordinates are relative to page
sections; fields and precise screen positions from inputs are not shared.
Reduced-motion users do not send or see cursors. The checkbox in the sidebar
also disables sending and displaying cursors. Tabs keep their visitor record
when hidden, while their cursors disappear. Only a page's own record is deleted
on exit; stale peers are filtered locally. Browsers may suspend background tabs,
so presence is approximate rather than a guarantee that someone is looking.
Remote cursors fade to 30% opacity after three seconds without movement and are
hidden after five seconds. Movement restores full opacity; heartbeats do not
reset the idle timer.

Live verification found that Firebase anonymous sign-in succeeds but presence
writes return HTTP 401. The two temporary test accounts and records were cleaned
up. Publishing the JavaScript alone cannot resolve a database permission failure.
The local database rules in `database.rules.json` allow authenticated reads and
only owner writes under `presence`, including the new cursor fields. They also
correct the initial increment of country visit counters. Review these against
the deployed rules, then deploy with an authenticated Firebase account:

```powershell
npx firebase-tools deploy --only database --project sujeet-portfolio
```

The saved Firebase CLI login failed authentication during this session. Run
`npx firebase-tools login --reauth` first if needed, or authorize the Firebase
plugin. Never change the database to public unauthenticated read/write access.

Check the site in two visible browser windows on the same page after publishing.
Move one mouse over a main section: the other window should show its labeled
cursor. Check tab switching, page exit, scroll alignment, the cursor checkbox,
reduced motion and keyboard navigation of the sidebar.

References:
https://firebase.google.com/docs/database/web/offline-capabilities
https://developers.cloudflare.com/analytics/graphql-api/tutorials/end-customer-analytics/
