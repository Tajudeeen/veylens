# Feature specifications

## F1 Evidence import and validation — Must
User: engineer/reviewer. Entry: Workspace import. Accept documented provider/case/transaction formats. Validate schema, bounds, network and identifiers. Preserve original bytes or canonical source and digest. Reject unsupported versions and conflicting identifiers with field errors. Acceptance: import never upgrades trust class; source can be exported and replayed.

## F2 Provenance ledger — Must
Every fact carries evidence ID, source, observation time, network, trust class, signature/proof state and scope. Distinguish provider-signed quote fields, unsigned outer status, collector-observed bytes, chain-derived data, user assertion and heuristic. Invalid receipts fail closed. UI and JSON semantics must match.

## F3 Flow reconstruction — Must
Assemble provider, NEAR, bridge and Zcash events only where matching keys or explicitly labelled heuristics support the relationship. Missing hop, ambiguity, multiple refunds, chain mismatch, pending receipt and stale indexer remain visible. No heuristic edge may be labelled proven.

## F4 Privacy rules — Must
Run deterministic, versioned rules for public address reuse, transparent refund configuration, unshielded hops and timing correlation only when required inputs exist. Separate declared-flow heuristics from raw-transaction findings. Missing evidence means insufficient coverage, not pass. Each rule has positive, negative and adversarial fixtures.

## F5 Signed report and replay — Must
Export source bundle/report. Verify integrity and replay source through pinned ruleset. Tampering, unknown ruleset, revoked key, unsupported schema and source/report mismatch fail closed. Preserve historical report versions.

## F6 Case comparison — Must
Compare findings and coverage. Incompatible rulesets, networks or reduced source coverage must be explicit. Removed finding never means remediation if evidence fell.

## F7 Live collection — Should
Explicit read-only allowlisted adapters after disclosure. Bounded requests and persistent budgets. Signed receipts when configured. 429, timeout, unavailable signer, budget failure and source disagreement fail closed. Local work remains available.

## F8 CLI/CI — Should
Audit, verify, replay and JSON output use same domain engine. Document stable exit codes. Pinned engine version reproduces output.

## F9 Team workspace — Could
Shared cases, comments, access controls and retention policies only after user validation, threat model, encryption/deletion design and operating budget.
