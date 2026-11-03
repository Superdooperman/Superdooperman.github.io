// Seeded climbing route over a tower facade (Azzato, Oct 28 2026): layers b (platforms) and c
// (attachments) are randomized independently of the facade blocks behind them (layer a), so
// the route never lines up with block seams. Same seed, same room.
//   - Platforms alternate sides up the tower. The middle lane (ROUTE.lane) never gets a slab:
//     it is the freefall column, top to floor (attachments may hang in it; they never collide).
//   - Each step up is 5-7 rows. If the next platform's lane-side corner is farther than
//     ROUTE.cornerReach from the last platform's lane end, a hook attachment is hung in the gap
//     so the climb is hook, swing, release, land; otherwise a hook is added by chance.
//   - Some steps stack a small balcony on a long platform's wall end (the stacked-edge cancel
//     rule then removes the covered corner and edge points), and some carry decoration.
import { createRng, hashSeed } from '../gen/rng.js';
import { createAssembly } from './assemble.js';
import { TOWER, facadeColumn, dressFacade } from './facade.js';
import { PIECES, wallSegment, balconySmall } from './pieces.js';
import { HOOK_ATTACHMENTS, PROP_TYPES, DECOR, propGrip } from './props.js';

export const ROUTE = Object.freeze({
  floorRows: 3, stepMin: 5, stepMax: 7, topRow: 6,
  lane: [11, 16], // freefall column (tile cols), never a slab: 6 wide (FEEL-PLAN §6 "at least 6 wide")
  leftInner: [6, 10], rightInner: [17, 21], // where a platform's lane-side end may sit
  cornerReach: 9.5, // corner-to-corner beyond this gets a hook in the gap
  hookChance: 0.35, stackChance: 0.3, lanternChance: 0.4, bannerChance: 0.5,
  pieces: ['platform-short', 'platform-medium', 'platform-long', 'balcony-small', 'balcony-medium', 'balcony-large', 'open-ledge', 'corner'],
});

/** attempt: the generator's reroll counter (js/levels/tall-shaft.js rejects a route the solver
 *  can't finish and asks for attempt + 1). Attempt 0 is the seed's own stream. */
export function towerRoute(seed = 1, attempt = 0) {
  const rng = createRng(attempt ? hashSeed('tower', seed, attempt) : seed);
  const cols = TOWER.cols * TOWER.blockW; const rows = TOWER.rows * TOWER.blockH;
  const A = createAssembly(cols, rows);
  const facade = dressFacade(facadeColumn(rng), hashSeed('facade-art', seed, attempt));
  const floorTop = rows - ROUTE.floorRows;
  A.place('floor', wallSegment(cols, ROUTE.floorRows), [0, floorTop]);
  const steps = [];
  let top = floorTop; let side = rng.chance(0.5) ? 'L' : 'R';
  let prevInner = side === 'L' ? ROUTE.rightInner[1] : ROUTE.leftInner[0]; // on the floor she starts on the far side
  for (let i = 0; ; i++) {
    const dy = rng.int(ROUTE.stepMin, ROUTE.stepMax);
    const slabRow = top - dy;
    if (slabRow < ROUTE.topRow - 1) break;
    const last = slabRow - ROUTE.stepMin < ROUTE.topRow;
    let kind = last ? rng.pick(['platform-long', 'balcony-large', 'platform-medium']) : rng.pick(ROUTE.pieces);
    if (kind === 'corner') kind = side === 'L' ? 'corner-right' : 'corner-left'; // open end faces the lane
    const piece = PIECES[kind]();
    const inner = side === 'L' ? rng.int(...ROUTE.leftInner) : rng.int(...ROUTE.rightInner);
    let c0 = side === 'L' ? inner - piece.w + 1 : inner;
    c0 = Math.max(0, Math.min(cols - piece.w, c0));
    const id = `s${i}`;
    A.place(id, piece, [c0, slabRow - (piece.h - 1)]); // the slab is the piece's bottom row
    const step = { id, side, kind, c0, c1: c0 + piece.w - 1, top: slabRow, inner: side === 'L' ? c0 + piece.w - 1 : c0 };
    steps.push(step);
    const gap = Math.hypot(step.inner - prevInner, dy);
    if (gap > ROUTE.cornerReach || rng.chance(ROUTE.hookChance)) {
      const type = rng.pick(HOOK_ATTACHMENTS);
      const pt = PROP_TYPES[type];
      const hx = rng.int(ROUTE.lane[0], ROUTE.lane[1]) + 0.5; // grip over the lane
      const hy = slabRow - rng.int(1, 3);
      const flip = side === 'L'; // jut toward the new platform
      const g = propGrip({ type, c: 0, r: 0, flip });
      A.attach(type, Math.round(hx - g.x), Math.round(hy - pt.grip[1]), { flip, piece: `${id}-hook` });
      step.hook = type;
    }
    if (piece.w >= 5 && !last && rng.chance(ROUTE.stackChance)) {
      const b = balconySmall();
      A.place(`${id}-stack`, b, [side === 'L' ? step.c0 : step.c1 - b.w + 1, slabRow - b.h]);
      step.stacked = true;
    } else if (piece.w >= 8 && rng.chance(0.5)) {
      A.attach('statue', side === 'L' ? step.c0 + 1 : step.c1 - 1, slabRow - 2, { piece: `${id}-statue` });
    }
    if (rng.chance(ROUTE.lanternChance)) {
      const lc = side === 'L' ? step.c0 + 1 : step.c1 - 1;
      A.attach('hanging-lantern', lc, slabRow + 1, { piece: `${id}-lantern` });
      step.lantern = [lc, slabRow + 2]; // the lamp (danger light) in the bottom cell of the 1x2 box
    }
    if (rng.chance(ROUTE.bannerChance)) A.attach('banner-bracket', side === 'L' ? 0 : cols - 2, slabRow - rng.int(3, 4), { flip: side === 'R', piece: `${id}-banner` });
    // platform underside art (layer b, no collision): a bracket under each end, or a support
    for (const ec of [step.c0, step.c1]) if (A.grid[slabRow + 1]?.[ec] === '.') A.attach(rng.chance(0.3) ? 'support' : 'bracket', ec, slabRow + 1, { deco: true, piece: `${id}-under` });
    // E. decorative extras: one on the wall end of the top, sometimes
    if (!step.stacked && rng.chance(0.5)) {
      const d = rng.pick(DECOR); const t = PROP_TYPES[d];
      const dc = side === 'L' ? step.c0 : step.c1 - t.w + 1;
      const dr = t.mount === 'top' ? slabRow - t.h : slabRow - t.h - rng.int(1, 2);
      A.attach(d, dc, dr, { deco: true, piece: `${id}-decor` });
    }
    prevInner = step.inner; top = slabRow; side = side === 'L' ? 'R' : 'L';
    if (last) break;
  }
  return { assembly: A, facade, steps, cols, rows, floorTop, seed, attempt };
}
