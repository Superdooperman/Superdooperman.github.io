// Grappleable architecture (Azzato, Oct 28 2026). Anchors come from the ASSEMBLED solid map,
// never from a piece on its own: when pieces are stacked, the upper piece covers the lower
// one's top, that top is no longer standable, and its corners and edge points disappear
// (a buried edge isn't a ledge). Only exposed tops count.
//   corner  each outer top corner of a ledge (stone or one-way wood/grating): the end of a run of
//           standable tiles whose side neighbour is open air. The point sits ARCH.cornerOut
//           past the side face and ARCH.lipLift above the top, so it is in open air.
//   edge    extra points along a wide exposed top (ARCH.edgeSpacing), on ledges only (a run
//           with at least one outer corner) or on one-way tiles; never the room floor wall-to-wall.
//   prop    the grip spot of a layer-c attachment (flagpole, lantern, cage, beam + rope, chain
//           ring, banner bracket, hook, railing end post, statue, gargoyle)
//           (js/kit/props.js). Protruding props keep their grip on a stacked face; a grip that
//           ends up inside stone is dropped.
// Every anchor: { x, y, id, kind, ledge? { top, c0, c1, side: 'L'|'R'|'top', oneWay }, prop? }.
import { ARCH } from './config.js';
import { tileAt, isGround, isOneWay, isStandable, isBlockingTile } from './level.js';
import { propGrip, PROP_TYPES } from './kit/props.js';

function runsOnRow(level, r) {
  const runs = [];
  let cur = null;
  for (let c = 0; c <= level.cols; c++) {
    const ok = c < level.cols && isStandable(level, c, r, false);
    const oneWay = ok && isOneWay(tileAt(level, c, r));
    if (ok && cur && cur.oneWay === oneWay) { cur.c1 = c; continue; }
    if (cur) runs.push(cur);
    cur = ok ? { r, c0: c, c1: c, oneWay } : null;
  }
  return runs;
}

/** Is the tile beside a run end open air (so that end is an outer corner)? */
function openSide(level, c, r) {
  if (c < 0 || c >= level.cols) return false; // the room's side walls
  const ch = tileAt(level, c, r);
  return !isGround(ch) && !isBlockingTile(ch, false);
}

export function ledgeAnchors(level) {
  const out = [];
  for (let r = 0; r < level.rows; r++) {
    for (const run of runsOnRow(level, r)) {
      const top = r;
      const ledge = (side) => ({ top, c0: run.c0, c1: run.c1, side, oneWay: run.oneWay });
      const left = openSide(level, run.c0 - 1, r);
      const right = openSide(level, run.c1 + 1, r);
      if (left) out.push({ x: run.c0 - ARCH.cornerOut, y: top - ARCH.lipLift, id: `cL:${run.c0}:${r}`, kind: 'corner', ledge: ledge('L') });
      if (right) out.push({ x: run.c1 + 1 + ARCH.cornerOut, y: top - ARCH.lipLift, id: `cR:${run.c1}:${r}`, kind: 'corner', ledge: ledge('R') });
      const w = run.c1 - run.c0 + 1;
      if ((left || right || run.oneWay) && w >= ARCH.edgeMinRun) {
        const n = Math.floor((w - 3) / ARCH.edgeSpacing); // points strictly inside, 1.5+ tiles from each end
        for (let i = 1; i <= n; i++) {
          const x = run.c0 + (w * i) / (n + 1);
          out.push({ x, y: top - ARCH.lipLift, id: `e:${x.toFixed(2)}:${r}`, kind: 'edge', ledge: ledge('top') });
        }
      }
    }
  }
  return out;
}

const blocks = (level, c, r) => isBlockingTile(tileAt(level, c, r), false);

/** The exposed ledge a prop stands on or juts from: the first standable top in the grip's
 *  column within 3 rows under the grip, with the run it belongs to (so a line reeled in to a
 *  railing or a statue ends in the same auto-climb as a corner). null if none. */
function ledgeUnder(level, gx, gy) {
  const c = Math.floor(gx);
  for (let r = Math.floor(gy) + 1; r <= Math.floor(gy) + 3 && r < level.rows; r++) {
    for (const cc of [c, c - 1, c + 1]) {
      if (cc < 0 || cc >= level.cols || !isStandable(level, cc, r, false)) continue;
      const run = runsOnRow(level, r).find((u) => u.c0 <= cc && cc <= u.c1);
      if (run) return { top: r, c0: run.c0, c1: run.c1, side: 'top', oneWay: run.oneWay };
    }
  }
  return null;
}

/** Prop grips. A flush prop (statue) is gone if any tile of its box is covered by stone; a
 *  protruding one (railing, gargoyle, beam hook, lamp bracket, flagpole) keeps its grip on a
 *  stacked face and is only gone if the grip itself ends up inside stone. */
export function propAnchors(level, props = []) {
  const out = [];
  for (const p of props) {
    const t = PROP_TYPES[p.type];
    if (p.deco || !t || !t.grip) continue; // art only (railing middle spans, brackets, decor)
    const g = propGrip(p);
    if (blocks(level, Math.floor(g.x), Math.floor(g.y))) continue; // grip buried
    if (!t.protrudes) {
      let covered = false;
      for (let y = 0; y < t.h && !covered; y++) for (let x = 0; x < t.w; x++) if (blocks(level, p.c + x, p.r + y)) { covered = true; break; }
      if (covered) continue;
    }
    const a = { x: g.x, y: g.y, id: `p:${p.type}:${p.c}:${p.r}`, kind: 'prop', prop: p.type };
    const ledge = ledgeUnder(level, g.x, g.y);
    if (ledge) a.ledge = ledge;
    out.push(a);
  }
  return out;
}

/** All architecture anchors of a parsed level (props from its def). */
export function archAnchors(level, props = []) {
  return [...ledgeAnchors(level), ...propAnchors(level, props)];
}
