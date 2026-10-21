# Veylens 1.1 handover

The Vercel migration and October 21 review follow-up are recorded in [the deployment guide](15-vercel-deployment.md) and [the claim review](16-review-claims.md). The previous Site remains live until the new protected deployment is checked. Source-code preparation does not establish that cutover has happened.

## Code completed

- Six real documents and direct routes, branded intro and mobile navigation.
- Explicit AES-256-GCM encrypted case snapshots with PBKDF2-SHA256 at 600,000 iterations, independent restore validation, encrypted file export/import, and passphrase clearing. The user chooses whether to save on this device. No automatic evidence storage.
- Before-unload protection for case data changed since its last source export or encrypted snapshot. Browsers control this prompt and may suppress it without prior user interaction.
- One-time, two-minute same-tab verifier handoff. Source and report enter session storage only after the user requests it. The record is consumed on arrival and source replay runs locally. Nothing enters a URL or request body.
- Collector receipt v2 with signed key IDs, release-pinned public trust policy, retired-key compatibility, explicit revocation, and legacy v1 verification.
- Persistent weighted collection budgets using D1 conditional SQL updates. Missing database, identity, salt or failed counter queries stop collection. Local import and verification do not need the collector.
- Mainnet/testnet source probes for network, sync state, canonical tip observation and serialized header hash.
- Deployment smoke-check CLI, key generation CLI and updated judge steps.

## Runtime setup

Sites provisions the logical `DB` binding from the hosting manifest using `"d1": "DB"` and applies the generated, append-only Drizzle migration. This table stores only rate-window HMAC digests, usage and expiry. It stores no raw IP addresses, transaction identifiers or evidence. Expired rows are pruned on subsequent allowed requests. Counters are admission controls, not a substitute for platform DDoS protection.

`COLLECTOR_RATE_SECRET` must be a random secret of at least 32 characters. Keep `COLLECTOR_SIGNING_KEY` unchanged for the existing pinned key. Set `COLLECTOR_KEY_ID=veylens-2026-10`. Other runtime secrets are preserved.

A client gets 120 units per minute, and the deployed collector has a shared 1200-unit budget. Transaction collection costs 1, a node probe 2, an inclusion proof 4 and swap status 5. Identity uses the edge-provided CF-Connecting-IP. Shared gateways/NATs can share a budget. HTTP 429 includes Retry-After. Protection configuration failures return 503. The read-only local capture CLI bypasses this hosted admission layer, remains capped at 20 transactions and never creates a transaction or deposit.

## Node setup still needs infrastructure

Set the matching `ZCASH_MAINNET_RPC_URL` or `ZCASH_TESTNET_RPC_URL` and optional auth secret. Use HTTPS without credentials in the URL. Local CLI nodes may use loopback HTTP. Required RPCs are getrawtransaction, getblock, getblockheader, getblockchaininfo and getblockhash. No arbitrary user URL or method is accepted.

Check configured node in Workspace probes only read-only network/tip metadata. It does not disclose a transaction identifier. A successful probe is a checked node observation, not independent consensus validation. Inclusion collection remains unavailable until a real suitable node is configured.

## Deployment verification

```sh
npm ci
npm test
npm run build:web
npm run check:submission
npm run test:browser
npm run check:deployment -- --url https://your-site --case examples/testnet-refund/collector-vulnerable.case.json
npm run check:deployment -- --url https://your-site --require-node testnet
```

For a private Site, provide `VEYLENS_SITE_TOKEN` through the process environment. Never place it in a URL, command argument, source file or report. A required but missing node exits 3. Failed checks exit nonzero. These commands make read-only requests, and the optional case check discloses its public transaction IDs to the collector and configured source.

## Key rotation procedure

1. Run `npm run collector:keygen -- new-key-id /private/path/new-key.pkcs8`. It creates a new mode-0600 file, refuses overwrite and prints public metadata only. On Windows, also restrict the file's ACL. Keep this file outside the repository.
2. Never reuse a key ID for a different key. Add the public key, status and validity dates to `src/collectorKeys.ts`. Keep old public keys. Deploy the verifier before changing the active runtime signer.
3. Change the runtime private signer and key ID together, then redeploy and run the smoke check. The API checks that the private signer matches the pinned active public key.
4. Mark a stopped key retired and set its final validity date to preserve historical verification. A compromised key should be revoked. Revocation rejects its receipts even when they claim an earlier timestamp. Historical receipts cannot prove they predate a compromise merely by asserting a date.

No key is trusted because a receipt or an API response supplies it. Trust changes require a verifier release.

## External completion tasks

- Obtain an attributed real integration refund with its original non-dry provider records. The committed public-testnet experiment has operator-assigned refund roles.
- Run physical-device QA. Chromium mobile emulation is automated coverage, not a test on the owner's phone.
- Arrange explicit reviewer access to the private Site. The GitHub source is public as checked on October 21, 2026.
- Record the final demo and submit the required materials.

Wallet exports remain assertions. Full chain consensus, shielded delivery and wallet ownership are outside the v1.1 evidence contract. No UI, receipt, health check or passing test upgrades those claims.

The PBKDF2 work factor follows the SHA-256 guidance in the [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#pbkdf2). Native Web Crypto derives the encryption key, and AES-GCM authenticates the encrypted case. This does not certify the implementation or protect a case on an already compromised device.
