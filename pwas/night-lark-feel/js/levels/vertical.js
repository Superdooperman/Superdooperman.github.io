// THE HARBOR SHAFT (feel pass 1, Notion G; follow-up Nov 7 2026): ONE continuous vertical room,
// one world and one camera, that opens every generated night (run.js createRun puts it first).
// It replaces the old room-to-room ?room=climb prototype; ?room=climb now plays this same room.
//
// Composition, not a new generator: the three climb stretches are the existing Harbormaster kit
// tower (js/kit/route.js towerRoute + its dressing pass, through levels/tall-shaft.js
// buildKitTower) at VERTICAL.towerRows block rows each, seeds 1-3 attempt 0, stacked bottom to
// top on one grid, with the empty perch break on the roof above them.
//   - Seams: a stretch's stone floor becomes a one-way wooden landing across the shaft (the
//     kit's '=' wood: she jumps or swings up through it and stands on it; it is a checkpoint).
//     Its edge points are grapple points seen from below (wood never blocks the line). The
//     lower stretch's exit marker and the upper stretch's spawn marker are removed, so there is
//     one spawn (the shaft floor) and one exit (on the perch roof).
//   - A fall costs height the way the tall rooms always meant: a miss drops her to the landing
//     or ledge below, never resets her (the freefall lane in each stretch is open down to the
//     landing under it).
//   - The facade blocks of every stretch sit on the 6-tile block grid (the perch is 2 block
//     rows), so the masonry courses line up across the seams.
//   - Proof: the generator's own validator (gen/validator.js) finishes the whole room, spawn to
//     exit, in feel fix2 and with no warp-pull (the probes are pinned to swing, audit F2). The
//     room is ~6 of today's screens of climbing, so the search horizon is raised for this one
//     room (SHAFT.slots, an argument the validator already takes); nothing else is relaxed.
//     test/feel-pass-shaft.test.mjs runs it.
//   - First ascent (fresh save, no pull): the first mini boss waits on the perch roof. Landing
//     there starts his approach; the grab is proximity-gated (js/shaft-intro.js INTRO.contactRange)
//     and the throw starts from their staged contact. Saves that have the pull never see him again.
import { buildKitTower } from './tall-shaft.js';
import { facadeColumn, dressFacade, TOWER } from '../kit/facade.js';
import { createRng } from '../gen/rng.js';

export const VERTICAL = Object.freeze({
  towerRows: 11, // block rows of 6 tiles per stretch: 66 tiles, about 4 of today's 16-row screens
  // seed -> attempt per stretch, bottom first (the validator re-checks the whole room in the tests)
  climbs: Object.freeze([{ seed: 1, attempt: 0 }, { seed: 2, attempt: 0 }, { seed: 3, attempt: 0 }]),
  feel: 'fix2',
  offRoom: Object.freeze({ above: 'air', below: 'air' }), // today's physics; render follows it
});

export const SHAFT = Object.freeze({
  name: 'THE HARBOR SHAFT',
  perchBlocks: 2, // the perch break on the roof: 2 block rows (12 tiles)
  roofRow: 11, // the perch roof deck (wood, one-way) inside the perch band
  exitC: 25, // the exit hatch on the roof, the far side from where the climb tops out
  boss: Object.freeze({ c: 15, dir: -1 }), // the first mini boss's spot on the roof (placeholder art)
  slots: 900, // validator horizon for this room (90 s); the default 300 (30 s) is per normal room
});

const findTile = (rows, ch) => {
  for (let r = 0; r < rows.length; r++) { const c = rows[r].indexOf(ch); if (c >= 0) return { c, r }; }
  return null;
};
const setCh = (rows, c, r, ch) => { rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1); };

/** Climb stretch i (0 bottom, 1, 2 top) built on its own, as the kit tower makes it. */
export function climbRoom(i) {
  const { seed, attempt } = VERTICAL.climbs[i];
  const def = buildKitTower(seed, attempt, { feel: VERTICAL.feel, towerRows: VERTICAL.towerRows, name: `CLIMB ${i + 1}/3` });
  return officialFields({ ...def, section: 'vertical', index: i, offRoom: { ...VERTICAL.offRoom }, flow: 'up' });
}

let shaftCache = null;
/** The whole shaft as one room definition (deterministic; built once per process). */
export function shaftRoom() {
  if (!shaftCache) shaftCache = buildShaft();
  return structuredClone(shaftCache);
}

function buildShaft() {
  const stretches = [0, 1, 2].map((i) => climbRoom(i));
  const cols = stretches[0].dims.cols;
  const H = stretches[0].dims.rows;
  const perchH = SHAFT.perchBlocks * TOWER.blockH;
  const total = perchH + H * stretches.length;
  const offOf = (i) => perchH + (stretches.length - 1 - i) * H; // stretch i's first global row
  const rows = Array.from({ length: total }, () => '.'.repeat(cols));
  const props = []; const pieces = []; const facade = []; const guards = []; const checkpoints = []; const steps = []; const landings = [];
  stretches.forEach((s, i) => {
    const off = offOf(i);
    const local = s.rows.slice();
    if (i > 0) { // the seam: this stretch's stone floor becomes a one-way wooden landing
      const ft = H - 3;
      for (let r = ft; r < H; r++) local[r] = r === ft ? '='.repeat(cols) : '.'.repeat(cols);
      setCh(local, s.spawn.c, s.spawn.r, '.');
      landings.push({ row: off + ft, stretch: i });
    }
    setCh(local, s.exit.c, s.exit.r, '.'); // one exit for the whole shaft: on the roof
    local.forEach((line, r) => { rows[off + r] = line; });
    for (const p of s.props) props.push({ ...p, r: p.r + off, piece: p.piece ? `t${i}-${p.piece}` : p.piece });
    for (const q of s.pieces) if (!(i > 0 && q.id === 'floor')) pieces.push({ ...q, id: `t${i}-${q.id}`, r: q.r + off });
    for (const b of s.facade) facade.push({ ...b, br: b.br + off / TOWER.blockH, r: b.r + off });
    for (const g of s.guards) guards.push({ ...g, floor: g.floor + off });
    for (const k of s.checkpoints) checkpoints.push({ ...k, top: k.top + off });
    for (const st of s.steps) steps.push({ ...st, stretch: i, top: st.top + off });
  });
  // the seam landings are checkpoints too (the old floors were)
  for (const l of landings) checkpoints.push({ c0: 0, c1: cols - 1, x: stretches[l.stretch].spawn.c + 0.5, top: l.row });
  // the perch break on the roof: a one-way deck, the exit hatch, a little decoration, no watchers
  const roof = SHAFT.roofRow;
  rows[roof] = '='.repeat(cols);
  setCh(rows, SHAFT.exitC, roof - 1, 'E');
  props.push({ type: 'statue', c: 6, r: roof - 2, flip: false, piece: 'perch-statue', deco: true });
  props.push({ type: 'pots-crates', c: 20, r: roof - 1, flip: false, piece: 'perch-deco-1', deco: true });
  const pf = dressFacade(facadeColumn(createRng(11), { rows: SHAFT.perchBlocks }), 11);
  facade.unshift(...pf);
  checkpoints.push({ c0: 0, c1: cols - 1, x: SHAFT.exitC - 6 + 0.5, top: roof });
  const def = {
    name: SHAFT.name,
    anchors: 'arch',
    rows,
    props,
    facade,
    pieces,
    steps,
    tall: true,
    feel: VERTICAL.feel,
    fallCost: 'height',
    autoExit: true,
    section: 'vertical',
    flow: 'up',
    offRoom: { ...VERTICAL.offRoom },
    guards,
    searchlights: [],
    prompts: [{ text: '{P}: WARP-PULL TO A GRIP', showOn: 'pull-earned', doneOn: 'pull-start', sticky: true }],
    checkpoints,
    // the seams and the perch, for the tests and the intro: global rows
    seams: landings.map((l) => l.row),
    stretchRows: stretches.map((_, i) => [offOf(i), offOf(i) + H - 1]),
    roofRow: roof,
    // the first mini boss (js/shaft-intro.js): only on a save without the warp-pull
    miniBoss: { c: SHAFT.boss.c, dir: SHAFT.boss.dir, floor: roof },
    gen: { kind: 'shaft', floor: 1, seeds: VERTICAL.climbs.map((c) => ({ ...c })) },
  };
  return officialFields(def);
}

/** dims / spawn / exit read off the built rows, so they can never disagree with the grid. */
function officialFields(def) {
  return { ...def, dims: { cols: def.rows[0].length, rows: def.rows.length }, spawn: findTile(def.rows, 'P'), exit: findTile(def.rows, 'E') };
}

/** ?room=climb: the campaign's shaft on its own (the dev shortcut; one room, so no wrap). */
export const verticalSection = () => [shaftRoom];
