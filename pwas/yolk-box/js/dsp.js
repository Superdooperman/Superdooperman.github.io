// Midnight's Yolk Box - drum voice DSP.
// Ported from Brook's numpy synth core (rooster-dev/assets/music-drafts/gen_rooster.py:
// kick(), snare(), clap(), metal(), hat(), cowbell()), which came from the Moon Axis drafts.
// Same envelope shapes, filter types/corners and mix ratios; one-shots are computed in JS
// into AudioBuffers (no sample files anywhere).

// --- seeded noise (uniform -1..1). numpy's PCG64 stream is not reproduced; the spectrum is the same.
export function noise(n, seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out[i] = (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  }
  return out;
}

// --- bilinear (prewarped) biquads == scipy.signal.butter sections
function biquad(x, kind, f, q, sr) {
  const w = 2 * Math.PI * Math.min(f, sr * 0.49) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (kind === 'lowpass') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
  else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
  const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i], yi = B0 * xi + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = yi; y[i] = yi;
  }
  return y;
}
const BUTTER_Q = { 1: [0.7071], 2: [0.7071], 4: [0.5412, 1.3066] };
// filt(x, 'highpass'|'lowpass', f, order) or filt(x, 'bandpass', [lo, hi], order)
export function filt(x, kind, f, order, sr) {
  order = order || 2;
  if (kind === 'bandpass') {   // butter(2, [lo, hi], 'bandpass') ~ HP2(lo) -> LP2(hi) for wide bands
    return filt(filt(x, 'highpass', f[0], order, sr), 'lowpass', f[1], order, sr);
  }
  let y = x;
  for (const q of BUTTER_Q[order] || BUTTER_Q[2]) y = biquad(y, kind, f, q, sr);
  return y;
}

function fadeIn(x, n) { for (let i = 0; i < n && i < x.length; i++) x[i] *= i / (n - 1); }
function fadeOut(x, n) { const L = x.length; for (let i = 0; i < n && i < L; i++) x[L - 1 - i] *= i / (n - 1); }
function normalize(x) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] /= m; return x; }
const sq = (p) => (Math.sin(p) >= 0 ? 1 : -1);   // signal.square

// kick(dur, drive) - drum machine kick: f = 46 + 120 e^(-t/0.04), amp e^(-t/0.42), HP click, tanh drive
export function kick(sr, { tune = 46, decay = 0.42, drive = 1.3, sweep = 120, sweepTau = 0.04, dur } = {}) {
  dur = dur || Math.max(0.3, decay * 1.55);
  const n = Math.floor(dur * sr), k = new Float32Array(n);
  const click = filt(noise(n, 1), 'highpass', 1500, 2, sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = tune + sweep * Math.exp(-t / sweepTau);
    ph += 2 * Math.PI * f / sr;
    k[i] = Math.sin(ph) * Math.exp(-t / decay) + click[i] * Math.exp(-t / 0.004) * 0.35;
  }
  const d = Math.tanh(1.4 * drive);
  for (let i = 0; i < n; i++) k[i] = Math.tanh(k[i] * 1.4 * drive) / d;
  fadeIn(k, 32); fadeOut(k, 256);
  return filt(k, 'highpass', 34, 2, sr);       // club(): kick -> highpass 34
}

// snare(): 185/330 Hz tone (tau 50 ms) + 1.2-9 kHz noise (tau 75 ms); tone/snappy rebalance the 0.5/0.9 mix
export function snare(sr, { tone = 0.5, snappy = 0.5, dur = 0.25, seed = 2, pitch = 1 } = {}) {
  const n = Math.floor(dur * sr), s = new Float32Array(n);
  const nz = filt(noise(n, seed), 'bandpass', [1200, 9000], 2, sr);
  const toneG = 0.15 + 0.7 * tone;                 // 0.5 at tone=0.5
  const snapG = 0.1 + 1.6 * snappy;                // 0.9 at snappy=0.5
  const f1 = 185 * pitch * (0.92 + 0.16 * tone), f2 = 330 * pitch * (0.92 + 0.16 * tone);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    s[i] = toneG * (Math.sin(2 * Math.PI * f1 * t) + 0.6 * Math.sin(2 * Math.PI * f2 * t)) * Math.exp(-t / 0.05)
      + snapG * nz[i] * Math.exp(-t / (0.05 + 0.05 * snappy));
  }
  fadeOut(s, 128);
  return normalize(s);
}

// clap(): 900-2600 Hz noise, three 4.5 ms bursts at 0/11/22 ms + 110 ms tail at 32 ms
export function clap(sr, { seed = 3, dur = 0.32 } = {}) {
  const n = Math.floor(dur * sr), c = new Float32Array(n);
  const nz = filt(noise(n, seed), 'bandpass', [900, 2600], 2, sr);
  for (let i = 0; i < n; i++) {
    const t = i / sr; let env = 0;
    for (const off of [0, 0.011, 0.022]) if (t >= off) env += Math.exp(-(t - off) / 0.0045);
    if (t >= 0.032) env += 1.1 * Math.exp(-(t - 0.032) / 0.11);
    c[i] = nz[i] * env;
  }
  fadeOut(c, 128);
  return normalize(c);
}

const HAT_F = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0];   // metallic square bank
export function metal(n, sr, scale = 1.7) {
  const m = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr; let s = 0;
    for (const f of HAT_F) s += sq(2 * Math.PI * f * scale * t);
    m[i] = s / HAT_F.length;
  }
  return m;
}

// hat(open_): metal*0.7 + 0.3 noise -> HP 7 kHz (4th) -> LP 15 kHz, tau 18 ms closed / 110 ms open
export function hat(sr, { open = false, seed = 4, decay } = {}) {
  const tau = decay || (open ? 0.11 : 0.018);
  const dur = open ? Math.max(0.12, tau * 2.9) : 0.07;
  const n = Math.floor(dur * sr), nz = noise(n, seed), mt = metal(n, sr);
  let m = new Float32Array(n);
  for (let i = 0; i < n; i++) m[i] = mt[i] * 0.7 + 0.3 * nz[i];
  m = filt(filt(m, 'highpass', 7000, 4, sr), 'lowpass', 15000, 2, sr);
  for (let i = 0; i < n; i++) m[i] *= Math.exp(-(i / sr) / tau);
  fadeIn(m, 16); fadeOut(m, 64);
  return normalize(m);
}

// cymbal: same metal bank at a lower scale, wider band and long tail (new voice in the same family)
export function cymbal(sr, { decay = 0.6, seed = 8 } = {}) {
  const dur = Math.max(0.4, decay * 2.6), n = Math.floor(dur * sr);
  const nz = noise(n, seed), mt = metal(n, sr, 1.18);
  let m = new Float32Array(n);
  for (let i = 0; i < n; i++) m[i] = mt[i] * 0.6 + 0.4 * nz[i];
  m = filt(filt(m, 'highpass', 4200, 4, sr), 'lowpass', 13000, 2, sr);
  for (let i = 0; i < n; i++) { const t = i / sr; m[i] *= 0.55 * Math.exp(-t / 0.03) + 0.6 * Math.exp(-t / decay); }
  fadeIn(m, 16); fadeOut(m, 256);
  return normalize(m);
}

// cowbell(): 540 + 800 Hz squares -> 600-2500 Hz band, double envelope 12 ms / 110 ms
export function cowbell(sr) {
  const n = Math.floor(0.35 * sr); let c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / sr; c[i] = 0.6 * sq(2 * Math.PI * 540 * t) + 0.4 * sq(2 * Math.PI * 800 * t); }
  c = filt(c, 'bandpass', [600, 2500], 2, sr);
  for (let i = 0; i < n; i++) { const t = i / sr; c[i] *= 0.75 * Math.exp(-t / 0.012) + 0.35 * Math.exp(-t / 0.11); }
  fadeOut(c, 64);
  return normalize(c);
}

// toms: the kick's pitch-swept sine at tom pitches + a little filtered noise skin
export function tom(sr, { base = 110, tune = 1 } = {}) {
  const f0 = base * tune, dur = 0.5, n = Math.floor(dur * sr), x = new Float32Array(n);
  const nz = filt(noise(n, Math.round(base)), 'bandpass', [f0 * 2, f0 * 9], 2, sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = f0 * (1 + 0.45 * Math.exp(-t / 0.05));
    ph += 2 * Math.PI * f / sr;
    x[i] = Math.sin(ph) * Math.exp(-t / (0.16 + 18 / f0 / 100)) + 0.18 * nz[i] * Math.exp(-t / 0.02);
  }
  for (let i = 0; i < n; i++) x[i] = Math.tanh(x[i] * 1.6) / Math.tanh(1.6);
  fadeIn(x, 32); fadeOut(x, 256);
  return x;
}

// rimshot: club() uses snare(6, 0.08); keep that and tighten it with a high body
export function rimshot(sr) {
  return filt(snare(sr, { seed: 6, dur: 0.08, tone: 0.8, snappy: 0.3, pitch: 2.2 }), 'highpass', 300, 2, sr);
}
