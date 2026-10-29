// On-screen touch controls (DOM buttons over the letterbox margins). D-pad on the left with
// roll-over (slide a thumb between directions, diagonals included); A and B on the right,
// Start and Select small at the top. Every button is at least 48 CSS px. Pointer capture keeps
// a held button held while the thumb drifts; a lost pointer releases it.
export const DPAD_DEAD = 0.25; // fraction of the pad radius ignored at the centre

/** Pure: which directions a point on the D-pad means. dx, dy are offsets from its centre,
 *  r its radius. 8-way: a diagonal when both components are big enough. */
export function dpadDirs(dx, dy, r) {
  const out = [];
  const m = Math.hypot(dx, dy);
  if (m < r * DPAD_DEAD) return out;
  const ax = Math.abs(dx) / m; const ay = Math.abs(dy) / m;
  if (ax > 0.38) out.push(dx < 0 ? 'left' : 'right');
  if (ay > 0.38) out.push(dy < 0 ? 'up' : 'down');
  return out;
}

export function bindTouch(input, root, { forceShow = false } = {}) {
  const api = {
    shown: false,
    show() { if (!api.shown) { api.shown = true; root.hidden = false; } },
  };
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  if (forceShow || coarse) api.show();
  addEventListener('touchstart', () => api.show(), { passive: true, capture: true });

  // A, B, Start, Select: one action each.
  for (const el of root.querySelectorAll('[data-action]')) {
    const action = el.dataset.action;
    const down = (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); el.classList.add('on'); input.touchSet(action, true); };
    const up = (e) => { e.preventDefault(); el.classList.remove('on'); input.touchSet(action, false); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  }

  // D-pad: one element, directions from the thumb position.
  const pad = root.querySelector('.dpad');
  let padPointer = null; let held = [];
  const setDirs = (dirs) => {
    for (const d of held) if (!dirs.includes(d)) input.touchSet(d, false);
    for (const d of dirs) if (!held.includes(d)) input.touchSet(d, true);
    held = dirs;
    pad.dataset.dirs = dirs.join(' ');
  };
  const fromEvent = (e) => {
    const r = pad.getBoundingClientRect();
    const rad = r.width / 2;
    return dpadDirs(e.clientX - (r.left + rad), e.clientY - (r.top + r.height / 2), rad);
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); padPointer = e.pointerId; pad.setPointerCapture?.(e.pointerId); setDirs(fromEvent(e)); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === padPointer) setDirs(fromEvent(e)); });
  const end = (e) => { if (e.pointerId === padPointer) { padPointer = null; setDirs([]); } };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  pad.addEventListener('lostpointercapture', end);
  return api;
}
