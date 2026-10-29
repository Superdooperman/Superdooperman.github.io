// WATCH ROOM: the M2 stealth test room (30x16). Not a generated room (that is M3); it puts every
// M2 piece on one screen so the feel can be judged and Walkthrough 3 has a fixed place to run:
//   - a watchman patrolling the middle floor (cone, turns at the ends, hears footsteps),
//   - a lamp over his path (lamplight gives you away from farther off; no hiding near it),
//   - a shadow alcove ('s' floor under a stone lip) just left of his path: crouch there to hide,
//   - a wooden walkway over him (wood does not block his sight; stone would), loot on top,
//   - a searchlight sweeping the right end, with a second shadow patch to wait in,
//   - the exit hatch on the far right.
// Prompts teach each thing the first time it shows up (BRIEF "Teach in play").
import { blankRows, fillRect, putTile } from '../level.js';

export const WR = Object.freeze({
  cols: 30, rows: 16,
  floor: { top: 12 },
  alcove: { c0: 10, c1: 12, lip: 9 }, // shadow floor, stone lip above
  guard: { c: 18, dir: -1, c0: 13, c1: 22, speed: 30 },
  lamp: { c: 17, r: 9 },
  walkway: { c0: 15, c1: 20, row: 8 }, // wood
  rings: [{ c: 13, r: 4 }, { c: 22, r: 4 }],
  mote: { c: 18, r: 7 },
  searchlight: { c: 27, r: 1, base: Math.PI / 2 + 0.32, amp: 0.3, period: 5 },
  shelter: { c0: 24, c1: 25 }, // shadow floor under the sweep
  spawn: { c: 2, r: 11 },
  exit: { c: 28, r: 11 },
});

export function watchRoom() {
  const g = WR;
  const t = blankRows(g.cols, g.rows);
  fillRect(t, g.floor.top, g.rows - 1, 0, g.cols - 1, '#');
  fillRect(t, g.floor.top, g.floor.top, g.alcove.c0, g.alcove.c1, 's');
  fillRect(t, g.alcove.lip, g.alcove.lip, g.alcove.c0, g.alcove.c1, '#');
  fillRect(t, g.floor.top, g.floor.top, g.shelter.c0, g.shelter.c1, 's');
  fillRect(t, g.walkway.row, g.walkway.row, g.walkway.c0, g.walkway.c1, '=');
  for (const r of g.rings) putTile(t, r.r, r.c, 'a');
  putTile(t, g.mote.r, g.mote.c, 'm');
  putTile(t, g.lamp.r, g.lamp.c, 'L');
  putTile(t, g.spawn.r, g.spawn.c, 'P');
  putTile(t, g.exit.r, g.exit.c, 'E');
  const { c, dir, c0, c1, speed } = g.guard;
  return {
    name: 'WATCH ROOM',
    rows: t,
    guards: [{ c, dir, c0, c1, speed, floor: g.floor.top }],
    searchlights: [{ ...g.searchlight }],
    autoExit: true,
    prompts: [
      // shown by an event, kept until done: the first time a meter starts filling
      { id: 'meter', text: 'SEEN: BREAK SIGHT BEFORE THE !', showOn: 'noticed', doneOn: ['escape', 'caught', 'unseen'], sticky: true },
      { id: 'cone', text: 'WATCHMEN SEE IN A CONE', c0: 4, c1: 8, r0: 9, r1: 12, doneOn: 'leave' },
      { id: 'hide', text: 'DOWN IN SHADOW: HIDE', c0: g.alcove.c0, c1: g.alcove.c1, r0: 10, r1: 12, doneOn: 'hide', sticky: false },
      { id: 'lamp', text: 'LAMPLIGHT GIVES YOU AWAY', c0: 14, c1: 20, r0: 0, r1: 12, doneOn: 'leave' },
      { id: 'searchlight', text: 'SEARCHLIGHT: WAIT FOR THE GAP', c0: 22, c1: 26, r0: 0, r1: 12, doneOn: 'leave' },
    ],
    checkpoints: [],
  };
}
