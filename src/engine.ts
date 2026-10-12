import type { Flow, Rule, Report, OverallResult } from "./types.js";
import { refundAddressReuse } from "./rules/refundReuse.js";
import { unjustifiedUnshieldedHop } from "./rules/unshieldedHop.js";
import { timingCorrelation } from "./rules/timingCorrelation.js";
import { turnstileExposure } from "./rules/turnstileExposure.js";

export const RULESET_VERSION = "1.1.0";

export const DEFAULT_RULES: Rule[] = [
  refundAddressReuse,
  unjustifiedUnshieldedHop,
  timingCorrelation,
  turnstileExposure,
];

function resolveOverallResult(severities: Array<"info" | "medium" | "high">): OverallResult {
  if (severities.includes("high")) return "fail";
  if (severities.includes("medium")) return "warn";
  return "pass";
}

export function runAudit(
  flow: Flow,
  rules: Rule[] = DEFAULT_RULES,
  now: () => number = () => Math.floor(Date.now() / 1000),
): Report {
  const findings = rules.flatMap((rule) => rule(flow));
  const detected = resolveOverallResult(findings.map((f) => f.severity));
  const overallResult = detected === "fail" ? "fail" : "insufficient";

  return {
    flowId: flow.flowId,
    rulesetVersion: RULESET_VERSION,
    generatedAt: now(),
    findings,
    overallResult,
  };
}
