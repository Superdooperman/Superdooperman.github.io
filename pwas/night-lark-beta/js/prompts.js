// Tutorial prompt text: the room writes {A} and {B}; each device shows its own button names.
// Keyboard: A = Z, B = X (BRIEF keyboard map). Touch and gamepad: the A and B buttons.
export const BUTTON_NAMES = Object.freeze({
  key: { A: 'Z', B: 'X' },
  touch: { A: 'A', B: 'B' },
  pad: { A: 'A', B: 'B' },
});

export function promptText(text, device = 'key') {
  const n = BUTTON_NAMES[device] || BUTTON_NAMES.key;
  return String(text).replace(/\{A\}/g, n.A).replace(/\{B\}/g, n.B);
}
