// Brook sprite draws for rooms: autotiled harbor tiles, lamps, pickups, guards, HUD, reticle,
// hook-head, moon-mast pieces, mini-towers. Placeholder rects stay if a sheet is missing.
import { TILE_PX, HUD_H, VIEW_W, HEALTH } from './config.js';
import { tileAt, isStandable, isWood, isStone } from './level.js';
import { PLACEHOLDER as C, PALETTE, blitFrame, drawFrame, frameSrc } from './art.js';
import { drawText } from './font.js';
import { muzzlePx, wrenPose, ropeOriginFor, hasWren } from './wren.js';
import { miniTowerFoot } from './mini-tower.js';

const GUARD_ANIMS = Object.freeze({ walk: [0, 5], turn: 6, alert: 7, search: [8, 9], tied: 10 });
const PICKUP_ROW = Object.freeze({ m: 0, n: 1, k: 2, '*': 3 });
const POWERUP_FRAME = Object.freeze({
  'soft-soles': 0, 'long-line': 1, 'quick-reel': 2, smoke: 3, cloak: 5, snuffer: 6, 'double-line': 7, 'tie-line': 12,
});

function solid(ch) { return ch === '#' || ch === 's' || ch === 'b' || ch === 'D'; }
function nameIndex(sheet, name) {
  const n = sheet && sheet.tileNames ? sheet.tileNames.indexOf(name) : -1;
  return n;
}

/** Autotile frame for a stone/wood/shadow cell from tiles-harbor (+ b1 extras). */
export function tileFrameName(level, c, r, doorsOpen) {
  const ch = tileAt(level, c, r);
  const up = tileAt(level, c, r - 1);
  const dn = tileAt(level, c, r + 1);
  const lf = tileAt(level, c - 1, r);
  const rt = tileAt(level, c + 1, r);
  if (ch === 'b') return 'hide_stone';
  if (isWood(ch)) {
    const sh = ch === '~';
    if (!solid(lf) && !isWood(lf)) return sh ? 'plank_shadow_l' : 'plank_l';
    if (!solid(rt) && !isWood(rt)) return sh ? 'plank_shadow_r' : 'plank_r';
    return sh ? 'plank_shadow_mid' : 'beam_h';
  }
  if (ch === 's') {
    if (!solid(up)) {
      if (!solid(lf)) return 'shadow_floor_top_l';
      if (!solid(rt)) return 'shadow_floor_top_r';
      return 'shadow_floor_top';
    }
    return 'shadow_floor_fill';
  }
  if (ch === '#') {
    if (!solid(up)) {
      if (!solid(lf) && !solid(rt)) return 'ledge_mid';
      if (!solid(lf)) return 'floor_top_l';
      if (!solid(rt)) return 'floor_top_r';
      return 'floor_top';
    }
    if (!solid(dn)) return 'floor_bottom';
    if (!solid(lf)) return 'floor_side_l';
    if (!solid(rt)) return 'floor_side_r';
    return (c + r) % 3 === 0 ? 'wall_b' : (c + r) % 5 === 0 ? 'wall_cracked' : 'wall_a';
  }
  return null;
}

export function drawHarborTile(ctx, sheets, level, c, r, cam, T, doorsOpen) {
  const ch = tileAt(level, c, r);
  const x = c * T - cam.x; const y = r * T - cam.y;
  const harbor = sheets && sheets['tiles-harbor'];
  const b1 = sheets && sheets['tiles-harbor-b1'];
  const name = tileFrameName(level, c, r, doorsOpen);
  const frameOf = (sheet, n) => {
    if (!sheet || !n) return -1;
    if (sheet.tileNames) { const i = sheet.tileNames.indexOf(n); return i; }
    return -1;
  };
  let sheet = harbor; let fr = frameOf(harbor, name);
  if (fr < 0) { sheet = b1; fr = frameOf(b1, name); }
  if (sheet && fr >= 0 && sheet.img) { blitFrame(ctx, sheet, fr, x, y); return true; }
  return false;
}

export function drawLampSprite(ctx, sheets, lamp, cam, T, lit = true) {
  const company = lamp.kind !== 'home' && sheets && sheets['lamp-company'];
  const home = sheets && sheets.lamp;
  const sheet = company || home;
  if (!sheet || !sheet.img) return false;
  const frame = lit ? 0 : 1;
  drawFrame(ctx, sheet, frame, lamp.x * T - cam.x, lamp.y * T - cam.y, 1);
  const pool = company && sheets['lamp-company-pool'];
  if (pool && pool.img && lit) {
    const px = lamp.x * T - cam.x - (pool.pivot?.[0] || 48);
    const py = lamp.y * T - cam.y + 8;
    blitFrame(ctx, pool, 0, px, py);
  }
  return true;
}

export function drawPickupSprite(ctx, sheets, it, cam, T, time) {
  if (it.t === 'E') {
    const hatch = sheets && sheets['exit-hatch'];
    if (hatch && hatch.img) {
      drawFrame(ctx, hatch, 0, it.x * T - cam.x, it.y * T - cam.y + 8, 1);
      return true;
    }
    return false;
  }
  const glim = it.t === 'm' && sheets && sheets['pickups-glimmer'];
  const pick = sheets && sheets.pickups;
  const sheet = glim || pick;
  if (!sheet || !sheet.img) return false;
  let frame = Math.floor((time || 0) * (sheet.fps || 8)) % 4;
  if (!glim && pick) {
    const row = PICKUP_ROW[it.t];
    if (row == null) return false;
    frame = row * 4 + frame;
  }
  drawFrame(ctx, sheet, frame, it.x * T - cam.x, it.y * T - cam.y, 1);
  return true;
}

export function guardFrame(g, time) {
  if (g.state === 'tied') return GUARD_ANIMS.tied;
  if (g.state === 'alert') return GUARD_ANIMS.alert;
  if (g.state === 'search' || g.state === 'listen') return GUARD_ANIMS.search[Math.floor((time || 0) * 4) % 2];
  if (g.state === 'stagger') return GUARD_ANIMS.alert;
  return Math.abs(Math.floor(g.x * 2)) % 6;
}

export function drawGuardSprite(ctx, sheets, g, cam, T, time) {
  const sheet = (sheets && (sheets['guard-watchman-v2'] || sheets['guard-watchman']));
  if (!sheet || !sheet.img) return false;
  const face = g.dir < 0 ? -1 : 1;
  const x = g.x * T - cam.x;
  const y = g.floorY * T - cam.y;
  drawFrame(ctx, sheet, guardFrame(g, time), x, y, face);
  return true;
}

export function drawGrappleMarker(ctx, sheets, r, cam, T, targeted) {
  const sheet = sheets && sheets['grapple-marker'];
  if (!sheet || !sheet.img) return false;
  drawFrame(ctx, sheet, targeted ? 1 : 0, r.x * T - cam.x, r.y * T - cam.y, 1);
  return true;
}

export function drawReticleSprite(ctx, sheets, world, cam, T) {
  const sheet = sheets && sheets.reticle;
  if (!sheet || !sheet.img || !world.reticle) return false;
  const frame = world.grappleMode === 'pull' ? 2 : 1;
  drawFrame(ctx, sheet, frame, world.reticle.x * T - cam.x, world.reticle.y * T - cam.y, 1);
  return true;
}

export function gunHookPx(world, sheets, cam, T) {
  if (sheets && hasWren(sheets)) {
    const o = ropeOriginFor(sheets)(world);
    if (o) return { x: o.x * T - cam.x, y: o.y * T - cam.y };
  }
  // fallback: gun-out muzzle-ish, or hook-head tip 7,4 in front of her
  const face = world.face < 0 ? -1 : 1;
  return { x: world.x * T - cam.x + face * 10, y: (world.center ? world.center() : world.y - 0.5) * T - cam.y - 4 };
}

export function drawHookHead(ctx, sheets, from, to) {
  const sheet = sheets && sheets['hook-head'];
  if (!sheet || !sheet.img) return;
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const tip = sheet.tip || [7, 4];
  const pv = sheet.pivot || [0, 4];
  ctx.save();
  ctx.translate(Math.round(to.x), Math.round(to.y));
  ctx.rotate(ang);
  ctx.drawImage(sheet.img, 0, 0, sheet.frameW, sheet.frameH, -tip[0], -tip[1], sheet.frameW, sheet.frameH);
  ctx.restore();
}

export function drawSearchlightProp(ctx, sheets, s, cam, T) {
  const big = s.size === 'big' && sheets && sheets['searchlight-prop-32'];
  const small = sheets && sheets['searchlight-head'];
  const sheet = big || small;
  if (!sheet || !sheet.img) return false;
  drawFrame(ctx, sheet, 1, s.x * T - cam.x, s.y * T - cam.y, 1);
  return true;
}

export function drawHudBand(ctx, sheets) {
  const band = sheets && sheets['hud-band'];
  if (!band || !band.img) {
    ctx.fillStyle = C.hudStrip; ctx.fillRect(0, 0, VIEW_W, HUD_H); return;
  }
  blitFrame(ctx, band, 0, 0, 0);
  const mid = 16;
  for (let x = 16; x < VIEW_W - 16; x += mid) blitFrame(ctx, band, 1, x, 0);
  blitFrame(ctx, band, 2, VIEW_W - 16, 0);
}

export function drawFeathers(ctx, sheets, world) {
  const feather = sheets && sheets.feather;
  const max = Math.max(world.maxFeathers, world.feathers);
  if (HEALTH.hud === 'gauge') {
    ctx.fillStyle = C.featherLost; ctx.fillRect(8, 6, 40, 5);
    ctx.fillStyle = C.feather; ctx.fillRect(8, 6, Math.round((40 * world.feathers) / max), 5);
    return;
  }
  for (let i = 0; i < max; i++) {
    const x = 3 + i * 14;
    if (feather && feather.img) blitFrame(ctx, feather, i < world.feathers ? 0 : 1, x, 0);
    else {
      ctx.fillStyle = i < world.feathers ? C.feather : C.featherLost;
      ctx.fillRect(x + 3, 4, 1, 9); ctx.fillRect(x + 1, 5, 2, 5); ctx.fillRect(x + 4, 6, 2, 4);
    }
  }
}

export function drawPowerupIcon(ctx, sheets, id, x, y, size = 7) {
  const sheet = sheets && (size > 16 ? sheets['powerups-32'] : sheets['powerups-16']);
  const fr = POWERUP_FRAME[id];
  if (sheet && sheet.img && fr != null) {
    const { sx, sy, fw, fh } = frameSrc(sheet, fr);
    ctx.drawImage(sheet.img, sx, sy, fw, fh, x, y, size, size);
    return true;
  }
  return false;
}

export function drawMoonPieces(ctx, sheets, level, cam, T) {
  for (const q of level.pieces || []) {
    if (!q.piece || !String(q.piece).startsWith('moon-')) continue;
    const sheet = sheets && sheets[q.piece];
    if (!sheet || !sheet.img) continue;
    blitFrame(ctx, sheet, q.frame || 0, q.c * T - cam.x, q.r * T - cam.y);
  }
}

export function drawMiniTowers(ctx, sheets, level, cam, T) {
  for (const t of level.miniTowers || []) {
    const name = t.stack === 'tall' ? 'mini-tower-stack-tall' : 'mini-tower-stack';
    const sheet = sheets && sheets[name];
    const f = miniTowerFoot(t);
    if (sheet && sheet.img) drawFrame(ctx, sheet, t.relit ? 1 : 0, f.x * T - cam.x, f.y * T - cam.y, 1);
    if (t.relit && sheets['mini-tower-pool']) {
      const pool = sheets['mini-tower-pool'];
      blitFrame(ctx, pool, 0, f.x * T - cam.x - (pool.pivot?.[0] || 80), f.y * T - cam.y - (pool.pivot?.[1] || 12));
    }
  }
}

export { POWERUP_FRAME };
