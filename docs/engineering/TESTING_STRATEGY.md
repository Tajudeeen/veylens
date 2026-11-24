# Testing strategy

## Test layers
- Unit: schema validators, canonicalization, decoders, rules, trust policy and coverage calculations.
- Property/fuzz: malformed encodings, integer bounds, transaction byte parsing, duplicate and reordered records.
- Contract: each provider/explorer/RPC adapter against captured sanitized responses and schema drift.
- Integration: collector budget, signing, source failures, replay and report export/import.
- End-to-end: full local case workflow, compare, verifier handoff and CLI.
- Live smoke: read-only mainnet/testnet checks on demand, isolated from deterministic CI.
- Human review: independent reviewer reproduces real case and correctly explains limits.

## Benchmark corpus
For each rule include:
- positive case where finding is justified;
- negative case with similar-looking but benign pattern;
- ambiguous case with missing linkage;
- adversarial case with malformed or conflicting evidence;
- corrected case with comparable evidence coverage.

Label fixture provenance: real public chain, synthetic, or operator-assigned experiment. Never mix those labels.

## Metrics
Track precision and recall only against a labelled, reviewed corpus. Report corpus size, label method, scope and limitations. Do not call a small fixture pass rate real-world accuracy.

## Release gates
- npm ci, npm test, npm run build:web, npm run check:submission.
- Browser suite desktop and mobile viewport.
- CLI audit/verify/replay on committed examples.
- Dependency/security checks.
- Live smoke on a deliberate, read-only sample when relevant.
- Review docs and known limitations.
- Physical-device QA before claiming physical mobile validation.

## Failure handling
CI must test timeout, 429, 5xx, malformed provider responses, invalid signatures, revoked keys, missing D1, source disagreement and missing node configuration. Offline review/replay must still work.
