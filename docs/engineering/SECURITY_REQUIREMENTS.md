# Security and trust requirements

## Threats
- Forged provider status or quote records.
- Malicious or malformed case imports.
- Collector key compromise or incorrect key rotation.
- Source/indexer outage, stale data or conflicting observations.
- Transaction-ID privacy leakage through logs or third-party requests.
- Arbitrary RPC/SSRF through user-controlled endpoints.
- D1 budget bypass or fail-open behavior.
- Tampered report/source pair.
- Misleading UI that upgrades a source assertion to proof.
- Dependency compromise and malicious package scripts.

## Required controls
- Schema validation and strict input bounds at every import/API boundary.
- Pinned public keys and verifier-controlled trust policy.
- Key IDs are immutable. Rotate by publishing verifier trust first, then deploying signer.
- Revoked keys invalidate signatures according to documented policy.
- Verify only fields actually signed by the provider.
- Separate collector receipt, chain inclusion, consensus and ownership claims.
- Fixed network/source/method allowlists. No arbitrary RPC URL or method input.
- Explicit disclosure before sending identifiers to external sources.
- Timeouts, bounded retries, request budgets and fail-closed collector configuration.
- Redact sensitive identifiers from logs, telemetry and support artifacts.
- Keep local analysis/replay available if hosted collection is down.
- Dependency audit, lockfile integrity, reproducible build and release provenance.
- Adversarial tests for malformed encodings, duplicate fields, stale timestamps, wrong network and conflicting sources.

## Privacy requirements
- No wallet seed, private key or viewing key accepted by the case importer.
- Wallet exports are local assertions and should be filtered to minimum required fields.
- Do not persist cases unless the user explicitly saves an encrypted snapshot.
- Warn that transaction identifiers and provider records can reveal activity when sent to a collector.
- Provide redaction preview before any future sharing workflow.
- Deletion and retention requirements must be specified before hosted case storage.

## Security acceptance
A security review must demonstrate that invalid signatures, revoked keys, source mismatch, malformed inputs, wrong-network records, unsupported proof formats and budget failures cannot yield a trusted finding or successful collection state. UI language must reflect the actual proof boundary.
