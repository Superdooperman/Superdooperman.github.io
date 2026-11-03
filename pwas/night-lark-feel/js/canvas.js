// Integer-scaled, resolution-agnostic canvas. The game draws into a VIEW_W x VIEW_H
// backing canvas; CSS scales it by a whole number of DEVICE pixels.
// swing-feel: no letterbox. The scale is still the largest whole number at which the 480x270
// base fits, but the backing canvas then grows (wider or taller) to cover the whole screen, so
// the player sees more of the world instead of black bars. ?letterbox=1 restores the old fit.
import { VIEW_W, VIEW_H, BASE_W, BASE_H, setViewSize } from './config.js';

/** Largest whole device-pixel scale that fits; at least 1. */
export function integerScale(cssW, cssH, dpr = 1, w = VIEW_W, h = VIEW_H) {
  return Math.max(1, Math.floor(Math.min((cssW * dpr) / w, (cssH * dpr) / h)));
}

/** CSS box for the canvas: size in CSS px and offsets to centre it. */
export function fitBox(cssW, cssH, dpr = 1, w = VIEW_W, h = VIEW_H) {
  const scale = integerScale(cssW, cssH, dpr, w, h);
  const width = (w * scale) / dpr;
  const height = (h * scale) / dpr;
  return { scale, width, height, left: Math.floor((cssW - width) / 2), top: Math.floor((cssH - height) / 2) };
}

/** Fill the screen: same whole-number scale as fitBox for the base frame, then a view of
 *  viewW x viewH logical px (>= base) that covers the screen. The canvas may overhang the
 *  screen by less than one logical pixel; it is centred so the overhang splits evenly. */
export function fillBox(cssW, cssH, dpr = 1, baseW = BASE_W, baseH = BASE_H) {
  const scale = integerScale(cssW, cssH, dpr, baseW, baseH);
  const viewW = Math.max(baseW, Math.ceil((cssW * dpr) / scale));
  const viewH = Math.max(baseH, Math.ceil((cssH * dpr) / scale));
  const width = (viewW * scale) / dpr;
  const height = (viewH * scale) / dpr;
  return { scale, viewW, viewH, width, height, left: Math.floor((cssW - width) / 2), top: Math.floor((cssH - height) / 2) };
}

export function setupCanvas(canvas, win = window, { letterbox = false, onResize = null } = {}) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  function resize() {
    const dpr = win.devicePixelRatio || 1;
    const b = letterbox ? { ...fitBox(win.innerWidth, win.innerHeight, dpr, BASE_W, BASE_H), viewW: BASE_W, viewH: BASE_H }
      : fillBox(win.innerWidth, win.innerHeight, dpr);
    setViewSize(b.viewW, b.viewH);
    if (canvas.width !== b.viewW || canvas.height !== b.viewH) { canvas.width = b.viewW; canvas.height = b.viewH; ctx.imageSmoothingEnabled = false; }
    Object.assign(canvas.style, { width: `${b.width}px`, height: `${b.height}px`, left: `${b.left}px`, top: `${b.top}px` });
    canvas.dataset.scale = String(b.scale);
    canvas.dataset.view = `${b.viewW}x${b.viewH}`;
    if (onResize) onResize(b);
  }
  resize();
  win.addEventListener('resize', resize);
  return { ctx, resize };
}
