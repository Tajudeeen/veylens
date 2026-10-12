export type Pool = "transparent" | "sapling" | "orchard" | "ironwood";

interface BaseEvent {
  id: string;
  timestamp: number;
}

export interface ShieldEvent extends BaseEvent {
  kind: "shield";
  fromAddress: string;
  toPool: Pool;
  amountZec: number;
}

export interface UnshieldEvent extends BaseEvent {
  kind: "unshield";
  fromPool: Pool;
  toAddress: string;
  amountZec: number;
  reason?: string;
}

export interface IntentSubmitEvent extends BaseEvent {
  kind: "intent_submit";
  intentId: string;
  sourcePool: Pool;
  amountZec: number;
  destChain: string;
  destAsset: string;
}

export interface SettlementEvent extends BaseEvent {
  kind: "settlement";
  intentId: string;
  destChain: string;
  destAddress: string;
  destAmount: number;
}

export interface RefundEvent extends BaseEvent {
  kind: "refund";
  intentId: string;
  toAddress: string;
  amountZec: number;
  shielded: boolean;
}

export interface MigrateEvent extends BaseEvent {
  kind: "migrate";
  fromPool: Pool;
  toPool: Pool;
  amountZec: number;
  turnstile: boolean;
}

export type FlowEvent =
  | ShieldEvent
  | UnshieldEvent
  | IntentSubmitEvent
  | SettlementEvent
  | RefundEvent
  | MigrateEvent;

export interface Flow {
  flowId: string;
  events: FlowEvent[];
}

export type Severity = "info" | "medium" | "high";

export interface Finding {
  ruleId: string;
  severity: Severity;
  message: string;
  eventIds: string[];
}

export type Rule = (flow: Flow) => Finding[];

export type OverallResult = "pass" | "warn" | "fail" | "insufficient";

export interface Evidence {
  format: string;
  inputDigest: string;
  providerDigest?: string;
  quoteSignature?: "valid" | "invalid" | "missing";
  coverage: "incomplete";
  kind: "quote" | "status" | "declared-flow" | "zcash-transactions";
  facts: Array<{ path: string; value: string; trust: string }>;
  gaps: string[];
  scope: string;
}

export interface Report {
  flowId: string;
  rulesetVersion: string;
  generatedAt: number;
  findings: Finding[];
  overallResult: OverallResult;
  evidence?: Evidence;
}
