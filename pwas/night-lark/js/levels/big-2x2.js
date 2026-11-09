// BIG 2x2 ROOM (big rooms prototype, Azzato, Nov 9 2026): one normal room two screens wide and two
// tall (60 x 32 tiles; today's authored rooms are ~30 x 16), so playtesters can feel a roomier
// space. ?room=big2x2 plays it on its own (js/main.js).
//
// Built from the Harbormaster kit, not a new generator:
//   - levels/wide-kit.js wideStretch: two kit towers (buildKitTower, seeds BIG.halves, 5 block rows
//     = 30 tiles each) side by side with an open 4-col join: two routes up, two freefall lanes.
//   - wide-kit.js packWide: extra kit balconies / slabs / railings / statues / hooks / lanterns in
//     the open air the routes leave (lanes stay clear), so the room is dense with lines up and
//     room to swing.
//   - Two foundation rows under the floor make it 32 tall; the facade stays on the 6-tile grid.
//   - Stealth the engine already has: a watchman patrolling the right half of the floor, a guard
//     on a high slab when one is long enough, a searchlight sweeping down the join, the kit's
//     danger lanterns, and shadow floor ('s') hide spots, one under a grating lip in the join
//     (stone only on the ground floor; every ascent platform is one-way iron grating 'g').
//   - Spawn bottom left, exit high on the right tower: the room is crossed and climbed.
// Proof: the generator's own validator (gen/validator.js) finishes it, spawn to exit, in feel fix2
// with no warp-pull, at BIG.slots (test/big-rooms.test.mjs).
import { wideStretch, packWide, setCh, findTile, WIDE } from './wide-kit.js';
import { TOWER } from '../kit/facade.js';

export const BIG = Object.freeze({
  name: 'THE WIDE HALL',
  cols: 60, rows: 32,
  towerRows: 5, // block rows per half: 30 tiles
  foundation: 2, // solid rows under the kit floor (30 + 2 = 32)
  halves: Object.freeze([{ seed: 1, attempt: 0 }, { seed: 2, attempt: 0 }]),
  packSeed: 7, pack: 12, grips: 10,
  feel: 'fix2',
  lip: Object.freeze({ c0: 28, c1: 31, r: 23 }), // iron-grating lip over the join's shadow floor
  shadows: Object.freeze([[28, 31], [52, 54]]), // hide spots on the floor (c0, c1)
  floorGuard: Object.freeze({ c: 44, dir: -1, c0: 36, c1: 54, speed: 30 }),
  searchlight: Object.freeze({ c: 30, r: 1, base: Math.PI / 2, amp: 0.45, period: 6, size: 'big' }),
  slots: 600, // validator horizon (60 s); the default 300 is per 30 x 16 room
});

let cache = null;
/** The room definition (deterministic; built once per process). */
export function big2x2Room() {
  if (!cache) cache = build();
  return structuredClone(cache);
}

function build() {
  const s = wideStretch(BIG.halves, { towerRows: BIG.towerRows, feel: BIG.feel, spawn: 'L', exit: 'R', tag: 'b' });
  const ft = s.floorTop;
  // the join's lip and shadow floor go in before packing, so nothing is packed on top of them
  const L = BIG.lip;
  for (let c = L.c0; c <= L.c1; c++) setCh(s.rows, c, L.r, 'g');
  s.pieces.push({ id: 'b-lip', piece: 'grate-short', c: L.c0, r: L.r, w: L.c1 - L.c0 + 1, h: 1, flip: false });
  const pack = packWide(s, BIG.packSeed, { n: BIG.pack, grips: BIG.grips, keepClear: [
    { c0: L.c0 - 1, c1: L.c1 + 1, r0: L.r - 4, r1: ft - 1 }, // the hide alcove stays open
    { c0: 24, c1: 36, r0: 0, r1: 3 }, // the searchlight head
  ] });
  for (const [c0, c1] of BIG.shadows) for (let c = c0; c <= c1; c++) setCh(s.rows, c, ft, 's');
  const rows = [...s.rows];
  for (let k = 0; k < BIG.foundation; k++) rows.push('#'.repeat(WIDE.cols));
  // the facade under the floor: one more block row (mostly hidden by the foundation stone)
  const under = TOWER.blockH * BIG.towerRows;
  for (let bc = 0; bc < WIDE.cols / TOWER.blockW; bc++) {
    const edge = bc === 0 || bc === WIDE.cols / TOWER.blockW - 1;
    s.facade.push({ type: edge ? 'corner' : 'plain-wall', ...(edge ? {} : { art: 'plain-wall' }), bc, br: BIG.towerRows, c: bc * TOWER.blockW, r: under, w: TOWER.blockW, h: TOWER.blockH });
  }
  const guards = [...s.guards, { ...BIG.floorGuard, floor: ft }];
  // a guard on the longest packed slab high up, if one is long enough to walk
  const perch = pack.added.filter((a) => a.c1 - a.c0 >= 7 && a.top <= ft - 8).sort((a, b) => a.top - b.top)[0];
  if (perch && !s.guards.length) guards.push({ c: Math.floor((perch.c0 + perch.c1) / 2), dir: 1, c0: perch.c0, c1: perch.c1, speed: 24, floor: perch.top });
  const def = {
    name: BIG.name,
    anchors: 'arch',
    rows,
    props: s.props,
    facade: s.facade,
    pieces: s.pieces,
    steps: s.steps,
    feel: BIG.feel,
    fallCost: 'height',
    autoExit: true,
    big: '2x2',
    guards,
    searchlights: [{ ...BIG.searchlight }],
    prompts: [
      { id: 'hide', text: 'DOWN IN SHADOW: HIDE', c0: L.c0, c1: L.c1, r0: L.r + 1, r1: ft, doneOn: 'hide', sticky: false },
    ],
    checkpoints: s.checkpoints,
    pack,
    gen: { kind: 'big', floor: 1, halves: BIG.halves.map((h) => ({ ...h })), packSeed: BIG.packSeed },
  };
  return { ...def, dims: { cols: rows[0].length, rows: rows.length }, spawn: findTile(rows, 'P'), exit: findTile(rows, 'E') };
}
