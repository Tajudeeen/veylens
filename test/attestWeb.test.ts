import { test } from "node:test";
import assert from "node:assert/strict";
import { signReportWeb, verifySignedReportWeb, hashReportWeb } from "../src/web/attestWeb.js";
import { generateKeyPair, signReport, verifySignedReport, hashReport } from "../src/attest.js";
import type { Report } from "../src/types.js";

const report: Report = {
  flowId: "f1",
  rulesetVersion: "1.0.0",
  generatedAt: 1761050000,
  findings: [{ ruleId: "refund-address-reuse", severity: "high", message: "m \u00e9 <b>", eventIds: ["e4", "e1"] }],
  overallResult: "fail",
};

test("browser and Node hash the same report to the same value", async () => {
  assert.equal(await hashReportWeb(report), hashReport(report));
});

test("a report signed in the browser verifies with the Node verifier", async () => {
  const signed = await signReportWeb(report);
  assert.deepEqual(verifySignedReport(signed), { valid: true });
});

test("a report signed by Node verifies with the browser verifier", async () => {
  const signed = signReport(report, generateKeyPair().privateKeyPem);
  assert.deepEqual(await verifySignedReportWeb(signed), { valid: true });
});

test("browser verifier rejects tampering, key swaps and malformed input", async () => {
  const signed = await signReportWeb(report);

  const tampered = { ...signed, report: { ...signed.report, overallResult: "pass" as const } };
  const t = await verifySignedReportWeb(tampered);
  assert.equal(t.valid, false);
  assert.match(t.reason ?? "", /hash mismatch/);

  const swapped = { ...signed, publicKeyPem: generateKeyPair().publicKeyPem };
  const s = await verifySignedReportWeb(swapped);
  assert.equal(s.valid, false);
  assert.match(s.reason ?? "", /signature does not verify/);

  const m = await verifySignedReportWeb({ ...signed, signature: "***" });
  assert.equal(m.valid, false);
  assert.match(m.reason ?? "", /malformed/);
});

test("each browser signing run uses a fresh key", async () => {
  const a = await signReportWeb(report);
  const b = await signReportWeb(report);
  assert.notEqual(a.publicKeyPem, b.publicKeyPem);
});
