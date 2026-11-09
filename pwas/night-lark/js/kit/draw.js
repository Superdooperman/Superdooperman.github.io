// Tower kit drawing: Brook's atlases (art/in/kit-harbor-*.png/.json, loaded by js/art.js loadArt
// into sheets.kit) when present, else the flat placeholder art below (FEEL-PLAN §9.4).
// Every colour is a palette entry: STYLE-GUIDE §3 v1 base (SL, NV, TB, PX, IX, LG) plus the
// §3b Harbormaster's Tower accents (HA1 rust, HA2 verdigris). Interact cyan IX0/IX1 is used for
// grapple points only. Banners follow STYLE-GUIDE section 3c (DECIDED, Azzato, Oct 28 2026):
// Company banners (the default) are a GD2 field, GD1 folds, GD0 outline and a PX3 crest; PX1
// faded print red only for small (at most 1 tile wide), old, torn banners and posters. Never
// alarm red, never a gold crest, nothing glows.
import { PALETTE as P } from '../art.js';
import { tileAt, isGrating } from '../level.js';
import { PROP_TYPES, propGrip, propW } from './props.js';

export const KIT_COLORS = Object.freeze({
  wall: P.SL1, mortar: P.SL0, wallHi: P.SL2,
  glass: P.NV0, litGlass: P.LG1, frame: P.SL2, arch: P.NV0, recess: P.SL0, bars: P.SL3,
  beam: P.TB2, beamDark: P.TB1, beamHi: P.TB3,
  company: P.GD2, companyFold: P.GD1, companyLine: P.GD0, crest: P.PX3, // Company banner
  banner: P.PX1, bannerDark: P.PX0, paper: P.PX2, // small torn PX1 banners and posters
  iron: '#2E2726', // HA1 wet rust (STYLE-GUIDE §3b)
  verdigris: '#2F5A50', // HA2 lantern-room iron (§3b)
  stone: P.SL3, stoneDark: P.SL2, rope: P.WH0,
  grip: P.IX0, // every grapple point's outline (IX0 #3A9ED6)
  target: P.IX1, // the chosen target's outline (IX1 #8FDCFF)
});
const K = KIT_COLORS;

/** A Company banner: GD0 outline, GD2 field, GD1 fold lines, PX3 crest (a stencil chevron),
 *  swallowtail foot. Whole px. Used for anything wider than 1 tile. */
export function companyBanner(ctx, x, y, w, h) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = K.companyLine; ctx.fillRect(x - 1, y - 1, w + 2, h + 1);
  ctx.fillStyle = K.company; ctx.fillRect(x, y, w, h - 4);
  const half = Math.floor(w / 2);
  ctx.fillRect(x, y + h - 4, half - 1, 4); ctx.fillRect(x + half + 1, y + h - 4, w - half - 1, 4); // swallowtail
  ctx.fillStyle = K.companyFold; for (let i = 3; i < w - 1; i += 5) ctx.fillRect(x + i, y + 2, 1, h - 7);
  if (w >= 8 && h >= 14) { // crest: a PX3 chevron over a bar, centred in the upper third
    const cx = x + half; const cy = y + Math.max(3, Math.floor(h / 4)); const k = Math.max(2, Math.floor(w / 5));
    ctx.fillStyle = K.crest;
    for (let i = 0; i <= k; i++) { ctx.fillRect(cx - k + i - 1, cy + i, 1, 1); ctx.fillRect(cx + k - i, cy + i, 1, 1); }
    ctx.fillRect(cx - k, cy + k + 2, k * 2, 1);
  }
}
/** A small, old, torn PX1 banner or poster (1 tile wide at most): PX0 ink edge, ragged foot,
 *  variant 1 is a newsprint (PX2) poster with PX0 ink and a PX1 stripe. */
export function tornBanner(ctx, x, y, w, h, variant = 0) {
  x = Math.round(x); y = Math.round(y); w = Math.min(w, 16);
  ctx.fillStyle = variant ? K.paper : K.banner; ctx.fillRect(x, y, w, h - 3);
  for (let i = 0; i < w; i++) if ((i * 7 + h) % 3) ctx.fillRect(x + i, y + h - 3, 1, ((i * 5) % 3) + 1); // ragged
  ctx.fillStyle = K.bannerDark; ctx.fillRect(x, y, w, 1);
  if (variant) { ctx.fillRect(x + 2, y + 3, w - 4, 1); ctx.fillRect(x + 2, y + 5, w - 6, 1); ctx.fillStyle = K.banner; ctx.fillRect(x + 1, y + h - 8, w - 2, 2); }
  else { ctx.fillRect(x + w - 3, y + 4, 2, 2); ctx.fillStyle = K.paper; ctx.fillRect(x + 2, y + Math.floor(h / 2), 3, 3); } // a tear and a newsprint patch
}

function course(ctx, x, y, w, h) { // ashlar courses: mortar every 8 px, staggered joints
  ctx.fillStyle = K.mortar;
  for (let yy = 0; yy < h; yy += 8) {
    ctx.fillRect(x, y + yy, w, 1);
    for (let xx = (yy / 8) % 2 ? 8 : 0; xx < w; xx += 16) ctx.fillRect(x + xx, y + yy, 1, 8);
  }
}

/** Blit one kit cell with its art box's top-left at (x, y); flip mirrors it inside the box. */
export function blitCell(ctx, cell, x, y, flip = false) {
  x = Math.round(x); y = Math.round(y);
  if (flip) { ctx.save(); ctx.translate(x + cell.w, y); ctx.scale(-1, 1); ctx.drawImage(cell.img, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h); ctx.restore(); }
  else ctx.drawImage(cell.img, cell.x, cell.y, cell.w, cell.h, x, y, cell.w, cell.h);
}
/** The kit cell id a facade block draws: a plain variant, or the `-lit` cell of a lit window. */
export const facadeCellId = (b) => (b.type === 'plain-wall' ? (b.art || 'plain-wall') : b.lit ? `${b.type}-lit` : b.type);
/** The kit cell id a placed prop draws: railing spans and the torn banner are their own cells. */
export const propCellId = (p) => ((p.type === 'railing-a' || p.type === 'railing-b') && p.deco ? `${p.type}-span`
  : p.type === 'banner-deco' && tornAt(p) ? 'banner-deco-v2' : p.type);
const tornAt = (p) => (p.c * 3 + p.r) % 3 === 0; // now and then an old torn banner (same rule both looks)

/** Layer a: the facade blocks behind the playfield (drawn before tiles and lighting). */
export function drawFacade(ctx, level, cam, T, view, kit = null) {
  if (!level.facade) return;
  for (const b of level.facade) {
    const x = b.c * T - cam.x; const y = b.r * T - cam.y; const w = b.w * T; const h = b.h * T;
    if (x > view.w || y > view.h || x + w < 0 || y + h < 0) continue;
    const cell = kit && kit.cells[facadeCellId(b)];
    if (cell) { blitCell(ctx, cell, x, y, b.type === 'corner' && b.bc > 0); continue; } // corner: mirrored on the right
    ctx.fillStyle = K.wall; ctx.fillRect(x, y, w, h);
    course(ctx, x, y, w, h);
    const mx = x + w / 2;
    switch (b.type) {
      case 'window-narrow': ctx.fillStyle = K.frame; ctx.fillRect(mx - 6, y + 22, 12, 46); ctx.fillStyle = b.lit ? K.litGlass : K.glass; ctx.fillRect(mx - 4, y + 26, 8, 40); break;
      case 'window-large': ctx.fillStyle = K.frame; ctx.fillRect(mx - 16, y + 18, 32, 56); ctx.fillStyle = b.lit ? K.litGlass : K.glass; ctx.fillRect(mx - 13, y + 22, 26, 50); ctx.fillStyle = K.frame; ctx.fillRect(mx - 1, y + 22, 2, 50); break;
      case 'archway': ctx.fillStyle = K.frame; ctx.fillRect(mx - 18, y + 36, 36, 60); ctx.fillStyle = K.arch; ctx.fillRect(mx - 15, y + 40, 30, 56); break;
      case 'broken-wall': ctx.fillStyle = K.mortar; ctx.fillRect(x + 10, y + 30, 18, 12); ctx.fillRect(x + 36, y + 58, 14, 9); ctx.fillRect(x + 22, y + 42, 2, 16); break;
      case 'banner-wall': ctx.fillStyle = K.iron; ctx.fillRect(mx - 13, y + 12, 26, 2); companyBanner(ctx, mx - 11, y + 14, 22, 62); break; // big: Company
      case 'recessed-wall': ctx.fillStyle = K.recess; ctx.fillRect(x + 12, y + 24, w - 24, 48); ctx.fillStyle = K.bars; for (let i = 0; i < 4; i++) ctx.fillRect(x + 17 + i * 9, y + 24, 1, 48); break;
      case 'vertical-beam': ctx.fillStyle = K.beam; ctx.fillRect(mx - 4, y, 8, h); ctx.fillStyle = K.beamDark; ctx.fillRect(mx + 3, y, 1, h); break;
      case 'drainpipe': ctx.fillStyle = K.iron; ctx.fillRect(mx + 8, y, 4, h); for (let yy = 12; yy < h; yy += 24) ctx.fillRect(mx + 6, y + yy, 8, 2); break;
      case 'corner': { // quoins on the tower's outer edge (mirrored on the right side)
        const right = b.bc > 0; ctx.fillStyle = K.wallHi;
        for (let yy = 0; yy < h; yy += 8) ctx.fillRect(right ? x + w - ((yy / 8) % 2 ? 12 : 20) : x, y + yy + 1, (yy / 8) % 2 ? 12 : 20, 6);
        break;
      }
      default: break;
    }
  }
}

/** Layer b art: the placed platform pieces (level.pieces), over their collision tiles. Kit art
 *  when loaded (the floor's wall-segment tiled across it); the placeholder look is the tiles
 *  themselves plus each balcony's railing (no railing props on balconies: it is balcony art). */
export function drawPieces(ctx, level, cam, T, view, kit = null) {
  for (const q of level.pieces || []) {
    const x = q.c * T - cam.x; const y = q.r * T - cam.y; const w = q.w * T; const h = q.h * T;
    if (x > view.w || y > view.h || x + w < 0 || y + h + T < 0) continue;
    const cell = kit && kit.cells[q.piece];
    if (cell && q.piece === 'wall-segment') {
      ctx.save(); ctx.beginPath(); ctx.rect(Math.round(x), Math.round(y), w, h); ctx.clip();
      for (let yy = 0; yy < h; yy += cell.h) for (let xx = 0; xx < w; xx += cell.w) blitCell(ctx, cell, x + xx, y + yy);
      ctx.restore(); continue;
    }
    if (cell) { blitCell(ctx, cell, x, y, q.flip); continue; }
    if (/^(balcony|corner)-/.test(q.piece)) { // placeholder railing: rail, end posts, balusters
      const xr = Math.round(x); const yr = Math.round(y);
      ctx.fillStyle = K.stone; ctx.fillRect(xr, yr + 3, w, 2);
      ctx.fillStyle = K.stoneDark;
      for (let i = 6; i < w - 4; i += 5) ctx.fillRect(xr + i, yr + 5, 2, 11);
      ctx.fillStyle = K.stone; ctx.fillRect(xr, yr + 1, 3, 15); ctx.fillRect(xr + w - 3, yr + 1, 3, 15);
    }
  }
}

/** The iron grating placeholder (art-gaps/passthrough-grating-spec-2026-11-09.md): one 'g' tile.
 *  6 px deck: WK0 outline, SL4 top edge with a SL5 rivet, SL2 bars over SL0, and the 2 px gaps left
 *  unpainted so the facade shows through. An end of a run has its WK0 side and an iron bracket.
 *  Kit art for the grate-* pieces, once Brook delivers it, is blitted by drawPieces instead. */
export function drawGrating(ctx, level, c, r, x, y, T, kit = null) {
  if (kit && level.pieces && kit.cells['grate-short']) return;
  x = Math.round(x); y = Math.round(y);
  const endL = !isGrating(tileAt(level, c - 1, r));
  const endR = !isGrating(tileAt(level, c + 1, r));
  ctx.fillStyle = P.WK0; ctx.fillRect(x, y, T, 1); ctx.fillRect(x, y + 5, T, 1);
  ctx.fillStyle = P.SL4; ctx.fillRect(x, y + 1, T, 1);
  ctx.fillStyle = P.SL5; ctx.fillRect(x + 7, y + 1, 1, 1);
  for (let i = -1; i < T; i += 4) { // bars at px 15,0 / 3,4 / 7,8 / 11,12; gaps between them
    const x0 = Math.max(0, i); const w = Math.min(T, i + 2) - x0;
    ctx.fillStyle = P.SL2; ctx.fillRect(x + x0, y + 2, w, 2);
    ctx.fillStyle = P.SL0; ctx.fillRect(x + x0, y + 4, w, 1);
  }
  ctx.fillStyle = P.WK0;
  if (endL) ctx.fillRect(x, y, 1, 6);
  if (endR) ctx.fillRect(x + T - 1, y, 1, 6);
  for (const [on, bx] of [[endL, x + 2], [endR, x + T - 6]]) { // iron bracket, 8 px under the deck
    if (!on) continue;
    ctx.fillStyle = P.WK0; ctx.fillRect(bx, y + 6, 4, 2); ctx.fillRect(bx + 1, y + 8, 2, 6);
    ctx.fillStyle = P.SL2; ctx.fillRect(bx + 1, y + 6, 2, 1); ctx.fillRect(bx + 1, y + 7, 1, 6);
  }
}

/** Layer c: the attachments (after tiles, before the anchor markers). */
export function drawProps(ctx, level, cam, T, kit = null) {
  for (const p of level.props || []) {
    const t = PROP_TYPES[p.type]; if (!t) continue;
    if (p.type === 'balcony-post') continue; // grip only: the post is in the balcony art
    const x = p.c * T - cam.x; const y = p.r * T - cam.y; const w = propW(p) * T; const h = t.h * T;
    const cell = kit && kit.cells[propCellId(p)];
    if (cell) { blitCell(ctx, cell, x, y, p.flip); continue; }
    const g = propGrip(p) || { x: p.c + t.w / 2, y: p.r }; const gx = g.x * T - cam.x; const gy = g.y * T - cam.y;
    const fl = (px, pw) => (p.flip ? x + w - px - pw : x + px); // mirror inside the box
    switch (p.type) {
      case 'railing-a': case 'railing-b':
        ctx.fillStyle = K.stone; ctx.fillRect(x, y + 3, T, 2); // rail
        ctx.fillStyle = K.stoneDark; ctx.fillRect(x + (p.deco ? 3 : 6), y + 5, p.deco ? 2 : 4, 11);
        if (p.deco) ctx.fillRect(x + 11, y + 5, 2, 11);
        break;
      case 'statue':
        ctx.fillStyle = K.stoneDark; ctx.fillRect(x + 3, y + 22, 10, 10);
        ctx.fillStyle = K.stone; ctx.fillRect(x + 4, y + 8, 8, 14); ctx.fillRect(x + 5, y + 3, 6, 5); ctx.fillRect(gx - 1, gy, 2, 8);
        break;
      case 'flagpole-tall':
        ctx.fillStyle = K.iron; ctx.fillRect(x + 7, y + 2, 2, h - 2);
        tornBanner(ctx, x + 9, y + 6, 6, 40, (p.c + p.r) % 2); // narrow pennant: small torn PX1 or poster
        break;
      case 'flagpole-short':
        ctx.fillStyle = K.iron; ctx.fillRect(fl(0, 47), y + 3, 47, 2);
        companyBanner(ctx, fl(14, 18), y + 5, 18, 24);
        break;
      case 'hanging-lantern': // the lamp itself is the 'L' tile in the box's bottom cell (danger light)
        ctx.fillStyle = K.verdigris; ctx.fillRect(x + 5, y + 1, 6, 2); for (let i = 3; i < 16; i += 4) ctx.fillRect(x + 7, y + i, 2, 3);
        break;
      case 'cage':
        ctx.fillStyle = K.iron; ctx.fillRect(x + 7, y + 1, 2, 9);
        for (let i = 0; i < 4; i++) ctx.fillRect(x + 3 + i * 3, y + 10, 1, 20);
        ctx.fillRect(x + 3, y + 10, 10, 1); ctx.fillRect(x + 3, y + 29, 10, 2);
        break;
      case 'grapple-hook':
        ctx.fillStyle = K.iron; for (let i = 2; i < 16; i += 4) ctx.fillRect(x + 7, y + i, 2, 3);
        ctx.fillRect(x + 7, y + 16, 2, 10); ctx.fillRect(x + 3, y + 25, 4, 2); ctx.fillRect(x + 3, y + 21, 2, 4); ctx.fillRect(x + 9, y + 25, 4, 2); ctx.fillRect(x + 11, y + 21, 2, 4);
        break;
      case 'bracket':
        ctx.fillStyle = K.stoneDark; ctx.fillRect(x + 3, y, 10, 4); ctx.fillRect(x + 5, y + 4, 6, 4); ctx.fillRect(x + 7, y + 8, 2, 3);
        break;
      case 'support':
        ctx.fillStyle = K.beamDark; ctx.fillRect(x + 6, y, 4, h); ctx.fillStyle = K.beam; ctx.fillRect(x + 6, y, 1, h);
        break;
      case 'banner-deco':
        ctx.fillStyle = K.iron; ctx.fillRect(x + 1, y, 14, 2);
        if (tornAt(p)) tornBanner(ctx, x + 3, y + 2, 10, h - 6, p.r % 2); // now and then an old torn one
        else companyBanner(ctx, x + 3, y + 2, 10, h - 6 - ((p.c + p.r) % 2) * 8); // Company, two lengths
        break;
      case 'cloth-drape':
        ctx.fillStyle = K.stoneDark; for (let i = 0; i < w; i += 2) ctx.fillRect(x + i, y + 4 + Math.round(8 * Math.sin((i / w) * Math.PI)), 2, 6);
        break;
      case 'vines':
        ctx.fillStyle = K.verdigris; for (let i = 2; i < w; i += 6) ctx.fillRect(x + i, y, 2, 10 + ((i * 7) % 14));
        break;
      case 'pots-crates': case 'misc-details':
        ctx.fillStyle = K.beamDark; ctx.fillRect(x + 2, y + 6, 12, 10); ctx.fillStyle = K.stoneDark; ctx.fillRect(x + 17, y + 9, 9, 7);
        break;
      case 'bird-perch':
        ctx.fillStyle = K.beamDark; ctx.fillRect(x + 7, y + 8, 2, 8); ctx.fillStyle = K.stone; ctx.fillRect(x + 5, y + 4, 6, 4);
        break;
      case 'beam-rope':
        ctx.fillStyle = K.beam; ctx.fillRect(fl(0, 44), y + 4, 44, 5); ctx.fillStyle = K.beamDark; ctx.fillRect(fl(0, 6), y, 6, 48);
        ctx.fillStyle = K.rope; ctx.fillRect(gx - 0.5, gy, 1, 30);
        break;
      case 'chain-ring':
        ctx.fillStyle = K.iron; for (let i = 0; i < 36; i += 4) ctx.fillRect(x + 7, y + i, 2, 3);
        ctx.fillRect(x + 4, y + 38, 8, 1); ctx.fillRect(x + 4, y + 46, 8, 1); ctx.fillRect(x + 4, y + 38, 1, 9); ctx.fillRect(x + 11, y + 38, 1, 9);
        break;
      case 'banner-bracket':
        ctx.fillStyle = K.iron; ctx.fillRect(fl(0, 30), y + 3, 30, 2); ctx.fillRect(fl(0, 3), y, 3, 12);
        companyBanner(ctx, fl(10, 16), y + 5, 16, 24 - (p.r % 2) * 6);
        break;
      case 'small-hook':
        ctx.fillStyle = K.iron; ctx.fillRect(fl(0, 6), y + 7, 6, 2); ctx.fillRect(x + 5, y + 4, 6, 1); ctx.fillRect(x + 5, y + 11, 6, 1); ctx.fillRect(x + 4, y + 5, 1, 6); ctx.fillRect(x + 11, y + 5, 1, 6);
        break;
      case 'gargoyle':
        ctx.fillStyle = K.stoneDark; ctx.fillRect(fl(0, 22), y + 3, 22, 11); ctx.fillStyle = K.stone; ctx.fillRect(fl(18, 12), y + 5, 12, 5);
        break;
      default: ctx.fillStyle = K.stone; ctx.fillRect(x, y, w, h);
    }
  }
}

/** Architecture anchors: a cyan IX0 outline on every grip, IX1 brackets on the chosen one.
 *  Rings (kind 'ring') keep the ring placeholder (drawn by render.js). */
export function drawArchAnchor(ctx, a, cam, T, isTarget) {
  const x = Math.round(a.x * T - cam.x); const y = Math.round(a.y * T - cam.y);
  ctx.fillStyle = K.grip;
  ctx.fillRect(x - 2, y - 3, 5, 1); ctx.fillRect(x - 2, y + 3, 5, 1); ctx.fillRect(x - 3, y - 2, 1, 5); ctx.fillRect(x + 3, y - 2, 1, 5);
  if (isTarget) {
    ctx.strokeStyle = K.target; ctx.lineWidth = 1; ctx.strokeRect(x - 6.5, y - 6.5, 13, 13);
    ctx.fillStyle = K.target; ctx.fillRect(x, y, 1, 1);
  }
}
