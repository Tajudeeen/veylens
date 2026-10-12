#!/usr/bin/env node
import {isCase,reviewCase} from './case.js';
import { isZcashEvidence, reviewZcashEvidence } from "./zcashEvidence.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { isProviderInput, reviewProviderInput, digestInput, checkSourceRecord, declaredEvidence } from "./evidence.js";
import type { Flow } from "./types.js";
import { runAudit } from "./engine.js";
import { generateKeyPair, signReport, verifySignedReport, type SignedReport } from "./attest.js";
import { colorEnabled, paint, type Style } from "./brand.js";
import { renderHtmlReport } from "./viewer.js";
import { parseFlow } from "./validate.js";

const useColor = colorEnabled(process.env, process.stdout.isTTY === true);
const c = (text: string, style: Style): string => paint(text, style, useColor);

const VALUE_FLAGS = new Set(["--key", "--out"]);

interface ParsedArgs {
  positional: string[];
  flags: Set<string>;
  options: Map<string, string>;
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Set<string>();
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (VALUE_FLAGS.has(arg)) {
      const value = args[i + 1];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      options.set(arg, value);
      i++;
    } else if (arg.startsWith("--")) {
      flags.add(arg);
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags, options };
}

function readJson<T>(path: string): T {
  const input = readFileSync(path, "utf-8");
  if (input.length > 2_000_000) throw new Error("Input exceeds 2 MB.");
  return JSON.parse(input) as T;
}

function severityStyle(severity: "info" | "medium" | "high"): Style {
  return severity === "high" ? "goldBold" : severity === "medium" ? "gold" : "dim";
}

function printReportHuman(signed: SignedReport, jsonPath: string, htmlPath: string | undefined): void {
  const { report } = signed;
  const resultLabel = { pass: "PASS", warn: "WARN", fail: "FAIL", insufficient: "INSUFFICIENT EVIDENCE" }[report.overallResult];
  const resultStyle: Style = report.overallResult === "pass" ? "bold" : "goldBold";

  console.log(`${c("Veylens", "goldBold")} - audit report`);
  console.log(`Flow:    ${report.flowId}`);
  console.log(`Ruleset: v${report.rulesetVersion}`);
  console.log(`Result:  ${c(resultLabel, resultStyle)}`);
  console.log("");

  if (report.findings.length === 0) {
    console.log("No findings. No leak patterns from the ruleset were matched.");
  } else {
    console.log("Findings:");
    for (const f of report.findings) {
      console.log(`  ${c(`[${f.severity.toUpperCase()}] ${f.ruleId}`, severityStyle(f.severity))}`);
      console.log(`    ${f.message}`);
      console.log(`    events: ${f.eventIds.join(", ")}`);
    }
  }

  if (report.evidence) {
    console.log(`Evidence: ${report.evidence.scope}`);
    console.log(`Quote signature: ${report.evidence.quoteSignature ?? "not applicable"}`);
    for (const gap of report.evidence.gaps) console.log(`  Missing: ${gap}`);
  }
  console.log("");
  console.log(c("Attestation:", "bold"));
  console.log(`  report hash: ${signed.reportHash}`);
  console.log(`  signature:   ${signed.signature.slice(0, 32)}...`);
  console.log(`  written to:  ${jsonPath}`);
  if (htmlPath) console.log(`  html report: ${htmlPath}`);
  console.log(`  verify with: veylens verify ${jsonPath}`);
  console.log("");
  console.log(
    c(
      "Note: this checks the named rule set only (refund address reuse, " +
        "unjustified unshielded hops, timing correlation, turnstile exposure). " +
        "It is not a formal proof that the flow has no privacy leak outside " +
        "those four patterns.",
      "dim",
    ),
  );
}

async function cmdAudit(args: string[]): Promise<void> {
  const { positional, flags, options } = parseArgs(args);
  const flowPath = positional[0];
  if (!flowPath) {
    console.error("usage: veylens audit <flow.json> [--json] [--html] [--key <privateKey.pem>]");
    process.exitCode = 1;
    return;
  }

  const keyPath = options.get("--key");
  const raw = readJson<unknown>(flowPath);
  const parsed = isCase(raw) ? await reviewCase(raw) : isZcashEvidence(raw) ? await reviewZcashEvidence(raw) : isProviderInput(raw) ? await reviewProviderInput(raw) : parseFlow(raw);
  if (!parsed.ok) {
    console.error(`veylens: ${flowPath} is not a valid supported input:`);
    for (const e of parsed.errors) console.error(`  - ${e}`);
    process.exitCode = 2; return;
  }
  const report = "report" in parsed ? parsed.report : runAudit(parsed.flow);
  if (!report.evidence) report.evidence = await declaredEvidence(raw);
  const safeId = report.flowId.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 80) || "report";

  const privateKeyPem = keyPath ? readFileSync(keyPath, "utf-8") : generateKeyPair().privateKeyPem;
  if (!keyPath) {
    console.error(
      "no --key given: signing with a freshly generated, one-off key for this " +
        "run. Use `veylens keygen <dir>` for a persistent key.",
    );
  }

  const signed = signReport(report, privateKeyPem);

  const jsonPath = join(dirname(flowPath), `${safeId}.signed-report.json`);
  writeFileSync(jsonPath, JSON.stringify(signed, null, 2));

  let htmlPath: string | undefined;
  if (flags.has("--html")) {
    htmlPath = join(dirname(flowPath), `${safeId}.report.html`);
    writeFileSync(htmlPath, renderHtmlReport(signed));
  }

  if (flags.has("--json")) {
    console.log(JSON.stringify(signed, null, 2));
  } else {
    printReportHuman(signed, jsonPath, htmlPath);
  }

  process.exitCode = report.overallResult === "fail" ? 1 : report.overallResult === "insufficient" ? 3 : 0;
}

function cmdReport(args: string[]): void {
  const { positional, options } = parseArgs(args);
  const signedPath = positional[0];
  if (!signedPath) {
    console.error("usage: veylens report <signed-report.json> [--out <report.html>]");
    process.exitCode = 1;
    return;
  }

  const signed = readJson<SignedReport>(signedPath);
  const outPath = options.get("--out") ?? signedPath.replace(/\.json$/, "") + ".html";
  writeFileSync(outPath, renderHtmlReport(signed));
  console.log(`Wrote ${outPath}`);
}

function cmdVerify(args: string[]): void {
  const { positional } = parseArgs(args);
  const signedPath = positional[0];
  if (!signedPath) {
    console.error("usage: veylens verify <signed-report.json>");
    process.exitCode = 1;
    return;
  }

  const signed = readJson<SignedReport>(signedPath);
  const result = verifySignedReport(signed);

  if (result.valid) {
    console.log(`${c("VALID", "goldBold")} - report hash ${signed.reportHash} verifies against the embedded signature.`);
    process.exitCode = 0;
  } else {
    console.log(`${c("INVALID", "goldBold")} - ${result.reason}`);
    process.exitCode = 1;
  }
}

function cmdKeygen(args: string[]): void {
  const { positional } = parseArgs(args);
  const outDir = positional[0] ?? ".";
  mkdirSync(outDir, { recursive: true });
  const { publicKeyPem, privateKeyPem } = generateKeyPair();
  writeFileSync(join(outDir, "veylens-private.pem"), privateKeyPem, { mode: 0o600 });
  writeFileSync(join(outDir, "veylens-public.pem"), publicKeyPem);
  console.log(`Wrote veylens-private.pem and veylens-public.pem to ${outDir}`);
}

async function cmdVerifyInput(args: string[]): Promise<void> {
  const { positional } = parseArgs(args);
  if (!positional[0] || !positional[1]) throw new Error("usage: veylens verify-input <source.json> <signed-report.json>");
  const signed = readJson<SignedReport>(positional[1]);
  const signature = verifySignedReport(signed);
  if (!signature.valid) throw new Error(`Invalid report: ${signature.reason}`);
  const result = await checkSourceRecord(readJson<unknown>(positional[0]), signed.report);
  console.log(result.reason);
  process.exitCode = result.valid ? 0 : 1;
}
async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  try {
    switch (cmd) {
      case "audit":
        await cmdAudit(rest);
        break;
      case "verify-input":
        await cmdVerifyInput(rest);
        break;
      case "report":
        cmdReport(rest);
        break;
      case "verify":
        cmdVerify(rest);
        break;
      case "keygen":
        cmdKeygen(rest);
        break;
      default:
        console.error("usage: veylens <audit|report|verify|verify-input|keygen> ...");
        process.exitCode = 1;
    }
  } catch (err) {
    console.error(`veylens: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}

void main();
