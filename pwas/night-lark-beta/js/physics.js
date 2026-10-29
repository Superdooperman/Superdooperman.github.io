// Body vs tile collision (ported from v1 Ie / et) plus the v2 push-out fix.
// The body is an AABB: x is the centre, y is the feet, h the height, all in tiles.
import { TUNING } from './config.js';
import { tileAt, isBlockingTile, isSolidTile, isStandable, isWood, isStone } from './level.js';

/** v1 Ie(): does the body overlap a blocking tile (stone, 'b' or a closed door)?
 *  Also: with the doors shut, poking above the room over a door column is blocked.
 *  Wood ('=', '~') never blocks: it is one-way and only catches the feet (findLanding). */
export function bodyBlocked(level, x, y, h, doorsOpen) {
  const { halfWidth: hw, eps } = TUNING;
  const left = x - hw;
  const right = x + hw - eps;
  const top = y - h;
  const bottom = y - eps;
  if (top < 0 && !doorsOpen) {
    for (let c = Math.floor(left); c <= Math.floor(right); c++) if (tileAt(level, c, 0) === 'D') return true;
  }
  for (let r = Math.floor(top); r <= Math.floor(bottom); r++)
    for (let c = Math.floor(left); c <= Math.floor(right); c++)
      if (isBlockingTile(tileAt(level, c, r), doorsOpen) && !onLip(level, c, r, bottom, doorsOpen)) return true;
  return false;
}

/** The top 1 v1 px of an open-topped stone tile is a "lip": feet that dip into it are not
 *  blocked (v1 landed you on any top your feet were within 1 px of, findLanding snaps her up).
 *  Without this, v1's step-up-a-pixel landings at a ledge corner would be blocked. */
export const LIP = 1 / 16;
function onLip(level, c, r, bottom, doorsOpen) {
  return bottom < r + LIP && bottom >= r && isStone(tileAt(level, c, r)) && isStandable(level, c, r, doorsOpen);
}

/** Tiles (col,row) of any solid tile (stone '#'/'s', 'b', closed 'D') the body overlaps. Not wood. */
export function solidOverlaps(level, x, y, h, doorsOpen) {
  const { halfWidth: hw, eps } = TUNING;
  const out = [];
  for (let r = Math.floor(y - h); r <= Math.floor(y - eps); r++)
    for (let c = Math.floor(x - hw); c <= Math.floor(x + hw - eps); c++)
      if (r >= 0 && r < level.rows && isSolidTile(tileAt(level, c, r), doorsOpen) && !onLip(level, c, r, y - eps, doorsOpen)) out.push([c, r]);
  return out;
}

/** v2 fix for v1's "player inside platform" bug: move the body out of solid tiles by the
 *  smallest of up / left / right / down. Returns { x, y, axis } or null if already clear. */
export function pushOut(level, x, y, h, doorsOpen) {
  if (!solidOverlaps(level, x, y, h, doorsOpen).length) return null;
  const { halfWidth: hw, eps, footEps } = TUNING;
  const tries = {
    up: (cx, cy, hits) => [cx, Math.min(...hits.map(([, r]) => r)) - footEps],
    down: (cx, cy, hits) => [cx, Math.max(...hits.map(([, r]) => r)) + 1 + h + footEps],
    left: (cx, cy, hits) => [Math.min(...hits.map(([c]) => c)) - hw - eps, cy],
    right: (cx, cy, hits) => [Math.max(...hits.map(([c]) => c)) + 1 + hw + eps, cy],
  };
  let best = null;
  for (const [axis, move] of Object.entries(tries)) {
    let cx = x;
    let cy = y;
    for (let i = 0; i < 6; i++) {
      const hits = solidOverlaps(level, cx, cy, h, doorsOpen);
      if (!hits.length) {
        const d = Math.hypot(cx - x, cy - y);
        if (!best || d < best.d - 1e-12) best = { x: cx, y: cy, axis, d };
        break;
      }
      [cx, cy] = move(cx, cy, hits);
    }
  }
  return best ? { x: best.x, y: best.y, axis: best.axis } : null;
}

/** v1 et(): land on the highest standable top the feet crossed since prevY.
 *  Stone keeps v1's rule (feet were no more than 1 v1 px below the top last step).
 *  Wood is one-way: only if the feet were AT OR ABOVE the top on the previous step, so coming
 *  up from below or in from the side passes through. `skipRow` is a wooden row she is
 *  dropping through (DOWN + A). Returns the top row's y, or null. Pure. */
export function findLanding(level, x, y, prevY, doorsOpen, skipRow = null) {
  const { halfWidth: hw, eps } = TUNING;
  const c0 = Math.floor(x - hw);
  const c1 = Math.floor(x + hw - eps);
  let top = null;
  for (let c = c0; c <= c1; c++)
    for (let r = 0; r < level.rows; r++) {
      if (!isStandable(level, c, r, doorsOpen)) continue;
      const wood = isWood(tileAt(level, c, r));
      if (wood && r === skipRow) continue;
      const fromAbove = wood ? prevY <= r + WOOD_PREV_EPS : prevY <= r + 1 / 16;
      if (fromAbove && y >= r - eps && y < r + 1 && (top === null || r < top)) top = r;
    }
  return top;
}

/** Floating-point slack for "at or above the top" on wood (1e-9 tile, far below a pixel). */
export const WOOD_PREV_EPS = 1e-9;

/** Columns under the feet: is she standing only on wood (so DOWN + A can drop through)?
 *  Returns the wooden row, or null if any stone/blocking tile is under her feet. */
export function woodUnderFeet(level, x, y, doorsOpen) {
  const { halfWidth: hw, eps } = TUNING;
  const r = Math.floor(y + TUNING.footEps * 2);
  let wood = false;
  for (let c = Math.floor(x - hw); c <= Math.floor(x + hw - eps); c++) {
    const ch = tileAt(level, c, r);
    if (isBlockingTile(ch, doorsOpen)) return null;
    if (isWood(ch) && isStandable(level, c, r, doorsOpen)) wood = true;
  }
  return wood ? r : null;
}

/** Auto ledge climb probe (minimal parkour, no buttons). In the air, a standable top (stone or
 *  wood) just in front of her, with her feet below it by at most climbReach, and room to stand
 *  on it. Returns { row, x, y } (where she ends up standing) or null. */
export function findLedge(level, x, y, face, doorsOpen, skipRow = null) {
  const { halfWidth: hw, climbReach, climbProbe, footEps, standHeight, eps } = TUNING;
  const edge = face > 0 ? x + hw - eps : x - hw;
  const probe = edge + face * climbProbe;
  const cols = new Set([Math.floor(edge), Math.floor(probe)]);
  let best = null;
  for (const c of cols) {
    if (c < 0 || c >= level.cols) continue; // the room's side walls are not ledges
    for (let r = Math.max(0, Math.floor(y - climbReach)); r <= Math.floor(y); r++) {
      if (r === skipRow) continue;
      if (!(y > r + climbMinBelow && y - r <= climbReach)) continue;
      if (!isStandable(level, c, r, doorsOpen)) continue;
      // stand fully on the ledge: past its near edge by the body half-width
      const nx = face > 0 ? Math.max(x, c + hw + eps * 2) : Math.min(x, c + 1 - hw - eps * 2);
      const ny = r - footEps;
      if (bodyBlocked(level, nx, ny, standHeight, doorsOpen)) continue;
      if (solidOverlaps(level, nx, ny, standHeight, doorsOpen).length) continue;
      // the climb path (straight up at her x, then over) must not go through stone
      if (bodyBlocked(level, x, y, y - ny + standHeight, doorsOpen)) continue;
      if (!best || r < best.row) best = { row: r, x: nx, y: ny };
    }
  }
  return best;
}
const climbMinBelow = 1 / 16; // feet must be at least 1 v1 px below the top (else it is a landing)
