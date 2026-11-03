// Dynamic camera zoom (feel fix 1, Azzato 6:01 PM): the visible area widens with speed and the
// swing chain, Dead Cells style, and eases back in when she slows, the chain breaks, or a guard
// is near / alert. The art stays 1 art px per logical px; only how many logical px fit on the
// screen changes. Render only: the sim never reads any of this. All numbers are ZOOM in config.js.
//
// Two ways to put a zoomed view on the screen (ZOOM.render, or ?zoomrender=):
//  - 'backbuffer' (default): draw the view at its logical size (e.g. 640x360) into an offscreen
//    canvas, then scale it to the device-pixel canvas. (At a whole-number scale neither mode
//    runs: the canvas is the logical view, as in canvas.js.) Between whole numbers it is "sharp
//    bilinear": a nearest blow-up to the next whole number, then one smooth step down, so pixel
//    columns never jump between 3 and 4 device px as the camera moves (no shimmer), at the cost of a 1-device-px soft edge.
//    'nearest' is the same buffer with a plain nearest blit at every scale (for comparison).
//  - 'direct': draw the scene straight into the device-pixel canvas with a scale transform.
import { ZOOM, BASE_W, BASE_H, TILE_PX, setViewSize, VIEW_W, VIEW_H } from './config.js';
import { integerScale } from './canvas.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const state = new WeakMap();
let last = null; // the zoom state drawn most recently

/** The eased camera look-ahead (logical px, + = right), or null when the zoom never ran. */
export function lookOf(world) { const s = world && state.get(world); return s ? s.look : null; }
export function zoomOf(world) { const s = world && state.get(world); return s ? s.zoom : 1; }
export function zoomInfo(world) { const s = world && state.get(world); return s ? { ...s } : null; }

/** A guard within ZOOM.guardNear tiles, an alert, or a filling meter pulls the view back in. */
export function guardPull(w, cfg = ZOOM) {
  if (w.alert || w.meter > 0 || w.phase === 'caught') return true;
  for (const g of (w.level && w.level.guards) || []) {
    if (g.state === 'tied') continue;
    const dx = g.x - w.x; const dy = (g.floorY ?? g.y ?? w.y) - w.y;
    if (dx * dx + dy * dy <= cfg.guardNear * cfg.guardNear) return true;
  }
  return false;
}

/** Wanted zoom from the smoothed speed and the chain: 1 (calm) .. cfg.min (widest). */
export function zoomTarget(speed, chain, cfg = ZOOM) {
  const k = Math.max(clamp01((speed - cfg.speedFrom) / (cfg.speedFull - cfg.speedFrom)), clamp01((chain || 0) / cfg.chainFull));
  return 1 - (1 - cfg.min) * k;
}

/** Feel fix 2 (Chopper's zoom check): the target zoom moved to the nearest one whose scale on
 *  this screen is a whole number (ties go wider, never below 1x). base: the presenter's
 *  whole-number rest scale. A 1280x720 or 1366x768 window at DPR 1 (base 2) then rests at 2x
 *  and goes out to 1x, never sitting at 1.5x; base 4 still goes 4x -> 3x. */
export function wholeTarget(want, base) {
  if (!base || want >= 1) return want;
  const k = Math.max(1, Math.ceil(base * want - 0.5));
  return Math.min(1, k / base);
}

/** One drawn frame (dt = real seconds since the last one). Returns the zoom.
 *  view: { base } from the presenter (whole-scale targets); omitted = free targets. */
export function stepZoom(w, dt, cfg = ZOOM, view = null) {
  if (!w) return 1;
  let s = state.get(w);
  if (!s) { // a new room carries the zoom over from the last one (no snap at a doorway)
    s = { zoom: last ? last.zoom : 1, speed: last ? last.speed : 0, target: last ? last.target : 1, hold: 0, look: (w.face || 1) * cfg.lookAhead * 0.4, guard: false };
    state.set(w, s);
  }
  last = s;
  dt = Math.max(0, Math.min(0.1, dt));
  // On a line her whole speed counts. Off it only the run (|vx|) does, plus a fall faster than
  // fallFrom: a plain jump's rise and landing never zoom the view out (feel fix 2, Chopper).
  const fall = (w.vy || 0) > cfg.fallFrom ? Math.min(w.vy, cfg.speedFull) : 0;
  const v = w.anchor ? Math.hypot(w.vx || 0, w.vy || 0) : Math.max(Math.abs(w.vx || 0), fall);
  s.speed += (v - s.speed) * (1 - Math.exp(-dt / (v > s.speed ? (cfg.speedRise ?? cfg.speedSmooth) : cfg.speedSmooth)));
  const guard = guardPull(w, cfg);
  s.guard = guard;
  let want = cfg.enabled ? zoomTarget(s.speed, w.chain, cfg) : 1;
  if (guard) want = 1;
  if (cfg.wholeScale && view && view.base) want = wholeTarget(want, view.base);
  // hysteresis: a wider target is taken at once and held holdOut s after the trigger drops
  if (want <= s.target || guard) { if (want < s.target) s.hold = cfg.holdOut; s.target = want; if (guard) s.hold = 0; }
  else if (s.hold > 0) s.hold = Math.max(0, s.hold - dt);
  else s.target = want;
  const time = s.target < s.zoom ? cfg.outTime : (guard ? cfg.guardInTime : cfg.inTime);
  // exponential ease, ~95% of the way in `time` seconds
  s.zoom += (s.target - s.zoom) * (1 - Math.exp(-3 * dt / time));
  if (Math.abs(s.zoom - s.target) < 1e-3) s.zoom = s.target;
  // look-ahead: eased toward the direction of travel (facing when slow), never a snap on a turn
  const vx = w.vx || 0;
  const dir = Math.abs(vx) > 1 ? Math.sign(vx) : (w.face || 1);
  const lookWant = dir * cfg.lookAhead * Math.max(0.4, clamp01(Math.abs(vx) / cfg.lookFull));
  s.look += (lookWant - s.look) * (1 - Math.exp(-3 * dt / cfg.lookTime));
  return s.zoom;
}

/** Forget a world's zoom (a new room starts calm). */
export function resetZoom(w) { if (w) state.delete(w); }

/** View size and device scale for a zoom on a dev-px screen whose whole-number base scale is
 *  `base` (canvas.js fill rule). Snapped: the scale is chosen so the view is a whole number of
 *  logical px tall, and a whole-number scale stays exactly whole. */
export function zoomView(devW, devH, base, zoom) {
  let s = base * zoom;
  const near = Math.round(s);
  // a whole scale stays exact (rest, 4 -> 3 at 0.75); no snap band around it (feel fix 2: the
  // old 0.02 band made a ~1% jump in one frame leaving and reaching rest). Any other scale is
  // set by a whole number of logical rows, so it moves one row (~0.3%) at a time.
  const vh = Math.max(1, Math.round(devH / s));
  if (Math.abs(s - near) > 1e-9) s = devH / vh; else s = near;
  const vw = Math.ceil(devW / s);
  return { s, vw, vh };
}

/** The device-pixel canvas plus the backbuffer. frame(zoom, draw) sets the live view size,
 *  calls draw(ctx) in logical px, and puts the result on screen. */
export function createPresenter(canvas, win = window, { mode = ZOOM.render, doc = win.document } = {}) {
  const ctx = canvas.getContext('2d');
  const bb = doc.createElement('canvas'); const bctx = bb.getContext('2d');
  const pre = doc.createElement('canvas'); const pctx = pre.getContext('2d');
  const st = { dpr: 1, devW: BASE_W, devH: BASE_H, base: 1, s: 1, vw: BASE_W, vh: BASE_H, cssW: BASE_W, cssH: BASE_H, mode };
  function resize() {
    st.dpr = win.devicePixelRatio || 1;
    st.cssW = win.innerWidth; st.cssH = win.innerHeight;
    st.devW = Math.round(st.cssW * st.dpr); st.devH = Math.round(st.cssH * st.dpr);
    st.base = integerScale(st.cssW, st.cssH, st.dpr, BASE_W, BASE_H);
    st.layout = '';
    view(1);
  }
  // Two canvas layouts. At a whole-number scale (rest, and 0.75 from 4x -> 3x) the canvas is the
  // logical view itself, CSS-scaled and centred exactly like canvas.js fillBox (overhang under one
  // logical px), and the scene is drawn straight into it: pixel-exact, no blit. Only while a zoom
  // eases through a fractional scale does the canvas become device-pixel sized (render modes below).
  function layout(whole) {
    const want = whole ? `L${st.vw}x${st.vh}@${st.s}` : `D${st.devW}x${st.devH}`;
    if (st.layout === want) return;
    st.layout = want;
    const cw = whole ? st.vw : st.devW; const ch = whole ? st.vh : st.devH;
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.imageSmoothingEnabled = false;
    const w = whole ? (st.vw * st.s) / st.dpr : st.devW / st.dpr;
    const h = whole ? (st.vh * st.s) / st.dpr : st.devH / st.dpr;
    Object.assign(canvas.style, { width: `${w}px`, height: `${h}px`, left: `${Math.floor((st.cssW - w) / 2)}px`, top: `${Math.floor((st.cssH - h) / 2)}px` });
  }
  function view(zoom) {
    const z = zoomView(st.devW, st.devH, st.base, zoom);
    st.s = z.s; st.vw = Math.max(BASE_W, z.vw); st.vh = Math.max(BASE_H, z.vh);
    if (z.vw < BASE_W || z.vh < BASE_H) st.s = Math.min(st.devW / st.vw, st.devH / st.vh); // tiny screens: fit the base view
    st.whole = Number.isInteger(st.s);
    if (st.whole) st.vh = Math.max(BASE_H, Math.ceil(st.devH / st.s)); // fillBox rule: cover, never short
    layout(st.whole);
    setViewSize(st.vw, st.vh);
    canvas.dataset.scale = String(+st.s.toFixed(4));
    canvas.dataset.view = `${VIEW_W}x${VIEW_H}`;
    canvas.dataset.zoom = String(+zoom.toFixed(3));
    return st;
  }
  function grow(c, w, h) { if (c.width < w || c.height < h) { c.width = Math.max(c.width, w); c.height = Math.max(c.height, h); } }
  function frame(zoom, draw) {
    view(zoom);
    const { s, vw, vh } = st;
    if (st.whole) { // logical canvas: draw straight in
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
      draw(ctx);
      return st;
    }
    if (st.mode === 'direct') {
      ctx.setTransform(s, 0, 0, s, 0, 0); ctx.imageSmoothingEnabled = false;
      draw(ctx);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return st;
    }
    grow(bb, vw, vh);
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.imageSmoothingEnabled = false;
    bctx.save(); bctx.beginPath(); bctx.rect(0, 0, vw, vh); bctx.clip();
    draw(bctx);
    bctx.restore();
    if (st.mode === 'nearest') {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bb, 0, 0, vw, vh, 0, 0, vw * s, vh * s);
    } else { // sharp bilinear
      const k = Math.ceil(s);
      grow(pre, vw * k, vh * k);
      pctx.imageSmoothingEnabled = false;
      pctx.drawImage(bb, 0, 0, vw, vh, 0, 0, vw * k, vh * k);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(pre, 0, 0, vw * k, vh * k, 0, 0, vw * s, vh * s);
      ctx.imageSmoothingEnabled = false;
    }
    return st;
  }
  /** CSS client point -> logical px in the current view. */
  function toLogical(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const k = st.whole ? st.vw / r.width : st.dpr / st.s; // logical px per CSS px in either layout
    return { x: (clientX - r.left) * k, y: (clientY - r.top) * (st.whole ? st.vh / r.height : k) };
  }
  resize();
  win.addEventListener('resize', resize);
  return { ctx, frame, resize, toLogical, state: st, setMode(m) { st.mode = m; } };
}
export const ZOOM_TILE = TILE_PX; // re-export for tools that only import zoom.js
