const AudioFX = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(freq, duration, type = 'square', vol = 0.08) {
    const ac = ensure();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ac.destination);
    const t = ac.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  }

  return {
    init: ensure,
    shoot: () => beep(220, 0.06, 'square', 0.06),
    explosion: () => { beep(80, 0.15, 'sawtooth', 0.1); beep(50, 0.25, 'square', 0.08); },
    board: () => beep(660, 0.08, 'square', 0.05),
    unload: () => beep(440, 0.12, 'triangle', 0.06),
    warning: () => beep(880, 0.05, 'square', 0.04),
    rotor: () => beep(90, 0.03, 'sawtooth', 0.02),
    fanfare: () => {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'square', 0.07), i * 140));
    },
    gameOver: () => {
      [392, 349, 330, 262].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'square', 0.07), i * 200));
    },
  };
})();