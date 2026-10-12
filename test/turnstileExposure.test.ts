import { test } from "node:test";
import assert from "node:assert/strict";
import { turnstileExposure, RULE_ID } from "../src/rules/turnstileExposure.js";
import type { Flow } from "../src/types.js";

test("reports a turnstile migration as info, not a failure", () => {
  const flow: Flow = {
    flowId: "flow-migrate-1",
    events: [
      { id: "e1", kind: "migrate", timestamp: 100, fromPool: "orchard", toPool: "ironwood", amountZec: 5, turnstile: true },
    ],
  };

  const findings = turnstileExposure(flow);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, RULE_ID);
  assert.equal(findings[0]?.severity, "info");
});

test("does not flag a migration that didn't go through the turnstile", () => {
  const flow: Flow = {
    flowId: "flow-migrate-2",
    events: [
      { id: "e1", kind: "migrate", timestamp: 100, fromPool: "orchard", toPool: "ironwood", amountZec: 5, turnstile: false },
    ],
  };

  assert.equal(turnstileExposure(flow).length, 0);
});

test("returns no findings on a flow with no migration", () => {
  const flow: Flow = { flowId: "flow-migrate-3", events: [] };
  assert.equal(turnstileExposure(flow).length, 0);
});
