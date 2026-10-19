// Push gags (Arlong 2026-10-18): Peck wobbles and fumbles his horn; Henny puffs, hops and pecks, Rooster recoils.
// Existing frames only: the lines carry one-shot tweens (`anim`) that main.js plays on the cast node / hero.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, newGame } from "../js/logic.js";
import { SPEAKER } from "../data/script.js";

const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
const push = (room, id) => { const s = newGame(); s.room = room; return act({ ...s, verb: "push" }, { t: "hotspot", id }); };

test("push Farmer Peck: he wobbles, the horn pops off, and he mishears it", () => {
  const r = push("barn", "peck");
  assert.deepEqual(r.lines[0].anim, { peck: "wobble" });
  assert.match(r.lines[0].text, /horn pops off/);
  assert.equal(r.lines[1].speaker, SPEAKER.peck);
  assert.match(r.lines[1].text, /EH\?/);
  assert.match(css, /\.anim-wobble/);
  assert.deepEqual(r.state.flags, newGame().flags, "a gag: no story state");
});

test("push Henny: she puffs up and pecks, he recoils, and she only thinks it", () => {
  const r = push("fence", "henny");
  assert.deepEqual(r.lines[0].anim, { henny: "puff", hero: "recoil" });
  assert.ok(r.lines[1].thought && r.lines[1].speaker === SPEAKER.henny, "Henny never speaks");
  assert.match(css, /\.anim-puff/); assert.match(css, /\.anim-recoil/);
  assert.deepEqual(r.state.flags, newGame().flags);
});
