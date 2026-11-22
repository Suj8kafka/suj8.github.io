# Publication and service deployment

Read only for release preparation or authorized live work. [Task index](../README.md) · [Recorded status](../status.md)

## Release boundaries

GitHub Pages serves static source directly; there is no application build. Pushing a reviewed commit to the publishing branch and activating a Worker are separate operations. Obtain authorization before publication, remote database migrations, live Firebase changes, owner-access changes or DNS edits. Authorization for one service does not imply authorization for all services.

Before a release: inspect the working tree, scope the diff, run relevant/full Node tests, check generated assets and cache versions, and prepare a concrete reviewable change. Preserve unrelated files, `CNAME` and the GitHub Pages origin. Never include the untracked source checkout or credentials incidentally. After an authorized push, record its commit; check Pages completion and public responses before calling the release live.

## Independent Workers

Commands below run from the repository root in an authenticated Wrangler environment, **after authorization**. No package installation is needed for static development/tests; Wrangler is separate operational tooling.

| Service | Config | Role and runbook |
| --- | --- | --- |
| Analytics | `cloudflare/wrangler.analytics.jsonc` | `analytics-worker.js`, traffic GraphQL and D1 usage; [analytics runbook](../../cloudflare/ANALYTICS.md) |
| Portfolio assistant | `cloudflare/wrangler.assistant.jsonc` | `portfolio-assistant.js`, Workers AI and the existing D1 database; procedure below |
| Security and caching | `cloudflare/wrangler.security.jsonc` | `security-headers.mjs`, apex/www edge routes; [security runbook](../../cloudflare/SECURITY.md) |
| Old-blog redirect | `cloudflare/wrangler.blog-redirect.jsonc` | `blog-redirect.mjs`, only `blog.sujeetkhadka.com.np/*`; procedure below |

Deployment command shape: `npx wrangler deploy --config <the-reviewed-config>`. Select only the service in scope. Do not run all four deployments as a routine release.

## Assistant activation or update

Read [assistant behavior](../features/assistant.md) first. Reuse the configured `portfolio-usage` database; inspect remote migration state before applying changes. `PORTFOLIO_DB` and analytics' `ANALYTICS_DB` refer to that same database, and both configs use the shared migration directory. Review all pending migrations, not only their filenames.

1. Confirm the expected Worker URL, production origin, AI binding/model, rate-limit namespace and D1 binding. Keep homepage `data-endpoint` and security CSP `connect-src` aligned with the actual returned URL.
2. After approval for the remote schema/data changes, apply the additive migration:

   ```powershell
   npx wrangler d1 migrations apply PORTFOLIO_DB --remote --config cloudflare/wrangler.assistant.jsonc
   ```

3. Deploy the dedicated Worker:

   ```powershell
   npx wrangler deploy --config cloudflare/wrangler.assistant.jsonc
   ```

4. Check `GET /health` returns `{"status":"ok"}`; separately test allowed/rejected origins, on-topic, off-topic and unavailable-information questions. Health alone does not establish successful AI retrieval/responses.
5. If CSP changed, deploy the separately approved security update and verify the exact endpoint is permitted. Publish matching static files, then check desktop/mobile focus, portrait flip, reduced motion, trusted links, rate-limit and quota/service errors.

Use config values as the source of truth. A local test run does not verify account quota, namespace availability, remote migration state or production routing.

## Old-blog cutover

Read [the blog guide](../features/blog.md). Check the current Cloudflare routes, redirects, DNS/proxy/TLS and existing blog hosting before applying the scoped route. Keep the old domain/TLS working.

1. Verify the maintained notebook and all seven mapped articles return 200 with correct content and www canonicals. Do not redirect traffic to missing destinations.
2. After cutover authorization:

   ```powershell
   npx wrangler deploy --config cloudflare/wrangler.blog-redirect.jsonc
   ```

3. Verify the old homepage, all legacy article variants and original asset/download URLs reach their corresponding final URLs. Check query preservation, no redirect loops/chains, crawlable old robots/sitemap and a real 404 for unknown old paths.
4. Retain permanent redirects long term and monitor both properties in Search Console; do not remove the old host immediately after cutover.

## Completion record

Update only relevant rows in [status](../status.md): date, commit/deployment scope, URLs/operations checked and unresolved limitations. A push, local CSP test, successful migration or health endpoint proves only its own step. Firebase setup is covered separately by [the Firebase runbook](firebase.md).
