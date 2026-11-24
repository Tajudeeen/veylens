# Product validation and competitor research
Research date: 2026-11-24. Desk research only. No customer interviews or product-market-fit claim.

## Hypotheses
H1 Developers integrating Zcash cross-chain payments struggle to reconcile provider, bridge and chain evidence.
H2 Evidence labels and replayable case exports improve incident review.
H3 Case-specific evidence provenance and deterministic replay differentiate Veylens from tracing and explorer products.
H4 Local engine/CLI is a credible adoption path, with hosted workspace optional.

## Verified prior art
### Where's My Swap — Cryppit
Repository: https://github.com/cryppit/wheres-my-swap
Inspected README, src/core/trace.ts, src/core/decode.ts, src/core/custody.ts, selected decoder/trace/custody tests and package metadata on 2026-11-24.
It reconstructs NEAR Intents orders across origin, credit, swap, withdrawal and payout. It uses typed hop statuses including proven, matched, shielded, ambiguous, waiting, missing and unverified. It reconstructs token balances from DIP4/NEP-245 events, handles receipt failures, checks destination payouts and explains custody/next actions. Its core trace is pure and I/O is separated. The README reports a 337-order audit and 250 destination payout checks. These counts are project-reported, not independently reproduced.
Veylens must not claim it uniquely traces NEAR Intents to Zcash. Its distinct job must be proven at the case evidence and reviewer handoff level.

### ZecBlock — Kenbak / Atmosphere Labs
Repository: https://github.com/Kenbak/zecblock
Deployment guide: https://github.com/Kenbak/zecblock/blob/main/DEPLOYMENT.md
Source-reviewed on 2026-11-24: privacy API routes, linkage scoring, scheduled edge builder, privacy score, risk UI, graph UI, NEAR Intents API client and selected tests.
ZecBlock already provides ZEC flows via NEAR Intents, privacy-risk and batch-pattern analysis, transaction-linkage graphs, turnstile tracking, pool analytics, memo tooling and general Zcash explorer features. Its linkage algorithm scores amount similarity, timing, rarity, roundness, batch size, uniformity, recipient coherence and shield conservation, then exposes ambiguity and score inputs. The UI explicitly says scores are leads, not proof of shared ownership. Privacy analytics routes are mainnet-only because the precomputed analytics have no testnet producer. The architecture is documented as Next.js + Express/WebSocket + PostgreSQL + Redis + a separate Rust indexer + Zebra/Zakura.
The inspected API contract includes network, indexed height, source observation and freshness metadata. This is a useful provenance/freshness design reference. The inspected source and tests demonstrate implementation details but do not independently establish production uptime or detection accuracy.
Veylens must not claim to be the first ZEC/NEAR flow tool or build another generic privacy dashboard, global score or linkage graph.

### VeilLint — esteexbt
Repository: https://github.com/esteexbt/veillint
Inspected README on 2026-11-24. It is a local-first heuristic scanner for Zcash app source/config, with eleven potential risk classes and JSON export. Its README explicitly says it is not AST analysis, runtime analysis, transaction verification or proof of privacy.
Learn from local-first handling, rule explanations and explicit false-positive/negative limits. Do not add source scanning to Veylens' transaction evidence engine without validated demand.

### ZTrace correction
A previous assistant named a ZTrace project attributed to Ella Victor. This research did not verify that project or claimed capabilities. Attribution withdrawn pending a primary source.

## Official technical foundation
Zcash privacy recommendations: https://zcash.readthedocs.io/en/master/rtd_pages/privacy_recommendations_best_practices.html. The docs discuss metadata leakage, transaction linkability, pass-through operations and network-level correlation.

## Comparison
| Capability | Veylens | Where's My Swap | ZecBlock | VeilLint |
|---|---|---|---|---|
| NEAR Intents order tracing | Partial provider/case evidence | Deep lifecycle tracing | ZEC flow analytics | No |
| Destination payout tracing | Limited, evidence-bound | Extensive multi-chain tracing | Explorer data | No |
| Zcash explorer and aggregate analytics | No | No | Core | No |
| Heuristic privacy-linkage analytics | Narrow case rules | Not core | Core | Source/config heuristics |
| Case-specific trust boundaries | Core direction | Per-hop statuses | API freshness and heuristic limits | Scanner limitations |
| Portable deterministic case replay | Core | Different workflow | Not established by inspected sources | JSON export |
| CLI/local-first workflow | Yes | Yes | Local development and APIs | Yes |

This is a documented-capability comparison, not a quality ranking. Not established means not found in inspected sources, not proof that a capability does not exist.

## User segments
Wallet engineers, NEAR Intents/1Click integrators, bridge operators, privacy reviewers, auditors and Zcash SDK/light-client developers. No interviews completed.

## Risks
Existing tools already cover much of tracing and broad privacy analytics. ZEC/NEAR incidents may be infrequent. Transaction IDs are sensitive metadata. Explorer/indexer terms may restrict commercial use. Reviewers may confuse signatures, source observations and consensus. Hosted workspaces create retention and support obligations.

## Small validation experiment
Conduct 8-12 interviews across at least three segments. Ask participants to explain what is proven in a real Veylens case, identify unknowns and reproduce a finding. Compare CLI and hosted-workspace task completion.
Proposed success signals: 5/8 identify a recent concrete evidence-reconciliation problem; 4 reproduce and explain a finding; 3 agree to test with a sanitized case; 2 request continued use. These are experiment gates, not market benchmarks.
Failure signals: existing tools solve the job acceptably; reviewers confuse collector receipts with consensus; nobody provides a sanitized case or returns.

## Decisions
Validated by source inspection: serious adjacent tools exist for NEAR Intents tracing, Zcash exploration, ZEC flow analytics, privacy-linkage heuristics and source/config scanning.
Disproven: broad claims that Veylens uniquely connects NEAR Intents and Zcash or that privacy analytics alone provide a defensible differentiation.
Unknown: frequency, urgency, buyer, willingness to pay, preferred interface and whether case-level provenance/replay is meaningfully better.
Recommendation: validate evidence review/replay before adding more chains, global scores, graph analytics or static scanning.
