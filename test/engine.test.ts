import { test } from "node:test";
import assert from "node:assert/strict";
import { runAudit, RULESET_VERSION } from "../src/engine.js";
import type { Flow, Rule, Finding } from "../src/types.js";

const emptyFlow: Flow = { flowId: "f1", events: [] };

function fakeRule(id: string, findings: Finding[]): Rule {
  return (_flow: Flow) => {
    void id;
    return findings;
  };
}

test("overall result is fail when any finding is high severity", () => {
  const rules: Rule[] = [
    fakeRule("a", [{ ruleId: "a", severity: "info", message: "m", eventIds: [] }]),
    fakeRule("b", [{ ruleId: "b", severity: "high", message: "m", eventIds: [] }]),
  ];

  const report = runAudit(emptyFlow, rules, () => 1234);
  assert.equal(report.overallResult, "fail");
  assert.equal(report.findings.length, 2);
});

test("missing evidence prevents a privacy pass even when the worst finding is medium", () => {
  const rules: Rule[] = [
    fakeRule("a", [{ ruleId: "a", severity: "info", message: "m", eventIds: [] }]),
    fakeRule("b", [{ ruleId: "b", severity: "medium", message: "m", eventIds: [] }]),
  ];

  const report = runAudit(emptyFlow, rules, () => 1234);
  assert.equal(report.overallResult, "insufficient");
});

test("missing evidence prevents a privacy pass with no findings or only info", () => {
  const rulesNoFindings: Rule[] = [fakeRule("a", [])];
  assert.equal(runAudit(emptyFlow, rulesNoFindings, () => 1).overallResult, "insufficient");

  const rulesInfoOnly: Rule[] = [
    fakeRule("a", [{ ruleId: "a", severity: "info", message: "m", eventIds: [] }]),
  ];
  assert.equal(runAudit(emptyFlow, rulesInfoOnly, () => 1).overallResult, "insufficient");
});

test("report carries flowId, ruleset version, and injected timestamp", () => {
  const report = runAudit(emptyFlow, [], () => 999);
  assert.equal(report.flowId, "f1");
  assert.equal(report.rulesetVersion, RULESET_VERSION);
  assert.equal(report.generatedAt, 999);
  assert.deepEqual(report.findings, []);
});

test("findings are the concatenation of every rule's output, in rule order", () => {
  const rules: Rule[] = [
    fakeRule("a", [{ ruleId: "a", severity: "info", message: "first", eventIds: [] }]),
    fakeRule("b", [{ ruleId: "b", severity: "info", message: "second", eventIds: [] }]),
  ];
  const report = runAudit(emptyFlow, rules, () => 1);
  assert.deepEqual(
    report.findings.map((f) => f.message),
    ["first", "second"],
  );
});
