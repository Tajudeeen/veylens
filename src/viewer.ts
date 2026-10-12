import { createHash } from "node:crypto";
import type { Finding } from "./types.js";
import { VERDICT, SEVERITY_LABEL, summarize } from "./summary.js";
import type { SignedReport } from "./attest.js";
import { BRAND } from "./brand.js";
import { VERIFY_SCRIPT } from "./verifyScript.js";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderFinding(f: Finding): string {
  const events = f.eventIds.map((id) => `<code>${escapeHtml(id)}</code>`).join(" ");
  return `<li class="finding ${f.severity}">
  <h3><span class="sev">${SEVERITY_LABEL[f.severity]}</span> <code>${escapeHtml(f.ruleId)}</code></h3>
  <p>${escapeHtml(f.message)}</p>
  <p class="events">Events ${events}</p>
</li>`;
}

function renderEvidence(signed: SignedReport): string {
  const e = signed.report.evidence;
  if (!e) return "";
  return `<section><h2>Evidence and coverage</h2><p>${escapeHtml(e.scope)}</p><p>Coverage: ${escapeHtml(e.coverage)}. Quote signature: ${escapeHtml(e.quoteSignature ?? "not applicable")}.</p><p>Canonical input digest: <code>${escapeHtml(e.inputDigest)}</code></p><ul>${e.gaps.map(g => `<li>${escapeHtml(g)}</li>`).join("")}</ul><ul>${e.facts.map(f => `<li><code>${escapeHtml(f.path)}</code>: ${escapeHtml(f.value)} (${escapeHtml(f.trust)})</li>`).join("")}</ul></section>`;
}

const UI_SCRIPT = String.raw`
(function () {
  var button = document.getElementById("verify");
  var out = document.getElementById("verify-result");
  var signed = JSON.parse(document.getElementById("signed-report").textContent);
  button.addEventListener("click", async function () {
    out.textContent = "Checking...";
    out.removeAttribute("data-state");
    try {
      var r = await verifyReport(signed);
      out.dataset.state = r.valid ? "ok" : "bad";
      out.textContent = r.valid
        ? "Valid. The report matches its hash and the signature verifies."
        : "Invalid. " + r.reason + ".";
    } catch (e) {
      out.dataset.state = "unsupported";
      out.textContent = "This browser can't check Ed25519 signatures. Run veylens verify on the JSON file instead.";
    }
  });
})();
`;

const CSS = `
:root{--ink:${BRAND.ink};--gold:${BRAND.gold};--paper:${BRAND.paper};--mute:${BRAND.mute};--line:${BRAND.line};color-scheme:dark}
*{box-sizing:border-box}
html{background:var(--ink)}
body{margin:0;color:var(--paper);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:46rem;margin:0 auto;padding:1.25rem 1.25rem 4rem}
header{display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem 1rem;padding-bottom:1rem;border-bottom:1px solid var(--line)}
.mark{color:var(--gold);font-weight:800;font-size:1.3rem;letter-spacing:-.01em}
.tag{color:var(--mute);font-size:.92rem}
.verdict{padding:2.5rem 0 1.5rem}
.verdict .flow{margin:0;color:var(--mute);overflow-wrap:anywhere}
h1{margin:.3rem 0 .6rem;font-size:clamp(3rem,14vw,6.5rem);line-height:.95;letter-spacing:-.04em;font-weight:800}
.verdict[data-result=fail] h1,.verdict[data-result=warn] h1{color:var(--gold)}
.summary{margin:0;max-width:34rem}
h2{font-size:1.15rem;margin:2.5rem 0 1rem}
.findings{list-style:none;margin:0;padding:0;display:grid;gap:1rem}
.finding{padding:1rem 1.1rem;border-radius:4px;max-width:100%}
.finding.high{background:var(--gold);color:var(--ink)}
.finding.medium{border:2px solid var(--gold)}
.finding.info{border:1px solid var(--line);color:var(--mute)}
.finding h3{margin:0 0 .4rem;font-size:1rem;display:flex;flex-wrap:wrap;gap:.2rem .6rem;align-items:baseline}
.finding p{margin:.35rem 0;max-width:40rem}
.sev{font-weight:800}
.events{font-size:.9rem}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em;overflow-wrap:anywhere}
.attest dl{display:grid;grid-template-columns:max-content 1fr;gap:.5rem 1.25rem;margin:0 0 1.25rem}
.attest dt{color:var(--mute)}
.attest dd{margin:0;min-width:0}
@media(max-width:34rem){.attest dl{grid-template-columns:1fr;gap:.1rem}.attest dd{margin-bottom:.6rem}}
button{font:inherit;font-weight:700;background:var(--gold);color:var(--ink);border:0;border-radius:4px;padding:.75rem 1.2rem;cursor:pointer}
button:focus-visible{outline:3px solid var(--paper);outline-offset:3px}
#verify-result{margin:.9rem 0 0;min-height:1.5rem}
#verify-result[data-state=ok]{color:var(--gold);font-weight:700}
#verify-result[data-state=bad]{font-weight:700;border-left:4px solid var(--gold);padding-left:.75rem}
.limits{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--mute);font-size:.9rem;max-width:40rem}
`;

export function renderHtmlReport(signed: SignedReport): string {
  const { report } = signed;
  const verdict = VERDICT[report.overallResult];
  const generated = new Date(report.generatedAt * 1000).toISOString();

  const findings =
    report.findings.length === 0
      ? `<p>No findings.</p>`
      : `<ul class="findings">${report.findings.map(renderFinding).join("\n")}</ul>`;

  // "<" is escaped so the embedded JSON can never close its own script tag.
  const dataJson = JSON.stringify(signed).replace(/</g, "\\u003c");

  const scriptText = `${VERIFY_SCRIPT}\n${UI_SCRIPT}`;
  const scriptHash = createHash("sha256").update(scriptText).digest("base64");
  const csp =
    `default-src 'none'; style-src 'unsafe-inline'; ` +
    `script-src 'sha256-${scriptHash}'; base-uri 'none'; form-action 'none'`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${escapeHtml(csp)}">
<title>Veylens report: ${escapeHtml(report.flowId)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header>
  <span class="mark">Veylens</span>
  <span class="tag">Privacy audit for Zcash cross-chain flows</span>
</header>
<main>
<section class="verdict" data-result="${report.overallResult}">
  <p class="flow">Flow <code>${escapeHtml(report.flowId)}</code></p>
  <h1>${verdict}</h1>
  <p class="summary">${escapeHtml(summarize(report.findings, report.overallResult))}</p>
</section>
<section aria-labelledby="findings-title">
  <h2 id="findings-title">Findings</h2>
  ${findings}
</section>
${renderEvidence(signed)}
<section class="attest" aria-labelledby="attest-title">
  <h2 id="attest-title">Signed report</h2>
  <dl>
    <dt>Ruleset</dt><dd>v${escapeHtml(report.rulesetVersion)}</dd>
    <dt>Generated</dt><dd>${escapeHtml(generated)}</dd>
    <dt>Report hash</dt><dd><code>${escapeHtml(signed.reportHash)}</code></dd>
    <dt>Signature</dt><dd><code>${escapeHtml(signed.signature)}</code></dd>
  </dl>
  <button id="verify" type="button">Verify signature in this browser</button>
  <p id="verify-result" role="status"></p>
</section>
<p class="limits">Veylens checks four named leak patterns: refund address reuse, unjustified unshielded hops, timing correlation, and turnstile exposure. A passing report does not prove a flow is private. Unofficial tool, not affiliated with or endorsed by the Zcash project or its trademark holders.</p>
</main>
</div>
<script type="application/json" id="signed-report">${dataJson}</script>
<script>${scriptText}</script>
</body>
</html>
`;
}
