// Grapple target choice for the v2 controls (BRIEF "Grapple controls"). Pure functions.
// Auto-target: the nearest reachable point in the facing direction, preferring points above
// her, biased by a held D-pad direction, with hysteresis so it does not flicker.
import { TUNING } from './config.js';
import { lineOfSight } from './los.js';

/** Rings in range with a clear line from (x, cy). */
export function reachable(level, x, cy, range, doorsOpen) {
  return level.rings.filter((r) => Math.hypot(r.x - x, r.y - cy) <= range
    && lineOfSight(level, x, cy, r.x, r.y, doorsOpen));
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
  if (dir.x || dir.y) {
    const dl = Math.hypot(dir.x, dir.y);
    const cos = d > 1e-9 ? (dx * dir.x + dy * dir.y) / (d * dl) : 1;
    s += T.targetDirBias * (Math.acos(Math.max(-1, Math.min(1, cos))) / Math.PI);
  }
  return s;
}

/** Pick the auto target with hysteresis.
 *  state: { target, age } from the previous step (age = seconds since it was chosen). */
export function chooseTarget(level, { x, cy, face, dir, range, doorsOpen }, state = { target: null, age: 0 }) {
  const cands = reachable(level, x, cy, range, doorsOpen);
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
