// M4 screens (BUILD-PLAN M4): draws game.js state. Title, the Returned shelf, the start card,
// the room (render.js) plus the M4 overlays (power-up icons, smoke, cloak, barks), pause, perch,
// night over, the reveal (placeholder staging), the end card and the Stash pick.
// Every string here must be drawable with font.js (test/m4-strings.test.mjs).
import { VIEW_W, VIEW_H, HUD_H, TILE_PX, TUNING } from './config.js';
import { PALETTE as P, PLACEHOLDER as C } from './art.js';
import { drawText } from './font.js';
import { render, cameraFor } from './render.js';
import { promptText } from './prompts.js';
import { POWERUPS, TIERS, byId, activeSynergies } from './powerups.js';
import { RETURNED, rankFor, fmtTime } from './run.js';
import { REVEAL } from './game.js';

const tierCol = (tier, i = 1) => P[TIERS[tier].ramp[i]];
const center = (ctx, txt, y, color, scale = 1) => drawText(ctx, txt, Math.round(VIEW_W / 2 - (txt.length * 4 * scale) / 2), y, color, scale);
function fill(ctx, color, a = 1) { ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(0, 0, VIEW_W, VIEW_H); ctx.globalAlpha = 1; }
function box(ctx, x, y, w, h, border, bg = C.overlay) {
  ctx.fillStyle = border; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = bg; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}
const A = (dev) => promptText('{A}', dev);

/** A power-up icon: a tier-coloured gem, 7x7. */
function icon(ctx, id, x, y) {
  const p = byId(id); if (!p) return;
  ctx.fillStyle = tierCol(p.tier, 2); ctx.fillRect(x, y, 7, 7);
  ctx.fillStyle = tierCol(p.tier, 1); ctx.fillRect(x + 1, y + 1, 5, 5);
  ctx.fillStyle = tierCol(p.tier, 0); ctx.fillRect(x + 3, y + 3, 3, 3);
}

/** All the static strings the screens can draw (for the font test). */
export function screenStrings() {
  const out = ['NIGHT LARK', 'THE RETURNED SHELF', '? ? ?', 'PAUSED', 'HELD:', 'NOTHING YET', 'START: RESUME',
    'SELECT: QUIT TO TITLE', 'THE PERCH: TAKE ONE', 'NIGHT OVER', 'THE STASH STAYS:', 'SELECT: TITLE',
    'LAMPS OUT. LARK OUT.', 'THE STASH: KEEP ONE FOR NEXT NIGHT', 'NONE', 'RANK', 'TIME', 'CAUGHT', 'INTEL',
    "TONIGHT: THE HARBORMASTER'S TOWER.", 'PREPARING THE TOWER...', 'SMOKE', 'COMMON', 'RARE', 'LEGENDARY',
    'NIGHTS CLEARED:', 'BEST RANK:', 'M: SOUND', 'ARROWS: MOVE', 'SYNERGY:', 'RETURNED TO', 'NIGHT', 'STASH:',
    'COMMON AND RARE ONLY. IT STAYS THROUGH A LOST NIGHT.', 'ARROWS: CHOOSE', 'TAKE IT', 'KEEP IT', 'OR START: A NEW NIGHT',
    'NEXT', 'BACK', 'PRESS', 'CHOOSE', 'MOTION: FULL', 'MOTION: REDUCED'];
  for (const p of POWERUPS) out.push(p.name, ...p.text);
  for (const r of RETURNED) out.push(r.name, r.owner, r.line, `TAKE BACK ${r.name}.`);
  for (const pg of REVEAL) out.push(pg.who, ...pg.lines);
  return out;
}

export function drawGame(ctx, game, sheets = null, opts = {}) {
  const dev = opts.device || 'key';
  ctx.imageSmoothingEnabled = false;
  const s = game.screen;
  if (s === 'play' || s === 'pause' || s === 'perch') {
    drawRoom(ctx, game, sheets, opts);
    if (s === 'pause') drawPause(ctx, game, dev);
    if (s === 'perch') drawPerch(ctx, game, dev);
    return;
  }
  fill(ctx, C.sky);
  if (s === 'title') drawTitle(ctx, game, dev);
  else if (s === 'shelf') drawShelf(ctx, game, dev);
  else if (s === 'card') drawCard(ctx, game, dev);
  else if (s === 'over') drawOver(ctx, game, dev);
  else if (s === 'reveal') drawReveal(ctx, game, dev);
  else if (s === 'end') drawEnd(ctx, game, dev);
  else if (s === 'stash') drawStash(ctx, game, dev);
}

function drawTitle(ctx, game, dev) {
  // a placeholder skyline: the tower against the night
  ctx.fillStyle = P.NV0; ctx.fillRect(0, 190, VIEW_W, 80);
  ctx.fillStyle = P.SL1; ctx.fillRect(330, 60, 60, 140); ctx.fillRect(350, 40, 20, 20);
  ctx.fillStyle = P.LG3; ctx.fillRect(356, 48, 8, 6);
  center(ctx, 'NIGHT LARK', 40, C.hud, 4);
  game.menu().forEach((m, i) => {
    const sel = i === game.sel;
    drawText(ctx, `${sel ? '> ' : '  '}${m}`, 140, 110 + i * 22, sel ? P.IX1 : C.hudDim, 2);
  });
  drawText(ctx, `NIGHTS CLEARED: ${game.save.clears}`, 8, VIEW_H - 22, C.hudDim, 1);
  drawText(ctx, `ARROWS: MOVE  ${A(dev)}: CHOOSE  M: SOUND`, 8, VIEW_H - 12, C.hudDim, 1);
}

function drawShelf(ctx, game, dev) {
  center(ctx, 'THE RETURNED SHELF', 16, C.hud, 2);
  RETURNED.forEach((r, i) => {
    const y = 48 + i * 40;
    const got = game.save.returned.includes(r.id);
    ctx.fillStyle = got ? P.TB2 : P.UI1; ctx.fillRect(40, y + 22, 400, 3);
    if (got) {
      ctx.fillStyle = P.PX3; ctx.fillRect(52, y + 6, 14, 16);
      drawText(ctx, r.name, 80, y + 4, C.hud, 2);
      drawText(ctx, `RETURNED TO ${r.owner}`, 80, y + 22 - 8 + 0, C.hudDim, 1);
    } else drawText(ctx, '? ? ?', 80, y + 4, C.hudDim, 2);
  });
  drawText(ctx, `${A(dev)}: BACK`, 8, VIEW_H - 12, C.hudDim, 1);
}

function drawCard(ctx, game, dev) {
  fill(ctx, P.NV0);
  center(ctx, `NIGHT ${game.seed}`, 50, C.hudDim, 1);
  center(ctx, "TONIGHT: THE HARBORMASTER'S TOWER.", 80, C.hud, 2);
  const target = game.run ? game.run.target : null;
  if (target) center(ctx, `TAKE BACK ${target.name}.`, 110, P.IX1, 2);
  if (game.save.stash) {
    const p = byId(game.save.stash);
    const t = `STASH: ${p.name}`;
    const x = Math.round(VIEW_W / 2 - (t.length * 4 + 10) / 2);
    icon(ctx, p.id, x, 149); drawText(ctx, t, x + 10, 150, C.hud, 1);
  }
  if (!game.tower) center(ctx, 'PREPARING THE TOWER...', 200, C.hudDim, 1);
  else if (game.t > 0.3) center(ctx, `PRESS ${A(dev)}`, 200, C.hud, 2);
}

function drawRoom(ctx, game, sheets, opts) {
  const w = game.world; const r = game.run;
  render(ctx, w, sheets, { ...opts, paused: false });
  const cam = cameraFor(w); const T = TILE_PX;
  if (opts.fx) { const o = opts.fx.offset(); cam.x += o.x; cam.y += o.y; } // M5 shake, same as render()
  // smoke clouds
  for (const c of w.smokes || []) {
    ctx.globalAlpha = 0.55 * Math.min(1, c.t / 0.5); ctx.fillStyle = P.FX2;
    ctx.beginPath(); ctx.arc(c.x * T - cam.x, c.y * T - cam.y, c.r * T, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // the cloak: a dark ring round her
  if (w.cloaked) {
    ctx.globalAlpha = 0.6; ctx.strokeStyle = P.PR0; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(w.x * T - cam.x, (w.y - 0.5) * T - cam.y, 12, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // HUD: power-ups after the feathers, smoke left, floor
  let x = 8 + Math.max(w.maxFeathers, w.feathers) * 9 + 8;
  for (const id of r.held) { icon(ctx, id, x, 4); x += 9; }
  if (w.smoke > 0) { drawText(ctx, `SMOKE ${w.smoke}`, x + 4, 5, C.hud, 1); }
  // barks over the watcher
  if (game.bark && w.phase === 'play') {
    const src = game.bark.src;
    const bx = src ? src.x * T - cam.x : VIEW_W / 2;
    const by = src ? ((src.floorY ?? src.y) - 2.4) * T - cam.y : HUD_H + 20;
    const t = game.bark.text; const bw = t.length * 4;
    ctx.fillStyle = C.promptBg; ctx.fillRect(Math.round(bx - bw / 2 - 3), Math.round(by - 2), bw + 5, 10);
    drawText(ctx, t, Math.round(bx - bw / 2), Math.round(by), C.hud, 1);
  }
  if (game.toast) {
    const t = game.toast.text; const tw = t.length * 8;
    ctx.fillStyle = C.promptBg; ctx.fillRect(VIEW_W / 2 - tw / 2 - 6, HUD_H + 8, tw + 12, 20);
    center(ctx, t, HUD_H + 12, P.IX1, 2);
  }
}

function drawPause(ctx, game, dev) {
  fill(ctx, C.overlay, 0.75);
  center(ctx, 'PAUSED', 30, C.hud, 3);
  const r = game.run;
  drawText(ctx, 'HELD:', 40, 70, C.hudDim, 1);
  if (!r.held.length) drawText(ctx, 'NOTHING YET', 40, 84, C.hudDim, 1);
  r.held.forEach((id, i) => {
    const p = byId(id); const y = 84 + i * 18;
    icon(ctx, id, 40, y);
    drawText(ctx, p.name, 52, y, tierCol(p.tier, 2), 1);
    drawText(ctx, `${p.text[0]} ${p.text[1]}`, 52, y + 8, C.hudDim, 1);
  });
  activeSynergies(r.held).forEach((sy, i) => drawText(ctx, `SYNERGY: ${sy.name} - ${sy.text}`, 40, 200 + i * 10, P.PL2, 1));
  center(ctx, `START: RESUME   SELECT: QUIT TO TITLE`, VIEW_H - 16, C.hud, 1);
}

function drawPerch(ctx, game, dev) {
  fill(ctx, C.overlay, 0.8);
  center(ctx, 'THE PERCH: TAKE ONE', 24, C.hud, 2);
  const n = game.offer.length; const cw = 140; const gap = 12;
  const x0 = Math.round(VIEW_W / 2 - (n * cw + (n - 1) * gap) / 2);
  game.offer.forEach((id, i) => {
    const p = byId(id); const x = x0 + i * (cw + gap); const y = 60; const sel = i === game.sel;
    box(ctx, x, y - (sel ? 6 : 0), cw, 140, sel ? tierCol(p.tier, 2) : tierCol(p.tier, 0));
    const yy = y - (sel ? 6 : 0);
    ctx.fillStyle = tierCol(p.tier, 1); ctx.fillRect(x + 1, yy + 1, cw - 2, 14);
    drawText(ctx, TIERS[p.tier].name, x + 6, yy + 5, C.overlay, 1);
    ctx.save(); ctx.translate(x + cw / 2 - 10, yy + 26); ctx.scale(3, 3); icon(ctx, id, 0, 0); ctx.restore();
    drawText(ctx, p.name, Math.round(x + cw / 2 - p.name.length * 4), yy + 60, C.hud, 2);
    p.text.forEach((l, k) => drawText(ctx, l, Math.round(x + cw / 2 - l.length * 2), yy + 84 + k * 10, C.hudDim, 1));
    const sy = activeSynergies([...game.run.held, id]).filter((s) => s.needs.includes(id));
    sy.forEach((s, k) => drawText(ctx, `SYNERGY: ${s.name}`, Math.round(x + cw / 2 - (9 + s.name.length) * 2), yy + 112 + k * 10, P.PL2, 1));
  });
  center(ctx, `ARROWS: CHOOSE   ${A(dev)}: TAKE IT`, VIEW_H - 24, C.hud, 1);
}

function drawOver(ctx, game, dev) {
  fill(ctx, C.overlay);
  center(ctx, 'NIGHT OVER', 70, C.hud, 3);
  center(ctx, `CAUGHT ${game.run.catches} TIMES`, 110, C.hudDim, 1);
  if (game.save.stash) center(ctx, `THE STASH STAYS: ${byId(game.save.stash).name}`, 130, C.hudDim, 1);
  if (game.t >= TUNING.nightOverDelay) center(ctx, `${A(dev)} OR START: A NEW NIGHT   SELECT: TITLE`, 170, C.hud, 1);
}

/** The reveal, placeholder staging: big pixel figures and the lines, page by page. */
function drawReveal(ctx, game, dev) {
  fill(ctx, P.NV0);
  const pg = REVEAL[Math.min(game.reveal, REVEAL.length - 1)];
  // the Lark: purple cloak, lavender front, the mask (off once unmasked)
  const unmasked = REVEAL.findIndex((p) => p.unmask) <= game.reveal;
  const lx = pg.stinger ? 120 : VIEW_W / 2 - 24; const ly = 60;
  ctx.fillStyle = C.lark; ctx.fillRect(lx, ly, 48, 96);
  ctx.fillStyle = C.larkFront; ctx.fillRect(lx + 12, ly + 36, 24, 52);
  ctx.fillStyle = unmasked ? P.WS2 : C.larkMask; ctx.fillRect(lx + 8, ly + 12, 32, 12);
  ctx.fillStyle = unmasked ? P.WS0 : C.larkGlint; ctx.fillRect(lx + 14, ly + 16, 4, 4); ctx.fillRect(lx + 30, ly + 16, 4, 4);
  if (pg.stinger) { // two watchmen, gaping
    for (const gx of [300, 350]) {
      ctx.fillStyle = C.guard; ctx.fillRect(gx, ly + 24, 30, 72);
      ctx.fillStyle = C.guardCap; ctx.fillRect(gx - 2, ly + 20, 34, 6);
    }
  }
  if (pg.who) center(ctx, pg.who, 176, C.hudDim, 1);
  pg.lines.forEach((l, i) => center(ctx, l, 190 + i * 20, C.hud, 2));
  if (game.t > 0.4) drawText(ctx, `${A(dev)}: NEXT`, VIEW_W - 60, VIEW_H - 12, C.hudDim, 1);
}

function drawEnd(ctx, game, dev) {
  const r = game.run; const item = r.target;
  fill(ctx, P.NV0);
  center(ctx, `RETURNED TO ${item.owner}`, 18, C.hudDim, 1);
  center(ctx, item.name, 32, C.hud, 2);
  center(ctx, `"${item.line}"`, 56, P.IX1, 1);
  const rank = rankFor(r.catches, r.motes, r.totalMotes);
  drawText(ctx, 'RANK', 80, 90, C.hudDim, 1);
  drawText(ctx, rank, 80, 104, rank === 'S' ? P.PL2 : C.hud, 8);
  const rows = [['TIME', fmtTime(r.time)], ['CAUGHT', String(r.catches)], ['INTEL', `${r.motes}/${r.totalMotes}`]];
  const best = game.save.bestRankBySeed[r.seed];
  if (best) rows.push(['BEST RANK:', best]);
  rows.forEach(([k, v], i) => { drawText(ctx, k, 220, 96 + i * 20, C.hudDim, 1); drawText(ctx, v, 310, 92 + i * 20, C.hud, 2); });
  center(ctx, 'LAMPS OUT. LARK OUT.', 210, C.hud, 2);
  if (game.t > 0.6) center(ctx, `PRESS ${A(dev)}`, 244, C.hudDim, 1);
}

function drawStash(ctx, game, dev) {
  center(ctx, 'THE STASH: KEEP ONE FOR NEXT NIGHT', 24, C.hud, 2);
  center(ctx, 'COMMON AND RARE ONLY. IT STAYS THROUGH A LOST NIGHT.', 46, C.hudDim, 1);
  game.stashOptions().forEach((id, i) => {
    const y = 70 + i * 20; const sel = i === game.sel;
    if (id) { icon(ctx, id, 150, y + 3); drawText(ctx, byId(id).name, 164, y, sel ? P.IX1 : C.hud, 2); }
    else drawText(ctx, 'NONE', 164, y, sel ? P.IX1 : C.hudDim, 2);
    if (sel) drawText(ctx, '>', 134, y, P.IX1, 2);
  });
  center(ctx, `ARROWS: CHOOSE   ${A(dev)}: KEEP IT`, VIEW_H - 16, C.hud, 1);
}
