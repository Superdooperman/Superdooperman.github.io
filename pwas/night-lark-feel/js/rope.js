// Grapple rope (ported from v1 vt): a position-based length constraint solved
// ropeIterations times per step, radial outward velocity removed when taut, then
// swing pumping along the tangent. Mutates body { x, y, vx, vy, h }.
import { TUNING, SWING, v1px } from './config.js';

/** The one inextensible-line rule, shared by the grapple (below) and the M5 cloak and rope-tail
 *  point chains (chain.js): if (dx, dy) is longer than len, the unit direction and how far over. */
export function overLength(dx, dy, len, eps = v1px(1e-4)) {
  const d = Math.hypot(dx, dy) || eps;
  if (d <= len) return null;
  return { nx: dx / d, ny: dy / d, over: d - len };
}

/** Returns true if the rope ended the step taut. */
export function solveRope(body, anchor, ropeLen, iterations = TUNING.ropeIterations, keep = 0) {
  // keep > 0 (v2 freefall catch, SWING.attachKeep): when the line snaps taut on a falling body,
  // her speed is turned along the arc (x keep) instead of the outward part being cut off.
  let taut = false;
  let snapped = false;
  for (let i = 0; i < iterations; i++) {
    const cy = body.y - body.h * 0.5;
    const dx = body.x - anchor.x;
    const dy = cy - anchor.y;
    const ex = overLength(dx, dy, ropeLen, v1px(1e-4));
    if (!ex) break;
    taut = true;
    const { nx, ny, over } = ex;
    body.x -= nx * over;
    body.y -= ny * over;
    const radial = body.vx * nx + body.vy * ny;
    if (radial > 0) {
      const sp = Math.hypot(body.vx, body.vy);
      body.vx -= radial * nx;
      body.vy -= radial * ny;
      if (keep > 0 && !snapped) {
        snapped = true;
        let tx = -ny; let ty = nx; // tangent; pick the side she is already moving toward
        let along = body.vx * tx + body.vy * ty;
        if (Math.abs(along) < 1e-6) along = (body.face || 1) * Math.sign(tx || 1);
        if (along < 0) { tx = -tx; ty = -ty; }
        body.vx = tx * sp * keep; body.vy = ty * sp * keep;
      }
    }
  }
  if (keep > 0) body.snapped = snapped;
  return taut;
}

/** Swing pump: input along the swing adds tangential acceleration. dir is -1/0/+1.
 *  feel (v2, SWING): input with the swing pumps at pumpWithMul, against it at pumpAgainstMul. */
export function pumpSwing(body, anchor, dir, dt, feel = false) {
  const cy = body.y - body.h * 0.5;
  const dx = body.x - anchor.x;
  const dy = cy - anchor.y;
  const d = Math.hypot(dx, dy) || v1px(1);
  const tx = -dy / d;
  const ty = dx / d;
  if (dir !== 0 && Math.abs(tx) > TUNING.pumpMinTangent) {
    const s = dir * Math.sign(tx);
    let a = TUNING.pumpAccel;
    if (feel) {
      const along = body.vx * tx + body.vy * ty; // current speed along the tangent
      a *= Math.abs(along) < v1px(4) || Math.sign(along) === s ? SWING.pumpWithMul : SWING.pumpAgainstMul;
    }
    body.vx += tx * s * a * dt;
    body.vy += ty * s * a * dt;
  }
}

/** v2 feel: reeling from oldLen to newLen keeps angular momentum, so the speed along the arc
 *  scales by oldLen/newLen (only when shortening a taut line), then the arc speed is capped. */
export function conserveSwing(body, anchor, oldLen, newLen) {
  const cy = body.y - body.h * 0.5;
  const dx = body.x - anchor.x;
  const dy = cy - anchor.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const tx = -dy / d;
  const ty = dx / d;
  let along = body.vx * tx + body.vy * ty;
  const radial = (body.vx * dx + body.vy * dy) / d;
  if (SWING.reelConserve && newLen < oldLen && d >= newLen - 1e-6) along *= oldLen / newLen;
  along = Math.max(-SWING.maxSwingSpeed, Math.min(SWING.maxSwingSpeed, along));
  body.vx = tx * along + (dx / d) * radial;
  body.vy = ty * along + (dy / d) * radial;
}

/** Reel in (up) or pay out (down), clamped to [lineMin, maxRange]. upMul: Quick Reel (reel-in only). */
export function reel(ropeLen, up, down, maxRange, dt, upMul = 1) {
  let len = ropeLen;
  if (up) len = Math.max(TUNING.lineMin, len - TUNING.reelSpeed * upMul * dt);
  if (down) len = Math.min(maxRange, len + TUNING.reelSpeed * dt);
  return len;
}
