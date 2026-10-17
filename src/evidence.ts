import {reviewCaseV2} from './legacy/case-v2.js';
import {reviewCaseV1} from './legacy/case-v1.js';
import {isCase,reviewCase} from './case.js';
import { isZcashEvidence, reviewZcashEvidence } from "./zcashEvidence.js";
import { verifyQuoteSignature, type QuoteResponse } from "@defuse-protocol/one-click-sdk-typescript";
import { parseFlow } from "./validate.js";
import { runAudit } from "./engine.js";
import type { Evidence, Finding, Report } from "./types.js";

const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const text = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length <= 512;
const amount = (x: unknown): x is string => typeof x === "string" && /^(0|[1-9][0-9]{0,99})$/.test(x);
const date = (x: unknown): x is string => text(x) && /^\d{4}-\d{2}-\d{2}T/.test(x) && Number.isFinite(Date.parse(x));
const STATUS = new Set(["KNOWN_DEPOSIT_TX", "PENDING_DEPOSIT", "INCOMPLETE_DEPOSIT", "PROCESSING", "SUCCESS", "REFUNDED", "FAILED"]);
export const ZEC_ASSET = "nep141:zec.omft.near";
export const PROVIDER_RULESET = "oneclick-refund/1.0.0";

/** Stable JSON for input digests and optional signed metadata. Array order is retained. */
export function stableJson(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stableJson).join(",")}]`;
  if (obj(x)) return `{${Object.keys(x).sort().filter(k => x[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableJson(x[k])}`).join(",")}}`;
  return JSON.stringify(x) ?? "null";
}
export async function digestInput(raw: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(raw));
  return Array.from(new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
}

export function isProviderInput(raw: unknown): boolean {
  return obj(raw) && (raw["format"] === "veylens-evidence/1" || "quoteRequest" in raw || "quoteResponse" in raw);
}
export type EvidenceResult = { ok: true; report: Report } | { ok: false; errors: string[] };

/** Local import only. Never synthesizes shield/refund transactions from quote timestamps. */
export async function reviewProviderInput(raw: unknown, now = Math.floor(Date.now() / 1000)): Promise<EvidenceResult> {
  if (!obj(raw)) return { ok: false, errors: ["Expected a 1Click quote/status JSON object."] };
  let provider: unknown = raw;
  let context: unknown;
  if (raw["format"] === "veylens-evidence/1") {
    provider = raw["provider"];
    context = raw["context"];
  }
  if (!obj(provider)) return { ok: false, errors: ["provider must contain the original quote or status response."] };
  const isStatus = "quoteResponse" in provider;
  const quote = isStatus ? provider["quoteResponse"] : provider;
  if (!obj(quote) || !obj(quote["quoteRequest"]) || !obj(quote["quote"])) return { ok: false, errors: ["Missing quoteRequest or quote object."] };
  const request = quote["quoteRequest"];
  const values = quote["quote"];
  const errors: string[] = [];
  for (const key of ["originAsset", "destinationAsset", "refundTo", "refundType", "recipient", "recipientType", "depositType", "swapType"]) {
    if (!text(request[key])) errors.push(`quoteRequest.${key} must be a non-empty string, up to 512 characters.`);
  }
  if (typeof request["dry"] !== "boolean") errors.push("quoteRequest.dry must be a boolean.");
  if (!amount(request["amount"])) errors.push("quoteRequest.amount must be a non-negative integer string.");
  if (!date(quote["timestamp"])) errors.push("timestamp must be an ISO date-time.");
  if (!date(request["deadline"])) errors.push("quoteRequest.deadline must be an ISO date-time.");
  if (!text(quote["correlationId"])) errors.push("correlationId is missing or too long.");
  if (!Number.isSafeInteger(request["slippageTolerance"]) || Number(request["slippageTolerance"]) < 0) errors.push("slippageTolerance must be a non-negative integer.");
  if (!["ORIGIN_CHAIN", "INTENTS"].includes(String(request["refundType"]))) errors.push("Unsupported refundType.");
  if (request["originAsset"] !== ZEC_ASSET) errors.push("This adapter supports native Zcash-origin quotes only: nep141:zec.omft.near.");
  for (const key of ["amountIn", "amountOut", "minAmountOut"]) if (!amount(values[key])) errors.push(`quote.${key} must be an integer string.`);
  if (isStatus) {
    if (!STATUS.has(String(provider["status"]))) errors.push("Unrecognized status value.");
    if (!date(provider["updatedAt"])) errors.push("updatedAt must be an ISO date-time.");
    if (!obj(provider["swapDetails"])) errors.push("swapDetails must be an object.");
    if (obj(provider["swapDetails"])) {
      const details = provider["swapDetails"];
      if (details["refundedAmount"] !== undefined && !amount(details["refundedAmount"])) errors.push("swapDetails.refundedAmount must be an integer string.");
      for (const key of ["originChainTxHashes", "destinationChainTxHashes"]) {
        if (details[key] !== undefined && (!Array.isArray(details[key]) || details[key].length > 100 || details[key].some((v: unknown) => !obj(v) || !text(v["hash"])))) errors.push(`swapDetails.${key} must contain at most 100 hash records.`);
      }
    }
  }
  let sources: string[] = [];
  if (context !== undefined) {
    if (!obj(context) || !Array.isArray(context["shieldingSourceAddresses"]) || context["shieldingSourceAddresses"].length > 100 || context["shieldingSourceAddresses"].some((v: unknown) => !text(v))) errors.push("context.shieldingSourceAddresses must be an array of at most 100 address strings.");
    else sources = context["shieldingSourceAddresses"] as string[];
  }
  if (errors.length) return { ok: false, errors };
  // The SDK pins its manager public key. Never accept an embedded replacement trust key.
  const signatureState = !text(quote["signature"]) ? "missing" : verifyQuoteSignature(quote as unknown as QuoteResponse) ? "valid" : "invalid";
  const refundTo = request["refundTo"] as string;
  const refundType = request["refundType"] as string;
  const transparentPrefix = /^(t1|t3|tm|t2)/.test(refundTo);
  const facts: Evidence["facts"] = [
    { path: "quoteRequest.originAsset", value: ZEC_ASSET, trust: signatureState === "valid" ? "provider-signed" : "unverified-import" },
    { path: "quoteRequest.refundTo", value: refundTo, trust: signatureState === "valid" ? "provider-signed" : "unverified-import" },
    { path: "quoteRequest.refundType", value: refundType, trust: signatureState === "valid" ? "provider-signed" : "unverified-import" },
    { path: "quoteRequest.amount", value: request["amount"] as string, trust: signatureState === "valid" ? "provider-signed" : "unverified-import" },
    { path: "timestamp", value: quote["timestamp"] as string, trust: signatureState === "valid" ? "provider-signed" : "unverified-import" },
  ];
  const gaps = ["No independently verified Zcash shielding source or refund transaction.", "Configured refund destination does not prove actual refund delivery or shielding."];
  const findings: Finding[] = [];
  const add = (ruleId: string, severity: Finding["severity"], message: string, paths: string[]): void => { findings.push({ ruleId, severity, message, eventIds: paths }); };
  if (signatureState !== "valid") {
    gaps.push("Quote origin is not authenticated against the SDK's pinned provider key.");
    add("provider-quote-authenticity", "medium", `Quote signature is ${signatureState}. Treat its fields as unverified input, even if an address looks safe.`, ["signature"]);
  }
  if (request["dry"] === true) gaps.push("Dry quote: no deposit or refund transaction was created by this quote.");
  if (refundType === "ORIGIN_CHAIN" && transparentPrefix) {
    add("transparent-refund-configuration", "medium", "The configured origin-chain refund destination has a transparent Zcash address prefix. This is a configuration exposure signal. Address checksum and actual refund output are not verified.", ["quoteRequest.refundTo", "quoteRequest.refundType"]);
    if (sources.includes(refundTo)) add("configured-refund-source-reuse", "high", "The configured refund address equals a user-declared shielding source. The quote may authenticate the destination, but the shielding-source relationship remains a user assertion. This is a declared configuration risk, not a verified on-chain leak.", ["quoteRequest.refundTo", "context.shieldingSourceAddresses"]);
  } else if (refundType === "ORIGIN_CHAIN") {
    gaps.push("Refund address receiver type and checksum are not decoded. A Unified Address alone does not prove shielded delivery.");
  } else {
    gaps.push("An INTENTS refund is not a shielded Zcash refund. The eventual withdrawal path is unknown.");
  }
  if (!sources.length) gaps.push("No wallet-provided shielding-source context to assess address reuse.");
  else facts.push({ path: "context.shieldingSourceAddresses", value: sources.join(", "), trust: "user-assertion" });
  if (Date.parse(request["deadline"] as string) < now * 1000) gaps.push("The quote deadline has expired; this is historical configuration evidence.");
  if (isStatus) {
    facts.push({ path: "status", value: String(provider["status"]), trust: "provider-reported-unverified" });
    gaps.push("Outer status, refunded amounts, and transaction hashes are not covered by the embedded quote signature.");
    const details = provider["swapDetails"] as Record<string, unknown>;
    if (details["refundedAmount"] !== undefined) facts.push({ path: "swapDetails.refundedAmount", value: details["refundedAmount"] as string, trust: "provider-reported-unverified" });
    for (const key of ["originChainTxHashes", "destinationChainTxHashes"]) {
      for (const [i, row] of ((details[key] as Record<string, unknown>[] | undefined) ?? []).entries()) facts.push({ path: `swapDetails.${key}[${i}].hash`, value: row["hash"] as string, trust: "provider-reported-unverified" });
    }
    if (provider["status"] === "REFUNDED" && (!amount(details["refundedAmount"]) || BigInt(details["refundedAmount"]) === 0n)) gaps.push("REFUNDED status conflicts with absent or zero refunded amount.");
  }
  const evidence: Evidence = {
    format: "oneclick-evidence/1", inputDigest: await digestInput(raw), providerDigest: await digestInput(provider),
    quoteSignature: signatureState, coverage: "incomplete", kind: isStatus ? "status" : "quote",
    facts, gaps, scope: "Refund configuration review, not chain verification or full-flow privacy certification",
  };
  return { ok: true, report: {
    flowId: quote["correlationId"] as string, rulesetVersion: PROVIDER_RULESET, generatedAt: now,
    findings, overallResult: findings.some(f => f.severity === "high") ? "fail" : "insufficient", evidence,
  } };
}

/** Re-checks the actual source record; a report signature alone cannot authenticate its claims. */
export async function checkSourceRecord(raw: unknown, report: Report): Promise<{ valid: boolean; reason: string }> {
  if (!report.evidence || await digestInput(raw) !== report.evidence.inputDigest) return { valid: false, reason: "Canonical input digest does not match this report." };
  if (isCase(raw)) {
    const reviewed=await (report.rulesetVersion==='case-review/1.1.0'?reviewCaseV1:report.rulesetVersion==='case-review/1.2.0'?reviewCaseV2:reviewCase)(raw,report.generatedAt);
    return reviewed.ok&&stableJson(reviewed.report)===stableJson(report)?{valid:true,reason:"Case evidence, collection receipts and findings match source replay. Consensus and ownership remain outside scope."}:{valid:false,reason:"Case source replay does not match."};
  }
  if (isZcashEvidence(raw)) {
    const reviewed = await reviewZcashEvidence(raw, report.generatedAt);
    if (!reviewed.ok || stableJson(reviewed.report) !== stableJson(report)) return { valid: false, reason: "Zcash source re-analysis does not match the report." };
    return { valid: true, reason: "Zcash transaction ID checks and source re-analysis match. Canonical chain inclusion and refund attribution remain unverified." };
  }
  if (!isProviderInput(raw)) {
    const parsed = parseFlow(raw);
    if (!parsed.ok) return { valid: false, reason: "Declared source record is invalid." };
    const recomputed = runAudit(parsed.flow, undefined, () => report.generatedAt);
    recomputed.evidence = await declaredEvidence(raw);
    if (stableJson(recomputed) !== stableJson(report)) return { valid: false, reason: "Declared-flow findings or provenance do not match source re-analysis." };
    return { valid: true, reason: "Declared input digest and pattern re-analysis match. Its events remain unauthenticated user assertions." };
  }
  const reviewed = await reviewProviderInput(raw, report.generatedAt);
  if (!reviewed.ok) return { valid: false, reason: "The source is not a supported provider record." };
  if (stableJson(reviewed.report) !== stableJson(report)) return { valid: false, reason: "Report conclusions or provenance do not match independent source re-analysis." };
  return { valid: true, reason: `Source digest and re-analysis match. Quote signature: ${reviewed.report.evidence?.quoteSignature}. Status and on-chain activity remain independently unverified.` };
}

export async function declaredEvidence(raw: unknown): Promise<Evidence> {
  return {
    format: "declared-flow/1", inputDigest: await digestInput(raw), kind: "declared-flow", coverage: "incomplete",
    facts: [], scope: "Pattern checks on user-declared events, without transaction authentication",
    gaps: ["All flow events are user assertions.", "No independent Zcash transaction or wallet evidence was authenticated.", "Completeness and actual refund delivery are unknown."],
  };
}
