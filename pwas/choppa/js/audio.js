// Apple II speaker-style tones. Pitches follow the published click spacing
// 1,020,484 / (2 * (5 * period + 30)) Hz. No samples from the original.
const AudioFX = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function note(period, clicks, slide, when) {
    const ac = ensure();
    const t = when == null ? ac.currentTime : when;
    const spacing = (5 * period + 30) / 1020484;
    const dur = Math.max(0.028, clicks * spacing);
    const freq = 1020484 / (2 * (5 * period + 30));
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slide) {
      const endP = Math.max(8, period + slide * clicks);
      const endF = 1020484 / (2 * (5 * endP + 30));
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endF), t + dur);
    }
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    return t + dur + 0.012;
  }

  function chain(list) {
    try {
      let t = ensure().currentTime;
      list.forEach(([p, n, s]) => { t = note(p, n, s || 0, t); });
    } catch (_) { /* autoplay or missing audio */ }
  }

  function noise() {
    try {
      const ac = ensure();
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180 + Math.random() * 400, t);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (_) { /* ignore */ }
  }

  return {
    init: ensure,
    newGame: () => chain([
      [144, 48], [67, 48], [97, 48],
      [112, 48], [67, 48], [97, 48],
      [80, 48], [67, 48], [97, 48],
    ]),
    shot: () => chain([[48, 32, 1]]),
    board: () => chain([[255, 18], [224, 18], [152, 18]]),
    killed: () => chain([[48, 20], [67, 20], [97, 20]]),
    home: () => chain([[40, 28]]),
    dirge: () => chain([[64, 40], [84, 32], [97, 24], [131, 18]]),
    noise,
    boom: () => chain([[90, 10, 4], [50, 16, 2]]),
    drone: () => chain([[8, 5]]),
  };
})();
