import type { Flow, Finding, ShieldEvent, UnshieldEvent, SettlementEvent } from "../types.js";

export const RULE_ID = "unjustified-unshielded-hop";

/**
 * Flags an unshield event with no declared reason that falls between a
 * shield event and a settlement event in the same flow - value dropped
 * out of the shielded pool mid-flow when it could plausibly have stayed
 * shielded through to settlement.
 *
 * A `reason` on the unshield event (e.g. "destination chain requires a
 * transparent bridge deposit address") is treated as a deliberate,
 * documented design choice and is not flagged. The absence of a reason
 * is the signal, not the unshield itself - cross-chain flows sometimes
 * have to unshield, the question is whether that was a decision or an
 * accident.
 */
export function unjustifiedUnshieldedHop(flow: Flow): Finding[] {
  const firstShield = flow.events.find(
    (e): e is ShieldEvent => e.kind === "shield",
  );
  const lastSettlement = [...flow.events]
    .reverse()
    .find((e): e is SettlementEvent => e.kind === "settlement");

  if (!firstShield || !lastSettlement) {
    return [];
  }

  const unshields = flow.events.filter(
    (e): e is UnshieldEvent =>
      e.kind === "unshield" &&
      !e.reason &&
      e.timestamp > firstShield.timestamp &&
      e.timestamp < lastSettlement.timestamp,
  );

  return unshields.map((u) => ({
    ruleId: RULE_ID,
    severity: "medium" as const,
    message:
      `Unshield event (${u.id}) moves ${u.amountZec} ZEC out of ${u.fromPool} ` +
      `with no declared reason, between a shield (${firstShield.id}) and the ` +
      `eventual settlement (${lastSettlement.id}). If this hop isn't required ` +
      `by the destination chain, the flow should stay shielded through to ` +
      `settlement instead.`,
    eventIds: [u.id, firstShield.id, lastSettlement.id],
  }));
}
