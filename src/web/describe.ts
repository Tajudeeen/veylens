import type { FlowEvent } from "../types.js";

/** Plain-language one-line description of an event, for the timeline. */
export function describeEvent(e: FlowEvent): string {
  switch (e.kind) {
    case "shield":
      return `Shielded ${e.amountZec} ZEC from ${e.fromAddress} into ${e.toPool}`;
    case "unshield":
      return `Unshielded ${e.amountZec} ZEC from ${e.fromPool} to ${e.toAddress}` + (e.reason ? `. Reason given: ${e.reason}` : ". No reason given");
    case "intent_submit":
      return `Submitted intent ${e.intentId}: ${e.amountZec} ZEC from ${e.sourcePool} for ${e.destAsset} on ${e.destChain}`;
    case "settlement":
      return `Settled intent ${e.intentId}: ${e.destAmount} received at ${e.destAddress} on ${e.destChain}`;
    case "refund":
      return `Refunded ${e.amountZec} ZEC for intent ${e.intentId} to ${e.toAddress}, ${e.shielded ? "shielded" : "unshielded"}`;
    case "migrate":
      return `Migrated ${e.amountZec} ZEC from ${e.fromPool} to ${e.toPool}` + (e.turnstile ? " through the turnstile" : "");
  }
}

export function offsetLabel(timestamp: number, first: number): string {
  const d = Math.round(timestamp - first);
  return d === 0 ? "start" : d > 0 ? `+${d}s` : `${d}s`;
}
