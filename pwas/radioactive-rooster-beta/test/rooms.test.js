// Re-wired rooms (2026-10-18 plates): scale, walk areas off the scenery, cast placement behind its cutouts, hotspots on their objects.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS } from "../data/script.js";
import { behind, depthHeight, inArea, roomView } from "../js/walk.js";
import { readFileSync } from "node:fs";
import { png } from "./png-helper.js";

const manifest = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url)));

const within = (rect, [x, y]) => x >= rect[0] && x < rect[0] + rect[2] && y >= rect[1] && y < rect[1] + rect[3];
const spot = (room, id) => ROOMS[room].spots.find((s) => s.id === id);
const occ = (room, id) => ROOMS[room].occluders.find((o) => o.id === id);
const cast = (room, sprite) => ROOMS[room].cast.find((c) => c.sprite === sprite);
function walkable(room, yes, no, flags = {}) {
  const w = roomView(ROOMS[room], flags).walk;
  for (const p of yes) assert.ok(inArea(w, ...p), `${room} (${p}) walkable`);
  for (const p of no) assert.ok(!inArea(w, ...p), `${room} (${p}) blocked`);
}
function hits(room, id, points) {
  for (const p of points) assert.ok(within(spot(room, id).rect, p), `${room}/${id} covers (${p})`);
}

test("store: Rooster h96 at the front edge, h84 at the counter line; floor stops at the counter, sacks and barrel", () => {
  const h = ROOMS.store.hero;
  assert.equal(depthHeight(h, 178), 96);
  assert.equal(depthHeight(h, 131), 84);
  walkable("store", [[60, 140], [180, 175], [284, 134], [46, 140]], [[180, 125], [150, 110], [20, 150], [305, 150], [300, 120]]);
  const ned = cast("store", "ned-front");
  assert.ok(behind(ned.at[1], occ("store", "counter").base), "Ned stands behind the counter");
  assert.ok(ned.at[1] - ned.height < 91 - 30, "Ned's head and chest clear the counter top (y91)");
  hits("store", "bell", [[149, 90]]);
  hits("store", "jars", [[60, 30], [170, 60]]);
  hits("store", "to-wkuk", [[296, 80]]);
  hits("store", "to-barn", [[15, 70]]);
});

test("barn: h96 front / h80 at the wall; Mortgage and Peck stand on the floor in front of the pen and the hay; the ribbon hangs until Mortgage rams it", () => {
  const h = ROOMS.barn.hero;
  assert.equal(depthHeight(h, 178), 96);
  assert.equal(depthHeight(h, 128), 80);
  walkable("barn", [[24, 132], [298, 132], [160, 170]], [[100, 120], [200, 110], [176, 100], [250, 120]]);
  for (const c of ROOMS.barn.cast) assert.ok(c.at[1] >= 130, `${c.sprite} stands on the floor, in front of the wall-line scenery`);
  const ribbon = ROOMS.barn.overlays.find((o) => o.art === "fg/barn--ribbon");
  assert.equal(ribbon.whenNot, "got_ribbon");
  hits("barn", "ribbon", [[159, 30], [160, 40]]);
  hits("barn", "ladder", [[175, 87]]);
  hits("barn", "to-fence", [[25, 80]]);
  hits("barn", "to-town", [[299, 90]]);
});

test("wkuk: store scale; the hall floor only; DeeJay behind the booth cutout (desk, console, mullion, mic) and the neon over the studio door", () => {
  const h = ROOMS.wkuk.hero;
  assert.equal(depthHeight(h, 178), 96);
  assert.equal(depthHeight(h, 131), 84);
  walkable("wkuk", [[14, 140], [90, 134], [290, 134], [160, 175]], [[90, 120], [200, 110], [290, 120]]);
  const dj = cast("wkuk", "deejay-front");
  assert.ok(behind(dj.at[1], occ("wkuk", "booth").base), "DeeJay is behind the booth wall");
  const [x, y, w, hh] = ROOMS.wkuk.sign.rect;
  assert.ok(x >= 60 && x + w <= 116 && y >= 8 && y + hh <= 31, "sign sits on the blank wall above the studio door");
  hits("wkuk", "slot", [[90, 87]]);
  hits("wkuk", "onair", [[196, 42]]);
  hits("wkuk", "horn", [[228, 45]]);
  hits("wkuk", "to-gate", [[290, 80]]);
});

test("gate: h84 at the gate line, h96 front; the plaza stays in front of the turnstile, booth and cutout; the guard sits behind the booth front", () => {
  const h = ROOMS.gate.hero;
  assert.equal(depthHeight(h, 178), 96);
  assert.equal(depthHeight(h, 131), 84);
  walkable("gate", [[62, 140], [150, 140], [262, 150], [12, 160], [60, 160]], [[62, 128], [150, 134], [260, 140], [300, 120]]);
  const front = occ("gate", "front");
  assert.equal(front.base, 135);
  const w = ROOMS.gate.walk;
  for (let x = 6; x <= 314; x += 2) for (let y = 120; y < 136; y += 0.5) assert.ok(!inArea(w, x, y), `gate: (${x},${y}) is booth/turnstile line, not plaza`);
  const guard = cast("gate", "guard-front");
  assert.ok(behind(guard.at[1], front.base), "guard behind the sill and booth front");
  assert.deepEqual(ROOMS.gate.spriteTint, { brightness: 0.8, saturate: 0.85, sepia: 0.1 });
  hits("gate", "turnstile", [[62, 110]]);
  hits("gate", "cutout", [[262, 90], [262, 135]]);
  hits("gate", "guard", [[148, 70]]);
});

test("henhouse: now walk-in (h80 at the wall, h96 front), floor off the nest row and ladder; the hen sits in her box, props hide once taken", () => {
  const h = ROOMS.henhouse.hero;
  assert.equal(depthHeight(h, 178), 96);
  assert.equal(depthHeight(h, 128), 80);
  walkable("henhouse", [[22, 134], [172, 132], [300, 150], [70, 178]], [[172, 115], [300, 132], [100, 100]]);
  const hen = cast("henhouse", "sittinghen-idle-l");
  assert.ok(hen.height / depthHeight(h, 128) < 0.33, "hens are knee-high next to him");
  const ov = Object.fromEntries(ROOMS.henhouse.overlays.map((o) => [o.art, o]));
  assert.equal(ov["fg/henhouse--spoon"].whenNot, "got_spoon");
  assert.equal(ov["fg/henhouse--stub"].whenNot, "got_stub");
  assert.equal(ov["fg/henhouse--grub"].when, "hen_up");
  assert.equal(ov["fg/henhouse--grub"].whenNot, "got_grub");
  // each prop's hotspot sits on its overlay
  hits("henhouse", "spoon", [[140, 72]]);
  hits("henhouse", "stub", [[201, 72]]);
  hits("henhouse", "grub", [[225, 106]]);
  hits("henhouse", "warm", [[173, 101]]);
  hits("henhouse", "back", [[20, 90]]);
  assert.deepEqual(ROOMS.henhouse.spriteTint, { brightness: 0.72, saturate: 0.8, sepia: 0.15, hue: -4 });
});

test("fence: the yard roosters are sprites on the lower rail (no birds painted in the plate), looping side/peck/crow", () => {
  const birds = ROOMS.fence.cast.filter((c) => c.spot === "birds");
  assert.equal(birds.length, 2);
  for (const b of birds) {
    assert.ok(b.at[1] >= 100 && b.at[1] <= 110, "perched on the lower rail, y100-110");
    assert.ok(b.frames.some((f) => f.includes("peck")) && b.frames.some((f) => f.includes("crow")) && b.frames.some((f) => f.includes("side")));
    assert.ok(b.height >= 10 && b.height <= 12);
  }
  hits("fence", "birds", birds.map((b) => [b.at[0], b.at[1] - 4]));
});

test("title: the barn-roof hen is a sprite overlay (feet on the roof peak at 67,74), not plate paint", async () => {
  const { TITLE } = await import("../data/script.js");
  const { readFileSync } = await import("node:fs");
  const man = JSON.parse(readFileSync(new URL("../art/manifest.json", import.meta.url)));
  const hen = TITLE.overlays.find((o) => o.art.startsWith("sprite/titlehen"));
  const [w, h] = man.assets[hen.art].size;
  assert.deepEqual([hen.at[0] + w / 2, hen.at[1] + h], [67, 74]);
  const src = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
  assert.match(src, /TITLE\.overlays/);
});

test("midway: Dot and Rocco stand behind the booth counter (seen through its open window), Corny on the boardwalk; his pitch line cues the ring-toss pose", async () => {
  const booth = occ("midway", "booth");
  for (const s of ["dot-front", "rocco-front"]) assert.ok(behind(cast("midway", s).at[1], booth.base), `${s} behind the booth front`);
  const corny = cast("midway", "corny-front");
  assert.ok(inArea(ROOMS.midway.walk, ...corny.at) || corny.at[1] >= 141, "Corny stands on the boardwalk, not in the railing");
  assert.equal(corny.cues.corny_pitch, "corny-ringtoss-r");
  const { act, newGame } = await import("../js/logic.js");
  let s = newGame(); s.room = "midway"; s.flags.fair_in = true;
  ({ state: s } = act(s, { t: "verb", verb: "talk" }));
  const r = act(s, { t: "hotspot", id: "corny" });
  assert.ok(r.lines.some((l) => l.cue === "corny_pitch" && /Step right up/.test(l.text)), "the barker pitch carries the cue");
  hits("midway", "kids", [[38, 80], [59, 80]]);
});

test("pavilion: rope swags are their own layers; Pip and the little hen stand behind the side rope with the crowd, never in front of it", () => {
  const P = ROOMS.pavilion;
  const side = occ("pavilion", "rope-side"), front = occ("pavilion", "rope-front"), back = occ("pavilion", "rope-back");
  assert.ok(side.hangs && front.hangs && back.hangs);
  assert.equal(front.bases["pavilion-open"], 172);
  const pip = cast("pavilion", "pip-front"), hen = cast("pavilion", "littlehen-idle-r"), corny = cast("pavilion", "corny-front");
  for (const c of [pip, hen]) {
    assert.ok(behind(c.at[1], side.base), `${c.sprite} is behind the side rope`);
    for (const flags of [{}, { rope_open: true }]) assert.ok(!inArea(roomView(P, flags).walk, ...c.at), `${c.sprite} stands off Rooster's floor (behind the rope)`);
  }
  // her cue walk stays behind the rope too
  assert.ok(behind(pip.cues.pip_lift.to[1], side.base));
  assert.equal(hen.when, "egg_saved");
  assert.ok(!behind(corny.at[1], occ("pavilion", "cart").base), "Corny stands in front of his cart, not inside it");
  hits("pavilion", "pip", [[122, 100], [122, 125]]);
});

test("pavilion: the stage cues ride on the story lines (key lift, padlock, Corny's head turn, the little hen's line)", async () => {
  const { line } = await import("../js/logic.js");
  const src = (await import("node:fs")).readFileSync(new URL("../js/logic.js", import.meta.url), "utf8");
  for (const cue of ["pip_lift", "pip_unlock", "corny_turn", "littlehen"]) assert.match(src, new RegExp(`cue: "${cue}"`));
  assert.equal(line("x", { cue: "pip_lift" }).cue, "pip_lift");
  assert.equal(line("x").cue, null);
});

test("fence: he sits on the top rail in his own style (sit + sit-down frames cut from his h32 front frame)", () => {
  const cfg = ROOMS.fence.poseAt.squat;
  assert.equal(cfg.seat, 91, "seat line is the top rail");
  const read = (id) => png(`art/pixel/sprite/${id}.png`);
  const front = read("rooster-front-h32");
  const pal = new Set();
  for (let y = 0; y < front.h; y++) for (let x = 0; x < front.w; x++) { const q = front.px(x, y); if (q[3]) pal.add(q.slice(0, 3).join()); }
  for (const id of [cfg.sprite, cfg.via]) {
    const a = manifest.assets[`sprite/${id}`];
    assert.ok(a && a.seat > 0 && a.seat < a.size[1], `${id}: seat row in the manifest`);
    const im = read(id);
    assert.deepEqual([im.w, im.h], a.size);
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
      const q = im.px(x, y);
      assert.ok(q[3] === 0 || q[3] === 255, `${id}: hard alpha`);
      if (q[3]) assert.ok(pal.has(q.slice(0, 3).join()), `${id} (${x},${y}): colour from his front frame`);
    }
    // feet below the rail, head above it: a seated figure, not floating, not sunk through the rail
    const top = cfg.seat - a.seat, bottom = cfg.seat + (a.size[1] - a.seat);
    assert.ok(top > 60 && bottom > cfg.seat + 4 && bottom < 110, `${id}: spans ${top}-${bottom}`);
  }
  // it stays between the left posts
  const w = manifest.assets[`sprite/${cfg.sprite}`].size[0];
  assert.ok(cfg.x - w / 2 >= 52 && cfg.x + w / 2 <= 92, "between the posts");
});
