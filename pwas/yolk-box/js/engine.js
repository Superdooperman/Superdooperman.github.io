// Midnight's Yolk Box - audio engine. Works on an AudioContext (live) or an OfflineAudioContext
// (export / demo renders), so the export path runs the exact same voices and scheduling.
import * as D from './dsp.js';
import { mapX, presetById, cfgOf, DRUM_ORDER } from './kk.js';

export const VOICES = [
  { id: 'bd', name: 'Bass Drum', short: 'BD', knobs: ['tune', 'decay'], level: 0.9, pan: 0 },
  { id: 'sd', name: 'Snare', short: 'SD', knobs: ['tone', 'snappy'], level: 0.5, pan: 0 },
  { id: 'cp', name: 'Clap', short: 'CP', knobs: [], level: 0.42, pan: 0 },
  { id: 'ch', name: 'Closed Hat', short: 'CH', knobs: [], level: 0.24, pan: 0.3 },
  { id: 'oh', name: 'Open Hat', short: 'OH', knobs: ['decay'], level: 0.22, pan: 0.3 },
  { id: 'lt', name: 'Low Tom', short: 'LT', knobs: ['tune'], level: 0.45, pan: -0.3 },
  { id: 'mt', name: 'Mid Tom', short: 'MT', knobs: ['tune'], level: 0.42, pan: 0 },
  { id: 'ht', name: 'High Tom', short: 'HT', knobs: ['tune'], level: 0.4, pan: 0.3 },
  { id: 'rs', name: 'Rimshot', short: 'RS', knobs: [], level: 0.3, pan: -0.35 },
  { id: 'cb', name: 'Cowbell', short: 'CB', knobs: [], level: 0.28, pan: -0.35 },
  { id: 'cy', name: 'Cymbal', short: 'CY', knobs: ['decay'], level: 0.2, pan: 0.25 },
];
// knob ranges: [min, max, default, curve('lin'|'exp'), unit]
export const DRUM_KNOBS = {
  bd: { tune: [34, 72, 46, 'lin', 'Hz'], decay: [0.12, 1.0, 0.42, 'exp', 's'] },
  sd: { tone: [0, 1, 0.5, 'lin', ''], snappy: [0, 1, 0.5, 'lin', ''] },
  oh: { decay: [0.04, 0.4, 0.11, 'exp', 's'] },
  lt: { tune: [0.7, 1.4, 1, 'lin', 'x'] }, mt: { tune: [0.7, 1.4, 1, 'lin', 'x'] }, ht: { tune: [0.7, 1.4, 1, 'lin', 'x'] },
  cy: { decay: [0.2, 1.6, 0.6, 'exp', 's'] },
};
export const BASS_KNOBS = {
  cutoff: [40, 2500, 220, 'exp', 'Hz'], reso: [0, 3.9, 3.2, 'lin', ''], envmod: [0, 4, 2.2, 'lin', 'oct'],
  decay: [0.05, 2.0, 0.4, 'exp', 's'], accent: [0, 1, 0.6, 'lin', ''], drive: [1, 4, 1.4, 'lin', 'x'],
};

function render(id, sr, p) {
  switch (id) {
    case 'bd': return D.kick(sr, { tune: p.tune, decay: p.decay, drive: 1.3 });
    case 'sd': return D.snare(sr, { tone: p.tone, snappy: p.snappy });
    case 'cp': return D.clap(sr);
    case 'ch': return D.hat(sr, { open: false });
    case 'oh': return D.hat(sr, { open: true, seed: 3, decay: p.decay });
    case 'lt': return D.tom(sr, { base: 92, tune: p.tune });
    case 'mt': return D.tom(sr, { base: 132, tune: p.tune });
    case 'ht': return D.tom(sr, { base: 186, tune: p.tune });
    case 'rs': return D.rimshot(sr);
    case 'cb': return D.cowbell(sr);
    case 'cy': return D.cymbal(sr, { decay: p.decay });
  }
}

export const BASE_MIDI = 36;  // step note 0 = C2
export const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Engine {
  constructor(ctx) {
    this.ctx = ctx; this.buffers = {}; this.voiceGain = {}; this.lastOpen = null;
    this.ready = this._build();
  }
  async _build() {
    const ctx = this.ctx, base = new URL('../worklets/', import.meta.url);
    await ctx.audioWorklet.addModule(new URL('bass-processor.js', base));
    await ctx.audioWorklet.addModule(new URL('rec-processor.js', base));
    await ctx.audioWorklet.addModule(new URL('kk-processor.js', base));
    this.master = ctx.createGain(); this.master.gain.value = 0.8;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -4; this.limiter.knee.value = 2; this.limiter.ratio.value = 16;
    this.limiter.attack.value = 0.002; this.limiter.release.value = 0.12;
    this.tap = new AudioWorkletNode(ctx, 'rec-tap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
    this.master.connect(this.limiter).connect(this.tap).connect(ctx.destination);
    this.drumVol = ctx.createGain(); this.drumVol.connect(this.master);
    this.bassVol = ctx.createGain(); this.bassVol.connect(this.master);
    this.bass = new AudioWorkletNode(ctx, 'yolk-bass', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
    this.bassHP = ctx.createBiquadFilter(); this.bassHP.type = 'highpass'; this.bassHP.frequency.value = 45;  // club(): highpass 45
    this.bassTrim = ctx.createGain(); this.bassTrim.gain.value = 0.55;
    this.bass.connect(this.bassHP).connect(this.bassTrim).connect(this.bassVol);
    // KHAOTIC KOCK: synth worklet + drum-mode hits -> trim -> (dry + ping-pong echo, delay_pp() port) -> kkVol
    this.kk = new AudioWorkletNode(ctx, 'kk-synth', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1] });
    this.kkTrim = ctx.createGain(); this.kkTrim.gain.value = 0.8;
    this.kkVol = ctx.createGain(); this.kkVol.connect(this.master);
    this.kk.connect(this.kkTrim); this.kkTrim.connect(this.kkVol);
    const mg = ctx.createChannelMerger(2), dL = ctx.createDelay(2), dR = ctx.createDelay(2), lpL = ctx.createBiquadFilter(), lpR = ctx.createBiquadFilter();
    lpL.frequency.value = lpR.frequency.value = 3500; this.echoSend = ctx.createGain(); this.echoFb = ctx.createGain(); this.echoFb.gain.value = 0.4;
    this.kkTrim.connect(this.echoSend).connect(lpL).connect(dL); dL.connect(lpR).connect(dR); dR.connect(this.echoFb).connect(lpL);
    dL.connect(mg, 0, 0); dR.connect(mg, 0, 1); mg.connect(this.kkVol); this.echoL = dL; this.echoR = dR;
    this.kkDrumCol = {};
    for (const v of VOICES) {
      const g = ctx.createGain(), pn = ctx.createStereoPanner(); pn.pan.value = v.pan;
      g.connect(pn).connect(this.drumVol); this.voiceGain[v.id] = g;
    }
    this._pong = new Map();
    this.kk.port.onmessage = (e) => { const r = this._pong.get(e.data.id); if (r) { this._pong.delete(e.data.id); r(); } };
    this.bass.port.onmessage = (e) => { const r = this._pong.get(e.data.id); if (r) { this._pong.delete(e.data.id); r(); } };
  }
  syncKK() { const id = Math.random(); return new Promise((r) => { this._pong.set(id, r); this.kk.port.postMessage({ type: 'ping', id }); }); }
  syncBass() { const id = Math.random(); return new Promise((r) => { this._pong.set(id, r); this.bass.port.postMessage({ type: 'ping', id }); }); }

  // state = full song state (see patterns.js). at = audio time for a sample-accurate switch (song mode), 0 = now.
  // ms = session mute/solo { drums:{m,s}, bass:{m,s}, kk:{m,s} } (not stored in bricks)
  applyState(st, at = 0, ms = null) {
    const set = (prm, v) => { if (at) prm.setValueAtTime(v, at); else { prm.cancelScheduledValues(0); prm.value = v; } };
    const solo = ms && (ms.drums?.s || ms.bass?.s || ms.kk?.s), f = (k) => (!ms ? 1 : solo ? (ms[k]?.s ? 1 : 0) : ms[k]?.m ? 0 : 1);
    for (const v of VOICES) {
      set(this.voiceGain[v.id].gain, st.drums.levels[v.id] * (st.drums.mute?.[v.id] ? 0 : 1));
      this.buffers[v.id] = this.bufFor(v.id, st.drums.params[v.id]);
    }
    set(this.drumVol.gain, st.mix.drums * f('drums')); set(this.bassVol.gain, st.mix.bass * f('bass')); set(this.master.gain, st.mix.master);
    set(this.kkVol.gain, (st.mix.kk ?? 0.8) * f('kk'));
    const k = st.kk || {}, d = Math.min(1.9, 0.75 * 60 / st.bpm);                   // dotted-8th echo
    set(this.echoSend.gain, k.echo ?? 0.25); set(this.echoL.delayTime, d); set(this.echoR.delayTime, d);
    const b = st.bass.params, p = { cutoff: b.cutoff, reso: b.reso, envmod: b.envmod, decay: b.decay, accent: b.accent, drive: b.drive, wave: b.wave === 'square' ? 1 : 0 };
    if (at) this.bass.port.postMessage({ type: 'events', ev: [{ frame: Math.round(at * this.ctx.sampleRate), type: 'params', p }] });
    else this.bass.port.postMessage({ type: 'params', p });
  }
  bufFor(id, params) {                               // drum sample cache keyed by its knob settings
    const key = id + ':' + JSON.stringify(params || {}); this.bufCache ||= new Map();
    let buf = this.bufCache.get(key);
    if (!buf) {
      const data = render(id, this.ctx.sampleRate, params || {});
      buf = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate); buf.copyToChannel(data, 0); this.bufCache.set(key, buf);
    }
    return { key, buf };
  }
  // metronome click: straight to the speakers, never into the master / recorder / exports
  click(t, accent, vol = 0.5) {
    if (!vol) return;
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = accent ? 1760 : 1175; o.type = 'triangle';
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.05);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.06);
  }
  kkOffAt(t) { this.kk.port.postMessage({ type: 'events', ev: Array.from({ length: 8 }, (_, c) => ({ frame: Math.round(t * this.ctx.sampleRate), chan: c + 1, type: 'off' })) }); for (let c = 1; c < 9; c++) delete this.kkDrumCol[c]; }

  hit(id, t, gain, st) {
    const s = this.ctx.createBufferSource(); s.buffer = st ? this.bufFor(id, st.drums.params[id]).buf : this.buffers[id].buf;
    const g = this.ctx.createGain(); g.gain.value = gain;
    s.connect(g).connect(this.voiceGain[id]); s.start(t);
    if (id === 'oh') this.lastOpen = { s, g };
    if (id === 'ch' && this.lastOpen) {         // closed hat chokes the open hat
      const o = this.lastOpen; o.g.gain.setValueAtTime(o.g.gain.value, t); o.g.gain.linearRampToValueAtTime(0, t + 0.006);
      this.lastOpen = null;
    }
  }

  // schedule step i (0..15) of the pattern at time t; tNext = start of the next step
  scheduleStep(st, i, t, tNext) {
    const dr = st.drums, acc = dr.steps.ac[i];
    const accGain = acc ? 1 : 1 - 0.55 * dr.accent;           // accent row lifts the whole step
    for (const v of VOICES) if (dr.steps[v.id][i]) this.hit(v.id, t, accGain, st);
    // bass synth: same step logic as the bass renderer in Brook's synth core
    const steps = st.bass.steps, s = steps[i], prev = steps[(i + 15) % 16];
    const sr = this.ctx.sampleRate, fr = (x) => Math.round(x * sr), ev = [];
    if (!s.on) ev.push({ frame: fr(t), type: 'off' });
    else {
      const m = BASE_MIDI + s.n + (s.up ? 12 : 0) - (s.dn ? 12 : 0) + (st.bass.transpose || 0);
      const tied = prev.on && prev.sl && i !== 0;
      ev.push({ frame: fr(t), type: 'note', f: hz(m), trig: !tied, acc: !!s.acc });
      if (!s.sl) ev.push({ frame: fr(t + 0.6 * (tNext - t)), type: 'off' });   // gate_frac 0.6
    }
    this.bass.port.postMessage({ type: 'events', ev });
  }
  stopBass() { this.bass.port.postMessage({ type: 'clear' }); }

  // ---- KHAOTIC KOCK
  // one gesture event on channel chan (0 = live finger, 1.. = loop layers). t = audio time, or 0 for "now".
  kkEvent(cfg, chan, type, x, y, t = 0) {
    const pr = presetById(cfg.preset);
    if (pr.drums) {                                   // X = which drum, Y = tune
      if (type === 'off') { delete this.kkDrumCol[chan]; return; }
      const col = Math.min(DRUM_ORDER.length - 1, Math.floor(Math.max(0, x) * DRUM_ORDER.length));
      if (type === 'move' && this.kkDrumCol[chan] === col) return;
      this.kkDrumCol[chan] = col;
      const id = DRUM_ORDER[col], b = this.buffers[id]; if (!b) return;
      const s = this.ctx.createBufferSource(); s.buffer = b.buf; s.playbackRate.value = Math.pow(2, (y - 0.5) * 1.6);
      const g = this.ctx.createGain(); g.gain.value = 0.55;
      s.connect(g).connect(this.kkTrim); s.start(t ? Math.max(t, this.ctx.currentTime) : this.ctx.currentTime);
      return;
    }
    const sr = this.ctx.sampleRate, mp = type === 'off' ? {} : mapX(cfg, x);
    this.kk.port.postMessage({ type: 'events', ev: [{ frame: t ? Math.round(t * sr) : 0, chan, type, f: mp.f, fs: mp.fs, y, pr: cfg.preset, gate: cfg.gate || 0, arp: !!cfg.arp }] });
  }
  kkClock(t, bpm) { this.kk.port.postMessage({ type: 'clock', frame: Math.round(t * this.ctx.sampleRate), bpm }); }
  kkRelease(chans) { this.kk.port.postMessage({ type: 'clear', chans }); if (!chans) this.kkDrumCol = {}; else for (const c of chans) delete this.kkDrumCol[c]; }
  // schedule loop-layer events that fall inside loop-local step ls (0 .. 16*bars-1), whose straight-time start is t.
  // playable(i) says whether layer i should sound in this pass (a layer being recorded only plays from its next cycle).
  scheduleKK(st, ls, t, playable = () => true, log = null) {
    const lp = st.kk?.loop; if (!lp || !lp.layers.length) return;
    const spb = 60 / st.bpm, b0 = ls / 4, b1 = (ls + 1) / 4;
    lp.layers.forEach((L, i) => {
      if (!playable(i, t)) return;
      for (const e of L.ev) {
        if (e[0] < b0 || e[0] >= b1) continue;
        const te = t + (e[0] - b0) * spb, type = ['on', 'move', 'off'][e[1]];
        this.kkEvent(L.cfg, i + 1, type, e[2], e[3], te);
        if (log) log.push({ layer: i, b: e[0], type, t: te });
      }
    });
  }
}

// step start times inside one bar (swing delays the off-beat 16ths)
export function stepTime(st, i) {
  const sd = 60 / st.bpm / 4;
  return i * sd + (i % 2 === 1 ? st.swing * 0.5 * sd : 0);    // swing 0..1 -> 50%..75%
}
export const barLen = (st) => 16 * 60 / st.bpm / 4;

// schedule a list of segments [{ st, bars }] back to back from t0 (every bar is exactly barLen long)
export function scheduleSeq(e, segs, t0, ms = null) {
  let t = t0;
  segs.forEach((g, si) => {
    const st = g.st, bl = barLen(st), sd = 60 / st.bpm / 4, kkSteps = 16 * (st.kk?.loop?.bars || 1);
    if (si) { e.applyState(st, t, ms); e.kkOffAt(t); }
    e.kkClock(t, st.bpm);
    for (let b = 0; b < g.bars; b++) for (let i = 0; i < 16; i++) {
      const tb = t + b * bl;
      e.scheduleStep(st, i, tb + stepTime(st, i), tb + stepTime(st, i + 1));
      e.scheduleKK(st, (b * 16 + i) % kkSteps, tb + i * sd);
    }
    t += g.bars * bl;
  });
  return t;
}
async function renderSegs(segs, sr, t0, tail, exact, ms) {
  const total = segs.reduce((a, g) => a + g.bars * barLen(g.st), 0), len = exact ? t0 + total : t0 + total + tail;
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.round(len * sr), sampleRate: sr });
  const e = new Engine(ctx); await e.ready; e.applyState(segs[0].st, 0, ms);
  const tEnd = scheduleSeq(e, segs, t0, ms), fEnd = Math.round(tEnd * sr);
  e.kk.port.postMessage({ type: 'events', ev: Array.from({ length: 9 }, (_, c) => ({ frame: fEnd, chan: c, type: 'off' })) });
  e.bass.port.postMessage({ type: 'events', ev: [{ frame: fEnd, type: 'off' }] });
  await e.syncBass(); await e.syncKK();
  const buf = await ctx.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1);
  if (exact) { const n = Math.min(L.length, Math.round(0.03 * sr)); for (let i = 0; i < n; i++) { const g = i / n; L[L.length - 1 - i] *= g; R[R.length - 1 - i] *= g; } }
  return { L, R, sr, total };
}
// render N bars of the current state offline -> {L, R, sr}
export const renderOffline = (st, bars = 4, sr = 44100, tail = 1.0) => renderSegs([{ st, bars }], sr, 0.02, tail, false);
// render a whole song: segments back to back, output length = sum(bars) * bar length exactly (short fade on the last 30 ms)
export const renderSong = (segs, sr = 44100, ms = null) => renderSegs(segs, sr, 0, 0, true, ms);
