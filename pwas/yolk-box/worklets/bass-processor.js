// Midnight's Yolk Box - bass synth voice (AudioWorklet).
// Sample-for-sample port of the bass renderer from Brook's synth core
// (rooster-dev/assets/music-drafts/gen_rooster.py, originally the Moon Axis drafts):
// polyBLEP saw (tanh(3x) square), 30 ms exponential glide on slides, 4-pole cascaded
// one-pole ladder with tanh(drive_in*x - k*y4) feedback and 1+0.45k gain comp,
// filter env fc = cutoff * 2^(envmod*(1+acc)*e^(-t/decay)) that is NOT retriggered on
// tied (slid) notes, 2 ms attack / 6 ms release VCA, accent boosts level, env depth, shortens decay.
class BassProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ev = [];                         // {frame, type, ...} sorted by frame
    this.p = { cutoff: 200, reso: 3.2, envmod: 2.2, decay: 0.4, accent: 0.6, drive: 1.4, driveIn: 1.3, wave: 0, glide: 0.03 };
    this.cut = 200;                       // smoothed cutoff
    this.f = 110; this.ft = 0; this.ph = 0; this.y1 = this.y2 = this.y3 = this.y4 = 0; this.amp = 0;
    this.gate = 0; this.accv = 0; this.accTrig = 0; this.tsince = 10;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'params') Object.assign(this.p, m.p);
      else if (m.type === 'events') { for (const x of m.ev) this.ev.push(x); this.ev.sort((a, b) => a.frame - b.frame); }
      else if (m.type === 'clear') { this.ev = []; this.gate = 0; }
      else if (m.type === 'ping') this.port.postMessage({ type: 'pong', id: m.id });
    };
  }
  apply(x) {
    if (x.type === 'note') {
      this.ft = x.f;
      if (x.trig) { this.f = x.f; this.ph = 0; this.tsince = 0; this.accTrig = x.acc ? 1 : 0; }
      this.accv = x.acc ? 1 : 0; this.gate = 1;
    } else if (x.type === 'off') this.gate = 0;
    else if (x.type === 'params') Object.assign(this.p, x.p);
  }
  process(_in, outputs) {
    const out = outputs[0][0]; if (!out) return true;
    const sr = sampleRate, inv = 1 / sr, p = this.p, n0 = currentFrame;
    const a_gl = 1 - Math.exp(-1 / (Math.max(0.002, p.glide) * sr));
    const a_att = 1 - Math.exp(-1 / (0.002 * sr)), a_rel = 1 - Math.exp(-1 / (0.006 * sr));
    const a_cut = 1 - Math.exp(-1 / (0.01 * sr));
    const k = p.reso, comp = 1 + 0.45 * k, sqw = p.wave === 1, A = p.accent;
    const dOut = p.drive, dOutN = Math.tanh(dOut);
    let { f, ft, ph, y1, y2, y3, y4, amp, cut } = this;
    for (let i = 0; i < out.length; i++) {
      while (this.ev.length && this.ev[0].frame <= n0 + i) {
        this.f = f; this.ph = ph; this.apply(this.ev.shift()); f = this.f; ph = this.ph; ft = this.ft;
      }
      cut += (p.cutoff - cut) * a_cut;
      // filter envelope (Python: dec = decay*0.6 on accent, envmod*(1+0.6*acc))
      const acc = this.accTrig;
      const dec = acc ? p.decay * (1 - 0.667 * A) : p.decay;
      const fenv = Math.exp(-this.tsince / dec);
      this.tsince += inv;
      let fc = cut * Math.pow(2, p.envmod * (1 + A * acc) * fenv);
      fc = Math.min(Math.max(fc, 30), 0.42 * sr);
      const gg = 1 - Math.exp(-2 * Math.PI * fc * inv);
      if (ft > 0) f += (ft - f) * a_gl;
      const dt = f * inv;
      ph += dt; if (ph >= 1) ph -= 1;
      let x = 2 * ph - 1;                                  // polyBLEP saw
      if (ph < dt) { const t = ph / dt; x -= t + t - t * t - 1; }
      else if (ph > 1 - dt) { const t = (ph - 1) / dt; x -= t * t + t + t + 1; }
      if (sqw) x = Math.tanh(3 * x);
      const u = Math.tanh(p.driveIn * x - k * y4);
      y1 += gg * (u - y1); y2 += gg * (y1 - y2); y3 += gg * (y2 - y3); y4 += gg * (y3 - y4);
      const tgt = this.gate * (1 + 0.75 * A * this.accv);   // 1.45 at accent 0.6
      amp += (tgt - amp) * (tgt > amp ? a_att : a_rel);
      let o = y4 * comp * amp;
      if (dOut > 1.001) o = Math.tanh(o * dOut) / dOutN;
      out[i] = o;
    }
    for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
    Object.assign(this, { f, ft, ph, y1, y2, y3, y4, amp, cut });
    return true;
  }
}
registerProcessor('yolk-bass', BassProcessor);
