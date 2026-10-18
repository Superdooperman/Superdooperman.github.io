import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ROOMS } from "../data/script.js";
import { spriteFilter } from "../js/walk.js";

const TINTED = { gate: "brightness(0.8) saturate(0.85) sepia(0.1)", henhouse: "brightness(0.72) saturate(0.8) sepia(0.15) hue-rotate(-4deg)" }; // the staged values Arlong approved (2026-10-18)

test("spriteTint is off by default: only the tinted rooms set it, and missing/empty gives no filter", () => {
  for (const [id, room] of Object.entries(ROOMS)) assert.equal(spriteFilter(room), TINTED[id] || "", `${id} tint`);
  assert.equal(spriteFilter(undefined), "");
  assert.equal(spriteFilter({}), "");
  assert.equal(spriteFilter({ spriteTint: null }), "");
  assert.equal(spriteFilter({ spriteTint: {} }), "");
  assert.equal(spriteFilter({ spriteTint: "brightness(0)" }), "");
});

test("spriteTint becomes one CSS filter in a fixed order", () => {
  assert.equal(spriteFilter({ spriteTint: { saturate: 0.85, brightness: 0.8 } }), "brightness(0.8) saturate(0.85)");
  assert.equal(spriteFilter({ spriteTint: { brightness: 0.72, contrast: 1.05, saturate: 0.8, sepia: 0.15, hue: -6 } }),
    "brightness(0.72) contrast(1.05) saturate(0.8) sepia(0.15) hue-rotate(-6deg)");
});

test("spriteTint drops unknown keys and bad values instead of blanking sprites", () => {
  assert.equal(spriteFilter({ spriteTint: { brightness: "0.5", saturate: NaN, sepia: 3, blur: 2, hue: 400 } }), "");
  assert.equal(spriteFilter({ spriteTint: { brightness: -1, contrast: 1.1 } }), "contrast(1.1)");
});

test("main.js applies the tint to hero, pose and cast sprites only", () => {
  const src = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(src, /const tint = spriteFilter\(room\)/);
  assert.equal((src.match(/if \(tint\) \w+\.style\.filter = tint;/g) || []).length, 3);
});
