import { test } from "node:test";
import assert from "node:assert/strict";
import { timingCorrelation, RULE_ID, DEFAULT_CORRELATION_WINDOW_SECONDS } from "../src/rules/timingCorrelation.js";
import type { Flow } from "../src/types.js";

test("flags a settlement that lands inside the correlation window", () => {
  const flow: Flow = {
    flowId: "flow-timing-1",
    events: [
      { id: "e1", kind: "intent_submit", timestamp: 1000, intentId: "i1", sourcePool: "orchard", amountZec: 1, destChain: "ethereum", destAsset: "ETH" },
      { id: "e2", kind: "settlement", timestamp: 1045, intentId: "i1", destChain: "ethereum", destAddress: "0xabc", destAmount: 0.98 },
    ],
  };

  const findings = timingCorrelation(flow);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, RULE_ID);
  assert.equal(findings[0]?.severity, "medium");
});

test("does not flag a settlement outside the correlation window", () => {
  const flow: Flow = {
    flowId: "flow-timing-2",
    events: [
      { id: "e1", kind: "intent_submit", timestamp: 1000, intentId: "i1", sourcePool: "orchard", amountZec: 1, destChain: "ethereum", destAsset: "ETH" },
      { id: "e2", kind: "settlement", timestamp: 1000 + DEFAULT_CORRELATION_WINDOW_SECONDS + 1, intentId: "i1", destChain: "ethereum", destAddress: "0xabc", destAmount: 0.98 },
    ],
  };

  const findings = timingCorrelation(flow);
  assert.equal(findings.length, 0);
});

test("respects a custom window argument", () => {
  const flow: Flow = {
    flowId: "flow-timing-3",
    events: [
      { id: "e1", kind: "intent_submit", timestamp: 1000, intentId: "i1", sourcePool: "orchard", amountZec: 1, destChain: "ethereum", destAsset: "ETH" },
      { id: "e2", kind: "settlement", timestamp: 1050, intentId: "i1", destChain: "ethereum", destAddress: "0xabc", destAmount: 0.98 },
    ],
  };

  assert.equal(timingCorrelation(flow, 30).length, 0);
  assert.equal(timingCorrelation(flow, 60).length, 1);
});

test("ignores settlements with no matching intentId", () => {
  const flow: Flow = {
    flowId: "flow-timing-4",
    events: [
      { id: "e1", kind: "intent_submit", timestamp: 1000, intentId: "i1", sourcePool: "orchard", amountZec: 1, destChain: "ethereum", destAsset: "ETH" },
      { id: "e2", kind: "settlement", timestamp: 1010, intentId: "i2", destChain: "ethereum", destAddress: "0xabc", destAmount: 0.98 },
    ],
  };

  assert.equal(timingCorrelation(flow).length, 0);
});
