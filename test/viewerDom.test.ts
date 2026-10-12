import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { JSDOM } from "jsdom";
import { renderHtmlReport } from "../src/viewer.js";
import { generateKeyPair, signReport } from "../src/attest.js";
import type { Report } from "../src/types.js";

const report: Report = {
  flowId: "dom-flow",
  rulesetVersion: "1.0.0",
  generatedAt: 1761050000,
  findings: [{ ruleId: "refund-address-reuse", severity: "high", message: "reused", eventIds: ["e1"] }],
  overallResult: "fail",
};

function load(html: string): JSDOM {
  return new JSDOM(html, {
    runScripts: "dangerously",
    beforeParse(window) {
      Object.defineProperty(window, "crypto", { value: webcrypto, configurable: true });
      (window as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
    },
  });
}

async function clickAndRead(dom: JSDOM): Promise<{ text: string; state: string | undefined }> {
  const doc = dom.window.document;
  (doc.getElementById("verify") as HTMLButtonElement).click();
  const out = doc.getElementById("verify-result") as HTMLElement;
  for (let i = 0; i < 50 && (out.textContent === "" || out.textContent === "Checking..."); i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  return { text: out.textContent ?? "", state: out.dataset["state"] };
}

test("clicking verify on a good report says valid", async () => {
  const html = renderHtmlReport(signReport(report, generateKeyPair().privateKeyPem));
  const { text, state } = await clickAndRead(load(html));
  assert.equal(state, "ok");
  assert.match(text, /^Valid\./);
});

test("clicking verify after the embedded report is edited says invalid", async () => {
  const html = renderHtmlReport(signReport(report, generateKeyPair().privateKeyPem));
  const tampered = html.replace(`"overallResult":"fail"`, `"overallResult":"pass"`);
  assert.notEqual(tampered, html);
  const { text, state } = await clickAndRead(load(tampered));
  assert.equal(state, "bad");
  assert.match(text, /^Invalid\. report hash mismatch/);
});

test("rendered page shows the verdict and the high finding", () => {
  const dom = load(renderHtmlReport(signReport(report, generateKeyPair().privateKeyPem)));
  const doc = dom.window.document;
  assert.equal(doc.querySelector("h1")?.textContent, "Failed");
  assert.equal(doc.querySelectorAll(".finding.high").length, 1);
  assert.equal(doc.documentElement.lang, "en");
});
