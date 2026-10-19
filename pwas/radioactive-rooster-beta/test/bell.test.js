// Ned's service bell (Arlong, 2026-10-18): each ring dings (sound + painted DING!), Ned's patience escalates, and at
// the sixth ring he walks over, unscrews it and pockets it. The bell is gone for good; the screw holes take its place.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { act, newGame, spotsFor, preview, visible, GENERIC_LINES } from "../js/logic.js";
import { ROOMS, SPEAKER } from "../data/script.js";
import { castFrame, castSprites } from "../js/walk.js";

const store = () => { const s = newGame(); s.room = "store"; return s; };
const ring = (s, verb = "use") => act({ ...s, verb }, { t: "hotspot", id: "bell" });

test("ringing the bell escalates and Ned pockets it on the sixth ring", () => {
  let s = store();
  const said = [];
  for (let n = 1; n <= 6; n++) {
    const r = ring(s, n % 2 ? "use" : "push");
    s = r.state;
    assert.equal(s.flags.bell_rings, n);
    assert.ok(r.lines.some((l) => l.sound === "ding" && l.cue === "ding"), `ring ${n} dings`);
    said.push(r.lines.map((l) => l.text).join(" "));
    assert.equal(!!s.flags.bell_gone, n === 6, `bell still there before ring 6 (ring ${n})`);
  }
  assert.equal(new Set(said).size, 6, "every ring has its own lines");
  assert.match(said[5], /No more bell for you\. I hope you're happy\./);
  assert.ok(said.slice(0, 2).every((t) => !/line item|depreciate/.test(t)), "rings 1-2 are just a ding and a quip");
  assert.match(said[2] + said[3], /depreciate|line item/, "rings 3-4 are the warnings");
  // after: the overlay is gone, the hotspot is the screw holes, and it never dings again
  const room = ROOMS.store;
  const bell = room.overlays.find((o) => o.art === "fg/store--bell");
  assert.ok(visible(store(), bell) && !visible(s, bell), "bell overlay hides once Ned has it");
  s.verb = "look";
  const spot = spotsFor(s).find((x) => x.id === "bell");
  assert.ok(preview(s, spot).includes("the screw holes"));
  for (const verb of ["look", "talk", "take", "use", "push"]) {
    const r = ring(s, verb);
    assert.ok(!r.lines.some((l) => l.sound === "ding"), `${verb} on the screw holes is silent`);
    assert.ok(r.lines.length && r.lines.every((l) => !GENERIC_LINES.includes(l.text)), `${verb} on the holes has its own line`);
    assert.equal(r.state.flags.bell_rings, 6);
  }
  // it survives a save/load (saves are a structured clone of the state)
  assert.ok(structuredClone(s).flags.bell_gone);
});

test("every verb on the bell has its own line; take says it's screwed down; nothing else needs the bell", () => {
  const s = store();
  for (const verb of ["look", "talk", "take"]) {
    const r = ring(s, verb);
    assert.ok(r.lines.length && !r.lines.some((l) => l.sound === "ding"), verb);
  }
  assert.match(ring(s, "take").lines[0].text, /screwed down/);
  // the bell's flags gate only the bell itself (its overlay and its screw-hole alt): no puzzle waits on it
  const script = readFileSync(new URL("../data/script.js", import.meta.url), "utf8");
  assert.equal((script.match(/bell_gone|bell_rings/g) || []).length, 2, "data/script.js: overlay whenNot + spot alt only");
  const logic = readFileSync(new URL("../js/logic.js", import.meta.url), "utf8");
  const outside = logic.replace(/function ringBell[\s\S]*?\n}\n/, "");
  assert.ok(!/bell_gone|bell_rings/.test(outside), "only ringBell touches the bell flags");
});

test("Ned's bell walk: down the counter, unscrews it side-on, walks back", () => {
  const ned = ROOMS.store.cast[0];
  const at = (cue, since) => castFrame(ned, { line: { cue, speaker: SPEAKER.clerk }, since, speakers: SPEAKER });
  assert.equal(at("ned_bell", 0).at[0], 180);
  assert.equal(at("ned_bell", 5000).at[0], 160);
  assert.equal(at("ned_pocket", 0).at[0], 160);
  assert.equal(at("ned_pocket", 0).sprite, "ned-side-l");
  assert.equal(at("ned_back", 0).at[0], 160);
  assert.equal(at("ned_back", 5000).sprite, "ned-front");
  assert.ok(castSprites(ned).includes("ned-walk-r"));
  assert.deepEqual(ROOMS.store.fx.ding.art, "fx/ding");
});
