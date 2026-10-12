import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderApp, renderSitePages } from "./page.js";

/** Bundles the browser app and assembles one self-contained HTML file. */
export async function buildAppHtml(root: string = process.cwd()): Promise<string> {
  const result = await build({
    entryPoints: [join(root, "src", "web", "app.ts")],
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
  const outDir = join(process.cwd(), "dist", "client");
  mkdirSync(outDir, { recursive: true });
  const js = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (!js) throw new Error("Missing browser bundle");
  const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8")) as { version: string };
  for (const [name, page] of Object.entries(renderSitePages({ js, version: pkg.version }))) writeFileSync(join(outDir, name), page);
  writeFileSync(join(outDir, "standalone.html"), html);
  console.log("Wrote landing, workspace, verifier, methodology, and legacy standalone pages.");
}
