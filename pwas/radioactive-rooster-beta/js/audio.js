// Radioactive Rooster audio (Push C, 2026-10-24): room/area music with calm + tense layers, one-shot cues, voice lines.
//
// Files live in audio/in/ (the drop folder; names in audio/in/CUES.md):
//   cues   audio/in/<cue>.(ogg|wav|mp3)                one-shots
//   music  audio/in/bed-<room|area>[-calm|-tense].(ogg|mp3)   loops; a room bed wins over its area bed
//   voice  audio/in/voice/<line id>.(ogg|mp3)           one per dialogue line (ids: audio/in/VOICE-IDS.md)
// The game never probes for a file (2026-10-21 GitHub Pages rate limit): it reads audio/in/manifest.json once, which
// `python3 tools/audio_files.py` rewrites from what's on disk. Drop a file in, run the tool, reload: no code change.
// Anything missing plays a small WebAudio stand-in (cues, music) or stays silent (voice).
//
// Tension 0..1 (time to midnight, the same driver as the colour shift: logic.js nightOf) crossfades calm -> tense and,
// for the stand-in music, raises the tempo and opens the filter.

const SETTINGS_KEY = "rr-audio";
const DEFAULTS = { music: 0.6, sfx: 0.8, voice: 1, muted: false };

// Room -> area for Brook's first batch of 4 area loops (BRIEF.md, 2026-10-24). A per-room bed overrides its area.
export const AREAS = {
  hq: "mainstreet", store: "mainstreet", wkuk: "mainstreet",
  fence: "farm", henhouse: "farm", barn: "farm",
  gate: "midway", midway: "midway", pavilion: "midway",
  club: "club",
};

// Every cue the game can ask for. `synth` is the stand-in when no file is in the manifest.
export const CUES = [
  // existing (Oct 17-21)
  "wheeze", "geiger", "click", "blip", "pah-kaw", "ding", "bonk",
  // Push C
  "title-sting", "footstep", "door", "hatch", "pickup", "crow", "turnstile", "neon-hum", "clock-tick", "cutaway",
  // Push B beats (not built yet: cue names reserved so Brook can deliver them now)
  "potato-cannon", "goop", "ghost-scare", "ring-toss",
  // Brook's placeholder pack (2026-10-24) added four names
  "potato-flight", "potato-impact", "hen-cluck", "goat-bleat",
  // Henny never speaks in play (Arlong 2026-10-24): chicken gibberish instead, henny-cluck-1..6 picked at random
  "henny-cluck",
  "smoke-whoosh", // club smoke veil clearing (Arlong 2026-10-25)
  // club sign (Hawkeye pass 2026-10-25, Brook's synthesized placeholders, approved by Arlong 2026-10-25): the henchman's smack; the
  // Pavilion light-up; the steady full-on hum it hands off to (a seamless loop: OGG/WAV only, never the MP3)
  "neon-sputter", "neon-lightup", "neon-hum-full",
];

// Cues that pick among numbered variants (<cue>-1 .. <cue>-N, never the same one twice running), then fall back to
// the plain <cue> file, then to another cue's file, then to the synth.
export const VARIANTS = { "henny-cluck": { max: 6, fallback: "hen-cluck" } };
const lastVariant = {};
export function cueFile(kind, cues = manifest.cues, rand = Math.random) {
  const v = VARIANTS[kind];
  if (v) {
    const all = [];
    for (let i = 1; i <= v.max; i += 1) if (cues[`${kind}-${i}`]) all.push(`${kind}-${i}`);
    const pool = all.length > 1 ? all.filter((n) => n !== lastVariant[kind]) : all;
    if (pool.length) {
      const name = pool[Math.floor(rand() * pool.length) % pool.length];
      lastVariant[kind] = name;
      return `audio/in/${name}.${cues[name]}`;
    }
    if (cues[kind]) return `audio/in/${kind}.${cues[kind]}`;
    return cues[v.fallback] ? `audio/in/${v.fallback}.${cues[v.fallback]}` : null;
  }
  return cues[kind] ? `audio/in/${kind}.${cues[kind]}` : null;
}
export const LOOPED_CUES = ["neon-hum", "neon-hum-full"]; // sustained while their beat runs

let ctx = null;
let master = null; // gain nodes: master -> (music, sfx, voice)
const bus = {};
let manifest = { cues: {}, beds: {}, voice: {} }; // name -> ext
let manifestReady = null;
const settings = loadSettings();
const listeners = new Set();
let tension = 0;
let wantBed = null; // { room, area }
let bedNow = null; // { key, calm, tense, synth }
let voiceNow = null;
let voiceSeq = null;
const loops = new Map(); // looped cue name -> stop()

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private mode */ }
  applyVolumes();
  for (const fn of listeners) fn(settings);
}

export function audioSettings() {
  return { ...settings };
}

export function setAudio(patch) {
  Object.assign(settings, patch);
  saveSettings();
}

export function onAudioChange(fn) {
  listeners.add(fn);
}

export function initAudio() {
  if (!manifestReady) {
    manifestReady = fetch("audio/in/manifest.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { if (m) manifest = { cues: m.cues || {}, beds: m.beds || {}, voice: m.voice || {} }; })
      .catch(() => { /* no manifest: stand-ins only */ });
  }
  return manifestReady;
}

export function audioManifest() {
  return manifest;
}

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    for (const k of ["music", "sfx", "voice"]) {
      bus[k] = ctx.createGain();
      bus[k].connect(master);
    }
    applyVolumes();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : 1, t, 0.02);
  for (const k of ["music", "sfx", "voice"]) bus[k].gain.setTargetAtTime(settings[k], t, 0.02);
  for (const el of document.querySelectorAll("audio[data-bus]")) el.volume = elVolume(el.dataset.bus, Number(el.dataset.mix || 1));
}

function elVolume(kind, mix) {
  return settings.muted ? 0 : Math.max(0, Math.min(1, settings[kind] * mix));
}

/* ---------- stand-in synth (the old cue synth, routed through the sfx bus) ---------- */

function envGain(at, attack, dur, peak, out) {
  const gain = ctx.createGain();
  gain.connect(out || bus.sfx);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  return gain;
}

function tone(freq, when, dur, type, peak, out, glide) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, when + dur);
  osc.connect(envGain(when, 0.01, dur, peak, out));
  osc.start(when);
  osc.stop(when + dur + 0.05);
  return osc;
}

function noise(when, dur, peak, freq = 900, out) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  src.connect(filter);
  filter.connect(envGain(when, 0.005, dur, peak, out));
  src.start(when);
}

const SYNTH = {
  wheeze: (n) => { noise(n, 0.28, 0.08); tone(420, n, 0.22, "sawtooth", 0.04); tone(180, n + 0.12, 0.2, "triangle", 0.05); },
  geiger: (n) => { for (let i = 0; i < 6; i += 1) tone(1800, n + i * 0.08, 0.03, "square", 0.05); },
  click: (n) => { for (let i = 0; i < 3; i += 1) tone(880, n + i * 0.18, 0.05, "square", 0.06); },
  // service bell: a bright struck partial over a softer fundamental, long ring-out
  ding: (n) => { tone(1568, n, 0.9, "sine", 0.09); tone(3136, n, 0.35, "sine", 0.03); tone(784, n, 0.6, "triangle", 0.03); },
  // goat skull vs barn post: a dull wooden thud with a little ring
  bonk: (n) => { noise(n, 0.12, 0.16); tone(110, n, 0.25, "triangle", 0.14); tone(70, n + 0.02, 0.3, "sine", 0.12); tone(523, n + 0.05, 0.4, "sine", 0.02); },
  blip: (n) => tone(660, n, 0.08, "square", 0.05),
  "pah-kaw": (n) => { noise(n, 0.18, 0.14); tone(220, n, 0.2, "sawtooth", 0.1); tone(440, n + 0.22, 0.35, "square", 0.12); tone(330, n + 0.45, 0.4, "sawtooth", 0.1); },
  // Push C stand-ins: placeholder beeps so the cue lands audibly where it fires
  "title-sting": (n) => { [392, 523, 659, 784].forEach((f, i) => tone(f, n + i * 0.09, 0.5, "square", 0.05)); tone(98, n, 0.9, "sawtooth", 0.06); },
  footstep: (n) => noise(n, 0.05, 0.05, 400),
  door: (n) => { noise(n, 0.15, 0.08, 300); tone(140, n, 0.18, "triangle", 0.06); },
  hatch: (n) => { noise(n, 0.2, 0.09, 220); tone(90, n + 0.05, 0.25, "triangle", 0.08); },
  pickup: (n) => { tone(784, n, 0.08, "square", 0.05); tone(1175, n + 0.07, 0.12, "square", 0.05); },
  crow: (n) => { tone(500, n, 0.25, "sawtooth", 0.05, null, 900); tone(900, n + 0.25, 0.35, "sawtooth", 0.05, null, 600); },
  turnstile: (n) => { for (let i = 0; i < 4; i += 1) { noise(n + i * 0.07, 0.03, 0.08, 2500); } tone(200, n + 0.3, 0.1, "square", 0.04); },
  "neon-sputter": (n) => { for (let i = 0; i < 5; i += 1) tone(120, n + i * 0.16, 0.07, "sawtooth", 0.03); },
  "neon-lightup": (n) => { tone(60, n, 0.2, "square", 0.04); tone(120, n + 0.95, 1.6, "sawtooth", 0.02); },
  "neon-hum-full": (n) => { tone(120, n, 0.6, "sawtooth", 0.02); tone(60, n, 0.6, "sine", 0.02); },
  "neon-hum": (n) => { tone(120, n, 0.6, "sawtooth", 0.015); tone(240, n, 0.6, "square", 0.006); },
  "clock-tick": (n) => { noise(n, 0.02, 0.12, 3200); noise(n + 0.5, 0.02, 0.08, 2400); },
  cutaway: (n) => noise(n, 0.35, 0.06, 1500),
  "potato-cannon": (n) => { noise(n, 0.3, 0.2, 200); tone(80, n, 0.3, "sine", 0.15, null, 40); },
  goop: (n) => tone(300, n, 0.3, "sine", 0.08, null, 80),
  "ghost-scare": (n) => { tone(900, n, 0.6, "sine", 0.05, null, 300); tone(905, n, 0.6, "sine", 0.05, null, 290); },
  "potato-flight": (n) => { noise(n, 1.6, 0.05, 900); tone(1400, n, 1.6, "sine", 0.02, null, 300); },
  "potato-impact": (n) => { noise(n, 0.25, 0.18, 250); tone(90, n, 0.25, "sine", 0.12, null, 45); },
  "hen-cluck": (n) => { [0, 0.14, 0.28].forEach((d) => tone(620, n + d, 0.08, "square", 0.04, null, 480)); tone(700, n + 0.5, 0.3, "square", 0.04, null, 950); },
  "henny-cluck": (n) => { const f = 560 + Math.random() * 160; [0, 0.11].forEach((d) => tone(f, n + d, 0.07, "square", 0.04, null, f * 0.8)); },
  "smoke-whoosh": (n) => { noise(n, 0.9, 0.07, 700); noise(n + 0.15, 0.7, 0.05, 2200); },
  "goat-bleat": (n) => { const o = tone(380, n, 0.7, "sawtooth", 0.05); const lfo = ctx.createOscillator(); const g = ctx.createGain(); lfo.frequency.value = 18; g.gain.value = 25; lfo.connect(g); g.connect(o.frequency); lfo.start(n); lfo.stop(n + 0.75); },
  "ring-toss": (n) => { tone(2093, n, 0.4, "sine", 0.05); tone(1568, n + 0.12, 0.4, "sine", 0.04); },
};

function synth(kind) {
  if (!context()) return;
  const fn = SYNTH[kind];
  if (fn) fn(ctx.currentTime + 0.02);
}

function fileFor(table, name, dir = "audio/in/") {
  const ext = manifest[table][name];
  return ext ? `${dir}${name}.${ext}` : null;
}

function element(url, kind, mix = 1, loop = false) {
  const a = new Audio(url);
  a.dataset.bus = kind;
  a.dataset.mix = String(mix);
  a.loop = loop;
  a.volume = elVolume(kind, mix);
  a.style.display = "none";
  document.body.append(a); // so applyVolumes finds it
  a.addEventListener("ended", () => { if (!a.loop) a.remove(); });
  return a;
}

export async function playCue(kind) {
  if (!kind) return;
  await initAudio();
  const url = cueFile(kind);
  if (url) {
    try {
      await element(url, "sfx").play();
      return;
    } catch { /* fall through to the synth */ }
  }
  try { synth(kind); } catch { /* autoplay can refuse before the first gesture; the next click retries */ }
}

// Sustained cue (the club's neon hum) while a beat runs. Returns stop().
export async function loopCue(kind) {
  stopLoop(kind);
  await initAudio();
  const url = fileFor("cues", kind);
  if (url) {
    const a = element(url, "sfx", 1, true);
    a.play().catch(() => {});
    loops.set(kind, () => a.remove());
  } else {
    const id = setInterval(() => { try { synth(kind); } catch { /* */ } }, 550);
    try { synth(kind); } catch { /* */ }
    loops.set(kind, () => clearInterval(id));
  }
}

// A one-shot that hands off to a loop the moment it ends (neon-lightup -> neon-hum-full: the cue's tail is the loop's
// head, so no crossfade). Returns cancel(): a skipped beat must not start the loop late.
export function cueThenLoop(kind, loopKind, fallbackMs) {
  let live = true, timer = null;
  (async () => {
    await initAudio();
    const url = cueFile(kind);
    const go = () => { if (live) loopCue(loopKind); };
    if (url) {
      try {
        const a = element(url, "sfx");
        a.addEventListener("ended", go, { once: true });
        await a.play();
        return;
      } catch { /* synth below */ }
    }
    try { synth(kind); } catch { /* */ }
    timer = setTimeout(go, fallbackMs);
  })();
  return () => { live = false; clearTimeout(timer); stopLoop(loopKind); };
}

export function stopLoop(kind) {
  const stop = loops.get(kind);
  if (stop) { stop(); loops.delete(kind); }
}

/* ---------- music: calm + tense layers, crossfaded by tension ---------- */

// Which files a room plays: a room bed beats its area bed; calm/tense pairs beat a single bed (which is then both).
export function bedFiles(room, beds = manifest.beds) {
  const area = AREAS[room] || room;
  for (const key of [room, area]) {
    const calm = beds[`bed-${key}-calm`] ? `audio/in/bed-${key}-calm.${beds[`bed-${key}-calm`]}` : null;
    const tense = beds[`bed-${key}-tense`] ? `audio/in/bed-${key}-tense.${beds[`bed-${key}-tense`]}` : null;
    const single = beds[`bed-${key}`] ? `audio/in/bed-${key}.${beds[`bed-${key}`]}` : null;
    if (calm || tense || single) return { key, calm: calm || single || tense, tense: tense || single || calm };
  }
  return { key: area, calm: null, tense: null };
}

// Equal-power crossfade weights for tension t.
export function crossfade(t) {
  const u = Math.max(0, Math.min(1, t));
  return { calm: Math.cos((u * Math.PI) / 2), tense: Math.sin((u * Math.PI) / 2) };
}

// A beat can borrow the music (the club cutaway plays the club bed); room changes wait until it lets go.
let heldBy = null;
let roomBed = null;
export function holdBed(room) {
  heldBy = room;
  switchBed(room);
}
export function releaseBed() {
  heldBy = null;
  if (roomBed) switchBed(roomBed);
}

export function playBed(room) {
  roomBed = room;
  if (heldBy) return Promise.resolve();
  return switchBed(room);
}

async function switchBed(room) {
  if (!room) { stopBed(); wantBed = null; return; }
  if (wantBed && wantBed.room === room) return;
  wantBed = { room };
  await initAudio();
  if (!wantBed || wantBed.room !== room) return;
  const files = bedFiles(room);
  if (bedNow && bedNow.key === files.key && bedNow.calmUrl === files.calm) { mixBed(); return; }
  stopBed();
  if (files.calm) {
    const calm = element(files.calm, "music", 0, true);
    const tense = files.tense !== files.calm ? element(files.tense, "music", 0, true) : null;
    bedNow = { key: files.key, calmUrl: files.calm, calm, tense };
    mixBed();
    calm.play().catch(() => { /* waits for a gesture: resumeAudio() retries */ });
    if (tense) tense.play().catch(() => {});
  } else {
    bedNow = { key: files.key, calmUrl: null, synth: startSynthBed(files.key) };
  }
}

function stopBed() {
  if (!bedNow) return;
  if (bedNow.calm) bedNow.calm.remove();
  if (bedNow.tense) bedNow.tense.remove();
  if (bedNow.synth) bedNow.synth.stop();
  bedNow = null;
}

function mixBed() {
  if (!bedNow || !bedNow.calm) return;
  const w = crossfade(tension);
  const base = 0.35; // beds sit under the dialogue (old bed volume)
  if (bedNow.tense) {
    // Brook's calm/tense pairs are sample-aligned: keep the tense layer on the calm one's clock
    if (!bedNow.calm.paused && Math.abs(bedNow.tense.currentTime - bedNow.calm.currentTime) > 0.08) bedNow.tense.currentTime = bedNow.calm.currentTime;
    bedNow.calm.dataset.mix = String(base * w.calm);
    bedNow.tense.dataset.mix = String(base * w.tense);
    bedNow.tense.volume = elVolume("music", base * w.tense);
  } else bedNow.calm.dataset.mix = String(base);
  bedNow.calm.volume = elVolume("music", Number(bedNow.calm.dataset.mix));
}

// The stand-in bed: a quiet two-bar bass + pluck figure per area. Tempo and filter rise with tension, and a tense
// layer (a low pulse) fades in, so the pacing can be felt before Brook's loops land.
const FIGURES = {
  farm: { root: 98, notes: [0, 4, 7, 4, 9, 7, 4, 2], wave: "triangle" },
  mainstreet: { root: 110, notes: [0, 3, 7, 10, 7, 3, 5, 3], wave: "triangle" },
  midway: { root: 131, notes: [0, 4, 7, 12, 11, 7, 4, 7], wave: "square" },
  club: { root: 87, notes: [0, 3, 6, 10, 6, 3, 1, 0], wave: "sine" },
};

function startSynthBed(key) {
  if (!context()) return { stop() {} };
  const fig = FIGURES[key] || FIGURES.mainstreet;
  const out = ctx.createGain();
  out.gain.value = 0.5;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  out.connect(filter);
  filter.connect(bus.music);
  let step = 0;
  let next = ctx.currentTime + 0.1;
  let stopped = false;
  const semis = (r, s) => r * 2 ** (s / 12);
  const pump = () => {
    if (stopped) return;
    const bpm = 84 + 40 * tension;
    const beat = 60 / bpm / 2;
    filter.frequency.setTargetAtTime(700 + 2600 * tension, ctx.currentTime, 0.3);
    while (next < ctx.currentTime + 0.4) {
      const s = fig.notes[step % fig.notes.length];
      tone(semis(fig.root * 2, s), next, beat * 0.9, fig.wave, 0.03, out);
      if (step % 2 === 0) tone(semis(fig.root / 2, fig.notes[(step / 2) % 4 * 2]), next, beat * 1.8, "sine", 0.05, out);
      if (tension > 0.4 && step % 2 === 1) noise(next, 0.03, 0.03 * tension, 5000, out); // the tense layer: hats
      if (tension > 0.7) tone(semis(fig.root / 2, 0), next, beat * 0.5, "square", 0.012 * tension, out);
      next += beat;
      step += 1;
    }
  };
  const id = setInterval(pump, 100);
  pump();
  return { stop() { stopped = true; clearInterval(id); out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1); setTimeout(() => out.disconnect(), 600); } };
}

export function setTension(t) {
  tension = Math.max(0, Math.min(1, Number(t) || 0));
  mixBed();
}

export function getTension() {
  return tension;
}

// Call from a user gesture: unlocks WebAudio and retries any bed that autoplay refused.
export function resumeAudio() {
  context();
  if (bedNow) {
    if (bedNow.calm && bedNow.calm.paused) bedNow.calm.play().catch(() => {});
    if (bedNow.tense && bedNow.tense.paused) bedNow.tense.play().catch(() => {});
  } else if (wantBed) {
    const room = wantBed.room;
    wantBed = null;
    switchBed(room);
  }
}

/* ---------- voice lines ---------- */

export function hasVoice(id) {
  return !!(id && manifest.voice[id]);
}

// Plays audio/in/voice/<id>.<ext> when the manifest lists it; silent otherwise. Returns true if a file started.
export async function playVoice(id) {
  stopVoice();
  if (!id) return false;
  await initAudio();
  const url = fileFor("voice", id, "audio/in/voice/");
  if (!url) return false;
  const a = element(url, "voice");
  voiceNow = a;
  try {
    await a.play();
    return true;
  } catch {
    return false;
  }
}

// Several voice files in a row (an ending's comic panels). Ids without a file are skipped silently.
export async function playVoiceSeq(ids) {
  stopVoice();
  await initAudio();
  const urls = (ids || []).map((id) => fileFor("voice", id, "audio/in/voice/")).filter(Boolean);
  const token = {};
  voiceSeq = token;
  for (const url of urls) {
    if (voiceSeq !== token) return;
    const a = element(url, "voice");
    voiceNow = a;
    await new Promise((done) => {
      a.addEventListener("ended", done, { once: true });
      a.addEventListener("error", done, { once: true });
      a.play().catch(done);
    });
  }
}

export function stopVoice() {
  voiceSeq = null;
  if (voiceNow) { voiceNow.pause(); voiceNow.remove(); voiceNow = null; }
}

// Debug/inspection hook for the playtest scripts.
export function audioState() {
  return { tension, bed: bedNow && { key: bedNow.key, file: bedNow.calmUrl, synth: !!bedNow.synth }, settings: { ...settings }, loops: [...loops.keys()] };
}
