// FIRST RING.
//   firstRingV1(): v1's room tile-for-tile (40x14), kept for the parity replay. Run it through
//     mapV1Rows() for v2 materials (all of it is thick ground, so it maps to stone unchanged).
//   firstRing(): the M1 tutorial, redrawn as a 30x16 room (BRIEF "How the first room teaches it"):
//     1) a gap with one ring: "B: GRAB THE RING"
//     2) the far side is a high stone ledge: "UP: REEL IN" (she can't jump it; reeling up the
//        wall ends in the automatic ledge climb)
//     3) a wider gap with a ring in the middle: "<> SWING / A: LEAP" (the swing alone falls
//        short of the far ledge; pump it and jump off near the top)
//     4) optional: a mote behind a lamp post, reached from a ring hidden off-axis (behind her
//        and high): "HOLD B: AIM". Never needed to clear the room.
//   Plus the materials: the landing is stone with a wooden awning over it; landing on the awning
//   shows "DOWN+A: DROP" (or walk off it: a 4-tile drop rolls).
import { blankRows, fillRect, putTile } from '../level.js';

export function firstRingV1() {
  const t = blankRows(40, 14);
  fillRect(t, 8, 13, 0, 7, 's');
  fillRect(t, 8, 13, 14, 39, '#');
  putTile(t, 2, 10, 'a');
  putTile(t, 2, 20, 'a');
  putTile(t, 7, 3, 'P');
  putTile(t, 7, 5, 'n');
  putTile(t, 7, 16, 'm');
  putTile(t, 7, 22, 'E');
  return {
    name: 'FIRST RING',
    rows: t,
    guards: [],
    notes: ['CLICK A RING\nW REELS IN\nS PAYS THE LINE\nRUN OFF AND SWING'],
  };
}

/** Tutorial geometry, exported so tests and the walkthrough bot share one source of truth. */
export const FR = Object.freeze({
  cols: 30, rows: 16,
  start: { c0: 0, c1: 6, top: 12 }, // stone
  gap1: { c0: 7, c1: 10 },
  high: { c0: 11, c1: 14, top: 9 }, // stone, 3 tiles above the start (a jump peaks at ~2.8)
  gap2: { c0: 15, c1: 24 },
  land: { c0: 25, c1: 29, top: 10 }, // stone
  awning: { c0: 26, c1: 29, row: 6 }, // wood (one-way)
  ring1: { c: 9, r: 6 },
  ring2: { c: 19, r: 5 },
  ring3: { c: 10, r: 2 }, // off-axis: behind her and high when she stands on the high ledge
  mote: { c: 6, r: 6 },
  lamp: { c: 7, r: 4 },
  spawn: { c: 2, r: 11 },
  exit: { c: 28, r: 9 },
});

export function firstRing() {
  const g = FR;
  const t = blankRows(g.cols, g.rows);
  fillRect(t, g.start.top, g.rows - 1, g.start.c0, g.start.c1, '#');
  fillRect(t, g.high.top, g.rows - 1, g.high.c0, g.high.c1, '#');
  fillRect(t, g.land.top, g.rows - 1, g.land.c0, g.land.c1, '#');
  fillRect(t, g.awning.row, g.awning.row, g.awning.c0, g.awning.c1, '=');
  for (const k of ['ring1', 'ring2', 'ring3']) putTile(t, g[k].r, g[k].c, 'a');
  putTile(t, g.mote.r, g.mote.c, 'm');
  putTile(t, g.lamp.r, g.lamp.c, 'L');
  putTile(t, g.spawn.r, g.spawn.c, 'P');
  putTile(t, g.exit.r, g.exit.c, 'E');
  const B = '{B}';
  const A = '{A}';
  return {
    name: 'FIRST RING',
    rows: t,
    guards: [],
    autoExit: true,
    // Prompt areas are in tiles (c0..c1 columns, r0..r1 rows of the feet). doneOn = the sim
    // event that completes it. There is deliberately no prompt for letting go with B.
    prompts: [
      { id: 'grab', text: `${B}: GRAB THE RING`, c0: 3, c1: 6, r0: 9, r1: 12, doneOn: 'attach', sticky: true },
      { id: 'reel', text: 'UP: REEL IN', c0: 7, c1: 10, r0: 6, r1: 16, doneOn: 'climb', sticky: true },
      { id: 'swing', text: `<> SWING / ${A}: LEAP`, c0: 15, c1: 24, r0: 0, r1: 16, doneOn: 'jumpoff', sticky: true },
      { id: 'aim', text: `HOLD ${B}: AIM`, c0: 11, c1: 12, r0: 6, r1: 9, doneOn: 'aimfire' },
      { id: 'drop', text: `DOWN+${A}: DROP`, c0: 26, c1: 29, r0: 4, r1: 6, doneOn: 'drop' },
    ],
    // Fall into a pit and you come back at the last ledge you stood on, not the room start.
    checkpoints: [
      { c0: 0, c1: 6, x: 2.5, top: g.start.top },
      { c0: 11, c1: 14, x: 12.5, top: g.high.top },
      { c0: 25, c1: 29, x: 26.5, top: g.land.top },
    ],
  };
}
