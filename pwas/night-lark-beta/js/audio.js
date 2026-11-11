// M4 placeholder sound (BUILD-PLAN M4: "Placeholder music is fine"): a short square-wave loop
// and a few blips, made in WebAudio (no files). Starts on the first key/tap (browsers need a
// gesture); M mutes and the choice is kept in the save. Every call is wrapped: no audio is fine.
const NOTE = (n) => 440 * 2 ** ((n - 69) / 12);
// a minor-key sneak: bass on the beat, a lead that answers (MIDI notes, 0 = rest), 8th notes
const BASS = [45, 0, 45, 0, 48, 0, 45, 0, 43, 0, 43, 0, 40, 0, 43, 0];
const LEAD = [69, 0, 72, 0, 0, 71, 69, 0, 67, 0, 64, 0, 0, 67, 69, 0, 69, 0, 72, 0, 76, 0, 74, 72, 71, 0, 67, 0, 69, 0, 0, 0];
const STEP = 60 / 112 / 2;
const SFX = {
  attach: [[880, 0.04]], pickup: [[988, 0.05], [1319, 0.08]], alert: [[330, 0.08], [440, 0.12]],
  caught: [[220, 0.12], [165, 0.25]], steal: [[523, 0.08], [659, 0.08], [784, 0.16]],
  clear: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]], powerup: [[659, 0.06], [988, 0.12]],
  select: [[660, 0.04]], pause: [[440, 0.04]], over: [[196, 0.3]], tie: [[300, 0.06], [200, 0.1]],
  snuff: [[150, 0.1]], smoke: [[120, 0.15]],
  // set pieces (setpiece.js): the crack as it lets go, the crash or smash as it lands, a knockout
  crack: [[180, 0.03], [95, 0.06]], snap: [[1200, 0.02], [600, 0.04]],
  crash: [[110, 0.06], [70, 0.1], [45, 0.22]], smash: [[1568, 0.03], [2093, 0.03], [1175, 0.05], [80, 0.15]],
  ko: [[392, 0.05], [196, 0.12]],
};
/** The sound a sim event makes, for the set pieces (each type names its own in setpiece.js fx). */
export function setpieceSfx(e) {
  if (e.type === 'setpiece-drop' || e.type === 'setpiece-land') return e.sound && SFX[e.sound] ? e.sound : null;
  if (e.type === 'setpiece-tug') return 'crack';
  if (e.type === 'guard-down' || e.type === 'guard-stun') return 'ko';
  return null;
}

export function createAudio({ volume = 0.5, mute = false, music = true } = {}) { // music false: blips only (the dev room shell)
  const a = { ctx: null, gain: null, mute, volume, started: false, next: 0, i: 0, timer: 0 };
  function tone(freq, t, dur, vol, type = 'square') {
    const o = a.ctx.createOscillator(); const g = a.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.gain); o.start(t); o.stop(t + dur + 0.02);
  }
  function schedule() {
    try {
      if (!a.ctx) return;
      while (a.next < a.ctx.currentTime + 0.2) {
        const b = BASS[a.i % BASS.length]; const l = LEAD[a.i % LEAD.length];
        if (b) tone(NOTE(b), a.next, STEP * 0.9, 0.18, 'triangle');
        if (l) tone(NOTE(l), a.next, STEP * 0.8, 0.05);
        a.next += STEP; a.i += 1;
      }
    } catch { /* no sound is fine */ }
  }
  a.start = () => {
    if (a.started) return;
    try {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      a.ctx = new AC(); a.gain = a.ctx.createGain(); a.gain.connect(a.ctx.destination);
      a.gain.gain.value = a.mute ? 0 : a.volume;
      a.next = a.ctx.currentTime + 0.05; a.started = true;
      if (music) a.timer = setInterval(schedule, 50);
    } catch { a.ctx = null; }
  };
  a.setMute = (m) => { a.mute = !!m; try { if (a.gain) a.gain.gain.value = a.mute ? 0 : a.volume; } catch { /* ignore */ } };
  a.sfx = (name) => {
    try {
      if (!a.ctx || a.mute) return;
      let t = a.ctx.currentTime;
      for (const [f, d] of SFX[name] || []) { tone(f, t, d, 0.08); t += d; }
    } catch { /* ignore */ }
  };
  return a;
}
