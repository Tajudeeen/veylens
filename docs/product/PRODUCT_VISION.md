# Veylens product vision
Status: working direction approved 2026-11-24. Product direction: both, engine-first with a platform interface.

## Summary
Veylens is a privacy investigation and evidence-verification product for Zcash payment integrations and cross-chain flows. Its strongest intended outcome is a reproducible case: a reviewer can inspect each claim, see the source and trust boundary behind it, understand what is missing or contradictory, and replay the analysis offline.

Two surfaces share one trusted core:
- Veylens Engine: deterministic TypeScript rules, evidence adapters, verification, CLI and machine-readable output.
- Veylens Platform: multi-page workspace for importing/collecting evidence, reviewing findings, comparing cases and handing off investigations.

## Users
- Wallet and integration engineers diagnosing refund configuration, address reuse and payout failures.
- Privacy/security reviewers who need reproducible findings and explicit evidence boundaries.
- Bridge/protocol operators investigating incidents.
- Auditors and researchers who need portable evidence bundles.
- Veylens maintainer operating collectors, keys, budgets and releases.

## Problem
Cross-chain ZEC flows combine provider quote/status records, NEAR Intents events, bridge reports and Zcash transactions. Each source sees only part of the path. Provider status and bridge indexers can report events without proving destination transactions. Public shielded data cannot reveal the recipient.

Developers currently reconcile exports, explorers, APIs and raw transactions manually. Existing tools already provide NEAR Intents lifecycle tracing, ZEC flow analytics, Zcash exploration and heuristic privacy-linkage views. Veylens must prove that source-level evidence grading, case-specific claim verification, privacy-aware findings and portable replay solve a distinct review job.

## User outcomes
Users can create a local case, import original provider and chain evidence, inspect a chronological set of claims and relationships with source-specific trust labels, inspect findings and missing or conflicting evidence, export a portable source bundle/report, and reproduce the same result offline using the CLI.

## Principles
1. Provenance is a first-class data model.
2. Missing evidence never becomes success.
3. A signature proves only the data and scope it covers.
4. Merkle inclusion under a supplied header is not full consensus.
5. Shielded bytes do not reveal encrypted recipients.
6. Wallet exports remain assertions unless independently authenticated.
7. Collection is explicit, read-only, bounded and disclosed.
8. Local analysis/replay remains useful without hosted services.
9. Explain uncertainty in plain language.
10. No simulated live integrations or placeholder success states.

## Differentiation hypotheses
- H1: Reviewers need case-specific claim provenance that distinguishes provider assertions, collector observations, raw transaction facts, cryptographic checks and unresolved relationships.
- H2: A portable case bundle that reproduces the same analysis offline is useful in incident response, integration QA and audit handoff.
- H3: Privacy-specific findings are valuable when each finding states its required evidence, coverage, competing explanations and limits.
These are hypotheses, not validated market facts. ZecBlock already offers broad Zcash privacy analytics and NEAR Intents ZEC flow views. Where's My Swap already offers detailed NEAR Intents order reconstruction. Veylens should not compete by recreating those surfaces.

## Business hypotheses
Undecided. Explore an open-source local engine/CLI with optional hosted team workspace, managed collection and collaboration only after buyer interviews and cost analysis.

## Constraints and non-goals
Existing product is Veylens 1.1.1, TypeScript/Vite, CLI, Vercel and Cloudflare Worker/D1 budget gateway. Preserve report replay compatibility. Single independent developer with limited time/budget. Initial supported focus remains NEAR Intents ZEC/1Click and existing Zcash evidence paths.
Not a wallet, bridge, custody service, AML product, identity system, explorer replacement, population-level privacy analytics dashboard or privacy certification. Do not claim recipient identification, wallet ownership, complete graph reconstruction or independent consensus without proof.

## Long-term direction
Become a trusted developer-grade privacy investigation engine with a platform around it. Expand integrations only when each adapter has an evidence contract, fixtures, failure tests and source-terms review.

## Open questions
Which segment has the most frequent and costly evidence-review problem? Do teams prefer CLI/CI or hosted cases? Which data sources permit commercial use? What independent verification do reviewers expect? Who would pay?
