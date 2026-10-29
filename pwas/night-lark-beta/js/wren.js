// Wren (the Lark) sprite poses from Brook's strips (art/manifest.json names lark-idle,
// lark-cloak-open, lark-gun-out). Look only: reads world state, never writes the sim.
// Gameplay is side view. Without all three strips loaded the renderer keeps the placeholder
// rect, so a build with the committed (HEAD) art looks exactly as before.
//
// Pose rules (Arlong, Oct 28 2026):
//  - at rest the strips' own rope coil at her feet is the rope; the engine draws no tail;
//  - gun draw = cloak-open frames, then the gun-out frame, played quickly while B is down
//    (the sim fires on release, so the draw never delays a shot);
//  - while the line is out (fire until reeled in / let go) she holds the side gun-out frame
//    with the coil hidden, and the live rope starts at that frame's muzzle. Never two ropes.
import { TILE_PX } from './config.js';

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

/** muzzle may be one [x, y] for every frame or a per-frame list of [x, y]. */
export function muzzleAt(sheet, frame) {
  const m = sheet && sheet.muzzle;
  if (!Array.isArray(m) || !m.length) return null;
  if (Array.isArray(m[0])) return m[Math.min(frame, m.length - 1)] || null;
  return m;
}

export function createWrenAnim() { return { draw: -1, idle: 0 }; }

/** One fixed step. draw >= 0 while the draw is running or held (B down, aiming, or a buffered tap). */
export function stepWrenAnim(a, w, dt) {
  a.idle += dt;
  const drawing = !w.anchor && (w.bArmed || w.aiming || w.fireBuf > 0);
  a.draw = drawing ? (a.draw < 0 ? 0 : a.draw + dt) : -1;
}

/** Which frame to show: { sheet, frame, coil (draw the art's rope), muzzle (live rope start) }. */
export function wrenPose(a, w) {
  if (w.anchor) return { sheet: WREN_FIRE[0], frame: WREN_FIRE[1], coil: false, muzzle: true };
  if (a && a.draw >= 0) {
    const i = Math.min(WREN_DRAW.length - 1, Math.floor(a.draw / WREN_DRAW_FRAME + 1e-9));
    return { sheet: WREN_DRAW[i][0], frame: WREN_DRAW[i][1], coil: true, muzzle: false };
  }
  const f = a ? Math.floor(a.idle * WREN_IDLE_FPS) % 2 : 0;
  return { sheet: 'lark-idle', frame: f, coil: true, muzzle: false };
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
