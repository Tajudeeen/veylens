# Vercel migration

## Current state

The application code supports Vercel Node.js Functions and static page delivery. The previous private ChatGPT Site remains the current working deployment. It has not been shut down or redirected. Vercel publication is blocked because the connected account cannot access the owner's `deeencodes` team, ID `team_raaAOk0abaIpiJkNOLg5lS7u`. No Vercel production URL is claimed until an actual deployment is ready and checked.

The dedicated budget Worker is deployed at `https://veylens-budget.tajudeenowoeteniyan.workers.dev/admit`. On October 21, 2026, an unsigned request returned 401, a signed synthetic admission succeeded, and the native D1 query showed its client and global counters. No case identifiers, Site access token or original collector private key were sent in that check. This verifies the admission backend, not the pending Vercel application deployment.

The migration code passed [GitHub verification run 39677625791](https://github.com/Tajudeeen/veylens/actions/runs/39677625791): 225 code tests, 20 desktop/mobile browser tests, both builds, submission checks and a dependency audit with zero reported vulnerabilities. [CodeQL run 39677625712](https://github.com/Tajudeeen/veylens/actions/runs/39677625712) completed and uploaded its analysis results. A completed scan is not an independent security audit or a claim of zero code defects.

Keep the current Site's private audience during staging. Check the team's available deployment protection before promoting a production deployment. Preserve repository visibility, which is public as checked on October 21, 2026. Do not make the existing Site or a Vercel production alias public as a side effect of migration. Authorize a public submission URL separately if desired.

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

Import `Tajudeeen/veylens` into the owner's team. `vercel.json` selects no framework, runs `npm ci` and `npm run build:web`, publishes `dist/client`, and sets a 30-second limit for API Functions. Choose Node.js 24. Do not change Git source visibility during import.

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

Only after those checks pass, replace the active links in README and the quick start with the exact returned Vercel URL. Preserve the old Site as a rollback until cutover is accepted. Browser storage belongs to an origin: export encrypted snapshots from the old Site, then import them on Vercel. It will not see the old origin's local or session storage automatically.
