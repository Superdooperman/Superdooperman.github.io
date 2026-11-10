// WIDE SHAFT (big rooms prototype, Superdooperman, Nov 9 2026): one shaft two screens wide and four tall
// (60 x 64 tiles), one world and one camera. ?room=wideshaft plays it on its own (js/main.js).
//
// The continuous-shaft method of levels/vertical.js (THE HARBOR SHAFT), widened, not a new
// generator: each climb stretch is levels/wide-kit.js wideStretch (two kit towers side by side,
// an open 4-col join, two freefall lanes 6 wide), packed with extra kit pieces (packWide), and
// the stretches are stacked bottom to top on one grid:
//   - Seams: the upper stretch's stone floor becomes a one-way wooden landing ('=') across the
//     whole width (she jumps or swings up through it and stands on it; it is a checkpoint). The
//     lower stretch's exit and the upper stretch's spawn are removed: one spawn (the shaft floor)
//     and one exit (the top stretch's last step).
//   - A miss drops her to the landing or ledge below, never resets her (fallCost 'height'); each
//     freefall lane is open from the top down to the landing under it.
//   - A 4-row sky band on top (64 = 4 + 2 x 30) gives the top climb headroom; the facade sits on
//     the 6-tile block grid of the stretches (the band shows the bottom of one more block row).
// Proof: gen/validator.js finishes it spawn to exit (feel fix2, no warp-pull) at WSHAFT.slots,
// the way vertical.js raises SHAFT.slots for its tall room (test/big-rooms.test.mjs).
import { wideStretch, packWide, setCh, findTile, WIDE } from './wide-kit.js';
import { TOWER } from '../kit/facade.js';

export const WSHAFT = Object.freeze({
  name: 'THE WIDE SHAFT',
  cols: 60, rows: 64,
  towerRows: 5, // block rows per half per stretch: 30 tiles
  band: 4, // sky rows on top
  // bottom first: each stretch's two halves (kit seeds), and its pack seed
  stretches: Object.freeze([
    Object.freeze({ halves: [{ seed: 3, attempt: 0 }, { seed: 4, attempt: 0 }], pack: 21 }),
    Object.freeze({ halves: [{ seed: 5, attempt: 0 }, { seed: 6, attempt: 0 }], pack: 22 }),
  ]),
  pack: 9, grips: 8,
  feel: 'fix2',
  offRoom: Object.freeze({ above: 'air', below: 'air' }),
  slots: 900, // validator horizon (90 s), as SHAFT.slots; the default 300 is per normal room
});

let cache = null;
/** The whole wide shaft (deterministic; built once per process). */
export function wideShaftRoom() {
  if (!cache) cache = build();
  return structuredClone(cache);
}

function build() {
  const n = WSHAFT.stretches.length;
  const parts = WSHAFT.stretches.map((st, i) => {
    const s = wideStretch(st.halves, { towerRows: WSHAFT.towerRows, feel: WSHAFT.feel, spawn: i === 0 ? 'L' : null, exit: i === n - 1 ? 'R' : null, tag: `s${i}` });
    if (i > 0) { // the seam: this stretch's stone floor becomes a one-way wooden landing
      for (let r = s.floorTop; r < s.H; r++) s.rows[r] = (r === s.floorTop ? '=' : '.').repeat(WIDE.cols);
      s.pieces = s.pieces.filter((q) => !/(^|-)floor$/.test(q.id));
    }
    s.pack = packWide(s, st.pack, { n: WSHAFT.pack, grips: WSHAFT.grips });
    return s;
  });
  const H = parts[0].H;
  const offOf = (i) => WSHAFT.band + (n - 1 - i) * H; // stretch i's first global row
  const rows = Array.from({ length: WSHAFT.band }, () => '.'.repeat(WIDE.cols));
  const props = []; const pieces = []; const facade = []; const guards = []; const checkpoints = []; const steps = []; const seams = [];
  for (let i = n - 1; i >= 0; i--) {
    const s = parts[i]; const off = offOf(i);
    rows.push(...s.rows);
    for (const p of s.props) props.push({ ...p, r: p.r + off });
    for (const q of s.pieces) pieces.push({ ...q, r: q.r + off });
    for (const b of s.facade) facade.push({ ...b, br: b.br + (n - 1 - i) * WSHAFT.towerRows + 1, r: b.r + off });
    for (const g of s.guards) guards.push({ ...g, floor: g.floor + off });
    for (const st of s.steps) steps.push({ ...st, stretch: i, top: st.top + off });
    s.checkpoints.forEach((k, j) => { if (i === 0 || j > 0) checkpoints.push({ ...k, top: k.top + off }); });
    if (i > 0) { seams.push(off + s.floorTop); checkpoints.push({ c0: 0, c1: WIDE.cols - 1, x: 30.5, top: off + s.floorTop }); }
  }
  // the sky band: the lower part of one more block row (on the stretches' 6-tile grid)
  for (let bc = 0; bc < WIDE.cols / TOWER.blockW; bc++) {
    const edge = bc === 0 || bc === WIDE.cols / TOWER.blockW - 1;
    facade.unshift({ type: edge ? 'corner' : bc % 5 === 2 ? 'window-narrow' : 'plain-wall', ...(edge || bc % 5 === 2 ? {} : { art: 'plain-wall-v2' }), bc, br: 0, c: bc * TOWER.blockW, r: WSHAFT.band - TOWER.blockH, w: TOWER.blockW, h: TOWER.blockH });
  }
  // a pennant on the top: art only
  props.push({ type: 'flagpole-tall', c: 1, r: 0, flip: false, piece: 'band-flag', deco: true });
  const def = {
    name: WSHAFT.name,
    anchors: 'arch',
    rows,
    props,
    facade,
    pieces,
    steps,
    tall: true,
    feel: WSHAFT.feel,
    fallCost: 'height',
    autoExit: true,
    section: 'vertical',
    flow: 'up',
    offRoom: { ...WSHAFT.offRoom },
    big: 'wideshaft',
    guards,
    searchlights: [],
    prompts: [],
    checkpoints,
    seams,
    stretchRows: parts.map((_, i) => [offOf(i), offOf(i) + H - 1]),
    pack: parts.map((p) => p.pack),
    gen: { kind: 'big', floor: 1, stretches: WSHAFT.stretches.map((s) => ({ halves: s.halves.map((h) => ({ ...h })), pack: s.pack })) },
  };
  return { ...def, dims: { cols: rows[0].length, rows: rows.length }, spawn: findTile(rows, 'P'), exit: findTile(rows, 'E') };
}
