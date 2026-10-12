import type { Flow, FlowEvent, Pool } from "./types.js";

export const MAX_EVENTS = 5000;
export const MAX_STRING = 512;
const MAX_ERRORS = 20;
const POOLS: readonly string[] = ["transparent", "sapling", "orchard", "ironwood"];

export type ParseResult = { ok: true; flow: Flow } | { ok: false; errors: string[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Validates untrusted input into a Flow. Output objects are rebuilt field
 * by field, so unknown properties (including __proto__ tricks) never reach
 * the engine. Errors name the path so a person can fix their file.
 */
export function parseFlow(input: unknown): ParseResult {
  const errors: string[] = [];
  const err = (msg: string): void => {
    if (errors.length < MAX_ERRORS) errors.push(msg);
  };

  if (!isObj(input)) return { ok: false, errors: ["The flow must be a JSON object."] };

  const str = (o: Obj, key: string, path: string): string => {
    const v = o[key];
    if (typeof v !== "string" || v.length === 0) {
      err(`${path}.${key} must be a non-empty string.`);
      return "";
    }
    if (v.length > MAX_STRING) {
      err(`${path}.${key} is longer than ${MAX_STRING} characters.`);
      return "";
    }
    return v;
  };
  const num = (o: Obj, key: string, path: string): number => {
    const v = o[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      err(`${path}.${key} must be a non-negative number.`);
      return 0;
    }
    return v;
  };
  const bool = (o: Obj, key: string, path: string): boolean => {
    const v = o[key];
    if (typeof v !== "boolean") {
      err(`${path}.${key} must be true or false.`);
      return false;
    }
    return v;
  };
  const pool = (o: Obj, key: string, path: string): Pool => {
    const v = o[key];
    if (typeof v !== "string" || !POOLS.includes(v)) {
      err(`${path}.${key} must be one of ${POOLS.join(", ")}.`);
      return "transparent";
    }
    return v as Pool;
  };

  const flowId = str(input, "flowId", "flow");
  const rawEvents = input["events"];
  if (!Array.isArray(rawEvents)) {
    err("flow.events must be an array.");
    return { ok: false, errors };
  }
  if (rawEvents.length > MAX_EVENTS) {
    return { ok: false, errors: [`A flow can have at most ${MAX_EVENTS} events.`] };
  }

  const events: FlowEvent[] = [];
  const seen = new Set<string>();

  rawEvents.forEach((raw: unknown, i: number) => {
    const path = `events[${i}]`;
    if (!isObj(raw)) {
      err(`${path} must be an object.`);
      return;
    }
    const id = str(raw, "id", path);
    const timestamp = num(raw, "timestamp", path);
    if (id) {
      if (seen.has(id)) err(`${path}.id "${id}" is used by more than one event.`);
      seen.add(id);
    }
    const kind = raw["kind"];

    switch (kind) {
      case "shield":
        events.push({ id, timestamp, kind, fromAddress: str(raw, "fromAddress", path), toPool: pool(raw, "toPool", path), amountZec: num(raw, "amountZec", path) });
        break;
      case "unshield": {
        const base = { id, timestamp, kind, fromPool: pool(raw, "fromPool", path), toAddress: str(raw, "toAddress", path), amountZec: num(raw, "amountZec", path) } as const;
        const reason = raw["reason"];
        if (reason === undefined) events.push(base);
        else if (typeof reason === "string" && reason.length <= MAX_STRING) events.push({ ...base, reason });
        else err(`${path}.reason must be a string of at most ${MAX_STRING} characters.`);
        break;
      }
      case "intent_submit":
        events.push({ id, timestamp, kind, intentId: str(raw, "intentId", path), sourcePool: pool(raw, "sourcePool", path), amountZec: num(raw, "amountZec", path), destChain: str(raw, "destChain", path), destAsset: str(raw, "destAsset", path) });
        break;
      case "settlement":
        events.push({ id, timestamp, kind, intentId: str(raw, "intentId", path), destChain: str(raw, "destChain", path), destAddress: str(raw, "destAddress", path), destAmount: num(raw, "destAmount", path) });
        break;
      case "refund":
        events.push({ id, timestamp, kind, intentId: str(raw, "intentId", path), toAddress: str(raw, "toAddress", path), amountZec: num(raw, "amountZec", path), shielded: bool(raw, "shielded", path) });
        break;
      case "migrate":
        events.push({ id, timestamp, kind, fromPool: pool(raw, "fromPool", path), toPool: pool(raw, "toPool", path), amountZec: num(raw, "amountZec", path), turnstile: bool(raw, "turnstile", path) });
        break;
      default:
        err(`${path}.kind must be one of shield, unshield, intent_submit, settlement, refund, migrate.`);
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, flow: { flowId, events } };
}
