# Veylens product vision
Status: working direction approved 2026-11-24. Product direction: both, engine-first with a platform interface.

## Summary
Veylens is a privacy investigation and evidence-verification product for Zcash payment integrations and cross-chain flows. It helps developers reconstruct supported transaction paths, inspect privacy-relevant public exposure, understand what each source proves, and export a case another reviewer can independently replay.

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

Developers currently reconcile exports, explorers, APIs and raw transactions manually. Veylens must prove that evidence grading, privacy-specific review and independent replay add value beyond existing tracing tools.

## User outcomes
Users can create a local case, import original provider and chain evidence, see a chronological flow with per-edge evidence labels, inspect findings and missing evidence, export a portable source bundle/report, and reproduce the same result offline using the CLI.

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
- H1: A source-labelled evidence graph plus deterministic portable replay is valuable beyond ordinary cross-chain tracing.
- H2: Privacy-specific Zcash findings with coverage and false-positive controls are valuable beyond general explorers.
- H3: A reusable engine/CLI can enter developer workflows while the platform supports human investigations.
These are hypotheses, not validated market facts.

## Business hypotheses
Undecided. Explore an open-source local engine/CLI with optional hosted team workspace, managed collection and collaboration only after buyer interviews and cost analysis.

## Constraints and non-goals
Existing product is Veylens 1.1.1, TypeScript/Vite, CLI, Vercel and Cloudflare Worker/D1 budget gateway. Preserve report replay compatibility. Single independent developer with limited time/budget. Initial supported focus remains NEAR Intents ZEC/1Click and existing Zcash evidence paths.
Not a wallet, bridge, custody service, AML product, identity system, explorer replacement or privacy certification. Do not claim recipient identification, wallet ownership, complete graph reconstruction or independent consensus without proof.

## Long-term direction
Become a trusted developer-grade privacy investigation engine with a platform around it. Expand integrations only when each adapter has an evidence contract, fixtures, failure tests and source-terms review.

## Open questions
Which segment has the most frequent pain? Do teams prefer CLI/CI or hosted cases? Which data sources permit commercial use? What independent verification do reviewers expect? Who would pay?
