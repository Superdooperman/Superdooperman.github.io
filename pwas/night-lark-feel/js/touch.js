// On-screen touch controls (DOM buttons overlaid on the game view, semi-transparent; there are
// no letterbox margins any more, see canvas.js fillBox). D-pad on the left with
// roll-over (slide a thumb between directions, diagonals included); A and B on the right,
// Start and Select small at the top. Every button is at least 48 CSS px. Pointer capture keeps
// a held button held while the thumb drifts; a lost pointer releases it.
//
// Visibility (feel-fix-3): menu setting On / Off / Auto. Auto hides the pad when a gamepad
// connects and shows it again on the next touch. Once that pad is actually used, auto hides
// the controls again. Persisted via save.settings.touch.

/** Auto mode hides the on-screen controls when a connected pad is used. Idle connection
 *  does not: a touch may show them until the next pad button or stick. */
export function autoHidesOnPadUse(mode, padConnected, padUsed) {
  return (mode || 'auto') === 'auto' && !!padConnected && !!padUsed;
}
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

export function bindTouch(input, root, { forceShow = false, getMode = () => 'auto', hasPad = () => false } = {}) {
  const api = {
    shown: false,
    lastTouch: 0,
    show() {
      if (mode() === 'off') { hide(); return; }
      if (!api.shown) { api.shown = true; root.hidden = false; }
    },
    hide: hide,
    refresh() { apply(); },
    /** Call after each input sample. `used` is true when that sample read the pad. */
    notePad(used) { if (autoHidesOnPadUse(mode(), hasPad(), used)) hide(); },
  };
  function mode() { return getMode() || 'auto'; }
  function hide() { if (api.shown || !root.hidden) { api.shown = false; root.hidden = true; } }
  function apply() {
    const m = mode();
    if (m === 'on' || forceShow) { api.show(); return; }
    if (m === 'off') { hide(); return; }
    // auto: hide while a pad is connected, unless a touch happened after the last pad sample
    if (hasPad() && (typeof performance === 'undefined' || performance.now() - api.lastTouch > 400)) hide();
    else if (api.shown || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)) api.show();
  }
  apply();
  addEventListener('touchstart', () => {
    api.lastTouch = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (mode() !== 'off') api.show();
  }, { passive: true, capture: true });

  // A, B, Start, Select, PULL: one action each.
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
