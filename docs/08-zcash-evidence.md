> Historical implementation document. See [the current v1.0 contract](12-release-readiness.md) for current capabilities, evidence boundaries and remaining work.

# Zcash transaction evidence, v0.6.0

## Scope

The application decodes overwintered v4 and ZIP-225 v5 transaction bytes locally.
It checks transaction effects against a supplied ID, derives supported transparent
outputs and exact zatoshi values, and follows included input previous-output
records. It does not validate consensus, spending signatures, shielded proofs,
canonical chain inclusion, confirmations, ownership, or the attribution of a
transaction to a cross-chain refund. No v6, Ironwood, Unified Address decoding,
or private note decryption is claimed.

## Identifier rules

- v4: displayed double-SHA-256 of serialized transaction bytes.
- v5: ZIP-244 personalized BLAKE2b effect-digest tree, covering transparent,
  Sapling and Orchard effects. Authorizing data has a separate digest.
- Displayed txids reverse the raw digest byte order, as expected by RPC/explorers.
- `authDigestBytes` uses raw digest byte order as in the official test vectors.
  It is a fingerprint, not a proof that the authorizing data is valid.

The verifier matches all 10 official ZIP-244 transaction and authorization test
vectors. These vectors contain synthetic data and are not mined transactions.
A historical mainnet v4 transaction independently reproduces its expected ID
and outputs. Mutation tests sample 400 changed bytes across the vectors and
require a changed effects/auth fingerprint or explicit decoding rejection.

## Input format

`veylens-zcash-evidence/1` requires a declared mainnet/testnet network and 1–20
transaction records. Each record contains `txid` and `hex`, and may constrain
`authDigestBytes` for v5. A source observation can record the retrieval URL/time
and reported height, all explicitly unverified by the application.

Optional `refundTxid`, `shieldingTxid`, and `refundTo` designate analysis roles.
Their values do not prove the designated transaction is a refund. The shielding
transaction must show net inflow into a supported shielded pool, with shielded
outputs present, before a source-reuse finding can be emitted. Source addresses
are derived from the included raw input previous-output transactions, not typed
source-address assertions. Missing prevouts remain gaps. A refund which is an
ancestor of shielding cannot demonstrate the later-refund pattern.

Optional `provider` accepts the existing 1Click record importer. Its signature
still covers only the SDK-defined quote subset. Address conflicts are rejected.
A quote match does not authenticate refund delivery or a refund transaction ID.

## Captured mainnet example

Transaction ID:
`43e966e190f8a63dda0add470e9439b2163f3c89a857488b966d6af2ee716851`

ZecBlock reported this transaction in historical mainnet block 3000000. Its raw
bytes were obtained through the documented `/v1/transactions/:txid/raw` endpoint
and its ID reproduced locally. Its transparent outputs are 1,521,526 and
100,000,000 zatoshis. It is an inspection example, not an attributed refund.
A read-only capture script repeated the retrieval and raw-ID check successfully.
The public refunded-swap query used in this pass returned no historical match.

## Privacy and bounds

The browser does not request an RPC endpoint or private wallet key. Node exports
are converted locally with an explicit network choice. The CLI capture script
calls a fixed public HTTPS explorer endpoint and never signs, broadcasts, or
spends. Use a trusted local node export when revealing a queried txid to an
explorer would be undesirable. Exported reports contain public addresses/IDs
and should be reviewed before sharing.

Raw bytes are bounded to 1 MB per transaction, lists to 20 records, and total
application input to 2 MB. CompactSize must be canonical and counts are bounded.
Truncation, duplicate IDs, invalid checksums, wrong-network receivers, mismatched
IDs, unknown versions, and trailing extensions are rejected. The decoder is a
new, limited implementation, not a substitute for a consensus node audit.

## Sources

- https://zips.z.cash/zip-0225
- https://zips.z.cash/zip-0244
- https://zcash.github.io/rpc/getrawtransaction.html
- https://github.com/zcash/zcash-test-vectors/blob/master/zcash_test_vectors/zip_0244.py
- https://zecblock.com/docs

Official vectors are reproduced under their MIT option. See
`test/fixtures/zcash/LICENSE-MIT` and `THIRD_PARTY_NOTICES.md`.
