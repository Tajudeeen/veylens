# Data and storage design
Status: proposed target. Current Veylens case workflow remains local-first.

## Data ownership
- Evidence bundle: user-controlled local file/in-memory object.
- Encrypted snapshot: explicit user action, encrypted client-side before persistence/export.
- Collector budget: Cloudflare D1 stores keyed rate-window digests, usage and expiry only.
- Trust policy: version-controlled verifier policy, not user-supplied evidence.
- Hosted case data: deferred until user validation and threat model approval.

## Logical entities
- Case: case ID, schema version, network, created/updated timestamps, evidence IDs.
- EvidenceRecord: evidence ID, source type, source locator, observed time, raw digest, normalized payload reference, trust class, limitations.
- EvidenceEdge: source/target IDs, relation type, basis, trust class, supporting evidence IDs.
- Finding: stable finding ID, rule ID/version, severity, message, evidence IDs, remediation.
- Report: report schema, engine/ruleset versions, coverage, findings, source digest, signature metadata.
- TrustKey: key ID, public key, status, validity period and revocation state.
- BudgetWindow: HMAC digest, usage, expiry. No raw IP or transaction ID.

## Storage rules
- Do not automatically upload cases.
- Do not store plaintext evidence or passphrases in browser storage.
- Keep encrypted local snapshots opt-in and versioned.
- Do not store provider API secrets in evidence.
- Do not put transaction IDs or addresses in operational logs.
- D1 remains budget-only. Do not turn it into a case database by convenience.

## Future hosted workspaces
Before adding cloud cases, define tenant isolation, access model, key management, encryption at rest/in transit, deletion semantics, export, retention, backups, audit logs, incident response and data residency. Require explicit user approval and a threat review.
