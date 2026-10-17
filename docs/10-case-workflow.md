> Historical implementation document. See [the current v1.0 contract](12-release-readiness.md) for current capabilities, evidence boundaries and remaining work.

# Combined case contract, v0.8

`veylens-case/1` contains explicit network, up to 20 raw transaction records, an
optional original 1Click provider record and optional transaction roles. No dates,
amounts or transactions are synthesized from quote fields.

```json
{
  "format": "veylens-case/1",
  "network": "mainnet",
  "transactions": [],
  "provider": "replace with the original quote/status object"
}
```

The example is a schema illustration, not valid audit evidence.

Import provider and raw transaction records through the case controls. Network
conflicts, differing raw bytes for one ID, invalid receivers, out-of-bundle roles,
forged receipts and raw-ID mismatches fail closed. Imports are transactional: a
rejected file does not replace the previously attached case.

Shielding roles are user-selected. The engine independently follows supplied
transparent prevouts and requires net shielded inflow and shielded outputs before
establishing a source-address relationship. Imported bytes don't validate proofs,
spending signatures or canonical-chain inclusion. Raw transaction effects establish
public relationships, not ownership of shielded notes.

Automatic refund candidates require a valid signed non-dry quote, a provider-listed
origin-chain hash, a positive refund amount, and an exact aggregate output match to
a decoded configured refund receiver. The origin hash list contains all origin
transactions, so membership alone is insufficient. Multiple candidates are
ambiguous. Unique matches are provider-reported candidates, never consensus proof.
A manual role is labelled as a user assertion.

Unified Address transparent receivers can be matched to raw public outputs.
Receiver encoding alone doesn't establish shielded delivery. Shielded-only refund
paths stay unresolved without authenticated wallet evidence.

## Collector receipts

The live collector signs source type, request binding, observation time and SHA-256
of exact returned data using Ed25519. Its public verification key is pinned in
source. The private key is a runtime secret, never bundled or committed. Receipt
verification is independent of the browser's one-off report-signing key.

A receipt proves the named Veylens collector observed those data. It doesn't prove
provider honesty, consensus, shared wallet ownership or actual shielded recipients.
Imported unsigned records remain supported with weaker trust labels. A supplied
invalid receipt is rejected rather than downgraded to an unsigned import.

The current public key is pinned per release. Rotation requires retaining historical
verification keys with explicit IDs before changing the signing key. Never silently
replace it and invalidate existing evidence exports.

## Reports and comparison

Case reports bind all original input through a canonical digest. Independent replay
checks receipts, raw IDs, public relationships and findings at the original report
time. Remedies are included in signed metadata. Full source export is separate
from the report and contains addresses and raw records. Redacted summaries remain
explicit non-proof summaries.

A baseline and a corrected case are independently analysed locally. Comparison
shows removed, added and remaining rules. It makes no claim that the correction
was deployed, that both cases have equal coverage or that either is private.

## Captured live inspection evidence

`test/fixtures/cases/collector-mainnet-inspection.json` contains a signed response
captured from the deployed collector on 12 October 2026 for the public historical
mainnet transaction in the walkthrough. Its receipt verifies against the pinned
key, the transaction ID reproduces locally, and case source replay succeeds.
Tampered receipt contents, signatures and network bindings are rejected by tests.
This specimen establishes actual collection and inspection, not a refund or leak.
