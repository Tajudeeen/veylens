# API and engine contract
Status: proposed target contract. Existing endpoints remain authoritative until separately versioned.

## Engine interface
The domain package should expose stable operations equivalent to:
- validateCase(input) -> validation result
- collectEvidence(request, adapterRegistry) -> evidence bundle
- analyzeCase(bundle, rulesetVersion) -> report
- verifyReport(bundle, report, trustPolicy) -> integrity result
- replayCase(bundle, report) -> reproduced report and diff
- compareCases(baseline, candidate) -> findings and coverage delta

These names describe the desired contract, not existing exported functions.

## Output requirements
Every report includes:
- report format and engine version
- ruleset version
- case/network scope
- generated-at metadata
- findings with stable IDs, severity, explanation and evidence references
- coverage state and missing evidence
- provenance summary
- limitations and unsupported checks
- source bundle digest
- signature metadata, if signed

## Trust semantics
The API must not expose a generic verified=true field. Use explicit statuses and scope:
- signatureValid: whether a signature verifies under pinned key
- signedFields: exact fields covered
- sourceObservedAt: collector observation time
- chainInclusion: proof check result and header identity
- consensusStatus: unknown unless a real independent consensus verifier establishes it
- providerStatusTrust: provider-reported unless the outer status itself has a verified signature

## Versioning
- Version case/report schemas independently from rulesets.
- Unknown major versions fail closed.
- Preserve frozen replay implementations for historical formats.
- Additive optional fields require compatibility tests.
- Breaking semantics require new version and migration notes.

## HTTP API
Keep existing endpoints stable. Any new endpoint must specify method, request/response schema, authentication, disclosure, rate budget, idempotency, timeouts, source dependencies and error taxonomy before implementation.

## Error taxonomy
INVALID_INPUT, UNSUPPORTED_VERSION, NETWORK_MISMATCH, SOURCE_UNAVAILABLE, SOURCE_RATE_LIMITED, SOURCE_CONFLICT, SIGNATURE_INVALID, TRUST_KEY_UNKNOWN, PROOF_INVALID, EVIDENCE_INCOMPLETE, BUDGET_DENIED and INTERNAL_ERROR. Errors must not leak secrets or sensitive request payloads.
