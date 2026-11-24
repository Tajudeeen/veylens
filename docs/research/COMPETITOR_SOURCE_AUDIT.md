# Competitor and prior-art source audit

Reviewed 2026-11-24. Focused public-source code review, not a security audit, benchmark reproduction or production-uptime verification.

## Where's My Swap — Cryppit
Repository: https://github.com/cryppit/wheres-my-swap

Inspected README, src/core/trace.ts, src/core/decode.ts, src/core/custody.ts, selected decoder/trace/custody tests and package metadata.

- Pure trace logic joins NEAR Intents activity into typed origin, credit, swap, withdrawal and payout hops.
- Hop statuses distinguish proven, matched, shielded, ambiguous, waiting, missing and unverified states.
- The ledger reconstructs account balances from DIP4 and NEP-245 events. Comments and tests explicitly prevent double counting shadow mt_transfer events when equivalent DIP4 events already describe the movement.
- Failed receipts are ignored when reconstructing successful activity. The decoder normalizes NEAR events and preserves receipt-level errors.
- Custody analysis explains where funds are, who can move them and what action the user can take next.
- Tests cover decoder, trace, custody, route and Zcash-route behavior. The README reports a 337-order audit and 250 destination payout checks. These are project-reported counts, not independently reproduced.

Engineering lessons for Veylens: pure domain functions, typed per-hop states, ledger invariants, receipt-aware failure handling, recorded fixtures and plain-language next-evidence guidance. Do not copy NEAR-specific accounting assumptions without proving they apply to Veylens' sources.

## ZecBlock — Kenbak / Atmosphere Labs
Repository: https://github.com/Kenbak/zecblock
Deployment guide: https://github.com/Kenbak/zecblock/blob/main/DEPLOYMENT.md

Source review included README, deployment architecture, server/api/routes/privacy.js, server/api/privacy-linkage.js, server/jobs/build-privacy-linkage-edges.js, server/lib/privacy-score.js, components/privacy/RiskEvidence.tsx, app/privacy-risks/PrivacyRisksClient.tsx, components/PrivacyLinkGraph.tsx, server/api/near-intents.js and selected privacy/crosslink tests.

### Product overlap
ZecBlock directly overlaps with several broad Veylens positioning claims:
- ZEC cross-chain inflow/outflow tracking through the NEAR Intents Explorer API.
- Privacy-risk analysis for round-trip patterns and batch behavior.
- Transaction-linkage graph visualization and heuristic candidate scoring.
- Turnstile tracking, pool analytics, privacy trends and client-side memo tooling.
- Zcash explorer data for transparent transactions and public chain context.

Veylens must not position itself as the first Zcash privacy dashboard, the first ZEC/NEAR flow viewer or the only tool that surfaces candidate transaction links.

### Architecture and implementation observations
- The documented deployment is a multi-service architecture: Next.js frontend, Express REST/WebSocket API, PostgreSQL, Redis, a separate Rust indexer and Zebra/Zakura node integration. The indexer is a separate repository. The README describes a loopback development adapter that is explicitly not a production API service.
- The API client validates a versioned envelope containing request ID, network, indexed height, source observation and freshness. This is a useful provenance/freshness contract to study.
- Privacy analytics are explicitly mainnet-only in route middleware because the precomputed linkage and batch analytics have no testnet producer.
- Linkage analytics are computed in a separate scheduled job. The job separates read-only computation from writes, uses a bounded candidate limit and removes expired rows. Route comments describe a 90-day TTL for linkage edges.
- The linkage algorithm scores amount similarity, time proximity, amount rarity, roundness, batch size, uniformity, recipient coherence and shield-conservation. It also calculates ambiguity from candidate count and candidate margin. The UI exposes score inputs and explains that the score is not a probability of shared ownership.
- The graph UI explicitly avoids encoding money or certainty through layout distance or line width. Pool nodes are labelled as unobservable, and shielded internal transfers are described as hidden.
- NEAR Intents data is fetched through an authenticated Explorer API client. The client handles missing credentials, 401 and 429 responses and uses an in-memory cache. Do not assume its API key, rate limits or availability are suitable for Veylens.
- Tests exist for privacy score calculation, crosslink behavior, freshness and failure states. The inspected tests demonstrate specific cases, not comprehensive false-positive/false-negative performance.

### What Veylens should learn, and avoid
Learn from explicit source freshness, network identity, API envelopes, bounded background computation, retention cleanup, score-input transparency and visible ambiguity. Keep Veylens' case-level evidence claims separate from ZecBlock's population-level heuristic analytics.

Do not add another global privacy score, public risk leaderboard, pool dashboard, turnstile tracker or generic transaction graph. Those would duplicate existing surface area and would not strengthen Veylens' strongest trust claim.

ZecBlock's own docs state that shielded transfer details are not public and aggregate patterns do not identify users. Its heuristic scores should be treated as leads, not proof.

## VeilLint — esteexbt
Repository: https://github.com/esteexbt/veillint

Inspected README. It describes a local-first heuristic scanner for Zcash application source/config with eleven potential risk classes and JSON export. Its README says it is not AST analysis, runtime analysis, transaction verification or proof of privacy.

Learn from local-first handling, rule explanations and explicit false-positive/negative limitations. Do not merge source scanning into Veylens' transaction evidence engine without user demand evidence.

## Veylens baseline inspected
Repository: https://github.com/Tajudeeen/veylens
Baseline branch: main, commit caaa890afbd519f1b83178079b47a421416884e7, inspected 2026-11-24.

- Existing engine has four default rules: refund address reuse, unjustified unshielded hop, timing correlation and turnstile exposure.
- The core evidence model records a flat list of facts with trust labels and a list of gaps. Its declared coverage is currently incomplete.
- The case path validates explicit network, raw transaction IDs against decoded bytes, optional authorization fingerprints, provider quote evidence, observations, receipts and optional inclusion proofs.
- Signed reports are re-hashed and re-verified rather than trusting the embedded report hash.
- The engine's overall result is deliberately conservative. A high finding fails, while absence of a finding does not become a privacy pass when evidence is incomplete.
- Tests cover this insufficient-evidence behavior, deterministic report fields and rule aggregation. Existing release docs describe frozen replay paths for older report formats.

These are real foundations. The next engineering task should strengthen the evidence relationship model and test its trust transitions, not add more heuristic rules first.

## Competitive position after source review
| Capability | Veylens | Where's My Swap | ZecBlock | VeilLint |
|---|---|---|---|---|
| NEAR Intents order reconstruction | Partial provider/case evidence | Deep lifecycle tracing | ZEC flow analytics | No |
| Destination payout tracing | Limited, evidence-bound | Core multi-chain workflow | Explorer data | No |
| Zcash explorer and aggregate analytics | No | No | Core | No |
| Heuristic privacy-linkage analytics | Narrow case rules | Not core | Core | Source/config heuristics |
| Per-source trust and claim boundaries | Core direction | Per-hop statuses | API freshness and heuristic limits | Scanner limitations |
| Portable deterministic case replay | Core | Different workflow | Not established | JSON export |
| CLI/local-first workflow | Yes | Yes | Local development and APIs | Yes |

This is a capability comparison, not a quality ranking. Not established means not found in inspected sources, not proof that a capability does not exist.

## ZTrace correction
A previous assistant attributed a project named ZTrace to Ella Victor. This audit did not verify a primary source or claimed capabilities. The attribution is withdrawn.

## Sources
- https://github.com/cryppit/wheres-my-swap/blob/main/src/core/trace.ts
- https://github.com/cryppit/wheres-my-swap/blob/main/src/core/decode.ts
- https://github.com/cryppit/wheres-my-swap/blob/main/src/core/custody.ts
- https://github.com/Kenbak/zecblock
- https://github.com/Kenbak/zecblock/blob/main/DEPLOYMENT.md
- https://github.com/Kenbak/zecblock/blob/main/server/api/privacy-linkage.js
- https://github.com/Kenbak/zecblock/blob/main/server/api/routes/privacy.js
- https://github.com/Kenbak/zecblock/blob/main/server/lib/privacy-score.js
- https://github.com/Kenbak/zecblock/blob/main/components/privacy/RiskEvidence.tsx
- https://github.com/Kenbak/zecblock/blob/main/server/api/near-intents.js
- https://github.com/esteexbt/veillint
- https://zcash.readthedocs.io/en/master/rtd_pages/privacy_recommendations_best_practices.html
