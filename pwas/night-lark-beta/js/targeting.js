// Grapple target choice for the v2 controls (BRIEF "Grapple controls"). Pure functions.
// Auto-target: the nearest reachable point in the facing direction, preferring points above
// her, biased by a held D-pad direction, with hysteresis so it does not flicker.
import { TUNING, ARCH } from './config.js';
import { acosClamped } from './geom.js';
//
// Grappleable architecture (Oct 28 2026): in rooms whose anchors come from the map
// (level.anchorMode 'arch' | 'mixed'), auto-aim also
//   - drops points closer than ARCH.minDist and the corners/edges of the ledge she stands on,
//   - with a D-pad direction held, keeps only points inside ARCH.aimConeHalf of it (if any),
//   - adds ARCH.kindBias per kind (a statue or railing wins a near tie, an edge point loses one).
// Range and line of sight are the same as for rings: stone blocks, wood does not.
import { lineOfSight } from './los.js';

/** Rings in range with a clear line from (x, cy). */
export function reachable(level, x, cy, range, doorsOpen) {
  return level.rings.filter((r) => Math.hypot(r.x - x, r.y - cy) <= range
    && lineOfSight(level, x, cy, r.x, r.y, doorsOpen));
}


/** Lit lamps in range with a clear line from (x, cy). */
export function reachableLamps(level, x, cy, range, doorsOpen) {
  return (level.lamps || []).filter((l) => Math.hypot(l.x - x, l.y - cy) <= range
    && lineOfSight(level, x, cy, l.x, l.y, doorsOpen));
}

/** A parsed lamp (level.js sets lamp: true). */
export const isSnuffLamp = (p) => !!(p && p.lamp);

/** Rings, plus lamps when the Lamp Snuffer is held, so hold-B aim can land on a lamp. A set
 *  piece's own light (a chandelier's candles, setpiece.js) is always aimable: putting it out
 *  drops the piece, with or without the power-up. */
export function aimCandidates(level, x, cy, range, doorsOpen, snuffer) {
  const rings = reachable(level, x, cy, range, doorsOpen);
  const lamps = reachableLamps(level, x, cy, range, doorsOpen).filter((l) => snuffer || l.setpiece);
  return lamps.length ? rings.concat(lamps) : rings;
}

/** Lower is better. face: -1/+1. dir: {x,y} held D-pad (0s for none). */
export function targetScore(ring, x, cy, face, dir = { x: 0, y: 0 }) {
  const T = TUNING;
  const dx = ring.x - x;
  const dy = ring.y - cy;
  const d = Math.hypot(dx, dy);
  let s = d;
  if (dx * face < -0.5) s += T.targetBehindPenalty; // behind (more than half a tile)
  if (dy > 0) s += T.targetBelowPenalty;
  if (ring.kind && ring.kind !== 'ring') s += ARCH.kindBias[ring.kind] ?? 0;
  if (dir.x || dir.y) {
    const dl = Math.hypot(dir.x, dir.y);
    const cos = d > 1e-9 ? (dx * dir.x + dy * dir.y) / (d * dl) : 1;
    s += T.targetDirBias * (acosClamped(cos) / Math.PI);
  }
  return s;
}

/** Pick the auto target with hysteresis.
 *  state: { target, age } from the previous step (age = seconds since it was chosen). */
export function chooseTarget(level, { x, cy, face, dir, range, doorsOpen }, state = { target: null, age: 0 }) {
  let cands = reachable(level, x, cy, range, doorsOpen);
  if (level.anchorMode && level.anchorMode !== 'rings') cands = archFilter(cands, x, cy, dir);
  if (!cands.length) return { target: null, age: 0 };
  let best = null;
  let bs = Infinity;
  for (const r of cands) {
    const s = targetScore(r, x, cy, face, dir);
    if (s < bs) { bs = s; best = r; }
  }
  const cur = state.target && cands.includes(state.target) ? state.target : null;
  if (cur && cur !== best) {
    const cs = targetScore(cur, x, cy, face, dir);
    if (state.age < TUNING.targetHoldTime || bs > cs - TUNING.targetSwitchMargin) return { target: cur, age: state.age };
  }
  return { target: best, age: best === cur ? state.age : 0 };
}

/** Arch rooms: skip points too close or on her own ledge; then the aim cone. */
export function archFilter(cands, x, cy, dir = { x: 0, y: 0 }) {
  const feet = cy + TUNING.standHeight / 2;
  let out = cands.filter((r) => {
    if (r.kind === 'ring') return true;
    if (Math.hypot(r.x - x, r.y - cy) < ARCH.minDist) return false;
    const L = r.ledge;
    if (L && Math.abs(L.top - feet) < 0.25 && x >= L.c0 - 0.6 && x <= L.c1 + 1.6) return false; // the ledge she is on
    return true;
  });
  if (dir && (dir.x || dir.y)) {
    const dl = Math.hypot(dir.x, dir.y);
    const cone = out.filter((r) => {
      const dx = r.x - x; const dy = r.y - cy; const d = Math.hypot(dx, dy) || 1;
      return acosClamped((dx * dir.x + dy * dir.y) / (d * dl)) <= ARCH.aimConeHalf;
    });
    if (cone.length) out = cone;
  }
  return out;
}

/** Manual aim: from the reticle's point, the nearest candidate in the pressed direction. */
export function stepReticle(cands, from, dir) {
  let best = null;
  let bs = Infinity;
  for (const r of cands) {
    if (r === from) continue;
    const dx = r.x - from.x;
    const dy = r.y - from.y;
    const d = Math.hypot(dx, dy);
    const cos = (dx * dir.x + dy * dir.y) / (d * Math.hypot(dir.x, dir.y));
    if (cos <= 0.2) continue;
    const s = d / cos;
    if (s < bs) { bs = s; best = r; }
  }
  return best || from;
}

/** Tap or click on the screen: the reachable point nearest the tapped spot, within tapPickRadius. */
export function pickAt(cands, px, py) {
  let best = null;
  let bd = TUNING.tapPickRadius;
  for (const r of cands) {
    const d = Math.hypot(r.x - px, r.y - py);
    if (d <= bd) { bd = d; best = r; }
  }
  return best;
}

/** Feel fix 2 aim pick: the reachable point nearest the aim direction (unit vector from her
 *  centre). Inside the cone (half-angle coneHalf) the smallest angle wins, ties to the nearer
 *  point; a real ledge or prop (any kind but 'ring') beats a ring in the cone, so in a room with
 *  ledges the aim lands on stone, and a ring-only room still aims at its rings. An empty cone
 *  gives the point nearest the aim at any angle. Lamps (only offered with the Lamp Snuffer, except
 *  a set piece's own light, which is always aimable) and chandelier candles win only as the
 *  closest-angle point in the cone, so an aim straight at a lamp or the candles picks it over the
 *  lantern or grip it hangs from, but a lamp, candle, or set-piece grip off to the side never
 *  steals a ring or ledge aim. Null with no candidates. */
export function aimPick(cands, x, cy, dir, coneHalf) {
  if (!cands.length) return null;
  const ang = (r) => {
    const dx = r.x - x, dy = r.y - cy; const d = Math.hypot(dx, dy) || 1e-6;
    return acosClamped((dx * dir.x + dy * dir.y) / d);
  };
  const scored = cands.map((r) => ({ r, a: ang(r), d: Math.hypot(r.x - x, r.y - cy), solid: !!r.kind && r.kind !== 'ring' && !r.lamp }));
  const better = (p, q) => (Math.abs(p.a - q.a) > 0.035 ? p.a < q.a : p.d < q.d); // ~2 degrees counts as a tie
  const best = (list) => list.reduce((b, c) => (!b || better(c, b) ? c : b), null);
  const cone = scored.filter((c) => c.a <= coneHalf);
  const top = best(cone);
  // Lamps, chandelier candles, and set-piece grips win only as the closest-angle point in the cone,
  // so aiming at one picks it, but a lamp, candle, or grip off to the side never steals a ring or
  // ledge aim (set-piece grips are kind:prop, so they must stay out of the solid pass).
  const pick = (top && (top.r.lamp || top.r.setpiece) ? top : null) || best(cone.filter((c) => c.solid && !c.r.setpiece)) || top || best(scored);
  return pick.r;
}
