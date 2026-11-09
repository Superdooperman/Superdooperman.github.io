// Wren (the Lark) sprite poses from Brook's strips (art/manifest.json names lark-idle,
// lark-cloak-open, lark-gun-out). Look only: reads world state, never writes the sim.
// Gameplay is side view. Without all three strips loaded the renderer keeps the placeholder
// rect, so a build with the committed (HEAD) art looks exactly as before.
//
// Pose rules (Azzato, Oct 28 2026):
//  - at rest the strips' own rope coil at her feet is the rope; the engine draws no tail;
//  - gun draw = cloak-open frames, then the gun-out frame, played quickly while B is down
//    (the sim fires on release, so the draw never delays a shot);
//  - while the line is out (fire until reeled in / let go) she holds the side gun-out frame
//    with the coil hidden, and the live rope starts at that frame's muzzle. Never two ropes.
import { TILE_PX, TUNING, FEEL, WALK } from './config.js';

export const WREN_SHEETS = Object.freeze(['lark-idle', 'lark-cloak-open', 'lark-gun-out']);
/** The draw, in order: [sheet, frame]. cloak-open 02 is skipped: it is the same pose as
 *  gun-out 01 with the hook clipped to 32 px. */
export const WREN_DRAW = Object.freeze([['lark-cloak-open', 0], ['lark-cloak-open', 1], ['lark-gun-out', 1]]);
export const WREN_DRAW_FRAME = 2 / 60; // s per draw frame: the whole draw is 100 ms
export const WREN_IDLE_FPS = 2; // Brook: 8 fps flickers with only 2 idle frames
export const WREN_FIRE = Object.freeze(['lark-gun-out', 0]);
/** Coil rows: pixels of the WH (hemp) ramp at or below this frame row are the rope on her
 *  body; they are dropped from the line-out copy of a frame. Row 9 is her eye, never masked. */
export const COIL_FROM_ROW = 20;

export const hasWren = (sheets) => !!sheets && WREN_SHEETS.every((n) => sheets[n]);

/** A per-frame point key (muzzle, grip, tailAnchor, ledgeHand): one [x, y] for every frame or
 *  a per-frame list of [x, y]. */
export function pointAt(v, frame) {
  if (!Array.isArray(v) || !v.length) return null;
  if (Array.isArray(v[0])) return v[Math.min(frame, v.length - 1)] || null;
  return v;
}
export const muzzleAt = (sheet, frame) => pointAt(sheet && sheet.muzzle, frame);

export function createWrenAnim() { return { draw: -1, idle: 0, sinceLine: -1, wasLine: false, fall: 0, walk: 0 }; }

/** Grounded and moving (the run strip / stopgap bob shows). */
export const isRunning = (w) => !!w.grounded && !w.anchor && !w.climb && !w.dodge && !(w.roll > 0) && Math.abs(w.vx) >= WALK.minSpeed;

/** One fixed step. draw >= 0 while the draw is running or held (B down, aiming, or a buffered tap). */
export function stepWrenAnim(a, w, dt) {
  a.idle += dt;
  if (w.anchor) a.sinceLine = -1; else if (a.wasLine) a.sinceLine = 0; else if (a.sinceLine >= 0) a.sinceLine += dt;
  a.wasLine = !!w.anchor;
  a.fall = (!w.anchor && !w.grounded && !w.climb && w.vy > 0) ? (a.fall || 0) + dt : 0;
  // feel fix 1: an empty J tap (no ring in reach) shows no draw pose; aiming always does
  const drawing = !w.anchor && (w.feelFix ? (w.aiming || ((w.bArmed || w.fireBuf > 0) && !!w.target)) : (w.bArmed || w.aiming || w.fireBuf > 0));
  a.draw = drawing ? (a.draw < 0 ? 0 : a.draw + dt) : -1;
  // run phase in frames: 16 fps at walkSpeed, scaled by speed (Brook: ~50 px per cycle)
  if (isRunning(w)) a.walk = ((a.walk || 0) + dt * WALK.fps * Math.abs(w.vx) / TUNING.walkSpeed) % WALK.frames;
  else a.walk = 0;
}

/** Stopgap bob (logical px, up is negative) while running without the run strip, fix1 only. */
export function walkBob(a, w, sheets) {
  if (!a || !w.feelFix || (sheets && sheets[WALK.sheet]) || !isRunning(w)) return 0;
  return (Math.floor(a.walk) % 4 < 2) ? 0 : -WALK.bobPx;
}

/** Which frame to show: { sheet, frame, coil (draw the art's rope), muzzle (live rope start) }.
 *  engineCloak(pose, sheets) says whether the engine cloak goes behind it. */
export function wrenPose(a, w, sheets) {
  if (sheets && isSwinging(w)) return { swing: swingPose(w, sheets), coil: false, muzzle: false };
  if (sheets && sheets[LEDGE_SHEET] && w.climb) { const p = ledgePose(w, sheets[LEDGE_SHEET]); if (p) return p; }
  // Dodge pose only. The dash itself is sim.js; this file never writes velocity or the rope.
  if (sheets && sheets[ROLL_SHEET] && w.dodge && !(a && a.draw >= 0)) {
    const n = sheets[ROLL_SHEET].frames || 4;
    const k = Math.max(0, Math.min(1, w.dodge.t / FEEL.dodgeTime));
    return { sheet: ROLL_SHEET, frame: Math.min(n - 1, Math.floor(k * n)), coil: true, muzzle: false, face: w.dodge.dir < 0 ? -1 : 1 };
  }
  if (sheets && sheets[ROLL_SHEET] && w.roll > 0 && w.grounded && !(a && a.draw >= 0)) return { sheet: ROLL_SHEET, frame: rollFrame(w, sheets[ROLL_SHEET]), coil: true, muzzle: false, face: w.rollDir < 0 ? -1 : 1 };
  if (sheets && sheets[FREEFALL_SHEET] && !(a && a.draw >= 0)) { const f = freefallFrame(a, w, sheets[FREEFALL_SHEET]); if (f >= 0) return { sheet: FREEFALL_SHEET, frame: f, coil: true, muzzle: false }; }
  if (sheets && sheets[AIR_SHEET] && !(a && a.draw >= 0)) { const f = airFrame(a, w, sheets[AIR_SHEET]); if (f >= 0) return { sheet: AIR_SHEET, frame: f, coil: true, muzzle: false }; }
  if (w.anchor) return { sheet: WREN_FIRE[0], frame: WREN_FIRE[1], coil: false, muzzle: true };
  if (a && a.draw >= 0) {
    const i = Math.min(WREN_DRAW.length - 1, Math.floor(a.draw / WREN_DRAW_FRAME + 1e-9));
    return { sheet: WREN_DRAW[i][0], frame: WREN_DRAW[i][1], coil: true, muzzle: false };
  }
  if (a && isRunning(w)) {
    const run = sheets && sheets[WALK.sheet];
    if (run) return { sheet: WALK.sheet, frame: Math.floor(a.walk) % (run.frames || WALK.frames), coil: true, muzzle: false };
    if (w.feelFix) return { sheet: 'lark-idle', frame: Math.floor(a.walk / 4) % 2, coil: true, muzzle: false, bob: walkBob(a, w, sheets) };
  }
  const bell = sheets && sheets[IDLE_BELL];
  if (bell) { // feel fix 2: Brook's bell idle (4 frames, its own fps; cloak and rope painted in)
    const n = bell.frames || 4;
    return { sheet: IDLE_BELL, frame: a ? Math.floor(a.idle * (bell.fps || 6)) % n : 0, coil: true, muzzle: false };
  }
  const f = a ? Math.floor(a.idle * WREN_IDLE_FPS) % 2 : 0;
  return { sheet: 'lark-idle', frame: f, coil: true, muzzle: false };
}
/** Feel fix 2 (Brook, Nov 3 2026): the standing idle, cloak and rope loop painted in. */
export const IDLE_BELL = 'lark-idle-bell';

// ---- Frames that paint their own cloak (Azzato via Vegapunk, Oct 28 2026) -----------------------
// Brook's motion strips (swing, air, freefall, yank) leave the cloak tail to the engine, except
// frames whose art already paints the whole cloak (the fall's spread poncho, the dive's
// streaming poncho, the front-mid swing). A manifest entry may carry `ownsCloak`: one bool for
// every frame or a per-frame list. While such a frame shows, the engine's cloak ribbon and tail
// are hidden; every other motion frame keeps them. Until Brook's manifest carries the flag,
// CLOAK_OWNERS is the default. The older strips (idle, cloak-open, gun-out) draw their own
// cloak as before (no engine cloak).
// Wren pass 4 (Brook, Oct 28 2026): the values below mirror art/in/manifest-swing-proposal.json;
// the manifest's own `ownsCloak` always wins. Roll and ledge never own it (engine tail shown).
export const MOTION_SHEETS = Object.freeze(['lark-swing', 'lark-air', 'lark-freefall', 'lark-yank', 'lark-roll', 'lark-ledge']);
export const CLOAK_OWNERS = Object.freeze({
  'lark-swing': Object.freeze([false, true, true, true, false, true, true, true]), // back-mid, bottom-tuck, front-mid, apex-hang, back-90, front-90 (pass 5)
  'lark-air': Object.freeze([false, false, true, true]), // release, rise, FALL (poncho halves spread as wings)
  'lark-freefall': Object.freeze([true, true, true]), // dive-0..2 (poncho streaming up)
  'lark-yank': Object.freeze([true, true]), // snap, launch
  'lark-roll': Object.freeze([false, false, false, false]),
  'lark-ledge': Object.freeze([false, false, false, false]),
});

/** Does this frame paint its own cloak? sheet: a loaded sheet (or manifest entry) with a name. */
export function ownsCloak(sheet, frame) {
  if (!sheet) return false;
  const v = sheet.ownsCloak !== undefined ? sheet.ownsCloak : CLOAK_OWNERS[sheet.name];
  if (Array.isArray(v)) return !!v[Math.min(frame, v.length - 1)];
  return !!v;
}

/** Should the engine draw its cloak ribbon and tail behind this pose? */
export function engineCloak(pose, sheets) {
  if (pose.swing) return !(!pose.swing.placeholder && ownsCloak(pose.swing.sheet, pose.swing.frame)); // the placeholder swing always trails it
  const sheet = sheets && sheets[pose.sheet];
  if (!sheet || !(MOTION_SHEETS.includes(pose.sheet) || pose.sheet === WALK.sheet)) return false; // the old 32 px run strip left the cloak to the engine (Brook)
  if (sheet.engineCloak === false) return false; // feel fix 2: the 48 px run and the bell idle paint cloak and rope tail themselves
  return !ownsCloak(sheet, pose.frame);
}

/** Freefall (lark-freefall dive loop): falling at FREEFALL_VY t/s or faster, off any line. */
export const FREEFALL_SHEET = 'lark-freefall';
export const FREEFALL_VY = 18;
/** Brook: "3-frame flutter (play 0,1,2,1)". */
export const FREEFALL_LOOP = Object.freeze([0, 1, 2, 1]);
export function freefallFrame(a, w, sheet) {
  if (w.anchor || w.grounded || w.climb || w.vy < FREEFALL_VY) return -1;
  const n = sheet.frames || 3;
  const loop = n === 3 ? FREEFALL_LOOP : [...Array(n).keys()];
  return loop[Math.floor((a ? a.idle : 0) * (sheet.fps || 10)) % loop.length];
}

/** Landing roll (lark-roll: land-tuck, roll-1, roll-2, rise) across the sim's roll time. */
export const ROLL_SHEET = 'lark-roll';
export function rollFrame(w, sheet) {
  const n = sheet.frames || 4;
  const k = 1 - Math.max(0, Math.min(1, w.roll / TUNING.rollTime));
  return Math.min(n - 1, Math.floor(k * n));
}

/** Ledge climb (lark-ledge: reach, hang, pull-up, crouch-top) across the sim's climb time. The
 *  frames are bbox-centred, not pivot-locked, so the frame is placed with its ledgeHand pixel
 *  (hand in 0-2, front toe in 3) on the lip corner pixel of the ledge she climbs. */
export const LEDGE_SHEET = 'lark-ledge';
export const LEDGE_FRAME_AT = Object.freeze([0.25, 0.5, 0.8]); // climb progress where frames 1, 2, 3 start
export function ledgeFrame(c) {
  const k = Math.max(0, Math.min(1, c.t / TUNING.climbTime));
  let f = 0; for (const e of LEDGE_FRAME_AT) if (k >= e) f++;
  return f;
}
/** The lip corner pixel (logical px) of the ledge a climb goes up: top row of the tile, its
 *  near column (the side she comes from). */
export function lipPx(c) {
  if (!c || !c.lip) return null;
  const face = c.face < 0 ? -1 : 1;
  return { x: face > 0 ? c.lip.col * TILE_PX : c.lip.col * TILE_PX + TILE_PX - 1, y: c.lip.row * TILE_PX, face };
}
export function ledgePose(w, sheet) {
  const lip = lipPx(w.climb); if (!lip) return null;
  const frame = ledgeFrame(w.climb);
  const hand = pointAt(sheet.ledgeHand, frame); if (!hand) return null;
  const hx = lip.face < 0 ? sheet.frameW - 1 - hand[0] : hand[0];
  return { sheet: LEDGE_SHEET, frame, coil: true, muzzle: false, face: lip.face, box: { left: lip.x - hx, top: lip.y - hand[1], w: sheet.frameW, h: sheet.frameH } };
}

/** Where the engine cloak/tail starts for this pose: the frame's tailAnchor (rotated with a
 *  rotated swing frame, then mirrored), in tile units; null = the engine's default shoulder. */
export function cloakOriginFor(sheets) {
  return (w, a) => {
    if (!sheets) return null;
    const pose = wrenPose(a, w, sheets);
    if (pose.swing) { const t = pose.swing.tail; return t ? { x: t.x / TILE_PX, y: t.y / TILE_PX } : null; }
    const sheet = sheets[pose.sheet];
    if (!sheet || !MOTION_SHEETS.includes(pose.sheet)) return null;
    const t = pointAt(sheet.tailAnchor, pose.frame); if (!t) return null;
    const face = pose.face || (w.face < 0 ? -1 : 1);
    const b = pose.box || frameBox(sheet, w.x * TILE_PX, w.y * TILE_PX, face);
    return { x: (b.left + (face < 0 ? sheet.frameW - 1 - t[0] : t[0]) + 0.5) / TILE_PX, y: (b.top + t[1] + 0.5) / TILE_PX };
  };
}

/** Frame box in logical px for a pose with her feet at (x, y): bottom-centre pivot. Art faces
 *  right; facing left mirrors around the pivot column. */
export function frameBox(sheet, x, y, face) {
  const [px, py] = sheet.pivot || [sheet.frameW / 2, sheet.frameH - 1];
  const left = Math.round(x) - (face < 0 ? sheet.frameW - 1 - px : px);
  const top = Math.round(y) - (py + 1);
  return { left, top, w: sheet.frameW, h: sheet.frameH };
}

/** Where a frame's muzzle is, in logical px (pixel centre), or null. */
export function muzzlePx(sheet, frame, x, y, face) {
  const m = muzzleAt(sheet, frame);
  if (!m) return null;
  const b = frameBox(sheet, x, y, face);
  return { x: b.left + (face < 0 ? sheet.frameW - 1 - m[0] : m[0]) + 0.5, y: b.top + m[1] + 0.5 };
}

/** The live rope's start in tile units for the line-out pose (fx.js pins the rope chain here). */
export function ropeOriginFor(sheets) {
  return (w) => {
    if (isSwinging(w)) { const p = swingPose(w, sheets); return { x: p.gx / TILE_PX, y: p.gy / TILE_PX }; }
    const s = sheets[WREN_FIRE[0]];
    const p = muzzlePx(s, WREN_FIRE[1], w.x * TILE_PX, w.y * TILE_PX, w.face);
    if (p) return { x: p.x / TILE_PX, y: p.y / TILE_PX };
    const t = s.tailAnchor; if (!t) return null;
    const b = frameBox(s, w.x * TILE_PX, w.y * TILE_PX, w.face);
    return { x: (b.left + (w.face < 0 ? s.frameW - 1 - t[0] : t[0]) + 0.5) / TILE_PX, y: (b.top + t[1] + 0.5) / TILE_PX };
  };
}

/** RGBA pixel data of one strip -> a copy with the coil (WH ramp at/below COIL_FROM_ROW) cleared. */
export function stripCoil(data, width, coilRgb, fromRow = COIL_FROM_ROW) {
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0 || Math.floor(i / 4 / width) < fromRow) continue;
    if (coilRgb.some((c) => c[0] === out[i] && c[1] === out[i + 1] && c[2] === out[i + 2])) out[i + 3] = 0;
  }
  return out;
}

// ---- Swing pose (FEEL-PLAN.md section 4) ----------------------------------------------------
// While she hangs on a line in the air the sprite hangs from its hands: the frame's `grip` pixel
// sits on the rope end and the frame turns about it. Brook's `lark-swing` strip (6 frames, 48x48,
// faces right, per-frame grip like muzzle) is picked by angle band; until it exists the
// placeholder is the gun-out side frame hung from its muzzle and turned to the rope.
export const SWING_SHEET = 'lark-swing';
export const SWING_FRAMES = Object.freeze(['back-high', 'back-mid', 'bottom-tuck', 'front-mid', 'front-high', 'apex-hang', 'back-90', 'front-90']);
const DEG = Math.PI / 180;
// Rotation rule (STYLE-GUIDE §5, approved by Pappag Oct 28 2026): the rope angle snaps to 16
// steps of 22.5 deg; the drawn frame nearest that step is picked (angleDeg from the manifest);
// if the leftover is 12.5 deg or less the frame is turned by it about its grip pixel
// (nearest-neighbour, whole px, cached at load), otherwise it is drawn unrotated. Steps above
// the anchor clamp to +-90 (never upside down). Rotate first, then mirror about the grip.
export const SWING_LOOK = Object.freeze({
  angles: 16, rotSteps: 16, // 360/16 = 22.5 deg steps (pixel art never turns smoothly)
  maxRotateDeg: 12.5, clampAboveDeg: 90,
  apexSpeed: 20 / 16, // t/s: slower than this along the arc, past apexMin, shows the apex hang
  apexMin: 20, // deg
  baked: [-65, -35, 0, 35, 65, 55, -90, 90], // fallback angleDeg (pass 5 order) (rope angle from straight down, + = ahead)
  leanMax: 10, // deg the placeholder body trails the rope at full speed (feet lag the hands)
  leanFull: 20, // t/s along the arc for the full lean
  gripLift: 10, // px: hands sit this far up the rope from her body centre
  rotateArt: true, // Pappag's OK, Oct 28 2026
  rotPad: 12, // px of transparent margin around a cached rotated frame
});
const APEX = 5;

/** grip may be one [x, y] for every frame or a per-frame list of [x, y] (same rule as muzzle). */
export const gripAt = (sheet, frame) => pointAt(sheet && sheet.grip, frame);

const snapAngle = (a, n) => { const s = (2 * Math.PI) / n; return Math.round(a / s) * s; };

/** Rope angle and travel for a world on a line: theta (rad from straight down, + = right of the
 *  anchor), along (t/s along +theta), s (travel sign), phi (deg, + = ahead of the bottom). */
export function swingState(w) {
  const cx = w.x; const cy = typeof w.center === 'function' ? w.center() : w.y;
  const dx = cx - w.anchor.x; const dy = cy - w.anchor.y;
  const theta = Math.atan2(dx, dy);
  const along = w.vx * Math.cos(theta) - w.vy * Math.sin(theta);
  const s = along > 0 ? 1 : along < 0 ? -1 : (w.face < 0 ? -1 : 1);
  return { theta, along, s, phi: (theta / DEG) * s, dist: Math.hypot(dx, dy), cx, cy };
}

/** The rope step (deg, + = ahead) for a travel-signed angle: 16 steps, clamped to +-90. */
export function swingStep(phiDeg, look = SWING_LOOK) {
  const s = 360 / look.rotSteps; const c = look.clampAboveDeg;
  return Math.max(-c, Math.min(c, Math.round(phiDeg / s) * s));
}
/** Pick the drawn frame and its leftover: { frame, step, leftover (deg), rotate }.
 *  angles: per-frame angleDeg (frame 5 = apex-hang, only by the apex rule). Pass 5 adds
 *  frames 6-7 (back-90, front-90): steps at and above +-90 then hold them unrotated. */
export function swingPick(st, angles = SWING_LOOK.baked, look = SWING_LOOK) {
  const step = swingStep(st.phi, look);
  let frame;
  if (angles.length > APEX && Math.abs(st.along) < look.apexSpeed && Math.abs(st.theta / DEG) > look.apexMin) frame = APEX;
  else { frame = 0; for (let i = 1; i < angles.length; i++) if (i !== APEX && Math.abs(angles[i] - step) < Math.abs(angles[frame] - step)) frame = i; }
  const leftover = +(step - angles[frame]).toFixed(3);
  return { frame, step, leftover, rotate: !!look.rotateArt && leftover !== 0 && Math.abs(leftover) <= look.maxRotateDeg + 1e-9 };
}
/** Which lark-swing frame (0..7) a swing state shows. */
export const swingBand = (st, angles) => swingPick(st, angles).frame;

/** Every (frame, leftover) a sheet can show rotated, for the load-time cache. */
export function rotationKeys(angles, look = SWING_LOOK) {
  const out = []; const seen = new Set(); const s = 360 / look.rotSteps;
  for (let f = 0; f < angles.length; f++) for (let k = -look.clampAboveDeg; k <= look.clampAboveDeg + 1e-9; k += s) {
    const l = +(k - angles[f]).toFixed(3);
    if (l === 0 || Math.abs(l) > look.maxRotateDeg + 1e-9) continue;
    const key = rotKey(f, l); if (!seen.has(key)) { seen.add(key); out.push({ frame: f, leftover: l, key }); }
  }
  return out;
}
export const rotKey = (frame, leftover) => `${frame}|${(+leftover).toFixed(1)}`;
/** Art-space turn for a leftover: + leftover = body further ahead (right in the art) = a
 *  counter-clockwise canvas turn about the grip. */
export const artRad = (leftover) => -leftover * DEG;

/** Rotate a point about the grip by rad (canvas sense, y down), whole px. */
export function rotatePoint(p, grip, rad) {
  const dx = p[0] - grip[0]; const dy = p[1] - grip[1]; const c = Math.cos(rad); const s = Math.sin(rad);
  return [Math.round(grip[0] + dx * c - dy * s), Math.round(grip[1] + dx * s + dy * c)];
}
/** Nearest-neighbour rotation of one RGBA frame about its grip pixel: every output pixel is a
 *  copy of a source pixel (palette kept, no smoothing). Output has pad px of margin on each
 *  side; the grip moves to grip + pad. Returns { data, w, h, grip }. */
export function rotateFrameData(src, fw, fh, grip, rad, pad = SWING_LOOK.rotPad) {
  const w = fw + pad * 2; const h = fh + pad * 2; const out = new Uint8ClampedArray(w * h * 4);
  const gx = grip[0] + pad; const gy = grip[1] + pad; const c = Math.cos(rad); const s = Math.sin(rad);
  for (let oy = 0; oy < h; oy++) for (let ox = 0; ox < w; ox++) {
    const dx = ox - gx; const dy = oy - gy;
    const sx = Math.round(grip[0] + dx * c + dy * s); const sy = Math.round(grip[1] - dx * s + dy * c);
    if (sx < 0 || sy < 0 || sx >= fw || sy >= fh) continue;
    const i = (sy * fw + sx) * 4; const o = (oy * w + ox) * 4;
    out[o] = src[i]; out[o + 1] = src[i + 1]; out[o + 2] = src[i + 2]; out[o + 3] = src[i + 3];
  }
  return { data: out, w, h, grip: [gx, gy] };
}

export const isSwinging = (w) => !!w.anchor && !w.grounded && !w.climb;

/** The swing draw: { sheet, frame, img, grip [x,y] frame px, rot rad, face, gx, gy (grip, logical px) }. */
export function swingPose(w, sheets) {
  const st = swingState(w);
  const face = st.s; // art faces right: she faces the way she is swinging
  const real = sheets[SWING_SHEET];
  // feel pass 1: the warp-pull uses Brook's yank strip too (pulled straight at the anchor, like a zip)
  const zip = w.yank || w.pull;
  const yank = zip && sheets[YANK_SHEET] && gripAt(sheets[YANK_SHEET], 0) ? sheets[YANK_SHEET] : null;
  const lift = Math.max(0, Math.min(SWING_LOOK.gripLift, st.dist * TILE_PX - 4));
  const gx = st.cx * TILE_PX - Math.sin(st.theta) * lift; const gy = st.cy * TILE_PX - Math.cos(st.theta) * lift;
  const real0 = yank || (real && gripAt(real, 0) ? real : null);
  if (real0) {
    // Brook's art: frame picked by angle (STYLE-GUIDE §5), turned only by the leftover, whole px
    let frame; let pick = null; let face = st.s;
    if (yank) { frame = zip.t < 1 / (yank.fps || 12) ? 0 : 1; face = Math.sign(w.anchor.x - st.cx) || (w.face < 0 ? -1 : 1); }
    else { pick = swingPick(st, real.angleDeg || SWING_LOOK.baked); frame = pick.frame; }
    const grip = gripAt(real0, frame);
    const rad = pick && pick.rotate ? artRad(pick.leftover) : 0;
    const t0 = pointAt(real0.tailAnchor, frame);
    const tr = t0 ? (rad ? rotatePoint(t0, grip, rad) : t0) : null;
    const tail = tr ? { x: Math.round(gx) + face * (tr[0] - grip[0]), y: Math.round(gy) + (tr[1] - grip[1]) } : null; // grip pixel centre sits at the rounded grip point
    return { sheet: real0, frame, grip, rot: face * rad, artRot: rad, rotKey: rad ? rotKey(frame, pick.leftover) : null, face, gx, gy, tail,
      band: frame, pick, state: st, placeholder: false, yank: !!yank };
  }
  const sheet = sheets[WREN_FIRE[0]]; const frame = WREN_FIRE[1]; const grip = muzzleAt(sheet, frame) || [sheet.frameW / 2, 8]; const rotate = true;
  // body centre in the frame: the pivot column, a third of the frame up from her feet
  const pv = sheet.pivot || [sheet.frameW / 2, sheet.frameH - 1];
  const cx = pv[0]; const cy = pv[1] - Math.round(sheet.frameH / 3);
  const alpha = Math.atan2(face * (cx - grip[0]), cy - grip[1]); // frame's hang angle (grip -> centre) from down
  const lean = -st.s * SWING_LOOK.leanMax * DEG * Math.min(1, Math.abs(st.along) / SWING_LOOK.leanFull);
  const rot = rotate ? snapAngle(alpha - st.theta + lean, SWING_LOOK.angles) : 0;
  return { sheet, frame, grip, rot, face, gx, gy, tail: null, band: swingBand(st), state: st, placeholder: true };
}

export const YANK_SHEET = 'lark-yank';

/** Draw a cached rotated frame (art space, already turned) with its grip at (x, y), mirrored
 *  about the grip when face < 0. r: { img, w, h, grip } from the load-time cache. */
export function drawRotatedFrame(ctx, r, x, y, face, artScale = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (face < 0) ctx.scale(-1, 1);
  ctx.drawImage(r.img, 0, 0, r.w * artScale, r.h * artScale, -r.grip[0] - 0.5, -r.grip[1] - 0.5, r.w, r.h);
  ctx.restore();
}

/** Draw a frame with its grip pixel at (x, y) screen px, turned by rot, mirrored when face < 0. */
export function drawGripFrame(ctx, sheet, frame, img, grip, x, y, rot, face, artScale = 1) {
  const fw = sheet.frameW * artScale; const fh = sheet.frameH * artScale;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot); if (face < 0) ctx.scale(-1, 1);
  ctx.drawImage(img, (frame % sheet.frames) * fw, 0, fw, fh, -grip[0] - 0.5, -grip[1] - 0.5, sheet.frameW, sheet.frameH);
  ctx.restore();
}

/** Air poses from lark-air [release, rise, fall, spread]. Release is 1 frame (Azzato, Oct 28).
 *  Spread (pass 5, STYLE-GUIDE section 5 table: 2 frames = fall reused + spread, 8 fps
 *  ping-pong): once she has been falling for SPREAD.after s, spread shows first, then fall and
 *  spread alternate. From rest the freefall dive (vy >= FREEFALL_VY 18 t/s) takes over about
 *  0.35 s after the apex (gravity 51 t/s/s), so `after` is 0.15 and the cycle opens on spread,
 *  or a plain drop would never show it (it did not at 0.25 s, fall first). A 3-frame strip
 *  (no spread) just holds fall. */
export const AIR_SHEET = 'lark-air';
export const SPREAD = Object.freeze({ frame: 3, after: 0.15, fps: 8 });
export function airFrame(a, w, sheet) {
  if (w.anchor || w.grounded) return -1;
  if (a && a.sinceLine >= 0 && a.sinceLine < 0.15) return 0;
  if (w.vy < 0) return 1;
  const n = sheet ? (sheet.frames || 3) : 3;
  const t = a ? (a.fall || 0) - SPREAD.after : -1;
  if (n > SPREAD.frame && t >= 0) return Math.floor(t * SPREAD.fps) % 2 ? 2 : SPREAD.frame;
  return 2;
}
