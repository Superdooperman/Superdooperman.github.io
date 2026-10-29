// Integer-scaled, resolution-agnostic canvas. The game draws into a VIEW_W x VIEW_H
// backing canvas; CSS scales it by a whole number of DEVICE pixels, centred (letterboxed).
import { VIEW_W, VIEW_H } from './config.js';

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

export function setupCanvas(canvas, win = window) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  function resize() {
    const b = fitBox(win.innerWidth, win.innerHeight, win.devicePixelRatio || 1);
    Object.assign(canvas.style, { width: `${b.width}px`, height: `${b.height}px`, left: `${b.left}px`, top: `${b.top}px` });
    canvas.dataset.scale = String(b.scale);
  }
  resize();
  win.addEventListener('resize', resize);
  return { ctx, resize };
}
