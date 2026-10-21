let ctx;
let bed;
let bedUrl = "";

function context() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function envGain(at, attack, dur, peak) {
  const audio = context();
  const gain = audio.createGain();
  gain.connect(audio.destination);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  return gain;
}

function tone(freq, when, dur, type, peak) {
  const audio = context();
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  osc.connect(envGain(when, 0.02, dur, peak));
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function noise(when, dur, peak) {
  const audio = context();
  const length = Math.floor(audio.sampleRate * dur);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900;
  src.connect(filter);
  filter.connect(envGain(when, 0.01, dur, peak));
  src.start(when);
}

function synth(kind) {
  const now = context().currentTime + 0.02;
  if (kind === "wheeze") {
    noise(now, 0.28, 0.08);
    tone(420, now, 0.22, "sawtooth", 0.04);
    tone(180, now + 0.12, 0.2, "triangle", 0.05);
  } else if (kind === "geiger") {
    for (let i = 0; i < 6; i += 1) tone(1800, now + i * 0.08, 0.03, "square", 0.05);
  } else if (kind === "click") {
    for (let i = 0; i < 3; i += 1) tone(880, now + i * 0.18, 0.05, "square", 0.06);
  } else if (kind === "ding") {
    // service bell: a bright struck partial over a softer fundamental, long ring-out
    tone(1568, now, 0.9, "sine", 0.09);
    tone(3136, now, 0.35, "sine", 0.03);
    tone(784, now, 0.6, "triangle", 0.03);
  } else if (kind === "bonk") {
    // goat skull vs barn post: a dull wooden thud with a little ring
    noise(now, 0.12, 0.16);
    tone(110, now, 0.25, "triangle", 0.14);
    tone(70, now + 0.02, 0.3, "sine", 0.12);
    tone(523, now + 0.05, 0.4, "sine", 0.02);
  } else if (kind === "blip") {
    tone(660, now, 0.08, "square", 0.05);
  } else if (kind === "pah-kaw") {
    noise(now, 0.18, 0.14);
    tone(220, now, 0.2, "sawtooth", 0.1);
    tone(440, now + 0.22, 0.35, "square", 0.12);
    tone(330, now + 0.45, 0.4, "sawtooth", 0.1);
  }
}

// The mp3s actually in audio/in/ (none yet). Listed so the game never sends a request for a file that isn't there
// (2026-10-21 rate limit); add a name here when its file lands.
const AUDIO_IN = new Set([]);

async function fileExists(url) {
  return AUDIO_IN.has(url.replace(/^audio\/in\//, "").replace(/\.mp3$/, ""));
}

export async function playCue(kind) {
  if (!kind) return;
  const url = `audio/in/${kind}.mp3`;
  if (await fileExists(url)) {
    const clip = new Audio(url);
    try {
      await clip.play();
      return;
    } catch {
      /* fall through to the synth */
    }
  }
  try {
    synth(kind);
  } catch {
    /* autoplay can refuse the first gesture; the next click retries */
  }
}

export async function playBed(room) {
  const url = `audio/in/bed-${room}.mp3`;
  if (url === bedUrl) return;
  bedUrl = url;
  if (bed) {
    bed.pause();
    bed = null;
  }
  if (!(await fileExists(url))) return;
  if (bedUrl !== url) return;
  bed = new Audio(url);
  bed.loop = true;
  bed.volume = 0.35;
  try {
    await bed.play();
  } catch {
    bed = null;
  }
}
