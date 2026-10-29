// Fixed-dt loop (ported from v1): accumulate real time (clamped to MAX_FRAME_DT),
// run whole FIXED_DT steps, then render once. tick() is pure so tests can drive it.
import { FIXED_DT, MAX_FRAME_DT } from './config.js';

export function createLoop({ step, render, dt = FIXED_DT, maxFrame = MAX_FRAME_DT }) {
  let last = null;
  let acc = 0;
  let handle = 0;
  let running = false;
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null;
  const caf = typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : null;

  /** Advance to time `nowMs`. Returns the number of fixed steps taken. */
  function tick(nowMs) {
    if (last === null) last = nowMs;
    const frame = Math.min(maxFrame, Math.max(0, (nowMs - last) / 1000));
    last = nowMs;
    acc += frame;
    let steps = 0;
    while (acc >= dt) { step(dt); acc -= dt; steps++; }
    if (render) render(acc / dt);
    return steps;
  }
  function frame(t) { if (!running) return; tick(t); handle = raf(frame); }

  return {
    tick,
    start() { if (running || !raf) return; running = true; last = null; handle = raf(frame); },
    stop() { running = false; if (caf) caf(handle); },
    get accumulator() { return acc; },
  };
}

export function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
