// Pattern format + rooster-y demo patterns.
import { VOICES, DRUM_KNOBS, BASS_KNOBS, BASE_MIDI } from './engine.js';
import { kkDefaults } from './kk.js';

export const clone = (o) => JSON.parse(JSON.stringify(o));
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
// Python-style step strings from gen_rooster.py ('F1^~' = note, accent, slide; '-' = rest)
export function fromPy(seq, transpose = 12) {
  return seq.map((s) => {
    if (s === '-') return { n: 0, up: false, dn: false, acc: false, sl: false, on: false };
    const acc = s.includes('^'), sl = s.includes('~'), nm = s.replace(/[\^~]/g, '');
    let m = 12 * (+nm.slice(-1) + 1) + NOTE[nm.slice(0, -1)] + transpose - BASE_MIDI, up = false, dn = false;
    if (m > 12) { up = true; m -= 12; } else if (m < 0) { dn = true; m += 12; }
    return { n: m, up, dn, acc, sl, on: true };
  });
}
const row = (str) => [...str.replace(/\s/g, '')].map((c) => (c === 'x' || c === 'X' ? 1 : 0));

export function defaults() {
  const params = {}, levels = {}, steps = { ac: Array(16).fill(0) };
  for (const v of VOICES) {
    levels[v.id] = v.level; steps[v.id] = Array(16).fill(0); params[v.id] = {};
    for (const [k, r] of Object.entries(DRUM_KNOBS[v.id] || {})) params[v.id][k] = r[2];
  }
  const bp = { wave: 'saw' };
  for (const [k, r] of Object.entries(BASS_KNOBS)) bp[k] = r[2];
  return {
    name: 'Empty Nest', bpm: 120, swing: 0,
    drums: { steps, levels, params, accent: 0.5, mute: {} },
    bass: { steps: Array.from({ length: 16 }, () => ({ n: 0, up: false, dn: false, acc: false, sl: false, on: false })), params: bp, transpose: 0 },
    kk: kkDefaults(),
    mix: { drums: 0.9, bass: 0.85, kk: 0.75, master: 0.8 },
  };
}

function make(name, bpm, swing, drumRows, bassPy, bassP = {}, extra = {}) {
  const s = defaults(); s.name = name; s.bpm = bpm; s.swing = swing;
  for (const [k, v] of Object.entries(drumRows)) s.drums.steps[k] = row(v);
  s.bass.steps = fromPy(bassPy); Object.assign(s.bass.params, bassP);
  if (extra.drumParams) for (const [k, v] of Object.entries(extra.drumParams)) Object.assign(s.drums.params[k], v);
  return s;
}

export const DEMOS = [
  // the club-theme groove (114 BPM, F minor) from gen_rooster.py club()
  make('Midnight Strut', 114, 0.18, {
    bd: 'x...x...x...x...', cp: '....x.......x...', ch: 'x.x.x.x.x.x.x.x.', oh: '..x...x...x...x.',
    rs: '..............x.', ac: 'x...x...x...x...',
  }, ['F1^', '-', '-', 'F2~', 'G#2', '-', 'F1', '-', '-', '-', 'C2~', 'D#2', '-', 'F2^', '-', '-'],
  { cutoff: 230, reso: 3.2, envmod: 2.0, decay: 0.45, drive: 1.4 }),
  // chase-theme bass line (146 BPM, G minor) from gen_rooster.py chase()
  make('Pah-Kaw Chase', 146, 0, {
    bd: 'x...x...x.x.x...', sd: '....x.......x...', ch: 'xxxxxxxxxxxxxxxx', oh: '......x.......x.',
    ht: '.............x..', mt: '..............x.', lt: '...............x', cb: '..x.......x.....', ac: 'x...x...x...x..x',
  }, ['G1^', 'G1', 'G2', 'G1', 'A#1^', 'G1', 'G2~', 'F2', 'G1^', 'G1', 'C#2', 'D2', 'G1^', 'G2', 'F2~', 'D2'],
  { cutoff: 300, reso: 3.3, envmod: 2.6, decay: 0.3, drive: 1.6 }, { drumParams: { bd: { decay: 0.3, tune: 50 } } }),
  make('Sunny-Side Swing', 96, 0.55, {
    bd: 'x......x..x.....', sd: '....x.......x...', ch: 'x.x.x.x.x.x.x.x.', cy: 'x...............',
    rs: '.......x.....x..', cb: '...........x....', ac: 'x...x.......x...',
  }, ['C2^', '-', 'C2', 'D#2~', 'F2', '-', 'C2', '-', 'G1^', '-', 'A#1~', 'C2', '-', 'C3^', 'A#1', '-'],
  { cutoff: 180, reso: 2.8, envmod: 2.8, decay: 0.6, wave: 'square', drive: 1.8 }),
];
// a 2-bar KHAOTIC KOCK phrase, stored exactly like the loop recorder stores it: [beat, 0 on | 1 move | 2 off, x, y]
const kx = (cfg, idx) => { const n = cfg.range * ({ minor: 7 }[cfg.scale] || 7) + 1; return +((idx + 0.5) / n).toFixed(3); };
export function strutPhrase() {
  const base = { root: 5, scale: 'minor', octave: 4, range: 2 };
  const acid = { ...base, preset: 'acid', gate: 4, arp: true }, sq = { ...base, preset: 'squawk', gate: 0, arp: false };
  const a = [], q = [];
  const seq = [[0, 0], [2, 2], [4, 3], [6, 1], [7, 4]];          // F, Ab, Bb, G, C (scale steps from F3)
  seq.forEach(([b, idx], j) => { a.push([b, j ? 1 : 0, kx(acid, idx), 0.25]); });
  for (let b = 0.25; b < 8; b += 0.25) { const cur = [...seq].reverse().find((s) => s[0] <= b); a.push([b, 1, kx(acid, cur[1]), +(0.25 + 0.5 * Math.sin(Math.PI * b / 8)).toFixed(3)]); }
  a.sort((x, y) => x[0] - y[0] || x[1] - y[1]); a.push([7.95, 2, kx(acid, 4), 0.3]);
  for (const [b, idx] of [[1.5, 7], [3.5, 9], [5.5, 7], [7.5, 11]]) q.push([b, 0, kx(sq, idx), 0.05], [b + 0.12, 1, kx(sq, idx), 0.5], [b + 0.3, 1, kx(sq, idx), 0.95], [b + 0.4, 2, kx(sq, idx), 0.95]);
  return { bars: 2, layers: [{ cfg: acid, ev: a }, { cfg: sq, ev: q }] };
}
{ const s = clone(DEMOS[0]); s.name = 'Khaotic Strut'; s.kk.loop = strutPhrase(); s.kk.preset = 'squawk'; DEMOS.push(s); }

