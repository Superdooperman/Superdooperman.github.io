import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ROOMS, SCENE, ITEMS, HERO, SPEAKER } from "../data/script.js";

const manifest = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url)));
const byLegacy = new Map(Object.entries(manifest.assets).map(([id, a]) => [a.legacy, id]));

test("logical scene size matches the manifest", () => {
  assert.deepEqual(manifest.logical, { w: SCENE.w, h: SCENE.h });
});

test("every hotspot and pose sits inside the logical scene", () => {
  for (const room of Object.values(ROOMS)) {
    for (const spot of room.spots) {
      const [x, y, w, h] = spot.rect;
      assert.ok(Number.isInteger(x) && Number.isInteger(w), `${room.id}/${spot.id} integer coords`);
      assert.ok(x >= 0 && y >= 0 && x + w <= SCENE.w && y + h <= SCENE.h, `${room.id}/${spot.id} in bounds`);
    }
  }
});

test("every art file the script names is in the manifest with a fallback", () => {
  const files = [
    ...Object.values(ROOMS).map((r) => r.plate),
    ...Object.values(HERO), ...Object.values(SPEAKER).filter((f) => !f.startsWith("voice:")),
    ...Object.values(ITEMS).map((i) => i.icon),
    "bg-title.jpg", "sprite-squat.png", "sprite-crow.png",
  ];
  for (const f of files) {
    const id = byLegacy.get(f);
    assert.ok(id, `${f} mapped in manifest`);
    const pixel = new URL(`../art/pixel/${id}.png`, import.meta.url);
    const legacy = new URL(`../art/placeholders/${f}`, import.meta.url);
    assert.ok(existsSync(pixel) || existsSync(legacy), `${id} has pixel art or a placeholder`);
  }
});

test("pixel files have the manifest's logical size", async () => {
  for (const [id, a] of Object.entries(manifest.assets)) {
    const p = new URL(`../art/pixel/${id}.png`, import.meta.url);
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    const fw = a.size[0] * ((a.grid || [1, 1])[0]), fh = a.size[1] * ((a.grid || [1, 1])[1]);
    assert.deepEqual([w, h], [fw, fh], `${id} is ${fw}x${fh}`);
  }
});
