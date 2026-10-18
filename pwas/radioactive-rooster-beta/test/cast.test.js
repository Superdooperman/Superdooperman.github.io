import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ROOMS, SPEAKER, TITLE } from "../data/script.js";
import { castFrame, castSprites, clampToArea, inArea, roomView, behind, TALK_MS } from "../js/walk.js";
import { line } from "../js/logic.js";
import { png } from "./png-helper.js";

const manifest = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url)));
const tag = (c) => (c.height ? `-h${c.height}` : c.half ? "-half" : "");
const need = (id, why) => {
  assert.ok(manifest.assets[id], `${why}: ${id} in manifest`);
  assert.ok(existsSync(new URL(`../art/pixel/${id}.png`, import.meta.url)), `${why}: ${id}.png`);
};
const within = (rect, [x, y]) => x >= rect[0] && x < rect[0] + rect[2] && y >= rect[1] && y < rect[1] + rect[3];
const overlap = ([ax0, ay0, ax1, ay1], [bx, by, bw, bh]) => Math.max(0, Math.min(ax1, bx + bw) - Math.max(ax0, bx)) * Math.max(0, Math.min(ay1, by + bh) - Math.max(ay0, by));

test("cast frames: idle by default, talk flaps while their voice speaks, then settle back", () => {
  const c = { sprite: "ned-front", talk: "ned-talk", voice: "clerk", at: [100, 120] };
  assert.equal(castFrame(c).sprite, "ned-front");
  const said = line("\"Rooster!\"", { speaker: SPEAKER.clerk });
  const seen = new Set([0, 200, 400, 600].map((t) => castFrame(c, { line: said, since: t, speakers: SPEAKER }).sprite));
  assert.deepEqual([...seen].sort(), ["ned-front", "ned-talk"]);
  assert.equal(castFrame(c, { line: said, since: TALK_MS + 10, speakers: SPEAKER }).sprite, "ned-front", "settles after the beat");
  assert.equal(castFrame(c, { line: line("Narration."), since: 0, speakers: SPEAKER }).sprite, "ned-front", "no flap on narration");
  // Silent characters flap only when their own hotspot was talked to.
  const hen = { sprite: "sittinghen-idle-l", talk: "sittinghen-cluck-l", talkOn: "hen", at: [0, 0] };
  assert.equal(castFrame(hen, { line: line("She swoons."), since: 0, lastAct: { spot: "hen", verb: "talk" } }).sprite, "sittinghen-cluck-l");
  assert.equal(castFrame(hen, { line: line("She swoons."), since: 0, lastAct: { spot: "hen", verb: "look" } }).sprite, "sittinghen-idle-l");
});

test("cast frames: cue poses, cue walks and ambient loops", () => {
  const pip = { sprite: "pip-front", at: [100, 140], cues: { pip_lift: { walk: ["pip-walk-r", "pip-side-r"], to: [200, 150], end: "pip-reach-r" }, pip_point: "pip-talk" } };
  assert.equal(castFrame(pip, { line: line("x", { cue: "pip_point" }), since: 0 }).sprite, "pip-talk");
  const mid = castFrame(pip, { line: line("x", { cue: "pip_lift" }), since: 1100 });
  assert.ok(mid.at[0] > 100 && mid.at[0] < 200 && /pip-(walk|side)-r/.test(mid.sprite), "walking partway");
  const end = castFrame(pip, { line: line("x", { cue: "pip_lift" }), since: 9000 });
  assert.deepEqual(end, { sprite: "pip-reach-r", at: [200, 150] });
  const yard = { sprite: "yardrooster-side-r", frames: ["yardrooster-side-r", "yardrooster-peck-r"], every: 500, at: [0, 0] };
  assert.equal(castFrame(yard, { now: 0 }).sprite, "yardrooster-side-r");
  assert.equal(castFrame(yard, { now: 600 }).sprite, "yardrooster-peck-r");
  assert.deepEqual(castSprites(pip).sort(), ["pip-front", "pip-reach-r", "pip-side-r", "pip-talk", "pip-walk-r"]);
});

test("every cast frame (idle, talk, cues, loops), overlay and title cutout is a registered pixel file", () => {
  for (const room of Object.values(ROOMS)) {
    for (const c of room.cast || []) {
      for (const s of castSprites(c)) need(`sprite/${s}${tag(c)}`, room.id);
      // Frames of one entry share a canvas so a swap never jumps.
      const sizes = new Set(castSprites(c).map((s) => manifest.assets[`sprite/${s}${tag(c)}`].size.join("x")));
      assert.equal(sizes.size, 1, `${room.id}/${c.sprite}: one canvas size for all its frames`);
    }
    for (const o of room.overlays || []) {
      need(o.art, room.id);
      const [w, h] = manifest.assets[o.art].size;
      assert.ok(o.at[0] >= 0 && o.at[1] >= 0 && o.at[0] + w <= 320 && o.at[1] + h <= 180, `${o.art} inside the scene`);
    }
  }
  for (const o of TITLE.overlays) need(o.art, "title");
});

// The plate id behind a room's legacy plate name ("bg-store.jpg" -> "bg/store").
const plateId = (plate) => (manifest.assets[plate] ? plate : Object.entries(manifest.assets).find(([, a]) => a.legacy === plate)[0]);

test("every cast member with a hotspot is covered by it: clicks on a character land on its visible part", () => {
  for (const room of Object.values(ROOMS)) {
    for (const c of room.cast || []) {
      if (!c.spot) continue;
      const spot = room.spots.find((s) => s.id === c.spot);
      assert.ok(spot, `${room.id}: cast spot ${c.spot} exists`);
      const id = `sprite/${c.sprite}${tag(c)}`;
      const img = png(`art/pixel/${id}.png`);
      const left = Math.round(c.at[0] - img.w / 2), top = c.at[1] - img.h;
      // cutouts in front of this character hide part of it; only what's visible counts
      const fronts = (room.occluders || []).filter((o) => behind(c.at[1], o.base)).map((o) => png(`art/pixel/fg/${plateId(room.plate).replace(/^bg\//, "")}--${o.id}.png`));
      let vis = 0, inside = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        if (!img.px(x, y)[3]) continue;
        const X = left + x, Y = top + y;
        if (fronts.some((f) => X >= 0 && X < 320 && Y >= 0 && Y < 180 && f.px(X, Y)[3])) continue;
        vis++;
        if (within(spot.rect, [X, Y])) inside++;
        x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X + 1); y1 = Math.max(y1, Y + 1);
      }
      assert.ok(vis > 0, `${room.id}/${c.sprite} is visible`);
      assert.ok(inside / vis >= 0.6, `${room.id}/${c.spot}: hotspot covers ${(inside / vis * 100).toFixed(0)}% of ${c.sprite}'s visible pixels`);
      // and the hotspot is not mostly empty plate around the figure (tiny figures get a finger-sized pad instead)
      const [, , w, h] = spot.rect;
      if ((x1 - x0) * (y1 - y0) >= 400) assert.ok(overlap([x0, y0, x1, y1], spot.rect) / (w * h) >= 0.3, `${room.id}/${c.spot}: hotspot is tight`);
    }
  }
});

test("every hotspot's stand point is walkable in every plate state, and he never stands behind a cutout to use it", () => {
  for (const room of Object.values(ROOMS)) {
    if (!room.hero || !room.walk) continue;
    const views = [roomView(room, {}), ...(room.states || []).map((s) => roomView(room, { [s.flag]: true }))];
    for (const v of views) {
      for (const sp of room.spots) {
        const [x, y] = clampToArea(v.walk, ...(sp.stand || [sp.rect[0] + sp.rect[2] / 2, sp.rect[1] + sp.rect[3]]));
        assert.ok(inArea(v.walk, x, y), `${room.id}/${sp.id} stand reachable`);
        if (sp.stand) assert.ok(inArea(v.walk, ...sp.stand), `${room.id}/${sp.id}: stand ${sp.stand} is itself inside the walk area`);
      }
    }
  }
});
