import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderApp, renderSitePages } from "./page.js";

/** Bundles the browser app and assembles one self-contained HTML file. */
export async function buildAppHtml(root: string = process.cwd()): Promise<string> {
  const result = await build({
    entryPoints: [join(root, "src", "web", "demo.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    minify: true,
    write: false,
    legalComments: "none",
    logLevel: "silent",
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error("esbuild produced no output");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")) as { version: string };
  return renderApp({ js: output.text, version: pkg.version });
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const html = await buildAppHtml();
  const root=process.cwd();
  const product=await build({entryPoints:[join(root,"src/web/product.ts")],bundle:true,format:"iife",platform:"browser",target:"es2022",minify:true,write:false,legalComments:"none"});
  const js=product.outputFiles[0]!.text;
  const pkg=JSON.parse(readFileSync(join(root,"package.json"),"utf8")) as {version:string};
  const pages=renderSitePages({js,version:pkg.version});
  pages["demo.html"]=html;
  for(const [name,page] of Object.entries(pages)) pages[name]=page.replace("default-src &#39;none&#39;;", "default-src &#39;none&#39;; connect-src &#39;self&#39;;").replaceAll("workspace.html?example=leak","demo.html");
  const guided=`<section class="shell"><h2>Collect evidence</h2><p>Choose a lookup or open a local JSON file below. Uploaded records remain in this browser.</p><label for="intake-mode">Lookup type</label><select id="intake-mode"><option value="transaction">Zcash transaction</option><option value="swap">1Click swap status</option></select><label for="lookup-network">Zcash network</label><select id="lookup-network"><option value="mainnet">Mainnet</option><option value="testnet">Testnet, configured node required</option></select><label for="lookup-id">Transaction ID or deposit address</label><input id="lookup-id" autocomplete="off"><label for="lookup-memo">Deposit memo, if required</label><input id="lookup-memo" autocomplete="off"><label><input type="checkbox" id="lookup-consent"> Send the lookup identifier and selected transaction IDs to Veylens and the selected source. Swap lookup also collects provider-listed origin transactions. The case is limited to 20 transaction records, including previous outputs.</label><button id="collect" class="btn btn-primary">Collect and inspect</button><p id="intake-status" role="status"></p><details><summary>Inspect an address locally</summary><label for="receiver-address">Zcash address</label><input id="receiver-address" autocomplete="off"><button id="inspect-receiver" class="btn btn-ghost">Decode receivers</button><p id="receiver-result" role="status"></p></details></section>`;
  const caseControls=`<section class="shell"><h2>Build a refund-path case</h2><p>Import original provider records and transaction bundles locally, or collect them above. Add the shielding transaction to resolve its public funding sources. Refund candidates are checked against provider hashes, destination and exact amount.</p><label class="btn btn-ghost" for="case-file">Import case evidence</label><input id="case-file" type="file" accept="application/json,.json"><label for="case-shielding">Shielding transaction ID, if known</label><input id="case-shielding" autocomplete="off"><label for="case-refund">Refund transaction ID, optional override</label><input id="case-refund" autocomplete="off"><p class="fine">An override is your assertion. It doesn't authenticate provider attribution.</p><p id="case-record-count" role="status">No records attached.</p><div class="actions"><button id="review-case" class="btn btn-primary">Review attached evidence</button><button id="clear-case" class="btn btn-ghost">Clear case</button></div><details><summary>Compare a corrected integration</summary><p>Import the original case evidence as a baseline, then attach the corrected case. Both cases are independently re-analysed.</p><label for="baseline-file">Original case JSON</label><input type="file" id="baseline-file" accept="application/json,.json"><button id="compare-cases" class="btn btn-ghost">Compare cases</button><p id="comparison-result" role="status"></p></details></section>`;
  let workspace=pages["workspace.html"]!;
  workspace=workspace.replace('<div class="tool-in">','<div class="tool-in"><details><summary>Inspect a wallet export locally</summary><p>Paste z_viewtransaction output. Do not paste wallet keys.</p><label for="wallet-input">Wallet JSON</label><textarea id="wallet-input" autocomplete="off" spellcheck="false"></textarea><button id="inspect-wallet" class="btn btn-ghost">Inspect export</button><pre id="wallet-result" style="white-space:pre-wrap;overflow-wrap:anywhere" role="status"></pre></details>');
  workspace=workspace.replace(/(<div class="shell page-intro">[\s\S]*?<\/div>)/, '$1'+guided+caseControls);
  workspace=workspace.replace(/<button[^>]*id="(?:load-leak|load-clean|load-provider|load-reuse-config|load-safer-config|load-zcash)"[^>]*>[\s\S]*?<\/button>/g,'');
  workspace=workspace.replace('<p id="r-summary" role="status"></p>','<p id="r-summary" role="status"></p><p id="risk-status" role="status"></p><div id="case-checkpoints"></div>');
  workspace=workspace.replace('<button class="btn btn-ghost" id="download-signed"', '<button id="download-source" class="btn btn-ghost" type="button">Download source evidence</button><button class="btn btn-ghost" id="share-summary" type="button">Export redacted summary</button><button class="btn btn-ghost" id="download-signed"');
  workspace=workspace.replace('</style>', 'input:not([type=checkbox]),select{display:block;width:100%;padding:.8rem;margin-bottom:1rem;background:var(--field);color:var(--paper);border:1px solid var(--edge);font:inherit}#intake-status{margin-top:1rem}</style>');
  workspace=workspace.replace('The signed API example is a real dry quote with dummy addresses and no transaction. Context and alternative-route examples are illustrative.', 'Live lookups return source records. Examples are available on the separate demo page.');
  workspace=workspace.replace('<label for="flow-input">Flow JSON</label>', '<details><summary>Advanced source editor and node imports</summary><label for="flow-input">Source evidence JSON</label>').replace('<div class="error" id="error"', '</details><div class="error" id="error"');
  workspace=workspace.replace('Review a flow','Review a refund path').replace('Import a Zcash transaction bundle, a node export, a 1Click record, or a declared Flow JSON. Verify quote origin, inspect refund configuration, and export an evidence-bound report.', 'Attach original swap records and transaction evidence. Resolve public funding sources, inspect refund exposure, and export a reproducible case report.');
  pages["workspace.html"]=workspace;
  pages["methodology.html"]=pages["methodology.html"]!.replace('no network access for analysis','same-origin lookup access when requested').replace('Flow data is not sent by the application.', 'Lookup identifiers and their bounded previous-transaction requests reach the collector and its configured source. Local imports and address inspection remain local. Public explorer observations do not establish canonical-chain membership.');
  pages["methodology.html"]=pages["methodology.html"]!.replace('<div class="shell methodology">','<div class="shell methodology"><div class="notice"><h2>Combined cases in v0.8</h2><p>Live collector receipts authenticate observed source records against a pinned key. Case review checks transaction IDs, public previous outputs and exact refund candidates. Provider-reported candidates and user-selected roles remain distinct from canonical-chain and wallet ownership proof. Export original evidence alongside the report for independent replay.</p></div>');
  const out=join(root,"dist/client");mkdirSync(out,{recursive:true});for(const [name,page] of Object.entries(pages))writeFileSync(join(out,name),page);
  const workerSource=`import {handleApi} from "../src/server/api.ts"; const pages=${JSON.stringify(pages)};export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith("/api/"))return handleApi(request,env);if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405});const name=url.pathname==="/"?"index.html":url.pathname.slice(1);const html=pages[name];return html?new Response(request.method==="HEAD"?null:html,{headers:{"Content-Type":"text/html; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}}):new Response("Not found",{status:404});}};`;
  mkdirSync(join(root,"dist/server"),{recursive:true});
  await build({stdin:{contents:workerSource,resolveDir:join(root,"dist"),sourcefile:"worker.ts",loader:"ts"},bundle:true,format:"esm",platform:"browser",target:"es2022",outfile:join(root,"dist/server/index.js"),minify:true});
  mkdirSync(join(root,"dist/.openai"),{recursive:true});writeFileSync(join(root,"dist/.openai/hosting.json"),readFileSync(join(root,".openai/hosting.json")));
  console.log("Built production Worker and separate demo page.");
}
