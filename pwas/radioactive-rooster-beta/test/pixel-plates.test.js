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
  for (const id of ["barn", "store", "wkuk", "gate", "henhouse"]) {
    const r = ROOMS[id];
    assert.ok(r.hero && r.walk && inArea(r.walk, ...r.hero.at), `${id}: hero starts inside his walk area`);
  }
  // Store C: the counter top (y91) at his belt from the front of the counter (feet y131); the street door (y31-127) taller than him.
  const atCounter = h("store", 131);
  assert.ok((131 - 91) / atCounter > 0.4 && (131 - 91) / atCounter < 0.6, `store counter at belt (${atCounter})`);
  assert.ok(h("store", 131) < 127 - 31 && h("store", 131) > 70, "store doorway just taller than him");
  // WKUK C: the studio door (y31-127) just taller than him at the wall line.
  assert.ok(h("wkuk", 131) < 96 && h("wkuk", 131) >= 80, "wkuk door just taller");
  // Barn C: Mortgage (h44, feet y137) waist-high on him.
  const goat = ROOMS.barn.cast.find((c) => c.spot === "goat");
  assert.ok(goat.height / h("barn", goat.at[1]) > 0.4 && goat.height / h("barn", goat.at[1]) < 0.6, "barn goat waist-high");
  // Gate B: the turnstile (y92-131) and the booth sill (y101, front at y135) around his belt from the plaza.
  assert.ok((131 - 92) / h("gate", 137) > 0.35 && (131 - 92) / h("gate", 137) < 0.6, "gate turnstile waist-high");
  assert.ok((135 - 101) / h("gate", 137) > 0.3 && (135 - 101) / h("gate", 137) < 0.55, "gate sill at his belt");
  // Henhouse A is a walk-in now: the Sitting Hen (h22 at the wall) knee-high on him.
  assert.ok(ROOMS.henhouse.hero && 22 / h("henhouse", 128) < 0.33, "henhouse: walk-in, hens knee-high");
});
