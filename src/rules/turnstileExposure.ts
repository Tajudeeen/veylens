import type { Flow, Finding, MigrateEvent } from "../types.js";

export const RULE_ID = "turnstile-exposure";

/**
 * A pool migration (e.g. Orchard to Ironwood under NU6.3) that goes
 * through the turnstile necessarily exposes the migrated amount -
 * that's how the turnstile accounting works, it's documented, expected
 * protocol behavior, not a bug in the flow being audited.
 *
 * This rule exists specifically to NOT fail the audit for this case.
 * Reporting it as `info` rather than staying silent is the point: a
 * reader of the report should see that the tool noticed the exposure
 * and consciously decided it isn't a defect, rather than either
 * missing it or crying wolf about something the protocol itself
 * accepts as a tradeoff.
 */
export function turnstileExposure(flow: Flow): Finding[] {
  const migrations = flow.events.filter(
    (e): e is MigrateEvent => e.kind === "migrate" && e.turnstile === true,
  );

  return migrations.map((m) => ({
    ruleId: RULE_ID,
    severity: "info" as const,
    message:
      `Migration (${m.id}) of ${m.amountZec} ZEC from ${m.fromPool} to ${m.toPool} ` +
      `goes through the turnstile. The amount is temporarily exposed as part of ` +
      `the turnstile's own accounting. This is expected protocol behavior for a ` +
      `pool migration, not a defect in this flow.`,
    eventIds: [m.id],
  }));
}
