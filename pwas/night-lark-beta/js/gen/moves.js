// The validator's movement graph (BUILD-PLAN M3 "standable and hangable nodes: walk, jump arcs,
// line attach within range, reel and release").
//
// Nodes are standable tiles (where her feet can rest). Walking between neighbours on the same
// row is implied. Every other move (jump, walk off an edge, drop through wood, fire the line at
// a ring and reel / swing / let go / jump off) is a PROBE: a short scripted input run through the
// real sim (sim.js), starting standing still on a node. A probe that ends standing on another
// node becomes an edge, with the cells her body passed through (per 0.1 s time slot) so the
// validator can check them against the guards and lights over time. Nothing here is an
// approximation of the physics: if the graph says a move works, the game did it.
//
// Rings, lamps, loot and shadow never change the physics, so one graph per template + flip
// serves every socket fill (edges that need a ring carry its id and are skipped if the ring is
// not placed). Graphs are cached by template id + flip.
import { createWorld } from '../sim.js';
import { TUNING } from '../config.js';
import { parseLevel, isStandable, isWood, tileAt } from '../level.js';
import { bodyBlocked } from '../physics.js';
import { lineOfSight } from '../los.js';

export const FRAME = 1 / 60;
export const SLOT = 0.1; // validator time resolution (s)
export const FRAMES_PER_SLOT = 6;
/** Crouch-walking one tile takes 1/crouchSpeed = 0.31 s; the plan allows 4 slots (0.4 s). */
/** Start offsets (tiles) every kept probe must also work from (see buildMoves). */
export const ROBUST_DX = Object.freeze([-0.04, -0.02, 0.02, 0.04]);
export const WALK_SLOTS = Math.ceil(1 / TUNING.crouchSpeed / SLOT);

const NONE = Object.freeze({});
const inp = (held = NONE, pressed = NONE, aimAt = null) => ({ held, pressed, released: NONE, aimAt });
const dirHeld = (d, extra = {}) => (d > 0 ? { right: true, ...extra } : d < 0 ? { left: true, ...extra } : { ...extra });

function probeDef(phys) {
  return { name: 'probe', rows: phys, guards: [], searchlights: [], autoExit: false, prompts: [], checkpoints: [] };
}

/** The facing a probe starts with, from its descriptor (the `script` a path step carries). */
export function probeFace(desc, n, ring = null) {
  if (desc.kind === 'jump') return desc.d || 1;
  if (desc.kind === 'walkoff') return desc.d;
  if (desc.kind === 'drop') return 1;
  return Math.sign(ring.x - (n.c + 0.5)) || 1; // reel and swing: toward the ring
}

/** The input script for a probe descriptor: script(f, w) -> the input for frame f, or null
 *  (the probe failed). The validator's graph is built from these, and M4's path replay
 *  (testlib/path-player.mjs, walkthrough 4) plays the same scripts, so they cannot drift.
 *  ring: { x, y } of desc.ring (reel and swing). */
export function probeScript(desc, ring = null) {
  const T = TUNING;
  switch (desc.kind) {
    case 'jump': {
      const { d, hold } = desc;
      return (f) => inp(f < hold ? dirHeld(d) : NONE, f === 0 ? { jump: true } : NONE);
    }
    case 'walkoff': {
      const { d, mode } = desc;
      let offAt = -1;
      return (f, w) => {
        if (offAt < 0) {
          if (!w.grounded && f > 0) offAt = f;
          else if (f > 40) return null;
          else return inp(dirHeld(d));
        }
        if (mode === 'keep') return inp(dirHeld(d));
        if (mode === 'back') return inp(f - offAt < 8 ? dirHeld(-d) : NONE);
        return inp(NONE);
      };
    }
    case 'drop':
      return (f) => inp(f < 3 ? { down: true } : NONE, f === 0 ? { jump: true } : NONE);
    case 'reel': {
      const { d1, rel, d2 } = desc;
      let topAt = -1;
      return (f, w) => {
        if (f === 0) return inp({ up: true, ...dirHeld(d1) }, NONE, { x: ring.x, y: ring.y });
        if (!w.anchor && topAt < 0) return null;
        if (topAt < 0 && w.ropeLen <= T.lineMin + 1e-6) topAt = f;
        if (topAt < 0 || f < topAt + 12) return inp({ up: true, ...dirHeld(d1) });
        if (f === topAt + 12) return inp(dirHeld(d2), rel === 'jump' ? { jump: true } : { fire: true });
        return inp(dirHeld(d2));
      };
    }
    case 'swing': {
      const { d: toward, rel, k } = desc;
      return (f, w) => {
        if (f === 0) return inp(dirHeld(toward), NONE, { x: ring.x, y: ring.y });
        if (!w.anchor && f < k) return null;
        if (f === k) return inp(dirHeld(toward), rel === 'jump' ? { jump: true } : { fire: true });
        return inp(dirHeld(toward));
      };
    }
    default: throw new Error(`unknown probe kind ${desc.kind}`);
  }
}

/** Standable nodes and their walk segments. */
export function findNodes(level) {
  const { cols, rows } = level;
  const nodeAt = new Int16Array(cols * rows).fill(-1);
  const nodes = [];
  for (let g = 1; g < rows; g++) {
    for (let c = 0; c < cols; c++) {
      if (!isStandable(level, c, g, false)) continue;
      if (bodyBlocked(level, c + 0.5, g - TUNING.footEps, TUNING.standHeight, false)) continue;
      const left = c > 0 ? nodeAt[g * cols + c - 1] : -1;
      const seg = left >= 0 ? nodes[left].seg : nodes.length;
      nodeAt[g * cols + c] = nodes.length;
      nodes.push({ i: nodes.length, c, g, seg, wood: isWood(tileAt(level, c, g)) });
    }
  }
  return { nodes, nodeAt };
}

/** Run one probe. script(f, w) returns the input for frame f, or null to stop (failed). */
function simulate(def, level, nodes, nodeAt, n, face, script, maxF, dx = 0) {
  const T = TUNING;
  const w = createWorld(def, { feathers: 3 });
  w.x = n.c + 0.5 + dx; w.y = n.g - T.footEps; w.peakY = w.y; w.face = face;
  const cols = level.cols;
  const cells = [];
  let air = false;
  let landDrop = 0;
  let ring = null;
  const steps = []; // footstep noises: [x, centreY, frame]
  const lands = []; // loud landings: [x, centreY, frame] (M4: a drop can land loudly on the way down too)
  // phases: the scripted move until she lands; then hands off until she is at rest (a roll
  // plays out, she may even slide off an edge and fall again); then a crouch-walk to the middle
  // of the tile she stopped on, so the next move starts from a node like every probe does.
  let phase = 'move';
  let to = -1;
  const nodeUnder = () => {
    const g = Math.floor(w.y + T.footEps * 2);
    if (g < 0 || g >= level.rows) return -1;
    let k = nodeAt[g * cols + Math.floor(w.x)] ?? -1;
    if (k < 0) {
      for (const c of [Math.floor(w.x - T.halfWidth), Math.floor(w.x + T.halfWidth - T.eps)]) {
        if (c >= 0 && c < cols && nodeAt[g * cols + c] >= 0) { k = nodeAt[g * cols + c]; break; }
      }
    }
    return k;
  };
  const CROUCH = { down: true };
  for (let f = 0; f < maxF + 90; f++) {
    let i;
    if (phase === 'move') {
      if (f >= maxF) return null;
      i = script(f, w);
      if (i === null) return null;
    } else if (phase === 'settle') i = inp(NONE);
    else {
      const dx = nodes[to].c + 0.5 - w.x;
      i = inp(Math.abs(dx) > 0.04 ? { down: true, ...dirHeld(Math.sign(dx)) } : CROUCH);
    }
    w.step(FRAME, i);
    for (const e of w.events) {
      if (e.type === 'respawn' || e.type === 'pushout') return null;
      if (e.type === 'land') {
        landDrop = Math.max(landDrop, e.drop);
        if (e.drop >= T.landNoiseDrop) lands.push([w.x, w.y - w.h / 2, f]); // a loud landing, where and when
      }
      if (e.type === 'attach') ring = e.ring.id;
    }
    w.events.length = 0;
    if (w.grounded && !w.crouch && !w.climb && Math.abs(w.vx) >= T.hearingMinSpeed) steps.push([w.x, w.y - w.h / 2, f]);
    const cy = w.y - w.h * 0.5;
    const cc = Math.min(cols - 1, Math.max(0, Math.floor(w.x)));
    const cr = Math.min(level.rows - 1, Math.max(0, Math.floor(cy)));
    cells.push(cr * cols + cc);
    if (!w.grounded || w.climb) air = true;
    const down = air && w.grounded && !w.climb;
    if (phase === 'move' && down) phase = 'settle';
    if (phase === 'settle' && down && w.roll <= 0 && Math.abs(w.vx) < 0.01) {
      to = nodeUnder();
      if (to < 0) return null;
      phase = 'centre';
    } else if (phase === 'centre') {
      if (!w.grounded) return null;
      if (Math.abs(nodes[to].c + 0.5 - w.x) <= 0.04 && Math.abs(w.vx) < 0.01) {
        if (nodeUnder() !== to) return null;
        const frames = f + 1;
        const samples = new Set();
        cells.forEach((cell, k) => samples.add(Math.floor(k / FRAMES_PER_SLOT) * 4096 + cell));
        return { to, frames, slots: Math.ceil(frames / FRAMES_PER_SLOT), samples: Int32Array.from(samples),
          landDrop, steps, lands, ring, endX: w.x, endY: w.y };
      }
    }
  }
  return null;
}

/** Build every probe edge for a physics grid (rows of tiles, rings as 'a'). */
export function buildMoves(phys) {
  const T = TUNING;
  const def = probeDef(phys);
  const level = parseLevel(def);
  const { nodes, nodeAt } = findNodes(level);
  const out = nodes.map(() => []);
  const segEnds = new Map();
  for (const n of nodes) {
    const s = segEnds.get(n.seg) || { lo: n, hi: n };
    if (n.c < s.lo.c) s.lo = n;
    if (n.c > s.hi.c) s.hi = n;
    segEnds.set(n.seg, s);
  }
  let simSteps = 0;
  const add = (n, script, res) => {
    if (!res) return;
    simSteps += res.frames;
    if (nodes[res.to].seg === n.seg && !res.ring) return; // walking covers it
    if (res.to === n.i) return;
    out[n.i].push({ from: n.i, ...res, script });
  };
  const run = (n, face, script, maxF, desc) => {
    const r = simulate(def, level, nodes, nodeAt, n, face, script, maxF);
    if (!r) { simSteps += maxF / 4; return; } // rough cost of a failed probe, for stats
    add(n, desc, r);
  };

  // something to jump to? (a node off this segment within a jump's reach)
  const nearOther = (n) => nodes.some((m) => m.seg !== n.seg && Math.abs(m.c - n.c) <= 5 && m.g - n.g >= -3 && m.g - n.g <= 8);

  for (const n of nodes) {
    const ends = segEnds.get(n.seg);
    const isEnd = n === ends.lo || n === ends.hi;
    // jumps
    if (isEnd || nearOther(n)) {
      for (const d of [-1, 0, 1]) {
        for (const hold of d === 0 ? [Infinity] : [Infinity, 8]) {
          const desc = { kind: 'jump', d, hold };
          run(n, probeFace(desc, n), probeScript(desc), 150, desc);
        }
      }
    }
    // walk off an edge
    for (const [d, edge] of [[-1, ends.lo], [1, ends.hi]]) {
      if (n !== edge) continue;
      for (const mode of ['keep', 'stop', 'back']) {
        const desc = { kind: 'walkoff', d, mode };
        run(n, probeFace(desc, n), probeScript(desc), 200, desc);
      }
    }
    // drop through wood
    if (n.wood) {
      const desc = { kind: 'drop' };
      run(n, probeFace(desc, n), probeScript(desc), 200, desc);
    }
  }

  // the line: per ring, a few launch spots per segment in range
  for (const R of level.rings) {
    const bySeg = new Map();
    for (const n of nodes) {
      const cx = n.c + 0.5;
      const cy = n.g - T.footEps - T.standHeight / 2;
      if (Math.hypot(R.x - cx, R.y - cy) > T.lineRange - 0.25) continue;
      if (R.y >= cy) continue; // only rings above her
      if (!lineOfSight(level, cx, cy, R.x, R.y, false)) continue;
      const list = bySeg.get(n.seg) || [];
      list.push(n);
      bySeg.set(n.seg, list);
    }
    for (const list of bySeg.values()) {
      list.sort((a, b) => a.c - b.c);
      const near = list.reduce((b, n) => (Math.abs(n.c + 0.5 - R.x) < Math.abs(b.c + 0.5 - R.x) ? n : b), list[0]);
      const ends = segEnds.get(list[0].seg);
      const launch = new Set([near]);
      if (list.includes(ends.lo)) launch.add(ends.lo);
      if (list.includes(ends.hi)) launch.add(ends.hi);
      for (const n of launch) {
        const toward = Math.sign(R.x - (n.c + 0.5)) || 1;
        // reel up (holding toward the ring, or not), then jump off or let go in a direction
        for (const [d1, d2] of [[0, -1], [0, 0], [0, 1], [-1, -1], [1, 1]]) {
          for (const rel of ['jump', 'let']) {
            const desc = { kind: 'reel', ring: R.id, d1, rel, d2 };
            run(n, probeFace(desc, n, R), probeScript(desc, R), 300, desc);
          }
        }
        // swing: walk off toward the ring on the line, pump, and jump off / let go at frame k
        if ((toward < 0 && n === ends.lo) || (toward > 0 && n === ends.hi) || n === near) {
          for (const rel of ['jump', 'let']) {
            for (let k = 14; k <= 110; k += 12) {
              const desc = { kind: 'swing', ring: R.id, d: toward, rel, k };
              run(n, probeFace(desc, n, R), probeScript(desc, R), 260, desc);
            }
          }
        }
      }
    }
  }

  // keep the 3 quickest ROBUST edges per (from, to, ring). A player never stands exactly on a
  // tile's middle: the crouch-walk that centres her stops within 0.04 of it. Some probes are
  // knife-edge (M4's sim replay found swings that land 10 tiles away from 0.008 off), so an edge
  // is kept only if the same script from 4 offsets (+-0.02, +-0.04) also lands on the same node.
  // The edge then carries the union of every variant's cells and its slowest time, so the
  // validator checks all of them.
  const ringById = new Map(level.rings.map((r) => [r.id, r]));
  let fragile = 0;
  const robust = (e) => {
    const n = nodes[e.from];
    const R = e.script.ring ? ringById.get(e.script.ring) : null;
    const face = probeFace(e.script, n, R);
    const maxF = e.script.kind === 'jump' ? 150 : e.script.kind === 'reel' ? 300 : e.script.kind === 'swing' ? 260 : 200;
    const samples = new Set(e.samples);
    const steps = e.steps.slice();
    const lands = e.lands.slice();
    let slots = e.slots, landDrop = e.landDrop;
    for (const dx of ROBUST_DX) {
      const r = simulate(def, level, nodes, nodeAt, n, face, probeScript(e.script, R), maxF, dx);
      simSteps += r ? r.frames : maxF / 4;
      if (!r || r.to !== e.to || r.ring !== e.ring) return false;
      for (const v of r.samples) samples.add(v);
      steps.push(...r.steps);
      lands.push(...r.lands);
      slots = Math.max(slots, r.slots); landDrop = Math.max(landDrop, r.landDrop);
    }
    e.samples = Int32Array.from(samples); e.steps = steps; e.lands = lands; e.slots = slots; e.landDrop = landDrop;
    return true;
  };
  for (const list of out) {
    list.sort((a, b) => a.slots - b.slots);
    const seen = new Map();
    const keep = [];
    for (const e of list) {
      const key = `${e.to}|${e.ring}`;
      const k = seen.get(key) || 0;
      if (k >= 3) continue;
      if (!robust(e)) { fragile++; continue; }
      seen.set(key, k + 1);
      keep.push(e);
    }
    keep.sort((a, b) => a.slots - b.slots);
    for (const e of keep) { e.stepBoxes = noiseBoxes(e.steps); e.landBoxes = noiseBoxes(e.lands); }
    list.length = 0;
    list.push(...keep);
  }
  return { cols: level.cols, rows: level.rows, nodes, nodeAt, out, simSteps, fragile, rings: level.rings.map((r) => r.id) };
}

/** Noises grouped per slot into boxes [slot, x0, x1, y0, y1]: the validator checks one box per
 *  slot instead of every frame of all 5 variants (a box holds its points, so it is never laxer). */
function noiseBoxes(list) {
  const by = new Map();
  for (const [x, y, f] of list) {
    const k = Math.floor(f / FRAMES_PER_SLOT);
    const b = by.get(k);
    if (!b) by.set(k, [k, x, x, y, y]);
    else { if (x < b[1]) b[1] = x; if (x > b[2]) b[2] = x; if (y < b[3]) b[3] = y; if (y > b[4]) b[4] = y; }
  }
  return [...by.values()];
}

const cache = new Map();
/** Cached graph for a parsed template (parseTemplate()). */
export function movesFor(pt) {
  const key = `${pt.id}|${pt.flip ? 1 : 0}|${pt.phys.join('')}`;
  let m = cache.get(key);
  if (!m) {
    const t0 = performance.now();
    m = buildMoves(pt.phys);
    m.buildMs = performance.now() - t0;
    cache.set(key, m);
  }
  return m;
}
export function clearMovesCache() { cache.clear(); }
