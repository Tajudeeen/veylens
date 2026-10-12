import type { Flow, Finding, IntentSubmitEvent, SettlementEvent } from "../types.js";

export const RULE_ID = "timing-correlation";

/**
 * Default correlation window, in seconds. An external chain observer
 * never sees the intentId linking a shielded-side submission to its
 * destination-chain settlement - NEAR Intents keeps that private. What
 * they can see is "value left the shielded pool at T1" and "value
 * arrived on the destination chain at T2". If T2 - T1 is small, timing
 * alone is often enough to link the two even with no shared identifier,
 * which is the same heuristic behind the dust/"Danaan-gift" style
 * fingerprinting attacks documented against Zcash shielded transactions
 * (Biryukov, Feher, Vitto, 2019).
 */
export const DEFAULT_CORRELATION_WINDOW_SECONDS = 120;

export function timingCorrelation(
  flow: Flow,
  windowSeconds: number = DEFAULT_CORRELATION_WINDOW_SECONDS,
): Finding[] {
  const intents = flow.events.filter(
    (e): e is IntentSubmitEvent => e.kind === "intent_submit",
  );
  const settlements = flow.events.filter(
    (e): e is SettlementEvent => e.kind === "settlement",
  );

  const findings: Finding[] = [];

  for (const intent of intents) {
    const matchingSettlement = settlements.find((s) => s.intentId === intent.intentId);
    if (!matchingSettlement) continue;

    const deltaT = matchingSettlement.timestamp - intent.timestamp;
    if (deltaT >= 0 && deltaT <= windowSeconds) {
      findings.push({
        ruleId: RULE_ID,
        severity: "medium",
        message:
          `Settlement (${matchingSettlement.id}) on ${matchingSettlement.destChain} ` +
          `follows shielded intent submission (${intent.id}) by only ${deltaT}s, ` +
          `inside the ${windowSeconds}s correlation window. An observer watching ` +
          `both chains, with no visibility into the private intent itself, can ` +
          `plausibly link the two purely on timing.`,
        eventIds: [intent.id, matchingSettlement.id],
      });
    }
  }

  return findings;
}
