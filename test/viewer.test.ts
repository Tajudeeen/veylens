import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { renderHtmlReport, escapeHtml } from "../src/viewer.js";
import { VERIFY_SCRIPT } from "../src/verifyScript.js";
import { generateKeyPair, signReport, canonicalize, hashReport, type SignedReport } from "../src/attest.js";
import type { Report } from "../src/types.js";

const report: Report = {
  flowId: "f1",
  rulesetVersion: "1.0.0",
  generatedAt: 1761050000,
  findings: [
    { ruleId: "refund-address-reuse", severity: "high", message: "reused address", eventIds: ["e4", "e1"] },
    { ruleId: "timing-correlation", severity: "medium", message: "close in time", eventIds: ["e2", "e3"] },
    { ruleId: "turnstile-exposure", severity: "info", message: "expected", eventIds: ["e9"] },
  ],
  overallResult: "fail",
};

function sign(r: Report): SignedReport {
  return signReport(r, generateKeyPair().privateKeyPem);
}

// Evaluates the exact script text that ships inside the HTML.
const script = new Function(`${VERIFY_SCRIPT}\nreturn { verifyReport, canonicalize };`)() as {
  verifyReport: (s: SignedReport) => Promise<{ valid: boolean; reason?: string }>;
  canonicalize: (r: Report) => string;
};

test("html carries the Zcash palette and the verdict", () => {
  const html = renderHtmlReport(sign(report));
  assert.ok(html.includes("#F4B728"));
  assert.ok(html.includes("#231F20"));
  assert.ok(html.includes("<h1>Failed</h1>"));
});

test("a passing report reads Passed, not Failed", () => {
  const html = renderHtmlReport(sign({ ...report, findings: [], overallResult: "pass" }));
  assert.ok(html.includes("<h1>Passed</h1>"));
  assert.ok(html.includes("No findings."));
});

test("escapeHtml neutralizes all five dangerous characters", () => {
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
});

test("untrusted flow data cannot inject markup or break out of the data script", () => {
  const evil: Report = {
    ...report,
    flowId: `<img src=x onerror=alert(1)>`,
    findings: [
      {
        ruleId: `"><script>alert(2)</script>`,
        severity: "high",
        message: `</script><script>alert(3)</script>`,
        eventIds: [`<b>e1</b>`],
      },
    ],
  };
  const html = renderHtmlReport(sign(evil));

  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes("</script><script>alert"));
  assert.ok(!html.includes("<b>e1</b>"));
  // exactly two script elements: the JSON data block and the verifier
  assert.equal((html.match(/<script/g) ?? []).length, 2);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 2);
});

test("embedded JSON round-trips to the exact signed report", () => {
  const signed = sign({ ...report, flowId: `a<b>"c` });
  const html = renderHtmlReport(signed);
  const match = html.match(/<script type="application\/json" id="signed-report">([\s\S]*?)<\/script>/);
  assert.ok(match);
  assert.deepEqual(JSON.parse(match[1] as string), signed);
});

test("CSP pins script-src to the hash of the inline verifier and blocks the network", () => {
  const html = renderHtmlReport(sign(report));
  const inline = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inline);
  const hash = createHash("sha256").update(inline[1] as string).digest("base64");
  // Check the policy as a browser parses it: entity-decoded attribute value.
  const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  assert.ok(meta);
  const policy = (meta[1] as string).replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  assert.ok(policy.includes(`script-src 'sha256-${hash}'`));
  assert.ok(policy.includes("default-src 'none'"));
  assert.ok(!policy.includes("unsafe-eval"));
});

test("in-page canonicalization is byte-identical to attest.canonicalize", () => {
  assert.equal(script.canonicalize(report), canonicalize(report));
});

test("in-page verifier accepts a freshly signed report", async () => {
  const result = await script.verifyReport(sign(report));
  assert.equal(result.valid, true);
});

test("in-page verifier rejects a tampered report", async () => {
  const signed = sign(report);
  const tampered = { ...signed, report: { ...signed.report, overallResult: "pass" as const } };
  const result = await script.verifyReport(tampered);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /hash mismatch/);
});

test("in-page verifier rejects a swapped public key", async () => {
  const signed = sign(report);
  const swapped = { ...signed, publicKeyPem: generateKeyPair().publicKeyPem };
  const result = await script.verifyReport(swapped);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /signature does not verify/);
});

test("in-page verifier reports malformed input instead of throwing", async () => {
  const signed = sign(report);
  const broken = { ...signed, signature: "***not base64***" };
  const result = await script.verifyReport(broken);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /malformed/);
});

test("hash computed in-page matches the hash computed by attest", async () => {
  const signed = sign(report);
  assert.equal(signed.reportHash, hashReport(report));
  assert.equal((await script.verifyReport(signed)).valid, true);
});
