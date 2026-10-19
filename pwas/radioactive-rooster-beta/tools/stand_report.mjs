// node tools/stand_report.mjs [--json]: every hotspot in every room and plate state, from both approach sides:
// where he stands (js/walk.js standFor), and whether his actual idle side frame (opaque pixels) overlaps the
// hotspot's core rect, stands behind a cutout that covers him, or leaves the walk area. Exit 1 on any failure.
import { readFileSync } from "node:fs";
import { ROOMS } from "../data/script.js";
import { roomView, standFor, heroHeightAt, inArea, behind, HERO_ALLOW, occluderAsset, occluderBase } from "../js/walk.js";
import { spotsFor, newGame } from "../js/logic.js";
import { png } from "../test/png-helper.js";

const man = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url))).assets;
const cache = new Map();
const img = (id) => { if (!cache.has(id)) cache.set(id, png(`art/pixel/${id}.png`)); return cache.get(id); };
// opaque pixels of his idle side frame at feet (x, y), in scene px
function heroPixels(room, x, y, face) {
  const id = `sprite/rooster-side-${face}-h${heroHeightAt(room, y)}`;
  const a = man[id]; const im = img(id);
  const left = Math.round(x - a.anchor[0]), top = Math.round(y - a.anchor[1]);
  const out = [];
  for (let j = 0; j < im.h; j++) for (let i = 0; i < im.w; i++) if (im.px(i, j)[3] > 0) out.push([left + i, top + j]);
  return out;
}
const flagsets = (room) => [{}, ...(room.states || []).map((s) => ({ [s.flag]: true }))];
const rows = [], fails = [];
for (const room of Object.values(ROOMS)) {
  if (!room.hero || !room.walk) continue;
  for (const flags of flagsets(room)) {
    const view = roomView(room, flags);
    const occs = (room.occluders || []).map((o) => ({ ...o, im: img(occluderAsset(view.plate, o.id)), baseAt: (x) => { const sl = (o.slices || []).find(([a, b]) => x >= a && x < b); return sl ? sl[2] : occluderBase(o, view.plate); } }));
    const st = newGame(); st.room = room.id; Object.assign(st.flags, flags);
    const spots = new Map();
    for (const sp of room.spots) spots.set(sp.id, sp);
    for (const sp of spotsFor(st)) spots.set(sp.id, { ...spots.get(sp.id), ...sp });
    for (const sp of spots.values()) {
      for (const fromX of [0, 320]) {
        const r = standFor(room, sp, { walk: view.walk, from: [fromX, room.hero.at[1]] });
        const face = r.face || "r";
        const core = sp.core || sp.rect;
        const px = heroPixels(room, r.x, r.y, face);
        const inCore = px.filter(([x, y]) => x >= core[0] + HERO_ALLOW && x < core[0] + core[2] - HERO_ALLOW && y >= core[1] + HERO_ALLOW && y < core[1] + core[3] - HERO_ALLOW).length;
        let hidden = 0;
        for (const o of occs) hidden += px.filter(([x, y]) => behind(r.y, o.baseAt(x)) && x >= 0 && y >= 0 && x < o.im.w && y < o.im.h && o.im.px(x, y)[3] > 0).length;
        const ok = (r.rule === "fixed" || inCore === 0) && inArea(view.walk, r.x, r.y) && hidden < px.length * 0.25;
        const row = { room: room.id, state: Object.keys(flags)[0] || "-", spot: sp.id, from: fromX ? "right" : "left", rule: r.rule, at: [Math.round(r.x), Math.round(r.y)], face, overlapPx: inCore, hiddenPx: hidden, ok };
        rows.push(row); if (!ok) fails.push(row);
      }
    }
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 1));
else {
  for (const r of rows) if (r.from === "left" || !r.ok) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.room}${r.state !== "-" ? "[" + r.state + "]" : ""}/${r.spot} from ${r.from}: ${r.rule} at ${r.at} face ${r.face} overlap ${r.overlapPx}px hidden ${r.hiddenPx}px`);
  console.log(`${rows.length} placements, ${fails.length} failing`);
}
process.exit(fails.length ? 1 : 0);
