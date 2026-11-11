// Tutorial prompt text: the room writes {A} and {B}; each device shows its own button names.
// Keyboard: A = Z, B = X (BRIEF keyboard map). Touch and gamepad: the A and B buttons.
// {P} is the PULL grapple button (feel pass 1): C on the keyboard, X on a pad, PULL on touch.
// {Y} is ZIP / yank (set pieces): V on the keyboard (K on J/K/L), RB on a pad, ZIP on touch.
export const BUTTON_NAMES = Object.freeze({
  key: { A: 'Z', B: 'X', P: 'C', Y: 'V' },
  touch: { A: 'A', B: 'B', P: 'PULL', Y: 'ZIP' },
  pad: { A: 'A', B: 'B', P: 'X', Y: 'RB' },
});

export function promptText(text, device = 'key') {
  const n = BUTTON_NAMES[device] || BUTTON_NAMES.key;
  return String(text).replace(/\{A\}/g, n.A).replace(/\{B\}/g, n.B).replace(/\{P\}/g, n.P).replace(/\{Y\}/g, n.Y);
}
