// M4 the run (BUILD-PLAN M4): one night = floors 1-3 (4 rooms each, the 4th a perch), the vault,
// then the hand-made escape. What she holds, feathers, catches, intel (motes), time, the rank, the
// Returned item she is taking back tonight, the Stash, and the next night's seed. Pure: no DOM.
import { HEALTH } from './config.js';
import { hashSeed } from './gen/rng.js';
import { parseTemplate } from './gen/template.js';
import { movesFor } from './gen/moves.js';
import { validateRoom } from './gen/validator.js';
import { smokeGain, stashable, byId } from './powerups.js';

/** The Returned shelf: what the Harbormaster took, one item back per cleared night.
 *  Items 3-5 are invented placeholders (copy review). */
export const RETURNED = Object.freeze([
  { id: 'music-box', name: "MRS. PELL'S MUSIC BOX", owner: 'MRS. PELL', line: 'IT PLAYS AGAIN. BLESS YOU, BATGUY.' },
  { id: 'ear-horn', name: "FARMER PECK'S EAR HORN", owner: 'FARMER PECK', line: 'FORECAST: GRATEFUL.' },
  { id: 'bell-clapper', name: "THE HARBOR BELL'S CLAPPER", owner: 'THE HARBOR', line: 'THE BELL RINGS AT DAWN AGAIN.' },
  { id: 'logbook', name: "THE FERRY CAPTAIN'S LOGBOOK", owner: 'CAPTAIN ODELL', line: 'EVERY CROSSING ACCOUNTED FOR.' },
  { id: 'kite', name: "LITTLE ADA'S KITE", owner: 'ADA', line: 'IT STILL FLIES! BLESS YOU, BATGUY.' },
]);

/** Tonight's item: the first not yet returned; once the shelf is full, one picked by the seed. */
export function targetFor(save, seed) {
  const left = RETURNED.filter((r) => !save.returned.includes(r.id));
  return left.length ? left[0] : RETURNED[hashSeed(seed, 'target') % RETURNED.length];
}

/** S: no catches and every mote; A: no catches; B: caught once; C: more. */
export function rankFor(catches, motes, totalMotes) {
  if (catches === 0) return totalMotes > 0 && motes >= totalMotes ? 'S' : 'A';
  return catches === 1 ? 'B' : 'C';
}

/** The next night's seed (AGAIN): deterministic from this one, 1..999999. */
export const nextSeed = (seed) => (hashSeed(seed, 'again') % 999999) + 1;

/** The escape: after the vault, down and out. Top-left to bottom-right, no watchers. */
export const ESCAPE_TEMPLATE = Object.freeze({
  id: 'x01', kind: 'escape', name: 'Escape', exitAnywhere: true,
  rows: [
    '..............................',
    '..............................',
    '.P............................',
    '#####.........................',
    '#####.....a...................',
    '..............................',
    '........######.......$........',
    '........######................',
    '.....................a........',
    '..............................',
    '...............========.......',
    '..............................',
    '..$.......................E...',
    '##############################',
    '##############################',
    '##############################',
  ],
});

let escapeCache = null;
/** The escape room definition, with a validator path like a generated room (gen.path). */
export function escapeRoom() {
  if (!escapeCache) {
    const pt = parseTemplate(ESCAPE_TEMPLATE);
    const rows = pt.src.map((r) => r.replace(/\$/g, 'm'));
    const def = { name: 'ESCAPE', rows, guards: [], searchlights: [], autoExit: true, prompts: [], checkpoints: [] };
    const v = validateRoom(def, movesFor(pt));
    if (!v.ok) throw new Error(`escape room does not validate: ${v.reason}`);
    def.gen = { kind: 'escape', template: pt.id, path: v.path, pathSlots: v.slots, entrySide: 'L', exitSide: 'R' };
    escapeCache = def;
  }
  return structuredClone(escapeCache);
}

/** Every room of the night in order: 12 floor rooms, the vault, the escape. */
export function nightRooms(tower) {
  return [...tower.floors.flatMap((f) => f.rooms), escapeRoom()];
}
const countMotes = (def) => def.rows.reduce((n, r) => n + (r.match(/m/g) || []).length, 0);

export function createRun(seed, save, tower) {
  const stash = save.stash && stashable(save.stash) ? save.stash : null;
  const rooms = nightRooms(tower);
  return {
    seed, stash, rooms, index: 0,
    held: stash ? [stash] : [],
    smokeLeft: stash ? smokeGain([], stash) : 0,
    feathers: HEALTH.startFeathers,
    catches: 0, alerts: 0, motes: 0, time: 0, snuffed: 0, ties: 0,
    totalMotes: rooms.reduce((n, r) => n + countMotes(r), 0),
    target: targetFor(save, seed),
    stolen: false, cleared: false, over: false,
  };
}

export const currentRoom = (run) => run.rooms[run.index];
export const isPerch = (def) => def?.gen?.kind === 'perch';
export const isVault = (def) => def?.gen?.kind === 'vault';
export const isEscape = (def) => def?.gen?.kind === 'escape';
/** Floor number for the HUD (vault = 4, escape = 4 too). */
export const floorOf = (def) => def?.gen?.floor ?? 4;

/** Fold a finished (or failed) room's world into the run. */
export function absorbWorld(run, w) {
  run.catches += w.catches;
  run.alerts += w.alerts;
  run.motes += w.motes.size;
  run.time += w.time;
  run.feathers = w.feathers;
  if (w.smoke !== undefined && run.held.includes('smoke')) run.smokeLeft = w.smoke;
  run.ties += w.ties || 0;
  run.snuffed += w.snuffed ? w.snuffed.size : 0;
}

/** Take a power-up at a perch. */
export function takePowerup(run, id) {
  if (!byId(id) || run.held.includes(id)) return false;
  run.smokeLeft += smokeGain(run.held, id);
  run.held.push(id);
  return true;
}

/** What the Stash can become after a cleared night: a held common or rare, or the current one. */
export function stashChoices(run) {
  const out = [];
  if (run.stash) out.push(run.stash);
  for (const id of run.held) if (stashable(id) && !out.includes(id)) out.push(id);
  return out;
}

/** Write the night into the save. cleared: the escape was finished. A failed night keeps the
 *  current Stash and the shelf as they were. */
export function finishNight(save, run, stashPick) {
  const out = structuredClone(save);
  out.nights += 1;
  if (!run.cleared) return out;
  out.clears += 1;
  const rank = rankFor(run.catches, run.motes, run.totalMotes);
  const k = String(run.seed);
  const order = ['S', 'A', 'B', 'C'];
  if (!out.bestRankBySeed[k] || order.indexOf(rank) < order.indexOf(out.bestRankBySeed[k])) out.bestRankBySeed[k] = rank;
  if (!out.returned.includes(run.target.id)) out.returned.push(run.target.id);
  const choices = stashChoices(run);
  if (stashPick !== undefined && (stashPick === null || choices.includes(stashPick))) out.stash = stashPick;
  out.revealSeen = true;
  return out;
}

/** "1:23" style time. */
export function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}
