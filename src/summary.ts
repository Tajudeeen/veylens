import type { Finding, OverallResult } from "./types.js";

export const VERDICT: Record<OverallResult, string> = {
  fail: "Failed",
  warn: "Passed with warnings",
  pass: "Passed",
  insufficient: "Insufficient evidence",
};

export const SEVERITY_LABEL: Record<Finding["severity"], string> = {
  high: "High",
  medium: "Medium",
  info: "Info",
};

export function summarize(findings: Finding[], result: OverallResult): string {
  if (result === "insufficient") return "Evidence is incomplete. Review the findings and missing evidence before drawing a privacy conclusion.";
  if (findings.length === 0) return "No leak patterns from the ruleset matched this flow.";
  const count = (s: Finding["severity"]): number => findings.filter((f) => f.severity === s).length;
  const parts: string[] = [];
  if (count("high")) parts.push(`${count("high")} high`);
  if (count("medium")) parts.push(`${count("medium")} medium`);
  if (count("info")) parts.push(`${count("info")} info`);
  const lead = result === "fail" ? "A high-severity leak pattern matched." : "No high-severity pattern matched.";
  return `${lead} Findings: ${parts.join(", ")}.`;
}
