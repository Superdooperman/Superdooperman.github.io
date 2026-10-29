// Input abstraction: keyboard, touch buttons and gamepads all feed one set of actions.
// The sim reads a snapshot { held, pressed } taken once per fixed step, so edges
// ("pressed this step") match v1, which compared each step's keys with the previous step's.
//
// Actions follow the v2 pad (BRIEF: D-pad, A jump, B line, Start, Select), plus two
// v1-compat actions the ported engine still uses until M1's controls replace them:
// 'use' (v1 E / Enter) and 'crouch' (v1 C).
export const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'fire', 'start', 'select', 'use', 'crouch'];

/** Keyboard per BRIEF (arrows/WASD, Z/Space = A, X/J = B, Enter = Start, Shift = Select),
 *  plus v1's E (use) and C (crouch). (M0 also mapped Enter to use like v1; in M1 Enter is
 *  Start only, which pauses. The v1-controls parity replay uses E.) */
export const KEY_MAP = Object.freeze({
  ArrowLeft: ['left'], KeyA: ['left'],
  ArrowRight: ['right'], KeyD: ['right'],
  ArrowUp: ['up'], KeyW: ['up'],
  ArrowDown: ['down'], KeyS: ['down'],
  Space: ['jump'], KeyZ: ['jump'],
  KeyJ: ['fire'], KeyX: ['fire'],
  Enter: ['start'], Escape: ['start'],
  ShiftLeft: ['select'], ShiftRight: ['select'],
  KeyE: ['use'], KeyC: ['crouch'],
});

/** Gamepad API "standard" mapping. */
export const PAD_BUTTONS = Object.freeze({ 0: 'jump', 1: 'fire', 2: 'fire', 3: 'use', 8: 'select', 9: 'start', 12: 'up', 13: 'down', 14: 'left', 15: 'right' });
export const PAD_DEADZONE = 0.5;

export function actionsFromKeys(codes) {
  const out = new Set();
  for (const c of codes) for (const a of KEY_MAP[c] || []) out.add(a);
  return out;
}

export function actionsFromPads(pads) {
  const out = new Set();
  for (const p of pads || []) {
    if (!p || !p.connected) continue;
    p.buttons.forEach((b, i) => {
      const a = PAD_BUTTONS[i];
      if (a && (b.pressed || b.value > 0.5)) out.add(a);
    });
    const [ax = 0, ay = 0] = p.axes || [];
    if (ax < -PAD_DEADZONE) out.add('left');
    if (ax > PAD_DEADZONE) out.add('right');
    if (ay < -PAD_DEADZONE) out.add('up');
    if (ay > PAD_DEADZONE) out.add('down');
  }
  return out;
}

/** The browser's pad list (Gamepad API), or [] when there is none. */
export function navigatorPads() {
  const nav = globalThis.navigator;
  if (!nav || typeof nav.getGamepads !== 'function') return [];
  try { return Array.from(nav.getGamepads() || []); } catch { return []; }
}

export function createInput({ getGamepads = navigatorPads } = {}) {
  const keys = new Set();
  const touch = new Set();
  const tapped = new Set(); // actions pressed since the last sample (a tap shorter than a step still counts)
  let prev = new Set();
  let point = null;
  const input = {
    /** 'key' | 'touch' | 'pad': whichever was used last (prompts show matching button names). */
    device: 'key',
    /** Gamepads seen as connected (index -> id), kept by gamepadconnected/disconnected. */
    pads: new Map(),
    keyDown(code) { keys.add(code); for (const a of KEY_MAP[code] || []) tapped.add(a); if (KEY_MAP[code]) input.device = 'key'; },
    keyUp(code) { keys.delete(code); },
    setKeys(codes) { keys.clear(); for (const c of codes) keys.add(c); },
    touchSet(action, on) { if (on) { touch.add(action); tapped.add(action); input.device = 'touch'; } else touch.delete(action); },
    /** A tap/click on the game screen at world tile coords (fires the line at a point there). */
    pointAt(x, y, device) { point = { x, y }; if (device) input.device = device; },
    clear() { keys.clear(); touch.clear(); tapped.clear(); point = null; },
    padConnected(pad) { if (pad) input.pads.set(pad.index, pad.id); },
    padDisconnected(pad) { if (pad) input.pads.delete(pad.index); },
    /** Take one snapshot per fixed step: { held, pressed, released, aimAt }. */
    sample() {
      const now = actionsFromKeys(keys);
      for (const a of touch) now.add(a);
      for (const a of tapped) now.add(a);
      tapped.clear();
      if (getGamepads) {
        const padActs = actionsFromPads(getGamepads());
        if (padActs.size) input.device = 'pad';
        for (const a of padActs) now.add(a);
      }
      const held = {};
      const pressed = {};
      const released = {};
      for (const a of ACTIONS) {
        held[a] = now.has(a);
        pressed[a] = now.has(a) && !prev.has(a);
        released[a] = !now.has(a) && prev.has(a);
      }
      prev = now;
      const aimAt = point;
      point = null;
      return { held, pressed, released, aimAt };
    },
  };
  return input;
}

/** Wire gamepadconnected / gamepaddisconnected (browser only). On disconnect the pad's
 *  buttons stop counting at once (the next sample no longer sees it), so nothing sticks held. */
export function bindGamepads(input, target = window) {
  const on = (e) => input.padConnected(e.gamepad);
  const off = (e) => input.padDisconnected(e.gamepad);
  target.addEventListener('gamepadconnected', on);
  target.addEventListener('gamepaddisconnected', off);
  return () => {
    target.removeEventListener('gamepadconnected', on);
    target.removeEventListener('gamepaddisconnected', off);
  };
}

/** Wire DOM events to an input (browser only). Returns an unbind function. */
export function bindKeyboard(input, target = window) {
  const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const down = (e) => { if (PREVENT.has(e.code)) e.preventDefault(); if (!e.repeat) input.keyDown(e.code); };
  const up = (e) => input.keyUp(e.code);
  const blur = () => input.clear();
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    target.removeEventListener('blur', blur);
  };
}
