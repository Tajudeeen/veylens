import { comparisonView } from "./comparisonView.js";
import { createHash } from "node:crypto";
import { BRAND } from "../brand.js";
import {chrome,landing as renderLanding,mark,DESIGN_CSS} from "./design.js";

export const ARTICLE_URL =
  "https://www.cryptopolitan.com/zachxbt-flags-privacy-flaw-in-zashi-wallets-near-intents-integration/";

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='${BRAND.gold}'/><path d='M8 9l8 15 8-15' fill='none' stroke='${BRAND.ink}' stroke-width='4' stroke-linejoin='round' stroke-linecap='round'/></svg>`,
  );

const CSS = `
:root{--ink:${BRAND.ink};--gold:${BRAND.gold};--paper:${BRAND.paper};--mute:${BRAND.mute};--line:${BRAND.line};--field:#1b1819;--edge:#8C8687;--max:72rem;color-scheme:dark}
*{box-sizing:border-box}
html{background:var(--ink);-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:4.5rem}
body{margin:0;min-width:320px;color:var(--paper);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
body.is-splashing{overflow:hidden}
a{color:var(--gold)}
p{margin:0 0 1rem}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em;overflow-wrap:anywhere}
.visually-hidden{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.skip{position:absolute;left:-999px;top:0;background:var(--gold);color:var(--ink);padding:.75rem 1rem;font-weight:700;z-index:100}
.skip:focus{left:1rem;top:1rem}
.shell{width:100%;max-width:var(--max);margin:0 auto;padding-left:max(1.25rem,env(safe-area-inset-left));padding-right:max(1.25rem,env(safe-area-inset-right))}
:focus-visible{outline:3px solid var(--paper);outline-offset:3px}

/* splash */
.splash{position:fixed;inset:0;z-index:200;background:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;padding:env(safe-area-inset-top) 1.25rem env(safe-area-inset-bottom);text-align:center;cursor:pointer}
.splash-mark{margin:0;color:var(--gold);font-weight:800;font-size:clamp(2.75rem,14vw,5.5rem);letter-spacing:-.04em;line-height:1}
.splash-line{display:block;height:3px;width:min(16rem,60vw);background:var(--gold);margin:1.1rem auto;transform:scaleX(0);transform-origin:left;animation:draw 1s cubic-bezier(.2,.7,.2,1) .25s forwards}
.splash-sub{margin:0;color:var(--mute);opacity:0;animation:show .01s linear 1.1s forwards}
.splash-skip{position:absolute;left:0;right:0;bottom:max(1.5rem,env(safe-area-inset-bottom));margin:0;color:var(--mute);font-size:.9rem}
.splash.is-leaving{opacity:0;transition:opacity .25s ease}
@keyframes draw{to{transform:scaleX(1)}}
@keyframes show{to{opacity:1}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.splash-line{animation:none;transform:none}.splash-sub{animation:none;opacity:1}.splash.is-leaving{transition:none}}

/* header */
.site-header{position:sticky;top:0;z-index:20;background:rgba(35,31,32,.94);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding-top:env(safe-area-inset-top)}
.bar{display:flex;align-items:center;justify-content:space-between;gap:1rem;min-height:3.5rem}
.wordmark{color:var(--gold);font-weight:800;font-size:1.3rem;letter-spacing:-.01em;text-decoration:none}
.nav{display:none}
.nav a{color:var(--paper);text-decoration:none;padding:.5rem .25rem}
.nav a:hover{color:var(--gold)}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:3rem;padding:0 1.25rem;border:2px solid var(--gold);border-radius:4px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer;touch-action:manipulation;text-align:center;line-height:1.2}
.btn-primary{background:var(--gold);color:var(--ink)}
.btn-ghost{background:transparent;color:var(--gold)}
.btn-sm{min-height:2.75rem;padding:0 1rem}
.btn:disabled{opacity:.5;cursor:default}

/* hero */
.hero{display:grid;gap:2.5rem;padding-top:2.5rem;padding-bottom:3.5rem}
.hero h1{margin:0 0 1rem;font-size:clamp(2.25rem,8.5vw,4.25rem);line-height:1.03;letter-spacing:-.035em;font-weight:800}
.lede{font-size:1.125rem;max-width:34rem;color:var(--paper)}
.cta-row{display:grid;gap:.75rem;margin-top:1.75rem}
.fine{color:var(--mute);font-size:.9rem}

/* case timeline: the signature element */
.case{margin:0;border:1px solid var(--line);border-radius:4px;padding:1.25rem}
.case figcaption{font-weight:700;margin-bottom:.75rem}
.timeline{list-style:none;margin:0;padding:0;--dot-x:.5rem;--pad:1.9rem;--dot-y:1.475rem}
.ev{position:relative;padding:.7rem 0 .7rem var(--pad)}
.ev::before{content:"";position:absolute;left:var(--dot-x);top:var(--dot-y);bottom:calc(-1 * var(--dot-y));width:2px;margin-left:-1px;background:var(--line)}
.ev:last-child::before{display:none}
.dot{position:absolute;left:var(--dot-x);top:var(--dot-y);width:.8rem;height:.8rem;margin:-.4rem 0 0 -.4rem;border-radius:50%;border:2px solid var(--mute);background:var(--ink);z-index:1}
.ev.involved .dot,.ev.linked .dot{background:var(--gold);border-color:var(--gold)}
.ev-title{margin:0;overflow-wrap:anywhere}
.ev-meta{margin:.15rem 0 0;color:var(--mute);font-size:.88rem}
.chips{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.35rem}
.chip{border:1px solid var(--gold);color:var(--gold);border-radius:3px;padding:.05rem .45rem;font-size:.8rem}
.timeline.is-case{--dot-x:1.9rem;--pad:3.4rem}
.is-case .rail{position:absolute;left:.25rem;top:var(--dot-y);bottom:calc(-1 * var(--dot-y));width:2px;margin-left:-1px;background:var(--gold)}
.is-case .ev.linked::after{content:"";position:absolute;left:.25rem;top:var(--dot-y);width:calc(var(--dot-x) - .25rem);height:2px;margin-top:-1px;background:var(--gold)}
.case-note{margin:.9rem 0 0;color:var(--mute);font-size:.92rem}

/* sections */
.section{padding:3.5rem 0;border-top:1px solid var(--line)}
.section h2{margin:0 0 .75rem;font-size:clamp(1.7rem,5.5vw,2.5rem);line-height:1.1;letter-spacing:-.025em}
.section-lede{max-width:40rem;color:var(--mute)}
.rules{list-style:none;margin:1.5rem 0 0;padding:0;display:grid;gap:1px;background:var(--line);border:1px solid var(--line)}
.rule{background:var(--ink);padding:1.1rem 1.25rem}
.rule h3{margin:0 0 .4rem;font-size:1rem;display:flex;flex-wrap:wrap;gap:.2rem .6rem;align-items:baseline}
.rule p{margin:0}
.sev{font-weight:800}

/* tool */
.tool{display:grid;gap:2rem;margin-top:1.5rem}
.tool-in,.tool-out{min-width:0}
label{display:block;font-weight:700;margin-bottom:.4rem}
textarea{display:block;width:100%;background:var(--field);color:var(--paper);border:1px solid var(--edge);border-radius:4px;padding:.9rem;font:16px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;resize:vertical}
#flow-input{min-height:16rem}
textarea:focus{border-color:var(--gold)}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.9rem}
.actions .btn-primary{grid-column:1/-1}
.error{margin:1rem 0 0;padding:.75rem .9rem;border-left:4px solid var(--gold);background:var(--field)}
.error ul{margin:.4rem 0 0;padding-left:1.1rem}
.verdict{margin:.25rem 0 .5rem;font-size:clamp(2.75rem,12vw,5rem);line-height:.95;letter-spacing:-.04em;font-weight:800}
.verdict[data-result=fail],.verdict[data-result=warn]{color:var(--gold)}
.tool-out h3.sub{margin:2rem 0 .75rem;font-size:1.1rem}
.findings{list-style:none;margin:0;padding:0;display:grid;gap:1rem}
.finding{padding:1rem 1.1rem;border-radius:4px}
.finding.high{background:var(--gold);color:var(--ink)}
.finding.medium{border:2px solid var(--gold)}
.finding.info{border:1px solid var(--line);color:var(--mute)}
.finding h4{margin:0 0 .4rem;font-size:1rem;display:flex;flex-wrap:wrap;gap:.2rem .6rem;align-items:baseline}
.finding p{margin:.35rem 0}
.facts{display:grid;grid-template-columns:1fr;gap:.1rem;margin:0 0 1rem}
.facts dt{color:var(--mute)}
.facts dd{margin:0 0 .6rem;min-width:0}
#r-signed{min-height:9rem;font-size:14px}
#r-verify{margin:.9rem 0 0;min-height:1.5rem}
#r-verify[data-state=ok],#v-out[data-state=ok]{color:var(--gold);font-weight:700}
#r-verify[data-state=bad],#v-out[data-state=bad]{font-weight:700;border-left:4px solid var(--gold);padding-left:.75rem}
details{margin-top:2rem;border-top:1px solid var(--line);padding-top:1rem}
summary{cursor:pointer;font-weight:700;min-height:2.75rem;display:flex;align-items:center}
#v-in{min-height:9rem}
#v-out{margin:.9rem 0 0;min-height:1.5rem}

/* case section */
.prose{max-width:40rem}
.prose ul{padding-left:1.2rem}
.prose li{margin-bottom:.5rem}

/* footer */
.site-footer{border-top:1px solid var(--line);padding:2.5rem 0 calc(2rem + env(safe-area-inset-bottom))}
.foot{display:grid;gap:2rem}
.foot p{margin:0 0 .6rem}
.foot ul{list-style:none;margin:0;padding:0}
.foot-h{font-weight:700}
.foot-nav a{display:block;min-height:2.75rem;line-height:2.75rem;color:var(--paper);text-decoration:none}
.foot-nav a:hover{color:var(--gold)}
.foot-facts li{margin-bottom:.4rem;color:var(--mute)}

/* tablet and large phone */
@media (min-width:48rem){
  .nav{display:flex;gap:1.25rem}
  .cta-row{display:flex;flex-wrap:wrap}
  .rules{grid-template-columns:1fr 1fr}
  .facts{grid-template-columns:max-content 1fr;gap:.5rem 1.25rem}
  .facts dd{margin:0}
  .foot{grid-template-columns:2fr 1fr 1fr}
  .actions{grid-template-columns:repeat(3,1fr)}
  .actions .btn-primary{grid-column:1/-1}
}
/* desktop */
@media (min-width:64rem){
  .hero{grid-template-columns:1.1fr .9fr;align-items:center;padding-top:4.5rem;padding-bottom:5rem}
  .tool{grid-template-columns:minmax(0,5fr) minmax(0,7fr);align-items:start}
  .tool-in{position:sticky;top:5rem}
}
@media (max-height:30rem) and (orientation:landscape){.splash-mark{font-size:2.5rem}.splash-line{margin:.6rem auto}}
`;

const RULES: Array<{ id: string; sev: string; text: string }> = [
  { id: "refund-address-reuse", sev: "High", text: "A refund goes back, unshielded, to a transparent address that funded a shield earlier in the same flow. This exposes a repeated address relationship in the supplied flow. It does not establish the real-world identity of its owner." },
  { id: "unjustified-unshielded-hop", sev: "Medium", text: "Value leaves the shielded pool between the shield and the settlement with no stated reason. Declare why the hop is needed, or keep the funds shielded." },
  { id: "timing-correlation", sev: "Medium", text: "A settlement lands within two minutes of the shielded intent. Short timing is a heuristic signal, not proof that an observer can identify the sender." },
  { id: "turnstile-exposure", sev: "Info", text: "A pool migration goes through the turnstile, which reveals the amount by design. Reported so you know about it, and not counted as a failure." },
];

function renderRules(): string {
  return RULES.map(
    (r) =>
      `<li class="rule"><h3><span class="sev">${r.sev}</span> <code>${r.id}</code></h3><p>${r.text}</p></li>`,
  ).join("\n");
}

const BODY = (version: string): string => `
<div class="splash" id="splash" role="presentation">
  <p class="splash-mark">Veylens</p>
  <span class="splash-line"></span>
  <p class="splash-sub">Checking Zcash flows for leaks</p>
  <p class="splash-skip">Tap to skip</p>
</div>
<a class="skip skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="shell bar">
    <a class="wordmark" href="#top">Veylens</a>
    <nav class="nav" aria-label="Primary">
      <a href="#audit">Audit</a><a href="#rules">Rules</a><a href="#case">The case</a><a href="#limits">Limits</a>
    </nav>
    <a class="btn btn-primary btn-sm" href="#audit">Audit a flow</a>
  </div>
</header>
<main id="main">
<section class="hero shell" id="top">
  <div class="hero-copy">
    <h1>Find the privacy leak in a Zcash cross-chain flow.</h1>
    <p class="lede">Paste the steps of a shield, swap and refund. Veylens checks them against four known leak patterns and signs the result, so anyone can verify it.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="#audit">Audit a flow</a>
      <button class="btn btn-ghost" type="button" id="hero-load-case">Load the Zashi CrossPay case</button>
    </div>
    <p class="fine" style="margin-top:1rem">Runs in your browser. Nothing is uploaded.</p>
  </div>
  <figure class="case">
    <figcaption>The Zashi CrossPay case, October 2025</figcaption>
    <ol class="timeline is-case">
      <li class="ev linked"><span class="rail"></span><span class="dot"></span><p class="ev-title">Shielded from <code>t1OriginalShieldingSource</code></p><p class="ev-meta">Event 1</p></li>
      <li class="ev"><span class="rail"></span><span class="dot"></span><p class="ev-title">Swap submitted through NEAR Intents</p><p class="ev-meta">Event 2</p></li>
      <li class="ev"><span class="rail"></span><span class="dot"></span><p class="ev-title">0.005 ETH paid out on Ethereum</p><p class="ev-meta">Event 3</p></li>
      <li class="ev linked"><span class="dot"></span><p class="ev-title">Refund of 0.001598 ZEC, unshielded, to <code>t1OriginalShieldingSource</code></p><p class="ev-meta">Event 4</p></li>
    </ol>
    <p class="case-note">Events 1 and 4 use the same transparent address. That is the leak.</p>
  </figure>
</section>

<section class="section" id="rules" aria-labelledby="rules-title">
  <div class="shell">
    <h2 id="rules-title">Four patterns it checks</h2>
    <p class="section-lede">Each rule is a small, separate check with its own tests. A flow fails only on a high-severity finding.</p>
    <ul class="rules">
${renderRules()}
    </ul>
  </div>
</section>

<section class="section" id="audit" aria-labelledby="audit-title">
  <div class="shell">
    <h2 id="audit-title">Audit a flow</h2>
    <p class="section-lede">Paste a flow as JSON, or open a file. A flow is a list of events: shield, unshield, intent_submit, settlement, refund and migrate.</p>
    <div class="tool">
      <div class="tool-in">
        <label for="flow-input">Flow JSON</label>
        <textarea id="flow-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" rows="14" placeholder='{ "flowId": "my-flow", "events": [ ... ] }'></textarea>
        <div class="actions">
          <button class="btn btn-primary" id="run" type="button">Run audit</button>
          <button class="btn btn-ghost" id="load-leak" type="button">Load the leak case</button>
          <button class="btn btn-ghost" id="load-clean" type="button">Load the fixed case</button>
          <label class="btn btn-ghost" for="file-input" style="margin:0">Open a file</label>
          <button class="btn btn-ghost" id="load-zcash" type="button">Inspect mainnet transaction</button>
          <button class="btn btn-ghost" id="load-provider" type="button">Load signed API quote</button>
          <button class="btn btn-ghost" id="load-reuse-config" type="button">Declared reuse example</button>
          <button class="btn btn-ghost" id="load-safer-config" type="button">Alternative route example</button>
          <input class="visually-hidden" id="file-input" type="file" accept="application/json,.json">
        </div>
        <details><summary>Import a Zcash node export</summary><p>Paste exported getrawtransaction JSON into the editor above, choose its network, and wrap it for inspection. No RPC connection or wallet key is required.</p><label for="zcash-network">Export network</label><select id="zcash-network" style="font:inherit;padding:.75rem;background:var(--field);color:var(--paper);border:1px solid var(--edge);max-width:100%"><option value="">Choose network</option><option value="mainnet">Mainnet</option><option value="testnet">Testnet</option></select><button class="btn btn-ghost" id="wrap-node" type="button">Wrap node JSON</button></details>
        <div class="error" id="error" role="alert" hidden></div>
      </div>
      <div class="tool-out" id="results" tabindex="-1" hidden>
        <p class="fine" style="margin:0">Flow <code id="r-flow"></code></p>
        <h3 class="verdict" id="r-verdict"></h3>
        <p id="r-summary" role="status"></p>
        <h3 class="sub">Findings</h3>
        <ul class="findings" id="r-findings"></ul>
        <div id="r-evidence"></div>
        <h3 class="sub">Supplied events or imported evidence</h3>
        <ol class="timeline" id="r-timeline"></ol>
        <div id="r-attest">
        <h3 class="sub">Signed report</h3>
        <dl class="facts">
          <dt>Ruleset</dt><dd id="r-ruleset"></dd>
          <dt>Generated</dt><dd id="r-generated"></dd>
          <dt>Report hash</dt><dd><code id="r-hash"></code></dd>
        </dl>
        <label for="r-signed">Report JSON</label>
        <textarea id="r-signed" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea>
        <div class="actions">
          <button class="btn btn-ghost" id="copy-signed" type="button">Copy report</button>
          <button class="btn btn-ghost" id="download-signed" type="button">Download report</button>
          <button class="btn btn-ghost" id="reverify" type="button">Verify again</button>
        </div>
        <p id="r-verify" role="status"></p>
        <p class="fine">Signed with a one-off key generated in this browser tab. A valid signature shows the report has not changed since it was made. It does not show that the flow you pasted is real. Edit the JSON above and press Verify again to watch tampering get caught.</p>
        </div>
      </div>
    </div>
    <details id="verify-tool">
      <summary>Verify a signed report</summary>
      <p class="section-lede">Paste a report produced by Veylens, here or from the command line, and check it without trusting anyone.</p>
      <label for="v-in">Signed report JSON</label>
      <textarea id="v-in" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea>
      <div class="actions"><button class="btn btn-primary" id="v-run" type="button">Verify report</button></div>
      <p id="v-out" role="status"></p>
    </details>
  </div>
</section>

<section class="section" id="case" aria-labelledby="case-title">
  <div class="shell prose">
    <h2 id="case-title">Why this check exists</h2>
    <p>On 21 October 2025 the on-chain investigator ZachXBT showed that Zashi's CrossPay feature, which spends shielded ZEC through NEAR Intents, sent a refund back to the same transparent address the user had shielded from. With the address reused and the refund unshielded, timing and amount are enough to link the shield to the refund. <a href="${ARTICLE_URL}" rel="noopener noreferrer">Cryptopolitan's report</a> covers the disclosure, including the 0.005 ETH payout and the 0.001598 ZEC refund used in the example above.</p>
    <p>Electric Coin Company confirmed the problem and said it would add ephemeral addresses and shielded refunds. The current status of that historical issue has not been independently verified here. The failure class is what Veylens checks for: refund and change paths, unneeded unshielded hops, and timing, are easy to get wrong each time a new integration is built.</p>
    <p>The shielded amount, intent amount and timings in the example are illustrative. Only the payout and refund figures come from the public report.</p>
  </div>
</section>

<section class="section" id="limits" aria-labelledby="limits-title">
  <div class="shell prose">
    <h2 id="limits-title">What Veylens does not do</h2>
    <ul>
      <li>It checks four named patterns. A pass does not prove a flow is private.</li>
      <li>It audits a flow you describe. It does not read the chain or a wallet yet, so you supply the events.</li>
      <li>The timing rule uses time only. It does not compare amounts across assets.</li>
      <li>A valid signature shows a report is unchanged. It does not show the flow is true.</li>
    </ul>
  </div>
</section>
</main>

<footer class="site-footer">
  <div class="shell foot">
    <div>
      <p class="wordmark">Veylens</p>
      <p>A privacy-leak auditor for Zcash cross-chain flows.</p>
      <p class="fine">Unofficial tool. Not affiliated with or endorsed by the Zcash project or its trademark holders. The Zcash name and logo belong to their owners. This site uses the published brand colors only.</p>
    </div>
    <nav class="foot-nav" aria-label="Footer">
      <p class="foot-h">On this page</p>
      <ul>
        <li><a href="#top">Top</a></li>
        <li><a href="#rules">Rules</a></li>
        <li><a href="#audit">Audit a flow</a></li>
        <li><a href="#case">Why it exists</a></li>
        <li><a href="#limits">Limits</a></li>
      </ul>
    </nav>
    <div class="foot-facts">
      <p class="foot-h">About</p>
      <ul>
        <li>Version ${version}</li>
        <li>Built for Zecathon, Core and Tooling track</li>
        <li>MIT license</li>
        <li>Runs in your browser. Nothing is uploaded.</li>
      </ul>
    </div>
  </div>
</footer>
`;

export function renderApp(opts: { js: string; version: string }): string {
  if (/<\/script/i.test(opts.js) || opts.js.includes("<!--")) {
    throw new Error("bundled script contains a sequence that would break out of its script tag");
  }
  const hash = createHash("sha256").update(opts.js).digest("base64");
  const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${hash}'; img-src data:; base-uri 'none'; form-action 'none'`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${BRAND.ink}">
<meta http-equiv="Content-Security-Policy" content="${csp.replace(/'/g, "&#39;")}">
<title>Veylens: find privacy leaks in Zcash cross-chain flows</title>
<meta name="description" content="Check a Zcash shielded cross-chain flow against four known privacy-leak patterns and get a signed, verifiable report. Runs in your browser.">
<link rel="icon" href="${FAVICON}">
<style>${CSS}</style>
<noscript><style>.splash{display:none}body.is-splashing{overflow:auto}</style></noscript>
</head>
<body class="is-splashing">
${BODY(opts.version)}
<noscript><p class="shell fine">Veylens needs JavaScript to run audits in your browser. The command line tool works without it.</p></noscript>
<script>${opts.js}</script>
</body>
</html>
`;
}

/** Real document navigation; no client router and no flow data in URLs. */
export function renderSitePages(opts: { js: string; version: string }): Record<string, string> {
  const legacy = renderApp(opts);
  const section = (id: string): string => {
    const html = legacy.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?<\\/section>`))?.[0];
    if (!html) throw new Error(`Missing section ${id}`);
    return html;
  };
  const navItems = [
    ["index.html", "Overview"], ["workspace.html", "Workspace"],
    ["verify.html", "Verify report"], ["methodology.html", "Methodology"],
  ];
  const extraCss = `
[hidden]{display:none!important}
.site-header .bar{flex-wrap:wrap;padding-top:.65rem;padding-bottom:.65rem}
.mobile-menu{width:100%;margin:0;border:0;padding:0}
.mobile-menu summary{color:var(--mute);font-weight:500}
.mobile-menu nav{display:flex;flex-wrap:wrap;gap:.5rem 1.25rem;padding:.5rem 0}
.mobile-menu a{min-height:2.75rem;display:inline-flex;align-items:center;text-decoration:none}
.nav a[aria-current=page]{color:var(--gold)}
.page-intro{padding-top:3rem;padding-bottom:1.5rem}
.page-intro h1{font-size:clamp(2rem,7vw,3.5rem);line-height:1.08;letter-spacing:-.035em;margin:.6rem 0 1rem}
.eyebrow{text-transform:uppercase;letter-spacing:.15em;font-size:.75rem;color:var(--gold)}
.notice{border:1px solid var(--line);padding:1rem 1.25rem;background:var(--field);border-radius:4px;margin:1.25rem 0}
.workflow{display:grid;gap:1rem;margin-top:1.5rem}
.workflow article{padding:1.5rem;border:1px solid var(--line);border-radius:4px}
.workflow h3{margin:.5rem 0}
.workspace-section{border-top:0;padding-top:1rem}
.workspace-section h2{font-size:1.5rem}
.workspace-section .tool-out{padding:1.25rem;border:1px solid var(--line);border-radius:4px;background:var(--field)}
.workspace-section .verdict{font-size:clamp(2rem,6vw,3rem);line-height:1.1}
.verify-page{max-width:48rem;padding-bottom:4rem}
.verify-page textarea{min-height:18rem}
.evidence-table{overflow-x:auto;margin:1.5rem 0;max-width:100%}
table{border-collapse:collapse;width:100%;font-size:.95rem}
caption{text-align:left;color:var(--mute);padding-bottom:.75rem}
th,td{text-align:left;vertical-align:top;padding:1rem;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
th{color:var(--gold)}
.methodology{max-width:58rem;padding-bottom:3rem}
.methodology h2{margin-top:2.5rem}
@media(min-width:48rem){.mobile-menu{display:none}.workflow{grid-template-columns:repeat(3,minmax(0,1fr))}}
`;
  const frame = (file: string, title: string, content: string, splash = false): string => {
    const links = navItems.map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ""}>${label}</a>`).join("");
    const splashHtml = splash ? legacy.match(/<div class="splash"[\s\S]*?<\/div>/)?.[0] ?? "" : "";
    const body = chrome(file,title,content,splashHtml.replace('<p class="splash-mark">Veylens</p>',`<div class="splash-mark">${mark()}</div>`),opts.version);
    return legacy.replace(/<title>[\s\S]*?<\/title>/, `<title>${title} | Veylens</title>`)
      .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Local-first review of supplied Zcash cross-chain flows. Inspect privacy risk signals and verify report integrity.">')
      .replace('</style>', `${extraCss}${DESIGN_CSS}</style>`)
      .replace('img-src data:', 'img-src &#39;self&#39; data:')
      .replace(/<link rel="icon"[^>]*>/, '<link rel="icon" href="brand-mark.png" type="image/png">')
      .replace(/<body class="is-splashing">[\s\S]*?<script>/, `<body class="is-splashing">${body}<noscript><p class="shell fine">Reading and navigation work without JavaScript. Audits and signature verification require JavaScript, or the CLI.</p></noscript><script>`);
  };
  const intro = (label: string, title: string, text: string): string => `<div class="shell page-intro"><p class="eyebrow">${label}</p><h1>${title}</h1><p class="lede">${text}</p></div>`;
  const landing=renderLanding();
  let audit = section("audit").replace('class="section"', 'class="section workspace-section"');
  audit = audit.replace(/<details id="verify-tool">[\s\S]*?<\/details>/, '<p class="fine" style="margin-top:2rem">Have an existing report? <a href="verify.html">Open the independent report verifier</a>.</p>');
  audit = audit.replace('Paste a flow as JSON, or open a file. A flow is a list of events: shield, unshield, intent_submit, settlement, refund and migrate.', 'Paste or import a Zcash evidence bundle, original 1Click quote/status JSON, or Flow JSON. The signed API example is a real dry quote with dummy addresses and no transaction. Context and alternative-route examples are illustrative.');
  const workspace = intro("Local analysis / Supplied records", "Review a flow", "Import a Zcash transaction bundle, a node export, a 1Click record, or a declared Flow JSON. Verify quote origin, inspect refund configuration, and export an evidence-bound report.") + `<div class="shell notice">A result covers supplied records only. Missing chain evidence yields “Insufficient evidence”, even when no risk pattern matches. <a href="methodology.html">See scope and evidence limits</a>.</div>` + audit;
  const verifier = intro("Independent verifier / Report integrity", "Has this report changed?", "Check the report hash and Ed25519 signature locally. Reports from the browser workspace and CLI use the same format.") + `<section class="shell verify-page"><h2>Verify a signed report</h2><label for="v-in">Signed report JSON</label><textarea id="v-in" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="Paste the complete signed report here"></textarea><div class="actions"><button class="btn btn-primary" id="v-run" type="button">Verify report</button></div><p id="v-out" role="status"></p><details><summary>Verify against the original evidence</summary><p>Paste the original case, transaction bundle, quote/status or Flow JSON. Veylens compares its canonical input digest and independently replays the supported evidence checks.</p><label for="v-source">Original evidence JSON</label><textarea id="v-source" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea><button class="btn btn-primary" id="v-source-run" type="button">Verify source and conclusions</button><p id="v-source-out" role="status"></p></details><div class="notice">The included public key verifies the signature. This does not authenticate the signer, prove the input is true, or establish privacy. A substituted key with a newly signed report requires an external trusted-key comparison.</div><a href="workspace.html">Return to workspace</a></section>`;
  const methodology = intro("Methodology / Honest boundaries", "What the checks can establish", "Know what each evidence layer can establish, and where a conclusion still depends on a source or user assertion.") + `<div class="shell methodology">
<h2>Evidence comes first</h2><p>The original flow fixtures are illustrative. The mainnet inspection sample contains historical transaction bytes whose ID and public outputs are reproduced locally; it is not presented as a refund. The signed API sample is an authentic dry quote fetched on 12 October 2026 using dummy addresses. It created no deposit address or transaction. The importer verifies signed quote fields against the provider key pinned by SDK 0.1.26. Status fields and wallet context have separate, weaker trust labels. There is no chain consensus or wallet ownership verifier in this release. Zcash v4/v5 and NU6.3/NU7 v6 transaction content, including Ironwood, is decoded and checked against supplied IDs.</p>
${section("rules")}
<h2>How Veylens relates to Zcash</h2><div class="evidence-table"><table><caption>Implementation status, verified against this source archive</caption><thead><tr><th>Component</th><th>Current implementation</th><th>Remaining work</th></tr></thead><tbody>
<tr><td>Zcash flow concepts</td><td>Models shielding, unshielding, refunds, settlements, and migrations.</td><td>Validate records with a supported wallet or transaction source.</td></tr>
<tr><td>librustzcash</td><td>No dependency or direct integration.</td><td>Transaction decoding or wallet integration remains a separate milestone.</td></tr>
<tr><td>Zebra</td><td>Exported getrawtransaction data can be imported locally.</td><td>Independent chain anchoring and consensus validation remain missing.</td></tr>
<tr><td>NEAR Intents</td><td>Local 1Click quote/status import and pinned-key quote verification.</td><td>Authenticate on-chain execution and wallet context.</td></tr>
<tr><td>Cryptographic reports</td><td>SHA-256 digest and Ed25519 signature.</td><td>Evidence authenticity and signer trust are separate requirements.</td></tr>
<tr><td>Competition fit</td><td>Intended for Core and Tooling, based on the supplied brief.</td><td>Official eligibility, originality, deadline, and requirements need organizer confirmation.</td></tr>
</tbody></table></div>
<h2>Resources are not automatically mandatory integrations</h2><p>The brief supplied in the conversation lists developer docs, ZIPs, librustzcash, Zebra, a reference wallet, and NEAR Intents as resources. It does not establish that every submission must integrate all of them. Adding unused dependencies would not demonstrate Zcash functionality.</p>
<h2>Interpret findings carefully</h2><p>Refund reuse identifies matching address strings in a declared sequence. A transparent-hop finding depends on supplied events and its optional reason. Timing uses a 120-second heuristic, without measuring an anonymity set, comparing asset values, or proving public observability. Turnstile exposure uses a supplied flag, rather than decoding a migration transaction.</p><p>“Insufficient evidence” means chain evidence is incomplete, regardless of whether a configuration risk matched. A high-severity result refers to the declared source/destination relationship and is still not a verified on-chain leak. The original flow path also returns insufficient evidence when no high finding matches.</p>
<h2>Privacy of the tool</h2><p>The application bundle has a default-deny content policy and no network access for analysis. Navigation and ordinary hosting requests still reach the host. Flow data is not sent by the application. Downloads contain findings, event identifiers, and the flow identifier. Review those before sharing. Only the splash preference is kept in session storage.</p>
<h2>Historical case and source status</h2><p>The earlier build cites a reported CrossPay refund issue. This release preserves its fixture for reproducibility but does not claim the original vulnerability remains open. The historical report is a research lead, not independently verified chain evidence.</p><p><a href="${ARTICLE_URL}" rel="noopener noreferrer">Historical report cited by the original build</a></p>
<h2>Official technical resources</h2><ul><li><a href="https://github.com/zcash/librustzcash" rel="noopener noreferrer">librustzcash source</a></li><li><a href="https://github.com/ZcashFoundation/zebra" rel="noopener noreferrer">Zebra source</a></li><li><a href="https://docs.near-intents.org/" rel="noopener noreferrer">NEAR Intents documentation</a></li></ul>
<h2>Next evidence milestone</h2><p>Zcash transaction bundles now import with raw identifier checks, exact transparent outputs, and source-digest replay. Next are independently anchored chain records, wallet evidence, and an attributed real refund example. The signed dry quote authenticates configuration only.</p><a class="btn btn-primary" href="workspace.html">Open workspace</a></div>`;
  return {
    "index.html": frame("index.html", "Overview", landing, true),
    "workspace.html": frame("workspace.html", "Workspace", workspace),
    "compare.html": frame("compare.html", "Compare", comparisonView()),
    "verify.html": frame("verify.html", "Verify report", verifier),
    "methodology.html": frame("methodology.html", "Methodology", methodology),
    "demo.html": frame("demo.html", "Demo lab", intro("Demo lab / Supplied examples", "Inspect a sample. Learn the limits.", "Try illustrative flows, a signed dry quote or a historical transaction. Samples are separate from your live workspace.") + '<p class="notice shell">Sample findings describe their supplied evidence. They do not establish a live vulnerability. <a href="workspace.html">Open an empty workspace</a>.</p>' + audit.replace('workspace-section','workspace-section demo-workspace').replace('<div class="tool-out" id="results"',`<div id="review-empty" class="tool-out review-empty"><div class="empty-optic">${mark()}</div><p class="eyebrow">EXAMPLE / READY TO INSPECT</p><h3>See how a finding takes shape.</h3><p>Choose an example, then run its audit. Its signed report and evidence limits will appear here.</p><a class="text-link" href="workspace.html">Review your own evidence</a></div><div class="tool-out" id="results"`)),
  };
}
