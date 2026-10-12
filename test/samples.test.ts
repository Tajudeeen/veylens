import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEAK_FLOW, CLEAN_FLOW } from "../src/web/samples.js";

const fixture = (n: string): unknown => JSON.parse(readFileSync(join(process.cwd(), "test", "fixtures", n), "utf-8"));

test("web samples are identical to the CLI fixtures", () => {
  assert.deepEqual(LEAK_FLOW, fixture("zashi-crosspay-leak.json"));
  assert.deepEqual(CLEAN_FLOW, fixture("clean-flow.json"));
});
