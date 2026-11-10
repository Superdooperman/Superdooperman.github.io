// Seeded climbing route over a tower facade (Superdooperman, Oct 28 2026): layers b (platforms) and c
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
  // feel fix 2 (denser rooms): a taller tower (ROUTE.towerRows block rows instead of TOWER.rows)
  // and a dressing pass (DENSE) that adds side ledges, wall grips, railings, statues and decor
  // in the free space around the route. dense: false gives back the sparse tower.
  dense: true, towerRows: 10,
  pieces: ['platform-short', 'platform-medium', 'platform-long', 'balcony-small', 'balcony-medium', 'balcony-large', 'open-ledge', 'corner'],
});

/** The dressing pass's knobs (feel fix 2). It runs after the route on its own seeded stream and
 *  only fills space that is open with room around it, so it never moves a route piece, never
 *  puts a slab in the lane, and the stacked-edge cancel rule still applies (anchors come from
 *  the finished map). */
export const DENSE = Object.freeze({
  branchChance: 0.7, // a side ledge on the outer wall between two route steps (a second line up)
  branchPieces: ['open-ledge', 'balcony-small', 'platform-short', 'balcony-medium'],
  wallGripPer6: 1.4, // extra wall grips (hooks, gargoyles, flagpoles) per 6 rows of tower
  wallGrips: ['small-hook', 'gargoyle', 'flagpole-short', 'banner-bracket', 'flagpole-tall'],
  railingChance: 0.6, // railing end posts on a bare platform (grips at both ends)
  statueChance: 0.5, decorChance: 0.8,
  clear: 3, // rows of open air kept above any added piece (she is 3 tiles tall)
});

/** attempt: the generator's reroll counter (js/levels/tall-shaft.js rejects a route the solver
 *  can't finish and asks for attempt + 1). Attempt 0 is the seed's own stream. */
export function towerRoute(seed = 1, attempt = 0, opts = {}) {
  const rng = createRng(attempt ? hashSeed('tower', seed, attempt) : seed);
  // opts.towerRows (feel pass 1, G): a taller tower in block rows (6 tiles each) for the vertical
  // rooms. Omitted: the tall-shaft size, so every existing seed builds exactly as before.
  const towerRows = opts.towerRows ?? (ROUTE.dense ? ROUTE.towerRows : TOWER.rows);
  const cols = TOWER.cols * TOWER.blockW; const rows = towerRows * TOWER.blockH;
  const A = createAssembly(cols, rows);
  const facade = dressFacade(facadeColumn(rng, { rows: towerRows }), hashSeed('facade-art', seed, attempt));
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
  const extra = ROUTE.dense ? densify(A, steps, { cols, rows, floorTop, seed, attempt }) : null;
  return { assembly: A, facade, steps, cols, rows, floorTop, seed, attempt, extra };
}

/** The dressing pass (feel fix 2). Returns what it added (for tests and the seed record). */
function densify(A, steps, { cols, rows, floorTop, seed, attempt }) {
  const rng = createRng(hashSeed('dense', seed, attempt));
  const added = { branches: [], grips: [], railings: 0, statues: 0, decor: 0 };
  const box = (p) => { const t = PROP_TYPES[p.type]; return { c0: p.c, r0: p.r, c1: p.c + (p.w ?? t.w) - 1, r1: p.r + t.h - 1 }; };
  const propHit = (c0, r0, c1, r1) => A.props.some((p) => { const b = box(p); return !(b.c1 < c0 || b.c0 > c1 || b.r1 < r0 || b.r0 > r1); });
  const open = (c0, r0, c1, r1) => {
    if (c0 < 0 || c1 >= cols || r0 < 0 || r1 >= floorTop) return false;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (A.grid[r][c] !== '.') return false;
    return !propHit(c0, r0, c1, r1);
  };
  const inLane = (c0, c1) => !(c1 < ROUTE.lane[0] || c0 > ROUTE.lane[1]);
  // 1. side ledges: between steps i-1 and i+1 (both on the side opposite step i), on that side's
  //    outer wall, with open air (DENSE.clear + 1 rows) above and below it and a tile either side
  for (let i = 1; i < steps.length - 1; i++) {
    if (!rng.chance(DENSE.branchChance)) continue;
    const lo = steps[i - 1]; const hi = steps[i + 1];
    const kind = rng.pick(DENSE.branchPieces);
    const piece = PIECES[kind]();
    const r = Math.round((lo.top + hi.top) / 2) + rng.int(-1, 1); // slab row
    const outerLeft = lo.side === 'L';
    const c0 = outerLeft ? 0 : cols - piece.w;
    const pr = r - (piece.h - 1);
    if (inLane(c0, c0 + piece.w - 1)) continue;
    if (!open(Math.max(0, c0 - 1), pr - DENSE.clear - 1, Math.min(cols - 1, c0 + piece.w), r + DENSE.clear)) continue;
    const id = `b${i}`;
    A.place(id, piece, [c0, pr]);
    added.branches.push({ id, kind, c0, c1: c0 + piece.w - 1, top: r, side: lo.side });
    if (piece.h === 1 && piece.w >= 2 && rng.chance(DENSE.statueChance)) {
      const sc = outerLeft ? c0 + 1 : c0 + piece.w - 2;
      if (open(sc, r - 2, sc, r - 1)) { A.attach('statue', sc, r - 2, { piece: `${id}-statue` }); added.statues++; }
    }
  }
  // 2. railings on bare route platforms (slabs with no props on top): end posts grip, the
  //    middle cells are art. A stacked balcony already covers its end.
  for (const s of steps) {
    if (!s.kind.startsWith('platform') || s.stacked || !rng.chance(DENSE.railingChance)) continue;
    if (!open(s.c0, s.top - 1, s.c1, s.top - 1)) continue;
    const kind = rng.chance(0.5) ? 'railing-a' : 'railing-b';
    for (let c = s.c0; c <= s.c1; c++) A.attach(kind, c, s.top - 1, c === s.c0 || c === s.c1 ? { piece: `${s.id}-rail` } : { deco: true, piece: `${s.id}-rail` });
    added.railings++;
  }
  // 3. wall grips up both outer thirds, in open wall with room around them
  const n = Math.round((floorTop / 6) * DENSE.wallGripPer6);
  for (let k = 0, tries = 0; k < n && tries < n * 8; tries++) {
    const type = rng.pick(DENSE.wallGrips); const t = PROP_TYPES[type];
    const left = rng.chance(0.5);
    const c = left ? rng.int(1, ROUTE.leftInner[1] - t.w) : rng.int(ROUTE.rightInner[0], cols - 1 - t.w);
    const r = rng.int(ROUTE.topRow, floorTop - 5);
    if (!open(c - 1, r - 2, c + t.w, r + t.h + 1)) continue;
    A.attach(type, c, r, { flip: !left, piece: `w${k}` });
    added.grips.push({ type, c, r }); k++;
  }
  // 4. decor on the wall ends of route and side pieces that have room
  for (const s of [...steps, ...added.branches]) {
    if (!rng.chance(DENSE.decorChance)) continue;
    const d = rng.pick(DECOR); const t = PROP_TYPES[d];
    const dc = s.side === 'L' ? s.c0 : s.c1 - t.w + 1;
    const dr = t.mount === 'top' ? s.top - t.h : s.top - t.h - rng.int(1, 2);
    if (!open(dc, dr, dc + t.w - 1, dr + t.h - 1)) continue;
    A.attach(d, dc, dr, { deco: true, piece: `${s.id}-decor2` }); added.decor++;
  }
  return added;
}
