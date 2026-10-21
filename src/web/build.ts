import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderApp, renderSitePages } from "./page.js";
import { workspaceView } from "./workspaceView.js";

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
  pages["demo.html"]=renderSitePages({js:html.match(/<script>([\s\S]*?)<\/script>/)![1]!,version:pkg.version})["demo.html"]!;
  for(const [name,page] of Object.entries(pages)) pages[name]=page.replace("default-src &#39;none&#39;;", "default-src &#39;none&#39;; connect-src &#39;self&#39;;").replaceAll("workspace.html?example=leak","demo.html");
  pages["workspace.html"]=pages["workspace.html"]!.replace(/(<main id="main"[^>]*>)[\s\S]*?<\/main>/, `$1${workspaceView()}</main>`);
  const logo=readFileSync(join(root,"assets/veylens-mark.png"));
  pages["methodology.html"]=pages["methodology.html"]!.replace('no network access for analysis','same-origin lookup access when requested').replace('Flow data is not sent by the application.', 'Lookup identifiers and their bounded previous-transaction requests reach the collector and its configured source. Local imports and address inspection remain local. Public explorer observations do not establish canonical-chain membership.');
  pages["methodology.html"]=pages["methodology.html"]!.replace('<div class="shell methodology">','<div class="shell methodology"><div class="notice"><h2>Evidence checks in v1.0</h2><p>Live collector receipts authenticate observed source records against a pinned key. Case review checks transaction IDs, public previous outputs and exact refund candidates. Public testnet collection includes signed public-source observations. Optional full-node proofs verify transaction Merkle paths and block-header hashes locally. Wallet exports support Ironwood and remain assertions. Provider-reported candidates and user-selected roles remain distinct from canonical-chain and wallet ownership proof. Export original evidence alongside the report for independent replay.</p></div>');
  const out=join(root,"dist/client");mkdirSync(out,{recursive:true});for(const [name,page] of Object.entries(pages))writeFileSync(join(out,name),page);
  writeFileSync(join(out,"brand-mark.png"),logo);
  const workerSource=`import {handleApi} from "../src/server/api.ts"; const pages=${JSON.stringify(pages)};const logo=Uint8Array.from(atob(${JSON.stringify(logo.toString("base64"))}),c=>c.charCodeAt(0));export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith("/api/"))return handleApi(request,env);if(request.method!=="GET"&&request.method!=="HEAD")return new Response("Method not allowed",{status:405});if(url.pathname==="/brand-mark.png")return new Response(request.method==="HEAD"?null:logo,{headers:{"Content-Type":"image/png","Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"}});const path=url.pathname.replace(/\\/$/,"");const name=path===""?"index.html":path.slice(1).includes(".")?path.slice(1):path.slice(1)+".html";const html=pages[name];return html?new Response(request.method==="HEAD"?null:html,{headers:{"Content-Type":"text/html; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Cache-Control":"no-store"}}):new Response("Not found",{status:404});}};`;
  mkdirSync(join(root,"dist/server"),{recursive:true});
  await build({stdin:{contents:workerSource,resolveDir:join(root,"dist"),sourcefile:"worker.ts",loader:"ts"},bundle:true,format:"esm",platform:"browser",target:"es2022",outfile:join(root,"dist/server/index.js"),minify:true});
  mkdirSync(join(root,"dist/.openai"),{recursive:true});writeFileSync(join(root,"dist/.openai/hosting.json"),readFileSync(join(root,".openai/hosting.json")));
  console.log("Built production Worker and separate demo page.");
}
