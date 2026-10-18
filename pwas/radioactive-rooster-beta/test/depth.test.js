import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { ROOMS } from "../data/script.js";
import { actorZ, behind, clampToArea, depthHeight, inArea, occluderAsset, occluderZ, roomView, DEPTH_MAX, DEPTH_MIN, DEPTH_STEP } from "../js/walk.js";

const manifest = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url)));
const byLegacy = new Map(Object.entries(manifest.assets).map(([id, a]) => [a.legacy, id]));
const plateId = (plate) => (manifest.assets[plate] ? plate : byLegacy.get(plate));
const depthRooms = Object.values(ROOMS).filter((r) => r.hero && r.hero.depth);

// Minimal PNG decoder (8-bit RGB / RGBA, non-interlaced: what PIL writes for plates and cutouts).
function png(path) {
  const buf = readFileSync(new URL(`../${path}`, import.meta.url));
  let p = 8, w, h, type, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString("latin1", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (kind === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; assert.equal(data[8], 8); assert.equal(data[12], 0); }
    if (kind === "IDAT") idat.push(data);
    p += 12 + len;
  }
  const bpp = { 2: 3, 6: 4 }[type];
  assert.ok(bpp, `${path}: unsupported PNG color type ${type}`);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[y * stride + i - bpp] : 0, b = y ? out[(y - 1) * stride + i] : 0, c = y && i >= bpp ? out[(y - 1) * stride + i - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[y * stride + i] = (row[i] + pred) & 255;
    }
  }
  return { w, h, bpp, px: (x, y) => [...out.subarray(y * stride + x * bpp, y * stride + x * bpp + bpp)] };
}

test("depth: hero height is calibrated to the measured height at each room's reference spot", () => {
  const want = { hq: [156, 96], midway: [152, 104], pavilion: [153, 96], fence: [152, 60] };
  for (const [id, [y, h]] of Object.entries(want)) {
    const cfg = ROOMS[id].hero;
    assert.ok(cfg.depth, `${id} has depth`);
    assert.equal(cfg.at[1], y, `${id} reference spot`);
    assert.equal(depthHeight(cfg, y), h, `${id}: ${h} px at feet y ${y}`);
  }
  // Rooms without depth keep their fixed height.
  assert.equal(depthHeight({ at: [0, 150], height: 64 }, 120), 64);
});

test("depth: smaller toward the back, larger toward the front, snapped to cut frame buckets", () => {
  for (const room of depthRooms) {
    let last = 0;
    for (let y = 120; y <= 180; y += 0.5) {
      const h = depthHeight(room.hero, y);
      assert.ok(h >= last, `${room.id}: monotonic at y ${y}`);
      assert.equal(h % DEPTH_STEP, 0);
      const { min = DEPTH_MIN, max = DEPTH_MAX } = room.hero.depth;
      assert.ok(h >= min && h <= max && min >= 28 && max <= DEPTH_MAX, `${room.id}: ${h} within the cut buckets`);
      last = h;
    }
    assert.ok(depthHeight(room.hero, room.hero.at[1] - 12) < room.hero.height, `${room.id}: farther is smaller`);
    assert.ok(depthHeight(room.hero, room.hero.at[1] + 12) > room.hero.height, `${room.id}: nearer is bigger`);
  }
  // Pavilion stage front (feet y 131) reads ~61 px: in line with Hattie (52) up on the raised stage.
  assert.equal(depthHeight(ROOMS.pavilion.hero, 131), 60);
});

test("depth: every hero frame exists at every height he can reach", () => {
  const frames = ["front", "back", "side-r", "side-l", "walk-r", "walk-l"];
  for (const room of depthRooms) {
    const views = [roomView(room, {}), ...(room.states || []).map((s) => roomView(room, { [s.flag]: true }))];
    const heights = new Set();
    for (const v of views) for (let y = 100; y <= 180; y += 0.25) for (let x = 0; x <= 320; x += 4) if (inArea(v.walk, x, y)) heights.add(depthHeight(room.hero, y));
    for (const h of heights) {
      for (const f of frames) {
        const id = `sprite/rooster-${f}-h${h}`;
        const a = manifest.assets[id];
        assert.ok(a, `${room.id}: ${id} in manifest`);
        assert.equal(a.size[1], h);
        assert.ok(existsSync(new URL(`../art/pixel/${id}.png`, import.meta.url)), `${id}.png`);
      }
    }
  }
});

test("depth: widened walk areas reach behind scenery but not into it", () => {
  const P = ROOMS.pavilion, M = ROOMS.midway, Q = ROOMS.hq;
  const closed = roomView(P, {}).walk, open = roomView(P, { rope_open: true }).walk;
  for (const [x, y] of [[200, 132], [160, 139], [257, 139], [150, 153]]) assert.ok(inArea(closed, x, y), `pavilion (${x},${y}) walkable`);
  for (const [x, y] of [[200, 126], [140, 140], [280, 140], [130, 155], [60, 157]]) assert.ok(!inArea(closed, x, y), `pavilion (${x},${y}) blocked (stage, rope, cart, vat)`);
  assert.ok(inArea(open, 99, 152) && inArea(open, 26, 151), "open rope: behind the front and left posts");
  for (const [x, y] of [[88, 141], [180, 142], [30, 160]]) assert.ok(inArea(M.walk, x, y), `midway (${x},${y}) walkable`);
  for (const [x, y] of [[150, 136], [60, 145], [280, 160]]) assert.ok(!inArea(M.walk, x, y), `midway (${x},${y}) blocked (railing, booth, rope)`);
  assert.ok(inArea(Q.walk, 288, 156), "rooftop: behind the bucket");
  assert.ok(!inArea(Q.walk, 280, 173) && !inArea(Q.walk, 30, 160), "rooftop: not in the bucket or the crate");
  // Clicking the bucket walks him beside it, not behind it.
  const bucket = Q.spots.find((s) => s.id === "bucket");
  const [bx, by] = clampToArea(Q.walk, ...bucket.stand);
  assert.ok(!behind(by, Q.occluders[0].base) || bx < 258, "bucket stand point is in front or beside");
});

test("occluders: cutouts exist for every plate state, match the plate pixels, and carry the same base", () => {
  let checked = 0;
  for (const room of Object.values(ROOMS)) {
    if (!room.occluders) continue;
    const plates = new Set([plateId(room.plate), ...(room.states || []).map((s) => plateId(s.plate))]);
    for (const plate of plates) {
      const bg = png(`art/pixel/${plate}.png`);
      for (const o of room.occluders) {
        const id = occluderAsset(plate, o.id);
        const a = manifest.assets[id];
        assert.ok(a, `${room.id}: ${id} in manifest`);
        assert.equal(a.base, o.base, `${id}: base matches data/script.js`);
        assert.deepEqual(a.size, [320, 180]);
        const fg = png(`art/pixel/${id}.png`);
        assert.equal(fg.bpp, 4);
        let opaque = 0;
        for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) {
          const q = fg.px(x, y);
          assert.ok(q[3] === 0 || q[3] === 255, `${id}: hard alpha`);
          if (q[3] === 255) { opaque++; assert.deepEqual(q.slice(0, 3), bg.px(x, y).slice(0, 3), `${id} (${x},${y}) equals plate`); }
        }
        assert.ok(opaque > 40, `${id}: has pixels`);
        // The cutout's lowest pixel row sits at its base line (within 3 px): it is a floor-standing object.
        let low = 0;
        for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) if (fg.px(x, y)[3]) low = y;
        assert.ok(Math.abs(low - o.base) <= 3, `${id}: lowest row ${low} near base ${o.base}`);
        checked++;
      }
    }
  }
  assert.equal(checked, 12); // pavilion x2 plates x4, midway booth, rooftop bucket, fence crate + end post
});

test("occluders: z order draws scenery over an actor exactly when his feet are behind its base", () => {
  for (const base of [131, 146, 169.5, 173]) {
    for (let y = base - 6; y <= base + 6; y += 0.125) {
      const scenery = Math.floor(base) === base ? occluderZ(base) : null;
      if (scenery === null) continue;
      // Ties go to the scenery (cutouts are appended after actors).
      assert.equal(actorZ(y) <= scenery, behind(y, base), `y ${y} vs base ${base}`);
    }
  }
  // At each room's start spot no cutout cuts into him (he arrives fully visible).
  for (const room of Object.values(ROOMS)) {
    if (!room.occluders || !room.hero) continue;
    const [hx, hy] = room.hero.at;
    const h = depthHeight(room.hero, hy);
    const sprite = png(`art/pixel/sprite/rooster-front-h${h}.png`);
    const w = sprite.w;
    const x0 = Math.round(hx - w / 2), y0 = hy - h;
    for (const o of room.occluders) {
      if (!behind(hy, o.base)) continue;
      const fg = png(`art/pixel/${occluderAsset(plateId(room.plate), o.id)}.png`);
      let hit = 0;
      for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < w; sx++) if (sprite.px(sx, sy)[3] && fg.px(x0 + sx, y0 + sy)[3]) hit++;
      assert.equal(hit, 0, `${room.id}: ${o.id} overlaps him at the start spot`);
    }
  }
});

/* ---------- Fence crossroads ---------- */
test("fence: adult scale against the art (top rail waist-to-chest at the fence, Henny knee-high at her checkpoint)", () => {
  const F = ROOMS.fence;
  const atFence = depthHeight(F.hero, 112); // standing right at the fence line
  const railAboveGround = 110 - 90; // posts base ~110, top rail ~89-91
  assert.ok(railAboveGround / atFence >= 0.5 && railAboveGround / atFence <= 0.75, `rail at ${railAboveGround}/${atFence} of his height`);
  const henny = F.cast.find((c) => c.spot === "henny");
  const hen = manifest.assets[`sprite/${henny.sprite}${henny.half ? "-half" : ""}`];
  assert.ok(hen, "Henny uses an existing cut frame");
  const him = depthHeight(F.hero, henny.at[1]);
  const ratio = hen.size[1] / him;
  assert.ok(ratio >= 0.2 && ratio <= 0.33, `Henny ${hen.size[1]} px vs Rooster ${him} px at her spot (knee-high)`);
  assert.ok(depthHeight(F.hero, 178) <= 80 && depthHeight(F.hero, 178) >= 72, "big near the bottom edge");
});

test("fence: walk area stays off the fence, crate, buildings and ditch, but reaches behind the crate and the last post", () => {
  const F = ROOMS.fence;
  for (const [x, y] of [[170, 152], [150, 113], [112, 112.5], [300, 99], [72, 113], [40, 170], [300, 114]]) assert.ok(inArea(F.walk, x, y), `fence (${x},${y}) walkable`);
  for (const [x, y] of [[150, 105], [60, 100], [112, 116], [229, 108], [290, 150], [270, 135], [36, 70], [136, 70]]) assert.ok(!inArea(F.walk, x, y), `fence (${x},${y}) blocked (fence, crate, signpost, ditch, buildings)`);
  // Every point he can reach in front of the fence line is at or below the post bases.
  for (let x = 6; x <= 290; x += 2) for (let y = 90; y < 111.5; y += 0.5) assert.ok(!inArea(F.walk, x, y) || x > 240, `fence line (${x},${y})`);
  assert.ok(behind(112.5, F.occluders.find((o) => o.id === "crate").base), "behind the crate");
  assert.ok(behind(99, F.occluders.find((o) => o.id === "post-end").base), "behind the end post");
  // Every hotspot's stand point resolves inside the area.
  for (const sp of F.spots) {
    const [x, y] = clampToArea(F.walk, ...(sp.stand || [sp.rect[0] + sp.rect[2] / 2, sp.rect[1] + sp.rect[3]]));
    assert.ok(inArea(F.walk, x, y), `${sp.id} reachable`);
  }
});
