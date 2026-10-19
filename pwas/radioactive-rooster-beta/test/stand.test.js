// Stand beside, not in front (Arlong, 2026-10-18): js/walk.js standFor puts him at a hotspot's side, facing it,
// with his frame clear of the hotspot's core rect; the side he comes from first; characters at talking distance.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { ROOMS } from "../data/script.js";
import { standFor, heroBox, roomView } from "../js/walk.js";

test("every hotspot in every room and plate state, from both sides: beside it, facing it, never in it or behind a cutout", () => {
  // tools/stand_report.mjs checks his real idle side frame pixels against each core rect and each occluder he'd be behind
  const out = execFileSync("node", ["tools/stand_report.mjs"], { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" });
  assert.match(out, /\d+ placements, 0 failing/);
});

test("approach side first, faces the object, and characters get room to talk", () => {
  const hq = ROOMS.hq, hqWalk = roomView(hq, {}).walk;
  const board = hq.spots.find((s) => s.id === "board");
  const fromLeft = standFor(hq, board, { walk: hqWalk, from: [20, 156] });
  const fromRight = standFor(hq, board, { walk: hqWalk, from: [300, 156] });
  assert.equal(fromLeft.side, "l"); assert.equal(fromLeft.face, "r");
  assert.equal(fromRight.side, "r"); assert.equal(fromRight.face, "l");
  for (const r of [fromLeft, fromRight]) {
    const b = heroBox(hq, r.x, r.y, r.face);
    const c = board.core || board.rect;
    assert.ok(r.face === "r" ? b[2] <= c[0] + 2 : b[0] >= c[0] + c[2] - 2, "frame clear of the board");
  }
  // the bell: its right side is Ned, so he takes the left side even coming from the right
  const store = ROOMS.store, walk = roomView(store, {}).walk;
  const bell = store.spots.find((s) => s.id === "bell");
  assert.equal(standFor(store, bell, { walk, from: [280, 134] }).side, "l");
  // Ned: talking distance, more than the bare clearance
  const ned = store.spots.find((s) => s.id === "clerk");
  const t = standFor(store, ned, { walk, from: [60, 134] });
  assert.equal(t.rule, "talk");
  const b = heroBox(store, t.x, t.y, t.face);
  const gap = t.face === "r" ? ned.rect[0] - b[2] : b[0] - (ned.rect[0] + ned.rect[2]);
  assert.ok(gap >= 4, `talking gap ${gap}`);
  // exits keep their own point; overrides are honored
  const exit = store.spots.find((s) => s.exit);
  assert.equal(standFor(store, exit, { walk, from: [0, 134] }).rule, "fixed");
  const pav = ROOMS.pavilion, gob = pav.spots.find((s) => s.id === "gobbler");
  assert.equal(standFor(pav, gob, { walk: roomView(pav, {}).walk, from: [320, 140] }).side, "l");
});
