// Hi-res art pipeline (M0 stub). Brook's sprites arrive later as PNG strips listed in
// art/manifest.json. Until then every sprite falls back to a placeholder coloured rect.
//
// "Hi-res": art may be authored at ART_SCALE x the logical size (1 = native 480x270 pixel
// art; 4 = 1080p-native). Frames are drawn at logical size, so the engine never changes
// when the art resolution does. Palette swap (the Lark's throat accent, Samus-style) is a
// canvas pixel remap at load: a reserved key-colour ramp is replaced per power-up.
import { SPRITE_W, SPRITE_H, TILE_PX } from './config.js';
import { WREN_SHEETS, frameBox, stripCoil } from './wren.js';

export const ART_SCALE = 1;

/** Reserved accent key ramp painted into every Lark frame (pure hues no other art uses). */
export const ACCENT_KEY_RAMP = Object.freeze([[0, 255, 0], [0, 200, 0], [0, 150, 0]]);
/** The locked palette (STYLE-GUIDE section 3, v1 LOCKED Oct 28 2026). Every placeholder colour
 *  below is one of these; base art must use only these exact values. */
export const PALETTE = Object.freeze({
  WP0: '#170F3D', WP1: '#2E1A64', WP2: '#4C2C94', WP3: '#8058D6', WP4: '#B086EE',
  WL0: '#9283D8', WL1: '#BBA8F0', WL2: '#E2CDFB', WL3: '#FBF3FF',
  WK0: '#0B0B10', WK1: '#1C1828', WK2: '#332D4A',
  WS0: '#9C6656', WS1: '#D49A82', WS2: '#F2C9AE', WH0: '#857B66', WH1: '#C4B894', WH2: '#EEE6CB',
  NV0: '#04060E', NV1: '#0B1122', NV2: '#132140', NV3: '#1E3557',
  SL0: '#0E1626', SL1: '#1A283C', SL2: '#283C56', SL3: '#3C5674', SL4: '#587896', SL5: '#86A6BF',
  TB0: '#1C1614', TB1: '#352821', TB2: '#574031', TB3: '#7A5F48',
  FG0: '#182C36', FG1: '#365461', FG2: '#6A8A96', MN0: '#7AA2C8', MN1: '#B5D2EA',
  LG0: '#5C2E0E', LG1: '#A85A18', LG2: '#E3952C', LG3: '#FFC45E', LG4: '#FFE8AE',
  SW0: '#9DADC2', SW1: '#D8E2EE', SW2: '#FFFFFF',
  AR0: '#4E0B17', AR1: '#991A22', AR2: '#D9322B', AR3: '#FF6B50',
  PC0: '#2B8645', PC1: '#4CC566', PC2: '#93F2A0', PR0: '#0F7F7C', PR1: '#1EC2B6', PR2: '#7DF2E6',
  PL0: '#2A5BC8', PL1: '#4C90FF', PL2: '#A2CEFF',
  PX0: '#2B2522', PX1: '#6E3A36', PX2: '#9C9483', PX3: '#CFC8B5',
  GD0: '#182124', GD1: '#2D3A3E', GD2: '#4A5C5E', GD3: '#728A87',
  UI0: '#090C13', UI1: '#242B39', UI2: '#556073', UI3: '#A4ADBB', UI4: '#EEF1F5',
  IX0: '#3A9ED6', IX1: '#8FDCFF', FX0: '#6A798B', FX1: '#8EA6BF', FX2: '#8E959E', FX3: '#C3C8CE',
});
export const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ramp = (...ids) => Object.freeze(ids.map((id) => Object.freeze(hexToRgb(PALETTE[id]))));

/** Throat accent ramps, light/mid/dark for the key ramp above (STYLE-GUIDE "Throat accent swap").
 *  Default is the lavender (WL2/WL1/WL0); the power-up tiers are green, teal and blue. No gold,
 *  no yellow, no red (those are danger colours). */
export const DEFAULT_ACCENT_RAMP = ramp('WL2', 'WL1', 'WL0');
export const ACCENT_RAMPS = Object.freeze({
  default: DEFAULT_ACCENT_RAMP,
  common: ramp('PC2', 'PC1', 'PC0'),
  rare: ramp('PR2', 'PR1', 'PR0'),
  legendary: ramp('PL2', 'PL1', 'PL0'),
});

const P = PALETTE;
/** Placeholder colours, all from the locked palette. Purple/lavender (WP/WL) are only the Lark's.
 *  Lamp gold, searchlight white and alarm red only mean danger. */
export const PLACEHOLDER = Object.freeze({
  // the Lark: purple cloak, lavender front/throat, black mask, the eye glint, the hidden ghost rim
  lark: P.WP3, larkFront: P.WL1, larkAccent: P.WL2, larkMask: P.WK0, larkGlint: P.WL3, ghostRim: P.WP3,
  // watchmen and what they see with
  guard: P.GD2, guardDark: P.GD0, guardCap: P.GD3,
  cone: P.SW0, coneEdge: P.SW1, coneSeen: P.AR2, coneAlertEdge: P.AR3,
  searchlight: P.SW1, searchlightCore: P.SW2,
  meterBg: P.UI0, meterFill: P.AR1, bang: P.AR2, bangHi: P.AR3, bangOutline: P.UI0,
  lamp: P.LG3, lampHousing: P.LG1, lampPool: P.LG2, lampEdge: P.LG3,
  // rooms: harbor slate stone, a darker hide-able shadow stone, timber
  ground: P.SL2, groundTop: P.SL3, shadow: P.SL0, shadowTop: P.FG1,
  hideStone: P.NV3, door: P.TB1,
  wood: P.TB2, woodTop: P.TB3, woodGap: P.TB0,
  shadowWood: P.TB1, shadowWoodTop: P.FG1,
  // grapple and pickups: interact blue for rings/targets, silver loot
  reticle: P.IX1, thunk: P.FX0, prompt: P.UI4, promptBg: P.UI0,
  ring: P.SL5, ringTarget: P.IX1, rope: P.WL1,
  mote: P.SL5, note: P.PX3, exit: P.IX0, key: P.TB3, spark: P.UI4,
  sky: P.NV1, hud: P.UI4, hudDim: P.UI2, feather: P.UI4, featherLost: P.UI1,
  overlay: P.UI0, hudStrip: P.UI0, // M3: the HUD strip above the playfield
});

/** Sprite specs the renderer asks for; sizes are logical px. */
export const SPRITES = Object.freeze({
  lark: { w: SPRITE_W, h: SPRITE_H, color: PLACEHOLDER.lark },
  guard: { w: SPRITE_W, h: SPRITE_H, color: PLACEHOLDER.guard },
  tile: { w: TILE_PX, h: TILE_PX, color: PLACEHOLDER.ground },
});

/** Replace exact RGB matches in RGBA pixel data. map: [[fromRGB, toRGB], ...]. Pure-ish:
 *  mutates and returns `data` (a Uint8ClampedArray or plain array). Alpha is kept. */
export function remapColors(data, map) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (const [from, to] of map) {
      if (data[i] === from[0] && data[i + 1] === from[1] && data[i + 2] === from[2]) {
        data[i] = to[0]; data[i + 1] = to[1]; data[i + 2] = to[2];
        break;
      }
    }
  }
  return data;
}

/** Build the remap list from the key ramp to an accent ramp. */
export function accentMap(ramp = DEFAULT_ACCENT_RAMP) {
  return ACCENT_KEY_RAMP.map((k, i) => [k, ramp[Math.min(i, ramp.length - 1)]]);
}

/** Load art/manifest.json entries (browser). Missing files are fine: placeholders stay.
 *  Sheets flagged accentKey get the key ramp remapped to the default accent at load, and the
 *  Wren strips get two derived copies (never written back to the art files): `noCoil` (the
 *  hemp coil cleared, for while the line is out) and `lit` (an LG2 silhouette for lamp light). */
export async function loadArt(baseUrl = './art/') {
  const sheets = {};
  try {
    const res = await fetch(`${baseUrl}manifest.json`);
    const manifest = await res.json();
    await Promise.all((manifest.sprites || []).map((s) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { try { sheets[s.name] = prepareSheet(img, s); } catch { sheets[s.name] = { img, ...s }; } resolve(); };
      img.onerror = () => resolve();
      img.src = `${baseUrl}${s.file}`;
    })));
  } catch { /* no manifest yet: placeholders */ }
  return sheets;
}

const COIL_RGB = ['WH0', 'WH1', 'WH2'].map((id) => hexToRgb(PALETTE[id]));
function prepareSheet(img, spec) {
  const sheet = { img, ...spec };
  if (typeof document === 'undefined' || !(spec.accentKey || WREN_SHEETS.includes(spec.name))) return sheet;
  const mk = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; return c; };
  const base = mk(); const bx = base.getContext('2d');
  bx.drawImage(img, 0, 0);
  const id = bx.getImageData(0, 0, img.width, img.height);
  if (spec.accentKey) { remapColors(id.data, accentMap()); bx.putImageData(id, 0, 0); }
  sheet.img = base;
  if (WREN_SHEETS.includes(spec.name)) {
    const nc = mk(); const ndata = new ImageData(stripCoil(id.data, img.width, COIL_RGB), img.width, img.height);
    nc.getContext('2d').putImageData(ndata, 0, 0);
    sheet.noCoil = nc;
    const lit = mk(); const lx = lit.getContext('2d');
    lx.drawImage(base, 0, 0); lx.globalCompositeOperation = 'source-in'; lx.fillStyle = PALETTE.LG2; lx.fillRect(0, 0, img.width, img.height);
    sheet.lit = lit;
    const litNc = mk(); const ln = litNc.getContext('2d');
    ln.drawImage(nc, 0, 0); ln.globalCompositeOperation = 'source-in'; ln.fillStyle = PALETTE.LG2; ln.fillRect(0, 0, img.width, img.height);
    sheet.litNoCoil = litNc;
  }
  return sheet;
}

/** Draw one frame of a loaded sheet with its pivot at (x, y) logical px; face < 0 mirrors.
 *  img: which copy of the strip (default the remapped base). */
export function drawFrame(ctx, sheet, frame, x, y, face = 1, img = sheet.img) {
  const b = frameBox(sheet, x, y, face);
  const fw = sheet.frameW * ART_SCALE; const fh = sheet.frameH * ART_SCALE;
  const sx = (frame % sheet.frames) * fw;
  if (face < 0) {
    ctx.save(); ctx.translate(b.left + b.w, b.top); ctx.scale(-1, 1);
    ctx.drawImage(img, sx, 0, fw, fh, 0, 0, b.w, b.h);
    ctx.restore();
  } else ctx.drawImage(img, sx, 0, fw, fh, b.left, b.top, b.w, b.h);
  return b;
}

/** Draw a sprite frame with feet at (x, y) logical px, or its placeholder rect. */
export function drawSprite(ctx, sheets, name, frame, x, y, opts = {}) {
  const spec = SPRITES[name] || { w: 16, h: 16, color: '#ff00ff' };
  const w = opts.w ?? spec.w;
  const h = opts.h ?? spec.h;
  const sheet = sheets && sheets[name];
  const left = Math.round(x - w / 2);
  const top = Math.round(y - h);
  if (sheet) {
    const fw = sheet.frameW * ART_SCALE;
    const fh = sheet.frameH * ART_SCALE;
    ctx.drawImage(sheet.img, (frame % sheet.frames) * fw, 0, fw, fh, left, top, w, h);
    return;
  }
  ctx.fillStyle = opts.color || spec.color;
  ctx.fillRect(left, top, w, h);
}
