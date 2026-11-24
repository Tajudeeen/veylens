# Implementation plan
Status: proposed. A research or documentation milestone is not complete merely because documents exist.

## M0 Competitive research and problem validation
Completed desk-research work on 2026-11-24:
- Inspected Where's My Swap source modules and tests for NEAR Intents tracing, decoding, ledger reconstruction and custody.
- Completed a source-level ZecBlock review across privacy routes, linkage scoring, scheduled edge building, API client, risk UI, graph UI, NEAR Intents client and selected tests.
- Reviewed VeilLint's stated scope and limitations.
- Inspected Veylens' current engine, evidence types, case path, signing and engine tests.
- Revised positioning to remove generic ZEC flow, explorer and privacy-dashboard differentiation claims.

Still outstanding:
- 8-12 interviews across at least three target segments.
- A moderated case handoff test with developers/reviewers.
- Confirmation of the highest-frequency job and whether CLI or platform is the preferred entry point.

M0 is desk-research complete, user validation incomplete. Do not claim product-market fit or mark M0 fully complete.

## M1 Engine and evidence-contract audit
Goal: establish a verified map of the current Veylens trust model before changing runtime behavior.

Tasks:
- Map every evidence input from ingestion through validation, fact creation, findings, report signing, export and replay.
- Build a traceability matrix for each rule: required inputs, evidence classes, trust basis, gaps, false-positive conditions, false-negative conditions and tests.
- Review provider quote signature scope, status attribution, collector receipt scope, raw transaction decoding, block inclusion checks, wallet assertions and legacy report dispatch.
- Inspect UI paths that display evidence and gaps. Compare their wording with underlying trust levels.
- Identify compatibility constraints for existing case-review versions and report signatures.

Acceptance:
- Every important claim in a report maps to a source record and a stated verification method.
- No provider assertion, collector observation or supplied header is presented as independent chain consensus.
- Positive, negative, ambiguous, missing and conflicting evidence cases have named tests.
- Existing replay compatibility is preserved by tests.
- A narrow implementation change is selected from observed gaps, not speculative feature ideas.

## M2 Evidence relationship model and benchmark
Candidate direction, pending M1 findings:
- Represent case relationships as typed edges with source references, relation basis, trust class, time/height context, verification status and explicit limitations.
- Preserve a distinction between observed, cryptographically checked, inferred, asserted, ambiguous and missing relationships.
- Add fixtures for valid, invalid, ambiguous, missing, contradictory and stale evidence.
- Measure precision/recall only against labelled fixtures with documented ground truth. Do not publish an accuracy claim from synthetic cases alone.

Acceptance:
- No unsupported edge becomes proven.
- Replaying the same case and ruleset produces deterministic results.
- Benchmarks are reproducible from a clean checkout and disclose fixture composition.

## M3 CLI/CI product surface
Tasks: stabilize CLI JSON schema and exit codes; add a CI example; pin engine/ruleset versions; publish usage docs.
Acceptance: an external test repository can run a fixture and receive deterministic output; no raw case artifact is published by default.

## M4 Platform improvements
Tasks: expose provenance and evidence coverage clearly; improve evidence-to-finding navigation; preserve local-first workflow; add reviewer handoff.
Acceptance: a target reviewer reproduces a case without maintainer assistance.

## M5 Optional collaboration
Only after demand evidence: define tenant/access model, encryption, retention, deletion, billing and operations. No implementation before architecture/security approval.

## Change control
Use a new branch per implementation milestone. Before code changes inspect working tree, tests, environment and deployment state. Keep each change narrow. Update decision log and docs. Test positive, negative and failure paths. Do not claim deployed until the live host confirms it.
