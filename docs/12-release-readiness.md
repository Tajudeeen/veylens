# Veylens 1.0 evidence and release contract

## What changed

Public testnet collection uses the network-specific HTTP API at api.testnet.zecblock.com. It validates explicit testnet metadata, raw transaction IDs, source-reported mined heights and canonical status. Exact raw records and observations receive separate collector receipts when the signing secret is available. These are source observations, not consensus or Merkle proofs.

The bounded native lightwallet transport at testnet.zec.rocks is retained for the CLI or compatible environments with TESTNET_SOURCE=lightwallet. It checks the reported network and compact-block membership. Direct gRPC returned HTTP 404 from the hosted Worker despite working locally, so the deployed default uses the HTTP-native explorer. No fixture fallback is used.

A case transaction can additionally carry chainProof and chainReceipt. The proof
uses format veylens-block-inclusion/1, explicit network and txid, headerHex,
blockHash, positive height, transactionCount, transactionIndex, siblings,
canonicalBlockHash, tipHash and tipHeight. Hash strings use display order. The
verifier checks Zcash version-4 serialized headers with 1344-byte Equihash solution
encoding, double-SHA256 header hashes, exact Merkle-path depth, odd-node duplication
and source tip consistency. It does not validate the Equihash solution, difficulty,
accumulated chain work, shielded proofs, spending signatures or current consensus.
The supplied height and tip remain source reports even when a path verifies.

The configured-node collector builds proofs from ordered block transaction IDs,
gets the serialized header, checks getblockhash(height), verifies the node-reported
network and signs the complete resulting observation. Imported proofs remain
supported without a collector receipt and retain a weaker trust label. Invalid
receipts are rejected, never silently treated as unsigned.

## Wallet exports

The local inspector supports transparent, Sprout, Sapling, Orchard and Ironwood
pool labels. RPC error responses fail. Optional walletEvidence entries bind an
export to an included txid and the case network. Unsupported pool conflicts with
the decoded transaction are rejected. The UI's attachment path whitelists txid,
pool labels and optional recipient addresses. It excludes memos, seeds, keys and
arbitrary fields. Full evidence supplied directly by a user is still sensitive and
must be reviewed before sharing.

The wallet attachment is a user assertion. It does not authenticate wallet
ownership, decrypt notes, prove shielded delivery or establish a provider refund.
No externally supplied signer key can manufacture trusted wallet provenance.

## Provider attribution

Automatic transparent candidates require all of: native Zcash mainnet origin,
a pinned-key-valid non-dry quote, terminal REFUNDED status, provider-listed origin
hash, exact aggregate positive refund amount and decoded configured receiver.
Multiple candidates stay ambiguous. A selected manual override is labelled as an
assertion. When a provider receipt is supplied, its request must also match the
signed quote's deposit address and memo. Outer status is not signed by the quote.
Even a collector-authenticated observation cannot prove provider honesty.

A real provider refund has not been attributed by this release. The public-testnet
wallet experiment remains separately labelled. No real-money operation is needed
for the executable regression, and none is performed by the capture helper.

## Replay and comparisons

case-review/1.3.0 preserves transaction authorization fingerprints and checks new
proof, observation and wallet attachments. case-review/1.1.0 and case-review/1.2.0 source replay dispatch to frozen implementations so existing exports are not silently invalidated.
Comparison warns about network changes, fewer raw records, fewer authenticated
collector records and fewer Merkle proofs, in addition to new evidence gaps.
A removed finding does not establish equal coverage or deployed remediation.

## Verification commands

```sh
npm ci
npm test
npm run build:web
npm run check:submission
npx playwright test --list
```

The GitHub verification workflow runs the above build and submission checks, then
installs Chromium and executes the browser suite on desktop and Pixel 7 viewports.
It checks real-case imports, signed report downloads, independent source replay,
tampering rejection, comparison, consent, failure handling and viewport overflow.
Its loopback server serves the exact Worker bundle and has no runtime credentials.
No live provider calls run in the browser CI tests.

Local browser QA in this managed workspace is unavailable because the required
control-browser skill is not installed. Desktop and mobile browser execution passed in GitHub Actions run 39007112939 on 17 October 2026, after correcting a test assertion that assumed the order of two removed findings. Do not confuse simulated-DOM checks or
browser-test discovery with browser execution. Record GitHub's actual run result
separately. Physical-device QA remains outstanding.

## Publication and access

The existing Site stays owner-private. The GitHub source stays private. Reviewer
access needs an explicitly chosen audience or named reviewers. No audience change
or external invitation is made by this release. Runtime secret values are preserved.
Check collection services reports the deployed version, sources, signing presence
and node capabilities without exposing secrets.

## Primary implementation references

- https://github.com/zcash/lightwallet-protocol/blob/main/walletrpc/service.proto
- https://github.com/zcash/lightwallet-protocol/blob/main/walletrpc/compact_formats.proto
- https://github.com/zcash/zcash/blob/master/src/primitives/block.h
- https://github.com/zcash/zcash/blob/master/src/primitives/block.cpp
- https://zcash.github.io/rpc/getblock.html
- https://zcash.github.io/rpc/getblockheader.html
- https://playwright.dev/docs/ci-intro
