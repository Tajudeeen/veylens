import { test, before } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { buildAppHtml } from "../src/web/build.js";
import { LEAK_FLOW, CLEAN_FLOW } from "../src/web/samples.js";
import { verifySignedReport, signReport, generateKeyPair } from "../src/attest.js";
import { runAudit } from "../src/engine.js";
import type { SignedReport } from "../src/attest.js";

let html = "";
before(async () => {
  html = await buildAppHtml();
});

interface Opts {
  seenSplash?: boolean;
  reduced?: boolean;
  crypto?: unknown;
}

function load(opts: Opts = {}): JSDOM {
  return new JSDOM(html, {
    url: "https://veylens.test/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    beforeParse(window) {
      Object.defineProperty(window, "crypto", { value: opts.crypto ?? webcrypto, configurable: true });
      (window as unknown as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
      if (opts.seenSplash) window.sessionStorage.setItem("veylens-splash-seen", "1");
      if (opts.reduced) {
        (window as unknown as { matchMedia: unknown }).matchMedia = () => ({ matches: true });
      }
    },
  });
}

const $ = (dom: JSDOM, id: string): HTMLElement => dom.window.document.getElementById(id) as HTMLElement;
const area = (dom: JSDOM, id: string): HTMLTextAreaElement => $(dom, id) as HTMLTextAreaElement;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function until(cond: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (cond()) return;
    await sleep(10);
  }
  assert.fail(`timed out waiting for ${label}`);
}

async function runLeak(dom: JSDOM): Promise<void> {
  $(dom, "load-leak").click();
  $(dom, "run").click();
  await until(() => !$(dom, "results").hidden, "results");
}

// ---- splash ----

test("splash shows on first visit, locks scroll, and any click releases it", async () => {
  const dom = load();
  const doc = dom.window.document;
  assert.ok($(dom, "splash"));
  assert.ok(doc.body.classList.contains("is-splashing"));
  const behind = ["main", ".site-header", ".site-footer", ".skip-link"].map((q) => doc.querySelector(q.startsWith(".") ? q : `#${q}`) as Element);
  assert.equal(behind.length, 4);
  for (const n of behind) assert.ok(n.hasAttribute("inert"), `${n.tagName} should be inert behind the splash`);

  $(dom, "splash").click();
  assert.ok(!doc.body.classList.contains("is-splashing"));
  for (const n of behind) assert.ok(!n.hasAttribute("inert"), `${n.tagName} should be released`);
  await until(() => doc.getElementById("splash") === null, "splash removal");
  assert.equal(dom.window.sessionStorage.getItem("veylens-splash-seen"), "1");
});

test("splash is skipped for the rest of the session", () => {
  const dom = load({ seenSplash: true });
  assert.equal(dom.window.document.getElementById("splash"), null);
  assert.ok(!dom.window.document.body.classList.contains("is-splashing"));
  assert.ok(!$(dom, "main").hasAttribute("inert"));
});

test("a key press skips the splash", async () => {
  const dom = load();
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape" }));
  await until(() => dom.window.document.getElementById("splash") === null, "splash removal");
});

test("reduced motion: splash leaves with no fade class", () => {
  const dom = load({ reduced: true });
  $(dom, "splash").click();
  assert.equal(dom.window.document.getElementById("splash"), null);
});

// ---- audit ----

test("the leak case fails, marks the two linked events, and signs a report Node can verify", async () => {
  const dom = load({ seenSplash: true });
  await runLeak(dom);

  assert.equal($(dom, "r-verdict").textContent, "Failed");
  assert.equal($(dom, "r-verdict").dataset["result"], "fail");
  assert.equal(dom.window.document.querySelectorAll("#r-findings .finding.high").length, 1);
  assert.equal(dom.window.document.querySelectorAll("#r-timeline .ev").length, 4);
  const involved = [...dom.window.document.querySelectorAll("#r-timeline .ev.involved .ev-meta")].map((n) => n.textContent);
  assert.deepEqual(involved.map((t) => (t as string).split(",")[0]), ["e1", "e4"]);

  const signed = JSON.parse(area(dom, "r-signed").value) as SignedReport;
  assert.deepEqual(verifySignedReport(signed), { valid: true });
  assert.equal(signed.report.overallResult, "fail");
  assert.deepEqual(signed.report.findings, runAudit(LEAK_FLOW, undefined, () => 0).findings);
});

test("the corrected fixture has no findings but lacks authenticated evidence", async () => {
  const dom = load({ seenSplash: true });
  $(dom, "load-clean").click();
  $(dom, "run").click();
  await until(() => !$(dom, "results").hidden, "results");
  assert.equal($(dom, "r-verdict").textContent, "Insufficient evidence");
  assert.equal(dom.window.document.querySelectorAll("#r-findings .finding.high").length, 0);
  assert.match($(dom, "r-findings").textContent ?? "", /No leak patterns/);
  assert.equal(dom.window.document.querySelectorAll("#r-timeline .ev.involved").length, 0);
});

test("the hero button loads the case and runs it in one tap", async () => {
  const dom = load({ seenSplash: true });
  $(dom, "hero-load-case").click();
  await until(() => !$(dom, "results").hidden, "results");
  assert.equal($(dom, "r-verdict").textContent, "Failed");
  assert.equal(JSON.parse(area(dom, "flow-input").value).flowId, LEAK_FLOW.flowId);
});

test("opening a file runs it", async () => {
  const dom = load({ seenSplash: true });
  const file = new dom.window.File([JSON.stringify(CLEAN_FLOW)], "clean.json", { type: "application/json" });
  const input = $(dom, "file-input") as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file] });
  input.dispatchEvent(new dom.window.Event("change"));
  await until(() => !$(dom, "results").hidden, "results");
  assert.equal($(dom, "r-verdict").textContent, "Insufficient evidence");
});

// ---- bad input ----

test("empty, non-JSON and schema-invalid input each give a clear error and no results", async () => {
  const dom = load({ seenSplash: true });

  $(dom, "run").click();
  await until(() => !$(dom, "error").hidden, "empty error");
  assert.match($(dom, "error").textContent ?? "", /Paste a flow first/);

  area(dom, "flow-input").value = "{ not json";
  $(dom, "run").click();
  await until(() => /valid JSON/.test($(dom, "error").textContent ?? ""), "json error");

  area(dom, "flow-input").value = JSON.stringify({ flowId: "x", events: [{ id: "e1", kind: "shield", timestamp: 1, fromAddress: "t1", toPool: "orchard", amountZec: -5 }] });
  $(dom, "run").click();
  await until(() => /events\[0\]\.amountZec/.test($(dom, "error").textContent ?? ""), "schema error");

  assert.ok($(dom, "results").hidden);
});

test("a successful run clears an earlier error", async () => {
  const dom = load({ seenSplash: true });
  area(dom, "flow-input").value = "nope";
  $(dom, "run").click();
  await until(() => !$(dom, "error").hidden, "error");
  await runLeak(dom);
  assert.ok($(dom, "error").hidden);
});

test("hostile strings in a valid flow render as text, never as markup", async () => {
  const dom = load({ seenSplash: true });
  const evil = {
    flowId: `<img src=x onerror=alert(1)>`,
    events: [
      { id: `<b>e1</b>`, kind: "shield", timestamp: 1, fromAddress: `<script>alert(2)</script>`, toPool: "orchard", amountZec: 1 },
      { id: "e2", kind: "refund", timestamp: 2, intentId: "i", toAddress: `<script>alert(2)</script>`, amountZec: 1, shielded: false },
    ],
  };
  area(dom, "flow-input").value = JSON.stringify(evil);
  $(dom, "run").click();
  await until(() => !$(dom, "results").hidden, "results");

  const doc = dom.window.document;
  assert.equal(doc.querySelectorAll("img").length, 0);
  assert.equal(doc.querySelectorAll("#results script, #results b").length, 0);
  assert.ok(($(dom, "r-flow").textContent ?? "").includes("<img src=x onerror=alert(1)>"));
  assert.ok(($(dom, "r-timeline").textContent ?? "").includes("<script>alert(2)</script>"));
});

// ---- verification ----

test("Verify again accepts the untouched report and catches an edit", async () => {
  const dom = load({ seenSplash: true });
  await runLeak(dom);

  $(dom, "reverify").click();
  await until(() => $(dom, "r-verify").dataset["state"] === "ok", "valid");
  assert.match($(dom, "r-verify").textContent ?? "", /^Valid\./);

  const signed = JSON.parse(area(dom, "r-signed").value) as SignedReport;
  signed.report.overallResult = "pass";
  area(dom, "r-signed").value = JSON.stringify(signed);
  $(dom, "reverify").click();
  await until(() => $(dom, "r-verify").dataset["state"] === "bad", "invalid");
  assert.match($(dom, "r-verify").textContent ?? "", /^Invalid\. report hash mismatch/);

  area(dom, "r-signed").value = "{{";
  $(dom, "reverify").click();
  await until(() => /valid JSON/.test($(dom, "r-verify").textContent ?? ""), "json invalid");
});

test("the standalone verifier accepts a report signed by the Node CLI path", async () => {
  const dom = load({ seenSplash: true });
  const signed = signReport(runAudit(LEAK_FLOW), generateKeyPair().privateKeyPem);
  area(dom, "v-in").value = JSON.stringify(signed);
  $(dom, "v-run").click();
  await until(() => $(dom, "v-out").dataset["state"] === "ok", "valid");

  area(dom, "v-in").value = JSON.stringify({ ...signed, signature: "AAAA" });
  $(dom, "v-run").click();
  await until(() => $(dom, "v-out").dataset["state"] === "bad", "invalid");
});

test("garbage that parses as JSON but isn't a report is reported as malformed, not a crash", async () => {
  const dom = load({ seenSplash: true });
  for (const junk of ["null", "42", "{}", `{"report":5}`]) {
    area(dom, "v-in").value = junk;
    $(dom, "v-run").click();
    await until(() => $(dom, "v-out").dataset["state"] === "bad", `malformed ${junk}`);
    assert.match($(dom, "v-out").textContent ?? "", /^Invalid\./);
    $(dom, "v-out").removeAttribute("data-state");
  }
});

// ---- export ----

test("download names the file safely and hands over the exact report text", async () => {
  const dom = load({ seenSplash: true });
  const w = dom.window as unknown as { URL: { createObjectURL: (b: Blob) => string; revokeObjectURL: () => void }; HTMLAnchorElement: { prototype: { click: () => void } } };
  let blob: Blob | undefined;
  let name = "";
  w.URL.createObjectURL = (b: Blob) => ((blob = b), "blob:x");
  w.URL.revokeObjectURL = () => undefined;
  w.HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    name = this.download;
  };

  const flow = { ...LEAK_FLOW, flowId: "a/b<c>..\\d" };
  area(dom, "flow-input").value = JSON.stringify(flow);
  $(dom, "run").click();
  await until(() => !$(dom, "results").hidden, "results");
  $(dom, "download-signed").click();

  assert.equal(name, "a_b_c_.._d.signed-report.json");
  assert.ok(!/[\\/<>]/.test(name));
  assert.equal(blob?.size, Buffer.byteLength(area(dom, "r-signed").value));
});

test("download filenames never start with dots, even for traversal-style flow ids", async () => {
  const dom = load({ seenSplash: true });
  const w = dom.window as unknown as { URL: { createObjectURL: () => string; revokeObjectURL: () => void }; HTMLAnchorElement: { prototype: { click: () => void } } };
  let name = "";
  w.URL.createObjectURL = () => "blob:x";
  w.URL.revokeObjectURL = () => undefined;
  w.HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    name = this.download;
  };
  for (const [id, expected] of [["../../x", "_.._x.signed-report.json"], ["...", "report.signed-report.json"]] as const) {
    area(dom, "flow-input").value = JSON.stringify({ ...LEAK_FLOW, flowId: id });
    $(dom, "run").click();
    await until(() => $(dom, "r-flow").textContent === id, "render");
    $(dom, "download-signed").click();
    assert.equal(name, expected);
  }
});

// ---- degraded browser ----

test("a browser without Ed25519 still shows the audit, says why, and hides the signature block", async () => {
  const noEd = {
    subtle: {
      digest: (alg: string, data: unknown) => webcrypto.subtle.digest(alg, data as never),
      generateKey: async () => {
        throw new DOMException("unsupported", "NotSupportedError");
      },
    },
  };
  const dom = load({ seenSplash: true, crypto: noEd });
  await runLeak(dom);
  assert.equal($(dom, "r-verdict").textContent, "Failed");
  assert.ok($(dom, "r-attest").hidden);
  assert.match($(dom, "error").textContent ?? "", /can't do Ed25519/);
});
