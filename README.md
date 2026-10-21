# Veylens

Review Zcash integration refund paths using original provider records and raw
transaction evidence. Detect public address reuse, distinguish checked evidence
from source assertions, and export reports that others can independently replay.

- [Overview](https://veylens-privacy-workspace.deeen-code.chatgpt.site/)
- [Compare cases](https://veylens-privacy-workspace.deeen-code.chatgpt.site/compare.html)
- [Verify reports](https://veylens-privacy-workspace.deeen-code.chatgpt.site/verify.html)
- [Methodology](https://veylens-privacy-workspace.deeen-code.chatgpt.site/methodology.html)
- [Workspace](https://veylens-privacy-workspace.deeen-code.chatgpt.site/workspace.html)
- [Isolated examples](https://veylens-privacy-workspace.deeen-code.chatgpt.site/demo.html)
- [Judge walkthrough](docs/07-judge-walkthrough.md)
- [Real public-testnet experiment](docs/11-testnet-refund-regression.md)
- [Completion and operations checklist](docs/13-finish-checklist.md)
- [Current evidence contract and release verification](docs/12-release-readiness.md)

The existing publication and repository are private. Arrange explicit reviewer
access before relying on either link for submission. Examples contain public test
transactions. The working workspace starts empty and never substitutes fixtures
when an upstream request fails.

## Current release: 1.1.0

| Capability | Implemented behavior |
| --- | --- |
| Combined case | Original 1Click records, up to 20 raw transactions, explicit network and transaction roles |
| Provider authenticity | Official SDK 0.1.26 verifies covered quote fields against its pinned manager key |
| Refund attribution | Requires a signed non-dry quote, terminal REFUNDED status, origin hash membership, exact aggregate amount and receiver match for an automatic transparent candidate |
| Transaction decoding | Historical v4/v5 and NU6.3/NU7 v6, including Ironwood, with effect IDs and authorization fingerprints |
| Public relationship | Follows supplied transparent prevouts to identify a shielding source reused by a declared refund |
| Live collection | Mainnet explorer; public Testnet explorer; optional separate mainnet/testnet full nodes |
| Source authentication | Pinned-key Ed25519 receipts authenticate exact collected bytes and source observations |
| Block inclusion | Portable transaction Merkle path and serialized block-header hash checks; optional full-node collection |
| Wallet context | Transaction-bound local wallet exports, including Ironwood; attachment excludes memos, keys and arbitrary wallet fields |
| Export and replay | Signed report, original source, independent re-analysis, before/after comparison and redacted summary |
| Case continuity | Explicit encrypted snapshots, encrypted file restore, unsaved-case protection and one-time verifier handoff |
| Hosted admission | Persistent shared D1 budgets, fail-closed collection and Retry-After responses |
| Key lifecycle | Signed key IDs, pinned rotation policy, retired/revoked keys and legacy receipt verification |
| Compatibility | Existing case-review/1.1.0 and 1.2.0 reports replay through frozen implementations |

A Merkle path proves membership in a supplied header. A collector receipt proves
what the collector observed. Neither establishes independent chain consensus,
wallet ownership, provider honesty or complete privacy. Wallet exports remain
assertions. Public shielded bytes do not identify the actual recipient.

## Reproduce the build

Node.js 24 is used in CI. Node.js 22 or newer is supported by the application.

```sh
npm ci
npm test
npm run build:web
npm run check:submission
```

`npm test` runs unit, adversarial, real-transaction, source-replay and simulated-DOM
checks. `check:submission` replays the actual public-testnet experiment, verifies
signed reports and checks the generated pages. It does not certify complete
external evidence or reviewer access.

The GitHub workflow additionally installs Chromium and runs desktop and mobile
viewport checks against the bundled Worker:

```sh
npx playwright install --with-deps chromium
npm run test:browser
```

Mobile emulation does not replace physical-device testing. See the completion checklist and release
verification record for what has actually run in each environment.

## Real public-testnet experiment

The collector-vulnerable and collector-corrected case files include pinned-key receipts from the deployed collector. The committed case files contain mined public-Testnet wallet transactions for
funding, shielding, a deliberately reused transparent refund address and a
shielded comparison. The experiment does not execute Zashi or NEAR Intents.
Its refund roles are operator assignments.

1. Import `examples/testnet-refund/collector-vulnerable.case.json` into the workspace.
2. Inspect the high public-source-address-reuse finding and exact refund output.
3. Download the signed report and source evidence. Replay both in Verify report.
4. Import the vulnerable case as a baseline and the corrected case as current.
5. Compare. Reuse disappears, while the corrected result remains insufficient.

To re-fetch actual records read-only, including fresh signed or unsigned source observations:

```sh
npm run capture:case -- \
  --input examples/testnet-refund/vulnerable.case.json \
  --out /tmp/veylens-fresh.capture.json
```

This discloses selected transaction IDs to the named source. It performs no wallet
transaction, trade or deposit. Output creation is exclusive and never overwrites an
existing file. For full-node inclusion proofs, configure the appropriate node and
add `--inclusion`. Imported original provider records are retained; a supplied
providerLookup can refresh the provider status. No provider input is invented.

## Runtime configuration

The Worker serves the client and same-origin API. Static-only hosting supports
local imports and replay but cannot supply the collector API.

| Runtime variable | Purpose |
| --- | --- |
| COLLECTOR_RATE_SECRET | Random server-only HMAC secret for persistent request budgets |
| COLLECTOR_KEY_ID | Active pinned key ID, currently veylens-2026-10 |
| COLLECTOR_SIGNING_KEY | Existing pinned collector's PKCS8 Ed25519 key, as a runtime secret |
| ONECLICK_API_KEY | Optional server-only provider bearer credential |
| ZCASH_MAINNET_RPC_URL / ZCASH_MAINNET_RPC_AUTH | Optional mainnet full node and authorization |
| ZCASH_TESTNET_RPC_URL / ZCASH_TESTNET_RPC_AUTH | Optional testnet full node and authorization |
| TESTNET_SOURCE | Optional `lightwallet` transport for environments with working gRPC egress; default is the HTTP explorer |
| ZEBRA_RPC_URL / ZEBRA_RPC_AUTH / ZEBRA_NETWORK | Legacy single-node configuration; network is mandatory |

No keys or secrets belong in source, browser input, evidence exports or logs.
Without a node, testnet uses `api.testnet.zecblock.com` and mainnet uses ZecBlock.
Full-node inclusion collection requires getrawtransaction, getblock,
getblockheader, getblockchaininfo and getblockhash. These are fixed read-only
methods. Users cannot supply a URL or arbitrary RPC method.

Use Check collection services in the workspace to inspect deployed capabilities.
Live lookups require the disclosure checkbox. Local imports, wallet inspection,
address inspection, analysis and verification stay in the browser. Full source
exports may contain addresses, raw transactions and retained wallet context.
Redacted summaries contain no identifiers and are explicitly non-proof summaries.

## CLI

```sh
node dist/src/cli.js audit case.json --json
node dist/src/cli.js verify case.signed-report.json
node dist/src/cli.js verify-input case.json case.signed-report.json
node dist/src/cli.js audit case.json --html
node dist/src/cli.js keygen ./keys
```

Use the report filename printed by audit. Exit 1 indicates a high finding, 3
indicates insufficient evidence and 2 indicates invalid input. A clean comparison
never becomes a privacy pass merely because a finding disappears.

The legacy declared-Flow format retains four rules: refund-address-reuse,
unjustified-unshielded-hop, timing-correlation and turnstile-exposure. These are
pattern/heuristic checks on declared events. They are distinct from the combined
case's raw-transaction checks.

## Evidence still needed

- An actual, attributed integration refund with original non-dry provider records.
- Authenticated shielded delivery and ownership evidence, beyond wallet assertions.
- Independent consensus validation beyond supplied headers and node observations.
- Physical-device QA and explicit reviewer access.

Veylens is an unofficial privacy debugging tool, not a wallet, bridge, AML product
or privacy certification. Historical version documents are retained for provenance;
the current release contract takes precedence.

## License

MIT. See THIRD_PARTY_NOTICES.md for dependencies and upstream test material.

## Page navigation and intro

The hosted app serves separate documents for Overview, Workspace, Compare, Verify, Demo lab, and Methodology. Each can be opened directly using its `.html` URL or its extensionless route. Mobile users get persistent main-page navigation, with all six destinations in the All pages menu. The demo uses the same navigation and has no live collection controls.

The branded intro appears on the first entry to any page in a tab and on reload. Internal page navigation skips it for the rest of the session. Use Replay intro in the footer or desktop sidebar to show it again. Continue and Escape dismiss it, reduced motion is respected, and navigation stays accessible without JavaScript. Only the intro preference is stored automatically. Explicit verifier handoff temporarily uses session storage for at most two minutes and is consumed on arrival. Optional encrypted snapshots use local storage. Comparison inputs remain in memory.

`npm run dev` builds the Worker and starts a development preview on port 4173 with no runtime credentials. Production collection needs its configured environment. `npm run test:browser` uses a separate loopback port for CI.

Use Save or restore this case for explicit encrypted snapshots and portable encrypted files. Forgotten passphrases cannot be recovered. Open report in verifier transfers the current evidence and signed report within the same tab, then independently verifies them. No source is sent to a server by either operation. See docs/13-finish-checklist.md for limits, key rotation, source probes and remaining external tasks.
