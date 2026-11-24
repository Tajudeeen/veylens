# Deployment strategy

## Current topology
- Vercel hosts the Veylens web client and API routes.
- Cloudflare Worker provides authenticated admission to Cloudflare D1 shared collection budgets.
- D1 stores only HMAC rate-window digests, usage and expiry, not case evidence.
- Collector signing keys remain server-side and public trust keys remain pinned in the verifier.
- Local import, review, comparison and replay do not depend on hosted collection.

## Environments
- Local: no production secrets required for offline import/replay.
- CI: deterministic fixtures, bundled Worker/browser tests and test-only credentials.
- Preview: no live collection unless explicitly configured with isolated keys and budgets.
- Production: Vercel production environment and dedicated Cloudflare budget service.

## Release procedure
1. Run dependency install, tests, production build, submission checks and browser suite.
2. Review schema/ruleset changes and backward replay compatibility.
3. Deploy verifier trust-policy update before rotating active signer.
4. Deploy application and collector.
5. Run read-only smoke checks for all pages, capabilities, key metadata, budget admission and a historical test case.
6. Independently replay downloaded source/report.
7. Record commit, deployment, checks, known limitations and rollback target.

## Rollback
- Keep previous successful Vercel deployment available.
- Do not roll back trust policy independently of signer state without checking key compatibility.
- D1 budget schema changes must be append-only or have a documented recovery migration.
- If collector fails, disable or reject live collection. Keep local review/replay available.

## Observability
Record request outcome, adapter name, duration, error class, budget denial and release version. Do not log raw transaction IDs, addresses, provider records, secrets or full request bodies. Alert on signature failures, source error spikes, budget backend failure and repeated 429/5xx.
