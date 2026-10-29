// Level grid: parsing and tile queries (v1 semantics, in tile units).
//
// Ledge materials (Arlong, Oct 28, 2026):
//   STONE (thick masonry) '#' lit, 's' in shadow (a hide spot): fully solid. The body is blocked
//     on every side and pushed back out the same frame if it ever overlaps. Blocks sight and the line.
//   WOOD (thin beams, rafters, awnings) '=' lit, '~' in shadow: ONE-WAY. She lands on it only when
//     falling onto it from above; from below or the side she passes through; DOWN + A drops her
//     through. Wood never blocks sight or the line.
// Other tiles: 'b' blue hiding stone (full block), 'D' door (full block until the key), 'L' lamp,
//   'a' ring, 'P' spawn, 'n' note, 'k' key, 'm' mote, '*' spark, 'E' exit, '.' empty.
import { TUNING } from './config.js';

export const STONE_TILES = Object.freeze(['#', 's']);
export const WOOD_TILES = Object.freeze(['=', '~']);
export const SHADOW_TILES = Object.freeze(['s', '~']);

export const isStone = (ch) => ch === '#' || ch === 's';
export const isWood = (ch) => ch === '=' || ch === '~';
export const isShadow = (ch) => ch === 's' || ch === '~';
export const isGround = (ch) => isStone(ch) || isWood(ch);

export function blankRows(cols, rows) {
  return Array.from({ length: rows }, () => '.'.repeat(cols));
}
export function fillRect(rows, r0, r1, c0, c1, ch) {
  for (let r = r0; r <= r1; r++) {
    const a = rows[r].split('');
    for (let c = c0; c <= c1; c++) a[c] = ch;
    rows[r] = a.join('');
  }
}
export function putTile(rows, r, c, ch) {
  const a = rows[r].split('');
  a[c] = ch;
  rows[r] = a.join('');
}

/** Map a v1 level's ground to v2 materials. v1 had one ground type ('#', or 's' in shadow)
 *  whose sides and bottom you could pass through. Rule: a ground tile that is part of a vertical
 *  run 2+ tiles thick is masonry (stone); a run exactly 1 tile thick (a floating ledge with air
 *  under it) is a wooden beam (one-way), so v1's jump-through ledges keep their feel.
 *  Shadow is kept: 's' -> stone in shadow or '~' wood in shadow. */
export function mapV1Rows(rows) {
  const grid = rows.map((r) => r.split(''));
  const nR = grid.length;
  const ground = (r, c) => r >= 0 && r < nR && (grid[r][c] === '#' || grid[r][c] === 's');
  const out = rows.map((r) => r.split(''));
  for (let c = 0; c < grid[0].length; c++) {
    for (let r = 0; r < nR; r++) {
      if (!ground(r, c)) continue;
      let r1 = r;
      while (ground(r1 + 1, c)) r1++;
      if (r1 === r) out[r][c] = grid[r][c] === 's' ? '~' : '=';
      r = r1;
    }
  }
  return out.map((a) => a.join(''));
}

const ITEM_TILES = new Set(['n', 'k', 'm', '*', 'E']);

/** Build a runtime level from a definition { name, rows, guards, notes, prompts, autoExit }. */
export function parseLevel(def) {
  const rows = def.rows.slice();
  const nRows = rows.length;
  const nCols = rows[0].length;
  for (const r of rows) if (r.length !== nCols) throw new Error(`${def.name}: ragged row`);
  const rings = [];
  const lamps = [];
  const items = [];
  let spawn = { x: 3.5, y: 8 - TUNING.footEps };
  let noteIdx = 0;
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const ch = rows[r][c];
      const x = c + 0.5;
      const y = r + 0.5;
      if (ch === 'a') rings.push({ x, y, id: `${c}:${r}` });
      else if (ch === 'L') lamps.push({ x, y });
      else if (ch === 'P') spawn = { x, y: r + 1 - TUNING.footEps };
      else if (ITEM_TILES.has(ch)) {
        items.push({ t: ch, x, y, id: `${def.name}:${ch}:${c}:${r}`,
          text: ch === 'n' ? (def.notes || [])[noteIdx++] : undefined });
      }
    }
  }
  const guards = (def.guards || []).map((g) => ({
    kind: 'guard', x: g.c + 0.5, dir: g.dir, c0: g.c0, c1: g.c1, speed: g.speed, floorY: g.floor, sees: false,
    state: 'patrol', t: 0, flipT: 0, searchX: null,
  }));
  // M2: searchlights sweep base ± amp (radians, 0 = right, +PI/2 = down) every period seconds.
  const searchlights = (def.searchlights || []).map((s) => ({
    kind: 'searchlight', x: s.c + 0.5, y: s.r + 0.5, base: s.base, amp: s.amp,
    period: s.period ?? TUNING.searchlightPeriod, phase: s.phase ?? 0,
    range: s.range ?? TUNING.searchlightRange, half: s.half ?? TUNING.searchlightHalf,
    angle: s.base, sweepT: 0, sees: false, state: 'sweep', t: 0, aim: null,
  }));
  return { name: def.name, cols: nCols, rows: nRows, grid: rows, rings, lamps, items, spawn, guards, searchlights,
    prompts: (def.prompts || []).map((p) => ({ ...p, shown: false, done: false })), autoExit: !!def.autoExit,
    checkpoints: (def.checkpoints || []).map((k) => ({ ...k })) };
}

/** v1 Me(): above/below the room is open air, left/right of it is solid stone. */
export function tileAt(level, c, r) {
  if (r < 0 || r >= level.rows) return '.';
  if (c < 0 || c >= level.cols) return '#';
  return level.grid[r][c] ?? '.';
}

/** Tiles that fully block the body: stone, blue stone and closed doors. (v1 yt blocked only
 *  'b' and doors; v1 ground was passable from the side and below, see mapV1Rows.) */
export function isBlockingTile(ch, doorsOpen) {
  return isStone(ch) || ch === 'b' || (ch === 'D' && !doorsOpen);
}
/** Tiles that block sight and the line (v1 Ye). Wood is thin and does not. */
export function isOpaqueTile(ch, doorsOpen) {
  return isStone(ch) || ch === 'b' || (ch === 'D' && !doorsOpen);
}
/** Every tile the body must never end up inside (used by push-out). Wood is allowed. */
export const isSolidTile = isBlockingTile;

/** v1 qe(): a ground tile whose top is open (you can stand on it). */
export function isStandable(level, c, r, doorsOpen) {
  const ch = tileAt(level, c, r);
  if (!isGround(ch)) return false;
  if (r === 0) return true;
  const up = tileAt(level, c, r - 1);
  if (isWood(ch) && isWood(up)) return false; // only the top plank of a wooden stack
  return !isBlockingTile(up, doorsOpen);
}
