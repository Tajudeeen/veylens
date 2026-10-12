# Veylens

A privacy-leak auditor for Zcash shielded cross-chain transaction flows.

Veylens reviews a supplied description of a Zcash cross-chain flow for
four privacy risk patterns. It produces findings, an event timeline, and
an optionally signed report. Signing establishes report integrity, not
transaction authenticity or a guarantee of privacy.

Version 0.6.0 separates the landing page, audit workspace, independent
report verifier, and methodology into real HTML documents. The historical
refund example is a reconstruction, not captured chain evidence.

## What it checks

| Rule | Severity | What it catches |
|---|---|---|
| `refund-address-reuse` | high | An unshielded refund repeats an address that previously funded a shield in the supplied flow. |
| `unjustified-unshielded-hop` | medium | Value drops out of the shielded pool mid-flow with no declared reason, when it could plausibly have stayed shielded through to settlement. |
| `timing-correlation` | medium | An intent and settlement fall inside a configurable time window. This is a heuristic signal, without proof of public observability or identification. |
| `turnstile-exposure` | info | A supplied migration has its turnstile flag enabled. The tool does not independently decode the migration. |

Full rationale for each rule, including the academic prior art on
timing/amount fingerprinting attacks against Zcash, is in
[`docs/01-ideation.md`](docs/01-ideation.md). Full data model and
attestation design is in [`docs/02-architecture.md`](docs/02-architecture.md).

## What it is not

- Not a formal proof of privacy. It catches four named, documented leak
  patterns, not every possible deanonymization vector. Every report it
  produces says so explicitly.
- Not a bridge, wallet, or custody system. It never holds funds, and
  never needs network access - it audits a structured description of a
  flow, not a live transaction.
- Not a compliance/AML tool. Scope is privacy-leak detection, not
  sanctions or Travel Rule screening - that's already a crowded,
  separate category (see Omni-Compliance Guard, Agentic Compliance
  Bridge on Chainlink CCIP).

## Install

```
npm install
npm test
```

151 tests. The official 1Click SDK is pinned at 0.1.26 for provider quote
signature verification. The decoder also pins @noble/hashes 1.8.0 and @scure/base 1.2.6. The SDK adds cryptographic and HTTP dependencies, although
the browser application performs no network operations. The lockfile records
the resolved dependency tree. TypeScript, esbuild and jsdom are development tools.

## Web app

```sh
npm ci
npm test
npm run build:web
```

Serve the entire `dist/client` directory over HTTPS for deployment, or localhost
for development. Each page is self-contained, but navigation requires keeping
the files together.

| File | Purpose |
| --- | --- |
| `index.html` | Landing page and skippable session splash |
| `workspace.html` | Flow and 1Click import, signature checks, provenance, signed export |
| `verify.html` | Independent hash and signature verification |
| `methodology.html` | Rule scope, Zcash integration status, evidence limits |
| `standalone.html` | Legacy single-file application retained for compatibility |

The landing CTA opens the workspace. The signed API example is a real dry
quote with dummy addresses. The declared-reuse and alternative-route examples
are illustrative, and clearly distinct from actual transaction evidence. `workspace.html?example=leak` and
`workspace.html?example=clean` preload labelled fixtures without running an
audit or placing private input in the URL. Changing input clears stale results.

Analysis and verification run locally. Each document's CSP denies network
access and pins its inline script by SHA-256. Ordinary page navigation reaches
the hosting service. Signing and verification require WebCrypto Ed25519 support.
If signing is unavailable, the audit still renders with an explanation.

Mobile navigation is available through a Menu disclosure. Inputs use 16px text,
buttons have 44px or larger targets, and layouts include safe-area padding.
Real device layout testing remains outstanding in this environment.

See [`docs/04-web-app.md`](docs/04-web-app.md) and
[`docs/05-zcash-readiness.md`](docs/05-zcash-readiness.md).

## Usage

Audit a flow:

```
npm run build
node dist/src/cli.js audit path/to/flow.json
```

This prints a human-readable report, writes a signed JSON report next
to the input file, and exits 1 for a high-severity risk, 3 for insufficient evidence,
or 2 for invalid input. Missing evidence never returns a successful privacy pass.

Verify a report independently, without re-running the audit:

```
node dist/src/cli.js verify path/to/flow.signed-report.json
```

Generate a persistent signing key instead of the default one-off key
per run:

```
node dist/src/cli.js keygen ./keys
node dist/src/cli.js audit flow.json --key ./keys/veylens-private.pem
```

Machine-readable output:

```
node dist/src/cli.js audit flow.json --json
```

Standalone HTML report, next to the JSON:

```
node dist/src/cli.js audit flow.json --html
node dist/src/cli.js report flow.signed-report.json --out report.html   # from an existing report
```

The HTML file is a single self-contained page. It loads nothing from the
network, its Content-Security-Policy is pinned to the hash of its own
inline script, and all flow data is HTML-escaped (flow files are
untrusted input). A "Verify signature in this browser" button recomputes
the report hash and checks the Ed25519 signature with the browser's own
WebCrypto, so a reader can confirm a report without installing anything.
Browsers without Ed25519 support get a message pointing to
`veylens verify` instead.

### Try the reconstructed examples

```
npm run audit:demo:leak   # the reconstructed Zashi CrossPay / ZachXBT flow - fails, high severity
npm run audit:demo:clean  # illustrative corrected flow - insufficient evidence
```

The leak fixture is a reconstruction of the disclosed case, not a
capture of live chain data. Two values come straight from ZachXBT's
thread as reported (Cryptopolitan, Oct 21 2025): the 0.005 ETH CrossPay
payout and the 0.001598 ZEC refund sent back to the original shielding
address. The shielded amount (1 ZEC), the intent amount, the addresses,
and the second-level timing offsets are illustrative, since his test
started from 1 SOL bridged to ZEC and the exact on-chain figures aren't
in the public write-ups I could verify. The clean fixture is the same
shape with the fix ECC committed to applied (ephemeral address, shielded
refund). Running both side by side shows the tool separating the two
cases. Replacing the illustrative values with real transaction data is a
good first step for anyone who wants to extend it.

## Branding

Veylens uses the Zcash palette throughout: Zcash black `#231F20` and
Zcash yellow `#F4B728`.

- Terminal output uses the yellow for the title, the result, and
  high/medium findings. It turns itself off when output is piped, and
  honors `NO_COLOR`. `FORCE_COLOR=1` forces it on.
- The HTML report is black with yellow carrying the weight: a solid
  yellow card for high-severity findings, a yellow outline for medium,
  a quiet grey outline for info. Severity is always written out as text
  too, never color alone.

Only the palette is used. The Zcash logo is a trademarked mark and is
not reproduced anywhere in this project, and no official brand
typeface is claimed. Veylens is an unofficial tool and is not
affiliated with or endorsed by the Zcash project or its trademark
holders.

## Flow format

A `Flow` is an ordered list of typed events: `shield`, `unshield`,
`intent_submit`, `settlement`, `refund`, `migrate`. See
[`src/types.ts`](src/types.ts) for the full schema and
[`test/fixtures/`](test/fixtures/) for worked examples.

## Evidence importer

Paste or open the original 1Click `QuoteResponse` or `GetExecutionStatusResponse`
in the workspace. Native Zcash-origin records use `nep141:zec.omft.near`.
Amounts remain integer strings. The importer does not invent transaction events
from quote timestamps, estimated durations, or status update times.

The official SDK verifies signed quote fields against its pinned manager key.
Only covered fields receive `provider-signed` labels. The outer status, refund
amount, and transaction hashes remain unverified provider reports. Optional
shielding-source context is a user assertion. It never becomes wallet evidence.

To supply that context, wrap the original provider record:

```json
{
  "format": "veylens-evidence/1",
  "provider": "Replace this string with the original quote or status object",
  "context": { "shieldingSourceAddresses": ["your-declared-source-address"] }
}
```

Reports include canonical input digests, provenance labels, missing evidence,
and the analysis scope. All evidence metadata is covered by the report signature.
Report verification checks integrity. Source verification additionally compares
the original evidence digest and re-runs the supported analysis:

```sh
node dist/src/cli.js verify-input original-record.json report.signed-report.json
```

The separate browser verifier offers the same source check. A re-signed report
with false provenance can pass integrity verification but fails source re-analysis.

### Reproduce authentic provider input

```sh
npm run evidence:capture -- /tmp/fresh-quote.json
node dist/src/cli.js audit /tmp/fresh-quote.json --json
```

The capture script uses public dummy inputs and `dry: true`, verifies the provider
signature, rejects responses containing a deposit address, and executes no
transaction. Availability of the external API can change. The archived signed
quote in `test/fixtures/evidence/oneclick-live-dry-quote.json` works offline.
A dry quote proves provider-authenticated configuration, not an on-chain refund.

## Zcash raw transaction evidence

The workspace's “Inspect mainnet transaction” example contains a historical
mainnet v4 transaction fetched from ZecBlock. Its ID and exact public outputs
are independently reproduced from raw bytes. It is not a known refund or leak.

Paste a node `getrawtransaction` JSON export, choose its network in the advanced
import section, and use Wrap node JSON. Alternatively import a bundle:

```json
{
  "format": "veylens-zcash-evidence/1",
  "network": "mainnet",
  "transactions": [{ "txid": "64-character transaction ID", "hex": "raw transaction bytes" }]
}
```

For reuse analysis, include the shielding transaction, its input previous-output
transactions, and the declared refund transaction. Set `shieldingTxid`,
`refundTxid`, and a checksum-valid transparent `refundTo`. The report checks
public address relationships while preserving the unverified role/ownership
boundary. An optional `provider` record associates quote configuration, without
turning unsigned status or transaction attribution into authenticated evidence.

Version 5 effect IDs exclude authorizing data. The separate `authDigestBytes`
field can constrain its computed ZIP-244 fingerprint when a trusted reference
is available. This does not validate spending signatures or shielded proofs.
Unsupported formats fail explicitly. No v6 or Ironwood support is claimed.

```sh
npm run zcash:capture -- PUBLIC_MAINNET_TXID /tmp/transaction-evidence.json
node dist/src/cli.js audit /tmp/transaction-evidence.json --json
```

Capture is read-only. The public explorer sees the requested transaction ID.
The application itself stays offline. See [`docs/08-zcash-evidence.md`](docs/08-zcash-evidence.md).

## Status

Intended for Zecathon Core and Tooling. The host brief and independently verified
functionality should be reviewed together before submission.

Implemented: quote/status import, pinned-key quote verification, conservative
refund-configuration findings, provenance, incomplete-evidence outcomes,
report integrity and independent source re-analysis.

Implemented in v0.6.0: raw Zcash v4/v5 decoding, transaction effect IDs, ZIP-244
authorization fingerprints, P2PKH/P2SH transparent address checks, previous-output
relationships, and explicit-network node-export import.

Remaining: independent canonical-chain anchoring, shielded receiver decoding,
wallet ownership, an attributed real refund walkthrough, and real-browser/device QA.
No Zebra or librustzcash integration is claimed. The legacy Flow path retains
its four rules but cannot produce a privacy pass without authentic evidence.
A declared source match is a configuration risk, not proof of on-chain leakage.

See [`docs/06-evidence-adapter.md`](docs/06-evidence-adapter.md) and
[`docs/07-judge-walkthrough.md`](docs/07-judge-walkthrough.md).

## License
MIT.

### Working environment, v0.7

The workspace now starts empty and collects real 1Click status or Zcash mainnet
raw records through a bounded same-origin Worker. Examples live on `/demo.html`.
It also inspects Unified Address receivers and z_viewtransaction exports locally.
Risk findings and missing evidence appear separately. Full signed reports support
source replay; a separate redacted summary omits sensitive identifiers.

See [the collection and evidence contract](docs/09-working-product.md) for runtime
configuration, source trust boundaries, unsupported cases and remaining milestones.
