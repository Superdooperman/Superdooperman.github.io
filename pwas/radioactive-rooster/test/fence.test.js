// Yard roosters / rail (Arlong, beta v11): the "points at the gravel, he gets off the rail" line only plays while he is
// actually seated on the rail; unseated talk in the yard never mentions getting off it. And the seated frames are
// always known to the manifest (a missing one made him vanish), with a fallback chain in seatSprite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, newGame, seatedOnRail } from "../js/logic.js";
import { ROOMS } from "../data/script.js";

const yard = () => { const s = newGame(); s.room = "fence"; return s; };
const doo = (s, verb, id) => act({ ...s, verb }, { t: "hotspot", id });
const text = (r) => r.lines.map((l) => l.text).join(" ");
const OFF_RAIL = /off the rail|gets off|gravel/i;

test("talking in the yard before he's on the rail never plays the dismount", () => {
  for (const id of ROOMS.fence.spots.map((x) => x.id)) {
    const r = doo(yard(), "talk", id);
    assert.doesNotMatch(text(r), OFF_RAIL, `talk ${id} unseated`);
    assert.ok(!r.state.flags.blew_cover, `talk ${id} unseated blows no cover`);
  }
});

test("seated on the rail, talking blows his cover and he gets off; then talk is ordinary again", () => {
  let s = doo(yard(), "use", "rail").state;
  assert.ok(seatedOnRail(s));
  const r = doo(s, "talk", "birds");
  assert.match(text(r), /gets off the rail/);
  assert.equal(r.state.pose, null);
  assert.doesNotMatch(text(doo(r.state, "talk", "birds")), OFF_RAIL, "already off: no second dismount");
  // the seat survives save/load and the gate still holds
  s = structuredClone(doo(yard(), "use", "birds").state);
  assert.ok(seatedOnRail(s));
  assert.match(text(doo(s, "talk", "birds")), /gets off the rail/);
});

test("every way into the yard leaves him standing", () => {
  const from = { hq: "hatch" };
  for (const [room, spot] of Object.entries(from)) {
    const s = newGame(); s.room = room; s.pose = "squat"; s.flags.read_note = true;
    const r = act({ ...s, verb: "go" }, { t: "hotspot", id: spot });
    assert.equal(r.state.room, "fence"); assert.equal(r.state.pose, null);
  }
});

test("every rail-sit frame the fence asks for exists, at every size he can be", () => {
  const man = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url))).assets;
  const cfg = ROOMS.fence.poseAt.squat;
  const sizes = Object.keys(man).filter((k) => /^sprite\/rooster-front-h\d+$/.test(k)).map((k) => k.split("-").pop());
  for (const h of sizes) {
    for (const f of ["r", "l"]) for (const kind of [cfg.sit, cfg.hop]) assert.ok(man[`sprite/${kind}-${f}-${h}`], `${kind}-${f}-${h}`);
    assert.ok(man[`sprite/${cfg.front}-${h}`], `${cfg.front}-${h}`);
  }
  const main = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(main, /const chain = \[id, cfg\.front/, "seatSprite falls back to the front sit, then his standing frame");
  assert.match(readFileSync(new URL("../sw.js", import.meta.url), "utf8"), /manifest\.json"\)\) return CORE_CACHE/, "manifest is network-first");
});
