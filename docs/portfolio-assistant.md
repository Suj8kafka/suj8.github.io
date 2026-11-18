# AI portfolio assistant

## Architecture

The assistant is an optional enhancement to the static homepage:

1. `assets/js/portfolio-assistant.js` sends one question at a time to a dedicated
   Cloudflare Worker. It does not send previous messages.
2. `cloudflare/portfolio-assistant.js` validates the origin, method, content type,
   payload shape and 500-character limit, then applies a 12-requests-per-minute
   Cloudflare rate limit.
3. Obvious off-topic, unknown-personal and prompt/credential requests receive a
   fixed answer without an AI call.
4. For a portfolio question, the Worker reads active rows from
   `portfolio_knowledge` in the existing `portfolio-usage` D1 database, ranks the
   small structured dataset by category, title, keywords and content, and sends at
   most six records to Workers AI.
5. The model receives strict instructions to use only those records. The browser
   renders the answer with `textContent`; link buttons come from trusted D1 fields
   and are independently protocol-checked by the Worker and browser.

There are no embeddings, Vectorize index, agent loop, conversation table, API key
in the browser, or mandatory third-party AI subscription. The configured Workers
AI model is `@cf/google/gemma-4-26b-a4b-it`. Cloudflare currently includes a free
Workers AI allocation; quota exhaustion is shown as a temporary service error.

## Files

- `cloudflare/wrangler.assistant.jsonc`: dedicated Worker, Workers AI, native rate
  limiter and existing D1 bindings.
- `cloudflare/migrations/0003-portfolio-assistant.sql`: additive knowledge table
  and portfolio seed records for the existing D1 database.
- `cloudflare/portfolio-assistant.js`: request validation, retrieval, guardrails,
  model call and error handling.
- `assets/css/portfolio-assistant.css` and `assets/js/portfolio-assistant.js`:
  responsive, keyboard-accessible chat interface.
- `tests/portfolio-assistant-worker.test.mjs` and
  `tests/portfolio-assistant.test.mjs`: backend and integration regressions.

## Local verification

No live AI call is required for the automated suite:

```powershell
node --test tests/portfolio-assistant-worker.test.mjs tests/portfolio-assistant.test.mjs
node --test tests/*.test.mjs
```

Serve the repository root to inspect the interface:

```powershell
.\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1
```

The production Worker rejects localhost origins. For an authenticated Wrangler
development session, temporarily use the `development` environment value without
committing that value to the production configuration. Workers AI local requests
still use the account's live AI allocation.

## Deployment checklist

Publishing the site or Workers and applying a remote D1 migration require explicit
owner authorization. After approval:

1. Confirm `portfolio-assistant` is available as a Worker name and that its
   workers.dev URL will be
   `portfolio-assistant.sujeetkhadka00001.workers.dev`. If Cloudflare returns a
   different URL, update both the homepage `data-endpoint` and the security
   Worker's exact `connect-src` origin before publishing.
2. Confirm rate-limit namespace `2001` is unused by another Worker in this account.
3. Apply the additive migration to the existing database (do not create a new D1
   database):

   ```powershell
   npx wrangler d1 migrations apply PORTFOLIO_DB --remote --config cloudflare/wrangler.assistant.jsonc
   ```

4. Deploy and verify the dedicated assistant Worker:

   ```powershell
   npx wrangler deploy --config cloudflare/wrangler.assistant.jsonc
   ```

   `GET /health` should return `{"status":"ok"}`. Then test allowed and rejected
   origins plus an on-topic, off-topic and unavailable-information question.
5. Deploy the updated security Worker so its CSP permits only the exact assistant
   Worker origin:

   ```powershell
   npx wrangler deploy --config cloudflare/wrangler.security.jsonc
   ```

6. Publish the static site separately and verify desktop/mobile layout, keyboard
   focus, reduced motion, dark mode, response links, 429 handling and AI quota
   errors in production.

Remote migration state, Worker availability, Workers AI quota, rate-limit namespace
availability and production routing have not been changed or verified by the local
implementation.
