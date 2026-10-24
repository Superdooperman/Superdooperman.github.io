// Push A (Oct 24, NEXT-VERSION-NOTES items 29-46): self lines, the new cutscenes' frames, the flashback layer art,
// the getaway car / hen cues, and the walk-first wiring in js/main.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, newGame, line } from "../js/logic.js";
import { ROOMS, ITEMS, SELF_LINES } from "../data/script.js";
import { depthHeight } from "../js/walk.js";

const man = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url))).assets;
const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");

test("item 30: every inventory item used on Rooster himself has its own line", () => {
  for (const id of Object.keys(ITEMS)) {
    assert.ok(SELF_LINES[id] && SELF_LINES[id].length < 170, `${id}: self line`);
    const s = newGame(); s.inv = [id];
    const r = act({ ...s, verb: "use", pending: id }, { t: "self" });
    assert.equal(r.lines[0].text, SELF_LINES[id]);
    assert.equal(r.state.pending, null);
    assert.ok(r.state.inv.includes(id), `${id}: still held`);
  }
  assert.match(main, /dataset\.id = "self"/);
});

test("items 33/42: fixing the clock plays the shimmy, every frame exists at h88, and it ends on his mark", () => {
  const s = newGame(); s.room = "midway"; s.flags.clock_seen = true;
  const r = act({ ...s, verb: "push" }, { t: "hotspot", id: "clock" });
  assert.equal(r.lines[0].cutscene, "shimmy");
  const cs = ROOMS.midway.cutscenes.shimmy;
  for (const k of cs.hero) for (const f of [].concat(k[1])) assert.ok(man[`sprite/${f}-h${cs.heroH}`], f);
  assert.ok(cs.hero.filter((k) => /shimmy/.test([].concat(k[1])[0])).length >= 8, "hand over hand");
  assert.deepEqual(cs.end.hero, ROOMS.midway.spots.find((x) => x.id === "clock").stand);
  assert.ok(cs.ms >= cs.hero[cs.hero.length - 1][0]);
});

test("item 40: the sauce toss plays from where he stands (no walk), every frame exists both ways at every pavilion size", () => {
  const room = ROOMS.pavilion, cs = room.cutscenes.sauce_toss;
  assert.deepEqual(room.spots.find((x) => x.id === "fryer").tossItems, ["sauce"]);
  assert.ok(man["fx/sauce-bottle"]);
  for (const y of [131, 140, 148, 153, 160, 171, 178]) {
    const h = depthHeight(room.hero, y);
    for (const k of cs.hero) for (const f of ["l", "r"]) assert.ok(man[`sprite/${k[1].replace("{f}", f)}-h${h}`], `${k[1]} ${f} h${h}`);
  }
  assert.match(main, /tossItems/);
});

test("item 41: the flashback beats carry their step, and the past layer's art exists", () => {
  const src = readFileSync(new URL("../js/logic.js", import.meta.url), "utf8");
  assert.match(src, /flashStep/);
  // line() must keep the step (it whitelists fields; a dropped flashStep left the past layer never showing)
  assert.equal(line("x", { flashback: true, flashStep: 3 }).flashStep, 3);
  for (const id of ["bg/pavilion-aged", "fg/pavilion--crowd", "sprite/stogie-sil-arms-r-h64"]) assert.ok(man[id], id);
  assert.match(main, /function flashbackLayer/);
});

test("items 39/45: the hen struts out front and the getaway car pulls away, on frames that exist", () => {
  const cast = ROOMS.pavilion.cast;
  const car = cast.find((c) => c.sprite === "getaway-car-r");
  assert.ok(car && man["sprite/getaway-car-r-h16"]);
  assert.ok(car.cues.hattie_exit.seq.length > 6);
  const hen = cast.find((c) => c.sprite === "littlehen-idle-r");
  assert.deepEqual(hen.cues.littlehen.to, [170, 152]);
  for (const f of hen.cues.littlehen.walk) assert.ok(man[`sprite/${f}-h18`], f);
});

test("items 29/31/35: click-to-walk, walk first then act, fade in and neighbour preload are wired", () => {
  assert.match(main, /function walkThen/);
  assert.match(main, /get busy\(\)/);
  assert.match(main, /stage\.addEventListener\("click"/);
  assert.match(main, /function preloadNeighbours/);
});
