// Midnight's Yolk Box - KHAOTIC KOCK touch-pad synth voices (AudioWorklet).
// One processor, up to 9 mono voices ("channels"): channel 0 = live finger, 1..8 = loop layers.
// Several presets are ports of Brook's synth core (rooster-dev/assets/music-drafts/gen_rooster.py):
//   acid   <- the bass synth voice (same polyBLEP saw, tanh ladder, 1+0.45k comp, env, 30 ms glide)
//   calliope <- calliope()  (sine + .4/.18/.08 harmonics, 6.2 Hz 0.7% vibrato, f*1.2..5f breath noise, 12 ms / 70 ms)
//   whistle  <- slide_whistle() (sine, 7 Hz 1.2% vibrato, +0.1 HP-3k noise, 30 ms / 60 ms)
//   horn     <- horn()      (saw with 3% / 30 ms pitch blip, 400-2500 Hz band, tanh(3x), 8 ms / 30 ms)
//   vibes    <- vibes()     (sine + .25*sin(4f) e^-t/.15, e^-t/.55 decay, 5 Hz 25% tremolo)
//   pad      <- pad_note()  (3 saws at -9/0/+8 cents, LP 900, slow attack, rel/4 release)
//   riser    <- riser()     (noise through a sweeping 0.7f..1.4f band, (t/dur)^2 swell)
// Y (0..1) is the per-preset timbre control; X arrives as a frequency already quantized to the scale.
const TAU = Math.PI * 2;
const P = {
  //        glide  att    rel    gain  retrig  extra
  acid:     { glide: 0.03, att: 0.002, rel: 0.006, gain: 0.45 },
  super:    { glide: 0.02, att: 0.01, rel: 0.25, gain: 0.7 },
  square:   { glide: 0.015, att: 0.004, rel: 0.05, gain: 0.5 },
  calliope: { glide: 0.012, att: 0.012, rel: 0.07 / 4, gain: 0.5 },
  whistle:  { glide: 0.12, att: 0.03, rel: 0.02, gain: 0.36 },
  horn:     { glide: 0.01, att: 0.008, rel: 0.03 / 3, gain: 0.45, retrig: true },
  vibes:    { glide: 0.0, att: 0.0007, rel: 0.25, gain: 0.55, retrig: true, perc: true },
  bell:     { glide: 0.0, att: 0.001, rel: 0.4, gain: 0.42, retrig: true, perc: true },
  wobble:   { glide: 0.03, att: 0.004, rel: 0.04, gain: 0.36 },
  sub:      { glide: 0.04, att: 0.006, rel: 0.06, gain: 0.42 },
  pad:      { glide: 0.05, att: 0.35, rel: 1.5 / 4, gain: 1.0 },
  riser:    { glide: 0.2, att: 0.05, rel: 0.15, gain: 1.6 },
  squawk:   { glide: 0.02, att: 0.005, rel: 0.05, gain: 0.38, retrig: true },
  laser:    { glide: 0.0, att: 0.001, rel: 0.05, gain: 0.26, retrig: true },
};
// mulberry32 noise
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1; }; }
// TPT state-variable filter (lp/bp/hp from one call)
class SVF {
  constructor() { this.a = 0; this.b = 0; this.lp = 0; this.bp = 0; this.hp = 0; }
  run(x, fc, q, sr) {
    const g = Math.tan(Math.PI * Math.min(fc, sr * 0.45) / sr), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), v3 = x - this.b, v1 = a1 * this.a + g * a1 * v3, v2 = this.b + g * v1;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b; this.lp = v2; this.bp = v1; this.hp = x - k * v1 - v2; return v2;
  }
}
const blepSaw = (ph, dt) => {
  let x = 2 * ph - 1;
  if (ph < dt) { const t = ph / dt; x -= t + t - t * t - 1; } else if (ph > 1 - dt) { const t = (ph - 1) / dt; x -= t * t + t + t + 1; }
  return x;
};
// formant table (Hz) for the squawk: "ee" -> "ah" -> "aw"
const VOW = [[270, 2290, 3010], [730, 1090, 2440], [570, 840, 2410]];

class Voice {
  constructor(seed) {
    this.on = false; this.f = 220; this.ft = 220; this.fs = null; this.y = 0.5; this.yt = 0.5; this.amp = 0; this.t = 10; this.tOn = 0;
    this.ph = new Float64Array(8); this.ph2 = 0; this.y1 = this.y2 = this.y3 = this.y4 = 0;
    this.f1 = new SVF(); this.f2 = new SVF(); this.f3 = new SVF(); this.f4 = new SVF();
    this.n = rng(seed); this.lastDiv = -1; this.sounding = false; this.gateDiv = 0; this.arp = false;
    for (let i = 0; i < 8; i++) this.ph[i] = (this.n() + 1) / 2;
  }
  trig() { this.t = 0; }
  setPreset(id, sr) {
    const pr = P[id] || P.acid; this.pr = id in P ? id : 'acid'; this.gain = pr.gain; this.glide = pr.glide; this.retrig = !!pr.retrig;
    this.a_gl = pr.glide > 0 ? 1 - Math.exp(-1 / (pr.glide * sr)) : 1;
    this.a_att = 1 - Math.exp(-1 / (pr.att * sr)); this.a_rel = 1 - Math.exp(-1 / (pr.rel * sr));
  }
}

class KKProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.v = Array.from({ length: 9 }, (_, i) => new Voice(101 + i * 7));
    this.ev = []; this.clock = 0; this.clockBpm = 120;
    for (const v of this.v) v.setPreset('acid', sampleRate);
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'events') { for (const x of m.ev) this.ev.push(x); this.ev.sort((a, b) => a.frame - b.frame); }
      else if (m.type === 'clock') { this.clock = m.frame; this.clockBpm = m.bpm; }
      else if (m.type === 'clear') {           // drop pending events + release voices (all, or a list of channels)
        const hit = (c) => !m.chans || m.chans.includes(c);
        this.ev = this.ev.filter((x) => !hit(x.chan)); this.v.forEach((v, c) => { if (hit(c)) v.on = false; });
      }
      else if (m.type === 'ping') this.port.postMessage({ type: 'pong', id: m.id });
    };
  }
  apply(x) {
    const v = this.v[x.chan]; if (!v) return;
    if (x.type === 'off') { v.on = false; return; }
    v.yt = x.y;
    if (x.type === 'on') {
      if (x.pr !== v.pr) { v.setPreset(x.pr, sampleRate); v.amp = 0; v.sounding = false; }
      v.gateDiv = x.gate || 0; v.arp = !!x.arp;
      const legato = v.sounding && v.glide > 0 && !v.retrig;
      v.on = true; v.ft = x.f; v.fs = x.fs; v.lastDiv = -1; if (!legato) v.f = x.f; v.trig(); if (v.amp < 0.01) v.y = x.y; v.tOn = 0;
    } else if (x.type === 'move') {
      if (!v.on) return;
      const changed = Math.abs(x.f - v.ft) > 0.01; v.ft = x.f; v.fs = x.fs;
      if (changed && v.retrig && !v.gateDiv) { v.f = x.f; v.trig(); }
    }
  }
  process(_in, outputs) {
    const L = outputs[0][0]; if (!L) return true;
    const sr = sampleRate, inv = 1 / sr, n0 = currentFrame;
    L.fill(0);
    const a_y = 1 - Math.exp(-1 / (0.012 * sr)), spb = 60 / this.clockBpm;
    for (let i = 0; i < L.length; i++) {
      while (this.ev.length && this.ev[0].frame <= n0 + i) this.apply(this.ev.shift());
      const beat = (n0 + i - this.clock) * inv / spb;
      for (let c = 0; c < 9; c++) {
        const v = this.v[c];
        if (!v.on && v.amp < 1e-5) { v.sounding = false; continue; }
        v.sounding = true;
        let gateOpen = 1; const divs = v.gateDiv;            // tempo gate / arpeggio
        if (divs && v.on) {
          const d = Math.floor(beat * divs), ph = beat * divs - d;
          if (d !== v.lastDiv) { v.lastDiv = d; if (v.arp && v.fs) { v.ft = v.fs[((d % v.fs.length) + v.fs.length) % v.fs.length]; v.f = v.ft; } v.trig(); }
          gateOpen = ph < 0.55 ? 1 : 0;
        }
        const tgt = (v.on ? 1 : 0) * gateOpen;
        v.amp += (tgt - v.amp) * (tgt > v.amp ? v.a_att : v.a_rel);
        v.f += (v.ft - v.f) * v.a_gl; v.y += (v.yt - v.y) * a_y;
        const t = v.t; v.t += inv; v.tOn += inv;
        L[i] += this.voice(v.pr, v, v.f, v.y, t, sr, inv, beat) * v.amp * v.gain;
      }
    }
    for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(L);
    return true;
  }
  voice(id, v, f, y, t, sr, inv, beat) {
    const ph = v.ph;
    switch (id) {
      case 'acid': {                                   // bass synth core, Y = cutoff
        const dt = f * inv; ph[0] += dt; if (ph[0] >= 1) ph[0] -= 1;
        const x = blepSaw(ph[0], dt), k = 3.2, comp = 1 + 0.45 * k;
        const cut = 80 * Math.pow(40, y);
        let fc = cut * Math.pow(2, 2.0 * Math.exp(-t / 0.45)); fc = Math.min(fc, 0.42 * sr);
        const gg = 1 - Math.exp(-TAU * fc * inv), u = Math.tanh(1.3 * x - k * v.y4);
        v.y1 += gg * (u - v.y1); v.y2 += gg * (v.y1 - v.y2); v.y3 += gg * (v.y2 - v.y3); v.y4 += gg * (v.y3 - v.y4);
        return Math.tanh(v.y4 * comp * 1.4) / Math.tanh(1.4);
      }
      case 'super': {                                  // 7 detuned saws, Y = brightness + spread
        const spread = 8 + 30 * y, D = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1]; let s = 0;
        for (let j = 0; j < 7; j++) { const ff = f * Math.pow(2, D[j] * spread / 1200), dt = ff * inv; ph[j] += dt; if (ph[j] >= 1) ph[j] -= 1; s += blepSaw(ph[j], dt) * (j === 3 ? 1 : 0.8); }
        return v.f1.run(s / 4, 500 * Math.pow(18, y), 0.8, sr);
      }
      case 'square': {                                 // PWM pulse, Y = width + brightness
        const dt = f * (1 + 0.004 * Math.sin(TAU * 5.5 * v.tOn) * Math.min(1, v.tOn / 0.4)) * inv; ph[0] += dt; if (ph[0] >= 1) ph[0] -= 1;
        const w = 0.5 - 0.42 * y; let ph2 = ph[0] + w; if (ph2 >= 1) ph2 -= 1;
        const s = 0.5 * (blepSaw(ph[0], dt) - blepSaw(ph2, dt));
        return v.f1.run(s, 1200 * Math.pow(8, y), 0.9, sr);
      }
      case 'calliope': {                               // calliope(): Y = brightness (0.5 = original)
        const vib = 1 + 0.007 * Math.sin(TAU * 6.2 * v.tOn);
        ph[0] += f * vib * inv; if (ph[0] >= 1) ph[0] -= 1;
        const a = TAU * ph[0], h = 0.3 + 1.4 * y;
        const tone = Math.sin(a) + h * (0.4 * Math.sin(2 * a) + 0.18 * Math.sin(3 * a) + 0.08 * Math.sin(4 * a));
        v.f1.run(v.n(), f * 1.2, 0.7071, sr);
        const br = v.f2.run(v.f1.hp, Math.min(f * 5, 18000), 0.7071, sr) * 0.12 * (0.4 + 1.2 * y);
        return (tone + br) / 1.7;
      }
      case 'whistle': {                                // slide_whistle(): Y = vibrato + breath
        const fv = f * (1 + 0.012 * 2 * y * Math.sin(TAU * 7 * v.tOn));
        ph[0] += fv * inv; if (ph[0] >= 1) ph[0] -= 1;
        v.f1.run(v.n(), 3000, 0.7071, sr);
        return Math.sin(TAU * ph[0]) + 0.1 * 2 * y * v.f1.hp;
      }
      case 'horn': {                                   // horn(): Y = band top + drive (0.5 ~ original)
        const ff = f * (1 + 0.03 * Math.exp(-t / 0.03)); ph[0] += ff * inv; if (ph[0] >= 1) ph[0] -= 1;
        const s = 2 * ph[0] - 1;
        v.f1.run(s, 400, 0.7071, sr); const b = v.f2.run(v.f1.hp, 1000 * Math.pow(6.25, y), 0.7071, sr);
        return Math.tanh((1.5 + 3 * y) * b) * 0.9;
      }
      case 'vibes': {                                  // vibes(): Y = tremolo rate/depth (0.5 = 5 Hz, 25%)
        ph[0] += f * inv; if (ph[0] >= 1) ph[0] -= 1; ph[1] += 4 * f * inv; if (ph[1] >= 1) ph[1] -= 1;
        const s = Math.sin(TAU * ph[0]) + 0.25 * Math.sin(TAU * ph[1]) * Math.exp(-t / 0.15);
        const trem = 1 + 0.5 * y * Math.sin(TAU * (1 + 8 * y) * t);
        return s * Math.exp(-t / 0.55) * trem / 1.3;
      }
      case 'bell': {                                   // 2-op FM bell, ratio 3.5, Y = index
        ph[1] += 3.5 * f * inv; if (ph[1] >= 1) ph[1] -= 1;
        const idx = (0.3 + 7 * y) * Math.exp(-t / 0.35) + 0.2;
        ph[0] += f * inv; if (ph[0] >= 1) ph[0] -= 1;
        return Math.sin(TAU * ph[0] + idx * Math.sin(TAU * ph[1])) * Math.exp(-t / 1.4);
      }
      case 'wobble': {                                 // tempo-synced LFO filter, Y = rate (1/2..1/16T)
        const RATES = [0.5, 1, 2, 3, 4, 6]; const r = RATES[Math.min(5, Math.floor(y * 6))];
        const lfo = 0.5 - 0.5 * Math.cos(TAU * beat * r);
        const dt = f * inv; ph[0] += dt; if (ph[0] >= 1) ph[0] -= 1; ph[1] += dt / 2; if (ph[1] >= 1) ph[1] -= 1;
        const s = blepSaw(ph[0], dt) + 0.6 * (ph[1] < 0.5 ? 1 : -1);
        return Math.tanh(1.6 * v.f1.run(s, 90 + 2600 * lfo * lfo, 4, sr));
      }
      case 'sub': {                                    // sine sub, Y = drive / 2nd harmonic
        ph[0] += f * inv; if (ph[0] >= 1) ph[0] -= 1;
        const s = Math.sin(TAU * ph[0]) + 0.3 * y * Math.sin(2 * TAU * ph[0]), d = 1 + 4 * y;
        return Math.tanh(d * s) / Math.tanh(d);
      }
      case 'pad': {                                    // pad_note(): 3 saws -9/0/+8 cents, Y = LP (0.45 ~ 900 Hz)
        let s = 0; const D = [-9, 0, 8];
        for (let j = 0; j < 3; j++) { const dt = f * Math.pow(2, D[j] / 1200) * inv; ph[j] += dt; if (ph[j] >= 1) ph[j] -= 1; s += blepSaw(ph[j], dt); }
        return v.f1.run(s / 3, 250 * Math.pow(16, y), 0.7071, sr);
      }
      case 'riser': {                                  // riser(): noise band 0.7f..1.4f that sweeps up while held; Y = sweep speed
        const sweep = Math.pow(2, Math.min(4.2, v.tOn * (0.2 + 2.2 * y)));
        const fc = Math.min(f * 2 * sweep, 16000);
        v.f1.run(v.n(), fc * 0.7, 0.7071, sr); const b = v.f2.run(v.f1.hp, fc * 1.4, 0.7071, sr);
        const swell = Math.min(1, Math.pow(Math.min(1, v.tOn / 1.5), 2) + 0.15);
        return b * 2.2 * swell;
      }
      case 'squawk': {                                 // PAH-KAW: scooped saw + rasp through 3 formants, Y = vowel ee->ah->aw
        const scoop = 1 - 0.3 * Math.exp(-t / 0.04) + 0.02 * Math.sin(TAU * 11 * t);
        const dt = f * scoop * inv; ph[0] += dt; if (ph[0] >= 1) ph[0] -= 1;
        const src = blepSaw(ph[0], dt) + 0.35 * v.n() * (0.5 + 0.5 * Math.sin(TAU * ph[0]));
        const yy = Math.min(0.999, Math.max(0, y)) * 2, k = Math.floor(yy), fr = yy - k;
        const F = (j) => VOW[k][j] + (VOW[k + 1][j] - VOW[k][j]) * fr;
        v.f1.run(src, F(0), 7, sr); v.f2.run(src, F(1), 9, sr); v.f3.run(src, F(2), 10, sr);
        return Math.tanh(1.5 * (v.f1.bp + 0.7 * v.f2.bp + 0.35 * v.f3.bp));
      }
      case 'laser': {                                  // pitch-drop zap, Y = drop time
        const ff = f * (1 + 5 * Math.exp(-t / (0.02 + 0.25 * y)));
        ph[0] += ff * inv; if (ph[0] >= 1) ph[0] -= 1;
        return (ph[0] < 0.5 ? 1 : -1) * 0.6 + 0.4 * Math.sin(TAU * ph[0]);
      }
    }
    return 0;
  }
}
registerProcessor('kk-synth', KKProcessor);
