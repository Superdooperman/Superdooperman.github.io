// Grapple rope (ported from v1 vt): a position-based length constraint solved
// ropeIterations times per step, radial outward velocity removed when taut, then
// swing pumping along the tangent. Mutates body { x, y, vx, vy, h }.
import { TUNING, v1px } from './config.js';

/** The one inextensible-line rule, shared by the grapple (below) and the M5 cloak and rope-tail
 *  point chains (chain.js): if (dx, dy) is longer than len, the unit direction and how far over. */
export function overLength(dx, dy, len, eps = v1px(1e-4)) {
  const d = Math.hypot(dx, dy) || eps;
  if (d <= len) return null;
  return { nx: dx / d, ny: dy / d, over: d - len };
}

/** Returns true if the rope ended the step taut. */
export function solveRope(body, anchor, ropeLen, iterations = TUNING.ropeIterations) {
  let taut = false;
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
      body.vx -= radial * nx;
      body.vy -= radial * ny;
    }
  }
  return taut;
}

/** Swing pump: input along the swing adds tangential acceleration. dir is -1/0/+1. */
export function pumpSwing(body, anchor, dir, dt) {
  const cy = body.y - body.h * 0.5;
  const dx = body.x - anchor.x;
  const dy = cy - anchor.y;
  const d = Math.hypot(dx, dy) || v1px(1);
  const tx = -dy / d;
  const ty = dx / d;
  if (dir !== 0 && Math.abs(tx) > TUNING.pumpMinTangent) {
    const s = dir * Math.sign(tx);
    body.vx += tx * s * TUNING.pumpAccel * dt;
    body.vy += ty * s * TUNING.pumpAccel * dt;
  }
}

/** Reel in (up) or pay out (down), clamped to [lineMin, maxRange]. upMul: Quick Reel (reel-in only). */
export function reel(ropeLen, up, down, maxRange, dt, upMul = 1) {
  let len = ropeLen;
  if (up) len = Math.max(TUNING.lineMin, len - TUNING.reelSpeed * upMul * dt);
  if (down) len = Math.min(maxRange, len + TUNING.reelSpeed * dt);
  return len;
}
