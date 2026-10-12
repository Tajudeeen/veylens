import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cli = join(process.cwd(), "dist", "src", "cli.js");
const leakFixture = join(process.cwd(), "test", "fixtures", "zashi-crosspay-leak.json");

function sandbox(): string {
  const dir = mkdtempSync(join(tmpdir(), "veylens-"));
  copyFileSync(leakFixture, join(dir, "leak.json"));
  return dir;
}

function run(args: string[], env: Record<string, string> = {}) {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== "NO_COLOR" && k !== "FORCE_COLOR") clean[k] = v;
  }
  return spawnSync("node", [cli, ...args], { encoding: "utf-8", env: { ...clean, ...env } });
}

test("plain output has no ANSI escapes when piped", () => {
  const dir = sandbox();
  const r = run(["audit", join(dir, "leak.json")]);
  assert.equal(r.status, 1);
  assert.ok(!r.stdout.includes("\u001b["));
  assert.ok(r.stdout.includes("Veylens - audit report"));
});

test("FORCE_COLOR paints the Zcash gold", () => {
  const dir = sandbox();
  const r = run(["audit", join(dir, "leak.json")], { FORCE_COLOR: "1" });
  assert.ok(r.stdout.includes("\u001b[38;2;244;183;40m"));
});

test("NO_COLOR suppresses color even when forced", () => {
  const dir = sandbox();
  const r = run(["audit", join(dir, "leak.json")], { FORCE_COLOR: "1", NO_COLOR: "1" });
  assert.ok(!r.stdout.includes("\u001b["));
});

test("--key may come before the flow path", () => {
  const dir = sandbox();
  assert.equal(run(["keygen", dir]).status, 0);
  const r = run(["audit", "--key", join(dir, "veylens-private.pem"), join(dir, "leak.json")]);
  assert.equal(r.status, 1);
  assert.ok(!r.stderr.includes("no --key given"));
  assert.ok(existsSync(join(dir, "zashi-crosspay-zachxbt-2025-10-21.signed-report.json")));
});

test("--html writes a self-contained report that verifies", () => {
  const dir = sandbox();
  const r = run(["audit", join(dir, "leak.json"), "--html"]);
  const htmlPath = join(dir, "zashi-crosspay-zachxbt-2025-10-21.report.html");
  assert.ok(existsSync(htmlPath));
  assert.ok(r.stdout.includes("html report:"));
  const html = readFileSync(htmlPath, "utf-8");
  assert.ok(html.includes("<h1>Failed</h1>"));
  assert.ok(!/https?:\/\//.test(html.replace(/https?:\/\/[^"]*w3\.org[^"]*/g, "")));
});

test("report command renders html from an existing signed report", () => {
  const dir = sandbox();
  run(["audit", join(dir, "leak.json")]);
  const signedPath = join(dir, "zashi-crosspay-zachxbt-2025-10-21.signed-report.json");
  const out = join(dir, "out.html");
  const r = run(["report", signedPath, "--out", out]);
  assert.equal(r.status, 0);
  assert.ok(readFileSync(out, "utf-8").includes("Veylens"));
});

test("a missing option value is a clear error, not a crash", () => {
  const r = run(["audit", "x.json", "--key"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--key needs a value/);
});

test("an invalid flow file exits 2 with path-specific errors", () => {
  const dir = sandbox();
  writeFileSync(join(dir, "bad.json"), JSON.stringify({ flowId: "x", events: [{ id: "e1", kind: "shield", timestamp: 1, fromAddress: "t1", toPool: "orchard", amountZec: -5 }] }));
  const r = run(["audit", join(dir, "bad.json")]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /events\[0\]\.amountZec/);
});
