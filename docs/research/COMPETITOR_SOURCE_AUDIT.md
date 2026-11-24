# Competitor and prior-art source audit
Reviewed 2026-11-24. Focused public source review, not a security audit of third-party code.

## Where's My Swap — cryppit/wheres-my-swap
https://github.com/cryppit/wheres-my-swap
Inspected README, src/core/trace.ts, src/core/decode.ts, src/core/custody.ts, src/core/decoder-audit.test.ts and package.json.
- Typed lifecycle hops: origin, credit, swap, withdrawal, payout.
- Evidence statuses distinguish proven, matched, shielded, ambiguous, waiting, not found and unverified.
- Pure trace logic separated from I/O.
- Decoder preserves receipt-level failures and normalizes NEAR logs/events.
- Ledger reconstructs DIP4/NEP-245 balances without double counting shadow events.
- Custody module explains where funds sit, who can move them and next action.
- Tests include decoders, trace/custody and recorded cases. README reports a 337-order audit and 250 destination payout checks, project-reported and not independently reproduced here.
Veylens should adopt pure domain logic, typed per-hop evidence, receipt-aware failures, ledger invariants, recorded real fixtures and plain-language next-evidence guidance. Do not copy NEAR-specific assumptions or add broad chain coverage prematurely.

## ZecBlock — Kenbak/zecblock
https://github.com/Kenbak/zecblock
https://zecblock.com/about
Inspected repository metadata and official About page. JavaScript, MIT, pushed 2026-11-24. Positions itself as a Zcash explorer for blocks, transactions, shielded-pool and network activity while respecting encrypted transaction contents.
Veylens should use explorer-grade chain metadata carefully, link to aggregate context, and avoid duplicating an explorer. Full source-tree audit remains outstanding.

## VeilLint — esteexbt/veillint
https://github.com/esteexbt/veillint
Inspected README. Local-first heuristic scanner for Zcash application source/config with eleven potential risk classes and JSON export. README states it is not AST analysis, runtime analysis, transaction verification or proof of privacy.
Learn from local-first handling, actionable rule explanations and explicit detection limits. Do not merge source scanning into transaction evidence engine without validated demand.

## ZTrace correction
A prior assistant attributed a project named ZTrace to Ella Victor. This audit did not verify the repository or claimed capabilities. Attribution withdrawn pending a primary source.

## Comparison
| Capability | Veylens | Where's My Swap | ZecBlock | VeilLint |
|---|---|---|---|---|
| NEAR Intents trace | Partial evidence | Core | Not primary | No |
| Payout tracing | Limited paths | Extensive | Explorer | No |
| Zcash explorer | No | ZEC payout lookup | Core | No |
| Privacy findings | Core, narrow rules | Not core | Aggregate context | Source heuristics |
| Evidence labels | Core | Per-hop statuses | Source/chain data | Heuristic findings |
| Portable replay | Core | Different workflow | Not established | JSON export |
| CLI | Yes | Yes | Not assessed | Local scanner |

Not a quality ranking. Capabilities are based on inspected public docs/source.

## Sources
- https://github.com/cryppit/wheres-my-swap/blob/main/src/core/trace.ts
- https://github.com/cryppit/wheres-my-swap/blob/main/src/core/decode.ts
- https://github.com/cryppit/wheres-my-swap/blob/main/src/core/custody.ts
- https://github.com/Kenbak/zecblock
- https://zecblock.com/about
- https://github.com/esteexbt/veillint
- https://zcash.readthedocs.io/en/master/rtd_pages/privacy_recommendations_best_practices.html
