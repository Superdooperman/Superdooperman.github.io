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
    // a legacy file name, or (painted inventory icons) the manifest id itself, whose legacy placeholder is the fallback
    const id = manifest.assets[f] ? f : byLegacy.get(f);
    assert.ok(id, `${f} mapped in manifest`);
    const pixel = new URL(`../art/pixel/${id}.png`, import.meta.url);
    const legacy = new URL(`../art/placeholders/${manifest.assets[f] ? manifest.assets[f].legacy : f}`, import.meta.url);
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
    const k = w / fw; // manifest: a file may be any whole multiple of the logical size, same aspect
    assert.ok(Number.isInteger(k) && k >= 1 && h === fh * k, `${id} is ${fw}x${fh} (or a whole multiple), got ${w}x${h}`);
  }
});

test("hero and cast sprites exist as pixel files and stand inside the scene", () => {
  const need = (id) => {
    assert.ok(manifest.assets[id], `${id} in manifest`);
    assert.ok(existsSync(new URL(`../art/pixel/${id}.png`, import.meta.url)), `${id} pixel file`);
  };
  for (const room of Object.values(ROOMS)) {
    if (room.hero) {
      const half = room.hero.height ? `-h${room.hero.height}` : room.hero.half ? "-half" : "";
      for (const f of ["front", "side-r", "side-l", "walk-r", "walk-l"]) need(`sprite/rooster-${f}${half}`);
      const [x, y] = room.hero.at;
      assert.ok(x >= 0 && x <= SCENE.w && y > 0 && y <= SCENE.h, `${room.id} hero in bounds`);
      if (room.hero.height) assert.ok(room.hero.height < y, `${room.id} hero head stays on screen`);
    }
    for (const c of room.cast || []) {
      need(`sprite/${c.sprite}${c.height ? `-h${c.height}` : ""}`);
      // Ambient cast (no hotspot: Corny by his cart, the little hen at the finish) is fine; a named spot must exist.
      if (c.spot !== undefined) assert.ok(room.spots.some((s) => s.id === c.spot), `${room.id} cast ${c.sprite} tied to a real spot`);
    }
  }
});
