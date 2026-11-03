// TALL SHAFT (swing-feel prototype, Oct 28 2026), now the outside of a tower built from
// Azzato's tower kit sheet: three independent layers.
//   a facade      seamless 4 x 6-tile wall blocks on a fixed 7-block-wide grid (js/kit/facade.js),
//                 art only: no collision, no grapple points.
//   b platforms   short/medium/long slabs, balconies, corner balconies, open ledges
//                 (js/kit/pieces.js): the only collision; every exposed ledge corner and top is
//                 grappleable, a stacked piece cancels what it covers.
//   c attachments flagpoles, lanterns, cages, beam + rope, chain + ring, banner brackets, hooks,
//                 railing end posts, statues, gargoyles (js/kit/props.js): grips and decoration.
// No hanging rings. The route (b + c) is SEEDED (js/kit/route.js) over the facade, so no two
// seeds climb alike and the route never follows the block seams. ?room=tall&seed=N picks one;
// test/tower-kit.test.mjs checks the default seed (and a sweep) with the generator's validator.
// The old hand-built ring room is tallShaftRings() (?room=tall&anchors=rings).
//   - The floor is solid and every platform sits over a lower one or the floor: a miss drops her
//     lower, never resets her. fallCost 'height' (default) or 'feather' (?fall=feather).
//   - Checkpoints: the floor and every second platform. A catch sends her to the last one.
//   - Freefall: the middle lane (c11-16, 6 wide) has no slab from the top to the floor.
import { blankRows, fillRect, putTile } from '../level.js';
import { towerRoute } from '../kit/route.js';

import { validateRoom } from '../gen/validator.js';
import { movesFor } from '../gen/moves.js';
import { SETTINGS } from '../config.js';

export const TALL_SEED = 1;
/** Seed -> its first finishable route attempt (towerRoute(seed, attempt)), found by
 *  tallAttempt() with the solver. Seeds 1..TALL_REROLL_N not listed are attempt 0 with no solve;
 *  any other seed is solved at load (about 8 s a try in node for the dense tower). test/tall-shaft.test.mjs re-checks every entry; regenerate it if the generator changes
 *  (node tools/tall-reroll.mjs). */
export const TALL_REROLL = Object.freeze({ 5: 1, 13: 1, 19: 1, 28: 2, 39: 1 }); // seeds 1-40; unlisted = attempt 0
export const TALL_REROLL_N = 40;
export const TALL_MAX_ATTEMPTS = 16;
/** The table's attempt for a seed, or undefined when the seed is outside the table. */
export function tallTableAttempt(seed) {
  return Number.isInteger(seed) && seed >= 1 && seed <= TALL_REROLL_N ? (TALL_REROLL[seed] ?? 0) : undefined;
}

/** The built route for a seed (assembly, facade, steps), for the room, tests and docs. */
export function tallShaftKit(seed = TALL_SEED, attempt = TALL_REROLL[seed] ?? 0) { return towerRoute(seed, attempt); }

/** Can the generator's solver finish this room (spawn to exit)? The prototype stays on the
 *  legacy feel (feel fix 1 did not retune it, and TALL_REROLL was found with it): it is solved,
 *  and played (def.feel), in 'legacy'. */
export function tallSolve(def) {
  const was = SETTINGS.feel;
  SETTINGS.feel = 'legacy';
  try {
    return validateRoom(def, movesFor({ id: `tall-${def.seed}-${def.attempt}`, flip: false, phys: def.rows, anchors: def.anchors, props: def.props }));
  } finally { SETTINGS.feel = was; }
}
/** The first attempt whose route the solver can finish. Deterministic: same seed, same answer. */
export function tallAttempt(seed) {
  for (let a = 0; a < TALL_MAX_ATTEMPTS; a++) if (tallSolve(buildTall(seed, a)).ok) return a;
  throw new Error(`tall shaft seed ${seed}: no finishable route in ${TALL_MAX_ATTEMPTS} attempts`);
}

/** The room for a seed. The generator rejects a route its solver can't finish and rerolls
 *  (attempt 1, 2, ... each its own stream), so every seed is finishable. attempt: force one. */
export function tallShaft({ fallCost = 'height', seed = TALL_SEED, attempt } = {}) {
  return buildTall(seed, attempt ?? tallTableAttempt(seed) ?? tallAttempt(seed), fallCost);
}

function buildTall(seed, attempt, fallCost = 'height') {
  const R = towerRoute(seed, attempt);
  const A = R.assembly;
  const spawn = { c: R.steps[0].side === 'L' ? 22 : 4, r: R.floorTop - 1 };
  const last = R.steps[R.steps.length - 1];
  const exit = { c: last.side === 'L' ? last.c0 + 1 : last.c1 - 1, r: last.top - 1 };
  A.mark('P', spawn.c, spawn.r);
  A.mark('E', exit.c, exit.r);
  // every hanging lantern is a danger light: its lamp (bottom cell of the 1x2 box) is a lamp tile
  for (const p of A.props) if (p.type === 'hanging-lantern' && A.grid[p.r + 1]?.[p.c] === '.') A.mark('L', p.c, p.r + 1);
  const def = A.def();
  const mids = R.steps.slice(0, -1).filter((_, k) => k % 2 === 1);
  const guardOn = R.steps.slice(1, -1).find((s) => s.c1 - s.c0 >= 7 && !s.stacked);
  return {
    name: attempt ? `TALL SHAFT #${seed}.${attempt}` : `TALL SHAFT #${seed}`,
    ...def,
    facade: R.facade,
    pieces: A.layout().map((q) => ({ ...q })), // layer b placements, for the kit art (js/kit/draw.js)
    steps: R.steps,
    seed,
    attempt,
    tall: true,
    feel: 'legacy',
    fallCost,
    autoExit: true,
    guards: guardOn ? [{ c: Math.floor((guardOn.c0 + guardOn.c1) / 2), dir: 1, c0: guardOn.c0, c1: guardOn.c1, speed: 30, floor: guardOn.top }] : [],
    searchlights: [],
    prompts: [],
    checkpoints: [
      { c0: 0, c1: R.cols - 1, x: spawn.c + 0.5, top: R.floorTop },
      ...mids.map((s) => ({ c0: s.c0, c1: s.c1, x: (s.c0 + s.c1 + 1) / 2, top: s.top })),
    ],
  };
}

// ---- the ring version (before the kit), kept for comparison: ?room=tall&anchors=rings -------
const TR = { cols: 30, rows: 46, floor: 43, ledges: [[23, 29, 37], [0, 9, 31], [23, 29, 19], [0, 9, 13], [23, 29, 6]], perch: [11, 16, 25],
  rings: [[15, 36], [13, 30], [8, 25], [15, 20], [12, 14], [17, 7], [20, 16], [20, 28], [14, 34]] };
export function tallShaftRings({ fallCost = 'height' } = {}) {
  const t = blankRows(TR.cols, TR.rows);
  fillRect(t, TR.floor, TR.rows - 1, 0, TR.cols - 1, '#');
  for (const [c0, c1, top] of TR.ledges) fillRect(t, top, top + 1, c0, c1, '#');
  fillRect(t, TR.perch[2], TR.perch[2], TR.perch[0], TR.perch[1], '=');
  for (const [c, r] of TR.rings) putTile(t, r, c, 'a');
  putTile(t, 30, 26, 'L'); putTile(t, 42, 3, 'P'); putTile(t, 5, 27, 'E');
  return { name: 'TALL SHAFT (rings)', rows: t, anchors: 'rings', tall: true, fallCost, autoExit: true,
    guards: [{ c: 13, dir: 1, c0: 11, c1: 16, speed: 30, floor: 25 }], searchlights: [], prompts: [],
    checkpoints: [{ c0: 0, c1: 29, x: 3.5, top: 43 }, { c0: 0, c1: 9, x: 4.5, top: 31 }, { c0: 11, c1: 16, x: 13.5, top: 25 }, { c0: 23, c1: 29, x: 25.5, top: 19 }, { c0: 0, c1: 9, x: 4.5, top: 13 }] };
}
