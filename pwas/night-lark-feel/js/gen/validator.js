// The no-alert-path validator (BUILD-PLAN M3, risk #1).
//
// Question: can the Lark get from the entry to the exit without any watcher ever seeing her
// and without making a noise a guard could hear? It is CONSERVATIVE: a room it cannot prove is
// rejected (and the generator re-rolls it), so an accepted room always has a clean line.
//
// How:
//   1. Movement: the template's probe graph (moves.js), i.e. moves the real sim performed.
//   2. Coverage over time: guards walk their patrols and searchlights sweep exactly as the sim
//      does (stealth.js patrol / stepSearchlight, fixed 1/60 steps, no reaction since she is never
//      seen or heard). Every 0.1 s slot, each tile cell is marked covered if any of 9 points in it
//      is inside a cone (or the touch box), a lit point is inside a guard's lit-sight cone, or a
//      point is in a searchlight beam, with a clear line of sight. Cones and beams are widened by
//      a margin and each slot is OR-ed with its neighbours, so motion between samples is covered.
//   3. Search over (node, time slot): wait (only where uncovered, or crouched on a hide spot),
//      crouch-walk to a neighbour (silent; 4 slots per tile), or take a probe edge whose every
//      sampled cell is uncovered at its time. Probes that land hard (2+ tiles: a noise) or start
//      with a few running steps are not allowed within earshot of any point of a guard's patrol.
//   Hide spot: a shadow tile ('s' or '~') with no lamp within the hide radius; crouched there
//   she is hidden (los.js isHidden), so it is safe at any time.
import { TUNING } from '../config.js';
import { parseLevel, tileAt, isShadow } from '../level.js';
import { lineOfSight } from '../los.js';
import { patrol, stepSearchlight } from '../stealth.js';
import { FRAME, FRAMES_PER_SLOT, WALK_SLOTS } from './moves.js';

export const HORIZON_SLOTS = 300; // 30 s
const M = Object.freeze({ range: 0.4, angle: 0.08, lamp: 0.3, touch: 0.2, noise: 0.5 });
const PTS = [0.1, 0.5, 0.9];

const DOWN = Math.PI / 2;

/** Is a point lit (lamp pool, with margin)? */
function litPoint(level, x, y) {
  for (const l of level.lamps)
    if (Math.hypot(x - l.x, y - l.y) < TUNING.hideLampRadius + M.lamp && lineOfSight(level, l.x, l.y, x, y)) return true;
  return false;
}

/** Does any of a cell's 9 sample points fall in a cone (range, half angle) from (ex, ey) facing
 *  `face`, with a clear line of sight? */
function cellInCone(level, c, r, ex, ey, face, range, half) {
  // quick reject: the whole cell is out of range
  const nx = Math.max(c, Math.min(c + 1, ex)); const ny = Math.max(r, Math.min(r + 1, ey));
  if ((nx - ex) ** 2 + (ny - ey) ** 2 >= range * range) return false;
  const fx = Math.cos(face); const fy = Math.sin(face); const ch = Math.cos(half);
  for (let i = 0; i < 9; i++) {
    const px = c + PTS[i % 3]; const py = r + PTS[(i / 3) | 0];
    const dx = px - ex; const dy = py - ey;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1 / 16) return true;
    if (d >= range || dx * fx + dy * fy <= ch * d) continue; // angle off the facing >= half
    if (lineOfSight(level, ex, ey, px, py)) return true;
  }
  return false;
}

/** Cells a guard standing at gx (quarter tiles) facing dir sees with his cone or touches.
 *  Depends only on the room's stone, so it is cached on the movement graph's cache. */
function guardConeCells(level, cache, floorY, q, dir) {
  const key = `${floorY}|${q}|${dir}`;
  let cells = cache.get(key);
  if (cells) return cells;
  const T = TUNING;
  const { cols, rows } = level;
  const gx = q / 4;
  const ey = floorY - T.guardEyeHeight;
  const face = dir > 0 ? 0 : Math.PI;
  const R = T.coneRange + M.range;
  cells = [];
  for (let r = Math.max(0, Math.floor(ey - R)); r <= Math.min(rows - 1, Math.floor(ey + R)); r++) {
    for (let c = Math.max(0, Math.floor(gx - R)); c <= Math.min(cols - 1, Math.floor(gx + R)); c++) {
      const touch = r >= floorY - 2 && r <= floorY - 1 && c + 1 > gx - T.touchRange - M.touch && c < gx + T.touchRange + M.touch;
      if (touch || cellInCone(level, c, r, gx, ey, face, R, T.coneHalfAngle + M.angle)) cells.push(r * cols + c);
    }
  }
  cache.set(key, cells);
  return cells;
}

/** For a searchlight at a socket: each cell it could ever see, with the range of beam angles
 *  that reach some point of that cell. Cached per socket. */
function beamCells(level, cache, s) {
  const key = `beam|${s.x}|${s.y}|${s.range}`;
  let res = cache.get(key);
  if (res) return res;
  const { cols, rows } = level;
  const R = s.range + M.range;
  res = [];
  for (let r = Math.max(0, Math.floor(s.y - R)); r <= Math.min(rows - 1, Math.floor(s.y + R)); r++) {
    for (let c = Math.max(0, Math.floor(s.x - R)); c <= Math.min(cols - 1, Math.floor(s.x + R)); c++) {
      let lo = Infinity; let hi = -Infinity;
      for (let i = 0; i < 9; i++) {
        const px = c + PTS[i % 3]; const py = r + PTS[(i / 3) | 0];
        const d = Math.hypot(px - s.x, py - s.y);
        if (d >= R || d < 1 / 16) continue;
        if (!lineOfSight(level, s.x, s.y, px, py)) continue;
        // angles measured from straight down, in (-PI, PI]: generated beams always point down
        // (base PI/2 +- 0.35, amp <= 0.45, half 0.15), so nothing above the lamp is ever lit
        const a = Math.atan2(Math.sin(Math.atan2(py - s.y, px - s.x) - DOWN), Math.cos(Math.atan2(py - s.y, px - s.x) - DOWN));
        if (Math.abs(a) > Math.PI / 2) continue;
        lo = Math.min(lo, a); hi = Math.max(hi, a);
      }
      if (lo <= hi) res.push({ cell: r * cols + c, lo, hi });
    }
  }
  cache.set(key, res);
  return res;
}

/**
 * Coverage over time, built lazily: cov.get(slot, cell) = 1 (bits in covBits) if a watcher may see her in that
 * cell around that slot (dilated by one slot each way). Call ensure(k) before reading slot k;
 * slots are simulated in order, so a search that ends early never pays for the rest.
 * gpos: per guard, his x at each simulated slot and his eye height (for hearing).
 */
export function buildCoverage(level, slots = HORIZON_SLOTS, cache = new Map()) {
  const T = TUNING;
  const { cols, rows } = level;
  const cells = cols * rows;
  // bit sets, W words per slot: bit (cell & 31) of word [slot * W + (cell >> 5)]
  const W = (cells + 31) >> 5;
  const raw = new Int32Array(slots * W);
  const covBits = new Int32Array(slots * W);
  // lamp pools (with margin): a lit cell is seen from much farther (litSightRange, litHalfAngle)
  const lampKey = level.lamps.map((l) => `${l.x},${l.y}`).join(';');
  let litCells = cache.get(`litcells|${lampKey}`);
  if (!litCells) {
    const lit = new Set();
    for (const l of level.lamps) {
      const R = T.hideLampRadius + M.lamp;
      for (let r = Math.max(0, Math.floor(l.y - R)); r <= Math.min(rows - 1, Math.floor(l.y + R)); r++)
        for (let c = Math.max(0, Math.floor(l.x - R)); c <= Math.min(cols - 1, Math.floor(l.x + R)); c++)
          for (let i = 0; i < 9; i++) if (litPoint(level, c + PTS[i % 3], r + PTS[(i / 3) | 0])) { lit.add(r * cols + c); break; }
    }
    litCells = [...lit];
    cache.set(`litcells|${lampKey}`, litCells);
  }
  const litFor = (floorY, q, dir) => {
    const key = `lit|${lampKey}|${floorY}|${q}|${dir}`;
    let list = cache.get(key);
    if (list) return list;
    list = [];
    const face = dir > 0 ? 0 : Math.PI;
    const ey = floorY - T.guardEyeHeight;
    for (const cell of litCells) {
      const c = cell % cols; const r = (cell / cols) | 0;
      for (let dq = -1; dq <= 1; dq++) {
        if (cellInCone(level, c, r, (q + dq) / 4, ey, face, T.litSightRange + M.range, T.litHalfAngle + M.angle)) { list.push(cell); break; }
      }
    }
    cache.set(key, list);
    return list;
  };
  // guards patrol and searchlights sweep exactly as stealth.js does (they never react: she is
  // never seen or heard), stepped forward a slot at a time as the search needs them
  const guards = level.guards.map((g0) => ({ g: { ...g0 }, xs: new Float32Array(slots), ey: g0.floorY - T.guardEyeHeight }));
  const gpos = guards.map(({ xs, ey }) => ({ xs, ey }));
  const lights = (level.searchlights || []).map((s0) => {
    const s = { ...s0 };
    if (Math.abs(s.base - DOWN) + s.amp + s.half + M.angle >= Math.PI / 2) throw new Error('validator: searchlight must point down');
    return { s, list: beamCells(level, cache, s), half: s.half + M.angle };
  });
  let rawDone = 0; // raw slots computed
  let covDone = 0; // cov slots final
  const stepRaw = () => {
    const k = rawDone++;
    const base = k * W;
    const mark = (cell) => { raw[base + (cell >> 5)] |= 1 << (cell & 31); };
    for (const G of guards) {
      const g = G.g;
      G.xs[k] = g.x;
      const q = Math.round(g.x * 4);
      // he moves under a quarter tile per slot: cover the neighbouring quarter-tile spots too
      for (let dq = -1; dq <= 1; dq++) for (const cell of guardConeCells(level, cache, g.floorY, q + dq, g.dir)) mark(cell);
      if (litCells.length) for (const cell of litFor(g.floorY, q, g.dir)) mark(cell);
      for (let f = 0; f < FRAMES_PER_SLOT; f++) patrol(g, FRAME);
    }
    for (const L of lights) {
      const { s, list, half } = L;
      const a = Math.atan2(Math.sin(s.angle - DOWN), Math.cos(s.angle - DOWN));
      for (const { cell, lo, hi } of list) if (a + half > lo && a - half < hi) mark(cell);
      for (let f = 0; f < FRAMES_PER_SLOT; f++) stepSearchlight(s, FRAME, () => {});
    }
  };
  const ensure = (k) => {
    if (k >= slots) k = slots - 1;
    while (covDone <= k) {
      const j = covDone;
      while (rawDone < Math.min(slots, j + 2)) stepRaw();
      // dilate in time by one slot each way
      const base = j * W;
      for (let w = 0; w < W; w++) {
        covBits[base + w] = raw[base + w] | (j > 0 ? raw[base - W + w] : 0) | (j + 1 < slots ? raw[base + W + w] : 0);
      }
      covDone++;
    }
  };
  if (!guards.length && !lights.length) ensure(slots - 1); // nothing moves: all zero, trivially
  const cov = { get: (k, cell) => (covBits[k * W + (cell >> 5)] >>> (cell & 31)) & 1 };
  return { cov, covBits, W, cells, slots, gpos, ensure };
}

/** Is node n a hide spot (shadow underfoot, no lamp near anywhere she could be on that tile)? */
function hideNode(level, n) {
  if (!isShadow(tileAt(level, n.c, n.g))) return false;
  const cy = n.g - TUNING.crouchHeight / 2;
  for (const l of level.lamps) {
    const nx = Math.max(n.c, Math.min(n.c + 1, l.x));
    if (Math.hypot(nx - l.x, cy - l.y) < TUNING.hideLampRadius + M.lamp) return false;
  }
  return true;
}

/** Could any guard hear a noise of radius r at (x, y) around slot k? (Stone between halves the
 *  radius in the game; here it is ignored, which only makes the check stricter.) */
function audible(gpos, x, y, r, k) {
  const R2 = (r + M.noise) ** 2;
  for (const { xs, ey } of gpos) {
    const dy2 = (y - ey) ** 2;
    if (dy2 >= R2) continue;
    for (let j = Math.max(0, k - 1); j <= Math.min(xs.length - 1, k + 1); j++) {
      if ((x - xs[j]) ** 2 + dy2 < R2) return true;
    }
  }
  return false;
}

/** An edge's samples (slot * 4096 + cell) as [slot << 8 | word, mask] pairs over covBits. */
function sampleBits(samples, W) {
  const by = new Map();
  for (const v of samples) {
    const slot = (v / 4096) | 0; const cell = v & 4095;
    const key = (slot << 8) | (cell >> 5);
    by.set(key, (by.get(key) | 0) | (1 << (cell & 31)));
  }
  if (W > 255) throw new Error('validator: room too big for sample masks');
  const out = new Int32Array(by.size * 2);
  let i = 0;
  for (const [key, mask] of [...by].sort((a, b) => a[0] - b[0])) { out[i++] = key; out[i++] = mask; }
  return out;
}

/** audible() for a box of noise points [slot, x0, x1, y0, y1]: the nearest point of the box. */
function audibleBox(gpos, b, r, k) {
  const R2 = (r + M.noise) ** 2;
  const [, x0, x1, y0, y1] = b;
  for (const { xs, ey } of gpos) {
    const dy = ey < y0 ? y0 - ey : ey > y1 ? ey - y1 : 0;
    const dy2 = dy * dy;
    if (dy2 >= R2) continue;
    for (let j = Math.max(0, k - 1); j <= Math.min(xs.length - 1, k + 1); j++) {
      const gx = xs[j];
      const dx = gx < x0 ? x0 - gx : gx > x1 ? gx - x1 : 0;
      if (dx * dx + dy2 < R2) return true;
    }
  }
  return false;
}

/**
 * Validate a room. def: a level definition (rows, guards, searchlights); moves: its movement
 * graph (movesFor). Returns { ok, path, slots, reason, ms }.
 */
export function validateRoom(def, moves, opts = {}) {
  const t0 = performance.now();
  const T = TUNING;
  const level = parseLevel(def);
  const { cols, nodes, nodeAt, out } = moves;
  const S = opts.slots ?? HORIZON_SLOTS;
  const { covBits, W, gpos, ensure } = buildCoverage(level, S, opts.cache || moves.cache || (moves.cache = new Map()));
  const ringSet = new Set(level.rings.map((r) => r.id));
  const N = nodes.length;
  const hide = new Uint8Array(N);
  const ncell = new Int32Array(N);
  for (const n of nodes) { hide[n.i] = hideNode(level, n) ? 1 : 0; ncell[n.i] = (n.g - 1) * cols + n.c; }
  const fail = (reason) => ({ ok: false, reason, ms: performance.now() - t0 });

  // entry and exit nodes
  const find = (ch) => { for (let r = 0; r < level.rows; r++) { const c = level.grid[r].indexOf(ch); if (c >= 0) return { c, r }; } return null; };
  const P = find('P');
  const E = find('E');
  if (!P || !E) return fail('no entry or exit');
  const start = nodeAt[(P.r + 1) * cols + P.c];
  if (start < 0) return fail('entry is not standable');
  const goal = new Uint8Array(N);
  for (let dc = -1; dc <= 1; dc++) {
    const c = E.c + dc;
    if (c < 0 || c >= cols) continue;
    const n = nodeAt[(E.r + 1) * cols + c];
    if (n >= 0) goal[n] = 1;
  }
  if (!goal.some((v) => v)) return fail('exit is not standable');

  // edges usable in this room: ring placed, and no noise in earshot of a guard
  const hearR = T.hearingRadius;
  const usable = out.map((list) => list.filter((e) => !e.ring || ringSet.has(e.ring)));
  const noisy = (e, k) => {
    if (!gpos.length) return false;
    for (const b of e.stepBoxes) if (audibleBox(gpos, b, hearR, k + b[0])) return true; // footsteps
    for (const b of e.landBoxes) if (audibleBox(gpos, b, hearR * T.landNoiseMul, k + b[0])) return true; // loud landings, on the way too
    if (e.landDrop >= T.landNoiseDrop && audible(gpos, e.endX, e.endY - T.standHeight / 2, hearR * T.landNoiseMul, k + e.slots)) return true;
    return false;
  };

  const covAt = (k, cell) => (covBits[k * W + (cell >> 5)] >>> (cell & 31)) & 1;
  const safe = (n, k) => hide[n] === 1 || covAt(k, ncell[n]) === 0;
  let maxSlots = WALK_SLOTS;
  for (const list of usable) for (const e of list) if (e.slots > maxSlots) maxSlots = e.slots;
  ensure(maxSlots + 1);
  if (!safe(start, 0)) return fail('seen at the entry');
  const reach = new Uint8Array(N * S);
  const prev = new Int32Array(N * S).fill(-1);
  const how = new Int32Array(N * S).fill(-1); // -1 start, -2 wait, -3 walk, >=0 edge index in usable[from]
  let horizon = 0; // the latest slot any reached state sits at
  const set = (n, k, from, h) => {
    const i = k * N + n; if (reach[i]) return;
    reach[i] = 1; prev[i] = from; how[i] = h; if (k > horizon) horizon = k;
  };
  set(start, 0, -1, -1);
  let found = -1;
  outer:
  for (let k = 0; k < S; k++) {
    if (k > horizon) break; // every line of search died: nothing can reach later slots
    ensure(k + maxSlots + 1);
    for (let n = 0; n < N; n++) {
      if (!reach[k * N + n]) continue;
      if (goal[n]) { found = k * N + n; break outer; }
      const here = k * N + n;
      if (k + 1 < S && safe(n, k + 1)) set(n, k + 1, here, -2);
      const nd = nodes[n];
      for (const dc of [-1, 1]) {
        const c = nd.c + dc;
        if (c < 0 || c >= cols) continue;
        const m = nodeAt[nd.g * cols + c];
        if (m < 0 || nodes[m].seg !== nd.seg) continue;
        const k2 = k + WALK_SLOTS;
        if (k2 >= S || reach[k2 * N + m] || (reach[(k2 - 1) * N + m] && safe(m, k2))) continue; // there already, or waits into it
        let ok = true;
        for (let j = k; j <= k2 && ok; j++) ok = safe(n, j) && safe(m, j);
        if (ok) set(m, k2, here, -3);
      }
      const list = usable[n];
      for (let ei = 0; ei < list.length; ei++) {
        const e = list[ei];
        const k2 = k + e.slots;
        // skip if she is there at k2 already, or will be by waiting a slot there (the search sets
        // the wait from (to, k2 - 1) when it gets to that slot): no path is lost, only re-checks
        if (k2 >= S || reach[k2 * N + e.to] || (reach[(k2 - 1) * N + e.to] && safe(e.to, k2))) continue;
        let ok = true;
        const bm = e.sampleBits || (e.sampleBits = sampleBits(e.samples, W));
        for (let j = 0; j < bm.length; j += 2) {
          if (covBits[(k + (bm[j] >> 8)) * W + (bm[j] & 255)] & bm[j + 1]) { ok = false; break; }
        }
        if (ok && !(hide[e.to] || covAt(k2, ncell[e.to]) === 0)) ok = false;
        if (ok && noisy(e, k)) ok = false;
        if (ok) set(e.to, k2, here, ei);
      }
    }
  }
  if (found < 0) return fail('no unseen path within the horizon');
  // rebuild the path
  const path = [];
  for (let i = found; i >= 0 && how[i] !== -1; i = prev[i]) {
    const k = Math.floor(i / N); const n = i % N;
    const p = prev[i]; const pn = p % N; const pk = Math.floor(p / N);
    if (how[i] === -2) path.push({ type: 'wait', node: n, slot: pk });
    else if (how[i] === -3) path.push({ type: 'walk', from: pn, to: n, slot: pk });
    else { const e = usable[pn][how[i]]; path.push({ type: 'move', from: pn, to: n, slot: pk, slots: k - pk, script: e.script, ring: e.ring }); }
  }
  path.reverse();
  // collapse waits
  const steps = [];
  for (const s of path) {
    const last = steps[steps.length - 1];
    if (s.type === 'wait' && last && last.type === 'wait' && last.node === s.node) { last.slots += 1; continue; }
    steps.push(s.type === 'wait' ? { ...s, slots: 1 } : s);
  }
  const pos = (n) => ({ c: nodes[n].c, g: nodes[n].g });
  return { ok: true, slots: Math.floor(found / N), path: steps.map((s) => ({ ...s,
    at: s.node !== undefined ? pos(s.node) : undefined, fromAt: s.from !== undefined ? pos(s.from) : undefined,
    toAt: s.to !== undefined ? pos(s.to) : undefined })), hideNodes: hide.reduce((a, b) => a + b, 0),
  ms: performance.now() - t0 };
}
