// node tools/stand_report.mjs [--json]: every hotspot in every room and plate state, from both approach sides:
// where he stands (js/walk.js standFor), and whether his actual idle side frame (opaque pixels) overlaps the
// hotspot's core rect, stands behind a cutout that covers him, or leaves the walk area. Exit 1 on any failure.
import { readFileSync } from "node:fs";
import { ROOMS } from "../data/script.js";
import { roomView, standFor, heroHeightAt, inArea, HERO_ALLOW, occluderAsset, behindOccluder, castBodies } from "../js/walk.js";
import { spotsFor, newGame } from "../js/logic.js";
import { png } from "../test/png-helper.js";

const man = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url))).assets;
const cache = new Map();
const img = (id) => { if (!cache.has(id)) cache.set(id, png(`art/pixel/${id}.png`)); return cache.get(id); };
// opaque pixels of his idle side frame at feet (x, y), in scene px
function heroPixels(room, x, y, face) {
  const id = face === "front" ? `sprite/rooster-front-h${heroHeightAt(room, y)}` : `sprite/rooster-side-${face}-h${heroHeightAt(room, y)}`;
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
    const occs = (room.occluders || []).map((o) => ({ ...o, im: img(occluderAsset(view.plate, o.id)) }));
    const st = newGame(); st.room = room.id; Object.assign(st.flags, flags);
    const spots = new Map();
    for (const sp of room.spots) spots.set(sp.id, sp);
    for (const sp of spotsFor(st)) spots.set(sp.id, { ...spots.get(sp.id), ...sp });
    for (const sp of spots.values()) {
      for (const fromX of [0, 320]) {
        const r = standFor(room, sp, { walk: view.walk, from: [fromX, room.hero.at[1]], bodies: castBodies(room, sp.id, flags) });
        const face = r.face === "front" ? "front" : r.face || "r";
        const core = sp.core || sp.rect;
        const px = heroPixels(room, r.x, r.y, face);
        const inCore = px.filter(([x, y]) => x >= core[0] + HERO_ALLOW && x < core[0] + core[2] - HERO_ALLOW && y >= core[1] + HERO_ALLOW && y < core[1] + core[3] - HERO_ALLOW).length;
        let hidden = 0;
        for (const o of occs) if (behindOccluder(o, r.x, r.y, view.plate)) hidden += px.filter(([x, y]) => x >= 0 && y >= 0 && x < o.im.w && y < o.im.h && o.im.px(x, y)[3] > 0).length;
        // `standBehind` spots (the hq bucket) mean to hide his legs: only check that his head and body stay clear
        // ...and he never stands on another character (Arlong: Rooster hidden behind Corny at the clock)
        // behind somebody (his feet upstage of theirs) and overlapping their body: he's hidden behind them. In front of
        // somebody: fine unless he covers most of them. npcPx = the worst covered share of a body, in %.
        let warn = 0;
        const feet = (room.cast || []).filter((c) => c.spot !== sp.id && (!c.when || flags[c.when]) && c.height);
        const npcPx = castBodies(room, sp.id, flags).reduce((worst, c, i) => {
          const set = new Set(px.filter(([x, y]) => x >= c[0] && x < c[0] + c[2] && y >= c[1] && y < c[1] + c[3]).map(([x, y]) => x * 1000 + y));
          const share = set.size / (c[2] * c[3]);
          if (r.y >= feet[i].at[1]) { if (share > 0.5) warn = Math.max(warn, Math.round(share * 100)); return worst; }
          return Math.max(worst, share > 0.08 ? Math.round(share * 100) : 0);
        }, 0);
        const ok = (r.rule === "fixed" || r.rule === "behind" || inCore === 0) && inArea(view.walk, r.x, r.y) && hidden < px.length * (sp.standBehind ? 0.45 : 0.25) && (sp.exit || npcPx === 0);
        const row = { room: room.id, state: Object.keys(flags)[0] || "-", spot: sp.id, from: fromX ? "right" : "left", rule: r.rule, at: [Math.round(r.x), Math.round(r.y)], face, overlapPx: inCore, hiddenPx: hidden, npcPx, warn, ok };
        rows.push(row); if (!ok) fails.push(row);
      }
    }
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify(rows, null, 1));
else {
  // WARN: he stands in front of somebody and covers most of them (crowded spots by the Pavilion lock): allowed, listed
  for (const r of rows) if (r.from === "left" || !r.ok) console.log(`${r.ok ? (r.warn ? "WARN" : "ok  ") : "FAIL"} ${r.room}${r.state !== "-" ? "[" + r.state + "]" : ""}/${r.spot} from ${r.from}: ${r.rule} at ${r.at} face ${r.face} overlap ${r.overlapPx}px hidden ${r.hiddenPx}px npc ${r.npcPx}%${r.warn ? ` (in front, covers ${r.warn}%)` : ""}`);
  console.log(`${rows.length} placements, ${fails.length} failing`);
}
process.exit(fails.length ? 1 : 0);
