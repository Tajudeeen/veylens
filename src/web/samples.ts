import type { Flow } from "../types.js";

/**
 * Example flows shown in the app. A test asserts these are identical to
 * test/fixtures/*.json, so the app, the CLI demos and the tests can't drift.
 */
export const LEAK_FLOW: Flow = {
  flowId: "zashi-crosspay-zachxbt-2025-10-21",
  events: [
    { id: "e1", kind: "shield", timestamp: 1761050000, fromAddress: "t1OriginalShieldingSource", toPool: "orchard", amountZec: 1.0 },
    { id: "e2", kind: "intent_submit", timestamp: 1761050050, intentId: "intent-crosspay-1", sourcePool: "orchard", amountZec: 0.98, destChain: "ethereum", destAsset: "ETH" },
    { id: "e3", kind: "settlement", timestamp: 1761050230, intentId: "intent-crosspay-1", destChain: "ethereum", destAddress: "0xRecipientAddress", destAmount: 0.005 },
    { id: "e4", kind: "refund", timestamp: 1761050240, intentId: "intent-crosspay-1", toAddress: "t1OriginalShieldingSource", amountZec: 0.001598, shielded: false },
  ],
};

export const CLEAN_FLOW: Flow = {
  flowId: "crosspay-with-ephemeral-refund-fix",
  events: [
    { id: "e1", kind: "shield", timestamp: 1761050000, fromAddress: "t1OriginalShieldingSource", toPool: "orchard", amountZec: 1.0 },
    { id: "e2", kind: "intent_submit", timestamp: 1761050050, intentId: "intent-crosspay-2", sourcePool: "orchard", amountZec: 0.98, destChain: "ethereum", destAsset: "ETH" },
    { id: "e3", kind: "settlement", timestamp: 1761050230, intentId: "intent-crosspay-2", destChain: "ethereum", destAddress: "0xRecipientAddress", destAmount: 0.005 },
    { id: "e4", kind: "refund", timestamp: 1761050240, intentId: "intent-crosspay-2", toAddress: "t1-ephemeral-single-use", amountZec: 0.001598, shielded: true },
  ],
};
