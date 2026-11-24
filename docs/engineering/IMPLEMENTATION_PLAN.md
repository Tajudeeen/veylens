# Implementation plan
Status: proposed. No implementation milestone is complete merely because documentation exists.

## M0 Research and user validation
Tasks: finish source audit for ZecBlock; verify current NEAR/1Click documentation and terms; interview 8-12 target users; run case handoff usability test.
Acceptance: interview evidence captured; user segment and highest-value job selected; no unverified competitor claims.

## M1 Engine and evidence-contract audit
Tasks: map existing modules and schemas; enumerate trust transitions; inspect provider signature coverage; inspect raw transaction decoder boundaries; verify report replay versions; map each rule to required evidence.
Acceptance: traceability matrix links every rule to inputs, evidence classes, gaps and positive/negative/adversarial tests.

## M2 Evidence graph and benchmark
Tasks: define edge types and trust classes; add fixture corpus for valid, invalid, ambiguous, missing and conflicting evidence; measure false-positive/false-negative rates on labelled fixtures.
Acceptance: no unsupported edge becomes proven; benchmark reproducible from a clean checkout.

## M3 CLI/CI product surface
Tasks: stabilize CLI JSON schema and exit codes; add CI example; pin engine/ruleset versions; publish usage docs.
Acceptance: external test repo runs a fixture and receives deterministic output; no raw case artifact published by default.

## M4 Platform improvements
Tasks: expose provenance graph and coverage clearly; improve evidence-to-finding navigation; preserve local-first workflow; add reviewer handoff.
Acceptance: target reviewer reproduces a case without maintainer assistance.

## M5 Optional collaboration
Only after demand evidence: define tenant/access model, encryption, retention, deletion, billing and operations. No implementation before architecture/security approval.

## Change control
Use a new branch per milestone. Before code changes inspect working tree, tests, environment and deployment state. Keep each change narrow. Update decision log and docs. Test positive, negative and failure paths. Do not claim deployed until live host confirms.
