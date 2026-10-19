// Registers in art/manifest.json every sprite size and overlay the rooms actually use (cast idle/talk/cue/loop frames,
// plate overlays, title cutouts). Only used ids: the service worker precaches the whole manifest.
// Usage: node tools/sprites/register.mjs   (idempotent; never removes entries)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { ROOMS, TITLE } from "../../data/script.js";
import { castSprites } from "../../js/walk.js";

const root = new URL("../../", import.meta.url);
const manifestUrl = new URL("art/manifest.json", root);
const m = JSON.parse(readFileSync(manifestUrl, "utf8"));
const pngSize = (id) => {
  const b = readFileSync(new URL(`art/pixel/${id}.png`, root));
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const sizeTag = (c) => (c.height ? `-h${c.height}` : c.half ? "-half" : "");

export function usedIds() {
  const ids = new Set();
  for (const room of Object.values(ROOMS)) {
    for (const c of room.cast || []) for (const s of castSprites(c)) ids.add(`sprite/${s}${sizeTag(c)}`);
    for (const o of room.overlays || []) ids.add(o.art);
  }
  for (const o of TITLE.overlays || []) ids.add(o.art);
  return [...ids].sort();
}

let added = 0;
for (const id of usedIds()) {
  if (m.assets[id]) continue;
  if (!existsSync(new URL(`art/pixel/${id}.png`, root))) throw new Error(`missing art/pixel/${id}.png`);
  const [w, h] = pngSize(id);
  m.assets[id] = id.startsWith("sprite/")
    ? { kind: "sprite", size: [w, h], anchor: [w / 2, h], source: "tools/sprites/cut_cast.py" }
    : { kind: "overlay", size: [w, h], anchor: [0, 0], source: "hand-cut story prop (art/pixel/fg), placed by data/script.js overlays" };
  added++;
}
writeFileSync(manifestUrl, JSON.stringify(m, null, 1) + "\n");
console.log(`registered ${added} new ids`);
