export function stableMetadata(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stableMetadata).join(",")}]`;
  if (x && typeof x === "object") return `{${Object.keys(x).sort().filter(k => (x as Record<string, unknown>)[k] !== undefined).map(k => `${JSON.stringify(k)}:${stableMetadata((x as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(x) ?? "null";
}
import type { Report } from "./types.js";

/**
 * Explicit field list, not raw JSON.stringify(report): the hash stays
 * stable regardless of how the Report object was built or what key order
 * an engine used. Pure and dependency-free so Node and the browser share
 * exactly one implementation.
 */
export function canonicalize(report: Report): string {
  return JSON.stringify({
    flowId: report.flowId,
    rulesetVersion: report.rulesetVersion,
    generatedAt: report.generatedAt,
    findings: report.findings.map((f) => ({
      ruleId: f.ruleId,
      severity: f.severity,
      message: f.message,
      eventIds: [...f.eventIds],
    })),
    overallResult: report.overallResult,
    ...(report.evidence ? { evidence: JSON.parse(stableMetadata(report.evidence)) } : {}),
  });
}
