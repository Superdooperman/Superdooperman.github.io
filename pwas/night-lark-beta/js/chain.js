// M5 point chains: the Lark's cloak and the rope tail. Verlet points joined by the same
// inextensible-line rule as the grapple rope (rope.js overLength), so cloth and line bunch up
// but never stretch. Tile units, fixed dt. Pure: no DOM, never touches the sim.
import { overLength } from './rope.js';

/** n points, seg tiles apart, hanging straight down from (x, y). */
export function createChain(n, seg, x, y) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push({ x, y: y + i * seg, px: x, py: y + i * seg });
  return { pts, seg };
}

/** Put every point at rest along (dx, dy) from (x, y) with no velocity (snap, or reduced motion). */
export function poseChain(ch, x, y, dx = 0, dy = 1) {
  const d = Math.hypot(dx, dy) || 1;
  ch.pts.forEach((p, i) => { p.x = p.px = x + (dx / d) * ch.seg * i; p.y = p.py = y + (dy / d) * ch.seg * i; });
}

/**
 * One fixed step. pinA holds point 0; pinB (optional) holds the last point (a line between two
 * ends). force {x, y} is acceleration in tiles/s^2 (gravity plus any trailing wind); drag is the
 * fraction of velocity kept per step. Line constraints only pull (rope rule), like the grapple.
 */
export function stepChain(ch, dt, { pinA, pinB = null, force = { x: 0, y: 30 }, drag = 0.96, iterations = 4, maxSpeed = 2 }) {
  const P = ch.pts; const n = P.length;
  for (let i = 1; i < n; i++) {
    const p = P[i];
    let vx = (p.x - p.px) * drag; let vy = (p.y - p.py) * drag;
    const v = Math.hypot(vx, vy); if (v > maxSpeed) { vx *= maxSpeed / v; vy *= maxSpeed / v; }
    p.px = p.x; p.py = p.y;
    p.x += vx + force.x * dt * dt; p.y += vy + force.y * dt * dt;
  }
  const pin = (p, q) => { p.px = p.x; p.py = p.y; p.x = q.x; p.y = q.y; };
  pin(P[0], pinA);
  if (pinB) pin(P[n - 1], pinB);
  for (let k = 0; k < iterations; k++) {
    for (let i = 1; i < n; i++) {
      const a = P[i - 1]; const b = P[i];
      const ex = overLength(b.x - a.x, b.y - a.y, ch.seg);
      if (!ex) continue;
      const fixedA = i - 1 === 0; const fixedB = pinB && i === n - 1;
      if (fixedA && fixedB) continue;
      const wa = fixedA ? 0 : fixedB ? 1 : 0.5; const wb = 1 - wa;
      a.x += ex.nx * ex.over * wa; a.y += ex.ny * ex.over * wa;
      b.x -= ex.nx * ex.over * wb; b.y -= ex.ny * ex.over * wb;
    }
  }
  if (!pinB) { // final pass out from the pin: a hanging chain can never end up stretched
    for (let i = 1; i < n; i++) {
      const a = P[i - 1]; const b = P[i];
      const ex = overLength(b.x - a.x, b.y - a.y, ch.seg);
      if (ex) { b.x -= ex.nx * ex.over; b.y -= ex.ny * ex.over; }
    }
  }
  return ch;
}

/** Total length of the chain as it lies (tests). */
export const chainLength = (ch) => ch.pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - ch.pts[i].x, p.y - ch.pts[i].y), 0);
