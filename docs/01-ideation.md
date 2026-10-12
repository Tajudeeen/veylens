# Ideation and scope

## Name
Veylens - a privacy-leak auditor for Zcash shielded
cross-chain transaction flows.

## Problem
Zcash's privacy guarantee is strong inside the shielded pool and weak at
every point a flow crosses a chain boundary. The evidence for this is not
hypothetical:

- Oct 2025: ZachXBT showed that Zashi CrossPay (shielded ZEC out, NEAR
  Intents, any destination chain) sent refund transactions back to the
  same static transparent address the user had originally shielded from.
  Static address plus unshielded refund lets anyone correlate timing and
  amount and deanonymize the sender. ECC confirmed the bug and committed
  to ephemeral addresses and shielded refunds as the fix.
- The underlying failure class (refund/change paths, timing/amount
  correlation, unnecessary transparent hops) is decades-old in the
  privacy-coin literature (Biryukov, Feher, Vitto, 2019, "Danaan-gift"
  and dust-style fingerprinting attacks on Zcash) and keeps recurring
  because every new integration re-implements the refund/change path
  from scratch.
- No existing tool checks for this specific class. `wallet-privacy-testkit`
  (ztsalexey) audits wallet-to-indexer *network* traffic. It does not
  look at the *on-chain transaction graph* of a cross-chain flow, which
  is where the Zashi CrossPay bug actually lived.

## What this tool is
A deterministic rule engine that takes a structured description of a
Zcash shielded cross-chain flow (shield, intent submission, settlement,
refund, pool migration) and checks it against a named, documented set of
known leak patterns. It outputs a signed, independently verifiable
report: which rules ran, which passed, which failed, and why.

## What this tool is not
- Not a formal proof of privacy. It catches known, named leak patterns,
  not every possible deanonymization vector. This is stated explicitly
  in every report it produces.
- Not a bridge, wallet, or custody system. It never holds funds.
- Not a general compliance/AML tool. Scope is privacy-leak detection
  only, not sanctions or Travel Rule screening (that space is already
  covered by projects like Omni-Compliance Guard / Agentic Compliance
  Bridge on Chainlink CCIP, which is explicitly a different problem).

## v1 rule set (named, each independently testable)
1. **Refund address reuse** - a refund/change leg is sent, unshielded,
   back to a transparent address that funded a prior shield operation in
   the same flow. This is the exact Zashi CrossPay / ZachXBT pattern.
   Severity: high.
2. **Unjustified unshielded hop** - value drops out of the shielded pool
   between a shield event and final settlement with no declared reason,
   when the flow could have stayed shielded through to settlement.
   Severity: medium.
3. **Timing/amount correlation** - a shielded-side event and a
   destination-chain event fall within a configurable time window and
   amount tolerance of each other, making them heuristically linkable
   even with no address reuse. Severity: medium.
4. **Turnstile exposure during migration** - a pool migration
   (e.g. Orchard to Ironwood) necessarily exposes the amount via the
   turnstile accounting. This is expected protocol behavior, not a flow
   defect, and is reported as an informational disclosure, not a
   failure. Distinguishing "known, protocol-level exposure" from
   "accidental, fixable leak" is itself part of what the tool is for.

## Judging-criteria mapping (Zecathon: privacy, usefulness, execution,
originality)
- **Privacy**: the tool's entire purpose is catching leaks, and its
  flagship demo reproduces a real, named, previously-disclosed leak
  against a reconstructed fixture, not a synthetic toy case.
- **Usefulness**: any wallet or integration shipping a Zcash-to-NEAR-
  Intents (or similar) cross-chain path has a direct, immediate use for
  this before they ship a refund/change code path.
- **Execution**: scope is bounded to transaction-graph analysis over
  structured data, not live fund custody or a live bridge. Lower
  integration risk for a solo 17-day build.
- **Originality**: distinct layer (on-chain cross-chain transaction
  graph) from the one existing adjacent project (network traffic).
  Distinct problem (privacy leak detection) from the already-crowded
  compliance-gate category.

## Out of scope for the hackathon window
- Live network scanning of real wallets' traffic.
- A UI beyond a CLI and a minimal static report viewer.
- Formal verification of the rule set itself (documented as a known
  limitation, not hidden).
