// Midnight's Yolk Box - input sanitizing for everything that comes back from localStorage or an imported JSON file.
// Every value is rebuilt from a known shape: ids/colours must match a strict pattern, numbers are clamped,
// unknown keys are dropped and list sizes are capped. Nothing from a file reaches the page unchecked.
import { VOICES, DRUM_KNOBS, BASS_KNOBS } from './engine.js';
import { KK_PRESETS, KK_SCALES, KK_GATES } from './kk.js';
import { defaults } from './patterns.js';
import { uid, BRICK_COLORS } from './bricks.js';

export const LIMITS = { bricks: 500, clips: 1000, projects: 200, layers: 16, events: 20000, kkRawLayer: 8000, kkEvents: 2000, kkBarEvents: 256, bars: 64, songBars: 1024, name: 40, importBytes: 2 * 1024 * 1024 };
export const ID_RE = /^[a-z]\w{1,40}$/, COLOR_RE = /^#[0-9a-f]{3,8}$/i;
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
export const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
export const int = (v, lo, hi, d) => Math.round(num(v, lo, hi, d));
export const bool = (v, d = false) => (typeof v === 'boolean' ? v : d);
export const text = (v, d = '', max = LIMITS.name) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : d);
export const okId = (v) => typeof v === 'string' && ID_RE.test(v);
export const id = (v, prefix = 'b') => (okId(v) ? v : uid(prefix));
export const color = (v, d = BRICK_COLORS[0]) => (typeof v === 'string' && COLOR_RE.test(v) ? v.toLowerCase() : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const steps16 = (a, mk) => Array.from({ length: 16 }, (_, i) => mk(Array.isArray(a) ? a[i] : undefined));
const knobs = (src, spec, base) => { const o = { ...base }; for (const [k, r] of Object.entries(spec)) o[k] = num(isObj(src) ? src[k] : undefined, r[0], r[1], r[2]); return o; };

function kkCfg(c, d) {
  c = isObj(c) ? c : {};
  return { preset: oneOf(c.preset, KK_PRESETS.map((p) => p.id), d.preset), root: int(c.root, 0, 11, d.root), scale: oneOf(c.scale, Object.keys(KK_SCALES), d.scale),
    octave: int(c.octave, 1, 7, d.octave), range: int(c.range, 1, 4, d.range), gate: oneOf(c.gate, KK_GATES.map((g) => g[1]), d.gate), arp: bool(c.arp, d.arp) };
}
function layer(l, bars, d) {
  if (!isObj(l)) return null;
  const lb = 4 * bars, ev = (Array.isArray(l.ev) ? l.ev : []).slice(0, LIMITS.kkRawLayer) // hard cap before any sort or thinning
    .filter((e) => Array.isArray(e) && e.length >= 4)
    .map((e) => [num(e[0], 0, lb, 0), int(e[1], 0, 2, 1), num(e[2], 0, 1, 0.5), num(e[3], 0, 1, 0.5)]);
  return { cfg: kkCfg(l.cfg, d), ev };
}

// a whole workspace / brick state
export function state(s) {
  const d = defaults(); s = isObj(s) ? s : {};
  const o = { ...d, name: text(s.name, d.name), bpm: num(s.bpm, 60, 300, d.bpm), swing: num(s.swing, 0, 1, d.swing) };
  if (okId(s.origin)) o.origin = s.origin;
  const sd = isObj(s.drums) ? s.drums : {}, sb = isObj(s.bass) ? s.bass : {}, sk = isObj(s.kk) ? s.kk : {}, sm = isObj(s.mix) ? s.mix : {};
  const steps = {}, levels = {}, params = {}, mute = {};
  for (const k of Object.keys(d.drums.steps)) steps[k] = steps16(isObj(sd.steps) ? sd.steps[k] : null, (v) => (v ? 1 : 0));
  for (const v of VOICES) {
    levels[v.id] = num(isObj(sd.levels) ? sd.levels[v.id] : undefined, 0, 1, d.drums.levels[v.id]);
    params[v.id] = knobs(isObj(sd.params) ? sd.params[v.id] : null, DRUM_KNOBS[v.id] || {}, {});
    if (isObj(sd.mute) && sd.mute[v.id] === true) mute[v.id] = true;
  }
  o.drums = { steps, levels, params, accent: num(sd.accent, 0, 1, d.drums.accent), mute };
  o.bass = {
    steps: steps16(sb.steps, (x) => { x = isObj(x) ? x : {}; return { n: int(x.n, 0, 12, 0), up: bool(x.up), dn: bool(x.dn), acc: bool(x.acc), sl: bool(x.sl), on: bool(x.on) }; }),
    params: knobs(sb.params, BASS_KNOBS, { wave: oneOf(isObj(sb.params) ? sb.params.wave : '', ['saw', 'square'], d.bass.params.wave) }),
    transpose: int(sb.transpose, -24, 24, d.bass.transpose),
  };
  const k = { ...kkCfg(sk, d.kk), hold: bool(sk.hold, d.kk.hold), echo: num(sk.echo, 0, 1, d.kk.echo) };
  const sl = isObj(sk.loop) ? sk.loop : {}, bars = int(sl.bars, 1, LIMITS.bars, d.kk.loop.bars);
  k.loop = { bars, layers: (Array.isArray(sl.layers) ? sl.layers : []).slice(0, LIMITS.layers).map((l) => layer(l, bars, d.kk)).filter(Boolean) };
  if (capKK(k.loop.layers)) capHits++;
  o.kk = k;
  o.mix = {}; for (const m of Object.keys(d.mix)) o.mix[m] = num(sm[m], 0, 1, d.mix[m]);
  return o;
}
export function brick(b) {
  if (!isObj(b) || !isObj(b.state)) return null;
  const st = state(b.state), name = text(b.name, 'Brick') || 'Brick'; delete st.origin; st.name = name;
  return { id: id(b.id, 'b'), name, color: color(b.color), bars: st.kk.loop.bars, v: int(b.v, 1, 64, 1), created: int(b.created, 0, 8.64e15, Date.now()), state: st };
}
export function clips(list, brickIds) {
  const out = (Array.isArray(list) ? list : []).slice(0, LIMITS.clips)
    .filter((c) => isObj(c) && okId(c.brick) && (!brickIds || brickIds.has(c.brick)))
    .map((c) => ({ uid: id(c.uid, 'c'), brick: c.brick, rep: int(c.rep, 1, LIMITS.bars, 1) }));
  return brickIds instanceof Map ? capSong(out, brickIds) : out;
}
// keep the whole song under LIMITS.songBars (bars x repeats), so a file can't ask for millions of bars
export function capSong(list, barsById) {
  let total = 0; const out = [];
  for (const c of list) {
    const bars = barsById.get(c.brick) || 1, room = LIMITS.songBars - total;
    if (room < bars) break;
    const rep = Math.min(c.rep, Math.floor(room / bars)); total += bars * rep; out.push(rep === c.rep ? c : { ...c, rep });
  }
  return out;
}
export function bricks(list) {
  const seen = new Set(), out = [];
  for (const b of (Array.isArray(list) ? list : []).slice(0, LIMITS.bricks)) {
    const nb = brick(b); if (!nb) continue;
    if (seen.has(nb.id)) nb.id = uid('b');
    seen.add(nb.id); out.push(nb);
  }
  return out;
}
export function project(p, brickIds) {
  if (!isObj(p)) return null;
  return { id: id(p.id, 'p'), name: text(p.name, 'Song') || 'Song', clips: clips(p.clips, brickIds), ws: state(p.ws) };
}
export function projects(obj, brickIds) {
  const out = {};
  for (const p of (isObj(obj) ? Object.values(obj) : []).slice(0, LIMITS.projects)) { const np = project(p, brickIds); if (np && !out[np.id]) out[np.id] = np; }
  return Object.keys(out).length ? out : null;
}
export function prefs(p, d) {
  p = isObj(p) ? p : {};
  return { q: oneOf(p.q, ['off', '1/8', '1/16', '1/16T'], d.q), qs: num(p.qs, 0, 1, d.qs), countIn: bool(p.countIn, d.countIn), click: bool(p.click, d.click),
    clickVol: num(p.clickVol, 0, 1, d.clickVol), inKey: bool(p.inKey, d.inKey), dancer: oneOf(p.dancer, ['rooster', 'gobbler', 'yolky'], d.dancer) };
}

// ---- pad loop event caps: about 2000 events per brick and 256 per bar (all layers together).
// Slides (move events) are thinned first, evenly, so the notes and their ends stay; only if a bar is still
// over the cap are whole notes (on ... off) dropped from the end of that bar.
let capHits = 0;
export function takeCapHits() { const n = capHits; capHits = 0; return n; }
// Linear time: drops are flagged in one array and the list is filtered once at the end. Same result as the
// old drop-and-refilter loop (which went quadratic on crafted files): spread the move drops evenly, then take
// notes off the end, each with the rest of its layer's events up to its off.
function thin(items, max) {            // items: [{ l, e }] in time order; returns the kept subset
  const n = items.length; let over = n - max; if (over <= 0) return items;
  const dead = new Uint8Array(n); let alive = n;
  const moves = []; for (let i = 0; i < n; i++) if (items[i].e[1] === 1) moves.push(i);
  if (moves.length) { const k = Math.min(over, moves.length); for (let i = 0; i < k; i++) dead[moves[Math.floor(((i + 0.5) * moves.length) / k)]] = 1; over -= k; alive -= k; }
  if (over > 0) {
    // per-layer index lists with a "next alive" skip, so following a note to its off never rescans
    const lists = new Map(), pos = new Int32Array(n);
    for (let i = 0; i < n; i++) { let a = lists.get(items[i].l); if (!a) lists.set(items[i].l, (a = [])); pos[i] = a.length; a.push(i); }
    const skip = new Map(); for (const [L, a] of lists) { const nx = new Int32Array(a.length + 1); for (let k = 0; k <= a.length; k++) nx[k] = k + 1; skip.set(L, nx); }
    const nextAlive = (a, nx, k) => { let r = k; while (r < a.length && dead[a[r]]) r = nx[r]; while (k < r && k < a.length) { const t = nx[k]; nx[k] = r; k = t; } return r; };
    let f = 0, q = n - 1, p = n - 1;   // first alive, last alive, backward pointer for the last note-on
    while (over > 0 && alive > 0) {
      while (dead[f]) f++; while (dead[q]) q--; if (p < f) p = f;
      while (p > f && (dead[p] || items[p].e[1] !== 0)) p--;
      const i = p, L = items[i].l, a = lists.get(L), nx = skip.get(L);
      dead[i] = 1; let size = 1;
      for (let k = nextAlive(a, nx, pos[i] + 1); k < a.length; k = nextAlive(a, nx, k + 1)) { dead[a[k]] = 1; size++; if (items[a[k]].e[1] === 2) break; }
      if (size === 1 && items[i].e[1] !== 0 && q !== i) { dead[q] = 1; size++; }
      over -= size; alive -= size; p = i - 1;
    }
  }
  const kept = []; for (let i = 0; i < n; i++) if (!dead[i]) kept.push(items[i]);
  return kept;
}
export function capKK(layers, perBrick = LIMITS.kkEvents, perBar = LIMITS.kkBarEvents) {
  let items = []; layers.forEach((l, li) => l.ev.forEach((e) => items.push({ l: li, e })));
  const before = items.length;
  const byBar = new Map(); for (const it of items) { const b = Math.floor(it.e[0] / 4); if (!byBar.has(b)) byBar.set(b, []); byBar.get(b).push(it); }
  if (before <= perBrick && [...byBar.values()].every((a) => a.length <= perBar)) return false;
  items = [];
  for (const b of [...byBar.keys()].sort((x, y) => x - y)) for (const it of thin(byBar.get(b).sort((x, y) => x.e[0] - y.e[0]), perBar)) items.push(it);
  items = thin(items.sort((x, y) => x.e[0] - y.e[0]), perBrick);
  const keep = new Set(items.map((it) => it.e));
  for (const l of layers) l.ev = l.ev.filter((e) => keep.has(e));
  return true;
}
