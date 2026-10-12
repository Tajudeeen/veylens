import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFlow, MAX_EVENTS } from "../src/validate.js";
import { runAudit } from "../src/engine.js";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(process.cwd(), "test", "fixtures", name), "utf-8"));

const shield = { id: "e1", kind: "shield", timestamp: 1, fromAddress: "t1", toPool: "orchard", amountZec: 1 };

test("both real fixtures parse and audit identically to the unvalidated path", () => {
  for (const name of ["zashi-crosspay-leak.json", "clean-flow.json"]) {
    const raw = fixture(name);
    const parsed = parseFlow(raw);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      const a = runAudit(parsed.flow, undefined, () => 1);
      const b = runAudit(raw as never, undefined, () => 1);
      assert.deepEqual(a, b);
    }
  }
});

test("rejects non-objects", () => {
  for (const bad of [null, 5, "x", [], undefined]) assert.equal(parseFlow(bad).ok, false);
});

test("names the path of each problem", () => {
  const r = parseFlow({ flowId: "f", events: [{ ...shield, amountZec: -1 }, { id: "e2", kind: "nope", timestamp: 1 }] });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.some((e) => e.startsWith("events[0].amountZec")));
    assert.ok(r.errors.some((e) => e.startsWith("events[1].kind")));
  }
});

test("rejects NaN, Infinity and string numbers", () => {
  for (const amountZec of [Number.NaN, Number.POSITIVE_INFINITY, "1"]) {
    assert.equal(parseFlow({ flowId: "f", events: [{ ...shield, amountZec }] }).ok, false);
  }
});

test("rejects duplicate event ids", () => {
  const r = parseFlow({ flowId: "f", events: [shield, shield] });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.some((e) => e.includes("more than one event")));
});

test("rejects unknown pools and oversized strings", () => {
  assert.equal(parseFlow({ flowId: "f", events: [{ ...shield, toPool: "sprout" }] }).ok, false);
  assert.equal(parseFlow({ flowId: "f", events: [{ ...shield, fromAddress: "x".repeat(513) }] }).ok, false);
});

test("caps event count", () => {
  const events = Array.from({ length: MAX_EVENTS + 1 }, (_, i) => ({ ...shield, id: `e${i}` }));
  assert.equal(parseFlow({ flowId: "f", events }).ok, false);
});

test("drops unknown properties and ignores prototype pollution attempts", () => {
  const raw = JSON.parse(`{"flowId":"f","__proto__":{"polluted":true},"events":[{"id":"e1","kind":"shield","timestamp":1,"fromAddress":"t1","toPool":"orchard","amountZec":1,"extra":"x","__proto__":{"polluted":true}}]}`);
  const r = parseFlow(raw);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(Object.keys(r.flow.events[0] as object).sort(), ["amountZec", "fromAddress", "id", "kind", "timestamp", "toPool"]);
  }
  assert.equal(({} as Record<string, unknown>)["polluted"], undefined);
});

test("keeps an optional unshield reason, and rejects a non-string one", () => {
  const unshield = { id: "u", kind: "unshield", timestamp: 2, fromPool: "orchard", toAddress: "t2", amountZec: 1 };
  const ok = parseFlow({ flowId: "f", events: [{ ...unshield, reason: "bridge needs t-addr" }] });
  assert.equal(ok.ok && (ok.flow.events[0] as { reason?: string }).reason, "bridge needs t-addr");
  assert.equal(parseFlow({ flowId: "f", events: [{ ...unshield, reason: 5 }] }).ok, false);
});

test("caps the number of reported errors", () => {
  const events = Array.from({ length: 100 }, () => ({}));
  const r = parseFlow({ flowId: "f", events });
  assert.equal(r.ok, false);
  if (!r.ok) assert.ok(r.errors.length <= 20);
});
