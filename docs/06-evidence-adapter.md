> Historical implementation document. See [the current v1.0 contract](12-release-readiness.md) for current capabilities, evidence boundaries and remaining work.

# Evidence adapter, v0.5.0

## Supported input and trust boundaries

The local importer accepts native Zcash-origin 1Click quote and status JSON.
An optional `veylens-evidence/1` wrapper adds declared shielding-source addresses.
Only `nep141:zec.omft.near` is supported as the origin asset. Wallet observations,
Zcash node responses and explorer-array exports are not yet supported.

The official SDK 0.1.26 verifies its signed quote subset against its embedded
manager key. The application never accepts a replacement key from input.
Only supported covered fields get `provider-signed` labels. Correlation IDs,
outer status, status timestamp, refunded amounts, transaction hashes, wallet
context, and omitted SDK signature fields are not authenticated by that signature.
A valid signature remains valid after a quote expires, but expiry is recorded
as a gap. Imported records can be replayed and are not live status checks.

Addresses are compared as supplied strings. A transparent address prefix is a
configuration warning, not checksum or receiver verification. A Unified Address
is not assumed shielded. INTENTS routing does not establish shielded Zcash
refund delivery. No shielding-source event or actual refund transaction is
synthesized from provider configuration.

## Outcomes

- A declared source address equal to a configured transparent origin-chain
  refund address produces a high configuration-risk finding. The assertion
  boundary is stated in the finding.
- Other supported records return insufficient evidence, retaining warnings.
- Empty and otherwise unmatched declared flows also return insufficient evidence.
- Invalid shapes and unsupported assets return input errors.

No current outcome certifies full-flow privacy. The CLI exits 1 for high risks,
3 for insufficient evidence, and 2 for invalid input.

## Integrity and independent replay

Input digests cover canonical parsed JSON, not original file bytes. Object key
order is normalized, array order retained. The provider-only digest and context
are separated. Metadata is signed with the report; legacy reports remain
verifiable without new metadata.

`verify-input` and the browser source verifier compare the original input digest
and re-run supported analysis at the original generation time. They detect a
re-signed report carrying false provenance or suppressed findings. They do not
turn provider reports or user assertions into independently verified chain facts.

## Evidence captured

On 12 October 2026 the public token endpoint identified native Zcash as
`nep141:zec.omft.near`. A real dry quote to Ethereum was obtained using public
dummy addresses, verified with the pinned SDK manager key, and stored unchanged
in the fixture. A second capture using the shipped script also succeeded.
Neither request created a deposit address or executed a transaction.

## Sources inspected

- https://docs.near-intents.org/api-reference/oneclick/check-swap-execution-status
- https://docs.near-intents.org/integration/distribution-channels/1click-api/verify-quote-signature
- SDK implementation: https://github.com/defuse-protocol/one-click-sdk-typescript
- Installed SDK 0.1.26 quoteHash and verifyQuoteSignature implementation.

The documentation describes quote payload verification. Inspecting the SDK is
necessary to see the actual signed subset. The outer execution-status fields
are not included in that signed subset.

## Remaining proof gate

A real wallet/refund record and independent Zcash transaction verification are
still required to demonstrate an actual on-chain privacy failure. Explorer
history documentation requires an API credential; none was available for this
pass. No fictional transaction hash is presented as independently verified.
