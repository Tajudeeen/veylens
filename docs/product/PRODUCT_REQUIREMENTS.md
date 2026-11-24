# Product requirements
Status: proposed first product release after 1.1.1.

## Outcome
A developer assembles a bounded Zcash integration investigation, understands the evidence behind each conclusion, and hands another reviewer a case that reproduces the same findings without trusting the original UI.

## Must have
- Import original provider quote/status records and supported Zcash/NEAR evidence.
- Validate schemas, bounds, network and transaction identifiers.
- Show per-fact provenance, trust class, source, timestamp and limitations.
- Reconstruct only relationships supported by evidence contracts.
- Run deterministic, versioned privacy rules.
- Explain findings with evidence references and remediation guidance.
- Show coverage and unresolved gaps separately from risk severity.
- Export original source bundle and signed report.
- Verify integrity and independently replay source evidence.
- Compare cases while warning about changed evidence coverage.
- Work locally without sign-in, cloud persistence or live collection.

## Should have
- Explicit read-only live adapters with disclosure and persistent budgets.
- CLI for audit, verify, replay and JSON output.
- Stable API and CI integration.
- Redacted reviewer summary that is explicitly not proof.
- Source trust policy and outage behavior.

## Could have
- Team workspaces, shared review and comments.
- Watchlists and change alerts.
- Additional integrations.
- Role-specific policy packs.
- Paid managed collection after buyer/cost validation.

## Not now
- Custody, signing or fund movement.
- General Zcash explorer.
- Shielded recipient de-anonymization.
- Wallet ownership claims.
- Broad source-code static scanner.
- AI-generated verdicts.
- AML scoring or privacy certification.

## Business rules
1 Every finding references exact evidence IDs and ruleset version.
2 Every fact carries source and trust classification.
3 Collector signatures authenticate collector-observed bytes, not source truth.
4 Provider signatures cover only fields in the signed payload.
5 User assertions never become authenticated through repetition.
6 Merkle inclusion under a supplied header is not consensus.
7 Missing, conflicting, stale or unsupported evidence cannot produce a clean pass.
8 Comparison shows findings and evidence coverage changes.
9 Historical report formats remain replayable.
10 Live collection requires user action and disclosure.

## Acceptance criteria
- Identical case and ruleset produce deterministic findings.
- Tampered source or invalid signature fails verification.
- Unsigned outer provider status remains provider-reported.
- Missing shielding prevout prevents source-address reuse claims.
- Shielded payout reports pool only, never recipient.
- Reduced evidence coverage makes comparison inconclusive.
- Source outage returns unavailable/unverified, never fixtures.
- Clean environment replays exported case offline.
- Budget/signing failure blocks hosted collection but not local review.

## Quality
No secrets in browser/logs/exports. No automatic evidence upload or save. Bounded inputs/timeouts. Accessible responsive UI. Typed adapters and versioned schemas. Preserve historical report and CLI compatibility.
