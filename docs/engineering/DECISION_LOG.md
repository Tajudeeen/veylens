# Decision log

## DEC-001: Engine-first, platform-supported product direction
Date: 2026-11-24. Status: accepted by owner.
Decision: Veylens will be both a reusable evidence/privacy engine and a multi-page investigation platform. The engine is the trust boundary and source of truth; the platform is its human workflow.
Reason: combines developer integration with accessible investigation while avoiding a UI-only product.
Consequences: same deterministic core must serve web and CLI. Platform must not duplicate trust decisions.

## DEC-002: Keep local-first workflow
Date: 2026-11-24. Status: accepted.
Decision: import, analysis, comparison and replay remain local and useful without hosted services.
Reason: case data and transaction identifiers are sensitive.
Consequences: live collection is explicit; team cloud storage is deferred.

## DEC-003: Differentiate from tracing and explorer products
Date: 2026-11-24. Status: accepted as product hypothesis.
Decision: focus on evidence provenance, privacy findings, evidence coverage and independently replayable investigations, not general-purpose chain exploration.
Reason: Where's My Swap already provides extensive NEAR Intents lifecycle/payout tracing; ZecBlock provides Zcash exploration.
Consequence: validate that users value Veylens' evidence-review layer before broadening scope.

## DEC-004: Withdraw unverified ZTrace attribution
Date: 2026-11-24. Status: accepted.
Decision: remove prior unverified attribution to a ZTrace project/author from product research.
Reason: no canonical primary source was verified.
