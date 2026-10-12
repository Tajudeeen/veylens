# Architecture

## Stack
TypeScript, strict mode. Node's built-in test runner (`node --test`), no
test framework dependency. No runtime dependencies beyond Node's
standard library for v1 - the rule engine is pure data transformation,
and Node's `crypto` module covers hashing and signing. Keeping the
dependency count at zero is a deliberate choice: an auditing tool with a
large supply-chain surface undercuts its own premise.

## Module map
```
src/
  types.ts        canonical data model, shared by every module
  rules/
    refundReuse.ts
    unshieldedHop.ts
    timingCorrelation.ts
    turnstileExposure.ts
  engine.ts        runs the full rule set against a Flow, assembles a Report
  attest.ts         hashes + signs a Report, verifies a signed Report
  cli.ts            reads a flow JSON file, runs engine + attest, prints report
test/
  <mirrors src/, one test file per module>
  fixtures/
    zashi-crosspay-leak.json   reconstructed real-world failing case
    clean-flow.json            passing case
```

## Data model (`types.ts`)

A **Flow** is an ordered list of **Events**. Each event has a
discriminated `kind` field so TypeScript can narrow it, and every event
carries a `timestamp` (unix seconds) and `id` (for cross-referencing in
findings).

```ts
type Pool = "transparent" | "sapling" | "orchard" | "ironwood";

interface BaseEvent {
  id: string;
  timestamp: number;
}

interface ShieldEvent extends BaseEvent {
  kind: "shield";
  fromAddress: string;   // transparent address funds came from
  toPool: Pool;
  amountZec: number;
}

interface UnshieldEvent extends BaseEvent {
  kind: "unshield";
  fromPool: Pool;
  toAddress: string;
  amountZec: number;
  reason?: string;        // declared justification, if any
}

interface IntentSubmitEvent extends BaseEvent {
  kind: "intent_submit";
  intentId: string;
  sourcePool: Pool;
  amountZec: number;
  destChain: string;
  destAsset: string;
}

interface SettlementEvent extends BaseEvent {
  kind: "settlement";
  intentId: string;
  destChain: string;
  destAddress: string;
  destAmount: number;
}

interface RefundEvent extends BaseEvent {
  kind: "refund";
  intentId: string;
  toAddress: string;
  amountZec: number;
  shielded: boolean;      // did the refund land back in a shielded pool?
}

interface MigrateEvent extends BaseEvent {
  kind: "migrate";
  fromPool: Pool;
  toPool: Pool;
  amountZec: number;
  turnstile: boolean;
}

type FlowEvent = ShieldEvent | UnshieldEvent | IntentSubmitEvent
  | SettlementEvent | RefundEvent | MigrateEvent;

interface Flow {
  flowId: string;
  events: FlowEvent[];
}
```

## Rule contract
Every rule is a pure function `(flow: Flow) => Finding[]`. No rule
mutates the flow or talks to any other rule. This is what makes "break
one rule, the rest still work" true rather than aspirational.

```ts
type Severity = "info" | "medium" | "high";

interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  eventIds: string[];     // which events in the flow triggered this
}

type Rule = (flow: Flow) => Finding[];
```

## Engine
`runAudit(flow: Flow, rules: Rule[]): Report` runs every rule, collects
findings, and computes `overallResult`: `"fail"` if any `high` finding
exists, `"warn"` if only `medium`/`info`, `"pass"` if no findings.
`high`-severity findings fail the audit; `info` never does, by design
(turnstile exposure is expected behavior, not a defect).

## Attestation
A report is only worth something if a third party (a judge, a wallet
team) can check it without re-running the tool and trusting the output
blindly. `attest.ts`:
1. Canonicalizes the report (stable key order, no whitespace
   nondeterminism) and SHA-256 hashes it.
2. Signs that hash with an Ed25519 keypair (Node's `crypto.sign` /
   `crypto.verify`, no external crypto dependency).
3. Produces a `SignedReport` containing the report, the hash, the
   signature, and the public key.
4. `verifySignedReport(signed)` re-hashes the embedded report,
   checks the hash matches, and checks the signature verifies against
   the embedded public key. This is the "provable" requirement: the
   verification step is independent code, not the same function that
   produced the signature, and it is itself under test.

## CLI
`veylens audit <flow.json> [--key <privateKeyPath>]` → prints a
signed report to stdout. `veylens verify <signedReport.json>` →
exits 0 and prints "VALID" or exits 1 and prints why it failed.

## Why this shape survives "break and rebuild"
Each rule is independently unit tested against both a fixture that
should trigger it and one that shouldn't. The engine is tested
separately, against a hand-built Flow with a mocked rule list, not the
real rules - so a bug in one rule can't silently change what "the
engine runs all rules and aggregates severity" means. Attestation is
tested against a tampered report (hash mismatch) and a tampered
signature (verify failure) as explicit negative cases, not just the
happy path.

## Presentation layer (added in v0.2.0)
- `brand.ts` holds the Zcash palette and terminal color helpers
  (NO_COLOR, FORCE_COLOR, TTY detection).
- `viewer.ts` renders a SignedReport to one self-contained HTML file.
  Flow data is untrusted, so every dynamic value is escaped, the embedded
  JSON escapes `<`, and the CSP is pinned to the hash of the inline
  script with `default-src 'none'`.
- `verifyScript.ts` is the in-page verifier, kept as a string so the same
  text is inlined, hashed for the CSP, and evaluated in Node by tests that
  prove it agrees with `attest.ts` byte for byte.
- CLI gains `--html` on `audit` and a `report` command, plus a real
  argument parser (option values no longer get mistaken for the flow path).
