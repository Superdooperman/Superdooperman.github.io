// TRAINING ROOM (feel fix 2): a hand-built kit room for practising the grapple, ?room=training
// (and TRAINING on the title menu). No guards, no lights, a solid floor under everything: a miss
// only drops her to the floor. Built from the tower kit (js/kit), so it looks like the tower and
// every grip is a real ledge or prop, never a floating ring.
//   1. Floor statues near the start: aim (hold B) and hook from the ground.
//   2. The low chain: five kit grips in a row over the floor, one swing apart, to a balcony.
//   3. The climb: iron gratings up the right wall, a hook between each pair (hook, swing, let go, land).
//   4. The high chain: five grips under the ceiling back to the top-left ledge and the exit.
// Every chain gap is 7 tiles (inside the line's reach), so it can be swung end to end or pulled
// through with the warp-pull grapple (?grapple=pull, G to switch).
import { createAssembly } from '../kit/assemble.js';
import { facadeColumn, dressFacade, TOWER } from '../kit/facade.js';
import { PIECES, wallSegment } from '../kit/pieces.js';
import { PROP_TYPES, propGrip } from '../kit/props.js';
import { createRng } from '../gen/rng.js';

export const TRAIN = Object.freeze({
  blocksW: 16, blocksH: 5, // 64 x 30 tiles
  floorTop: 26,
  statues: [6, 10],
  lowChain: { row: 18, cols: [10, 17, 24, 31, 38], types: ['flagpole-short', 'cage', 'chain-ring', 'grapple-hook', 'banner-bracket'] },
  balcony: { c0: 42, slab: 20 },
  climb: [{ c0: 57, slab: 21 }, { c0: 49, slab: 16 }, { c0: 57, slab: 11 }, { c0: 49, slab: 6 }],
  climbHooks: [[55.5, 17], [55.5, 12], [55.5, 7]],
  highChain: { row: 3, cols: [43, 36, 29, 22, 15], types: ['gargoyle', 'beam-rope', 'small-hook', 'grapple-hook', 'flagpole-short'] },
  top: { c0: 2, slab: 7 },
  spawn: { c: 2, r: 25 },
  exit: { c: 4, r: 6 },
});

/** Hang a prop so its grip lands on (gx, gy) in tiles. */
function hangAt(A, type, gx, gy, flip, piece) {
  const g = propGrip({ type, c: 0, r: 0, flip });
  A.attach(type, Math.round(gx - g.x), Math.round(gy - g.y), { flip, piece });
}

export function trainingRoom() {
  const T = TRAIN;
  const cols = T.blocksW * TOWER.blockW; const rows = T.blocksH * TOWER.blockH;
  const A = createAssembly(cols, rows);
  A.place('floor', wallSegment(cols, rows - T.floorTop), [0, T.floorTop]);
  // 1. statues on the floor near the start
  for (const c of T.statues) A.attach('statue', c, T.floorTop - 2, { piece: `statue-${c}` });
  // 2. the low chain to the balcony
  T.lowChain.cols.forEach((c, i) => hangAt(A, T.lowChain.types[i], c + 0.5, T.lowChain.row, false, `low-${i}`));
  A.place('balcony', PIECES['balcony-large'](), [T.balcony.c0, T.balcony.slab - 1]);
  // 3. the climb
  T.climb.forEach((s, i) => A.place(`climb-${i}`, PIECES['grate-medium'](), [s.c0, s.slab]));
  T.climbHooks.forEach(([x, y], i) => hangAt(A, i % 2 ? 'small-hook' : 'grapple-hook', x, y, false, `climb-hook-${i}`));
  // 4. the high chain back to the top-left ledge
  T.highChain.cols.forEach((c, i) => hangAt(A, T.highChain.types[i], c + 0.5, T.highChain.row, true, `high-${i}`));
  A.place('top', PIECES['grate-long'](), [T.top.c0, T.top.slab]);
  A.attach('statue', T.top.c0 + 6, T.top.slab - 2, { piece: 'top-statue' });
  // a little decoration (art only)
  A.attach('pots-crates', 20, T.floorTop - 1, { deco: true, piece: 'deco-1' });
  A.attach('vines', T.balcony.c0 + 5, T.balcony.slab - 4, { deco: true, piece: 'deco-2' });
  A.attach('banner-deco', 46, 1, { deco: true, piece: 'deco-3' });
  A.mark('P', T.spawn.c, T.spawn.r);
  A.mark('E', T.exit.c, T.exit.r);
  const facade = dressFacade(facadeColumn(createRng(7), { cols: T.blocksW, rows: T.blocksH }), 7);
  return {
    name: 'TRAINING ROOM',
    ...A.def(),
    facade,
    pieces: A.layout().map((q) => ({ ...q })),
    training: true,
    guards: [],
    searchlights: [],
    prompts: [],
    checkpoints: [{ c0: 0, c1: cols - 1, x: T.spawn.c + 0.5, top: T.floorTop }],
  };
}

/** For tests: the room's grip points that are kit props (none are rings). */
export const TRAINING_PROP_TYPES = Object.freeze(Object.keys(PROP_TYPES));
