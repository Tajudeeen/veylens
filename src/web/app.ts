import {isCase,reviewCase} from '../case.js';
import { isZcashEvidence, reviewZcashEvidence, wrapNodeTransaction } from "../zcashEvidence.js";
import type { Finding, Flow, Report } from "../types.js";
import { isProviderInput, reviewProviderInput, digestInput, checkSourceRecord, declaredEvidence } from "../evidence.js";
import type { SignedReport } from "../attest.js";
import { runAudit } from "../engine.js";
import { parseFlow } from "../validate.js";
import { VERDICT, SEVERITY_LABEL, summarize } from "../summary.js";
import { signReportWeb, verifySignedReportWeb } from "./attestWeb.js";
import { describeEvent, offsetLabel } from "./describe.js";

const MAX_INPUT_CHARS = 2_000_000;
const NO_ED25519 =
  "This browser can't do Ed25519 signatures, so it can't sign or check reports. Use the veylens command line tool for that.";

const SPLASH_KEY = "veylens-splash-seen";
const SPLASH_MS = 1700;
const SPLASH_REDUCED_MS = 800;

function sessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function sessionSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage can be blocked; the splash then simply shows each load */
  }
}

export function initSplash(doc: Document): void {
  const splash = doc.getElementById("splash");
  const behind = ["main", "site-header", "site-footer", "skip-link"]
    .map((k) => doc.getElementById(k) ?? doc.querySelector(`.${k}`))
    .filter((n): n is Element => n !== null);
  const release = (): void => {
    doc.body.classList.remove("is-splashing");
    for (const n of behind) n.removeAttribute("inert");
  };

  if (!splash) {
    release();
    return;
  }
  if (sessionGet(SPLASH_KEY)) {
    splash.remove();
    release();
    return;
  }

  for (const n of behind) n.setAttribute("inert", "");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  let finished = false;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    sessionSet(SPLASH_KEY, "1");
    release();
    if (reduced) {
      splash.remove();
      return;
    }
    splash.classList.add("is-leaving");
    window.setTimeout(() => splash.remove(), 260);
  };

  window.setTimeout(finish, reduced ? SPLASH_REDUCED_MS : SPLASH_MS);
  splash.addEventListener("click", finish);
  doc.addEventListener("keydown", finish, { once: true });
  doc.addEventListener("touchstart", finish, { once: true, passive: true });
}

type Child = Node | string;

function el(tag: string, className: string | null, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const c of children) node.append(c);
  return node;
}
const byId = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

function showError(title: string, items: string[] = []): void {
  const box = byId("error");
  box.replaceChildren(el("p", null, title));
  if (items.length > 0) {
    const ul = el("ul", null);
    for (const i of items) ul.append(el("li", null, i));
    box.append(ul);
  }
  box.hidden = false;
}
const clearError = (): void => {
  byId("error").hidden = true;
  byId("error").replaceChildren();
};

function setStatus(id: string, text: string, state?: "ok" | "bad"): void {
  const node = byId(id);
  node.textContent = text;
  if (state) node.dataset["state"] = state;
  else delete node.dataset["state"];
}

function renderFinding(f: Finding): HTMLElement {
  const head = el("h4", null, el("span", "sev", SEVERITY_LABEL[f.severity]), " ", el("code", null, f.ruleId));
  const events = el("p", "ev-meta", "Events ");
  f.eventIds.forEach((id, i) => {
    if (i > 0) events.append(" ");
    events.append(el("code", null, id));
  });
  return el("li", `finding ${f.severity}`, head, el("p", null, f.message), events);
}

function renderTimeline(flow: Flow, findings: Finding[]): HTMLElement[] {
  const rulesByEvent = new Map<string, string[]>();
  for (const f of findings) {
    if (f.severity === "info") continue;
    for (const id of f.eventIds) rulesByEvent.set(id, [...(rulesByEvent.get(id) ?? []), f.ruleId]);
  }
  const first = flow.events[0]?.timestamp ?? 0;
  return flow.events.map((e) => {
    const rules = rulesByEvent.get(e.id) ?? [];
    const li = el("li", rules.length > 0 ? "ev involved" : "ev", el("span", "dot"), el("p", "ev-title", describeEvent(e)), el("p", "ev-meta", `${e.id}, ${offsetLabel(e.timestamp, first)}`));
    if (rules.length > 0) {
      const chips = el("div", "chips");
      for (const r of new Set(rules)) chips.append(el("span", "chip", r));
      li.append(chips);
    }
    return li;
  });
}

let currentFlowId = "report";

function render(report: Report, flow: Flow | null, signed: SignedReport | null): void {
  currentFlowId = report.flowId;
  byId("r-flow").textContent = report.flowId;
  const verdict = byId("r-verdict");
  verdict.textContent = document.getElementById("risk-status") ? (report.findings.some(f=>f.severity==="high") ? "High risk signal" : report.findings.some(f=>f.severity==="medium") ? "Risk signals found" : "No covered pattern matched") : VERDICT[report.overallResult];
  const coverage = document.getElementById("risk-status");
  if (coverage) coverage.textContent = "Evidence incomplete. " + (report.evidence?.gaps.join(" ") ?? "This is a supplied flow description.");
  verdict.dataset["result"] = report.overallResult;
  byId("r-summary").textContent = summarize(report.findings, report.overallResult);

  byId("r-findings").replaceChildren(
    ...(report.findings.length === 0
      ? [el("li", "finding info", "No leak patterns from the ruleset matched this flow.")]
      : report.findings.map(renderFinding)),
  );
  byId("r-timeline").replaceChildren(...(flow ? renderTimeline(flow, report.findings) :
    (report.evidence?.facts ?? []).map(f => el("li", "ev", el("span", "dot"), el("p", "ev-title", `${f.path}: ${f.value}`), el("p", "ev-meta", f.trust)))));
  const evidenceBox = byId("r-evidence");
  if (evidenceBox && report.evidence) {
    evidenceBox.replaceChildren(el("h3", "sub", "Evidence and coverage"), el("p", null, report.evidence.scope),
      el("p", "fine", `Quote signature: ${report.evidence.quoteSignature ?? "not applicable"}. Coverage: ${report.evidence.coverage}.`),
      el("p", "fine", "Canonical input SHA-256: ", el("code", null, report.evidence.inputDigest)),
      el("ul", null, ...report.evidence.gaps.map(g => el("li", null, g))));
  }

  const checkpoints=document.getElementById('case-checkpoints');
  if(checkpoints){const facts=report.evidence?.facts.filter(f=>f.path.startsWith('case.')||f.path.startsWith('remedy.'))??[];
    const labels:Record<string,string>={providerOrigin:'Provider record',rawRecords:'Transaction evidence',refundReceiver:'Refund receivers',refundAssociation:'Refund association',refundCandidates:'Matching refund candidates',shieldingSource:'Selected shielding transaction',refundTransaction:'Selected refund transaction'};
    checkpoints.replaceChildren(...(facts.length?[el('h3','sub','Case checkpoints and remedies'),...facts.map(f=>el('p',null,el('span',null,(labels[f.path.replace('case.','')]??f.path.replace('remedy.','Remedy for '))+': '),f.value,el('span','fine',' '+f.trust)))]:[]));}
  const attest = byId("r-attest");
  if (signed) {
    attest.hidden = false;
    byId("r-ruleset").textContent = `v${report.rulesetVersion}`;
    byId("r-generated").textContent = new Date(report.generatedAt * 1000).toISOString();
    byId("r-hash").textContent = signed.reportHash;
    byId<HTMLTextAreaElement>("r-signed").value = JSON.stringify(signed, null, 2);
    setStatus("r-verify", "");
  } else {
    attest.hidden = true;
  }

  const results = byId("results");
  results.hidden = false;
  results.focus({ preventScroll: true });
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  results.scrollIntoView?.({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

let inputRevision = 0;
export async function runAuditFromInput(): Promise<void> {
  const revision = inputRevision;
  clearError();
  byId("results").hidden = true;
  const text = byId<HTMLTextAreaElement>("flow-input").value.trim();
  if (text === "") return showError("Paste a flow first, or load one of the examples.");
  if (text.length > MAX_INPUT_CHARS) return showError("That input is too large. Flows over 2 MB aren't supported here.");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return showError("That isn't valid JSON.", ["Check for a missing comma, quote or bracket."]);
  }
  let report: Report;
  let flow: Flow | null = null;
  if (isCase(raw) || isProviderInput(raw) || isZcashEvidence(raw)) {
    const imported = isCase(raw) ? await reviewCase(raw) : isZcashEvidence(raw) ? await reviewZcashEvidence(raw) : await reviewProviderInput(raw);
    if (!imported.ok) return showError("That provider record has problems.", imported.errors);
    report = imported.report;
  } else {
    const parsed = parseFlow(raw);
    if (!parsed.ok) return showError("That flow has problems.", parsed.errors);
    flow = parsed.flow;
    report = runAudit(flow);
    report.evidence = await declaredEvidence(raw);
  }
  let signed: SignedReport | null = null;
  try {
    signed = await signReportWeb(report);
  } catch {
    showError(NO_ED25519 + " The audit result is shown below without a signature.");
  }
  if (revision === inputRevision) render(report, flow, signed);
}

export function loadInput(raw: unknown, run = false): void {
  inputRevision++;
  byId<HTMLTextAreaElement>("flow-input").value = JSON.stringify(raw, null, 2);
  clearError();
  byId("results").hidden = true;
  if (run) void runAuditFromInput();
}

export async function checkSigned(text: string, statusId: string): Promise<void> {
  if (text.length > MAX_INPUT_CHARS) return setStatus(statusId, "Invalid. Reports over 2 MB are not supported.", "bad");
  let parsed: SignedReport;
  try {
    parsed = JSON.parse(text) as SignedReport;
  } catch {
    return setStatus(statusId, "Invalid. That text isn't valid JSON.", "bad");
  }
  try {
    const r = await verifySignedReportWeb(parsed);
    if (r.valid) setStatus(statusId, "Valid. The report matches its hash and the signature verifies.", "ok");
    else setStatus(statusId, `Invalid. ${r.reason}.`, "bad");
  } catch {
    setStatus(statusId, NO_ED25519, "bad");
  }
}

function safeFileName(id: string): string {
  const base = id.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 80) || "report";
  return `${base}.signed-report.json`;
}

function initApp(): void {
  const input = byId<HTMLTextAreaElement>("flow-input");
  const run = byId<HTMLButtonElement>("run");

  const runGuarded = async (): Promise<void> => {
    run.disabled = true;
    try {
      await runAuditFromInput();
    } catch {
      showError("The review could not finish. Check browser cryptography support and the input format.");
    } finally {
      run.disabled = false;
    }
  };

  run.addEventListener("click", () => void runGuarded());
  input.addEventListener("input", () => { inputRevision++; byId("results").hidden = true; clearError(); });
  byId("wrap-node")?.addEventListener("click", () => {
    try {
      const network = (byId("zcash-network") as HTMLSelectElement).value;
      if (network !== "mainnet" && network !== "testnet") return showError("Choose the network before importing node JSON.");
      if (input.value.length > MAX_INPUT_CHARS) return showError("Input exceeds 2 MB.");
      const wrapped = wrapNodeTransaction(JSON.parse(input.value), network);
      inputRevision++; input.value = JSON.stringify(wrapped, null, 2);
      clearError(); byId("results").hidden = true;
    } catch (e) { showError(e instanceof Error ? e.message : "Could not import node JSON."); }
  });
  byId<HTMLInputElement>("file-input").addEventListener("change", (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > MAX_INPUT_CHARS) return showError("That file is too large. Flows over 2 MB aren't supported here.");
    const reader = new FileReader();
    reader.onload = () => {
      inputRevision++;
      input.value = String(reader.result ?? "");
      void runGuarded();
    };
    reader.onerror = () => showError("That file couldn't be read.");
    reader.readAsText(file);
  });

  byId("reverify").addEventListener("click", () => void checkSigned(byId<HTMLTextAreaElement>("r-signed").value, "r-verify"));
  byId("v-run")?.addEventListener("click", () => void checkSigned(byId<HTMLTextAreaElement>("v-in").value, "v-out"));

  byId("copy-signed").addEventListener("click", async () => {
    const area = byId<HTMLTextAreaElement>("r-signed");
    try {
      await navigator.clipboard.writeText(area.value);
      setStatus("r-verify", "Report copied.", "ok");
    } catch {
      area.focus();
      area.select();
      setStatus("r-verify", "Copy isn't available here. The report text is selected, so use your device's copy command.");
    }
  });

  byId("download-signed").addEventListener("click", () => {
    const blob = new Blob([byId<HTMLTextAreaElement>("r-signed").value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = el("a", null) as HTMLAnchorElement;
    a.href = url;
    a.download = safeFileName(currentFlowId);
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

async function checkSourceFromInput(): Promise<void> {
  try {
    const reportText = byId<HTMLTextAreaElement>("v-in").value;
    const sourceText = byId<HTMLTextAreaElement>("v-source").value;
    if (reportText.length > MAX_INPUT_CHARS || sourceText.length > MAX_INPUT_CHARS) return setStatus("v-source-out", "Input exceeds 2 MB.", "bad");
    const signed = JSON.parse(reportText) as SignedReport;
    const signature = await verifySignedReportWeb(signed);
    if (!signature.valid) return setStatus("v-source-out", `Invalid report. ${signature.reason}`, "bad");
    const result = await checkSourceRecord(JSON.parse(sourceText), signed.report);
    setStatus("v-source-out", result.reason, result.valid ? "ok" : "bad");
  } catch { setStatus("v-source-out", "Could not verify. Supply valid report JSON and original source JSON.", "bad"); }
}
function init(): void {
  try {
    initSplash(document);
  } catch {
    document.body.classList.remove("is-splashing");
    document.getElementById("splash")?.remove();
  }
  document.getElementById("v-source-run")?.addEventListener("click", () => void checkSourceFromInput());
  if (document.getElementById("flow-input")) {
    initApp();

  } else if (document.getElementById("v-run")) {
    byId("v-run")?.addEventListener("click", () => void checkSigned(byId<HTMLTextAreaElement>("v-in").value, "v-out"));
  }
}

if (typeof document !== "undefined") init();
