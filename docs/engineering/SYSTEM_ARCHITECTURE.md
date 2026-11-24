# System architecture
Status: proposed target architecture based on Veylens 1.1.1. Do not treat proposals as implemented.

## Architectural decision
Keep a modular monolith with a pure deterministic domain core. Do not split into microservices. The existing Vite/web, CLI, Vercel API and Cloudflare budget gateway are enough for the validated scope.

## Logical layers
1. **Interfaces:** web workspace, CLI, CI adapter and future public API.
2. **Application use cases:** import case, collect evidence, review case, verify report, compare cases.
3. **Domain core:** versioned schemas, evidence graph, provenance policy, flow reconstruction, privacy rules, coverage calculation and deterministic report generation.
4. **Adapters:** Zcash RPC/explorer, NEAR RPC/indexers, 1Click SDK/provider, bridge APIs, filesystem and hosted collector.
5. **Operations:** Vercel deployment, Cloudflare D1 admission gateway, pinned signing keys, monitoring and release checks.

## Boundaries
- Domain core must not import network clients, UI code, wall-clock globals or hosting SDKs.
- Adapters return normalized observations plus raw source material and source metadata.
- Application layer applies trust policy and invokes deterministic rules.
- UI renders domain output; it must not independently upgrade evidence trust.
- CLI and web call the same core and ruleset version.
- Hosted collection is optional. Local import, review, replay and verification must work offline.

## Evidence graph
Nodes: source records, provider quote/status, NEAR events, bridge observations, Zcash transactions, block/header observations, wallet assertions and derived facts.
Edges: explicit source reference, cryptographic binding, chain-derived relationship, provider-reported relationship, user assertion or heuristic match.
Every edge carries basis, evidence IDs, confidence class, timestamp, network, limitations and rule version. Never collapse edge trust into a single case-wide boolean.

## Core flow
Import/collect -> schema validation -> raw evidence preservation/digest -> adapter normalization -> provenance policy -> deterministic reconstruction -> privacy rules -> coverage calculation -> report/export -> independent replay.

## Trust classes
- cryptographically_verified: signature verified under a pinned trust policy, limited to signed fields.
- chain_derived: derived from locally checked transaction/receipt/block data with exact method recorded.
- collector_observed: collector signed the bytes it fetched, not their truth.
- provider_reported: provider status or indexer assertion not covered by a verified signature.
- user_asserted: imported wallet role, ownership or manually assigned label.
- heuristic: amount/time/address pattern that is not a cryptographic link.
- unknown_or_missing: unavailable, unsupported, conflicting or stale.

## Data flow security
No secrets enter browser evidence. Server secrets stay in Vercel/Cloudflare secret stores. Transaction identifiers are sensitive metadata; avoid logging them. Collection requests use fixed network/method allowlists, bounded sizes, timeouts and shared budgets. Never accept arbitrary user RPC URLs or RPC methods.

## Deployment
Keep Vercel as web/API host and Cloudflare D1 budget gateway as a narrowly scoped rate-budget service until a concrete need justifies consolidation. No new database or queue is required for local cases. Team cloud persistence is deferred.

## Scaling path
If collection load grows, isolate only the adapter/collector execution behind a queue after measured need. Keep the pure engine shared and versioned. Do not introduce distributed event infrastructure before a product requirement demands it.
