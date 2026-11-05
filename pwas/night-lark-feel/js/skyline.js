// Hub-and-spoke skyline (gaps-b3d). Layers placed per skyline-levels.json for relit
// state 0 / 2 / 4. Draw order from the JSON `order` when present, else back-to-front.
import { VIEW_W, VIEW_H, HUD_H, TILE_PX } from './config.js';
import { blitFrame } from './art.js';

export function skylineRelitCount(n) {
  if (n >= 4) return 4;
  if (n >= 2) return 2;
  return 0;
}

function tileX(w, scroll, cam) {
  const span = w || 960;
  const x = -((cam.x * scroll) % span);
  return x;
}

function drawTiled(ctx, sheet, cam, scroll, y, frame = 0) {
  if (!sheet || !sheet.img) return;
  const w = sheet.frameW;
  const x0 = tileX(w, scroll, cam);
  for (let x = x0 - w; x < VIEW_W + w; x += w) blitFrame(ctx, sheet, frame, x, y);
}

/** Draw the hub-and-spoke skyline behind a room. relit: 0, 2 or 4. */
export function drawSkyline(ctx, sheets, world, cam) {
  const spec = sheets.skyline;
  const relit = skylineRelitCount(world.level?.skylineRelit ?? world.runRelit ?? 0);
  const state = spec?.states?.[String(relit)] || spec?.states?.['0'] || [];
  const sky = sheets['bg-b3d-sky'];
  if (sky) drawTiled(ctx, sky, cam, 0.08, HUD_H);
  const far = sheets['bg-harbor-far-v32'];
  if (far) drawTiled(ctx, far, cam, 0.15, VIEW_H - far.frameH + 40);
  const glow = sheets['bg-hub-glow'];
  if (glow) { ctx.globalAlpha = 0.55; drawTiled(ctx, glow, cam, 0.12, HUD_H); ctx.globalAlpha = 1; }
  const core = relit >= 4 ? sheets['bg-core-near'] : relit >= 2 ? sheets['bg-core-side'] : sheets['bg-core-far'];
  if (core) {
    const x = relit >= 2 ? VIEW_W - core.frameW - 20 - cam.x * 0.12 : (VIEW_W - core.frameW) / 2 - cam.x * 0.1;
    blitFrame(ctx, core, 0, x, HUD_H + 8);
  }
  const hoodsB = sheets['bg-hoods-back'];
  if (hoodsB) drawTiled(ctx, hoodsB, cam, 0.22, VIEW_H - hoodsB.frameH - 8);
  const mid = sheets['bg-harbor-mid-v32'];
  if (mid) drawTiled(ctx, mid, cam, 0.35, VIEW_H - Math.min(mid.frameH, 220));
  const hoodsF = sheets['bg-hoods-front-v2'];
  if (hoodsF) drawTiled(ctx, hoodsF, cam, 0.45, VIEW_H - hoodsF.frameH);
  const moon = sheets['bg-harbor-moon'];
  if (moon) blitFrame(ctx, moon, 0, VIEW_W - 72 - cam.x * 0.05, HUD_H + 18);
  // spoke towers: 4 slots, relit per state names
  const spoke = sheets['bg-spoke-tower'];
  if (spoke) {
    const names = ['harbor', 'docks', 'clocktower', 'cathedral'];
    for (let i = 0; i < 4; i++) {
      const on = state.includes(names[i]);
      const tall = i % 2 === 0;
      const frame = (tall ? 0 : 1) + (on ? 2 : 0); // tall/short x shell/relit
      const x = 40 + i * 110 - cam.x * 0.18;
      blitFrame(ctx, spoke, frame, x, VIEW_H - spoke.frameH + 20);
      if (on && sheets['bg-spoke-glow']) blitFrame(ctx, sheets['bg-spoke-glow'], 0, x - 80, VIEW_H - 160);
    }
  }
}

/** Front parallax (kit-harbor-front / hoods) over the playfield. */
export function drawFrontParallax(ctx, sheets, world, cam) {
  const front = sheets.kit && sheets.kit.cells && Object.values(sheets.kit.cells).find((c) => c.layer === 'front' || c.layer === 'd');
  // kit-harbor-front is loaded as a kit atlas; draw a couple of cells if present
  const kit = sheets.kit;
  if (!kit) return;
  const cells = ['rafter', 'chain', 'cargo', 'beam-front'].map((id) => kit.cells[id]).filter(Boolean);
  if (!cells.length) return;
  const T = TILE_PX;
  cells.forEach((cell, i) => {
    const x = ((i * 180) - cam.x * 0.7 % 480);
    const y = HUD_H + 8 + (i % 2) * 20;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(cell.img, cell.x, cell.y, cell.w, cell.h, x, y, cell.w, cell.h);
    ctx.globalAlpha = 1;
  });
}
