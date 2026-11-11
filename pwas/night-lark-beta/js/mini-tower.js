// Mini moon towers: local checkpoints. Relighting one sets the checkpoint, makes a small
// warm safe pocket (still a lamp: ALL light exposes Wren) and reveals that area's map.
// Values live in MINI_TOWER (config.js) so they stay easy to tune.
import { MINI_TOWER as MT, TILE_PX, TUNING } from './config.js';
import { sightCues } from './setpiece.js';

export const miniTowerFoot = (t) => ({ x: t.c + 1.5, y: t.r + 1 }); // tiles, bottom-centre of the 48 px stack
export const miniTowerPool = (t) => {
  const f = miniTowerFoot(t);
  return { x: f.x, y: f.y, r: MT.poolRadius / TILE_PX };
};

export function stepMiniTowers(w, input) {
  const list = w.level.miniTowers;
  if (!list || !list.length) return;
  const P = input.pressed || {};
  for (const t of list) {
    if (t.relit) continue;
    const f = miniTowerFoot(t);
    const d = Math.hypot(w.x - f.x, w.y - f.y);
    t.inRange = d < MT.useRange;
    if ((P.use || P.select) && t.inRange) relight(w, t);
  }
}

function relight(w, t) {
  t.relit = true;
  const f = miniTowerFoot(t);
  // checkpoint at the spawn anchor (to the right of the foot)
  w.level.spawn = { x: f.x + 36 / TILE_PX, y: f.y - TUNING.footEps };
  w.level.checkpoints = w.level.checkpoints || [];
  w.level.checkpoints.push({ x: w.level.spawn.x, y: w.level.spawn.y, mini: t.id });
  // warm pool: a lamp, so the 54 px hide rule counts it (ALL light exposes Wren)
  w.level.lamps.push({ x: f.x, y: f.y - 0.2, kind: 'warm', mini: t.id });
  t.reveal = { x: f.x * TILE_PX, y: f.y * TILE_PX, r: MT.revealRadius };
  w.events.push({ type: 'mini-relight', id: t.id, reveal: t.reveal });
}

/** Warm-light buff (STYLE-GUIDE v3.3: Rekindle + Glimmer Sight). Still a stub for Rekindle and for
 *  when the buff turns on (TODO(Superdooperman)). Glimmer Sight's yankable half is wired: while
 *  w.warmBuff is on, w.glimmer lists the set pieces to cue through walls (setpiece.js sightCues:
 *  480 px, occluded only, nearest 8); render.js draws them. Off: w.glimmer is null. */
export function warmLightBuff(w) {
  if (!w.warmBuff) { w.glimmer = null; return; }
  w.glimmer = sightCues(w.level, w.x, w.center ? w.center() : w.y - 0.5, w.doorsOpen);
}
