// Line of sight and vision cones (ported from v1 Ye / tt). Pure functions, tile units.
// Rule: hidden or seen is decided here by geometry, never read from pixels.
import { TUNING } from './config.js';
import { tileAt, isOpaqueTile, isShadow } from './level.js';

/** v1 Ye(): sample the segment every losStep; any opaque tile in between blocks it.
 *  Stone, blue stone and closed doors are opaque; thin wood is not.
 *  The end points themselves are not sampled. */
export function lineOfSight(level, x0, y0, x1, y1, doorsOpen = false, step = TUNING.losStep) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    if (isOpaqueTile(tileAt(level, Math.floor(x), Math.floor(y)), doorsOpen)) return false;
  }
  return true;
}

/** How far a ray from (x0, y0) at angle a travels before it enters an opaque tile (or reaches
 *  range): the same samples lineOfSight takes, so the drawn beam matches what it can see. */
export function rayLength(level, x0, y0, a, range, doorsOpen = false, step = TUNING.losStep) {
  const dx = Math.cos(a); const dy = Math.sin(a);
  for (let d = step; d < range; d += step) {
    if (isOpaqueTile(tileAt(level, Math.floor(x0 + dx * d), Math.floor(y0 + dy * d)), doorsOpen)) return d;
  }
  return range;
}

/** The lit area of a beam (M3): a fan from (x0, y0) between angles a0 and a1, each ray cut where
 *  it meets stone. Returns [{x, y}] in tile units, apex first, for the renderer to fill. */
export function beamPolygon(level, x0, y0, a0, a1, range, rays = 24, doorsOpen = false) {
  const pts = [{ x: x0, y: y0 }];
  for (let i = 0; i <= rays; i++) {
    const a = a0 + ((a1 - a0) * i) / rays;
    const d = rayLength(level, x0, y0, a, range, doorsOpen);
    pts.push({ x: x0 + Math.cos(a) * d, y: y0 + Math.sin(a) * d });
  }
  return pts;
}

/** Is (px,py) inside a cone at (ex,ey) facing dir (+1 right, -1 left)? Geometry only. */
export function inCone(ex, ey, dir, px, py, range = TUNING.coneRange, half = TUNING.coneHalfAngle) {
  const dx = px - ex;
  const dy = py - ey;
  const d = Math.hypot(dx, dy);
  if (!(d < range && d > 1 / 16)) return false; // v1: C < 78 && C > 1 (px)
  const ang = Math.atan2(dy, dx);
  const face = dir > 0 ? 0 : Math.PI;
  const diff = Math.atan2(Math.sin(ang - face), Math.cos(ang - face));
  return Math.abs(diff) < half;
}

/** A guard sees a point if it is in the cone and the line of sight is clear (v1 tt). */
export function guardSees(level, guard, px, py, doorsOpen = false) {
  const ex = guard.x;
  const ey = guard.floorY - TUNING.guardEyeHeight;
  return inCone(ex, ey, guard.dir, px, py) && lineOfSight(level, ex, ey, px, py, doorsOpen);
}

/** v1 gt(): crouching on a shadow tile ('s' stone or '~' wood) with no lamp within hideLampRadius. */
export function isHidden(level, x, y, centerY, crouching) {
  if (!crouching) return false;
  if (!isShadow(tileAt(level, Math.floor(x), Math.floor(y + 1 / 16)))) return false;
  for (const l of level.lamps) if (Math.hypot(x - l.x, centerY - l.y) < TUNING.hideLampRadius) return false;
  return true;
}

// ---- M2 ----

/** In a lamp pool: within hideLampRadius of a lamp with a clear line to it (stone shades). */
export function isLit(level, x, centerY, doorsOpen = false) {
  for (const l of level.lamps)
    if (Math.hypot(x - l.x, centerY - l.y) < TUNING.hideLampRadius && lineOfSight(level, l.x, l.y, x, centerY, doorsOpen)) return true;
  return false;
}

/** Light reveals: a lit Lark is seen from litSightRange by a guard roughly facing her. */
export function guardSeesLit(level, guard, px, py, doorsOpen = false) {
  const ex = guard.x;
  const ey = guard.floorY - TUNING.guardEyeHeight;
  return inCone(ex, ey, guard.dir, px, py, TUNING.litSightRange, TUNING.litHalfAngle) && lineOfSight(level, ex, ey, px, py, doorsOpen);
}

/** A searchlight beam (origin s.x,s.y, aim s.angle) sees a point inside the beam with a clear line. */
export function inBeam(s, px, py) {
  const dx = px - s.x;
  const dy = py - s.y;
  const d = Math.hypot(dx, dy);
  if (!(d < s.range && d > 1 / 16)) return false;
  const diff = Math.atan2(Math.sin(Math.atan2(dy, dx) - s.angle), Math.cos(Math.atan2(dy, dx) - s.angle));
  return Math.abs(diff) < s.half;
}
export function searchlightSees(level, s, px, py, doorsOpen = false) {
  return inBeam(s, px, py) && lineOfSight(level, s.x, s.y, px, py, doorsOpen);
}

/** The sweep: base ± amp, a sine over period seconds. */
export function sweepAngle(s, t) {
  return s.base + s.amp * Math.sin((2 * Math.PI * t) / s.period + s.phase);
}
