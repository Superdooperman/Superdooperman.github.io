// Set pieces (Nov 9 2026): background props Wren can bring down. A small data-driven system so
// nets, banners and more can be added later as one more SETPIECE_TYPES entry.
//
// A room def lists them apart from its kit props (def.setpieces), so the generator, validator and
// every prop-derived anchor stay exactly as they were:
//   def.setpieces = [{ type: 'gargoyle' | 'chandelier', c, r, flip? }]   (c, r: art box top-left, tiles)
// At world build (sim.js createWorld / resetRoom) attachSetpieces() turns each one into
//   - a grapple anchor in level.rings ({ kind: 'prop', prop: type, setpiece }), in any anchor mode,
//   - for a lit type, a lamp in level.lamps ({ lamp: true, setpiece }) that stealth counts like any lamp,
//   - a runtime record in level.setpieces: { id, type, c, r, flip, x, y (box top-left, tiles),
//     state 'intact' | 'falling' | 'landed' | 'gone', vy, anchor, lamp, hits, wreck }.
//
// How one comes down (the type's rules):
//   yank   ZIP (V / K, pad RB, phone ZIP) or PULL (C / L, pad X, touch PULL) while hooked: hp
//          goes down by one; at 0 it drops.
//   snuff  (lit types) aim at the candles and let go, or tap them: it drops (no power-up needed).
// The fall: gravity, a straight drop through open air and one-way rails it is not set to land on;
// lands on the first ground its footprint meets. Effects (each a type field): screen shake, a
// particle burst kind, a sound (sim events, fx.js / audio.js), light out, a guard it lands on is
// knocked out ('down': out for the room, like a Tie-Line 'tied') or stunned ('stagger' + dazed:
// no sight or hearing for stunTime), and an optional solid wreck (rubble tiles 'r', stone for
// every rule: body, sight, the line) that blocks the column it lands in.
import { TUNING } from './config.js';
import { tileAt, isGround, isBlockingTile } from './level.js';
import { lineOfSight } from './los.js';
import { bodyCenterY } from './physics.js';

/** The types. w/h: art box (tiles). grip: hook point from the box top-left (tiles, unflipped).
 *  lampAt: the light (lit types). yank.hp: ZIPs to tear it off. snuff: aim/tap at the light drops
 *  it. fall.g: gravity (tiles/s^2), fall.max: top speed. hit: what a landing does to a guard
 *  (direct = under the footprint, graze = within grazeR of its edge; 'down' | 'stun' | null).
 *  wreck: rubble left behind (solid: tiles 'r' fill the footprint's h rows above where it lands).
 *  fx: shake (px, s), burst kind for fx.js, sound names for audio.js. */
export const SETPIECE_TYPES = Object.freeze({
  gargoyle: Object.freeze({
    w: 2, h: 1, grip: [27 / 16, 7 / 16], mount: 'wall',
    yank: { hp: 1 }, snuff: false, lampAt: null,
    fall: { g: 52, max: 24 },
    hit: { direct: 'down', graze: 'stun', grazeR: 1.2, stunTime: 2.5 },
    wreck: { solid: true, h: 1 },
    fx: { dropShake: { amp: 1, dur: 0.12 }, landShake: { amp: 4, dur: 0.4 }, burst: 'stone', dropSound: 'crack', landSound: 'crash' },
    note: 'a gargoyle with cracked mortar at its wall join: grapple it, ZIP to tear it off',
  }),
  chandelier: Object.freeze({
    // 4 x 3 tiles (64 x 48 px): the same box as the small mini-tower crown plus its glow
    // (mini-tower-crown 48 x 32 frame, crown-glow 64 x 48). Placeholder art fills that box
    // like the crown (heavy iron arms, a ring of lamps) until Brook draws the sheet.
    w: 4, h: 3, grip: [2, 5 / 16], mount: 'under',
    yank: { hp: 1 }, snuff: true, lampAt: [2, 1.6],
    fall: { g: 52, max: 24 },
    hit: { direct: 'stun', graze: 'stun', grazeR: 2, stunTime: 5 },
    wreck: { solid: false, h: 1 },
    fx: { dropShake: { amp: 1, dur: 0.12 }, landShake: { amp: 3, dur: 0.32 }, burst: 'glass', dropSound: 'snap', landSound: 'smash' },
    note: 'a crown-sized iron chandelier on a ceiling chain: it swings as a pendulum, her rope rides the moving grip, ZIP or PULL tears it down, or snuff the candles',
  }),
});
export const SETPIECE_KINDS = Object.freeze(Object.keys(SETPIECE_TYPES));

/** Hanging set pieces (chandeliers) are a damped, angle-capped pendulum from the ceiling
 *  attach (chainTop). Wren's rope is a second pendulum on that moving grip: her weight and
 *  momentum swing the fixture, and the grip moves under her. Not a free chaotic double
 *  pendulum — damped, mass-heavy fixture, hard angle and rate caps, so it stays playable. */
export const PENDULUM = Object.freeze({
  g: 52, // tiles/s^2, same as the chandelier's fall gravity
  damp: 2.4, // 1/s, while idle
  rideDamp: 1.15, // lighter damping while she is on it, so she can pump it
  maxTheta: 38 * Math.PI / 180,
  maxOmega: 3.2, // rad/s
  mass: 3.2,
  wrenMass: 1,
  couple: 6, // 1/s: how hard her orbit around the pivot drags the fixture
  minLen: 2, // tiles; shorter hangs stay still
  settleTheta: 0.01,
  settleOmega: 0.04,
});

/** Move the box, grip and lamp to the hanging pose at sp.theta (y-down, 0 = straight down). */
export function applyHangPose(sp) {
  const t = SETPIECE_TYPES[sp.type];
  if (!t || t.mount !== 'under' || sp.state !== 'intact' || !sp.pivot || !(sp.hangLen > 0)) return;
  const gx = sp.flip ? t.w - t.grip[0] - 1 / 16 : t.grip[0];
  const gy = t.grip[1];
  const th = sp.theta || 0;
  const ax = sp.pivot.x + sp.hangLen * Math.sin(th);
  const ay = sp.pivot.y + sp.hangLen * Math.cos(th);
  if (sp.anchor) { sp.anchor.x = ax; sp.anchor.y = ay; }
  sp.x = ax - gx; sp.y = ay - gy;
  if (sp.lamp && t.lampAt) {
    const lx = sp.flip ? t.w - t.lampAt[0] : t.lampAt[0];
    sp.lamp.x = sp.x + lx;
    sp.lamp.y = sp.y + t.lampAt[1];
  }
}

/** One pendulum step. w may be null (tests). */
export function stepHang(w, sp, dt) {
  const t = SETPIECE_TYPES[sp.type];
  if (!t || t.mount !== 'under' || sp.state !== 'intact') return;
  if (!(sp.hangLen >= PENDULUM.minLen) || !sp.pivot) return;
  const P = PENDULUM;
  const L = sp.hangLen;
  const riding = !!(w && w.anchor === sp.anchor && !w.grounded);
  let theta = sp.theta || 0;
  let omega = sp.omega || 0;
  const I = P.mass * L * L;
  let tau = -P.mass * P.g * L * Math.sin(theta);
  let Ieff = I;
  if (riding) {
    const rx = w.x - sp.pivot.x;
    const ry = bodyCenterY(w) - sp.pivot.y;
    const r2 = rx * rx + ry * ry || 1e-6;
    tau += P.wrenMass * P.g * rx;
    Ieff += P.wrenMass * r2;
    const wrenOmega = (w.vx * ry - w.vy * rx) / r2;
    tau += (wrenOmega - omega) * P.couple * Ieff;
  }
  const damp = riding ? P.rideDamp : P.damp;
  omega += (tau / Ieff - damp * omega) * dt;
  if (omega > P.maxOmega) omega = P.maxOmega;
  if (omega < -P.maxOmega) omega = -P.maxOmega;
  theta += omega * dt;
  if (theta > P.maxTheta) { theta = P.maxTheta; if (omega > 0) omega *= 0.2; }
  if (theta < -P.maxTheta) { theta = -P.maxTheta; if (omega < 0) omega *= 0.2; }
  if (!riding && Math.abs(theta) < P.settleTheta && Math.abs(omega) < P.settleOmega) { theta = 0; omega = 0; }
  sp.theta = theta; sp.omega = omega;
  applyHangPose(sp);
}

/** Intact hanging pieces: run before the rope solve so her line tracks the moving grip. */
export function stepHangingSetpieces(w, level, dt) {
  for (const sp of level.setpieces || []) stepHang(w, sp, dt);
}


/** Guard states a set piece leaves him in. 'down' is out for the room (skipped like 'tied'). */
export const DOWN = 'down';
/** Stealth's test for a guard who neither sees nor hears: tied, knocked out, or dazed by a stun. */
export const guardOut = (g) => g.state === 'tied' || g.state === DOWN || !!g.dazed;

/** The grip point of a placed set piece (tiles). A flip mirrors it like a kit prop (props.js propGrip). */
export function setpieceGrip(sp) {
  const t = SETPIECE_TYPES[sp.type];
  const gx = sp.flip ? t.w - t.grip[0] - 1 / 16 : t.grip[0];
  return { x: sp.c + gx, y: sp.r + t.grip[1] };
}

/** Build the runtime set pieces for a parsed level from its def (call once per parse). Adds
 *  their anchors and lamps. Unknown types throw. Returns level.setpieces. */
export function attachSetpieces(level, def) {
  level.setpieces = [];
  (def.setpieces || []).forEach((p, i) => {
    const t = SETPIECE_TYPES[p.type];
    if (!t) throw new Error(`unknown set piece ${p.type}`);
    const sp = { id: p.id || `${p.type}-${i}`, type: p.type, c: p.c, r: p.r, flip: !!p.flip, x: p.c, y: p.r,
      state: 'intact', vy: 0, hp: t.yank ? t.yank.hp : 0, anchor: null, lamp: null, hits: [], wreck: [], how: null, t: 0 };
    const g = setpieceGrip(sp);
    sp.anchor = { x: g.x, y: g.y, id: `sp:${sp.id}`, kind: 'prop', prop: p.type, setpiece: sp };
    level.rings.push(sp.anchor);
    if (t.lampAt) {
      sp.lamp = { x: p.c + t.lampAt[0], y: p.r + t.lampAt[1], kind: 'candle', lamp: true, setpiece: sp };
      level.lamps.push(sp.lamp);
    }
    // a hanging piece's chain runs up to the first solid tile above it (or the room top)
    if (t.mount === 'under') {
      let top = p.r - 1; const cc = Math.floor(g.x);
      while (top >= 0 && !isBlockingTile(tileAt(level, cc, top), false) && !isGround(tileAt(level, cc, top))) top--;
      sp.chainTop = top + 1;
      sp.pivot = { x: g.x, y: sp.chainTop };
      sp.hangLen = Math.max(0, g.y - sp.chainTop);
      sp.theta = 0; sp.omega = 0;
      applyHangPose(sp);
    }
    level.setpieces.push(sp);
  });
  return level.setpieces;
}

export const setpieceOf = (a) => (a && a.setpiece) || null;
/** Can ZIP tear this anchor's set piece off? */
export const isYankable = (a) => { const sp = setpieceOf(a); return !!(sp && sp.state === 'intact' && SETPIECE_TYPES[sp.type].yank); };
/** Is this lamp a set piece's light that aim / tap can put out (and so drop the piece)? */
export const isSetpieceLamp = (l) => !!(l && l.lamp && l.setpiece && l.setpiece.state === 'intact' && SETPIECE_TYPES[l.setpiece.type].snuff);

/** One ZIP on a yankable: hp down by one; at 0 it drops. Returns 'tug' | 'drop' | null. */
export function yankSetpiece(level, sp, emit) {
  if (!sp || sp.state !== 'intact' || !SETPIECE_TYPES[sp.type].yank) return null;
  sp.hp -= 1;
  if (sp.hp > 0) { emit('setpiece-tug', { id: sp.id, piece: sp.type, hp: sp.hp }); return 'tug'; }
  dropSetpiece(level, sp, 'yank', emit);
  return 'drop';
}

/** Let it go: off the wall / ceiling, its anchor and light gone this frame. */
export function dropSetpiece(level, sp, how, emit) {
  if (!sp || sp.state !== 'intact') return false;
  const t = SETPIECE_TYPES[sp.type];
  sp.state = 'falling'; sp.vy = 0; sp.how = how; sp.t = 0;
  level.rings = level.rings.filter((r) => r !== sp.anchor);
  let lightOut = false;
  if (sp.lamp) { const n = level.lamps.length; level.lamps = level.lamps.filter((l) => l !== sp.lamp); lightOut = level.lamps.length < n; }
  const cx = sp.x + t.w / 2;
  emit('setpiece-drop', { id: sp.id, piece: sp.type, how, x: cx, y: sp.y + t.h / 2, lightOut, shake: t.fx.dropShake, sound: t.fx.dropSound });
  if (lightOut) emit('light-out', { id: sp.id, x: sp.lamp.x, y: sp.lamp.y });
  return true;
}

/** The ground the footprint lands on: the first row r in (bottom0, bottom1] where a column of the
 *  footprint has ground (stone, rubble, wood, grating) whose top is open. null if none. */
function landingRow(level, sp, w, bottom0, bottom1) {
  const c0 = Math.floor(sp.x + 1e-6); const c1 = Math.floor(sp.x + w - 1e-6);
  for (let r = Math.floor(bottom0) + (Number.isInteger(bottom0) ? 0 : 1); r <= Math.floor(bottom1); r++) {
    if (r < 0) continue;
    for (let c = c0; c <= c1; c++) {
      const ch = tileAt(level, c, r);
      if (isGround(ch) || isBlockingTile(ch, false)) return r;
    }
  }
  return null;
}

const guardBox = (g) => ({ x0: g.x - 0.45, x1: g.x + 0.45, y0: g.floorY - TUNING.standHeight, y1: g.floorY });

/** Knock a guard out for the room (or stun him). Clears an alert he owned. */
export function hitGuard(w, g, what, t, emit, by) {
  if (!what || g.state === 'tied' || g.state === DOWN) return false;
  if (w && w.alert && w.alert.src === g) { w.alert = null; w.meter = Math.min(w.meter, TUNING.escapeMeter); }
  if (w && w.meterSrc === g) w.meterSrc = null;
  g.sees = false;
  if (what === 'down') { g.state = DOWN; g.dazed = false; g.t = 0; g.kbT = 0; emit('guard-down', { x: g.x, y: g.floorY, by }); }
  else { g.state = 'stagger'; g.dazed = true; g.t = t; g.kbT = 0.12; g.kbVx = (g.x < by.x ? -1 : 1) * 3; emit('guard-stun', { x: g.x, y: g.floorY, by: by.id, t }); }
  return true;
}

/** One step of every moving set piece. w: the world (alert bookkeeping, may be null in tests). */
export function stepSetpieces(w, level, dt, emit) {
  for (const sp of level.setpieces || []) {
    if (sp.state !== 'falling') { if (sp.state === 'landed') sp.t += dt; continue; }
    const t = SETPIECE_TYPES[sp.type];
    sp.t += dt;
    const b0 = sp.y + t.h;
    sp.vy = Math.min(t.fall.max, sp.vy + t.fall.g * dt);
    let y1 = sp.y + sp.vy * dt;
    const r = landingRow(level, sp, t.w, b0, y1 + t.h);
    if (r !== null) y1 = r - t.h;
    const box = { x0: sp.x, x1: sp.x + t.w, y0: Math.min(sp.y, y1), y1: y1 + t.h };
    // a direct hit on the way down (the box sweeps through his body)
    for (const g of level.guards) {
      if (g.state === 'tied' || g.state === DOWN || sp.hits.includes(g)) continue;
      const gb = guardBox(g);
      if (gb.x1 > box.x0 && gb.x0 < box.x1 && gb.y1 > box.y0 && gb.y0 < box.y1) {
        sp.hits.push(g);
        hitGuard(w, g, t.hit.direct, t.hit.stunTime, emit, { id: sp.id, x: sp.x + t.w / 2 });
      }
    }
    sp.y = y1;
    if (r !== null) land(w, level, sp, t, r, emit);
    else if (sp.y > level.rows + 2) { sp.state = 'gone'; emit('setpiece-gone', { id: sp.id }); }
  }
}

function land(w, level, sp, t, row, emit) {
  sp.state = 'landed'; sp.vy = 0; sp.t = 0; sp.landRow = row;
  const cx = sp.x + t.w / 2;
  // a graze: guards on this floor beside it
  for (const g of level.guards) {
    if (sp.hits.includes(g) || Math.abs(g.floorY - row) > 0.01) continue;
    const dx = Math.abs(g.x - cx) - t.w / 2;
    if (dx <= t.hit.grazeR) { sp.hits.push(g); hitGuard(w, g, t.hit.graze, t.hit.stunTime, emit, { id: sp.id, x: cx }); }
  }
  if (t.wreck.solid) {
    const c0 = Math.floor(sp.x + 1e-6); const c1 = Math.floor(sp.x + t.w - 1e-6);
    for (let rr = row - t.wreck.h; rr < row; rr++) {
      if (rr < 0 || rr >= level.rows) continue;
      const a = level.grid[rr].split('');
      for (let c = c0; c <= c1; c++) if (c >= 0 && c < level.cols && a[c] === '.') { a[c] = 'r'; sp.wreck.push({ c, r: rr }); }
      level.grid[rr] = a.join('');
    }
    // guards on that floor do not walk through it: patrols end at the rubble, a body in it is put beside it
    if (sp.wreck.length) {
      for (const g of level.guards) {
        if (Math.abs(g.floorY - row) > 0.01) continue;
        if (g.x >= c0 && g.x < c1 + 1) g.x = g.x - c0 < c1 + 1 - g.x ? c0 - 0.5 : c1 + 1.5;
        if (g.x < c0) g.c1 = Math.min(g.c1, c0 - 1); else g.c0 = Math.max(g.c0, c1 + 1);
        if (g.c0 > g.c1) g.c0 = g.c1 = Math.floor(g.x);
      }
    }
  }
  emit('setpiece-land', { id: sp.id, piece: sp.type, x: cx, y: row, hits: sp.hits.length, blocked: sp.wreck.length, shake: t.fx.landShake, burst: t.fx.burst, sound: t.fx.landSound });
}

// ---- Glimmer Sight (STYLE-GUIDE v3.3.1, section 4 "Glimmer Sight look") ----
export const SIGHT = Object.freeze({ range: 480 / 16, max: 8, period: 2.0 });

/** The through-wall yankable cues while the warm buff is on: intact yankables within SIGHT.range
 *  of (x, cy) whose grip is out of line of sight, nearest SIGHT.max. Each: { id, type, box
 *  { x, y, w, h } (tiles, the art box), pip { x, y } (the grip), d }. */
export function sightCues(level, x, cy, doorsOpen = false) {
  const out = [];
  for (const sp of level.setpieces || []) {
    if (sp.state !== 'intact' || !SETPIECE_TYPES[sp.type].yank) continue;
    const t = SETPIECE_TYPES[sp.type];
    const g = setpieceGrip(sp);
    const d = Math.hypot(g.x - x, g.y - cy);
    if (d > SIGHT.range) continue;
    if (lineOfSight(level, x, cy, g.x, g.y, doorsOpen)) continue; // in clear sight the prop art is enough
    out.push({ id: sp.id, piece: sp.type, box: { x: sp.x, y: sp.y, w: t.w, h: t.h }, pip: g, d });
  }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, SIGHT.max);
}

/** Every yankable a Sight pass could show (registration, in or out of range). */
export const sightYankables = (level) => (level.setpieces || []).filter((sp) => sp.state === 'intact' && SETPIECE_TYPES[sp.type].yank);

/** A spot to hang a piece: box cells all open air ('.'). For level builders and tests. */
export function boxClear(rows, type, c, r) {
  const t = SETPIECE_TYPES[type];
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) if ((rows[r + y] || '')[c + x] !== '.') return false;
  return true;
}
