// M2 stealth: watchers (watchmen and searchlights), the meter, the grace beat, search and hearing.
// Pure state on the world and level objects; the sim calls stepStealth() once per play step and
// handles a catch (feather, bark, room reset) itself. Geometry lives in los.js.
//
// One meter for the Lark (as in v1). It fills while ANY watcher sees her and is drawn over the
// watcher who sees her (w.meterSrc). Full meter = the grace beat: that watcher freezes with a "!"
// for graceTime. If it stops seeing her inside the window she gets away (meter drops to
// escapeMeter) and it searches her last-seen spot; if it still sees her when the window ends,
// she is caught.
import { TUNING } from './config.js';
import { isStandable } from './level.js';
import { guardSees, guardSeesLit, isHidden, isLit, searchlightSees, sweepAngle, lineOfSight, inCone } from './los.js';

export const watchersOf = (level) => [...level.guards, ...(level.searchlights || [])];
export const eyeOf = (o) => (o.kind === 'searchlight' ? { x: o.x, y: o.y } : { x: o.x, y: o.floorY - TUNING.guardEyeHeight });

/** Does this watcher see the point? Guards: their cone, or farther if she stands in lamplight. */
export function watcherSees(level, o, px, py, doorsOpen = false) {
  if (o.kind === 'searchlight') return searchlightSees(level, o, px, py, doorsOpen);
  if (guardSees(level, o, px, py, doorsOpen)) return true;
  if (Math.abs(px - o.x) < TUNING.touchRange && py > o.floorY - 2 && py < o.floorY) return true; // bumped into him
  return isLit(level, px, py, doorsOpen) && guardSeesLit(level, o, px, py, doorsOpen);
}

/** v1 patrol (walk c0..c1, turn at the ends). A guard outside his path walks back into it. */
export function patrol(g, dt) {
  const lo = g.c0 + 0.5;
  const hi = g.c1 + 0.5;
  const v = (g.speed / 16) * dt;
  if (g.x < lo - 1e-9) { g.dir = 1; g.x = Math.min(lo, g.x + v); return; }
  if (g.x > hi + 1e-9) { g.dir = -1; g.x = Math.max(hi, g.x - v); return; }
  g.x += g.dir * v;
  if (g.x < lo) { g.x = lo; g.dir = 1; } else if (g.x > hi) { g.x = hi; g.dir = -1; }
}

/** Walk toward tx on his own floor; never off the end of it. True once there (or blocked). */
function walkTo(level, g, tx, speed, dt) {
  const d = tx - g.x;
  if (Math.abs(d) < 1e-3) return true;
  g.dir = Math.sign(d);
  const nx = g.x + g.dir * Math.min(Math.abs(d), speed * dt);
  if (!isStandable(level, Math.floor(nx), g.floorY, false)) return true;
  g.x = nx;
  return Math.abs(tx - nx) < 1e-3;
}

function stepGuard(level, g, dt, emit) {
  const T = TUNING;
  switch (g.state) {
    case 'tied': return; // M4 Tie-Line: out for the room
    case 'alert': return; // frozen with the "!"
    case 'listen':
      g.t -= dt;
      if (g.t <= 0) g.state = 'patrol';
      return;
    case 'search': {
      const there = walkTo(level, g, g.searchX, (g.speed / 16) * T.searchSpeedMul, dt);
      if (!there) return;
      g.t -= dt;
      g.flipT -= dt;
      if (g.flipT <= 0) { g.dir = -g.dir; g.flipT = T.searchLookFlip; }
      if (g.t <= 0) { g.state = 'patrol'; emit('search-end', { by: 'guard' }); }
      return;
    }
    default: patrol(g, dt);
  }
}

export function stepSearchlight(s, dt, emit) {
  const T = TUNING;
  if (s.state === 'alert') return;
  let target;
  if (s.state === 'search') {
    target = s.aim;
    s.t -= dt;
    if (s.t <= 0) { s.state = 'sweep'; emit('search-end', { by: 'searchlight' }); }
  } else {
    s.sweepT += dt;
    target = sweepAngle(s, s.sweepT);
  }
  // swing toward the target (the sweep itself is slower than this, so it tracks exactly)
  const d = Math.atan2(Math.sin(target - s.angle), Math.cos(target - s.angle));
  const maxTurn = 3 * dt;
  s.angle += Math.abs(d) <= maxTurn ? d : Math.sign(d) * maxTurn;
}

/** Footstep and landing noise for this step, in tiles (0 = silent). */
export function noiseRadius(w, landDrop) {
  const T = TUNING;
  const r = T.hearingRadius * (w.hearingMul ?? 1);
  if (landDrop !== null && landDrop >= T.landNoiseDrop) return r * T.landNoiseMul;
  if (w.grounded && !w.crouch && !w.climb && Math.abs(w.vx) >= T.hearingMinSpeed) return r;
  return 0;
}

/** Can guard g hear a noise of radius r made at (x,y)? Stone between halves it. Pure. */
export function hears(level, g, x, y, r, doorsOpen = false) {
  if (r <= 0) return false;
  const e = eyeOf(g);
  const d = Math.hypot(x - e.x, y - e.y);
  if (d >= r) return false;
  return d < r * TUNING.hearingWallMul || lineOfSight(level, e.x, e.y, x, y, doorsOpen);
}

// ---- M4 power-ups ----

/** Smoke Pellet: a sight line from the eye to her passing within a cloud's radius is blocked
 *  (that also covers her standing inside it). */
export function smokeBlocks(smokes, ex, ey, px, py) {
  for (const s of smokes || []) {
    const dx = px - ex; const dy = py - ey;
    const L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((s.x - ex) * dx + (s.y - ey) * dy) / L2));
    if (Math.hypot(ex + dx * t - s.x, ey + dy * t - s.y) < s.r) return true;
  }
  return false;
}

/** Shadow Cloak: a cloaked Lark is only seen in the inner part of a guard's cone (range and
 *  angle x cloakInner) or by touch; searchlights and lamplight work as usual. */
export function cloakAllows(level, o, px, py) {
  if (o.kind === 'searchlight') return true;
  if (Math.abs(px - o.x) < TUNING.touchRange && py > o.floorY - 2 && py < o.floorY) return true;
  const k = TUNING.cloakInner;
  return inCone(o.x, o.floorY - TUNING.guardEyeHeight, o.dir, px, py, TUNING.coneRange * k, TUNING.coneHalfAngle * k);
}

/** Tie-Line: falling onto a guard's head ties him up. Returns the guard, or null. */
export function tieCheck(w, level) {
  if (w.grounded || w.vy <= 0 || w.anchor) return null;
  for (const g of level.guards) {
    if (g.state === 'tied' || g.state === 'alert') continue;
    const head = g.floorY - TUNING.standHeight; // a watchman is about as tall as she is
    if (Math.abs(w.x - g.x) < TUNING.tieReachX && w.y >= head - 0.3 && w.y <= head + 0.45 && w.peakY < head - 0.3) {
      g.state = 'tied'; g.sees = false;
      return g;
    }
  }
  return null;
}

/** One stealth step. Returns the watcher who caught her, or null. */
export function stepStealth(w, level, dt, emit, noise = 0) {
  const T = TUNING;
  const cy = w.center();
  const hidden = isHidden(level, w.x, w.y, cy, w.crouch);
  if (hidden !== w.hidden) { w.hidden = hidden; emit(hidden ? 'hide' : 'unhide'); }
  w.lit = isLit(level, w.x, cy, w.doorsOpen);

  for (const g of level.guards) stepGuard(level, g, dt, emit);
  for (const s of level.searchlights || []) stepSearchlight(s, dt, emit);

  // hearing: a patrolling or searching guard turns to the sound and stands listening
  if (noise > 0) {
    for (const g of level.guards) {
      if (g.state === 'alert' || g.state === 'tied') continue;
      if (!hears(level, g, w.x, cy, noise, w.doorsOpen)) continue;
      const dir = Math.sign(w.x - g.x) || g.dir;
      if (g.state !== 'listen' || g.dir !== dir) emit('heard', { noise });
      g.state = 'listen'; g.t = T.listenTime; g.dir = dir;
    }
  }

  // sight
  let closest = null;
  let cd = Infinity;
  for (const o of watchersOf(level)) {
    o.sees = !hidden && o.state !== 'tied' && watcherSees(level, o, w.x, cy, w.doorsOpen);
    if (o.sees && w.smokes?.length) { const e = eyeOf(o); if (smokeBlocks(w.smokes, e.x, e.y, w.x, cy)) o.sees = false; }
    if (o.sees && w.cloaked && !cloakAllows(level, o, w.x, cy)) o.sees = false;
    if (!o.sees) continue;
    o.lastSeen = { x: w.x, y: cy };
    const e = eyeOf(o);
    const d = Math.hypot(w.x - e.x, cy - e.y);
    if (d < cd) { cd = d; closest = o; }
  }

  // the grace beat
  if (w.alert) {
    const a = w.alert;
    a.t -= dt;
    if (!a.src.sees) {
      w.alert = null;
      w.escapes += 1;
      w.meter = T.escapeMeter;
      startSearch(a.src);
      emit('escape', { by: a.src.kind });
      emit('search-start', { by: a.src.kind });
      return null;
    }
    if (a.t <= 0) { w.alert = null; return a.src; } // stays frozen for the bark
    return null;
  }

  const before = w.meter;
  if (closest) {
    w.meter = Math.min(1, w.meter + T.meterFill * (w.hasSpark ? T.meterSparkMul : 1) * dt);
    if (!w.meterSrc || !w.meterSrc.sees) w.meterSrc = closest;
    if (before === 0) emit('noticed', { by: closest.kind });
  } else {
    w.meter = Math.max(0, w.meter - T.meterDecay * dt);
    if (w.meter === 0 && before > 0) { w.meterSrc = null; emit('unseen'); }
  }
  if (w.meter >= 1 && w.meterSrc) {
    w.alerts += 1;
    w.alert = { src: w.meterSrc, t: T.graceTime * (w.graceMul ?? 1), time: T.graceTime * (w.graceMul ?? 1) };
    w.meterSrc.state = 'alert';
    emit('alert', { by: w.meterSrc.kind });
  }
  return null;
}

function startSearch(o) {
  const T = TUNING;
  o.state = 'search';
  o.t = T.searchTime;
  const seen = o.lastSeen;
  if (o.kind === 'searchlight') { o.aim = Math.atan2(seen.y - o.y, seen.x - o.x); return; }
  const lo = o.c0 + 0.5 - T.searchReach;
  const hi = o.c1 + 0.5 + T.searchReach;
  const tx = seen.x - Math.sign(seen.x - o.x) * T.searchStopShort;
  o.searchX = Math.max(lo, Math.min(hi, Math.abs(seen.x - o.x) < T.searchStopShort ? o.x : tx));
  o.flipT = T.searchLookFlip;
}
