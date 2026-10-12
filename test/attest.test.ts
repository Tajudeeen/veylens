import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateKeyPair,
  signReport,
  verifySignedReport,
  hashReport,
} from "../src/attest.js";
import type { Report } from "../src/types.js";

const sampleReport: Report = {
  flowId: "f1",
  rulesetVersion: "1.0.0",
  generatedAt: 1234,
  findings: [
    { ruleId: "refund-address-reuse", severity: "high", message: "m", eventIds: ["e1"] },
  ],
  overallResult: "fail",
};

test("a freshly signed report verifies", () => {
  const { privateKeyPem } = generateKeyPair();
  const signed = signReport(sampleReport, privateKeyPem);
  const result = verifySignedReport(signed);
  assert.equal(result.valid, true);
});

test("hashing is deterministic for the same report content", () => {
  const h1 = hashReport(sampleReport);
  const h2 = hashReport({ ...sampleReport });
  assert.equal(h1, h2);
});

test("rejects a report whose content was tampered with after signing", () => {
  const { privateKeyPem } = generateKeyPair();
  const signed = signReport(sampleReport, privateKeyPem);

  const tampered = {
    ...signed,
    report: { ...signed.report, overallResult: "pass" as const },
  };

  const result = verifySignedReport(tampered);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /hash mismatch/);
});

test("rejects a report with a corrupted signature", () => {
  const { privateKeyPem } = generateKeyPair();
  const signed = signReport(sampleReport, privateKeyPem);

  const corrupted = {
    ...signed,
    signature: Buffer.from("not a real signature").toString("base64"),
  };

  const result = verifySignedReport(corrupted);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /signature does not verify/);
});

test("rejects a report signed with one key but presented with another key's public half", () => {
  const { privateKeyPem } = generateKeyPair();
  const otherKeyPair = generateKeyPair();
  const signed = signReport(sampleReport, privateKeyPem);

  const swapped = { ...signed, publicKeyPem: otherKeyPair.publicKeyPem };

  const result = verifySignedReport(swapped);
  assert.equal(result.valid, false);
});
