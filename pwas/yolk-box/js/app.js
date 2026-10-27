// Midnight's Yolk Box - UI, transport, recorder.
import { Engine, VOICES, DRUM_KNOBS, BASS_KNOBS, stepTime, renderOffline, renderSong, barLen } from './engine.js';
import { DEMOS, defaults, clone, strutPhrase } from './patterns.js';
import { wavBlob, mp3Blob, download } from './encode.js';
import { KK_PRESETS, KK_SCALES, KK_GATES, KEYS, DRUM_ORDER, presetById, padNotes, mapX, cfgOf, kkDefaults } from './kk.js';
import * as B from './bricks.js';
import { initStudio } from './studio.js';
import { initDancer } from './dancer.js';
import * as Z from './sanitize.js';
import { applyNames } from './names.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LS_CUR = 'yolkbox.current.v1', LS_PATS = 'yolkbox.patterns.v1';
const LS_LIB = 'yolkbox.bricks.v1', LS_PROJ = 'yolkbox.projects.v1', LS_PCUR = 'yolkbox.project.cur', LS_PREFS = 'yolkbox.prefs.v1';
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C'];
const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2400); };

// every state that is loaded, restored or imported goes through the sanitizer (known keys only, clamped numbers)
const merge = (s) => Z.state(s);
// session preferences (timing help etc.) - not part of bricks or songs
const PR = Z.prefs(jget(LS_PREFS, {}), { q: '1/16', qs: 1, countIn: false, click: false, clickVol: 0.6, inKey: true, dancer: 'rooster' });
const savePrefs = () => localStorage.setItem(LS_PREFS, JSON.stringify(PR));
// brick shelf: one library shared by every song
let lib = Z.bricks(jget(LS_LIB, null)).map(B.deepFreeze);
let projects = Z.projects(jget(LS_PROJ, null), new Map(lib.map((b) => [b.id, b.bars])));
function seedStarters() {                        // first launch: four ready-made bricks and a song that uses them
  const strut = clone(DEMOS[0]), mk = (name, color, f) => { const st = clone(strut); st.kk.loop = { bars: 2, layers: [] }; f(st); return B.makeBrick(st, name, color); };
  const intro = mk('Intro', '#3aa0ff', (st) => { st.drums.steps.cp.fill(0); st.drums.steps.rs.fill(0); st.drums.steps.oh.fill(0); st.bass.params.cutoff = 160; });
  const verse = mk('Verse', '#2f9e44', () => {});
  const chorus = mk('Chorus', '#f6c431', (st) => { st.kk.loop = strutPhrase(); st.kk.preset = 'squawk'; });
  const outro = mk('Outro', '#a65cff', (st) => { st.drums.steps.ch.fill(0); st.drums.steps.oh.fill(0); st.drums.steps.cp.fill(0); st.drums.steps.cy[0] = 1; st.kk.loop = { bars: 2, layers: [strutPhrase().layers[1]] }; });
  return [intro, verse, chorus, outro];
}
if (!projects) {
  const old = jget(LS_CUR, null), seeded = lib.length ? [] : seedStarters(); lib.push(...seeded);
  for (const [name, st] of Object.entries(jget(LS_PATS, {}))) if (st && st.drums) lib.push(B.makeBrick(merge(st), Z.text(name, 'Pattern'), B.BRICK_COLORS[lib.length % 8]));   // old saved patterns become bricks
  const ws = old && old.drums ? merge(old) : B.starterGroove({ ...clone(DEMOS[0]), name: 'Workspace' });
  const id = B.uid('p'), clips = seeded.length ? [B.newClip(seeded[0].id, 2), B.newClip(seeded[1].id, 2), B.newClip(seeded[2].id, 2), B.newClip(seeded[3].id, 1)] : [];
  projects = { [id]: { id, name: 'My First Song', clips, ws } };
  localStorage.setItem(LS_PCUR, id);
}
let P = projects[localStorage.getItem(LS_PCUR)] || Object.values(projects)[0];
let S = merge(P.ws || B.starterGroove(defaults()));
let ctx = null, eng = null, engReady = null;
let playing = false, timer = null, gridT = 0, step = 0, absStep = 0, uiQ = [], selVoice = 'bd', selStep = 0;
const ms = { drums: { m: false, s: false }, bass: { m: false, s: false }, kk: { m: false, s: false } };   // session mute / solo
let saveH = 0, commitH = 0;
function saveAll() {
  P.ws = S; projects[P.id] = P;
  localStorage.setItem(LS_PROJ, JSON.stringify(projects)); localStorage.setItem(LS_LIB, JSON.stringify(lib)); localStorage.setItem(LS_PCUR, P.id);
}
function changed() {
  if (eng && mode === 'ws') { cancelAnimationFrame(changed.r); changed.r = requestAnimationFrame(() => eng.applyState(S, 0, ms)); }
  clearTimeout(saveH); saveH = setTimeout(() => { saveAll(); wsUI(); }, 300);
  clearTimeout(commitH); commitH = setTimeout(commit, 400);
  studio && studio.wsChanged();
}

// ---------------------------------------------------------------- undo / redo (whole workspace + song + shelf, 100 steps)
const H = { past: [], future: [], cur: null, max: 100 };
const snap = () => ({ S: JSON.stringify(S), clips: JSON.stringify(P.clips), lib: lib.slice(), pid: P.id });
const same = (a, b) => a && b && a.S === b.S && a.clips === b.clips && a.lib.length === b.lib.length && a.lib.every((x, i) => x === b.lib[i]);
function commit() {
  clearTimeout(commitH); const s = snap();
  if (same(s, H.cur)) return;
  if (H.cur && H.cur.pid === s.pid) { H.past.push(H.cur); if (H.past.length > H.max) H.past.shift(); }
  H.future = []; H.cur = s; undoUI();
}
function restore(s) {
  if (kr.state !== 'idle') kr = { state: 'idle' };
  S = merge(JSON.parse(s.S)); P.clips = JSON.parse(s.clips); lib = s.lib.slice();
  if (eng) { eng.kkRelease([1, 2, 3, 4, 5, 6, 7, 8]); if (mode === 'ws') eng.applyState(S, 0, ms); }
  kkFrom = S.kk.loop.layers.map(() => 0); refreshAll(); studio.refresh(); saveAll(); undoUI();
}
function undo() { commit(); if (!H.past.length) return toast('Nothing to undo'); H.future.push(H.cur); H.cur = H.past.pop(); restore(H.cur); toast('Undo'); }
function redo() { commit(); if (!H.future.length) return toast('Nothing to redo'); H.past.push(H.cur); H.cur = H.future.pop(); restore(H.cur); toast('Redo'); }
function undoUI() { $('#undoBtn').disabled = !H.past.length; $('#redoBtn').disabled = !H.future.length; }

// ---------------------------------------------------------------- audio
function ensureAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    eng = new Engine(ctx);
    engReady = eng.ready.then(() => { eng.applyState(S); hookRec(); startMeter(); hmInit(); });
  }
  if (ctx.state !== 'running') ctx.resume();
  return engReady;
}

// play sources: 'ws' = the workspace loop; 'song' = the song timeline; 'prev' = one brick looped; 'trim' = trim preview
let mode = 'ws', src = null, seqPos = 0, curSeg = null, endAt = 0, playT0 = 0, lastSwitch = null, pendQ = [];
const segCache = new Map();
function segState(br) {                             // a brick plays at the song tempo
  let c = segCache.get(br); if (!c || c.bpm !== S.bpm) { c = { bpm: S.bpm, st: { ...clone(br.state), bpm: S.bpm } }; segCache.set(br, c); }
  return c.st;
}
function srcSeq() {
  if (!src) return [];
  if (src.kind === 'song') return B.songSeq(P.clips, lib);
  if (src.kind === 'prev') return B.songSeq([{ uid: 'prev', brick: src.brick, rep: 1 }], lib);
  return B.songSeq([{ uid: 'trim', brick: '__trim', rep: 1 }], [src.tmp]);
}
// run fn on the next bar line (immediately when stopped)
function queueBar(fn, msg) { if (!playing) { fn(0); return false; } pendQ.push(fn); if (msg) toast(msg); return true; }
async function play(opts = {}) {
  await ensureAudio();
  if (playing) return;
  mode = opts.src ? (opts.src.kind === 'song' ? 'song' : opts.src.kind) : 'ws'; src = opts.src || null; seqPos = opts.from || 0; curSeg = null; endAt = 0; pendQ = [];
  playing = true; step = 0; absStep = 0; kkAnchor = 0; gridT = ctx.currentTime + 0.06; playT0 = gridT; uiQ = []; dancer && dancer.reset(); kkFrom = S.kk.loop.layers.map(() => 0);
  if (mode === 'ws') eng.applyState(S, 0, ms);
  timer = setInterval(sched, 25); sched(); hmStart();
  $('#play').classList.add('on'); $('#play').innerHTML = '&#9632;'; $('#play').setAttribute('aria-label', 'Stop');
  studio && studio.playUI();
}
function stop() {
  if (!playing) return;
  playing = false; clearInterval(timer); eng.stopBass(); uiQ = []; pendQ = []; dancer && dancer.reset();
  if (kr.state === 'rec') kkFinish(); kr = { state: 'idle' }; eng.kkRelease([1, 2, 3, 4, 5, 6, 7, 8]); kkUI();
  $('#play').classList.remove('on'); $('#play').innerHTML = '&#9654;'; $('#play').setAttribute('aria-label', 'Play');
  $$('.cell.now').forEach((c) => c.classList.remove('now')); $$('#beatLeds i').forEach((l) => l.classList.remove('on', 'one'));
  if (mode !== 'ws') eng.applyState(S, 0, ms);
  mode = 'ws'; src = null; studio && studio.playUI(); hmRest(); npSet(null);
}
// switch what is playing; lands on the next bar line when already playing
function playSrc(nsrc, from = 0) {
  if (!playing) return play({ src: nsrc, from });
  queueBar((t) => {
    const was = mode; mode = nsrc ? (nsrc.kind === 'song' ? 'song' : nsrc.kind) : 'ws'; src = nsrc; seqPos = from; curSeg = null; endAt = 0;
    if (mode === 'ws') { eng.applyState(S, t, ms); eng.kkOffAt(t); kkAnchor = absStep; kkFrom = S.kk.loop.layers.map(() => 0); }
    else if (was === 'ws' && kr.state !== 'idle') { if (kr.state === 'rec') kkFinish(); kr = { state: 'idle' }; kkUI(); }
    studio && setTimeout(() => studio.playUI(), Math.max(0, (t - ctx.currentTime) * 1000));
  }, nsrc ? null : 'Back to the workspace on the next bar');
}
setInterval(() => { if (playing && endAt && ctx.currentTime >= endAt) stop(); }, 30);
function sched() {     // lookahead scheduler: one clock for every machine
  while (gridT < ctx.currentTime + 0.12) {
    if (endAt) return;
    let st = S, cur = null;
    if (step === 0 && pendQ.length) { const q = pendQ; pendQ = []; for (const fn of q) fn(gridT); lastSwitch = { t: gridT, absStep, t0: playT0, bar: barLen(S) }; }
    if (mode !== 'ws') {
      const seq = srcSeq();
      if (step === 0) {
        const lo = src.loop ? src.loop[0] : 0, hi = src.loop ? src.loop[1] : seq.length;
        if (seqPos >= hi || seqPos < lo && src.loop) { if (src.loop || src.kind !== 'song') seqPos = lo; else { endAt = gridT; return; } }
      }
      cur = seq[seqPos]; if (!cur) { endAt = gridT; return; }
      st = segState(cur.brick);
      if (step === 0 && (!curSeg || curSeg.brick !== cur.brick)) { eng.applyState(st, gridT, ms); eng.kkOffAt(gridT); }
      if (step === 0) curSeg = cur;
    }
    const sd = 60 / st.bpm / 4, sw = (i) => stepTime(st, i) - i * sd;     // swing offset of step i
    const t = gridT + sw(step), tn = gridT + sd + sw((step + 1) % 16);
    eng.scheduleStep(st, step, t, tn);
    if (step === 0) eng.kkClock(gridT, st.bpm);
    const clickOn = PR.click || mode === 'trim' || (kr.countIn && absStep < 16);
    if (step % 4 === 0 && clickOn) eng.click(gridT, step === 0, PR.clickVol);
    if (step % 4 === 0 && dancer) dancer.beat({ t: gridT, n: absStep / 4, k: step / 4, spb: 4 * sd, countIn: !!(kr.countIn && absStep < 16) });
    let ls, lsteps = 16 * st.kk.loop.bars;
    if (mode === 'ws') {
      // KHAOTIC KOCK loop: straight-time grid (gestures carry their own feel), anchored to the bar the first layer started on
      const nL = S.kk.loop.layers.length;
      if (kr.state === 'armed' && absStep >= (kr.minAbs || 0) && (absStep - kkAnchor) % (nL ? lsteps : 16) === 0) kkStart(gridT);
      ls = (((absStep - kkAnchor) % lsteps) + lsteps) % lsteps;
      const lg = []; eng.scheduleKK(S, ls, gridT, (i, tt) => tt >= (kkFrom[i] || 0) - 1e-4, lg);
      for (const e of lg) { kkLog.push(e); kkAll.push(e); } if (kkAll.length > 6000) kkAll.splice(0, 1000);
      if (ls === 0) kkTops.push(gridT); if (kkTops.length > 200) kkTops.shift();
    } else {
      ls = (cur.bar * 16 + step) % lsteps; eng.scheduleKK(st, ls, gridT);
    }
    uiQ.push({ step, t, ls, lsteps, songBar: cur ? cur.songBar : -1, clip: cur ? cur.clip : null, countIn: !!(kr.countIn && absStep < 16), wsBar: Math.floor(ls / 16), wsBars: st.kk.loop.bars, seg: cur });
    gridT += sd; step = (step + 1) % 16; absStep++;
    if (step === 0 && mode !== 'ws') seqPos++;
  }
}
function drawPlayhead() {
  if (playing && ctx) {
    let cur = null;
    while (uiQ.length && uiQ[0].t <= ctx.currentTime) cur = uiQ.shift();
    if (cur) {
      $$('.cell.now').forEach((c) => c.classList.remove('now'));
      if (mode === 'ws') $$(`.cell[data-step="${cur.step}"]`).forEach((c) => c.classList.add('now'));
      ['#drumLed', '#bassLed', '#kkLed'].forEach((l) => $(l).classList.toggle('on', cur.step % 4 === 0));
      $('#kkProg').style.width = mode === 'ws' && (S.kk.loop.layers.length || kr.state !== 'idle') ? ((cur.ls + 1) / cur.lsteps) * 100 + '%' : '0';
      const beat = Math.floor(cur.step / 4);
      $$('#beatLeds i').forEach((l, j) => { l.classList.toggle('on', j === beat); l.classList.toggle('one', j === beat && beat === 0); l.classList.toggle('count', cur.countIn); });
      $('#barNum').textContent = cur.countIn ? 'COUNT ' + (4 - beat) : cur.songBar >= 0 ? `BAR ${cur.songBar + 1}` : `BAR ${cur.wsBar + 1}/${cur.wsBars}`;
      if (cur.songBar >= 0 && studio) studio.playhead(cur.songBar + cur.step / 16, cur.clip);
      npSet(cur);
    }
  }
  requestAnimationFrame(drawPlayhead);
}

// ---------------------------------------------------------------- KHAOTIC KOCK
let kkAll = [], kkTops = [], kr = { state: 'idle' }, kkFrom = [], kkAnchor = 0, kkLog = [], live = { down: false, latched: false, id: null, x: 0, y: 0 }, trail = [], ghosts = [];
const KK_MAX_LAYERS = 8;
const kkLat = () => (ctx ? (ctx.baseLatency || 0) + (ctx.outputLatency || 0) : 0);
const loopBeats = () => 4 * S.kk.loop.bars;
function kkStart(t0) {                      // called by the scheduler on the bar / loop top where the layer begins
  const L = S.kk.loop.layers;
  if (L.length >= KK_MAX_LAYERS) { kr = { state: 'idle' }; toast(`Loop is full (${KK_MAX_LAYERS} layers). Undo or clear first.`); kkUI(); return; }
  if (!L.length) kkAnchor = absStep;
  const spb = 60 / S.bpm, layer = { cfg: cfgOf(S.kk), ev: [] };
  L.push(layer); kkFrom[L.length - 1] = t0 + loopBeats() * spb;
  kr = { state: 'rec', t0, end: t0 + loopBeats() * spb, spb, layer, idx: L.length - 1, full: false, ...kkCount() };
  if (live.down || live.latched) layer.ev.push([0, 0, live.x, live.y]);
  kkUI();
}
function kkFinish() {
  let ev = kr.layer.ev; const lb = loopBeats();
  if (live.down || live.latched) ev.push([+(lb - 0.004).toFixed(4), 2, live.x, live.y]);
  ev.sort((a, b) => a[0] - b[0]);
  if (PR.q !== 'off' && ev.length) { ev = B.quantizeEvents(ev, B.QUANT[PR.q], PR.qs, lb); kr.layer.ev = ev; }   // snap the take to the grid
  if (!ev.length) { S.kk.loop.layers.pop(); kkFrom.pop(); toast('Nothing played, layer dropped'); }
  kr = { state: 'idle' }; kkUI(); changed();
}
setInterval(() => { if (kr.state === 'rec' && ctx && ctx.currentTime - kkLat() >= kr.end) kkFinish(); if (kkLog.length > 400) kkLog.splice(0, kkLog.length - 400); }, 20);
function kkRecord(k, x, y) {
  if (kr.state !== 'rec') return;
  const now = ctx.currentTime - kkLat();
  if (now >= kr.end) return;
  const b = Math.max(0, (now - kr.t0) / kr.spb), bar = Math.floor(b / 4), inBar = kr.bars[bar] || 0;
  // caps: keep a little room so a note that is already sounding can still end
  const room = k === 2 ? 0 : 8;
  if (kr.total + room >= Z.LIMITS.kkEvents || inBar + room >= Z.LIMITS.kkBarEvents) {
    if (!kr.full) { kr.full = true; toast(kr.total + room >= Z.LIMITS.kkEvents ? 'Pad loop is full (2000 notes and slides). Undo a layer to record more' : 'That bar is full of slides, so extra ones are skipped. Your notes still play'); }
    const open = kr.layer.ev.length && kr.layer.ev[kr.layer.ev.length - 1][1] !== 2;
    if (!(k === 2 && open && kr.total < Z.LIMITS.kkEvents && inBar < Z.LIMITS.kkBarEvents)) return;
  }
  kr.layer.ev.push([+b.toFixed(4), k, +x.toFixed(4), +y.toFixed(4)]); kr.total++; kr.bars[bar] = inBar + 1;
}
function kkCount() {   // events already in the loop, total and per bar
  const bars = {}; let total = 0;
  for (const l of S.kk.loop.layers) for (const e of l.ev) { total++; const b = Math.floor(e[0] / 4); bars[b] = (bars[b] || 0) + 1; }
  return { total, bars };
}
function kkLive(type, x, y) {
  if (!eng || !eng.kk) return;
  eng.kkEvent(cfgOf(S.kk), 0, type, x, y, 0);
  kkRecord({ on: 0, move: 1, off: 2 }[type], x, y);
}
async function kkRecBtn() {
  await ensureAudio();
  if (kr.state === 'rec') { toast('Recording - this layer stops at the end of the loop'); return; }
  if (kr.state === 'armed') { kr = { state: 'idle' }; kkUI(); return; }
  if (mode !== 'ws') { stop(); }
  const count = PR.countIn && !playing;
  kr = { state: 'armed', minAbs: count ? 16 : 0, countIn: count }; kkUI();
  if (!playing) play();
  toast(count ? 'Count-in: 1 bar of clicks, then record' : S.kk.loop.layers.length ? 'Overdub starts at the top of the loop' : 'Recording starts on the next bar');
}
function kkUndo() {
  const L = S.kk.loop.layers; if (!L.length) return;
  if (kr.state === 'rec') kr = { state: 'idle' };
  const i = L.length - 1; L.pop(); kkFrom.pop(); if (eng) eng.kkRelease([i + 1]); kkUI(); changed(); toast('Removed layer ' + (i + 1));
}
function kkClear() { S.kk.loop.layers = []; kkFrom = []; if (kr.state === 'rec') kr = { state: 'idle' }; if (eng) eng.kkRelease([1, 2, 3, 4, 5, 6, 7, 8]); kkUI(); changed(); }
// workspace length (1/2/4/8 bars). Longer: the loop is repeated to fill. Shorter: use Trim, so nothing is cut by surprise.
function setBars(n) {
  const L = S.kk.loop, old = L.bars; if (n === old) return;
  if (kr.state !== 'idle') return toast('Wait for the recording to finish');
  if (L.layers.length && n < old) { toast('To make it shorter, use Trim (it shows exactly what gets cut)'); return studio.openTrim(); }
  if (L.layers.length && n % old) return toast('Pick a length that is a multiple of ' + old);
  const k = n / old;
  for (const l of L.layers) l.ev = Array.from({ length: k }, (_, r) => l.ev.map((e) => [+(e[0] + r * 4 * old).toFixed(5), e[1], e[2], e[3]])).flat();
  L.bars = n; if (Z.capKK(L.layers)) toast('The longer loop had too many notes and slides, so some slides were thinned');
  kkFrom = L.layers.map(() => 0); kkUI(); changed();
}
function kkSet(k, v) {
  if (k === 'root' || k === 'scale') { S.kk[k] = v; buildKeys(); wsUI(); }
  S.kk[k] = v; if (kr.state === 'rec' && k in kr.layer.cfg) kr.layer.cfg[k] = v;   // while recording, what you hear is what the layer keeps
  if (live.down || live.latched) kkLive('on', live.x, live.y);
  kkUI(); changed();
}
function kkUI() {
  const k = S.kk, pr = presetById(k.preset);
  $('#kkPreset').value = k.preset; $('#kkKey').value = k.root; $('#kkScale').value = k.scale; $('#kkGate').value = k.gate;
  $('#kkOct').textContent = k.octave;
  $$('#kkRange button').forEach((b) => b.classList.toggle('on', +b.dataset.v === k.range));
  $$('#kkBars button').forEach((b) => b.classList.toggle('on', +b.dataset.v === k.loop.bars));
  [['#kkArp', k.arp], ['#kkHold', k.hold]].forEach(([id, on]) => { $(id).classList.toggle('on', !!on); $(id).setAttribute('aria-pressed', !!on); });
  $('#kkYLbl').textContent = 'Y: ' + pr.y;
  const rb = $('#kkRec'); rb.classList.toggle('armed', kr.state === 'armed'); rb.classList.toggle('on', kr.state === 'rec');
  $('#kkLayers').textContent = k.loop.layers.length + ' lyr';
  ['#kkKey', '#kkScale', '#kkOctDn', '#kkOctUp'].forEach((id) => ($(id).disabled = !!pr.drums));
  $$('#kkRange button').forEach((b) => (b.disabled = !!pr.drums || pr.id === 'drums'));
  if (echoK) echoK.refresh();
}
let echoK = null;
function buildKK() {
  $("#kkPreset").innerHTML = KK_PRESETS.map((p) => `<option value="${p.id}" title="${p.info}">${p.name}</option>`).join("");
  $('#kkKey').innerHTML = KEYS.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  $('#kkScale').innerHTML = Object.keys(KK_SCALES).map((n) => `<option value="${n}">${n}</option>`).join('');
  $('#kkGate').innerHTML = KK_GATES.map(([n, v]) => `<option value="${v}">${n}</option>`).join('');
  $('#kkPreset').onchange = (e) => kkSet('preset', e.target.value);
  $('#kkKey').onchange = (e) => kkSet('root', +e.target.value);
  $('#kkScale').onchange = (e) => kkSet('scale', e.target.value);
  $('#kkGate').onchange = (e) => kkSet('gate', +e.target.value);
  $$('#kkRange button').forEach((b) => (b.onclick = () => kkSet('range', +b.dataset.v)));
  $('#kkOctDn').onclick = () => kkSet('octave', Math.max(1, S.kk.octave - 1)); $('#kkOctUp').onclick = () => kkSet('octave', Math.min(6, S.kk.octave + 1));
  $('#kkArp').onclick = () => { if (!S.kk.gate && !S.kk.arp) { S.kk.gate = 4; toast('Arp needs a gate: set to 1/16'); } kkSet('arp', !S.kk.arp); };
  $('#kkHold').onclick = () => { const h = !S.kk.hold; if (!h && live.latched && !live.down) { live.latched = false; kkLive('off', live.x, live.y); } kkSet('hold', h); };
  $$('#kkBars button').forEach((b) => (b.onclick = () => setBars(+b.dataset.v)));
  $('#kkRec').onclick = kkRecBtn; $('#kkUndo').onclick = kkUndo; $('#kkClear').onclick = kkClear;
  echoK = knob('Echo', LVL, () => S.kk.echo, (x) => (S.kk.echo = x), 'yolk'); $('#kkEcho').replaceChildren(echoK);
  const pad = $('#kkPad');
  const pos = (e) => { const r = pad.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height))]; };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (live.id !== null && live.down) return;                         // one finger plays; extra touches are ignored
    try { pad.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ } live.id = e.pointerId; live.down = true; live.latched = false;
    [live.x, live.y] = pos(e); trail.push({ x: live.x, y: live.y, t: performance.now() });
    const go = () => { if (live.down || live.latched) kkLive('on', live.x, live.y); };
    if (eng && eng.kk && ctx.state === 'running') go(); else ensureAudio().then(go);
    if (ctx && ctx.state !== 'running') ctx.resume();
  });
  pad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== live.id || !live.down) return; e.stopPropagation();
    [live.x, live.y] = pos(e); trail.push({ x: live.x, y: live.y, t: performance.now() }); kkLive('move', live.x, live.y);
  });
  const up = (e) => {
    if (e.pointerId !== live.id) return; e.stopPropagation();
    live.down = false; live.id = null;
    if (S.kk.hold && e.type === 'pointerup') live.latched = true; else kkLive('off', live.x, live.y);
  };
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
  pad.addEventListener('lostpointercapture', (e) => { if (e.pointerId === live.id && live.down) up({ ...e, type: 'pointerup', pointerId: e.pointerId, stopPropagation() {} }); });
  requestAnimationFrame(drawPad);
}
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
function noteLabel(m) { m = Math.round(m); return FLATS[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1); }
function drawPad(now) {
  requestAnimationFrame(drawPad);
  const pad = $('#kkPad'); if (scr !== 2) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(pad.clientWidth * dpr), h = Math.round(pad.clientHeight * dpr);
  if (!w || !h) return;
  if (pad.width !== w || pad.height !== h) { pad.width = w; pad.height = h; }
  const g = pad.getContext('2d'), k = S.kk, pr = presetById(k.preset);
  const bg = g.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h / 2, w * 0.75); bg.addColorStop(0, '#16204a'); bg.addColorStop(1, '#05081a');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // columns: one per note (or per drum), roots highlighted
  const notes = pr.drums ? DRUM_ORDER : pr.free ? null : padNotes(k);
  g.font = `${Math.round(10 * dpr)}px system-ui, sans-serif`; g.textAlign = 'center';
  if (notes) {
    const n = notes.length, cw = w / n;
    for (let i = 0; i < n; i++) {
      const root = !pr.drums && ((notes[i] - k.root) % 12 + 12) % 12 === 0;
      if (root) { g.fillStyle = '#f6c43114'; g.fillRect(i * cw, 0, cw, h); }
      g.strokeStyle = root ? '#f6c43155' : '#ffffff12'; g.lineWidth = dpr; g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, h); g.stroke();
      if (cw > 14 * dpr || root) { g.fillStyle = root ? '#f6c431cc' : '#cfc8b466'; g.fillText(pr.drums ? notes[i].toUpperCase() : noteLabel(notes[i]).replace(/-?\d+$/, (o) => (root ? o : '')), (i + 0.5) * cw, h - 8 * dpr); }
    }
  } else { for (let i = 1; i < 4 * k.range; i++) { g.strokeStyle = i % 4 ? '#ffffff0c' : '#f6c43140'; g.beginPath(); g.moveTo((i / (4 * k.range)) * w, 0); g.lineTo((i / (4 * k.range)) * w, h); g.stroke(); } }
  for (let j = 1; j < 4; j++) { g.strokeStyle = '#ffffff0d'; g.beginPath(); g.moveTo(0, (j * h) / 4); g.lineTo(w, (j * h) / 4); g.stroke(); }
  // loop playback ghosts
  if (ctx) {
    const at = ctx.currentTime - kkLat();
    while (kkLog.length && kkLog[0].t <= at + kkLat()) { const e = kkLog.shift(); const L = S.kk.loop.layers[e.layer]; const ev = L && L.ev.find((x) => x[0] === e.b); if (ev && ev[1] !== 2) ghosts.push({ x: ev[2], y: ev[3], t: now, layer: e.layer }); }
  }
  ghosts = ghosts.filter((q) => now - q.t < 500);
  for (const q of ghosts) { const a = 1 - (now - q.t) / 500; g.fillStyle = `rgba(47,158,68,${0.5 * a})`; g.beginPath(); g.arc(q.x * w, (1 - q.y) * h, 7 * dpr, 0, 7); g.fill(); }
  // glowing yolk trail + cursor
  trail = trail.filter((p) => now - p.t < 700);
  g.save(); g.shadowColor = '#f6c431'; g.shadowBlur = 18 * dpr; g.lineCap = 'round';
  for (let i = 1; i < trail.length; i++) {
    const a = 1 - (now - trail[i].t) / 700; g.strokeStyle = `rgba(246,196,49,${a})`; g.lineWidth = (4 + 10 * a) * dpr;
    g.beginPath(); g.moveTo(trail[i - 1].x * w, (1 - trail[i - 1].y) * h); g.lineTo(trail[i].x * w, (1 - trail[i].y) * h); g.stroke();
  }
  if (live.down || live.latched) {
    const cx = live.x * w, cy = (1 - live.y) * h, r = 16 * dpr * (1 + 0.08 * Math.sin(now / 90));
    const yg = g.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2); yg.addColorStop(0, '#fff6d0'); yg.addColorStop(0.35, '#f6c431'); yg.addColorStop(1, 'rgba(246,196,49,0)');
    g.fillStyle = yg; g.beginPath(); g.arc(cx, cy, r * 2.2, 0, 7); g.fill();
    g.shadowBlur = 0; g.strokeStyle = '#f4efe1'; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(cx, cy, r * 1.25, 0, 7); g.stroke();
    if (live.latched) { g.fillStyle = '#f4efe1'; g.fillText('HOLD', cx, cy - r * 1.7); }
  }
  g.restore();
  const info = $('#kkNote');
  if (live.down || live.latched) info.textContent = pr.drums ? DRUM_ORDER[Math.min(DRUM_ORDER.length - 1, Math.floor(live.x * DRUM_ORDER.length))].toUpperCase() : noteLabel(mapX(k, live.x).m);
  else info.textContent = pr.name;
}

// ---------------------------------------------------------------- recorder
let rec = { on: false, L: [], R: [], t0: 0 }, take = null;
function hookRec() {
  eng.tap.port.onmessage = (e) => { if (e.data.L && rec.on) { rec.L.push(e.data.L); rec.R.push(e.data.R); } };
}
const join = (arr) => { const n = arr.reduce((a, b) => a + b.length, 0), o = new Float32Array(n); let p = 0; for (const a of arr) { o.set(a, p); p += a.length; } return o; };
async function toggleRec(auto = false) {
  await ensureAudio();
  if (!rec.on) {
    rec = { on: true, L: [], R: [], t0: ctx.currentTime }; eng.tap.port.postMessage('start');
    $('#rec').classList.add('on'); if (!playing) play(); toast('Recording master out');
  } else {
    rec.on = false; eng.tap.port.postMessage('stop');
    await new Promise((r) => setTimeout(r, 60));
    take = { L: join(rec.L), R: join(rec.R), sr: ctx.sampleRate };
    const cap = Math.floor(EXPORT.max * take.sr); if (take.L.length > cap) take = { ...take, L: take.L.slice(0, cap), R: take.R.slice(0, cap) };
    $('#rec').classList.remove('on');
    const secs = take.L.length / take.sr;
    $('#takeInfo').textContent = `(${secs.toFixed(1)} s)`; $('#takeMp3').disabled = $('#takeWav').disabled = secs < 0.05;
    if (auto) { const m = EXPORT.max / 60, len = m >= 1 ? `${+m.toFixed(1)} minute${m === 1 ? '' : 's'}` : `${EXPORT.max} seconds`;
      toast(`Recording stopped at ${len}, the longest take the box keeps. Export it from the Export menu.`); }
    else toast(`Take captured: ${secs.toFixed(1)} s. Export it from the Export menu.`);
  }
}
setInterval(() => { if (rec.on && ctx) { if (ctx.currentTime - rec.t0 >= EXPORT.max && !rec.capped) { rec.capped = true; toggleRec(true); return; } const s = Math.floor(ctx.currentTime - rec.t0); $('#recTime').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; } }, 250);
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const slug = () => S.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pattern';
async function exportTake(fmt) {
  if (!take) return;
  toast(fmt === 'mp3' ? 'Encoding MP3...' : 'Writing WAV...');
  const b = fmt === 'mp3' ? await mp3Blob(take.L, take.R, take.sr) : wavBlob(take.L, take.R, take.sr);
  window.YB.lastBlob = b; download(b, `yolkbox-take-${stamp()}.${fmt}`);
}
async function exportBars(fmt, bars = 4) {
  toast(`Rendering ${bars} bars...`);
  const r = await renderOffline(S, bars);
  const b = fmt === 'mp3' ? await mp3Blob(r.L, r.R, r.sr) : wavBlob(r.L, r.R, r.sr);
  window.YB.lastBlob = b; download(b, `yolkbox-${slug()}-${bars}bars.${fmt}`);
}

// ---------------------------------------------------------------- knobs
const toNorm = (r, v) => (r[3] === 'exp' ? Math.log(v / r[0]) / Math.log(r[1] / r[0]) : (v - r[0]) / (r[1] - r[0]));
const fromNorm = (r, n) => (r[3] === 'exp' ? r[0] * Math.pow(r[1] / r[0], n) : r[0] + (r[1] - r[0]) * n);
function fmt(r, v) {
  if (r[4] === 'Hz') return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v) + '';
  if (r[4] === 's') return v < 1 ? Math.round(v * 1000) + 'ms' : v.toFixed(2) + 's';
  if (r[4] === 'x') return v.toFixed(2);
  if (r[4] === 'oct') return v.toFixed(1);
  if (r[4] === 'bpm') return Math.round(v);
  return Math.round(v * (r[1] <= 1 ? 100 : 10)) / (r[1] <= 1 ? 1 : 10) + '';
}
function knob(label, range, get, set, cls = '') {
  const el = document.createElement('div'); el.className = 'knob ' + cls;
  el.innerHTML = `<div class="dial" tabindex="0" role="slider" aria-label="${label}"><div class="cap"><i></i></div></div><div class="kval"></div><div class="klbl">${label}</div>`;
  const dial = $('.dial', el), cap = $('.cap', el), val = $('.kval', el);
  const draw = () => { const n = Math.max(0, Math.min(1, toNorm(range, get()))); cap.style.transform = `rotate(${-135 + 270 * n}deg)`; val.textContent = fmt(range, get()); dial.setAttribute('aria-valuenow', get()); };
  const setN = (n) => { set(fromNorm(range, Math.max(0, Math.min(1, n)))); draw(); changed(); };
  let sy = 0, sn = 0, last = 0;
  dial.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); dial.setPointerCapture(e.pointerId); sy = e.clientY; sn = toNorm(range, get()); el.classList.add('drag');
    const now = Date.now(); if (now - last < 300) { setN(toNorm(range, range[2])); } last = now; });
  dial.addEventListener('pointermove', (e) => { if (!dial.hasPointerCapture(e.pointerId)) return; e.stopPropagation(); setN(sn + (sy - e.clientY) / (e.shiftKey ? 600 : 160)); });
  dial.addEventListener('pointerup', () => el.classList.remove('drag'));
  dial.addEventListener('wheel', (e) => { e.preventDefault(); setN(toNorm(range, get()) - Math.sign(e.deltaY) * 0.03); }, { passive: false });
  dial.addEventListener('keydown', (e) => { const d = { ArrowUp: 0.02, ArrowRight: 0.02, ArrowDown: -0.02, ArrowLeft: -0.02 }[e.key]; if (d) { e.preventDefault(); setN(toNorm(range, get()) + d); } });
  el.refresh = draw; draw(); return el;
}
const LVL = [0, 1, 0.5, 'lin', ''];
const KLABEL = { tune: 'Tune', decay: 'Decay', tone: 'Tone', snappy: 'Snappy' };

// ---------------------------------------------------------------- drums UI
function buildDrumKnobs() {
  const box = $('#drumKnobs'); box.innerHTML = '';
  const v = VOICES.find((x) => x.id === selVoice);
  const tag = document.createElement('div'); tag.className = 'voicetag'; tag.innerHTML = `<b>${v.short}</b><span>${v.name}</span>`; box.appendChild(tag);
  box.appendChild(knob('Level', LVL, () => S.drums.levels[v.id], (x) => (S.drums.levels[v.id] = x)));
  for (const [k, r] of Object.entries(DRUM_KNOBS[v.id] || {})) box.appendChild(knob(KLABEL[k], r, () => S.drums.params[v.id][k], (x) => (S.drums.params[v.id][k] = x)));
  const sp = document.createElement('div'); sp.className = 'spacer'; box.appendChild(sp);
  box.appendChild(knob('Accent', LVL, () => S.drums.accent, (x) => (S.drums.accent = x), 'yolk'));
}
function cellBtn(on, stepI, cls) { const b = document.createElement('button'); b.className = `cell ${cls} ${on ? 'on' : ''} ${stepI % 4 === 0 ? 'beat' : ''}`; b.dataset.step = stepI; b.setAttribute('aria-pressed', !!on); return b; }
// full names for the short row labels (desktop hover title and screen readers)
const FULL = { ac: 'Accent', bd: 'Bass Drum', sd: 'Snare Drum', cp: 'Clap', ch: 'Closed Hi-hat', oh: 'Open Hi-hat', lt: 'Low Tom', mt: 'Mid Tom', ht: 'High Tom', rs: 'Rimshot', cb: 'Cowbell', cy: 'Cymbal' };
function buildDrumGrid() {
  const g = $('#drumGrid'); g.innerHTML = '';
  const rows = [{ id: 'ac', short: 'AC', name: 'Accent' }, ...VOICES];
  for (const v of rows) {
    const r = document.createElement('div'); r.className = 'row' + (v.id === 'ac' ? ' acc' : '') + (v.id === selVoice ? ' sel' : '');
    const lb = document.createElement('button'); lb.className = 'rlabel'; lb.textContent = v.short; const full = FULL[v.id] || v.name; lb.title = full; lb.setAttribute('aria-label', full);
    lb.onclick = () => { if (v.id === 'ac') return; selVoice = v.id; buildDrumKnobs(); buildDrumGrid(); if (S.drums.steps[v.id]) audition(v.id); };
    r.appendChild(lb);
    for (let i = 0; i < 16; i++) {
      const c = cellBtn(S.drums.steps[v.id][i], i, v.id === 'ac' ? 'accell' : '');
      c.setAttribute('aria-label', `${v.name} step ${i + 1}`);
      c.onclick = () => { S.drums.steps[v.id][i] ^= 1; c.classList.toggle('on'); c.setAttribute('aria-pressed', !!S.drums.steps[v.id][i]); changed(); };
      r.appendChild(c);
    }
    g.appendChild(r);
  }
}
async function audition(id) { await ensureAudio(); if (!playing) eng.hit(id, ctx.currentTime + 0.01, 1); }

// ---------------------------------------------------------------- bass UI
const BLABEL = { cutoff: 'Cutoff', reso: 'Reso', envmod: 'Env Mod', decay: 'Decay', accent: 'Accent', drive: 'Drive' };
function buildBassKnobs() {
  const box = $('#bassKnobs'); box.innerHTML = '';
  const w = document.createElement('div'); w.className = 'wave';
  w.innerHTML = `<div class="klbl">Wave</div><button class="btn sm" data-w="saw" title="Sawtooth wave" aria-label="Sawtooth wave">SAW</button><button class="btn sm" data-w="square" title="Square wave" aria-label="Square wave">SQR</button>`;
  const drawW = () => $$('button', w).forEach((b) => b.classList.toggle('on', b.dataset.w === S.bass.params.wave));
  $$('button', w).forEach((b) => (b.onclick = () => { S.bass.params.wave = b.dataset.w; drawW(); changed(); })); drawW();
  box.appendChild(w);
  for (const [k, r] of Object.entries(BASS_KNOBS)) box.appendChild(knob(BLABEL[k], r, () => S.bass.params[k], (x) => (S.bass.params[k] = x), k === 'cutoff' || k === 'reso' ? 'big' : ''));
}
function noteName(s) { return s.on ? NOTES[s.n] + (s.up ? '\u2191' : s.dn ? '\u2193' : '') : '\u2014'; }
function buildBassGrid() {
  const g = $('#bassGrid'); g.innerHTML = '';
  const rows = [['note', 'Note', 'Note'], ['dn', 'Dn', 'Octave down'], ['up', 'Up', 'Octave up'], ['acc', 'Acc', 'Accent'], ['sl', 'Slide', 'Slide']];
  for (const [k, name, full] of rows) {
    const r = document.createElement('div'); r.className = 'row b-' + k;
    const lb = document.createElement('div'); lb.className = 'rlabel'; lb.textContent = name; r.appendChild(lb);
    if (full !== name) lb.title = full;
    for (let i = 0; i < 16; i++) {
      const s = S.bass.steps[i];
      const c = cellBtn(k === 'note' ? s.on : s[k], i, k === 'note' ? 'notecell' : 'flag');
      if (k === 'note') { c.textContent = noteName(s); c.classList.toggle('sel', i === selStep); c.setAttribute('aria-label', `Bass step ${i + 1} note ${noteName(s)}`); }
      else c.setAttribute('aria-label', `Bass step ${i + 1} ${name}`);
      c.onclick = () => {
        if (k === 'note') { if (selStep === i) s.on = !s.on; selStep = i; }
        else { s[k] = !s[k]; if (k === 'up' && s.up) s.dn = false; if (k === 'dn' && s.dn) s.up = false; }
        buildBassGrid(); changed();
      };
      r.appendChild(c);
    }
    g.appendChild(r);
  }
}
function buildKeys() {
  const k = $('#keys'); k.innerHTML = '';
  NOTES.forEach((n, i) => {
    const ok = inKey(i); if (PR.inKey && !ok) return;      // song key lock: only notes that fit the song key
    const b = document.createElement('button'); b.className = 'key ' + (n.includes('#') ? 'black' : 'white') + (ok ? ' inkey' : ' outkey'); b.textContent = n; b.title = ok ? 'In the song key' : 'Outside the song key'; b.setAttribute('aria-label', 'Note ' + n + (i === 12 ? ' high' : ''));
    b.onclick = () => { const s = S.bass.steps[selStep]; s.n = i; s.on = true; buildBassGrid(); changed(); previewNote(selStep); selStep = (selStep + 1) % 16; buildBassGrid(); };
    k.appendChild(b);
  });
  const rest = document.createElement('button'); rest.className = 'key rest'; rest.textContent = 'Rest';
  rest.onclick = () => { S.bass.steps[selStep].on = false; selStep = (selStep + 1) % 16; buildBassGrid(); changed(); };
  k.appendChild(rest);
}
async function previewNote(i) {
  await ensureAudio(); if (playing) return;
  const t = ctx.currentTime + 0.02, tmp = clone(S); tmp.bass.steps[0] = { ...S.bass.steps[i], sl: false };
  eng.scheduleStep({ ...tmp, drums: { ...tmp.drums, steps: Object.fromEntries(Object.keys(tmp.drums.steps).map((k) => [k, Array(16).fill(0)])) } }, 0, t, t + 0.25);
}

// ---------------------------------------------------------------- mixer UI
function buildMixer() {
  const box = $('#mixKnobs'); box.innerHTML = '';
  box.appendChild(knob('Drums', LVL, () => S.mix.drums, (x) => (S.mix.drums = x), 'big'));
  box.appendChild(knob('Bass', LVL, () => S.mix.bass, (x) => (S.mix.bass = x), 'big'));
  box.appendChild(knob('Kock', LVL, () => S.mix.kk, (x) => (S.mix.kk = x), 'big'));
  box.appendChild(knob('Master', LVL, () => S.mix.master, (x) => (S.mix.master = x), 'big yolk'));
  const vl = $('#voiceLevels'); vl.innerHTML = '';
  for (const v of VOICES) {
    const w = document.createElement('div'); w.className = 'vl';
    const kn = knob(v.short, LVL, () => S.drums.levels[v.id], (x) => (S.drums.levels[v.id] = x), 'small');
    const m = document.createElement('button'); m.className = 'btn sm mute' + (S.drums.mute[v.id] ? ' on' : ''); m.textContent = 'M'; m.setAttribute('aria-label', 'Mute ' + v.name);
    m.onclick = () => { S.drums.mute[v.id] = !S.drums.mute[v.id]; m.classList.toggle('on'); changed(); };
    w.append(kn, m); vl.appendChild(w);
  }
}
// ---------------------------------------------------------------- header egg meter (phones)
// One small analyser after the limiter. The metronome click goes straight to the speakers (engine.click), so it never
// reaches this point, the same as recordings. Runs on requestAnimationFrame only while playing, on a phone layout and
// with the tab visible; nothing is allocated per frame and the eggs are only touched when the lit count changes.
const HM_TH = [-40, -32, -24, -18, -12, -7, -3, -0.3].map((d) => Math.pow(10, d / 20));   // egg n lights at this peak
const hm = { an: null, buf: null, eggs: null, lvl: 0, pk: 0, n: 0, hold: 0, holdT: 0, last: 0, raf: 0, frames: 0, mq: matchMedia('(min-width: 360px) and (max-width: 600px)') };
function hmInit() {
  hm.an = ctx.createAnalyser(); hm.an.fftSize = 256; hm.an.smoothingTimeConstant = 0; hm.buf = new Float32Array(hm.an.fftSize);
  eng.limiter.connect(hm.an); hm.eggs = $$('#hMeter i');
  document.addEventListener('visibilitychange', () => (document.hidden ? hmPause() : hmStart()));
  hm.mq.addEventListener('change', () => (hm.mq.matches ? hmStart() : hmRest()));
  if (playing) hmStart();
}
function hmStart() { if (hm.an && playing && !document.hidden && hm.mq.matches && !hm.raf) { hm.last = 0; hm.raf = requestAnimationFrame(hmFrame); } }
function hmPause() { if (hm.raf) cancelAnimationFrame(hm.raf); hm.raf = 0; }
function hmPaint(n, hold) {
  if (n === hm.n && hold === hm.hold) return;
  hm.n = n; hm.hold = hold;
  for (let i = 0; i < hm.eggs.length; i++) hm.eggs[i].classList.toggle('on', i < n || i === hold - 1);
}
function hmRest() { hmPause(); hm.lvl = 0; hm.pk = 0; hm.holdT = 0; if (hm.eggs) hmPaint(0, 0); }
function hmFrame(now) {
  hm.raf = 0;
  if (!playing || document.hidden || !hm.mq.matches) { if (!playing) hmRest(); return; }
  const b = hm.buf; hm.an.getFloatTimeDomainData(b);
  let pk = 0; for (let i = 0; i < b.length; i++) { const v = b[i] < 0 ? -b[i] : b[i]; if (v > pk) pk = v; }
  const dt = hm.last ? Math.min(0.1, (now - hm.last) / 1000) : 0; hm.last = now; hm.frames++;
  hm.pk = pk; hm.lvl = Math.max(pk, hm.lvl * Math.pow(10, -1.2 * dt));                  // instant attack, falls 24 dB a second
  let n = 0; while (n < HM_TH.length && hm.lvl >= HM_TH[n]) n++;
  let hold = hm.hold;
  if (n >= hold || now > hm.holdT) { hold = n; hm.holdT = now + 700; }                    // peak egg holds for 0.7 s
  hmPaint(n, hold);
  hm.raf = requestAnimationFrame(hmFrame);
}
// ---------------------------------------------------------------- now playing line (phones): set from the audio-clocked uiQ, like the dancer
const np = { nm: null, b: -1, n: -1, c: false };
function npSet(cur) {
  const el = $('#nowPlay');
  if (!cur) { np.nm = null; np.b = np.n = -1; if (el.textContent !== 'Stopped') el.textContent = 'Stopped'; return; }
  const seg = cur.seg, nm = cur.countIn ? 'Count in' : seg ? (seg.brick.name || 'Brick') : 'Workspace';
  const bb = seg ? seg.bar + 1 : cur.wsBar + 1, bn = seg ? seg.brick.bars : cur.wsBars;
  if (nm === np.nm && bb === np.b && bn === np.n) return;
  np.nm = nm; np.b = bb; np.n = bn;
  el.textContent = cur.countIn ? nm : `${nm}\u00a0· bar\u00a0${bb}/${bn}`;   // wraps as name · / bar n/N
}
function startMeter() {
  const sp = ctx.createChannelSplitter(2), aL = ctx.createAnalyser(), aR = ctx.createAnalyser(); aL.fftSize = aR.fftSize = 512;
  eng.limiter.connect(sp); sp.connect(aL, 0); sp.connect(aR, 1);
  const b = new Float32Array(512);
  const peak = (a) => { a.getFloatTimeDomainData(b); let m = 0; for (const v of b) m = Math.max(m, Math.abs(v)); return m; };
  const loop = () => { $('#meterL').style.width = Math.min(100, peak(aL) * 100) + '%'; $('#meterR').style.width = Math.min(100, peak(aR) * 100) + '%'; requestAnimationFrame(loop); };
  loop();
}

// ---------------------------------------------------------------- transport, timing help
let swingK;
function drawTransport() { $('#bpmVal').textContent = Math.round(S.bpm); swingK && swingK.refresh(); $('#clickBtn').classList.toggle('on', PR.click); dancer && dancer.refresh(); $('#qLbl').textContent = PR.q === 'off' ? 'Q off' : 'Q ' + PR.q; }
function setBpm(v) { S.bpm = Math.max(60, Math.min(300, Math.round(v))); segCache.clear(); drawTransport(); changed(); }
const taps = [];
function tapTempo() {
  const now = performance.now(); if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
  taps.push(now); if (taps.length > 5) taps.shift();
  if (taps.length >= 2) { const d = (taps[taps.length - 1] - taps[0]) / (taps.length - 1); setBpm(60000 / d); toast('Tempo ' + Math.round(S.bpm) + ' BPM'); }
  else toast('Keep tapping on the beat');
}
function buildTiming() {
  const d = $('#timingDlg');
  $('#tQ').innerHTML = Object.keys(B.QUANT).map((k) => `<option value="${k}">${k === 'off' ? 'Off (as played)' : k}</option>`).join('');
  const ui = () => { $('#tQ').value = PR.q; $('#tQs').value = Math.round(PR.qs * 100); $('#tQsV').textContent = Math.round(PR.qs * 100) + '%'; $('#tCount').checked = PR.countIn; $('#tClick').checked = PR.click; $('#tVol').value = Math.round(PR.clickVol * 100); drawTransport(); };
  $('#tQ').onchange = (e) => { PR.q = e.target.value; savePrefs(); ui(); };
  $('#tQs').oninput = (e) => { PR.qs = +e.target.value / 100; savePrefs(); ui(); };
  $('#tCount').onchange = (e) => { PR.countIn = e.target.checked; savePrefs(); };
  $('#tClick').onchange = (e) => { PR.click = e.target.checked; savePrefs(); ui(); };
  $('#tVol').oninput = (e) => { PR.clickVol = +e.target.value / 100; savePrefs(); };
  $('#timingBtn').onclick = () => { ui(); d.showModal(); }; $('#tClose').onclick = () => d.close();
  $('#clickBtn').onclick = () => { PR.click = !PR.click; savePrefs(); ui(); toast(PR.click ? 'Click on' : 'Click off'); };
  ui();
}

// ---------------------------------------------------------------- workspace bar, song key, mute/solo, surprise, load-from-brick
function wsUI() {
  const br = S.origin && lib.find((b) => b.id === S.origin);
  const edited = br && JSON.stringify({ ...S, origin: undefined, name: undefined, bpm: 0 }) !== JSON.stringify({ ...br.state, name: undefined, bpm: 0 });
  $('#wsFrom').textContent = br ? `from "${br.name}"${edited ? ' (edited copy)' : ' (copy)'}` : 'not saved yet';
  $('#wsLen').textContent = S.kk.loop.bars + (S.kk.loop.bars > 1 ? ' bars' : ' bar');
  $('#songKey').value = S.kk.root; $('#songScale').value = S.kk.scale;
  $('#inKeyBtn').classList.toggle('on', PR.inKey);
  for (const m of ['drums', 'bass', 'kk']) {
    const sel = $(`.fromBrick[data-m="${m}"]`); if (!sel) continue;
    sel.innerHTML = `<option value="">Load from brick&hellip;</option>` + lib.map((b) => `<option value="${esc(b.id)}">${esc(b.name)} (${esc(b.bars)} bar${b.bars > 1 ? 's' : ''})</option>`).join('');
  }
}
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function msUI() {
  for (const m of ['drums', 'bass', 'kk']) $$(`[data-ms^="${m}:"]`).forEach((b) => { const k = b.dataset.ms.split(':')[1]; b.classList.toggle('on', ms[m][k]); b.setAttribute('aria-pressed', ms[m][k]); });
}
function setMS(m, k) { ms[m][k] = !ms[m][k]; msUI(); if (eng) { if (mode === 'ws') eng.applyState(S, 0, ms); else if (curSeg) eng.applyState(segState(curSeg.brick), 0, ms); } }
function surprise(m) {
  const r = B.rng(Date.now());
  if (m === 'drums') { S.drums.steps = B.surpriseDrums(r); buildDrumGrid(); toast('New drum groove. Undo if you liked the old one'); }
  if (m === 'bass') { S.bass.steps = B.surpriseBass(r, S.kk.root, S.kk.scale); buildBassGrid(); toast('New bass line in ' + KEYS[S.kk.root] + ' ' + S.kk.scale); }
  if (m === 'kk') {
    if (kr.state !== 'idle') return toast('Wait for the recording to finish');
    S.kk.loop.layers = [B.surpriseKK(r, S.kk, S.kk.loop.bars)]; kkFrom = [0]; kkAnchor = absStep - (absStep % 16); if (eng) eng.kkRelease([1, 2, 3, 4, 5, 6, 7, 8]); kkUI();
    toast('New pad melody in ' + KEYS[S.kk.root] + ' ' + S.kk.scale);
  }
  changed(); commit();
}
const inKey = (n) => (KK_SCALES[S.kk.scale] || KK_SCALES.minor).includes((((n - S.kk.root) % 12) + 12) % 12);

// ---------------------------------------------------------------- bricks + songs (the studio UI calls these)
function saveBrick(name, color, replace = false) {
  const old = replace && S.origin && lib.find((b) => b.id === S.origin); let br;
  if (old) { br = B.replaceBrick(old, S); lib = lib.map((b) => (b.id === old.id ? br : b)); }
  else { br = B.makeBrick(S, name, color); lib = [...lib, br]; }
  S.origin = br.id; S.name = br.name; segCache.clear(); saveAll(); commit(); wsUI(); studio.refresh();
  return br;
}
function openBrick(id) { const br = lib.find((b) => b.id === id); if (!br) return; const bpm = S.bpm; loadState({ ...clone(br.state), bpm }, id); toast(`"${br.name}" copied into the workspace. The brick itself stays locked.`); }
function dupBrick(id) { const br = lib.find((b) => b.id === id); const n = B.makeBrick(br.state, br.name + ' copy', br.color); lib = [...lib, n]; saveAll(); commit(); studio.refresh(); return n; }
function renameBrick(id, name) { lib = lib.map((b) => (b.id === id ? B.deepFreeze({ ...b, name, state: { ...b.state, name } }) : b)); saveAll(); commit(); studio.refresh(); wsUI(); }
function deleteBrick(id) {
  const others = Object.values(projects).filter((p) => p.id !== P.id && p.clips.some((c) => c.brick === id)).map((p) => p.name);
  if (others.length) return toast('Used in other songs: ' + others.join(', '));
  P.clips = P.clips.filter((c) => c.brick !== id); lib = lib.filter((b) => b.id !== id); saveAll(); commit(); studio.refresh(); wsUI();
}
const usedIn = (id) => Object.values(projects).filter((p) => p.clips.some((c) => c.brick === id)).map((p) => p.name);
function setClips(clips) { P.clips = clips; saveAll(); commit(); studio.refresh(); }
const songSegs = (clips = P.clips) => B.songSeq(clips, lib).reduce((a, x) => { if (x.bar === 0) a.push({ st: segState(x.brick), bars: x.brick.bars }); return a; }, []);
// Song export is capped at 20 minutes (a longer render can run a phone out of memory).
const EXPORT = { max: 20 * 60 };
const segsLen = (segs) => segs.reduce((a, g) => a + g.bars * barLen(g.st), 0);
function capSegs(segs, max = EXPORT.max) {   // keep whole bars from the start until the limit
  const out = []; let t = 0;
  for (const g of segs) {
    const bl = barLen(g.st), fit = Math.min(g.bars, Math.floor((max - t + 1e-6) / bl));
    if (fit <= 0) break;
    out.push(fit === g.bars ? g : { ...g, bars: fit }); t += fit * bl;
    if (fit < g.bars) break;
  }
  return out;
}
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
function askLong(len) {
  return new Promise((res) => {
    const d = $('#longDlg'), lim = Math.round(EXPORT.max / 60);
    $('#lgText').textContent = `This song is ${mmss(len)} long. Exports stop at ${lim} minutes so your device does not run out of memory.`;
    $('#lgOk').textContent = `Export the first ${lim} minutes`;
    const done = (v) => { d.onclose = null; d.close(); res(v); };
    $('#lgOk').onclick = () => done(true); $('#lgCancel').onclick = () => done(false); d.onclose = () => res(false);
    d.showModal();
  });
}
async function exportSong(fmt) {
  if (!P.clips.length) return toast('Add some bricks to the song first');
  let segs = songSegs(); const len = segsLen(segs);
  if (len > EXPORT.max + 1e-6) { if (!(await askLong(len))) return toast('Export cancelled'); segs = capSegs(segs); }
  toast('Rendering the song...');
  const r = await renderSong(segs);
  const b = fmt === 'mp3' ? await mp3Blob(r.L, r.R, r.sr) : wavBlob(r.L, r.R, r.sr);
  window.YB.lastBlob = b; window.YB.lastRender = { len: r.L.length / r.sr, total: r.total, capped: len > EXPORT.max + 1e-6 };
  download(b, `yolkbox-${P.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${fmt}`);
}
// projects (songs) and JSON import / export
function switchProject(id) {
  if (playing) stop(); saveAll(); P = projects[id]; S = merge(P.ws); H.past = []; H.future = []; H.cur = null; commit();
  kkFrom = S.kk.loop.layers.map(() => 0); refreshAll(); studio.refresh(); saveAll(); buildProjects();
}
function newProject(name) { const id = B.uid('p'); projects[id] = { id, name, clips: [], ws: B.starterGroove({ ...defaults(), bpm: S.bpm, kk: { ...defaults().kk, root: S.kk.root, scale: S.kk.scale } }) }; switchProject(id); }
function buildProjects() { $('#projSel').innerHTML = Object.values(projects).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('') + '<option value="__new">+ New song&hellip;</option>'; $('#projSel').value = P.id; }
function jsonDl(obj, name) { const b = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }); window.YB.lastBlob = b; download(b, name); }
const exportProject = () => jsonDl({ type: 'yolkbox-project', version: 1, project: { ...P, ws: S }, bricks: lib.filter((b) => P.clips.some((c) => c.brick === b.id) || b.id === S.origin) }, `yolkbox-song-${P.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`);
const exportLibrary = () => jsonDl({ type: 'yolkbox-bricks', version: 1, bricks: lib }, `yolkbox-brick-shelf-${stamp()}.json`);
const CAP_MSG = 'Some pad loops had more notes than the box keeps (2000 per brick, 256 per bar), so extra slides were thinned';
function importJSON(obj) {
  Z.takeCapHits();
  if (!obj || typeof obj.type !== 'string' || !/^yolkbox-(project|bricks)$/.test(obj.type)) throw new Error('Not a Yolk Box file');
  let added = 0;
  const pj = obj.type === 'yolkbox-project' && obj.project && typeof obj.project === 'object' ? obj.project : null;
  let clips = pj ? Z.clips(pj.clips) : [];
  for (const b of Z.bricks(obj.bricks)) {
    if (lib.length >= Z.LIMITS.bricks) { toast('Brick shelf is full (' + Z.LIMITS.bricks + ')'); break; }
    const have = lib.find((x) => x.id === b.id);
    if (have && JSON.stringify(have.state) === JSON.stringify(b.state)) continue;
    const nb = B.deepFreeze({ ...b, id: have ? B.uid() : b.id }); lib = [...lib, nb]; added++;
    if (have) clips = clips.map((c) => (c.brick === b.id ? { ...c, brick: nb.id } : c));
  }
  if (pj) {
    if (Object.keys(projects).length >= Z.LIMITS.projects) throw new Error('Too many songs (' + Z.LIMITS.projects + ')');
    const ids = new Map(lib.map((b) => [b.id, b.bars])), name = Z.text(pj.name, 'Song') || 'Song';
    const id = B.uid('p'); projects[id] = { id, name: name + (Object.values(projects).some((p) => p.name === name) ? ' (imported)' : ''), clips: Z.capSong(clips.filter((c) => ids.has(c.brick)), ids), ws: merge(pj.ws) };
    switchProject(id); toast(`Imported song "${projects[id].name}" (+${added} bricks)` + (Z.takeCapHits() ? '. ' + CAP_MSG : ''));
  } else { saveAll(); commit(); studio.refresh(); wsUI(); toast(`Imported ${added} brick${added === 1 ? '' : 's'}` + (Z.takeCapHits() ? '. ' + CAP_MSG : '')); }
}

// replace the workspace. While playing, the switch is queued so it lands exactly on the next bar line.
function loadState(ns, origin = null) {
  const apply = (t) => {
    if (kr.state !== 'idle') kr = { state: 'idle' };
    const bpm = S.bpm; S = merge(clone(ns)); if (origin !== undefined) S.origin = origin; if (playing && mode !== 'ws') S.bpm = bpm;
    selStep = 0; kkFrom = S.kk.loop.layers.map(() => 0); kkAnchor = absStep;
    if (eng) { if (t) { eng.kkOffAt(t); if (mode === 'ws') eng.applyState(S, t, ms); } else { eng.kkRelease([1, 2, 3, 4, 5, 6, 7, 8]); if (mode === 'ws') eng.applyState(S, 0, ms); } }
    const ui = () => { refreshAll(); changed(); commit(); };
    if (t && ctx) setTimeout(ui, Math.max(0, (t - ctx.currentTime) * 1000)); else ui();
  };
  queueBar(apply, playing && mode === 'ws' ? 'Switching on the next bar' : null);
}
// mix-and-match: copy one machine's layer from a brick into the workspace (queued to the next bar)
function loadLayer(machine, brickId) {
  const br = lib.find((b) => b.id === brickId); if (!br) return;
  queueBar((t) => {
    if (machine === 'kk') { if (kr.state !== 'idle') kr = { state: 'idle' }; S.kk = clone(br.state.kk); kkFrom = S.kk.loop.layers.map(() => 0); kkAnchor = absStep; if (eng) t ? eng.kkOffAt(t) : eng.kkRelease([1, 2, 3, 4, 5, 6, 7, 8]); }
    else S[machine] = clone(br.state[machine]);
    if (eng && mode === 'ws') eng.applyState(S, t, ms);
    const ui = () => { refreshAll(); changed(); commit(); toast(`${{ drums: 'Drums', bass: 'Bass', kk: 'Pad loop' }[machine]} loaded from "${br.name}"`); };
    if (t) setTimeout(ui, Math.max(0, (t - ctx.currentTime) * 1000)); else ui();
  }, playing ? 'Loading on the next bar' : null);
}
function refreshAll() { buildDrumKnobs(); buildDrumGrid(); buildBassKnobs(); buildBassGrid(); buildKeys(); buildMixer(); drawTransport(); kkUI(); wsUI(); msUI(); }

// ---------------------------------------------------------------- screens
let scr = 0;
function goScreen(i) {
  scr = Math.max(0, Math.min(4, i));
  $('#track').style.transform = `translateX(${-100 * scr}%)`;
  $$('.tab').forEach((t, j) => { t.classList.toggle('active', j === scr); t.setAttribute('aria-selected', j === scr); });
  $$('.screen').forEach((s, j) => s.setAttribute('aria-hidden', j !== scr));
  if (scr === 4 && studio) studio.refresh();
}
function initSwipe() {
  const vp = $('#viewport'), tr = $('#track');
  let x0 = 0, y0 = 0, dx = 0, active = false, swiping = false, swiped = false;
  vp.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' || e.target.closest('.timeline,.shelf,#kkPad')) return; active = true; swiping = false; x0 = e.clientX; y0 = e.clientY; dx = 0; });
  vp.addEventListener('pointermove', (e) => {
    if (!active) return; dx = e.clientX - x0; const dy = e.clientY - y0;
    if (!swiping && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.3) { swiping = true; tr.classList.add('dragging'); }
    if (swiping) tr.style.transform = `translateX(calc(${-100 * scr}% + ${dx}px))`;
  });
  const end = () => {
    if (!active) return; active = false; tr.classList.remove('dragging');
    if (swiping) { swiped = true; setTimeout(() => (swiped = false), 50); goScreen(scr + (dx < -60 ? 1 : dx > 60 ? -1 : 0)); }
  };
  vp.addEventListener('pointerup', end); vp.addEventListener('pointercancel', end);
  vp.addEventListener('click', (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
}

// ---------------------------------------------------------------- wire up
// ---------------------------------------------------------------- dancing metronome
let dancer = null;
function initDancerUI() {
  const pop = $('#dancerPop'), panel = $('#dancer');
  dancer = initDancer({ panel, mini: $('#dancerCv'), big: $('#dancerBig'), nameEl: $('#dancerName'), clickEl: $('#dancerClick'),
    PR, savePrefs, getCtx: () => ctx, isPlaying: () => playing });
  const open = (v) => { pop.hidden = !v; panel.setAttribute('aria-expanded', String(v)); if (v) dancer.draw(); };
  panel.onclick = (e) => { e.stopPropagation(); open(pop.hidden); };
  $('#dancerSw').onclick = (e) => { e.stopPropagation(); dancer.next(); toast(dancer.chars.length ? $('#dancerName').textContent : ''); };
  $('#dancerPrev').onclick = () => dancer.prev(); $('#dancerNext').onclick = () => dancer.next();
  $('#dancerClick').onclick = () => $('#clickBtn').click();      // same click as the transport CLICK button (never recorded)
  $('#dancerClose').onclick = () => open(false);
  pop.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { if (!pop.hidden) open(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) open(false); });
}
function init() {
  swingK = knob('Swing', LVL, () => S.swing, (x) => (S.swing = x));
  $('#swingKnob').replaceWith(swingK); swingK.id = 'swingKnob';
  buildKK(); refreshAll(); buildKeys();
  $('#play').onclick = () => (playing ? stop() : play());
  $('#rec').onclick = toggleRec;
  // Tempo on touch screens: hold -/+ to repeat (speeds up), or slide on the number with a readout above the finger.
  const holdBpm = (btn, dir) => {
    let id = null, timer = 0, t0 = 0;
    const stop = () => { clearTimeout(timer); timer = 0; btn.classList.remove('held'); if (id != null && btn.hasPointerCapture(id)) btn.releasePointerCapture(id); id = null; };
    const tick = () => {
      const held = performance.now() - t0 - 350;                       // ms since repeating started
      if (held > 1500) setBpm(dir > 0 ? Math.floor(S.bpm / 5) * 5 + 5 : Math.ceil(S.bpm / 5) * 5 - 5);   // big steps of 5
      else setBpm(S.bpm + dir);
      const rate = 8 + 17 * Math.min(1, Math.max(0, held) / 1500);      // 8/s ramping to 25/s
      timer = setTimeout(tick, 1000 / rate);
    };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return; e.preventDefault(); stop();
      id = e.pointerId; try { btn.setPointerCapture(id); } catch {}
      btn.classList.add('held'); t0 = performance.now(); setBpm(S.bpm + dir);      // a single tap is exactly 1
      timer = setTimeout(tick, 350);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) btn.addEventListener(ev, stop);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.onclick = (e) => { if (e.detail === 0) setBpm(S.bpm + dir); };   // keyboard Enter/Space still works
  };
  holdBpm($('#bpmDn'), -1); holdBpm($('#bpmUp'), 1);
  const bv = $('#bpmVal'), bub = $('#bpmBubble');
  let drag = null;
  const bubAt = (x, y) => {   // ~60px above the finger, kept inside the visible screen; beside the finger if there is no room
    const vv = window.visualViewport, V = vv ? { t: vv.offsetTop, l: vv.offsetLeft, b: vv.offsetTop + vv.height, r: vv.offsetLeft + vv.width } : { t: 0, l: 0, b: innerHeight, r: innerWidth };
    const w = bub.offsetWidth, h = bub.offsetHeight, m = 8;
    let top = y - 60 - h, left = x - w / 2, side = false;
    if (top < V.t + m) { top = V.t + m; if (top + h > y - 24) { side = true; top = Math.min(Math.max(y - h / 2, V.t + m), V.b - m - h); left = x - w - 48 >= V.l + m ? x - w - 48 : x + 48; } }
    left = Math.min(Math.max(left, V.l + m), V.r - m - w);
    Object.assign(bub.style, { left: left + 'px', top: top + 'px' }); bub.classList.toggle('side', side);
  };
  bv.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return; e.stopPropagation(); e.preventDefault();
    try { bv.setPointerCapture(e.pointerId); } catch {}
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, b: S.bpm, on: false };
  });
  bv.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = (e.clientX - drag.x) - (e.clientY - drag.y);          // up or right = faster
    if (!drag.on && Math.abs(d) < 6) return;
    if (!drag.on) { drag.on = true; bv.classList.add('dragging'); bub.hidden = false; }
    const a = Math.abs(d), steps = (a / 5) * (1 + a / 160);          // ~1 BPM per 5px, quicker the further you slide
    setBpm(drag.b + Math.sign(d) * steps);
    bub.textContent = Math.round(S.bpm); bubAt(e.clientX, e.clientY);
  });
  const endDrag = () => { if (!drag) return; drag = null; bv.classList.remove('dragging'); bub.hidden = true; };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bv.addEventListener(ev, endDrag);
  // no double-tap zoom on the controls (touch-action in CSS does most of it; this covers the rest)
  for (const el of document.querySelectorAll('.transport, .pattern, .tabs, .wsbar')) el.addEventListener('dblclick', (e) => e.preventDefault());
  bv.addEventListener('wheel', (e) => { e.preventDefault(); setBpm(S.bpm - Math.sign(e.deltaY)); }, { passive: false });
  $$('.tab').forEach((t) => (t.onclick = () => goScreen(+t.dataset.screen)));
  $('#prevScr').onclick = () => goScreen(scr - 1); $('#nextScr').onclick = () => goScreen(scr + 1);
  $$('.half-toggle').forEach((h) => $$('button[data-half]', h).forEach((b) => (b.onclick = () => {
    $$('button[data-half]', h).forEach((x) => x.classList.toggle('on', x === b));
    h.parentElement.classList.toggle('half2', b.dataset.half === '1');
  })));
  $('#drumClear').onclick = () => { for (const k in S.drums.steps) S.drums.steps[k].fill(0); buildDrumGrid(); changed(); };
  $('#bassClear').onclick = () => { S.bass.steps.forEach((s) => Object.assign(s, { on: false, acc: false, sl: false, up: false, dn: false })); buildBassGrid(); changed(); };
  buildTiming(); buildProjects();
  $('#tapBtn').onclick = tapTempo;
  $('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
  $('#songKey').innerHTML = KEYS.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  $('#songScale').innerHTML = Object.keys(KK_SCALES).map((n) => `<option value="${n}">${n}</option>`).join('');
  $('#songKey').onchange = (e) => kkSet('root', +e.target.value); $('#songScale').onchange = (e) => kkSet('scale', e.target.value);
  $('#inKeyBtn').onclick = () => { PR.inKey = !PR.inKey; savePrefs(); buildKeys(); wsUI(); };
  $$('[data-ms]').forEach((b) => (b.onclick = () => { const [m, k] = b.dataset.ms.split(':'); setMS(m, k); }));
  $$('[data-surprise]').forEach((b) => (b.onclick = () => surprise(b.dataset.surprise)));
  $$('.fromBrick').forEach((sel) => (sel.onchange = () => { if (sel.value) loadLayer(sel.dataset.m, sel.value); sel.value = ''; }));
  $('#startSel').innerHTML = `<option value="">Start from&hellip;</option><option value="starter">Starter groove</option>${DEMOS.map((d, i) => `<option value="d:${i}">${d.name}</option>`).join('')}<option value="empty">Empty (silence)</option>`;
  $('#startSel').onchange = (e) => {
    const v = e.target.value; e.target.value = ''; if (!v) return;
    const key = { root: S.kk.root, scale: S.kk.scale }, bpm = S.bpm;
    let ns = v === 'empty' ? defaults() : v === 'starter' ? B.starterGroove({ ...defaults(), kk: { ...defaults().kk, ...key } }) : clone(DEMOS[+v.slice(2)]);
    if (v === 'starter' || v === 'empty') ns.bpm = bpm;
    ns.name = 'Workspace'; loadState(ns, null);
  };
  $('#wsSave').onclick = () => studio.saveDialog();
  $('#wsTrim').onclick = () => studio.openTrim();
  $('#projSel').onchange = (e) => {
    if (e.target.value === '__new') { buildProjects(); askNewSong(); return; }
    switchProject(e.target.value);
  };
  // New song: in-app confirm (the select sits right above the tempo controls, so a slip is easy on a phone)
  const nsDlg = $('#newSongDlg');
  function songHasContent() {
    if (P.clips.length) return true;
    const d = S.drums.steps; if (Object.values(d).some((a) => Array.isArray(a) && a.some((v) => v))) return true;
    if (S.bass.steps.some((x) => x && x.on)) return true;
    return !!(S.kk.loop && S.kk.loop.layers.some((l) => l.ev && l.ev.length));
  }
  function askNewSong() {
    const full = songHasContent();
    $('#nsWarn').textContent = full ? `"${P.name}" has beats in it. It stays in your song list, and you can switch back to it any time.` : 'Give it a name.';
    $('#nsName').value = 'Song ' + (Object.keys(projects).length + 1);
    nsDlg.showModal();
  }
  $('#nsCancel').onclick = () => nsDlg.close();
  $('#nsOk').onclick = () => { const n = Z.text($('#nsName').value.trim()); if (!n) return $('#nsName').focus(); nsDlg.close(); newProject(n); toast(`New song "${n}"`); };
  $('#nsName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#nsOk').click(); } });
  nsDlg.addEventListener('click', (e) => { if (e.target === nsDlg) nsDlg.close(); });   // tap outside = cancel
  $('#songMp3').onclick = () => exportSong('mp3'); $('#songWav').onclick = () => exportSong('wav');
  $('#projJson').onclick = exportProject; $('#libJson').onclick = exportLibrary;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > Z.LIMITS.importBytes) return toast('Import failed: file is over 2 MB'); try { importJSON(JSON.parse(await f.text())); } catch (err) { toast('Import failed: ' + err.message); } };
  $('#projRename').onclick = () => { const n = (prompt('Rename this song:', P.name) || '').trim(); if (n) { P.name = Z.text(n); saveAll(); buildProjects(); } };
  const dlg = $('#exportDlg');
  $('#exportBtn').onclick = () => dlg.showModal(); $('#dlgClose').onclick = () => dlg.close();
  $('#takeMp3').onclick = () => exportTake('mp3'); $('#takeWav').onclick = () => exportTake('wav');
  $('#bars4Mp3').onclick = () => exportBars('mp3'); $('#bars4Wav').onclick = () => exportBars('wav');
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,select,textarea,dialog')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (scr === 4 && studio.key(e)) return;
    if (e.code === 'Space') { e.preventDefault(); playing ? stop() : play(); }
    if (e.key === 'ArrowRight' && !e.target.closest('.dial')) goScreen(scr + 1);
    if (e.key === 'ArrowLeft' && !e.target.closest('.dial')) goScreen(scr - 1);
  });
  studio = initStudio(API);
  studio.replaceBrickWith = (id, st) => { const old = lib.find((b) => b.id === id); const br = B.replaceBrick(old, st); lib = lib.map((b) => (b.id === id ? br : b)); segCache.clear(); saveAll(); commit(); studio.refresh(); wsUI(); return br; };
  studio.newBrickFrom = (st, name, color) => { const br = B.makeBrick(st, name, color); lib = [...lib, br]; saveAll(); commit(); studio.refresh(); wsUI(); return br; };
  studio.deleteProject = (id) => { if (playing) stop(); delete projects[id]; P = Object.values(projects)[0]; switchProject(P.id); toast('Song deleted'); };
  applyNames(); initDancerUI();
  initSwipe(); goScreen(0); drawPlayhead(); commit(); undoUI(); refreshAll(); saveAll();
  if (Z.takeCapHits()) setTimeout(() => toast(CAP_MSG), 600);
  studio.coach(false);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
}
let studio = null;
const API = {
  get S() { return S; }, get lib() { return lib; }, get P() { return P; }, get projects() { return projects; }, get PR() { return PR; },
  get playing() { return playing; }, get mode() { return mode; }, get src() { return src; },
  toast, esc, goScreen, ensureAudio, changed, commit, undo, redo, loadState, saveBrick, openBrick, dupBrick, renameBrick, deleteBrick, usedIn, setClips,
  playSrc, play, stop, exportSong, songSegs, capSegs, segsLen, EXPORT, segState, setBars, kkUI, refreshAll, renderSong, renderOffline, get ctx() { return ctx; }, get eng() { return eng; },
  setWorkspace(st) { const o = S.origin; S = merge(clone(st)); S.origin = o; kkFrom = S.kk.loop.layers.map(() => 0); kkAnchor = absStep - (absStep % 16); if (eng) { eng.kkRelease([1, 2, 3, 4, 5, 6, 7, 8]); if (mode === 'ws') eng.applyState(S, 0, ms); } refreshAll(); changed(); commit(); },
};
window.YB = { get state() { return S; }, get kk() { return { kr: kr.state, anchor: kkAnchor, absStep, from: kkFrom.slice(), log: kkAll.slice(), tops: kkTops.slice(), rec: kr.state === 'rec' ? { t0: kr.t0, end: kr.end } : null, layers: S.kk.loop.layers.length, live: { ...live } }; },
  kkTap: { rec: kkRecBtn, undo: kkUndo, clear: kkClear, set: kkSet, live: kkLive }, get ctx() { return ctx; }, get eng() { return eng; }, get uiQ() { return uiQ; }, play, stop, toggleRec, exportTake, exportBars, renderOffline: (bars, st) => renderOffline(st || S, bars), loadState, goScreen, DEMOS, strutPhrase, wavBlob, mp3Blob, get take() { return take; },
  B, PR, savePrefs, get lib() { return lib; }, get P() { return P; }, get projects() { return projects; }, get H() { return { past: H.past.length, future: H.future.length }; }, get lastSwitch() { return lastSwitch; }, get dancer() { return dancer; }, get playT0() { return playT0; }, get playing() { return playing; }, get mode() { return mode; },
  get meter() { return { lvl: hm.lvl, pk: hm.pk, lit: hm.n, hold: hm.hold, running: !!hm.raf, frames: hm.frames }; }, get nowPlaying() { return $('#nowPlay').textContent; },
  get studio() { return studio; }, saveBrick, openBrick, dupBrick, renameBrick, deleteBrick, loadLayer, setClips, exportSong, songSegs, capSegs, segsLen, EXPORT, renderSong, undo, redo, commit, surprise, setBars, setMS, tapTempo, playSrc, importJSON, exportProject, exportLibrary, newProject, switchProject, API };
init();
