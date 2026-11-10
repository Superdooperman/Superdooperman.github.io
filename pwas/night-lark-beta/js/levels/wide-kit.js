// WIDE KIT STRETCH (big rooms prototype, Superdooperman, Nov 9 2026): two of the existing Harbormaster kit
// towers (levels/tall-shaft.js buildKitTower, js/kit/route.js towerRoute + its dressing pass) side
// by side with an open 4-col join between them: 28 + 4 + 28 = 60 cols, two of today's screens.
// No new generator: each half is the kit tower exactly as it builds on its own (seed, attempt,
// block rows), shifted right for the second half. Used by levels/big-2x2.js (one stretch) and
// levels/wide-shaft.js (stretches stacked the way levels/vertical.js stacks its climbs).
//   - Each half keeps its own freefall lane (ROUTE.lane, 6 wide): cols 11-16 and 43-48.
//   - The join (cols 28-31) is open air above the floor: the halves' wall-side pieces face each
//     other across it, so she can cross from one tower's route to the other's at many heights.
//   - The facade stays on the kit's block grid: 7 block cols per tower and one join column, every
//     block 4 x 6 tiles, so the masonry lines up across the whole width.
//   - One spawn and one exit for the stretch (the caller picks which half keeps each marker).
import { buildKitTower } from './tall-shaft.js';
import { TOWER } from '../kit/facade.js';
import { ROUTE, DENSE } from '../kit/route.js';
import { createAssembly } from '../kit/assemble.js';
import { PIECES } from '../kit/pieces.js';
import { PROP_TYPES, DECOR } from '../kit/props.js';
import { createRng, hashSeed } from '../gen/rng.js';

export const WIDE = Object.freeze({
  towerCols: TOWER.cols * TOWER.blockW, // 28
  join: TOWER.blockW, // 4: one facade block column
  cols: TOWER.cols * TOWER.blockW * 2 + TOWER.blockW, // 60
  lanes: Object.freeze([[ROUTE.lane[0], ROUTE.lane[1]], [ROUTE.lane[0] + 32, ROUTE.lane[1] + 32]]),
});
export const RIGHT_OFF = WIDE.towerCols + WIDE.join; // 32

export const findTile = (rows, ch) => {
  for (let r = 0; r < rows.length; r++) { const c = rows[r].indexOf(ch); if (c >= 0) return { c, r }; }
  return null;
};
export const setCh = (rows, c, r, ch) => { rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1); };

/** One wide stretch: halves [{ seed, attempt }, { seed, attempt }], towerRows block rows each.
 *  keep: which half keeps the spawn ('L'|'R') and the exit ('L'|'R'). Returns a room-def-like
 *  object (rows, props, pieces, facade, steps, guards, checkpoints, spawn, exit, floorTop). */
export function wideStretch(halves, { towerRows, feel = 'fix2', spawn = 'L', exit = 'R', tag = 'w' } = {}) {
  const [A, B] = halves.map(({ seed, attempt }) => buildKitTower(seed, attempt, { feel, towerRows }));
  const H = A.rows.length;
  const floorTop = H - ROUTE.floorRows;
  const off = [0, RIGHT_OFF];
  const strip = (def, keepP, keepE) => {
    const rows = def.rows.slice();
    const p = findTile(rows, 'P'); const e = findTile(rows, 'E');
    if (!keepP) setCh(rows, p.c, p.r, '.');
    if (!keepE) setCh(rows, e.c, e.r, '.');
    return rows;
  };
  const la = strip(A, spawn === 'L', exit === 'L');
  const lb = strip(B, spawn === 'R', exit === 'R');
  const rows = la.map((line, r) => line + (r >= floorTop ? '#' : '.').repeat(WIDE.join) + lb[r]);
  const props = []; const pieces = []; const facade = []; const steps = []; const guards = []; const checkpoints = [];
  [A, B].forEach((d, k) => {
    const dc = off[k]; const side = k ? 'R' : 'L';
    for (const p of d.props) props.push({ ...p, c: p.c + dc, piece: p.piece ? `${tag}${side}-${p.piece}` : p.piece });
    for (const q of d.pieces) pieces.push({ ...q, id: `${tag}${side}-${q.id}`, c: q.c + dc });
    for (const b of d.facade) {
      // the two inner corners become plain wall (one wide front; kit/draw.js mirrors any corner
      // with bc > 0, so only the outer two stay corners)
      const inner = b.type === 'corner' && (k ? b.bc === 0 : b.bc === TOWER.cols - 1);
      facade.push({ ...b, ...(inner ? { type: 'plain-wall', art: 'plain-wall-v3' } : {}), bc: b.bc + (k ? TOWER.cols + 1 : 0), c: b.c + dc });
    }
    for (const s of d.steps) steps.push({ ...s, half: side, c0: s.c0 + dc, c1: s.c1 + dc, inner: s.inner + dc });
    for (const g of d.guards) guards.push({ ...g, c: g.c + dc, c0: g.c0 + dc, c1: g.c1 + dc });
    for (const c of d.checkpoints.slice(1)) checkpoints.push({ ...c, c0: c.c0 + dc, c1: c.c1 + dc, x: c.x + dc });
  });
  // the join's floor is the halves' floor run through (one piece of masonry under the whole stretch)
  pieces.push({ id: `${tag}-join-floor`, piece: 'wall-segment', c: WIDE.towerCols, r: floorTop, w: WIDE.join, h: ROUTE.floorRows, flip: false });
  // the join's facade column: plain wall with a drainpipe now and then (kit blocks, art only)
  for (let br = 0; br < towerRows; br++) {
    const type = br % 3 === 1 ? 'drainpipe' : 'plain-wall';
    facade.push({ type, ...(type === 'plain-wall' ? { art: 'plain-wall-v2' } : {}), bc: TOWER.cols, br, c: WIDE.towerCols, r: br * TOWER.blockH, w: TOWER.blockW, h: TOWER.blockH });
  }
  const sp = findTile(rows, 'P');
  checkpoints.unshift({ c0: 0, c1: WIDE.cols - 1, x: (sp ? sp.c : 4) + 0.5, top: floorTop }); // the floor, full width
  return { rows, props, pieces, facade, steps, guards, checkpoints, floorTop, H, spawn: sp, exit: findTile(rows, 'E'), halves: halves.map((h) => ({ ...h })) };
}

/** Packing knobs for a wide room: extra kit pieces in the open air the two routes leave, so the
 *  room reads dense (more ledges, more lines up, more to swing from). Stone stays on the ground
 *  floor: every packed platform above it is iron grating ('g', one-way, like the kit route's
 *  grate-* and balconies). Same rules as route.js's
 *  dressing pass: never in a freefall lane, DENSE.clear rows of air kept above and below, a tile
 *  of air either side, no overlap with a prop. Its own seeded stream: it never moves the route. */
export const PACK = Object.freeze({
  pieces: Object.freeze(['grate-short', 'grate-medium', 'grate-long', 'balcony-small', 'balcony-medium', 'balcony-large', 'open-ledge']),
  grips: Object.freeze(['small-hook', 'gargoyle', 'flagpole-short', 'banner-bracket', 'chain-ring', 'grapple-hook', 'cage']),
  railingChance: 0.6, statueChance: 0.45, lanternChance: 0.3, decorChance: 0.6,
  topRow: 4, // no packed slab above this row (headroom under the room's top)
});

/** Pack a built stretch (rows, props, pieces) in place. n: pieces to try to add; grips: extra
 *  hooks. Returns { added, grips } for tests and the report. */
export function packWide(s, seed, { n = 10, grips = 8, topRow = PACK.topRow, keepClear = [] } = {}) {
  const rng = createRng(hashSeed('wide-pack', seed));
  const cols = s.rows[0].length; const floorTop = s.floorTop;
  const A = createAssembly(cols, s.rows.length);
  s.rows.forEach((line, r) => { for (let c = 0; c < cols; c++) A.grid[r][c] = line[c]; });
  for (const p of s.props) A.props.push(p);
  const box = (p) => { const t = PROP_TYPES[p.type]; return { c0: p.c, r0: p.r, c1: p.c + (p.w ?? t.w) - 1, r1: p.r + t.h - 1 }; };
  const propHit = (c0, r0, c1, r1) => A.props.some((p) => { const b = box(p); return !(b.c1 < c0 || b.c0 > c1 || b.r1 < r0 || b.r0 > r1); });
  const inBox = (c0, r0, c1, r1, k) => !(c1 < k.c0 || c0 > k.c1 || r1 < k.r0 || r0 > k.r1);
  // tiles: the whole box must be open air; props (art on the wall behind, never solid): only the
  // inner box (pr0..pr1, the piece and the row above it) must be free of them, so no art overlaps
  const open = (c0, r0, c1, r1, pr0 = r0, pr1 = r1) => {
    if (c0 < 0 || c1 >= cols || r0 < 0 || r1 >= floorTop) return false;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (A.grid[r][c] !== '.') return false;
    if (keepClear.some((k) => inBox(c0, r0, c1, r1, k))) return false;
    return !propHit(c0, pr0, c1, pr1);
  };
  const inLane = (c0, c1) => WIDE.lanes.some(([l0, l1]) => !(c1 < l0 || c0 > l1));
  const added = []; const gripList = [];
  for (let k = 0, tries = 0; k < n && tries < n * 80; tries++) {
    const kind = rng.pick(PACK.pieces); const piece = PIECES[kind]();
    const c0 = rng.int(0, cols - piece.w); const r = rng.int(topRow, floorTop - DENSE.clear - 2); // slab row
    const pr = r - (piece.h - 1);
    if (inLane(c0, c0 + piece.w - 1)) continue;
    if (!open(Math.max(0, c0 - 1), pr - DENSE.clear - 1, Math.min(cols - 1, c0 + piece.w), r + DENSE.clear, pr - 2, r + 1)) continue;
    const id = `pk${k}`;
    A.place(id, piece, [c0, pr]);
    const c1 = c0 + piece.w - 1;
    added.push({ id, kind, c0, c1, top: r });
    k++;
    // a grate carries a railing (end posts grip), a statue, or decor; a lantern now and then below
    if (kind.startsWith('grate-') && rng.chance(PACK.railingChance)) {
      const rk = rng.chance(0.5) ? 'railing-a' : 'railing-b';
      for (let c = c0; c <= c1; c++) A.attach(rk, c, r - 1, c === c0 || c === c1 ? { piece: `${id}-rail` } : { deco: true, piece: `${id}-rail` });
    } else if (piece.h === 1 && rng.chance(PACK.statueChance)) {
      const sc = c0 + (c0 < cols / 2 ? 0 : piece.w - 1);
      if (open(sc, r - 2, sc, r - 1)) A.attach('statue', sc, r - 2, { piece: `${id}-statue` });
    } else if (rng.chance(PACK.decorChance)) {
      const d = rng.pick(DECOR); const t = PROP_TYPES[d];
      const dc = c0; const dr = t.mount === 'top' ? r - t.h : r - t.h - 1;
      if (dc + t.w - 1 <= c1 && open(dc, dr, dc + t.w - 1, dr + t.h - 1)) A.attach(d, dc, dr, { deco: true, piece: `${id}-decor` });
    }
    if (rng.chance(PACK.lanternChance) && A.grid[r + 1]?.[c0 + 1] === '.' && A.grid[r + 2]?.[c0 + 1] === '.') {
      A.attach('hanging-lantern', c0 + 1, r + 1, { piece: `${id}-lantern` });
      A.grid[r + 2][c0 + 1] = 'L'; // its lamp is a danger light (as buildKitTower marks them)
    }
  }
  // extra wall grips anywhere open (the lanes too: attachments never collide)
  for (let k = 0, tries = 0; k < grips && tries < grips * 40; tries++) {
    const type = rng.pick(PACK.grips); const t = PROP_TYPES[type];
    const c = rng.int(1, cols - 1 - t.w); const r = rng.int(topRow, floorTop - 5);
    if (!open(c - 1, r - 2, c + t.w, r + t.h + 1)) continue;
    A.attach(type, c, r, { flip: c > cols / 2, piece: `pg${k}` });
    gripList.push({ type, c, r }); k++;
  }
  s.rows = A.rows();
  s.props = A.props.map((q) => ({ ...q }));
  for (const q of A.layout()) s.pieces.push({ ...q });
  return { added, grips: gripList };
}
