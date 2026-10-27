// KHAOTIC KOCK - presets, scales and the X/Y -> note mapping (shared by the live UI and offline renders).
import { NAMES } from './names.js';
export const KK_PRESETS = [
  { id: 'acid', name: 'Acid Cluck', y: 'Cutoff', oct: -12, info: `the ${NAMES.bass} voice on a pad` },
  { id: 'super', name: 'Super Sunny-Side', y: 'Brightness', oct: 0, info: '7-saw supersaw' },
  { id: 'square', name: 'Square Egg', y: 'Pulse width', oct: 0, info: 'PWM square lead' },
  { id: 'calliope', name: 'Coop Calliope', y: 'Brightness', oct: 0, info: 'steam organ' },
  { id: 'whistle', name: 'Slide Chick-Whistle', y: 'Vibrato', oct: 12, free: true, info: 'unquantized slide whistle' },
  { id: 'horn', name: 'Honk-a-Doodle', y: 'Honk', oct: -12, info: 'clown horn' },
  { id: 'vibes', name: 'Yolk Vibes', y: 'Tremolo', oct: 12, info: 'vibraphone' },
  { id: 'bell', name: 'Egg Timer Bell', y: 'FM index', oct: 12, info: 'FM bell' },
  { id: 'wobble', name: 'Wobble Wattle', y: 'Wobble rate', oct: -24, info: 'tempo-synced wobble bass' },
  { id: 'sub', name: 'Sub Roost', y: 'Drive', oct: -24, info: 'sine sub bass' },
  { id: 'pad', name: 'Nest Pad', y: 'Filter', oct: -12, info: 'warm saw pad' },
  { id: 'riser', name: 'Rooster Riser', y: 'Sweep speed', oct: 0, info: 'noise riser / FX' },
  { id: 'squawk', name: 'PAH-KAW Squawk', y: 'Vowel', oct: -12, info: 'formant squawk' },
  { id: 'laser', name: 'Laser Hen', y: 'Zap length', oct: 0, info: 'pitch-drop zap' },
  { id: 'drums', name: 'Drum Coop', y: 'Tune', oct: 0, drums: true, info: `X picks a ${NAMES.drums} voice, Y tunes it` },
];
export const KK_SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], 'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'pentatonic major': [0, 2, 4, 7, 9], 'pentatonic minor': [0, 3, 5, 7, 10], blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], 'whole tone': [0, 2, 4, 6, 8, 10], hirajoshi: [0, 2, 3, 7, 8], chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};
export const KK_GATES = [['Off', 0], ['1/8', 2], ['1/8T', 3], ['1/16', 4], ['1/32', 8]];   // divisions per beat
export const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const DRUM_ORDER = ['bd', 'sd', 'cp', 'rs', 'lt', 'mt', 'ht', 'ch', 'oh', 'cb', 'cy'];
export const presetById = (id) => KK_PRESETS.find((p) => p.id === id) || KK_PRESETS[0];
export const kkDefaults = () => ({ preset: 'acid', root: 5, scale: 'minor', octave: 4, range: 2, gate: 0, arp: false, hold: false, echo: 0.25,
  loop: { bars: 2, layers: [] } });
// cfg = the parts of the KK state that decide how a gesture sounds (stored with each loop layer)
export const cfgOf = (k) => ({ preset: k.preset, root: k.root, scale: k.scale, octave: k.octave, range: k.range, gate: k.gate, arp: k.arp });

// all notes the pad spans (MIDI), low to high, ending on the root above the top octave
export function padNotes(c) {
  const sc = KK_SCALES[c.scale] || KK_SCALES.minor, pr = presetById(c.preset);
  const base = 12 * (c.octave + 1) + c.root + (pr.oct || 0), out = [];
  for (let o = 0; o < c.range; o++) for (const d of sc) out.push(base + 12 * o + d);
  out.push(base + 12 * c.range);
  return out;
}
export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// x (0..1) -> { m (MIDI, maybe fractional), idx, fs (arp notes in Hz) }
export function mapX(c, x) {
  const pr = presetById(c.preset), notes = padNotes(c);
  x = Math.min(0.9999, Math.max(0, x));
  if (pr.free) { const m = notes[0] + x * (notes[notes.length - 1] - notes[0]); return { m, idx: -1, f: midiHz(m), fs: null }; }
  const idx = Math.floor(x * notes.length), m = notes[idx];
  // arp: root, 3rd-ish, 5th-ish, octave snapped up into the scale
  const sc = KK_SCALES[c.scale] || KK_SCALES.minor;
  const snap = (iv) => { for (let k = iv; k < iv + 12; k++) if (sc.includes((((m + k - c.root) % 12) + 12) % 12)) return k; return iv; };
  const fs = [0, snap(3), snap(7), 12].map((iv) => midiHz(m + iv));
  return { m, idx, f: midiHz(m), fs };
}
