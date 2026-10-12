import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runAudit } from "../src/engine.js";
import { generateKeyPair, signReport, verifySignedReport } from "../src/attest.js";
import type { Flow } from "../src/types.js";

// tsc doesn't copy non-TS assets into dist, and `npm test` always runs
// from the repo root, so resolve fixtures from cwd rather than from
// the compiled test file's own location under dist/.
const fixturesDir = join(process.cwd(), "test", "fixtures");

function loadFlow(name: string): Flow {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf-8")) as Flow;
}

test("the reconstructed Zashi CrossPay / ZachXBT flow fails the audit on refund-address-reuse", () => {
  const flow = loadFlow("zashi-crosspay-leak.json");
  const report = runAudit(flow);

  assert.equal(report.overallResult, "fail");
  const refundFindings = report.findings.filter((f) => f.ruleId === "refund-address-reuse");
  assert.equal(refundFindings.length, 1);
  assert.equal(refundFindings[0]?.severity, "high");

  // The flagship fixture is built to isolate rule 1 - no other rule
  // should fire on it, so the one finding IS the finding.
  assert.equal(report.findings.length, 1);
});

test("the ephemeral-refund fixed version of the same flow passes clean", () => {
  const flow = loadFlow("clean-flow.json");
  const report = runAudit(flow);

  assert.equal(report.overallResult, "insufficient");
  assert.equal(report.findings.length, 0);
});

test("end to end: audit, sign, and independently verify the flagship leak case", () => {
  const flow = loadFlow("zashi-crosspay-leak.json");
  const report = runAudit(flow);
  const { privateKeyPem } = generateKeyPair();
  const signed = signReport(report, privateKeyPem);

  const verification = verifySignedReport(signed);
  assert.equal(verification.valid, true);
  assert.equal(signed.report.overallResult, "fail");
});
