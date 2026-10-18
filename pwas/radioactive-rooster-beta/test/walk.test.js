import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ROOMS, SCENE } from "../data/script.js";
import { clampToArea, inArea, parseFlagOverride, roomView, stepToward } from "../js/walk.js";
import { newGame } from "../js/logic.js";

const manifest = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url)));
const box = [[[10, 10], [100, 10], [100, 50], [10, 50]]];

test("clampToArea leaves inside points alone and snaps outside points to the nearest edge", () => {
  assert.deepEqual(clampToArea(box, 50, 30), [50, 30]);
  assert.deepEqual(clampToArea(box, 50, 0), [50, 10]);
  assert.deepEqual(clampToArea(box, 130, 70), [100, 50]);
  assert.deepEqual(clampToArea(box, 0, 30), [10, 30]);
});

test("stepToward slides along the edge instead of leaving the area", () => {
  const p = stepToward(box, [90, 30], [200, 30], 50);
  assert.deepEqual(p, [100, 30]);
  assert.ok(inArea(box, ...stepToward(box, [20, 20], [60, 200], 15)));
});

test("every hero room has a walk area that contains the start point and stays inside the scene", () => {
  for (const room of Object.values(ROOMS)) {
    if (!room.hero) continue;
    assert.ok(room.walk && room.walk.length, `${room.id} has a walk area`);
    assert.ok(inArea(room.walk, ...room.hero.at), `${room.id} start point is walkable`);
    for (const poly of [room.walk, ...(room.states || []).map((s) => s.walk || [])].flat()) {
      for (const [x, y] of poly) assert.ok(x >= 0 && x <= SCENE.w && y >= 0 && y <= SCENE.h, `${room.id} walk point in bounds`);
    }
  }
});

test("pavilion: rope closed keeps him off the vat front; rope_open swaps plate and walk area", () => {
  const pav = ROOMS.pavilion;
  const closed = roomView(pav, {});
  const open = roomView(pav, { rope_open: true });
  assert.equal(closed.plate, pav.plate);
  assert.equal(open.plate, "bg/pavilion-open");
  assert.equal(open.state, "rope_open");
  assert.notDeepEqual(open.walk, closed.walk);
  const vatFront = [60, 157];
  assert.ok(!inArea(closed.walk, ...vatFront), "vat front blocked while closed");
  assert.ok(inArea(open.walk, ...vatFront), "vat front reachable when open");
  // Clicking the vat while closed walks him to the nearest reachable point: right of the centre-left post.
  const [x] = clampToArea(closed.walk, 55, 148);
  assert.ok(x >= 112, `stops at the rope side, got x=${x}`);
  assert.ok(!inArea(closed.walk, 130, 155), "behind the back rope");
  assert.ok(!inArea(open.walk, 130, 155), "back rope stays closed when the front rope opens");
  // Rope, vat, stage and cart are never walkable.
  for (const v of [closed, open]) {
    assert.ok(!inArea(v.walk, 60, 120), "vat body");
    assert.ok(!inArea(v.walk, 190, 120), "stage");
    assert.ok(!inArea(v.walk, 285, 130), "cart");
  }
});

test("alternate plates exist as art and the preview flag parser works", () => {
  for (const room of Object.values(ROOMS)) {
    for (const st of room.states || []) {
      if (!st.plate) continue;
      assert.ok(manifest.assets[st.plate], `${st.plate} in manifest`);
      assert.ok(existsSync(new URL(`../art/pixel/${st.plate}.png`, import.meta.url)), `${st.plate} pixel file`);
    }
  }
  assert.deepEqual(parseFlagOverride("?flags=ropeOpen"), { rope_open: true });
  assert.deepEqual(parseFlagOverride("?flags=rope_open,clock_fixed"), { rope_open: true, clock_fixed: true });
  assert.deepEqual(parseFlagOverride(""), {});
  assert.equal(newGame().flags.rope_open, undefined, "rope starts closed");
});
