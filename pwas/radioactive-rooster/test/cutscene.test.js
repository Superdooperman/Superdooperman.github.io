// Give grub to Mortgage (Arlong 2026-10-18): the matador cutscene plays first, then the line; the story outcome is the
// same (ribbon given, grub gone, got_ribbon), survives save/load, every frame it asks for exists, and Mortgage charges
// along the barn floor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, newGame } from "../js/logic.js";
import { ROOMS } from "../data/script.js";
import { depthHeight } from "../js/walk.js";

const man = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url))).assets;
const barn = ROOMS.barn, cs = barn.cutscenes.grub;
const inside = ([x, y]) => barn.walk.some((poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; });

test("give grub to Mortgage: cutscene, then ribbon; same flags after save/load", () => {
  const s = newGame(); s.room = "barn"; s.inv = ["grub"];
  const r = act({ ...s, verb: "use", pending: "grub" }, { t: "hotspot", id: "goat" });
  assert.equal(r.lines[0].cutscene, "grub");
  const saved = structuredClone(r.state);
  for (const st of [r.state, saved]) {
    assert.ok(st.flags.got_ribbon); assert.ok(st.inv.includes("ribbon")); assert.ok(!st.inv.includes("grub"));
  }
  const again = act({ ...saved, verb: "talk" }, { t: "hotspot", id: "goat" });
  assert.ok(!again.lines.some((l) => l.cutscene), "it only plays once");
});

test("every cutscene frame exists at the size it is drawn, and the charge stays on the floor", () => {
  let at = barn.hero.at;
  for (const [, s, from, to] of cs.hero) {
    for (const p of [from, to].filter(Boolean)) { assert.ok(inside(p), `hero ${p} on the floor`); at = p; }
    for (const f of [].concat(s)) for (const y of [128, 130, 134, 136, 140, 152, 178]) assert.ok(man[`sprite/${f}-h${depthHeight(barn.hero, y)}`], `${f} at y${y}`);
  }
  for (const [, s, from, to] of cs.goat) {
    for (const p of [from, to].filter(Boolean)) assert.ok(inside(p), `Mortgage ${p} on the floor`);
    for (const f of [].concat(s)) assert.ok(man[`sprite/${f}-h44`], f);
  }
  assert.ok(man["fx/bonk"] && man["fg/barn--ribbon"]);
  assert.ok(cs.hero.some((k) => /matador-hop/.test(k[1])) && cs.goat.some((k) => k[1] === "mortgage-dazed-r"));
  assert.match(readFileSync(new URL("../js/main.js", import.meta.url), "utf8"), /function playCutscene[\s\S]*cs-block/, "input is locked");
});
