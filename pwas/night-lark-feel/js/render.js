// Placeholder renderer: coloured rects at the 480x270 logical frame, in locked-palette colours.
// Physics is in tiles; this is the only place that multiplies by TILE_PX.
// M2: lamp pools (edge at the hide radius), cones (SW0 fill, edge lerps SW1 -> AR3 with the
// meter), searchlight beams, the meter over the watcher who sees her, the grace "!", the search
// "?", the catch bark, the hidden look, the feathers HUD and the NIGHT OVER card.
import { VIEW_W, VIEW_H, HUD_H, TILE_PX, TUNING, HEALTH, FEELFIX, FEELFIX2 } from './config.js';
import { tileAt, isStandable, isWood } from './level.js';
import { promptText } from './prompts.js';
import { PLACEHOLDER as C, PALETTE, drawSprite, drawFrame, drawFrameBox, hexToRgb, ART_SCALE } from './art.js';
import { hasWren, wrenPose, ropeOriginFor, drawGripFrame, drawRotatedFrame, engineCloak } from './wren.js';
import { eyeOf } from './stealth.js';
import { drawText } from './font.js';
import { beamPolygon } from './los.js';
import { drawFacade, drawPieces, drawProps, drawArchAnchor } from './kit/draw.js';
import { drawBackdrop, drawLighting, drawCloak, drawRope, drawLarkLight, drawParticles, drawFlash } from './fx.js';
import { feelLines, tuneLines } from './feel.js';
import { lookOf, zoomInfo } from './zoom.js';

const hempRope = PALETTE.WH1; // Wren's live rope (no-fx path), the art's hemp ramp

/** Camera in logical px (v1 Tt adapted): look ahead in the facing direction, clamp to the
 *  room, and centre (letterbox) when the room is smaller than the view. M3: the top hud px of
 *  the screen are the HUD strip, so the playfield is the view below it (480x256 for a 30x16
 *  room, which then fills it exactly). Screen y = world px - cam.y. */
// Fall look-ahead (swing-feel, Azzato 9:13 PM: "the camera looks ahead downward when she falls
// fast"). Render-only state, kept per world and eased once per drawn frame by updateFallLook();
// cameraFor just reads it, so the sim never sees it. Numbers: starts at FALL_LOOK.from tiles/s
// of falling, full at .full, shifts the view down by up to .max of the play height.
export const FALL_LOOK = Object.freeze({ from: 12, full: 32, max: 0.34, ease: 6 });
const fallLook = new WeakMap();
export function updateFallLook(world, dt = 1 / 60) {
  const vy = world.anchor ? 0 : world.vy;
  const target = Math.max(0, Math.min(1, (vy - FALL_LOOK.from) / (FALL_LOOK.full - FALL_LOOK.from)));
  const cur = fallLook.get(world) || 0;
  const k = Math.min(1, FALL_LOOK.ease * dt * (target > cur ? 1 : 0.6)); // in quick, out a little slower
  const next = cur + (target - cur) * k;
  fallLook.set(world, next < 1e-3 ? 0 : next);
  return next;
}

export function cameraFor(world, view = { w: VIEW_W, h: VIEW_H, hud: HUD_H }) {
  const hud = view.hud ?? 0;
  const playH = view.h - hud;
  const roomW = world.level.cols * TILE_PX;
  const roomH = world.level.rows * TILE_PX;
  // feel fix 1: the look-ahead is eased (zoom.js) toward the direction of travel, so a turn
  // never snaps the camera 48 px; legacy worlds keep the instant face * 24
  const lk = world.feelFix ? lookOf(world) : null;
  // whole logical px: then her drawn x relative to the screen never flickers 1 px while it eases
  const look = lk == null ? null : Math.round(lk);
  let cx = world.x * TILE_PX - view.w / 2 + (look ?? world.face * 24 * (TILE_PX / 16));
  let cy = world.y * TILE_PX - hud - playH * (0.62 - FALL_LOOK.max * (fallLook.get(world) || 0));
  cx = roomW <= view.w ? -(view.w - roomW) / 2 : Math.max(0, Math.min(roomW - view.w, cx));
  cy = roomH <= playH ? -hud - (playH - roomH) / 2 : Math.max(-hud, Math.min(roomH - view.h, cy));
  return { x: Math.round(cx) + 0, y: Math.round(cy) + 0 }; // +0: no -0 when centred
}

/** Render interpolation (feel fix 1): draw her between the last two sim steps, alpha = the
 *  loop's leftover accumulator / dt. world.px/py are the position at the start of the last step
 *  (sim.js). The world is restored before this returns; a jump of over 2 tiles (respawn, room
 *  change, teleport) is drawn where she is. */
export function withLerp(world, alpha, fn) {
  if (!world || !world.feelFix || alpha == null || world.px == null) return fn();
  const x = world.x; const y = world.y;
  const a = Math.max(0, Math.min(1, alpha));
  if (Math.abs(x - world.px) > 2 || Math.abs(y - world.py) > 2) return fn();
  world.x = world.px + (x - world.px) * a; world.y = world.py + (y - world.py) * a;
  try { return fn(); } finally { world.x = x; world.y = y; }
}

/** Speed trail (feel fix 1): grows with the chain, FEELFIX.trailPerChain points per level,
 *  sampled once per drawn frame. Render only. */
const trails = new WeakMap();
function stepTrail(world) {
  let t = trails.get(world); if (!t) { t = []; trails.set(world, t); }
  const n = (world.chain || 0) * FEELFIX.trailPerChain;
  if (n > 0 && !world.grounded) t.unshift({ x: world.x, y: world.center ? world.center() : world.y - 1 });
  else if (t.length) t.pop();
  if (t.length > n) t.length = Math.max(n, t.length - 2); // shrinks over a few frames, never pops
  return t;
}
function drawTrail(ctx, world, cam, t) {
  if (!t || t.length < 2) return;
  const T = TILE_PX;
  for (let i = 1; i < t.length; i++) {
    const k = 1 - i / t.length;
    ctx.globalAlpha = 0.15 + 0.55 * k;
    ctx.fillStyle = i < t.length / 3 ? PALETTE.WL2 : i < (2 * t.length) / 3 ? PALETTE.WL1 : PALETTE.WL0;
    const sz = k > 0.5 ? 2 : 1;
    ctx.fillRect(Math.round(t[i].x * T - cam.x) - (sz >> 1), Math.round(t[i].y * T - cam.y) - (sz >> 1), sz, sz);
  }
  ctx.globalAlpha = 1;
}

export function render(ctx, world, sheets = null, opts = {}) {
  const T = TILE_PX;
  const fx = opts.fx || null; // M5 look layers (fx.js); without it the M4 placeholder look is drawn
  if (!opts.still) updateFallLook(world);
  const cam = cameraFor(world);
  if (fx) { const o = fx.offset(); cam.x += o.x; cam.y += o.y; }
  const L = world.level;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = C.sky;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (fx) drawBackdrop(ctx, fx, world, cam);
  const kit = (sheets && sheets.kit) || null; // Brook's tower kit atlases, if loaded
  drawFacade(ctx, L, cam, T, { w: VIEW_W, h: VIEW_H }, kit); // tower kit layer a (art only)
  // lamp pools: the visible edge is the hide-rule radius, so what you see is the rule
  for (const l of L.lamps) {
    const lx = l.x * T - cam.x; const ly = l.y * T - cam.y; const R = TUNING.hideLampRadius * T;
    ctx.globalAlpha = 0.16; ctx.fillStyle = C.lampPool;
    ctx.beginPath(); ctx.arc(lx, ly, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = C.lampEdge; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(lx, ly, R - 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // columns past the room's sides are its stone walls (tileAt), drawn when the view is wider
  const c0 = Math.floor(cam.x / T); const c1 = Math.floor((cam.x + VIEW_W) / T);
  // feel fix 1 (zoom): rows above and below the room are stone too, so a wide view never shows void
  const outRows = !!world.feelFix;
  const r0 = outRows ? Math.floor((cam.y + HUD_H) / T) : Math.max(0, Math.floor(cam.y / T));
  const r1 = outRows ? Math.floor((cam.y + VIEW_H) / T) : Math.min(L.rows - 1, Math.floor((cam.y + VIEW_H) / T));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const ch = (r < 0 || r >= L.rows) ? '#' : tileAt(L, c, r); const x = c * T - cam.x; const y = r * T - cam.y;
    if (ch === '#' || ch === 's') {
      ctx.fillStyle = ch === 's' ? C.shadow : C.ground; ctx.fillRect(x, y, T, T);
      if (isStandable(L, c, r, world.doorsOpen)) { ctx.fillStyle = ch === 's' ? C.shadowTop : C.groundTop; ctx.fillRect(x, y, T, 2); }
    } else if (isWood(ch)) {
      // one-way wooden beam: a plank across the top third of the tile, gaps between boards
      const sh = ch === '~';
      ctx.fillStyle = sh ? C.shadowWood : C.wood; ctx.fillRect(x, y, T, 6);
      ctx.fillStyle = sh ? C.shadowWoodTop : C.woodTop; ctx.fillRect(x, y, T, 1);
      ctx.fillStyle = C.woodGap; ctx.fillRect(x + T - 1, y + 1, 1, 5);
    } else if (ch === 'b') { ctx.fillStyle = C.hideStone; ctx.fillRect(x + 1, y + 2, T - 2, T - 2); }
    else if (ch === 'D' && !world.doorsOpen) { ctx.fillStyle = C.door; ctx.fillRect(x + 2, y, T - 4, T); }
    else if (ch === 'L') { // M4: a snuffed lamp (no longer in level.lamps) shows a dark glass
      const lit = L.lamps.some((l) => Math.floor(l.x) === c && Math.floor(l.y) === r);
      if (lit && kit && L.pieces && kit.cells['hanging-lantern']) continue; // the kit lantern art is the lamp
      ctx.fillStyle = C.lampHousing; ctx.fillRect(x + 4, y + 2, 8, 2); ctx.fillStyle = lit ? C.lamp : C.shadow; ctx.fillRect(x + 5, y + 4, 6, 5);
    }
  }
  drawPieces(ctx, L, cam, T, { w: VIEW_W, h: VIEW_H }, kit); // tower kit layer b art over its tiles
  if (fx) drawLighting(ctx, fx, world, cam); // darkness + light pools; rings, items, guards stay crisp on top
  const target = world.anchor ? null : (world.controls === 'v2' ? world.target : world.bestRing());
  drawProps(ctx, L, cam, T, kit); // tower kit layer c
  for (const r of L.rings) {
    if (r.kind && r.kind !== 'ring') { drawArchAnchor(ctx, r, cam, T, r === target); continue; }
    const rx = Math.round(r.x * T - cam.x); const ry = Math.round(r.y * T - cam.y);
    ctx.fillStyle = C.ring; ctx.fillRect(rx - 4, ry - 4, 8, 8);
    ctx.fillStyle = C.sky; ctx.fillRect(rx - 2, ry - 2, 4, 4);
    if (r === target) { // the outline you see before you press B
      ctx.strokeStyle = C.ringTarget; ctx.lineWidth = 1; ctx.strokeRect(rx - 6.5, ry - 6.5, 13, 13);
    }
  }
  if (world.aiming && world.aimDir) drawAimLine(ctx, world, cam, T); // feel fix 2: the aim line
  if (world.aiming && world.reticle) { // manual aim: snapping reticle (corner brackets)
    const rx = Math.round(world.reticle.x * T - cam.x); const ry = Math.round(world.reticle.y * T - cam.y);
    ctx.fillStyle = C.reticle;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.fillRect(rx + sx * 9 - (sx < 0 ? 0 : 3), ry + sy * 9 - (sy < 0 ? 0 : 1), 4, 1);
      ctx.fillRect(rx + sx * 9 - (sx < 0 ? 0 : 1), ry + sy * 9 - (sy < 0 ? 0 : 3), 1, 4);
    }
  }
  for (const it of L.items) {
    ctx.fillStyle = C[{ m: 'mote', n: 'note', E: 'exit', k: 'key', '*': 'spark' }[it.t]] || C.hud;
    const s = it.t === 'E' ? 12 : 6;
    ctx.fillRect(Math.round(it.x * T - cam.x) - s / 2, Math.round(it.y * T - cam.y) - s / 2, s, s);
  }
  drawWatchers(ctx, world, cam, sheets);
  const wren = hasWren(sheets); // Brook's Wren strips loaded: draw her art, not the placeholder
  if (world.feelFix) { const tr = opts.still ? trails.get(world) : stepTrail(world); drawTrail(ctx, world, cam, tr); }
  if (fx) {
    drawRope(ctx, fx, world, cam, { noTail: wren, hemp: wren });
    if (!wren) drawCloak(ctx, fx, world, cam); // her strips draw the cloak themselves
  } else if (world.anchor) {
    const from = wren ? ropeOriginFor(sheets)(world) : { x: world.x, y: world.center() };
    ctx.strokeStyle = wren ? hempRope : C.rope; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(Math.round(world.anchor.x * T - cam.x) + 0.5, Math.round(world.anchor.y * T - cam.y) + 0.5);
    ctx.lineTo(Math.round(from.x * T - cam.x) + 0.5, Math.round(from.y * T - cam.y) + 0.5);
    ctx.stroke();
  }
  if (wren) { drawWren(ctx, world, cam, sheets, fx); if (fx) drawParticles(ctx, fx, cam); }
  // The Lark: placeholder body sized from the physics box (v1 tuning for now).
  if (!wren) drawPlaceholderLark(ctx, world, cam, sheets, fx);
  drawMeter(ctx, world, cam);
  if (fx) drawFlash(ctx, fx);
  drawOverlays(ctx, world, opts);
}

function drawPlaceholderLark(ctx, world, cam, sheets, fx) {
  const T = TILE_PX;
  const bw = TUNING.halfWidth * 2 * T; const bh = world.h * T;
  const lx = world.x * T - cam.x; const ly = world.y * T - cam.y;
  const left = Math.round(lx - bw / 2); const top = Math.round(ly - bh);
  if (world.hidden) ctx.globalAlpha = 0.5; // hidden: value x0.5 (desaturate comes with real art)
  drawSprite(ctx, sheets, 'lark', 0, lx, ly, { w: bw, h: bh });
  ctx.fillStyle = C.larkMask; ctx.fillRect(left, top + 1, Math.round(bw), 2);
  ctx.globalAlpha = 1;
  if (world.hidden) {
    ctx.fillStyle = C.ghostRim; ctx.fillRect(left, top - 1, Math.round(bw), 1); // ghost rim, top edge only
    const blink = (world.time % 2.5) < 2 / 60;
    if (!blink) { ctx.fillStyle = C.larkGlint; ctx.fillRect(Math.round(lx + (world.face > 0 ? 1 : -2)), top + 2, 1, 1); }
  } else {
    ctx.fillStyle = C.larkAccent; ctx.fillRect(Math.round(lx + (world.face > 0 ? 1 : -3)), top + 4, 2, 2);
  }
  if (fx) { drawLarkLight(ctx, fx, world, cam, { left, top, w: Math.round(bw), h: Math.round(bh) }); drawParticles(ctx, fx, cam); }
}

/** Wren from her strips (wren.js picks the pose). Hidden: half alpha. Lit: an LG2 silhouette
 *  added at ~35% (the sprite-shaped version of the placeholder's lit box). */
function drawWren(ctx, world, cam, sheets, fx) {
  const pose = wrenPose(fx ? fx.wren : null, world, sheets);
  if (pose.swing) { drawSwingWren(ctx, world, cam, pose.swing, fx, engineCloak(pose, sheets)); return; }
  const sheet = sheets[pose.sheet];
  if (fx && engineCloak(pose, sheets)) drawCloak(ctx, fx, world, cam); // motion frames that leave the cloak to the engine
  const x = world.x * TILE_PX - cam.x; const y = world.y * TILE_PX - cam.y + (pose.bob || 0);
  const face = pose.face || (world.face < 0 ? -1 : 1);
  // a pose with its own box (the ledge climb: ledgeHand on the lip) is placed by that box
  const draw = (img) => (pose.box ? drawFrameBox(ctx, sheet, pose.frame, Math.round(pose.box.left - cam.x), Math.round(pose.box.top - cam.y), face, img)
    : drawFrame(ctx, sheet, pose.frame, x, y, face, img));
  if (world.hidden) ctx.globalAlpha = 0.5;
  draw(pose.coil ? sheet.img : (sheet.noCoil || sheet.img));
  ctx.globalAlpha = 1;
  if (world.lit && !world.hidden) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
    draw((pose.coil ? sheet.lit : sheet.litNoCoil) || sheet.img);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}

/** On a line in the air: hang from the grip, turned to the rope; the cloak chain trails behind. */
function drawSwingWren(ctx, world, cam, p, fx, cloak = true) {
  if (fx && cloak) drawCloak(ctx, fx, world, cam); // hidden while the frame paints its own (ownsCloak)
  const sheet = p.sheet; const x = p.gx - cam.x; const y = p.gy - cam.y;
  const img = sheet.noCoil || sheet.img;
  // a rotated Brook frame comes from the load-time cache (nearest-neighbour, palette exact);
  // without one (no DOM cache) fall back to a canvas turn with smoothing off
  const r = p.rotKey && sheet.rotCache ? sheet.rotCache.get(p.rotKey) : null;
  const draw = (variant, im) => (r ? drawRotatedFrame(ctx, { ...r, img: r[variant] || r.base }, x, y, p.face, ART_SCALE)
    : drawGripFrame(ctx, sheet, p.frame, im, p.grip, x, y, p.rot, p.face, ART_SCALE));
  if (world.hidden) ctx.globalAlpha = 0.5;
  draw('base', img);
  ctx.globalAlpha = 1;
  if (world.lit && !world.hidden) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
    draw('lit', sheet.litNoCoil || sheet.lit || img);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}

function drawOverlays(ctx, world, opts) {
  drawHud(ctx, world);
  if (world.prompt) {
    const txt = promptText(world.prompt.text, opts.device || 'key');
    const wpx = txt.length * 8;
    const px = Math.round(VIEW_W / 2 - wpx / 2);
    ctx.fillStyle = C.promptBg; ctx.fillRect(px - 6, VIEW_H - 44, wpx + 10, 18);
    drawText(ctx, txt, px, VIEW_H - 40, C.prompt, 2);
  }
  if (opts.paused) {
    ctx.globalAlpha = 0.6; ctx.fillStyle = C.overlay; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
    drawText(ctx, 'PAUSED', VIEW_W / 2 - 24, VIEW_H / 2 - 5, C.hud, 2);
  }
  if (world.note) world.note.forEach((line, i) => drawText(ctx, line, 16, VIEW_H - 64 + i * 8, C.hud, 1));
  if (world.phase === 'through') drawText(ctx, 'THROUGH', VIEW_W / 2 - 28, VIEW_H / 2 - 5, C.hud, 2);
  if (world.phase === 'night-over') {
    ctx.globalAlpha = 0.8; ctx.fillStyle = C.overlay; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1;
    centerText(ctx, 'NIGHT OVER', VIEW_H / 2 - 22, C.hud, 3);
    centerText(ctx, `CAUGHT ${world.catches} TIMES`, VIEW_H / 2 + 2, C.hudDim, 1);
    if (world.overT >= TUNING.nightOverDelay) centerText(ctx, `${promptText('{A}', opts.device || 'key')} OR START: A NEW NIGHT`, VIEW_H / 2 + 16, C.hud, 1);
  }
  if (world.abilities?.pullGrapple) drawText(ctx, world.grappleMode === 'pull' ? 'G PULL' : 'G SWING', VIEW_W - 34, HUD_H + 3, C.hudDim || C.hud, 1);
  if (opts.debug) drawText(ctx, `X ${world.x.toFixed(2)} Y ${world.y.toFixed(2)}`, 8, HUD_H + 4, C.hud, 1);
  if (opts.feel) feelLines(world).forEach((line, i) => drawText(ctx, line, 4, HUD_H + 4 + i * 7, C.hud, 1));
  if (opts.tune) {
    const lines = tuneLines(world, opts.zoomInfo || zoomInfo(world));
    const y0 = HUD_H + 4 + (opts.feel ? 56 : 0);
    ctx.globalAlpha = 0.6; ctx.fillStyle = C.promptBg; ctx.fillRect(2, y0 - 2, 172, lines.length * 7 + 3); ctx.globalAlpha = 1;
    lines.forEach((line, i) => drawText(ctx, line, 4, y0 + i * 7, C.hud, 1));
  }
}

const centerText = (ctx, txt, y, color, scale) => drawText(ctx, txt, Math.round(VIEW_W / 2 - (txt.length * 4 * scale) / 2), y, color, scale);

function lerpHex(a, b, t) {
  const A = hexToRgb(a); const B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

/** Cones and beams. Fill SW0 at ~18%; the edge lerps SW1 -> AR3 as the meter fills for the
 *  watcher who has her; full meter / grace "!" = solid AR3 edge and AR2 fill at 20%. */
function drawWatchers(ctx, world, cam, sheets) {
  const T = TILE_PX; const L = world.level;
  const fan = (ex, ey, a0, a1, R, o, poly = null) => {
    const alert = o.state === 'alert';
    const m = world.meterSrc === o || alert ? (alert ? 1 : world.meter) : 0;
    ctx.globalAlpha = alert ? 0.2 : 0.18; ctx.fillStyle = alert ? C.coneSeen : C.cone;
    ctx.beginPath();
    if (poly) { ctx.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]); }
    else { ctx.moveTo(ex, ey); ctx.arc(ex, ey, R, a0, a1); }
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = alert ? C.coneAlertEdge : lerpHex(C.coneEdge, C.coneAlertEdge, m); ctx.lineWidth = 1;
    ctx.stroke();
  };
  for (const s of L.searchlights || []) {
    const ex = s.x * T - cam.x; const ey = s.y * T - cam.y;
    // M3: the beam stops at stone (same samples as its line of sight), wood lets it through
    const poly = beamPolygon(L, s.x, s.y, s.angle - s.half, s.angle + s.half, s.range, 24, world.doorsOpen);
    fan(ex, ey, s.angle - s.half, s.angle + s.half, s.range * T, s, poly.map((p) => [p.x * T - cam.x, p.y * T - cam.y]));
    ctx.fillStyle = C.searchlight; ctx.fillRect(Math.round(ex) - 4, Math.round(ey) - 3, 8, 6);
    ctx.fillStyle = C.searchlightCore; ctx.fillRect(Math.round(ex) - 2, Math.round(ey) - 1, 4, 2);
  }
  for (const g of L.guards) {
    const ex = g.x * T - cam.x + (g.state === 'stagger' ? -Math.sign(g.kbVx || g.dir || 1) * 2 : 0);
    const ey = (g.floorY - TUNING.guardEyeHeight) * T - cam.y;
    const f = g.dir > 0 ? 0 : Math.PI; const A = TUNING.coneHalfAngle;
    if (g.state !== 'tied') fan(ex, ey, f - A, f + A, TUNING.coneRange * T, g); // M4 Tie-Line: no cone
    drawSprite(ctx, sheets, 'guard', 0, ex, g.floorY * T - cam.y);
    ctx.fillStyle = C.guardCap; ctx.fillRect(Math.round(ex - 5), Math.round(g.floorY * T - cam.y) - 16, 10, 2);
    ctx.fillStyle = C.guardDark; ctx.fillRect(Math.round(ex + (g.dir > 0 ? 2 : -4)), Math.round(ey) - 1, 2, 2); // which way he looks
    const head = { x: ex, y: g.floorY * T - cam.y - 20 };
    if (g.state === 'search' || g.state === 'listen') drawText(ctx, '?', head.x - 1, head.y - 6, C.hud, 1);
    if (g.state === 'tied') { // the line wound round him
      ctx.fillStyle = C.rope;
      for (const dy of [7, 11, 15]) ctx.fillRect(Math.round(ex - 6), Math.round(g.floorY * T - cam.y) - dy, 12, 1);
    }
  }
}

/** The meter sits over the watcher who sees her (BRIEF HUD rule), plus the "!" and the bark. */
function drawMeter(ctx, world, cam) {
  const T = TILE_PX;
  const src = world.phase === 'caught' ? world.caughtBy : (world.alert ? world.alert.src : world.meterSrc);
  if (!src || (world.meter <= 0 && !world.alert && world.phase !== 'caught')) return;
  const e = eyeOf(src);
  const x = Math.round(e.x * T - cam.x); const y = Math.round((src.kind === 'guard' ? src.floorY - 1.6 : e.y - 0.6) * T - cam.y);
  const full = !!world.alert || world.phase === 'caught';
  if (full) { // the "!" in AR2/AR3 with a UI0 outline
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawText(ctx, '!', x - 3 + dx, y - 12 + dy, C.bangOutline, 2);
    drawText(ctx, '!', x - 3, y - 12, C.bang, 2);
    ctx.fillStyle = C.bangHi; ctx.fillRect(x - 1, y - 12, 1, 2);
  }
  ctx.fillStyle = C.meterBg; ctx.fillRect(x - 9, y, 18, 4);
  ctx.fillStyle = C.meterFill; ctx.fillRect(x - 8, y + 1, Math.round(16 * Math.min(1, world.meter)), 2);
  if (world.phase === 'caught') {
    const bark = "IT'S BATGUY!";
    const w = bark.length * 4;
    ctx.fillStyle = C.promptBg; ctx.fillRect(x - w / 2 - 3, y - 26, w + 5, 10);
    drawText(ctx, bark, x - w / 2, y - 24, C.hud, 1);
  }
}

/** The HUD strip across the top (HUD_H px, outside the playfield): feathers (or a life gauge,
 *  HEALTH.hud) on the left, the room name on the right. */
function drawHud(ctx, world) {
  ctx.fillStyle = C.hudStrip; ctx.fillRect(0, 0, VIEW_W, HUD_H);
  const name = String(world.level.name || '');
  drawText(ctx, name, VIEW_W - 8 - name.length * 4, 5, C.hud, 1);
  const max = Math.max(world.maxFeathers, world.feathers);
  if (HEALTH.hud === 'gauge') {
    ctx.fillStyle = C.featherLost; ctx.fillRect(8, 6, 40, 5);
    ctx.fillStyle = C.feather; ctx.fillRect(8, 6, Math.round((40 * world.feathers) / max), 5);
    return;
  }
  for (let i = 0; i < max; i++) {
    ctx.fillStyle = i < world.feathers ? C.feather : C.featherLost;
    const x = 8 + i * 9; // a small quill: shaft and vane
    ctx.fillRect(x + 3, 4, 1, 9); ctx.fillRect(x + 1, 5, 2, 5); ctx.fillRect(x + 4, 6, 2, 4);
  }
}

/** Feel fix 2 aim line: a dotted line from her centre to the reticle (or along the aim when
 *  nothing is picked). Whole pixels, the reticle colour. */
function drawAimLine(ctx, world, cam, T) {
  const x0 = world.x * T - cam.x; const y0 = world.center() * T - cam.y;
  let x1, y1;
  if (world.reticle) { x1 = world.reticle.x * T - cam.x; y1 = world.reticle.y * T - cam.y; }
  else { const r = 6 * T; x1 = x0 + world.aimDir.x * r; y1 = y0 + world.aimDir.y * r; }
  const len = Math.hypot(x1 - x0, y1 - y0); if (len < 1) return;
  const dash = FEELFIX2.aimLineDash; const n = Math.floor(len / dash);
  ctx.fillStyle = C.reticle;
  for (let i = 2; i < n - 2; i++) { // a dot every dash px, clear of her and of the brackets
    const t = (i * dash) / len;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1);
  }
  if (world.grappleMode === 'pull') drawText(ctx, 'PULL', Math.round(x0) - 7, Math.round(y0) - 22, C.reticle, 1);
}
