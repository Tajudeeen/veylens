import { test } from "node:test";
import assert from "node:assert/strict";
import { BRAND, colorEnabled, paint } from "../src/brand.js";

test("brand palette matches the published Zcash black and yellow", () => {
  assert.equal(BRAND.ink, "#231F20");
  assert.equal(BRAND.gold, "#F4B728");
});

test("gold escape sequence encodes #F4B728 as 24-bit RGB", () => {
  const painted = paint("x", "gold", true);
  assert.ok(painted.includes("38;2;244;183;40m"));
  assert.equal(0xf4, 244);
  assert.equal(0xb7, 183);
  assert.equal(0x28, 40);
});

test("paint is a no-op when color is disabled", () => {
  assert.equal(paint("plain", "goldBold", false), "plain");
});

test("NO_COLOR wins over FORCE_COLOR and TTY", () => {
  assert.equal(colorEnabled({ NO_COLOR: "1", FORCE_COLOR: "1" }, true), false);
});

test("FORCE_COLOR enables color without a TTY, FORCE_COLOR=0 does not", () => {
  assert.equal(colorEnabled({ FORCE_COLOR: "1" }, false), true);
  assert.equal(colorEnabled({ FORCE_COLOR: "0" }, false), false);
});

test("falls back to TTY detection", () => {
  assert.equal(colorEnabled({}, true), true);
  assert.equal(colorEnabled({}, false), false);
});

test("empty NO_COLOR is ignored, per the NO_COLOR convention", () => {
  assert.equal(colorEnabled({ NO_COLOR: "" }, true), true);
});
