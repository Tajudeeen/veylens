# User journeys

## A. Local investigation
1 Open empty Workspace.
2 Import provider record and supported raw transactions.
3 Validate schema, network and identifiers.
4 Review event timeline and source/trust labels.
5 Open finding, inspect supporting evidence, rule version and gaps.
6 Export source bundle and signed report.
7 Reviewer opens Verify, checks integrity and replays.
Success: reviewer explains the finding without trusting the original UI.

## B. Explicit live collection
1 Select supported network and transaction identifier.
2 UI discloses collector and upstream source receiving identifier.
3 User confirms.
4 Collector validates, applies shared budget and calls fixed read-only methods.
5 Preserve response and sign receipt if configured.
6 Show source observation separately from chain proof.
7 On outage/rate limit/config error, show failure without synthetic success.
Success: every collected record has source and collection time.

## C. Compare cases
1 Import baseline and candidate.
2 Evaluate each under explicit ruleset versions.
3 Show added, removed and changed findings.
4 Separately compare raw records, authenticated records, proof coverage and gaps.
5 Warn if evidence fell and removed findings are inconclusive.
Success: user distinguishes remediation from missing evidence.

## D. CLI/CI
1 Run CLI on case file.
2 Validate schema/network and run pinned ruleset.
3 Emit JSON with findings, evidence references, coverage and exit code.
4 CI maps configured severity/coverage thresholds to build status.
5 Never publish unredacted evidence by default.
Success: same engine behavior is reproducible locally and in CI.

## E. Maintainer
1 Configure pinned source keys and supported adapters.
2 Smoke-check deployed capabilities/key IDs without exposing secrets.
3 Probe source health with fixed read-only calls.
4 Monitor budgets and source errors without logging transaction IDs.
5 Rotate keys verifier-first and preserve historical verification.
Success: operational failure cannot silently downgrade trust.
