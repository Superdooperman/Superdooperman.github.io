// Bricks (saved, immutable sections), songs, quantize, trim and "Surprise me" generators.
// Pure functions only (no DOM, no audio) so they can be tested in node too.
import { KK_SCALES, KK_PRESETS, cfgOf, padNotes } from './kk.js';
import { BASE_MIDI } from './engine.js';

export const clone = (o) => JSON.parse(JSON.stringify(o));
export const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
export const uid = (p = 'b') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const BRICK_COLORS = ['#f6c431', '#e0352b', '#2f9e44', '#f4efe1', '#3aa0ff', '#a65cff', '#ff8a1f', '#ff5fa2'];
export const BRICK_NAMES = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Break', 'Drop', 'Outro'];
export const brickBars = (st) => Math.max(1, st.kk?.loop?.bars || 1);

// ---------------------------------------------------------------- bricks
// A brick is a frozen snapshot of the whole workspace: { id, name, color, bars, v, created, state }
export function makeBrick(state, name, color, id = uid()) {
  const st = clone(state); delete st.origin; st.name = name;
  return deepFreeze({ id, name, color, bars: brickBars(st), v: 1, created: Date.now(), state: st });
}
export const replaceBrick = (old, state) => deepFreeze({ ...makeBrick(state, old.name, old.color, old.id), v: (old.v || 1) + 1, created: old.created });
// mini preview: which steps sound, per row, for a tiny dot grid
export function brickDots(st) {
  const d = st.drums.steps, any = (ids, i) => ids.some((k) => d[k] && d[k][i]);
  return {
    kick: d.bd.map((v) => !!v), snare: d.sd.map((v, i) => !!(v || d.cp[i] || d.rs[i])), hats: d.ch.map((v, i) => !!(v || d.oh[i] || any(['cy', 'cb'], i))),
    bass: st.bass.steps.map((s) => (s.on ? s.n + (s.up ? 12 : 0) - (s.dn ? 12 : 0) : -1)),
    kk: (st.kk.loop.layers || []).flatMap((L) => L.ev.filter((e) => e[1] === 0).map((e) => [e[0] / (4 * st.kk.loop.bars), e[2]])),
  };
}

// ---------------------------------------------------------------- song (clips = [{ uid, brick, rep }])
export const clipBars = (c, lib) => { const b = lib.find((x) => x.id === c.brick); return b ? b.bars * c.rep : 0; };
export const songBars = (clips, lib) => clips.reduce((a, c) => a + clipBars(c, lib), 0);
export const newClip = (brick, rep = 1) => ({ uid: uid('c'), brick, rep });
export function insertClips(clips, add, at = clips.length) { const o = clips.slice(); o.splice(Math.max(0, Math.min(at, o.length)), 0, ...add); return o; }
export function duplicateClips(clips, sel) {             // copies of the selected group, inserted right after the last one
  const idx = clips.map((c, i) => (sel.includes(c.uid) ? i : -1)).filter((i) => i >= 0); if (!idx.length) return { clips, sel };
  const copies = idx.map((i) => ({ ...clips[i], uid: uid('c') }));
  return { clips: insertClips(clips, copies, idx[idx.length - 1] + 1), sel: copies.map((c) => c.uid) };
}
export function moveClips(clips, sel, dir) {            // move the selected group one slot left (-1) or right (+1)
  const o = clips.slice(), idx = o.map((c, i) => (sel.includes(c.uid) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length || (dir < 0 && idx[0] === 0) || (dir > 0 && idx[idx.length - 1] === o.length - 1)) return o;
  const order = dir < 0 ? idx : idx.slice().reverse();
  for (const i of order) { const j = i + dir; [o[i], o[j]] = [o[j], o[i]]; }
  return o;
}
export function reorderClips(clips, sel, to) {          // drag-drop: take the selected group out, insert at slot `to` (index in the original list)
  const moving = clips.filter((c) => sel.includes(c.uid)), before = clips.slice(0, to).filter((c) => !sel.includes(c.uid)).length;
  return insertClips(clips.filter((c) => !sel.includes(c.uid)), moving, before);
}
export const setRepeat = (clips, sel, rep) => clips.map((c) => (sel.includes(c.uid) ? { ...c, rep: Math.max(1, Math.min(16, rep | 0)) } : c));
export const deleteClips = (clips, sel) => clips.filter((c) => !sel.includes(c.uid));
export const replaceClips = (clips, sel, brick) => clips.map((c) => (sel.includes(c.uid) ? { ...c, brick } : c));
export function unrollClips(clips, sel) {
  const out = [], newSel = [];
  for (const c of clips) {
    if (!sel.includes(c.uid) || c.rep < 2) { out.push(c); continue; }
    for (let r = 0; r < c.rep; r++) { const n = { uid: r ? uid('c') : c.uid, brick: c.brick, rep: 1 }; out.push(n); newSel.push(n.uid); }
  }
  return { clips: out, sel: newSel.length ? newSel : sel };
}
// flatten to bars: [{ brick, clip, bar (inside the brick), songBar }]
export function songSeq(clips, lib) {
  const seq = [];
  for (const c of clips) { const b = lib.find((x) => x.id === c.brick); if (!b) continue; for (let r = 0; r < c.rep; r++) for (let i = 0; i < b.bars; i++) seq.push({ brick: b, clip: c.uid, bar: i, rep: r, songBar: seq.length }); }
  return seq;
}
export const songsUsing = (projects, brickId) => Object.values(projects).filter((p) => (p.clips || p.song?.clips || []).some((c) => c.brick === brickId)).map((p) => p.name);

// ---------------------------------------------------------------- quantize (gesture layers: [beat, 0 on | 1 move | 2 off, x, y])
export const QUANT = { off: 0, '1/8': 0.5, '1/16': 0.25, '1/16T': 1 / 6 };
export function quantizeEvents(ev, grid, strength, loopBeats) {
  if (!grid || !strength) return ev.map((e) => e.slice());
  const q = (b) => b + (Math.round(b / grid) * grid - b) * strength, out = [];
  let shift = 0, on = null;
  for (const e of ev.slice().sort((a, b) => a[0] - b[0])) {
    const n = e.slice();
    if (e[1] === 0) { n[0] = q(e[0]); if (n[0] >= loopBeats - 1e-9) n[0] = Math.floor(e[0] / grid) * grid; shift = n[0] - e[0]; on = n; }
    else if (e[1] === 2) { n[0] = Math.max(q(e[0]), on ? on[0] + grid * strength : 0); on = null; }
    else n[0] = Math.max(on ? on[0] : 0, e[0] + shift);
    n[0] = Math.min(loopBeats - 0.002, Math.max(0, +n[0].toFixed(5)));
    out.push(n);
  }
  return out.sort((a, b) => a[0] - b[0] || order(a) - order(b));
}
const order = (e) => (e[1] === 2 ? 0 : e[1] === 0 ? 1 : 2);   // at the same time: off, then on, then moves
// split a layer into notes: [{ on, off, events[] }]
export function notesOf(ev) {
  const notes = []; let cur = null;
  for (const e of ev) {
    if (e[1] === 0) { if (cur) { cur.off = e[0]; notes.push(cur); } cur = { on: e[0], off: null, ev: [e] }; }
    else if (cur) { cur.ev.push(e); if (e[1] === 2) { cur.off = e[0]; notes.push(cur); cur = null; } }
  }
  if (cur) { cur.off = Infinity; notes.push(cur); }
  return notes;
}

// ---------------------------------------------------------------- trim
// Keep beats [start, end) of the workspace. mode 'pad': length rounds UP to whole bars (silence after the end);
// 'cut': length rounds DOWN to whole bars (min 1). Notes that start before `start` are dropped (no half notes);
// notes still sounding at the new end get an off just before it. Drum and bass loops rotate if start is mid-bar.
export function trimLength(start, end, mode) {
  const beats = Math.max(0, end - start), bars = mode === 'cut' ? Math.max(1, Math.floor(beats / 4 + 1e-9)) : Math.max(1, Math.ceil(beats / 4 - 1e-9));
  return { beats, bars, end: mode === 'cut' ? Math.min(end, start + bars * 4) : end, pad: bars * 4 - Math.min(beats, bars * 4) };
}
export function trimState(st, start, end, mode = 'pad') {
  const o = clone(st), tl = trimLength(start, end, mode), L = tl.bars * 4, cutEnd = tl.end;
  o.kk.loop.bars = tl.bars;
  o.kk.loop.layers = o.kk.loop.layers.map((layer) => {
    const ev = [];
    for (const n of notesOf(layer.ev)) {
      if (n.on < start - 1e-9 || n.on >= cutEnd - 1e-9) continue;
      for (const e of n.ev) if (e[0] < cutEnd - 1e-9) ev.push([+(e[0] - start).toFixed(5), e[1], e[2], e[3]]);
      if (!(n.off < cutEnd - 1e-9)) { const last = n.ev[n.ev.length - 1]; ev.push([+Math.min(cutEnd - start, L) - 0.004, 2, last[2], last[3]].map((v, i) => (i === 0 ? +v.toFixed(5) : v))); }
    }
    return { ...layer, ev: ev.filter((e) => e[0] >= 0 && e[0] < L).sort((a, b) => a[0] - b[0] || order(a) - order(b)) };
  }).filter((l) => l.ev.length);
  const rot = (((Math.round(start * 4) % 16) + 16) % 16);
  if (rot) { const r = (a) => a.slice(rot).concat(a.slice(0, rot)); for (const k in o.drums.steps) o.drums.steps[k] = r(o.drums.steps[k]); o.bass.steps = r(o.bass.steps); }
  return o;
}
// remove events outside [start, end) without changing the length; and delete one note
export function removeOutside(st, start, end) {
  const o = clone(st);
  o.kk.loop.layers = o.kk.loop.layers.map((l) => ({ ...l, ev: notesOf(l.ev).filter((n) => n.on >= start - 1e-9 && n.on < end - 1e-9).flatMap((n) => {
    const ev = n.ev.filter((e) => e[0] < end); if (!(n.off < end)) ev.push([+(end - 0.004).toFixed(5), 2, ev[ev.length - 1][2], ev[ev.length - 1][3]]); return ev; }) })).filter((l) => l.ev.length);
  return o;
}
export function deleteNote(st, layerIdx, onBeat) {
  const o = clone(st), l = o.kk.loop.layers[layerIdx]; if (!l) return o;
  l.ev = notesOf(l.ev).filter((n) => Math.abs(n.on - onBeat) > 1e-6).flatMap((n) => n.ev);
  if (!l.ev.length) o.kk.loop.layers.splice(layerIdx, 1);
  return o;
}

// ---------------------------------------------------------------- Surprise me (always in key)
export function rng(seed = Date.now()) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const pat = (s) => [...s].map((c) => (c === 'x' ? 1 : 0));
export function surpriseDrums(r) {
  const kick = pick(r, ['x...x...x...x...', 'x.....x...x.....', 'x...x...x..x.x..', 'x..x..x...x.....', 'x...x.....x.x...']);
  const snare = pick(r, ['....x.......x...', '....x.......x..x', '....x.......x.x.']);
  const hats = pick(r, ['x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', '..x...x...x...x.', 'x.xxx.xxx.xxx.xx']);
  const st = { bd: pat(kick), ch: pat(hats), oh: Array(16).fill(0), sd: Array(16).fill(0), cp: Array(16).fill(0), rs: Array(16).fill(0),
    lt: Array(16).fill(0), mt: Array(16).fill(0), ht: Array(16).fill(0), cb: Array(16).fill(0), cy: Array(16).fill(0), ac: pat('x...x...x...x...') };
  st[r() < 0.5 ? 'sd' : 'cp'] = pat(snare);
  if (r() < 0.6) for (const i of [2, 6, 10, 14]) if (r() < 0.6 && !st.ch[i]) st.oh[i] = 1; else if (r() < 0.4) { st.oh[i] = 1; st.ch[i] = 0; }
  if (r() < 0.5) st.rs[pick(r, [7, 11, 14, 15])] = 1;
  if (r() < 0.35) st.cb[pick(r, [3, 10, 11])] = 1;
  if (r() < 0.3) { st.ht[13] = 1; st.mt[14] = 1; st.lt[15] = 1; }
  return st;
}
export function surpriseBass(r, root, scale) {
  const sc = KK_SCALES[scale] || KK_SCALES.minor, rootN = ((root - BASE_MIDI) % 12 + 12) % 12;
  const deg = (d) => { const o = Math.floor(d / sc.length), i = ((d % sc.length) + sc.length) % sc.length; return rootN + sc[i] + 12 * o; };
  const rhythm = pick(r, ['x..x.x..x..x.x..', 'x.xx..x.x.x..xx.', 'x...x.x.x...x.xx', 'xx.x.xx.x.xx.x.x']);
  return [...rhythm].map((c, i) => {
    if (c !== 'x') return { n: 0, up: false, dn: false, acc: false, sl: false, on: false };
    let n = i === 0 ? deg(0) : deg(pick(r, [0, 0, 0, 2, 4, 4, 5, 7, -3]));
    let up = false, dn = false; while (n > 12) { n -= 12; up = true; } while (n < 0) { n += 12; dn = true; }
    if (n === 12 && up) { n = 12; }
    if (!up && r() < 0.15 && n <= 12) up = n + 12 <= 24 && r() < 0.5;
    return { n, up, dn, acc: i % 4 === 0 ? r() < 0.6 : r() < 0.15, sl: r() < 0.18, on: true };
  });
}
export function surpriseKK(r, kk, bars) {
  const melodic = ['acid', 'super', 'square', 'calliope', 'vibes', 'bell', 'squawk', 'horn'];
  const preset = melodic.includes(kk.preset) ? kk.preset : pick(r, melodic);
  const cfg = { ...cfgOf(kk), preset, gate: 0, arp: false }, n = padNotes(cfg).length, ev = [], lb = 4 * bars;
  const span = Math.min(n, (KK_SCALES[cfg.scale] || KK_SCALES.minor).length + 1);
  let idx = Math.floor(r() * 3), b = 0;
  const lens = [0.5, 0.5, 1, 0.25, 0.75, 1.5];
  while (b < lb - 0.25) {
    if (r() < 0.25) { b += 0.5; continue; }
    const len = Math.min(pick(r, lens), lb - b - 0.01), x = (idx + 0.5) / n, y = +(0.3 + 0.5 * r()).toFixed(3);
    ev.push([b, 0, +x.toFixed(4), y], [+(b + len * 0.5).toFixed(4), 1, +x.toFixed(4), +Math.min(1, y + 0.2).toFixed(3)], [+(b + len * 0.9).toFixed(4), 2, +x.toFixed(4), y]);
    idx = Math.max(0, Math.min(span - 1, idx + pick(r, [-2, -1, -1, 0, 1, 1, 2, 3])));
    b = +(b + len).toFixed(4);
  }
  return { cfg, ev };
}
// a sensible first groove for a fresh workspace
export function starterGroove(st) {
  const o = clone(st);
  Object.assign(o.drums.steps, { bd: pat('x...x...x...x...'), cp: pat('....x.......x...'), ch: pat('x.x.x.x.x.x.x.x.'), oh: pat('..x...x...x...x.'), ac: pat('x...x...x...x...') });
  const root = ((o.kk.root - BASE_MIDI) % 12 + 12) % 12;
  o.bass.steps = [...'x..x..x...x..x..'].map((c, i) => ({ n: root, up: i === 10, dn: false, acc: i === 0, sl: false, on: c === 'x' }));
  return o;
}
