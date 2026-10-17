> Historical implementation document. See [the current v1.0 contract](12-release-readiness.md) for current capabilities, evidence boundaries and remaining work.

# Zcash integration and submission readiness

## Verified source facts

- TypeScript engine evaluates supplied Flow JSON through four rules.
- SHA-256 and Ed25519 establish report integrity, without authenticating input.
- No librustzcash dependency, Zebra node connection, wallet integration, live
  transaction decoding, or NEAR Intents API calls exist in this release.
- Fixtures use illustrative addresses, timestamps, and some amounts.
- Flow types include an inherited `ironwood` value. Its inclusion is not
  verification of a deployed protocol or upgrade. Protocol-history claims in
  the earlier research require independent primary-source validation.

## Resources and eligibility

The supplied contest excerpt lists Zcash developer docs, ZIPs, librustzcash,
Zebra, a reference wallet, and NEAR Intents as resources. It does not say all
must be integrated. Competition dates, prize pools, and eligibility must be
confirmed with organizers. This repository does not claim confirmed eligibility
or that the build is ready to win.

Official reference locations inspected during this pass:
- https://github.com/zcash/librustzcash
- https://github.com/ZcashFoundation/zebra
- https://docs.near-intents.org/

These references confirm available source/documentation, not use by Veylens.
The historical refund disclosure cited by the original build is a research
lead, not verified transaction evidence. No claim is made that it is still open.

## Required next engineering gate

1. Choose one integration whose real records can be obtained and reconstructed.
2. Define public evidence versus private wallet assertions with provenance.
3. Represent missing or contradictory evidence explicitly.
4. Add a supported importer and insufficient-evidence outcomes.
5. Test independently checkable real records alongside labelled fixtures.
6. Run browser and mobile QA, then map demonstrated behaviour to official rules.

## Current risks

Incomplete records can pass. Refund detection compares supplied address
strings. A user-declared reason can suppress the transparent-hop rule. Timing
is a 120-second heuristic with no anonymity-set or public-observability model.
Number-valued amounts are unsuitable for precise financial accounting. The
self-contained public key does not authenticate the signer. Data-shape
validation does not validate network addresses or transaction existence.

## v0.5.0 superseding implementation status

The initial missing-importer statement above describes v0.4.0. v0.5.0 adds a
1Click quote/status importer and official SDK quote verification. A real signed
dry quote is archived and replayable. The remaining Zcash proof gap is authentic
wallet/transaction evidence and an independently checkable real refund example.

## v0.6.0 superseding implementation status

Raw v4/v5 transaction bytes and node exports can now be imported locally.
Effect-ID checks and transparent-output/prevout relationships are implemented.
Canonical chain anchoring, private wallet ownership and actual cross-chain
refund attribution remain independent proof requirements.
