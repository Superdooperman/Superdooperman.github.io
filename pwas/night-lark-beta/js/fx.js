// M5 look pass: lighting, particles, screen shake, and the cloak and rope-tail point chains.
// Read-only on the world: it watches world state and the step's events, never writes the sim,
// so stealth (decided by logic, never by pixels) and the v1 parity replay are unaffected.
// Its own seeded randomness (mulberry32), so the game's RNG streams are untouched.
// Reduced motion (prefers-reduced-motion, the title menu MOTION item, or ?fx=off): no shake,
// no flash, no particles, no flicker, no fog drift, and the cloak and rope hang at rest.
import { TILE_PX, VIEW_W, VIEW_H, HUD_H, TUNING } from './config.js';
import { PALETTE as P } from './art.js';
import { mulberry32 } from './gen/rng.js';
import { createChain, stepChain, poseChain } from './chain.js';
import { createWrenAnim, stepWrenAnim } from './wren.js';

export const FX = Object.freeze({
  maxParticles: 220,
  cloakPoints: 6, cloakSeg: 0.15, cloakGravity: 26, cloakWind: 3, cloakDrag: 0.93, cloakTrail: 9,
  tailPoints: 5, tailSeg: 0.11, tailGravity: 40, tailWind: 1.5, tailDrag: 0.9, tailTrail: 5,
  ropePoints: 10, ropeGravity: 45, ropeDrag: 0.95,
  darkness: 0.42, lampBands: [1.3, 1.0, 0.62], lampBandCut: 0.42,
  emberRate: 1.6, fogDrift: 4,
  shakeCaught: { amp: 3, dur: 0.32 }, shakeRoll: { amp: 1, dur: 0.12 },
  flashCaught: 0.12,
});

export function createFx(opts = {}) {
  const rnd = mulberry32(opts.seed ?? 0x1a2c);
  const fx = {
    reduced: !!opts.reduced, time: 0, world: null,
    parts: [], shake: { t: 0, dur: 0, amp: 0 }, flash: 0,
    cloak: null, tail: null, rope: null, ropeFor: null, last: null,
    stats: { spawned: 0, steps: 0 },
    // Wren sprite poses (wren.js) and, when her strips are loaded, where the live rope starts
    // (the gun muzzle; main.js sets it). null keeps the M5 hand point.
    wren: createWrenAnim(), ropeOrigin: null,
    step, offset, setReduced(v) { if (!!v === fx.reduced) return; fx.reduced = !!v; if (fx.reduced) { fx.parts.length = 0; fx.shake.t = 0; fx.flash = 0; } },
  };
  const R = (a, b) => a + (b - a) * rnd();

  function spawn(p) {
    if (fx.reduced) return;
    if (fx.parts.length >= FX.maxParticles) fx.parts.shift();
    fx.parts.push({ g: 0, drag: 1, size: 1, add: false, ...p, max: p.life });
    fx.stats.spawned++;
  }
  function burst(n, x, y, f) { for (let i = 0; i < n; i++) spawn(f(i, x, y)); }
  const dust = (i, x, y) => ({ x: x + R(-0.3, 0.3), y: y - 0.05, vx: R(-1.6, 1.6), vy: R(-1.2, -0.2), g: 3, drag: 0.92, life: R(0.25, 0.5), color: i % 2 ? P.FX0 : P.FX1, size: i % 3 ? 1 : 2 });
  const spark = (i, x, y) => { const a = R(0, Math.PI * 2); const s = R(1.5, 4); return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.88, life: R(0.15, 0.35), color: i % 2 ? P.WL3 : P.WL2, add: true }; };
  const glint = (i, x, y) => ({ x: x + R(-0.4, 0.4), y: y + R(-0.6, 0), vx: R(-0.4, 0.4), vy: R(-2, -0.8), drag: 0.95, life: R(0.3, 0.6), color: i % 2 ? P.SL5 : P.UI4, add: true });
  const puff = (i, x, y) => ({ x: x + R(-0.2, 0.2), y, vx: R(-0.5, 0.5), vy: R(-1.2, -0.5), drag: 0.97, life: R(0.6, 1.1), color: i % 2 ? P.FX2 : P.FX3, size: 2 });
  function kick(s) { if (fx.reduced) return; if (s.amp >= fx.shake.amp || fx.shake.t <= 0) { fx.shake.amp = s.amp; fx.shake.dur = s.dur; fx.shake.t = s.dur; } }

  function shoulder(w) { return { x: w.x - w.face * TUNING.halfWidth * 0.5, y: w.y - w.h * 0.82 }; }
  function hip(w) { return { x: w.x - w.face * TUNING.halfWidth * 0.3, y: w.y - w.h * 0.45 }; }
  function snap(w) {
    const s = shoulder(w); const h = hip(w);
    fx.cloak = createChain(FX.cloakPoints, w.h * FX.cloakSeg, s.x, s.y);
    poseChain(fx.cloak, s.x, s.y, -w.face * 0.5, 1);
    fx.tail = createChain(FX.tailPoints, FX.tailSeg, h.x, h.y);
    poseChain(fx.tail, h.x, h.y, -w.face * 0.6, 1);
    fx.rope = null; fx.ropeFor = null;
  }

  /** One fixed step after the sim step. events: that step's world events (copied by game/shell). */
  function step(dt, w, events = []) {
    fx.time += dt; fx.stats.steps++;
    if (!w) { fx.world = null; return; }
    if (w !== fx.world) { fx.world = w; fx.last = null; fx.parts.length = 0; }
    const moved = fx.last ? Math.hypot(w.x - fx.last.x, w.y - fx.last.y) : Infinity;
    if (!fx.cloak || moved > 1.5) snap(w);
    fx.last = { x: w.x, y: w.y };
    for (const e of events) {
      if (e.type === 'land' && e.drop > 1.2) burst(Math.min(8, 2 + Math.round(e.drop)), w.x, w.y, dust);
      else if (e.type === 'roll') { burst(8, w.x, w.y, dust); kick(FX.shakeRoll); }
      else if (e.type === 'jump' && e.from === 'ground') burst(3, w.x, w.y, dust);
      else if (e.type === 'attach' && e.ring) burst(7, e.ring.x, e.ring.y, spark);
      else if (e.type === 'pickup') burst(6, w.x, w.y - w.h * 0.5, glint);
      else if (e.type === 'snuff') burst(6, e.x, e.y, puff);
      else if (e.type === 'caught') { kick(FX.shakeCaught); if (!fx.reduced) fx.flash = FX.flashCaught; }
      else if (e.type === 'room-reset' || e.type === 'respawn') { snap(w); fx.parts.length = 0; }
    }
    if (!fx.reduced) for (const l of w.level.lamps || []) {
      if (rnd() < FX.emberRate * dt) spawn({ x: l.x + R(-0.15, 0.15), y: l.y + 0.1, vx: R(-0.2, 0.2), vy: R(-1, -0.5), drag: 0.99, life: R(0.9, 1.6), color: rnd() < 0.5 ? P.LG2 : P.LG3, add: true, wob: R(0, 6) });
    }
    for (let i = fx.parts.length - 1; i >= 0; i--) {
      const p = fx.parts[i]; p.life -= dt;
      if (p.life <= 0) { fx.parts.splice(i, 1); continue; }
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g * dt;
      if (p.wob !== undefined) p.vx += Math.sin(fx.time * 5 + p.wob) * 0.6 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    if (fx.shake.t > 0) fx.shake.t = Math.max(0, fx.shake.t - dt);
    if (fx.flash > 0) fx.flash = Math.max(0, fx.flash - dt);
    stepWrenAnim(fx.wren, w, dt);
    chains(dt, w);
  }

  function chains(dt, w) {
    const s = shoulder(w); const h = hip(w);
    const crouchSeg = w.h * FX.cloakSeg; fx.cloak.seg = crouchSeg;
    if (fx.reduced) {
      poseChain(fx.cloak, s.x, s.y, -w.face * 0.5, 1);
      poseChain(fx.tail, h.x, h.y, -w.face * 0.6, 1);
    } else {
      // the cloak trails behind her: a steady wind against her facing, plus what Verlet keeps of her motion
      // (a light breeze against her facing, plus a trailing push from her speed)
      stepChain(fx.cloak, dt, { pinA: s, force: { x: -w.face * FX.cloakWind - w.vx * FX.cloakTrail, y: FX.cloakGravity - w.vy * 4 }, drag: FX.cloakDrag });
      stepChain(fx.tail, dt, { pinA: h, force: { x: -w.face * FX.tailWind - w.vx * FX.tailTrail, y: FX.tailGravity }, drag: FX.tailDrag });
      if (w.grounded) for (const ch of [fx.cloak, fx.tail]) for (const p of ch.pts) if (p.y > w.y - 0.02) p.y = w.y - 0.02; // hem rests on the floor
    }
    if (w.anchor) {
      const hand = (fx.ropeOrigin && fx.ropeOrigin(w)) || { x: w.x, y: w.y - w.h * 0.5 };
      if (fx.ropeFor !== w.anchor) {
        fx.ropeFor = w.anchor;
        fx.rope = createChain(FX.ropePoints, 1, hand.x, hand.y);
        const dx = w.anchor.x - hand.x; const dy = w.anchor.y - hand.y;
        fx.rope.seg = Math.hypot(dx, dy) / (FX.ropePoints - 1);
        poseChain(fx.rope, hand.x, hand.y, dx, dy);
      }
      fx.rope.seg = Math.max(w.ropeLen, 0.01) / (FX.ropePoints - 1);
      const n = fx.rope.pts.length;
      if (fx.reduced) { // straight line, no sag
        fx.rope.pts.forEach((p, i) => { const t = i / (n - 1); p.x = p.px = hand.x + (w.anchor.x - hand.x) * t; p.y = p.py = hand.y + (w.anchor.y - hand.y) * t; });
      } else stepChain(fx.rope, dt, { pinA: hand, pinB: w.anchor, force: { x: 0, y: FX.ropeGravity }, drag: FX.ropeDrag, iterations: 6 });
    } else { fx.rope = null; fx.ropeFor = null; }
  }

  /** Whole-pixel shake offset for the playfield (0 in reduced motion). */
  function offset() {
    if (fx.reduced || fx.shake.t <= 0) return { x: 0, y: 0 };
    const k = fx.shake.t / fx.shake.dur; const a = fx.shake.amp * k;
    return { x: Math.round(Math.sin(fx.time * 91) * a), y: Math.round(Math.cos(fx.time * 73) * a) };
  }
  return fx;
}

// ---- drawing (canvas only) ----
let darkCanvas = null;
function darkLayer() {
  if (darkCanvas) return darkCanvas;
  if (typeof OffscreenCanvas !== 'undefined') darkCanvas = new OffscreenCanvas(VIEW_W, VIEW_H);
  else if (typeof document !== 'undefined') { darkCanvas = document.createElement('canvas'); darkCanvas.width = VIEW_W; darkCanvas.height = VIEW_H; }
  return darkCanvas;
}

/** A far skyline and the moon behind the room (safe light only: MN, NV). Parallax 0.25. */
export function drawBackdrop(ctx, fx, world, cam) {
  const px = -cam.x * 0.25;
  ctx.fillStyle = P.MN1; ctx.fillRect(Math.round(392 + px * 0.2), HUD_H + 22, 12, 12);
  ctx.fillStyle = P.MN0; ctx.fillRect(Math.round(392 + px * 0.2), HUD_H + 30, 4, 4);
  ctx.fillStyle = P.NV2;
  for (let i = 0; i < 24; i++) {
    const w = 18 + ((i * 37) % 23); const h = 30 + ((i * 53) % 70);
    const x = Math.round(((i * 41 + px) % 600 + 600) % 600 - 60);
    ctx.fillRect(x, VIEW_H - h - 30, w, h + 30);
  }
}

/** Darkness over the room with stepped light pools punched out at the lamps, then additive
 *  lamp glow (LG2), searchlight lens glow (SW1) and a drifting fog band (FG1). */
export function drawLighting(ctx, fx, world, cam) {
  const T = TILE_PX; const L = world.level; const t = fx.time;
  const dc = darkLayer();
  const flick = (l, i) => (fx.reduced ? 0 : Math.round(Math.sin(t * 7.3 + i * 2.1) + Math.sin(t * 13.1 + i)) * 0.5);
  if (dc) {
    const d = dc.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, VIEW_W, VIEW_H);
    d.globalAlpha = FX.darkness; d.fillStyle = P.NV0; d.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
    d.globalCompositeOperation = 'destination-out'; d.globalAlpha = FX.lampBandCut; d.fillStyle = '#000';
    L.lamps.forEach((l, i) => {
      const x = Math.round(l.x * T - cam.x); const y = Math.round(l.y * T - cam.y);
      for (const k of FX.lampBands) { d.beginPath(); d.arc(x, y, Math.round(TUNING.hideLampRadius * T * k + flick(l, i)), 0, Math.PI * 2); d.fill(); }
    });
    for (const s of L.searchlights || []) { d.beginPath(); d.arc(s.x * T - cam.x, s.y * T - cam.y, 14, 0, Math.PI * 2); d.fill(); }
    for (const it of L.items) if (it.t === 'E') { d.beginPath(); d.arc(it.x * T - cam.x, it.y * T - cam.y, 18, 0, Math.PI * 2); d.fill(); }
    d.globalCompositeOperation = 'source-over'; d.globalAlpha = 1;
    ctx.drawImage(dc, 0, 0);
  }
  ctx.globalCompositeOperation = 'lighter';
  L.lamps.forEach((l, i) => {
    const x = Math.round(l.x * T - cam.x); const y = Math.round(l.y * T - cam.y); const R = TUNING.hideLampRadius * T;
    ctx.fillStyle = P.LG2;
    ctx.globalAlpha = 0.07; ctx.beginPath(); ctx.arc(x, y, Math.round(R * 0.95 + flick(l, i)), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.09; ctx.beginPath(); ctx.arc(x, y, Math.round(R * 0.45 + flick(l, i)), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.LG4; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(x, y + 2, 7, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = P.SW1;
  for (const s of L.searchlights || []) { ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(s.x * T - cam.x, s.y * T - cam.y, 9, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  // fog: two bands along the room's floor, drifting 4 and 2 px/s (static in reduced motion)
  const floorY = L.rows * T - cam.y;
  const drift = fx.reduced ? 0 : t * FX.fogDrift;
  for (const [col, a, h, sp, ph] of [[P.FG1, 0.16, 22, 1, 0], [P.FG2, 0.08, 12, 0.5, 2]]) {
    ctx.globalAlpha = a; ctx.fillStyle = col;
    for (let x = 0; x < VIEW_W; x += 8) {
      const top = Math.round(floorY - h - 6 * Math.sin((x + drift * sp + cam.x * 0.5) / 37 + ph) - 4);
      ctx.fillRect(x, Math.max(HUD_H, top), 8, Math.max(0, floorY - top));
    }
  }
  ctx.globalAlpha = 1;
}

const pts = (ch, cam) => ch.pts.map((p) => [p.x * TILE_PX - cam.x, p.y * TILE_PX - cam.y]);

/** The cloak: a ribbon along the chain that flares toward the hem. WP1 underside, WP2 body,
 *  a WP4 leading-edge highlight. Drawn behind her body. */
export function drawCloak(ctx, fx, world, cam) {
  if (!fx.cloak) return;
  const p = pts(fx.cloak, cam); const n = p.length;
  const half = (i) => 1.5 + (i / (n - 1)) * 3.5;
  const left = []; const right = [];
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)]; const b = p[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0]; let dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    left.push([p[i][0] - dy * half(i), p[i][1] + dx * half(i)]); right.push([p[i][0] + dy * half(i), p[i][1] - dx * half(i)]);
  }
  const poly = (ox, oy, color) => {
    ctx.fillStyle = color; ctx.beginPath();
    left.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x + ox), Math.round(y + oy)) : ctx.moveTo(Math.round(x + ox), Math.round(y + oy))));
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(Math.round(right[i][0] + ox), Math.round(right[i][1] + oy));
    ctx.closePath(); ctx.fill();
  };
  if (world.hidden) ctx.globalAlpha = 0.5;
  poly(0, 1, P.WP1); poly(0, 0, P.WP2);
  ctx.fillStyle = P.WP4;
  for (let i = 1; i < n - 1; i++) { const e = world.face > 0 ? left[i] : right[i]; ctx.fillRect(Math.round(e[0]), Math.round(e[1]), 1, 1); }
  ctx.globalAlpha = 1;
}

/** The rope: the grapple line as a sagging chain (WL1, WL0 shadow) while she's on a line, or the
 *  short tail with its hook trailing from her belt when she isn't. opts.noTail: no tail (Wren's
 *  strips draw her coil); opts.hemp: the line in the WH ramp so it matches her art's rope. */
export function drawRope(ctx, fx, world, cam, opts = {}) {
  const ch = fx.rope || (opts.noTail ? null : fx.tail); if (!ch) return; // noTail: Wren's art draws the coil at rest
  const p = pts(ch, cam);
  const line = (oy, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(Math.round(x) + 0.5, Math.round(y + oy) + 0.5) : ctx.moveTo(Math.round(x) + 0.5, Math.round(y + oy) + 0.5))); ctx.stroke(); };
  if (fx.rope) { if (opts.hemp) { line(1, P.WH0); line(0, P.WH1); } else { line(1, P.WL0); line(0, P.WL1); } return; } // hemp: Wren's tan rope (art WH ramp)
  line(0, P.WL1);
  const e = p[p.length - 1]; ctx.fillStyle = P.SL5; ctx.fillRect(Math.round(e[0]) - 1, Math.round(e[1]), 2, 2);
}

/** Lit: LG2 added at ~35% plus a 1 px LG3 rim on the side facing the nearest lamp
 *  (STYLE-GUIDE lit state). Unlit and not hidden: a 1 px MN1 moon rim on top. */
export function drawLarkLight(ctx, fx, world, cam, box) {
  if (world.hidden) return;
  if (world.lit) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.fillStyle = P.LG2;
    ctx.fillRect(box.left, box.top, box.w, box.h);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    let best = null; let bd = Infinity;
    for (const l of world.level.lamps) { const d = Math.abs(l.x - world.x) + Math.abs(l.y - world.y); if (d < bd) { bd = d; best = l; } }
    if (best) { ctx.fillStyle = P.LG3; ctx.fillRect(best.x < world.x ? box.left : box.left + box.w - 1, box.top, 1, box.h); }
  } else { ctx.fillStyle = P.MN1; ctx.fillRect(box.left + 1, box.top - 1, box.w - 2, 1); }
}

export function drawParticles(ctx, fx, cam) {
  for (const p of fx.parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, (p.life / p.max) * 1.4));
    ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
    ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x * TILE_PX - cam.x), Math.round(p.y * TILE_PX - cam.y), p.size, p.size);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

/** The catch flash (SW2), over everything but only for a few frames; never in reduced motion. */
export function drawFlash(ctx, fx) {
  if (fx.reduced || fx.flash <= 0) return;
  ctx.globalAlpha = 0.3 * (fx.flash / FX.flashCaught); ctx.fillStyle = P.SW2; ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H); ctx.globalAlpha = 1;
}

