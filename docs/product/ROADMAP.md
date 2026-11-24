# Product roadmap
No calendar promises. Sequence is dependency-based.

## Phase 0 Research and validate
Competitor map, interviews, real-case handoff test, baseline time-to-reproduce and reviewer comprehension. Decide whether CLI-first or platform-first.
Exit: validation thresholds in VALIDATION.md met or direction revised.

## Phase 1 Harden evidence engine
Audit trust-class transitions, schemas, source freshness/disagreement, benchmark corpus, false positives/negatives, replay determinism and compatibility.
Exit: independent reviewer reproduces cases and explains limitations.

## Phase 2 Developer distribution
Stable CLI and JSON schema, CI integration, public SDK/API contract, reproducible package release.
Exit: external developer uses engine in real repository/CI.

## Phase 3 Platform workflow
Improve timeline, provenance graph and handoff. Add annotations/redaction only after privacy review. Add workspace collaboration only after validation.
Exit: repeated use by at least three external teams/reviewers.

## Phase 4 Integration expansion
Add only evidence-backed integrations with contract, fixtures, source-terms review, failure tests and maintainer.
Exit: each adapter meets evidence/replay standard.

Deferred: general explorer, AI verdicts, wallet ownership inference, broad source scanner, multi-chain breadth for its own sake, billing before buyer validation.
