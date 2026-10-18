// Every room (and the title) renders a 320x180 pixel plate in pixel mode; no painted placeholders left on screen.
// The newly pixelated rooms carry Rooster at adult scale against their art.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ROOMS } from "../data/script.js";
import { depthHeight, inArea } from "../js/walk.js";

const manifest = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url)));
const byLegacy = new Map(Object.entries(manifest.assets).map(([id, a]) => [a.legacy, id]));
const size = (p) => { const b = readFileSync(new URL(`../${p}`, import.meta.url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test("every room plate (and the title) has a 320x180 pixel file plus its 4x copy", () => {
  const plates = new Set(["bg-title.jpg"]);
  for (const r of Object.values(ROOMS)) { plates.add(r.plate); for (const st of r.states || []) if (st.plate) plates.add(st.plate); }
  for (const plate of plates) {
    const id = manifest.assets[plate] ? plate : byLegacy.get(plate);
    assert.ok(id, `${plate} in the manifest`);
    assert.ok(existsSync(new URL(`../art/pixel/${id}.png`, import.meta.url)), `${id}: pixel plate exists`);
    assert.deepEqual(size(`art/pixel/${id}.png`), [320, 180], `${id}: 320x180`);
    assert.deepEqual(size(`art/pixel-4x/${id}.png`), [1280, 720], `${id}: 4x copy`);
  }
});

test("newly pixelated rooms: Rooster walks them at adult scale", () => {
  const h = (id, y) => depthHeight(ROOMS[id].hero, y);
  for (const id of ["barn", "store", "wkuk", "gate"]) {
    const r = ROOMS[id];
    assert.ok(r.hero && r.walk && inArea(r.walk, ...r.hero.at), `${id}: hero starts inside his walk area`);
  }
  // Store: counter top (y ~112) at his belt by the counter end; the doorway (opening y 40-125) just taller than him.
  const atCounter = h("store", 150);
  assert.ok((150 - 112) / atCounter > 0.35 && (150 - 112) / atCounter < 0.6, `store counter at belt (${atCounter})`);
  assert.ok(h("store", 128) < 85 && h("store", 128) > 70, "store doorway just taller than him");
  // WKUK: studio door (y 37-172) just taller than him at the door.
  assert.ok(h("wkuk", 172) < 135 && h("wkuk", 172) >= 108, "wkuk door just taller");
  // Gate: turnstile (y 85-180, 95 px) just taller; ticket sill (y 140) around his belt.
  assert.ok(h("gate", 178) < 95 && (178 - 140) / h("gate", 178) > 0.35, "gate turnstile and sill");
  // Barn: Mortgage's back (~50 px over her hooves at y 160) waist-high on him.
  assert.ok(50 / h("barn", 160) > 0.4 && 50 / h("barn", 160) < 0.6, "barn goat waist-high");
  // Henhouse is a close-up into the nest boxes (hen scale): no walking Rooster there.
  assert.equal(ROOMS.henhouse.hero, undefined);
});
