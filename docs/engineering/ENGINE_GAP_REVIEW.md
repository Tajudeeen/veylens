# Veylens engine gap review

Reviewed 2026-11-24 against main commit caaa890afbd519f1b83178079b47a421416884e7. Source inspection only, not a runtime test or security audit.

## Current foundations
- src/engine.ts runs four deterministic rules: refund address reuse, unjustified unshielded hop, timing correlation and turnstile exposure.
- src/evidence.ts validates provider quote/status inputs and checks pinned quote signatures through the 1Click SDK.
- src/zcashEvidence.ts decodes raw transactions, checks supplied IDs against decoded transaction IDs, and records facts with explicit trust labels and evidence gaps.
- src/case.ts combines provider context, raw transactions, observations, collector receipts, wallet exports and optional block-inclusion proofs.
- src/attest.ts recomputes the canonical report hash and verifies the Ed25519 signature.
- src/legacy contains frozen case/report review implementations. Existing release docs state that older case-review formats remain replayable.
- test/engine.test.ts explicitly prevents a privacy pass when evidence is incomplete, including the no-finding case.

## Gaps to investigate before implementation
1. Relationship model: Evidence.facts is currently a flat list of { path, value, trust } records plus a gaps list. The product direction calls for source-labelled relationships between events and claims. Verify whether current UI assembly preserves enough provenance to trace each displayed relationship back to its source record.
2. Trust vocabulary: trust strings are free-form at the type level. Review every producer and consumer for spelling drift or inconsistent meaning before introducing a closed enum.
3. Coverage semantics: the current evidence type declares coverage as incomplete. This is conservative, but cannot yet communicate which dimensions were covered, which were not attempted, or why a case is incomplete.
4. Freshness and temporal context: ZecBlock's API envelope exposes network, indexed height, source observation and freshness. Veylens records source observations in several paths, but a consistent per-source freshness contract needs to be mapped before it is promised in the UI.
5. Claim provenance: report findings identify event IDs, but the engine audit must confirm that every finding can be traced to the exact raw/provider/collector evidence and the rule version that produced it.
6. Replay compatibility: any schema or trust-model change must retain frozen legacy readers and prove that existing signed reports still verify.

## Proposed next implementation, pending M1 traceability
Introduce a versioned evidence-relationship representation only if the audit confirms the flat facts model limits real reviewer tasks. A candidate edge should carry:
- stable edge ID and relationship type;
- source record references and source/network identity;
- relation basis, such as raw-byte decode, provider-signed field, collector observation, chain inclusion check, user assertion or heuristic;
- trust state, including verified, observed, asserted, inferred, ambiguous, missing and contradicted where applicable;
- relevant time/height and freshness metadata when the source supplies them;
- explicit limitations and the rule/finding that consumes the relationship.

Do not infer shielded recipients, wallet ownership or canonical consensus from public transaction bytes, collector signatures or a Merkle path under a supplied header.

## Required verification before release
- Unit tests for every relationship type and trust transition.
- Adversarial tests for mismatched source IDs, network mismatch, stale source data, conflicting claims, malformed timestamps and unsupported proof scope.
- Deterministic replay test across export/import.
- Regression tests for all frozen legacy report formats and existing signed reports.
- UI tests that ensure unknown, missing and ambiguous states never render as verified.

## Scope decision
Do not add a global privacy score, population-wide linkage graph, explorer pages or another NEAR Intents flow dashboard. ZecBlock already has substantial surface area in those categories. Veylens should strengthen case-level evidence quality and replay first.
