// The room generator (BUILD-PLAN M3; BRIEF "Level generation").
//
// generateRoom(seed, floor, index, opts) -> a level definition the sim can run, or throws.
// generateTower(seed) -> 3 floors x 4 rooms (the 4th room of each floor is a perch) + the vault.
//
// For each room: pick a template of the right kind whose entry is on the side the last room's
// exit was on (flipping it if needed), then spend the floor's difficulty budget on its sockets
// (guard 3, sweeping searchlight 2, lamp 1), scatter optional rings, loot and shadow, and run the
// no-alert-path validator. A room it cannot prove is re-rolled (new socket fill), then another
// template is tried; the last resort is the template with nothing in it (required rings only),
// which the tests prove is always passable. Every random choice comes from mulberry32 streams
// seeded by (tower seed, floor, room, attempt), so the same seed always gives the same tower.
import { TEMPLATES } from './templates.js';
import { parseTemplate } from './template.js';
import { movesFor } from './moves.js';
import { validateRoom, buildCoverage } from './validator.js';
import { parseLevel } from '../level.js';
import { createRng, hashSeed } from './rng.js';

export const COST = Object.freeze({ guard: 3, sweep: 2, lamp: 1 });
/** Difficulty budget per room. Floor 1 low (the tutorial tower), the vault high. */
export const BUDGET = Object.freeze({ 1: 6, 2: 8, 3: 10, perch: 2, vault: 13 });
export const MAX_GUARDS_FLOOR1 = 2; // BRIEF: "Floor 1: two guards per room at most and lots of dark"
export const SEARCHLIGHT_FROM_FLOOR = 2; // BRIEF: "Searchlight ... shows up from floor 2"
export const REROLLS = 6; // socket re-rolls per template before trying another template
/** Re-rolls after the first FULL_BUDGET_ROLLS spend two points less each time, so a crowded fill
 *  gives way to a lighter one before the generator gives up on a template. */
export const FULL_BUDGET_ROLLS = 3;
export const rollBudget = (budget, roll) => Math.max(0, budget - 2 * Math.max(0, roll - FULL_BUDGET_ROLLS + 1));
export const FLOORS = 3;
export const ROOMS_PER_FLOOR = 4; // the last one is the perch
export const VAULT_FLOOR = 4;

const kindFor = (floor, index) => (floor === VAULT_FLOOR ? 'vault' : index === ROOMS_PER_FLOOR - 1 ? 'perch' : 'normal');
export function budgetFor(floor, index) {
  const k = kindFor(floor, index);
  return k === 'normal' ? BUDGET[floor] : BUDGET[k];
}

const setTile = (rows, c, r, ch) => { rows[r] = rows[r].slice(0, c) + ch + rows[r].slice(c + 1); };

/** Fill a parsed template's sockets with rng; empty = nothing optional at all (the fallback). */
export function fillTemplate(pt, rng, budget, floor, empty = false) {
  const rows = pt.src.map((row) => row.replace(/[gSlh$vo]/g, (ch) => (ch === 'h' ? '#' : ch === 'v' ? '=' : '.')).replace(/a/g, 'a'));
  const guards = [];
  const searchlights = [];
  let spent = 0;
  const bought = { guard: 0, sweep: 0, lamp: 0 };
  if (!empty) {
    const guardSockets = rng.shuffle(pt.guardSockets);
    const searchSockets = rng.shuffle(pt.searchSockets);
    const lampSockets = rng.shuffle(pt.lampSockets);
    const maxGuards = floor === 1 ? MAX_GUARDS_FLOOR1 : Infinity;
    for (;;) {
      const left = budget - spent;
      const can = [];
      if (left >= COST.guard && guardSockets.length && bought.guard < maxGuards) can.push('guard');
      if (left >= COST.sweep && searchSockets.length && floor >= SEARCHLIGHT_FROM_FLOOR) can.push('sweep');
      if (left >= COST.lamp && lampSockets.length) can.push('lamp');
      if (!can.length) break;
      const what = rng.pick(can);
      spent += COST[what];
      bought[what]++;
      if (what === 'guard') {
        const s = guardSockets.pop();
        guards.push({ c: rng.int(s.c0, s.c1), dir: rng.chance(0.5) ? 1 : -1, c0: s.c0, c1: s.c1, floor: s.floor, speed: rng.int(26, 34) });
      } else if (what === 'sweep') {
        const s = searchSockets.pop();
        const inward = s.c + 0.5 < pt.cols / 2 ? -1 : 1; // lean the beam toward the middle
        searchlights.push({ c: s.c, r: s.r, base: Math.PI / 2 + inward * rng.int(0, 35) / 100,
          amp: rng.int(25, 45) / 100, period: rng.int(40, 60) / 10, phase: rng.int(0, 628) / 100 });
      } else {
        const s = lampSockets.pop();
        setTile(rows, s.c, s.r, 'L');
      }
    }
    for (const s of pt.rings) if (!s.required && rng.chance(0.5)) setTile(rows, s.c, s.r, 'a');
    for (const s of pt.lootSockets) if (rng.chance(0.6)) setTile(rows, s.c, s.r, 'm');
    for (const s of pt.hideSockets) if (rng.chance(0.7)) setTile(rows, s.c, s.r, s.wood ? '~' : 's');
  }
  for (const l of pt.lamps) setTile(rows, l.c, l.r, 'L');
  return { rows, guards, searchlights, spent, bought };
}

/**
 * Generate one room. opts.entrySide: 'L' or 'R' (the side the previous room's exit was on).
 * opts.avoid: template ids not to reuse. Returns a level definition plus a `gen` record.
 */
export function generateRoom(seed, floor, index, opts = {}) {
  const t0 = performance.now();
  const kind = kindFor(floor, index);
  const budget = budgetFor(floor, index);
  const pickRng = createRng(hashSeed(seed, floor, index, 'pick'));
  const entrySide = opts.entrySide ?? (pickRng.chance(0.5) ? 'L' : 'R');
  const avoid = new Set(opts.avoid || []);
  const pool = TEMPLATES.filter((t) => t.kind === kind);
  const order = pickRng.shuffle(pool.filter((t) => !avoid.has(t.id))).concat(pickRng.shuffle(pool.filter((t) => avoid.has(t.id))));
  let attempts = 0;
  let last = null;
  let coldMs = 0; // building movement graphs not cached yet (once per template and flip per process)
  for (const t of order) {
    // flip so the entry lands on the requested side
    let pt = parseTemplate(t, false);
    if (pt.entrySide !== entrySide) pt = parseTemplate(t, true);
    const tb = performance.now();
    const moves = movesFor(pt);
    coldMs += performance.now() - tb;
    for (let roll = 0; roll <= REROLLS; roll++) {
      attempts++;
      const empty = roll === REROLLS && t === order[order.length - 1];
      const rng = createRng(hashSeed(seed, floor, index, t.id, roll));
      const fill = fillTemplate(pt, rng, rollBudget(budget, roll), floor, empty);
      const def = {
        name: `${floor === VAULT_FLOOR ? 'VAULT' : `FLOOR ${floor}-${index + 1}`} ${t.name.toUpperCase()}`,
        rows: fill.rows, guards: fill.guards, searchlights: fill.searchlights,
        autoExit: true, prompts: [], checkpoints: [],
      };
      const v = validateRoom(def, moves);
      last = v;
      if (v.ok) {
        def.gen = { seed, floor, index, kind, template: t.id, flip: pt.flip, entrySide: pt.entrySide, exitSide: pt.exitSide,
          budget, spent: fill.spent, bought: fill.bought, attempts, path: v.path, pathSlots: v.slots,
          fallback: empty, ms: performance.now() - t0, coldMs, warmMs: performance.now() - t0 - coldMs };
        return def;
      }
    }
  }
  throw new Error(`generateRoom(${seed}, ${floor}, ${index}): nothing validated (${last && last.reason})`);
}

/**
 * Build everything the generator caches, so later rooms only pay for socket fills and searches:
 * every template's movement graph in both flips (the costly part, ~30-220 ms each), and the
 * guard sight cones along every patrol socket. The game can call this behind the title screen.
 * Returns the ms spent.
 */
export function prepareGenerator() {
  const t0 = performance.now();
  for (const t of TEMPLATES) {
    for (const flip of [false, true]) {
      const pt = parseTemplate(t, flip);
      const moves = movesFor(pt);
      const fill = fillTemplate(pt, createRng(1), 0, 1, true);
      for (const speed of [26, 30, 34]) {
        const guards = pt.guardSockets.flatMap((s) => [1, -1].map((dir) => ({ c: s.c0, dir, c0: s.c0, c1: s.c1, floor: s.floor, speed })));
        const searchlights = pt.searchSockets.map((s) => ({ c: s.c, r: s.r, base: Math.PI / 2, amp: 0, period: 5, phase: 0 }));
        const level = parseLevel({ name: 'warm', rows: fill.rows, guards, searchlights });
        buildCoverage(level, 300, moves.cache || (moves.cache = new Map())).ensure(299);
      }
      validateRoom({ name: 'warm', rows: fill.rows, guards: [], searchlights: [] }, moves); // and the search code
    }
  }
  return performance.now() - t0;
}

/** The whole night: floors 1-3 (4 rooms each, the 4th a perch) and the vault. */
export function generateTower(seed) {
  const s = seed >>> 0;
  const floors = [];
  let side = null;
  for (let f = 1; f <= FLOORS + 1; f++) {
    const rooms = [];
    const n = f === VAULT_FLOOR ? 1 : ROOMS_PER_FLOOR;
    for (let i = 0; i < n; i++) {
      const room = generateRoom(s, f, i, { entrySide: side ?? undefined, avoid: rooms.map((r) => r.gen.template) });
      side = room.gen.exitSide; // the hatch she leaves by opens into the next room on that side
      rooms.push(room);
    }
    floors.push({ floor: f, vault: f === VAULT_FLOOR, rooms });
  }
  return { seed: s, floors };
}
