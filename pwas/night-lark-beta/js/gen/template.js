// Room template format (BUILD-PLAN M3, BRIEF "Level generation").
//
// A template is a 30x16 ASCII room (ROOM_COLS x ROOM_ROWS; the 14 px HUD strip sits above it).
// Plain tiles use the level legend (level.js). Socket markers are filled by the generator:
//   P  entry (the Lark arrives standing here)      E  exit hatch (she leaves standing here)
//      Both sit on the top edge of the room (the top band, rows 1-4), per the BRIEF.
//   a  grapple ring, required (always placed)      o  grapple ring, optional (placed or not)
//   g  guard patrol socket: a run of g's on the row above a floor = a walk from the first to
//      the last g (the guard spawns somewhere on it)
//   l  light socket: a lamp, or empty (stays dark)  S  searchlight socket (a sweep from floor 2
//      on; the beam points down into the room)
//   $  loot socket (placeholder: a mote)
//   h  hide socket on stone: shadow stone 's' or plain '#'
//   v  hide socket on wood: shadow wood '~' or plain '='
// t.exitAnywhere (M4, the hand-made escape room only): the exit may be lower than the top band.
// Physics never depends on a socket: rings, lamps, loot and shadow are not solid, so one movement
// graph per template (and flip) serves every way its sockets are filled (see moves.js).
import { ROOM_COLS, ROOM_ROWS } from '../config.js';

export const SOCKET_CHARS = Object.freeze(['P', 'E', 'a', 'o', 'g', 'l', 'S', '$', 'h', 'v']);

/** Tiles as the physics sees them: sockets resolved to their solid/one-way base, rings kept. */
const PHYS = { h: '#', v: '=', s: '#', '~': '=', o: 'a', a: 'a', g: '.', l: '.', S: '.', $: '.', P: '.', E: '.', L: '.' };

export function flipRows(rows) {
  return rows.map((r) => r.split('').reverse().join(''));
}

/** Parse a template (optionally mirrored left-right) into its sockets. Throws on a bad template. */
export function parseTemplate(t, flip = false) {
  const rows = flip ? flipRows(t.rows) : t.rows.slice();
  const nR = rows.length;
  const nC = rows[0].length;
  if (nR !== ROOM_ROWS || nC !== ROOM_COLS) throw new Error(`${t.id}: template must be ${ROOM_COLS}x${ROOM_ROWS}, got ${nC}x${nR}`);
  for (const r of rows) if (r.length !== nC) throw new Error(`${t.id}: ragged row`);
  const out = { id: t.id, kind: t.kind, flip, cols: nC, rows: nR, src: rows, entry: null, exit: null,
    rings: [], lampSockets: [], searchSockets: [], lootSockets: [], hideSockets: [], guardSockets: [], lamps: [] };
  for (let r = 0; r < nR; r++) {
    let run = null;
    for (let c = 0; c <= nC; c++) {
      const ch = c < nC ? rows[r][c] : '';
      if (ch === 'g') { if (!run) run = { c0: c, c1: c, floor: r + 1 }; else run.c1 = c; continue; }
      if (run) { out.guardSockets.push(run); run = null; }
      if (c === nC) break;
      if (ch === 'P') { if (out.entry) throw new Error(`${t.id}: two entries`); out.entry = { c, r }; }
      else if (ch === 'E') { if (out.exit) throw new Error(`${t.id}: two exits`); out.exit = { c, r }; }
      else if (ch === 'a' || ch === 'o') out.rings.push({ c, r, required: ch === 'a', id: `${c}:${r}` });
      else if (ch === 'l') out.lampSockets.push({ c, r });
      else if (ch === 'L') out.lamps.push({ c, r });
      else if (ch === 'S') out.searchSockets.push({ c, r });
      else if (ch === '$') out.lootSockets.push({ c, r });
      else if (ch === 'h' || ch === 'v') out.hideSockets.push({ c, r, wood: ch === 'v' });
    }
  }
  if (!out.entry || !out.exit) throw new Error(`${t.id}: needs one P and one E`);
  if (out.entry.r > 4 || (out.exit.r > 4 && !t.exitAnywhere)) throw new Error(`${t.id}: entry and exit go on the top edge (rows 0-4)`);
  out.entrySide = out.entry.c < nC / 2 ? 'L' : 'R';
  out.exitSide = out.exit.c < nC / 2 ? 'L' : 'R';
  out.phys = rows.map((row) => row.split('').map((ch) => PHYS[ch] ?? ch).join(''));
  return out;
}
