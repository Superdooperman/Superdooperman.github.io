// Feel pass 1 (movement and combat snap). Pure helpers and the ?feel=1 overlay text.
// The rope and zip solvers do not live here and do not read these helpers. Dodge, the
// strike and hit-stop are applied by sim.js only while she is off the line.
import { FEEL, FEELFIX, TILE_PX } from './config.js';
import { bodyCenterY } from './physics.js';

/** Recovery is the only part of a strike that jump, dodge or the grapple can cancel. */
export function canCancelAttack(phase) { return phase === 'recover'; }

export function attackLimit(phase) {
  if (phase === 'windup') return FEEL.attackWindup;
  if (phase === 'active') return FEEL.attackActive;
  if (phase === 'recover') return FEEL.attackRecover;
  return 0;
}

/** Whole sim steps a hit-stop actually holds. A leftover shorter than one step does not
 *  add another step: five steps would be 83 ms, past the 80 ms cap. */
export function hitStopHeld(dur, dt = 1 / 60) {
  if (dur <= 0) return 0;
  const steps = Math.floor((dur + 1e-12) / dt);
  return steps * dt;
}

/** Touch swipe: horizontal, long enough, fast enough. Returns -1, 1, or 0. */
export function swipeDodge(dx, dy, dtMs) {
  if (!(dtMs >= 0) || dtMs > FEEL.swipeMaxMs) return 0;
  if (Math.abs(dx) < FEEL.swipeMinPx) return 0;
  if (Math.abs(dx) < Math.abs(dy) * FEEL.swipeAxis) return 0;
  return dx < 0 ? -1 : 1;
}

/** Body bump used for the i-frame hit. Same idea as a watchman's touch box, but it is not
 *  the sight test: stealth never reads this. */
export function guardBump(w, g) {
  if (!w || !g || g.kind !== 'guard') return false;
  const py = bodyCenterY(w);
  return Math.abs(w.x - g.x) < FEEL.contactRange && py > g.floorY - FEEL.contactAbove && py < g.floorY;
}

/** True when the active strike reaches this guard. One landing per swing is the sim's job.
 *  Tied and alert are skipped, the same skip as tieCheck: a swing must not overwrite the
 *  "!" beat or a guard who is already tied. */
export function attackReaches(w, g) {
  if (!w?.atk || w.atk.phase !== 'active' || !g || g.kind !== 'guard') return false;
  if (g.state === 'tied' || g.state === 'alert') return false;
  const dx = (g.x - w.x) * (w.face < 0 ? -1 : 1);
  if (dx < FEEL.attackBehind || dx > FEEL.attackReach) return false;
  return Math.abs(w.y - g.floorY) <= FEEL.attackVert;
}

const PHASE = Object.freeze({ windup: 'WIN', active: 'ACT', recover: 'REC' });
const f2 = (n) => Math.max(0, Number(n) || 0).toFixed(2);

/** Lines for the ?feel=1 overlay. Glyphs are the bitmap font (A-Z, digits, . / -). */
export function feelLines(w) {
  const coyMax = w.coyoteMax ?? FEEL.coyoteTime;
  const atk = w.atk ? `${PHASE[w.atk.phase] || 'ATK'} ${f2(w.atk.t)}` : '---';
  const dodgeLeft = w.dodge ? Math.max(0, FEEL.dodgeTime - w.dodge.t) : 0;
  const stag = (w.level?.guards || []).filter((g) => g.state === 'stagger').length;
  return [
    `COYOTE ${f2(w.coyote)}/${f2(coyMax)}`,
    `BUFFER ${f2(w.jumpBuf)}/${f2(w.bufferMax ?? FEEL.jumpBuffer)}`,
    `DODGE ${f2(dodgeLeft)} CD ${f2(w.dodgeCd)}`,
    `IFRAME ${f2(w.invuln)}`,
    `ATK ${atk}`,
    `STOP ${f2(w.hitStop)}`,
    `STAGGER ${stag}`,
  ];
}

/** Lines for the ?tune overlay (feel fix 1): the chain, her speed and the air cap it allows
 *  (tiles/s and px/s), the swing on the current hook, the last release grade and the zoom. */
export function tuneLines(w, zoom = null) {
  const sp = Math.hypot(w.vx || 0, w.vy || 0);
  const pxs = (n) => Math.round(n * TILE_PX);
  const lines = [
    `CHAIN ${w.chain || 0}/${FEELFIX.chainMax}  CLEAN ${w.cleanCatches || 0}`,
    `SPD ${f2(Math.abs(w.vx))} VX ${pxs(Math.abs(w.vx))} PX/S  ALL ${f2(sp)}`,
    `CAP ${f2(w.airCap)} ${pxs(w.airCap || 0)} PX/S${w.hopCap ? ' HOP' : ''}`,
    `TAUT ${f2(w.tautT)} ARC ${f2(w.arc)}`,
    `REL ${w.lastGrade || '---'}`,
  ];
  if (zoom) lines.push(`ZOOM ${zoom.zoom.toFixed(2)} TGT ${zoom.target.toFixed(2)} V ${f2(zoom.speed)}${zoom.guard ? ' GUARD' : ''}${zoom.view ? ' ' + zoom.view : ''}`);
  if (!w.feelFix) lines.unshift('PHYSICS LEGACY');
  return lines;
}
