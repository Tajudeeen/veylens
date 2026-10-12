import { test } from "node:test";
import assert from "node:assert/strict";
import { unjustifiedUnshieldedHop, RULE_ID } from "../src/rules/unshieldedHop.js";
import type { Flow } from "../src/types.js";

test("flags an unreasoned unshield between a shield and the settlement", () => {
  const flow: Flow = {
    flowId: "flow-hop-1",
    events: [
      { id: "e1", kind: "shield", timestamp: 100, fromAddress: "t1", toPool: "orchard", amountZec: 1 },
      { id: "e2", kind: "unshield", timestamp: 150, fromPool: "orchard", toAddress: "t2", amountZec: 1 },
      { id: "e3", kind: "settlement", timestamp: 200, intentId: "i1", destChain: "ethereum", destAddress: "0xabc", destAmount: 0.9 },
    ],
  };

  const findings = unjustifiedUnshieldedHop(flow);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, RULE_ID);
  assert.equal(findings[0]?.severity, "medium");
});

test("does not flag an unshield with a declared reason", () => {
  const flow: Flow = {
    flowId: "flow-hop-2",
    events: [
      { id: "e1", kind: "shield", timestamp: 100, fromAddress: "t1", toPool: "orchard", amountZec: 1 },
      {
        id: "e2",
        kind: "unshield",
        timestamp: 150,
        fromPool: "orchard",
        toAddress: "t2",
        amountZec: 1,
        reason: "destination chain requires a transparent bridge deposit address",
      },
      { id: "e3", kind: "settlement", timestamp: 200, intentId: "i1", destChain: "ethereum", destAddress: "0xabc", destAmount: 0.9 },
    ],
  };

  const findings = unjustifiedUnshieldedHop(flow);
  assert.equal(findings.length, 0);
});

test("does not flag an unshield outside the shield-to-settlement window", () => {
  const flow: Flow = {
    flowId: "flow-hop-3",
    events: [
      { id: "e1", kind: "shield", timestamp: 100, fromAddress: "t1", toPool: "orchard", amountZec: 1 },
      { id: "e2", kind: "settlement", timestamp: 200, intentId: "i1", destChain: "ethereum", destAddress: "0xabc", destAmount: 0.9 },
      { id: "e3", kind: "unshield", timestamp: 300, fromPool: "orchard", toAddress: "t3", amountZec: 0.1 },
    ],
  };

  const findings = unjustifiedUnshieldedHop(flow);
  assert.equal(findings.length, 0);
});

test("returns no findings when the flow has no shield or no settlement", () => {
  const flow: Flow = {
    flowId: "flow-hop-4",
    events: [
      { id: "e1", kind: "unshield", timestamp: 100, fromPool: "orchard", toAddress: "t1", amountZec: 1 },
    ],
  };

  assert.equal(unjustifiedUnshieldedHop(flow).length, 0);
});
