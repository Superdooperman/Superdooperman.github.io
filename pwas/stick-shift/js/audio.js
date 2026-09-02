export function createAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc.type = "sawtooth";
  osc2.type = "square";
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  const engGain = ctx.createGain();
  engGain.gain.value = 0;
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(engGain);
  engGain.connect(master);
  osc.start();
  osc2.start();

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const road = ctx.createBufferSource();
  road.buffer = noiseBuf;
  road.loop = true;
  const roadFilter = ctx.createBiquadFilter();
  roadFilter.type = "highpass";
  roadFilter.frequency.value = 180;
  const roadGain = ctx.createGain();
  roadGain.gain.value = 0;
  road.connect(roadFilter);
  roadFilter.connect(roadGain);
  roadGain.connect(master);
  road.start();

  let muted = false;

  function beep(freq, dur, type = "square", gain = 0.08) {
    if (muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(master);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.stop(ctx.currentTime + dur + 0.02);
  }

  return {
    ctx,
    muted: () => muted,
    toggle() {
      muted = !muted;
      master.gain.value = muted ? 0 : 0.22;
      return muted;
    },
    resume() {
      if (ctx.state === "suspended") ctx.resume();
    },
    update(car) {
      if (muted) return;
      const rpm = Math.max(car.engineOn ? car.rpm : 0, 0);
      const f = 40 + rpm / 18;
      osc.frequency.setTargetAtTime(f, ctx.currentTime, 0.04);
      osc2.frequency.setTargetAtTime(f * 0.5, ctx.currentTime, 0.04);
      filter.frequency.setTargetAtTime(280 + car.throttle * 1800 + rpm * 0.08, ctx.currentTime, 0.05);
      const g = car.engineOn ? 0.04 + car.throttle * 0.12 + rpm / 40000 : 0;
      engGain.gain.setTargetAtTime(g, ctx.currentTime, 0.05);
      roadGain.gain.setTargetAtTime(Math.min(0.08, Math.abs(car.speed) * 0.004), ctx.currentTime, 0.1);
    },
    stall() { beep(70, 0.25, "sawtooth", 0.14); setTimeout(() => beep(48, 0.3, "sawtooth", 0.1), 80); },
    grind() { beep(140, 0.12, "sawtooth", 0.1); beep(190, 0.18, "square", 0.06); },
    shift() { beep(520, 0.04, "square", 0.05); },
    start() { beep(180, 0.08, "square", 0.06); beep(240, 0.1, "square", 0.05); },
  };
}
