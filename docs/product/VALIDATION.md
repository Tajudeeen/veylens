# Product validation and competitor research
Research date: 2026-11-24. Desk research only. No customer interviews or product-market-fit claim.

## Hypotheses
H1 Developers integrating Zcash cross-chain payments struggle to reconcile provider, bridge and chain evidence.
H2 Evidence labels and replayable case exports improve incident review.
H3 Privacy-specific analysis differentiates Veylens from tracing and general exploration.
H4 Local engine/CLI is a credible adoption path, with hosted workspace optional.

## Verified prior art
### Where's My Swap — Cryppit
Repository: https://github.com/cryppit/wheres-my-swap
Inspected README, src/core/trace.ts, src/core/decode.ts, src/core/custody.ts, src/core/decoder-audit.test.ts and package.json on 2026-11-24.
It reconstructs NEAR Intents orders across origin, credit, swap, withdrawal and payout. It uses typed hop statuses including proven, matched, shielded, ambiguous, waiting, not found and unverified. It reconstructs token balances from DIP4/NEP-245 events, handles receipt failures, checks destination payouts and explains custody/next actions. Its core trace is pure and I/O is separated. The README reports a 337-order audit and 250 destination payout checks. These counts are project-reported, not independently reproduced here.
Veylens must not claim it uniquely traces NEAR Intents to Zcash. Differentiation must be privacy-specific evidence review, provenance and replay.

### ZecBlock — Kenbak / Atmosphere Labs
Repository: https://github.com/Kenbak/zecblock
Website: https://zecblock.com/about
Inspected public repository metadata and official About page on 2026-11-24. The repository is JavaScript, MIT, active with a push on 2026-11-24. The site positions it as a Zcash explorer for blocks, transactions, shielded-pool and network activity while respecting encrypted transaction contents.
Veylens should consume/link to reliable chain data where useful, not duplicate a general explorer. A full ZecBlock source-tree audit remains outstanding.

### VeilLint — esteexbt
Repository: https://github.com/esteexbt/veillint
Inspected README on 2026-11-24. It is an early local-first heuristic scanner for Zcash app source/config, with eleven potential risk classes and JSON export. Its README explicitly says it is not AST analysis, runtime analysis, transaction verification or proof of privacy.
Learn from local-first handling, rule explanations and explicit false-positive/negative limits. Do not add regex source scanning to Veylens' transaction evidence engine without validated demand.

### ZTrace correction
A previous assistant named a ZTrace project attributed to Ella Victor. This research did not verify that project or claimed capabilities. Attribution withdrawn pending a primary source.

## Official technical foundation
Zcash privacy recommendations: https://zcash.readthedocs.io/en/master/rtd_pages/privacy_recommendations_best_practices.html. The docs discuss metadata leakage, transaction linkability, pass-through operations and network-level correlation.

## Comparison
| Capability | Veylens | Where's My Swap | ZecBlock | VeilLint |
|---|---|---|---|---|
| NEAR Intents tracing | Partial integration evidence | Core | Not primary | No |
| Destination payout tracing | Limited paths | Extensive multi-chain tracing | Explorer data | No |
| Zcash explorer | No | ZEC payout lookup | Core | No |
| Privacy-specific transaction findings | Core, narrow rules | Not core | Aggregate context | Source heuristics |
| Evidence grading | Core design | Per-hop statuses | Source/chain data | Local heuristic findings |
| Portable case replay | Core feature | Different report/live-test workflow | Not established | JSON export |
| CLI | Yes | Yes | Not assessed | Local scanner |

This is a documented-capability comparison, not a quality ranking.

## User segments
Wallet engineers, NEAR Intents/1Click integrators, bridge operators, privacy reviewers, auditors and Zcash SDK/light-client developers. No interviews completed.

## Risks
Existing tools already cover much of tracing. ZEC/NEAR incidents may be infrequent. Transaction IDs are sensitive metadata. Explorer/indexer terms may restrict commercial use. Reviewers may misunderstand signatures vs consensus. Hosted workspaces create retention and support obligations.

## Small validation experiment
Conduct 8-12 interviews across at least three segments. Ask participants to explain what is proven in a real Veylens case, identify unknowns and reproduce a finding. Compare CLI and hosted-workspace task completion.
Proposed success signals: 5/8 identify a recent concrete evidence-reconciliation problem; 4 reproduce and explain a finding; 3 agree to test with a sanitized case; 2 request continued use. These are experiment gates, not market benchmarks.
Failure signals: existing tools solve the job acceptably; reviewers confuse collector receipts with consensus; nobody provides a sanitized case or returns.

## Decisions
Validated by source inspection: serious adjacent tools exist for NEAR Intents tracing, Zcash exploration and source/config heuristics.
Disproven: broad claim that Veylens is the only tool connecting NEAR Intents and Zcash evidence.
Unknown: frequency, urgency, buyer, willingness to pay, preferred interface and differentiation strength.
Recommendation: validate evidence review/replay before adding more chains or static scanning.
