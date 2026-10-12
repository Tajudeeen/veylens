import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { JSDOM } from "jsdom";
import { buildAppHtml } from "../src/web/build.js";
import { renderSitePages } from "../src/web/page.js";
import { signReport, generateKeyPair } from "../src/attest.js";
import { runAudit } from "../src/engine.js";
import { LEAK_FLOW } from "../src/web/samples.js";

let pages: Record<string, string>;
before(async () => {
  const html = await buildAppHtml();
  const js = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(js);
  pages = renderSitePages({ js, version: "0.4.0" });
});
function load(file: string, query = ""): JSDOM {
  return new JSDOM(pages[file], {
    url: `https://veylens.test/${file}${query}`, runScripts: "dangerously", pretendToBeVisual: true,
    beforeParse(w) {
      Object.defineProperty(w, "crypto", { value: webcrypto });
      Object.defineProperty(w, "TextEncoder", { value: TextEncoder });
      w.sessionStorage.setItem("veylens-splash-seen", "1");
    },
  });
}
async function until(check: () => boolean): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise(r => setTimeout(r, 10));
  }
  assert.fail("Page did not finish its operation");
}
test("four distinct documents, landing CTA targets workspace, no audit controls on landing", () => {
  assert.deepEqual(Object.keys(pages), ["index.html", "workspace.html", "verify.html", "methodology.html"]);
  const home = load("index.html");
  assert.equal(home.window.document.getElementById("flow-input"), null);
  assert.ok(home.window.document.querySelector('a.btn-primary[href="workspace.html"]'));
  home.window.close();
});
test("all local navigation targets exist, page IDs are unique, current location is announced", () => {
  for (const [file, html] of Object.entries(pages)) {
    const dom = load(file);
    const doc = dom.window.document;
    const ids = [...doc.querySelectorAll("[id]")].map(n => n.id);
    assert.equal(new Set(ids).size, ids.length, file);
    assert.equal(doc.querySelectorAll("h1").length, 1, file);
    assert.ok(doc.querySelector(`a[aria-current="page"][href="${file}"]`));
    for (const a of doc.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href") as string;
      if (href.startsWith("#")) assert.ok(doc.getElementById(href.slice(1)), href);
      else if (!href.startsWith("https://")) assert.ok(pages[href.split("?")[0] as string], href);
    }
    dom.window.close();
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] as string;
    assert.ok(html.includes(`sha256-${createHash("sha256").update(script).digest("base64")}`));
    assert.ok(html.includes("default-src &#39;none&#39;"));
  }
});
test("workspace query loads a fixture, audits without landing/verifier controls, clears stale results", async () => {
  const dom = load("workspace.html", "?example=leak");
  const doc = dom.window.document;
  const input = doc.getElementById("flow-input") as HTMLTextAreaElement;
  assert.equal(JSON.parse(input.value).flowId, LEAK_FLOW.flowId);
  assert.equal(doc.getElementById("hero-load-case"), null);
  assert.equal(doc.getElementById("v-run"), null);
  doc.getElementById("run")!.click();
  await until(() => !doc.getElementById("results")!.hidden);
  assert.equal(doc.getElementById("r-verdict")!.dataset["result"], "fail");
  input.value = "bad JSON";
  input.dispatchEvent(new dom.window.Event("input"));
  assert.ok(doc.getElementById("results")!.hidden);
  doc.getElementById("run")!.click();
  await until(() => !doc.getElementById("error")!.hidden);
  assert.ok(doc.getElementById("results")!.hidden);
  dom.window.close();
});
test("separate verifier checks a CLI report and rejects tampered findings", async () => {
  const dom = load("verify.html");
  const doc = dom.window.document;
  const signed = signReport(runAudit(LEAK_FLOW), generateKeyPair().privateKeyPem);
  const input = doc.getElementById("v-in") as HTMLTextAreaElement;
  input.value = JSON.stringify(signed);
  doc.getElementById("v-run")!.click();
  await until(() => doc.getElementById("v-out")!.dataset["state"] === "ok");
  signed.report.findings = [];
  input.value = JSON.stringify(signed);
  doc.getElementById("v-run")!.click();
  await until(() => doc.getElementById("v-out")!.dataset["state"] === "bad");
  assert.match(doc.getElementById("v-out")!.textContent ?? "", /hash mismatch/);
  dom.window.close();
});
test("methodology states missing integrations rather than implying live verification", () => {
  const dom = load("methodology.html");
  const text = dom.window.document.body.textContent ?? "";
  assert.match(text, /No dependency or direct integration/);
  assert.match(text, /Exported getrawtransaction data can be imported locally/);
  assert.match(text, /Insufficient evidence/);
  assert.match(text, /does not establish that every submission must integrate all/);
  dom.window.close();
});
