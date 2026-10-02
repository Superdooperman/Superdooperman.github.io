import Settings from './settings.js';
import Vox from './vox.js';

const AudioFX = (() => {
  let ctx = null;
  let music = null;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, duration, type = 'square', vol = 0.07, slide = 0) {
    const ac = ensure();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ac.destination);
    const t = ac.currentTime;
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + duration);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  }

  function noiseBurst(duration = 0.2, vol = 0.08) {
    const ac = ensure();
    const n = ac.createBuffer(1, ac.sampleRate * duration, ac.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ac.createBufferSource();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    src.buffer = n;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    gain.gain.value = vol;
    src.start();
  }

  function thump() {
    const ac = ensure();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const lp = ac.createBiquadFilter();
    const shelf = ac.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.2);
    lp.type = 'lowpass';
    lp.frequency.value = 240;
    lp.Q.value = 0.7;
    shelf.type = 'lowshelf';
    shelf.frequency.value = 110;
    shelf.gain.value = 7;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.26, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(lp);
    lp.connect(shelf);
    shelf.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.24);

    const body = ac.createOscillator();
    const bg = ac.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(58, t);
    body.frequency.exponentialRampToValueAtTime(36, t + 0.16);
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.exponentialRampToValueAtTime(0.14, t + 0.008);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    body.connect(bg);
    bg.connect(ac.destination);
    body.start(t);
    body.stop(t + 0.2);
  }

  return {
    init() {
      ensure();
      Vox.preload();
    },
    shoot() {
      Settings.rumble(18);
      thump();
      beep(760, 0.05, 'square', 0.04, -420);
      beep(190, 0.09, 'sawtooth', 0.05, -70);
      noiseBurst(0.07, 0.05);
    },
    hit() {
      Settings.rumble(10);
      beep(520, 0.05, 'square', 0.04);
    },
    explosion() {
      Settings.rumble([35, 25, 55]);
      beep(140, 0.18, 'sawtooth', 0.09, -100);
      noiseBurst(0.22, 0.1);
    },
    siren() { beep(420, 0.35, 'triangle', 0.05, 180); },
    boost() { beep(180, 0.2, 'sawtooth', 0.04, 220); },
    roll() { beep(300, 0.15, 'square', 0.04, 400); },
    damage() {
      Settings.rumble([30, 40, 70]);
      beep(90, 0.25, 'square', 0.09, -40);
    },
    banner() { beep(523, 0.12, 'square', 0.05); beep(784, 0.16, 'square', 0.05); },
    fanfare() {
      [392, 523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'square', 0.06), i * 120));
    },
    gameOver() {
      [392, 349, 294, 220].forEach((f, i) => setTimeout(() => beep(f, 0.28, 'sawtooth', 0.07), i * 180));
    },
    startMusic() {
      this.stopMusic();
      const ac = ensure();
      const notes = [196, 247, 294, 233, 196, 311, 294, 247];
      let i = 0;
      const tick = () => {
        beep(notes[i % notes.length], 0.18, 'square', 0.03);
        i++;
      };
      tick();
      music = setInterval(tick, 280);
      ac; // keep alive
    },
    stopMusic() {
      if (music) clearInterval(music);
      music = null;
    },
  };
})();

export default AudioFX;
