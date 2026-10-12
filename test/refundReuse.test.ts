import { test } from "node:test";
import assert from "node:assert/strict";
import { refundAddressReuse, RULE_ID } from "../src/rules/refundReuse.js";
import type { Flow } from "../src/types.js";

test("flags an unshielded refund that reuses the funding t-address", () => {
  const flow: Flow = {
    flowId: "flow-leak-1",
    events: [
      {
        id: "e1",
        kind: "shield",
        timestamp: 1000,
        fromAddress: "t1abc",
        toPool: "orchard",
        amountZec: 1.0,
      },
      {
        id: "e2",
        kind: "intent_submit",
        timestamp: 1010,
        intentId: "intent-1",
        sourcePool: "orchard",
        amountZec: 0.5,
        destChain: "ethereum",
        destAsset: "ETH",
      },
      {
        id: "e3",
        kind: "refund",
        timestamp: 1200,
        intentId: "intent-1",
        toAddress: "t1abc",
        amountZec: 0.0016,
        shielded: false,
      },
    ],
  };

  const findings = refundAddressReuse(flow);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, RULE_ID);
  assert.equal(findings[0]?.severity, "high");
  assert.deepEqual(findings[0]?.eventIds, ["e3", "e1"]);
});

test("does not flag a refund that lands back in a shielded pool", () => {
  const flow: Flow = {
    flowId: "flow-clean-1",
    events: [
      {
        id: "e1",
        kind: "shield",
        timestamp: 1000,
        fromAddress: "t1abc",
        toPool: "orchard",
        amountZec: 1.0,
      },
      {
        id: "e2",
        kind: "refund",
        timestamp: 1200,
        intentId: "intent-1",
        toAddress: "t1abc",
        amountZec: 0.0016,
        shielded: true,
      },
    ],
  };

  const findings = refundAddressReuse(flow);
  assert.equal(findings.length, 0);
});

test("does not flag a refund to an address that never funded a shield", () => {
  const flow: Flow = {
    flowId: "flow-clean-2",
    events: [
      {
        id: "e1",
        kind: "shield",
        timestamp: 1000,
        fromAddress: "t1abc",
        toPool: "orchard",
        amountZec: 1.0,
      },
      {
        id: "e2",
        kind: "refund",
        timestamp: 1200,
        intentId: "intent-1",
        toAddress: "t1-ephemeral-xyz",
        amountZec: 0.0016,
        shielded: false,
      },
    ],
  };

  const findings = refundAddressReuse(flow);
  assert.equal(findings.length, 0);
});
