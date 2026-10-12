import type { Flow, Finding, ShieldEvent, RefundEvent } from "../types.js";

export const RULE_ID = "refund-address-reuse";

/**
 * Flags an unshielded refund that lands back on a transparent address
 * which previously funded a shield operation in the same flow.
 *
 * This is the exact pattern ZachXBT disclosed in Zashi CrossPay
 * (Oct 2025): a static t-address funds a shield, the cross-chain
 * refund comes back unshielded to that same address, and anyone
 * watching can match timing and amount to deanonymize the sender.
 */
export function refundAddressReuse(flow: Flow): Finding[] {
  const shieldEvents = flow.events.filter(
    (e): e is ShieldEvent => e.kind === "shield",
  );
  const refundEvents = flow.events.filter(
    (e): e is RefundEvent => e.kind === "refund" && e.shielded === false,
  );

  const findings: Finding[] = [];

  for (const refund of refundEvents) {
    const matchingShields = shieldEvents.filter(
      (s) => s.fromAddress === refund.toAddress && s.timestamp <= refund.timestamp,
    );

    if (matchingShields.length > 0) {
      findings.push({
        ruleId: RULE_ID,
        severity: "high",
        message:
          `Unshielded refund (${refund.id}) returns to transparent address ` +
          `${refund.toAddress}, which previously funded ${matchingShields.length} ` +
          `shield operation(s) in this flow. The supplied records assert an address relationship. They do not independently verify ` +
          `either transaction or identify the real-world owner.`,
        eventIds: [refund.id, ...matchingShields.map((s) => s.id)],
      });
    }
  }

  return findings;
}
