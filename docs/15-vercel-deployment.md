# Vercel migration

## Current state (October 26, 2026)

Veylens 1.1.1 is publicly accessible at https://veylens.vercel.app. The six web pages and `/api/capabilities` returned HTTP 200 in the latest checks. The API reports `collectorSigning=true`, `collectorKeyId=veylens-vercel-2026-10`, and `collectionProtection=persistent-budget`. Mainnet and testnet historical transaction collection with independently checked pinned-key receipts succeeded in the [GitHub Actions live network smoke run 40288820275](https://github.com/Tajudeeen/veylens/actions/runs/40288820275). The test ran on commit `75ec1d8d6f98ae39e10d7bee6e60dffa10ed4126`; re-run after material collector changes.

Vercel team `deeencodes` is connected and its Production configuration contains all five required server variables. Sensitive values are not published. The earlier team-access 403 and disabled collector observations below were migration blockers, **now resolved**. Prior private ChatGPT Site records are retained as historical evidence, not as the public judge entry point. Full-node block inclusion is still unconfigured on both networks. Passing collector receipt verification does not imply independent consensus, wallet ownership or authentic provider-refund attribution.

The budget Worker remains at `https://veylens-budget.tajudeenowoeteniyan.workers.dev/admit`. It is an authenticated POST-only service; an unauthenticated GET returning 404 is not a health failure. The successful production signed smoke run exercises the budget admission path. During migration an unsigned request returned 401 and a separately signed synthetic admission succeeded; those old checks are distinct from the current production run.

Historical build-failure and migration information is preserved in the sections below for troubleshooting. Current CI results and proof links in the [README](../README.md) take precedence over historical pass counts and deployment IDs.

## Architecture

- Vercel serves `dist/client`, with the same six documents and extensionless routes.
- The six `api/*.ts` functions call the shared collector implementation on Node.js. No ChatGPT Site proxy is involved.
- Vercel's overwritten `X-Forwarded-For` supplies the client identity. The adapter deletes any incoming `CF-Connecting-IP` value, validates a single IP and only trusts the Vercel header when `VERCEL=1`.
- A dedicated Cloudflare Worker, `veylens-budget`, owns D1 admission writes. It accepts only authenticated `/admit` requests with a per-window HMAC digest, cost and current minute. It receives no raw IP, transaction ID, provider record or user case.
- Each gateway request has a domain-separated HMAC-SHA256 signature. Web Crypto verifies it. Unauthenticated, stale, oversized and malformed requests cannot write counters. The gateway has no arbitrary SQL interface or evidence endpoint.
- The existing atomic SQL enforces shared client and global limits. Denied global admission may consume client budget. Missing configuration, invalid gateway responses and transport/storage errors fail closed. A minute-boundary mismatch may require retrying.

Vercel's stateless instances never persist counters to memory or `/tmp`. D1 remains on the owner's Cloudflare account. This migrates the web application and collector off ChatGPT Sites while keeping a small external durable admission service.

## Provision the budget service

The owner's dedicated D1 database is `veylens-budget`, ID `7538ca7e-a676-47af-85b0-a91ba3bc45ce`, under account `ebfd40fd730d967c3d3e4d32934a6313`. It is separate from the previous Site's database. Its schema contains only `collection_budgets` and its expiry index. See `wrangler.budget.jsonc` for the retained target.

Using the connected Cloudflare API, or an authenticated local Wrangler installation:

1. Apply the append-only SQL in `drizzle/` to that database.
2. Set a new random `BUDGET_GATEWAY_SECRET` of at least 32 characters as a Worker secret. Store the same secret as a sensitive Vercel production variable. Never place it in a config file or shell argument.
3. Deploy `src/server/budgetWorker.ts` using `wrangler.budget.jsonc`. `npm run build:budget` also produces the ESM bundle for the native Cloudflare upload API.
4. Set `BUDGET_GATEWAY_URL` to the confirmed HTTPS Worker endpoint above. If redeploying under a different account/name, confirm its new endpoint before updating Vercel.

This endpoint deliberately returns no unauthenticated health information. An authenticated admission followed by inspection of the budget table verifies the backend. Its operational logs must not include request bodies, signature headers or secrets.

## Vercel configuration

Import `Tajudeeen/veylens` into the owner's team. `vercel.json` selects no framework, runs `npm ci` and `npm run build`, publishes `dist/client`, and sets a 30-second limit for API Functions. Choose Node.js 24. Do not change Git source visibility during import.

Required server-only production variables:

| Variable | Value |
| --- | --- |
| `BUDGET_GATEWAY_URL` | Confirmed budget Worker `/admit` URL |
| `BUDGET_GATEWAY_SECRET` | Shared Worker secret, sensitive |
| `COLLECTOR_RATE_SECRET` | A separate random secret of at least 32 characters, sensitive |
| `COLLECTOR_KEY_ID` | A new unique ID already pinned in the deployed verifier |
| `COLLECTOR_SIGNING_KEY` | Matching PKCS8 Ed25519 private key, sensitive |

The existing Site signer cannot be recovered from its environment metadata. Generate a new Vercel signing key and retain the legacy public key for old receipts. Follow the key rotation order in `13-finish-checklist.md`. Publish the new public trust key in the verifier before using the new private signer. Never use an unregistered ID, silently generate an ephemeral production signer or transfer a Site access token to Vercel.

Optional node/provider variables have the same names and semantics listed in the README. No node endpoint or provider key is invented during migration. Set preview variables deliberately if live preview collection is wanted. Otherwise previews retain local import/replay and return 503 for collection.

## Validation and cutover

```sh
npm ci
npm run check:dependencies
npm test
npm run build:web
npm run build:budget
npm run check:submission
```

CI also exercises desktop and mobile browser flows. A protected Vercel staging deployment still needs its own live HTTP checks. Use the Vercel connector's protected-deployment fetch operation, or authenticated `vercel curl`, without disabling protection. The deployment smoke checker also accepts a Vercel automation bypass secret through `VERCEL_AUTOMATION_BYPASS_SECRET` when configured by the owner.

Confirm all six pages, headers, direct routes, collector key metadata, capabilities, valid and invalid API requests, a shared rate denial, a fresh receipt and independent case replay. A portable source re-fetch intentionally discloses its public identifiers to the new collector and upstream source. Do not retry a previously blocked disclosure check without explicit authorization for that destination and payload.

The README and quick start point to the verified Vercel pages. Production signed historical mainnet and testnet collection is operational as of the October 26 smoke run, though any future outage remains possible. The old private Site is retained solely for historical continuity; export/import encrypted snapshots if migrating stored local browser data. Browser storage belongs to an origin: export encrypted snapshots from the old Site, then import them on Vercel. It will not see the old origin's local or session storage automatically.

## Build-failure repair

The failed deployment used older commit `aea6fcd` with TypeScript-only `npm run build` and a default `public` output directory. The 1.1.1 repair pins Node.js 24, makes `npm run build` produce the web artifacts, keeps `build:core` for TypeScript-only compilation, and declares `dist/client` in `vercel.json`. Build and output settings in that file override dashboard defaults. Redeploy current `main`, rather than redeploying the old failed commit. [CI run 39678495881](https://github.com/Tajudeeen/veylens/actions/runs/39678495881) passed 225 code tests, 20 browser tests and the dependency audit for the repaired source.
