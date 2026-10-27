import { COLD_OPEN, ENDINGS, NAMES, NEXT_ISSUE, ROOMS, SCENE, SPEAKER, TIME_CARDS } from "../data/script.js";
import { artMode, artUrl, assetInfo, fancyCount, initArt, onArtChange, setArtMode } from "./art.js";
import { audioSettings, audioState, hasVoice, initAudio, MOMENT_THEMES, playBed, playCue, playVoice, playVoiceSeq, preloadTheme, resumeAudio, REVEAL_XFADE_S, setAudio, setTension, stopVoice } from "./audio.js";
import { beatActive, onBeatsDone, playBeats, preloadSignCut, smokeVeil } from "./beats.js";
import { clampToArea, findPath, parseFlagOverride, roomView, stepToward, depthHeight, actorZ, occluderZ, occluderAsset, occluderBase, spriteFilter, castFrame, standFor, behindOccluder } from "./walk.js";
import { act, choicesFor, HERO, ITEMS, itemOf, maxHeat, newGame, nightOf, nightTint, panelVoice, preview, signLetters, signLevel, signParts, spotsFor, startBeats, vatState, veilLifted, visible } from "./logic.js";

const SAVE_KEY = "rr-yolk-saves";
const VERBS = [
  ["look", "Look at"],
  ["talk", "Talk to"],
  ["take", "Take"],
  ["use", "Use"],
  ["push", "Push"],
];

const ui = {
  state: null,
  queue: [],
  index: 0,
  screen: "title",
  menu: false,
  spots: new URLSearchParams(location.search).has("spots"),
  cast: new URLSearchParams(location.search).has("cast"), // force cast sprites over placeholder plates (preview only)
  flagOverride: parseFlagOverride(location.search), // "?flags=rope_open" preview: set on New game
  plateFile: "",
  lineAt: 0, // when the current caption line was shown (cast talk frames run for a beat after it)
  lastAct: null, // { spot, verb } of the last hotspot click (cast `talkOn`)
  // Hints / easy mode (Arlong 2026-10-19): hover highlighting is OFF by default; the menu turns it on (kept per device).
  hints: (() => { try { return localStorage.getItem("rr-hints") === "1"; } catch { return false; } })(),
  // Push C PLACEHOLDER beats (2026-10-24). Cold open: COLD_OPEN in data/script.js, overridden per device by the Menu
  // toggle (localStorage rr-coldopen) or per visit by ?coldopen=0|1. Colour shift: Menu toggle (rr-nightshift).
  coldOpen: (() => {
    const q = new URLSearchParams(location.search).get("coldopen");
    if (q === "0" || q === "1") return q === "1";
    try { const v = localStorage.getItem("rr-coldopen"); if (v === "0" || v === "1") return v === "1"; } catch { /* */ }
    return COLD_OPEN;
  })(),
  nightShift: (() => { try { return localStorage.getItem("rr-nightshift") !== "0"; } catch { return true; } })(),
  voiceAfterBeat: null,
};

const app = document.querySelector("#app");

function saves() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
    const slots = Array.isArray(raw) ? raw : [];
    while (slots.length < 3) slots.push(null);
    return slots.slice(0, 3);
  } catch {
    return [null, null, null];
  }
}

function writeSaves(slots) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(slots));
}

// Continue / Load: the saved state, then the lines that were still to come when it was saved (a line with an unplayed
// cut, such as the Pavilion's signCut, plays it first, as in showLine). Saves without lines resume on an empty queue.
function resumeSlot(slot) {
  ui.state = seedNight(slot.data);
  ui.queue = Array.isArray(slot.lines) ? slot.lines : [];
  ui.index = 0;
  render();
  if (ui.queue.length) showLine(ui.queue[0]);
}

// `fallback`: another asset to show if this one is unknown or fails to load, so a missing frame never leaves an
// empty image (Rooster must never vanish). An id the manifest doesn't know yet (stale manifest) is tried directly as
// art/pixel/<id>.png first.
// An occluder's cutout for this plate; one with `open: { flag, id }` swaps to that cutout once the flag is set and its
// file is in (the Midway rope, open after pavilion_in). Same base and edge either way.
function occluderFile(o, plate, flags) {
  if (o.open && flags[o.open.flag]) {
    const alt = occluderAsset(plate, o.open.id);
    if (assetInfo(alt)) return alt;
  }
  return occluderAsset(plate, o.id);
}

function urlOf(file) {
  // only for ids the manifest doesn't know (a stale manifest); a known id with a placeholder keeps its placeholder
  if (!assetInfo(file) && /^(sprite|item|fg|fx|overlay|bg)\//.test(file)) return `art/pixel/${file}.png`;
  return artUrl(file);
}

function mount(img, file, fallback = null) {
  img.dataset.file = file;
  const url = urlOf(file);
  img.onerror = fallback && fallback !== file ? () => { img.onerror = null; mount(img, fallback); } : null;
  img.src = url;
  // Nearest-neighbor for pixel files, smooth for fancy and legacy placeholders.
  img.classList.toggle("px", url.startsWith("art/pixel/"));
}

function pct(value, axis) {
  return `${(value / (axis === "x" ? SCENE.w : SCENE.h)) * 100}%`;
}

function artToggle() {
  const mode = artMode();
  const label = mode === "pixel" ? "Art: Pixel" : fancyCount() ? "Art: Fancy" : "Art: Fancy (not installed yet)";
  const node = button(label, "ghost art-toggle", () => setArtMode(mode === "pixel" ? "fancy" : "pixel"));
  node.setAttribute("aria-label", `Switch art set. Current: ${mode}`);
  return node;
}

function currentLine() {
  return ui.queue[ui.index] || null;
}

function showLine(entry) {
  if (!entry) return;
  // Chopper 2026-10-26: the player moved past the whisk line before the smoke finished clearing: finish it now, so
  // her reveal (portrait cut + the acid theme, on the veil's "done") can't be skipped
  if (entry.veil !== "whisk" && ui.pavVeil && ui.pavVeil.clearing && !ui.pavVeil.cleared) ui.pavVeil.veil.finish();
  // a line with a cutscene plays its beat first (input locked), then shows; the queue waits for it
  if (entry.cutscene && !entry.played) {
    entry.played = true;
    playCutscene(entry.cutscene, () => showLine(entry));
    return;
  }
  // a full-screen insert (showInsert) first, then the line
  if (entry.insert && !entry.insertShown) {
    entry.insertShown = true;
    showInsert(entry.insert).then(() => showLine(entry));
    return;
  }
  // Usopp 2026-10-25: the cut to the club sign (GOBBLER sputters and lights as one tube, Arlong 2026-10-26).
  // Arlong 2026-10-27: its narration is read DURING the close-up, not after the cut fades: the beat carries the line
  // as its own caption (js/beats.js runOne), and the line is shown now underneath, so it's already up when the cut ends.
  if (entry.signCut && !entry.played) {
    entry.played = true;
    playBeats([{ kind: "sign", caption: entry.text }]);
  }
  ui.lineAt = performance.now();
  if (ui.cueAt && ui.cueAt.line !== entry) ui.cueAt = null; // a cue started by this line's cutscene keeps its clock
  if (entry.mood) ui.state.mood = entry.mood;
  if (entry.sound) playCue(entry.sound);
  else if (entry.speaker === SPEAKER.goat && !hasVoice(entry.id)) playCue("goat-bleat"); // Mortgage's "meeeeeh."
  else if (entry.speaker === SPEAKER.henny) playCue("henny-cluck"); // Henny reacts in chicken gibberish, never words
  // optional voice: audio/in/voice/<entry.id>.ogg|mp3 when the manifest has it, silent otherwise; held until a beat ends
  if (beatActive()) { stopVoice(); ui.voiceAfterBeat = entry.id || null; } else playVoice(entry.id);
  render();
  popFx(entry);
  playAnim(entry);
  if (entry.veil === "whisk" && ui.pavVeil && !ui.pavVeil.clearing) { // the Pavilion unmasking: the smoke whisks off her mask
    const v = ui.pavVeil;
    v.clearing = true;
    v.veil.clear({ now: true }).then(() => { v.cleared = true; v.wrap.remove(); syncSmokePlate(); syncMusic(REVEAL_XFADE_S); });
  }
}

// Arlong 2026-10-25: her smoke-hidden portrait clears at the same moment as the on-screen smoke (Brook's final art).
// A plate with `smoke` (GOBBLER_PLATE) shows the portrait smoke while the Pavilion veil is on screen: the
// portrait/hattie-smoke-drift loop on stage drift frame % 6 (6 x 180 ms = half the 12-frame stage loop), then
// portrait/hattie-smoke-clear on the same frame index as pavilion/smoke-clear, stepped by smokeVeil's onFrame on the
// stage's own tick; when the stage veil is done it cuts to the plate's clear portrait (portrait/gobbler; clear frames
// 6-8 already equal it). Without the strips: the still portrait/hattie-smoke, cut on done. One node per render; the
// frame lives on ui.pavVeil, so a re-render mid-clear stays in step.
const pavVeilUp = () => !!(ui.pavVeil && !ui.pavVeil.cleared && ui.pavVeil.phase !== "done" && ui.state && ui.state.room === "pavilion");
function smokePlateArt() { // -> { id, frame } for the current stage phase
  const v = ui.pavVeil, still = { id: "portrait/hattie-smoke", frame: 0 };
  if (!v) return still;
  if (v.phase === "clear" && artUrl("portrait/hattie-smoke-clear")) return { id: "portrait/hattie-smoke-clear", frame: v.frame };
  if (v.phase === "drift" && artUrl("portrait/hattie-smoke-drift")) {
    const n = (assetInfo("portrait/hattie-smoke-drift") || {}).frames || 1;
    return { id: "portrait/hattie-smoke-drift", frame: v.frame % n };
  }
  return still;
}
function paintSmokePlate(node) {
  const { id, frame } = smokePlateArt();
  const n = (assetInfo(id) || {}).frames || 1;
  if (node.dataset.id !== id) {
    node.dataset.id = id;
    node.style.backgroundImage = `url("${artUrl(id)}")`;
    node.style.setProperty("--frames", String(n));
  }
  node.style.backgroundPosition = `${n > 1 ? (Math.min(frame, n - 1) / (n - 1)) * 100 : 0}% 0`;
  node.dataset.frame = String(frame + 1);
}
function smokePlateNode(clearTo, fallback) {
  const node = el("div", "portrait-smoke");
  node.setAttribute("role", "img");
  node.dataset.clearTo = clearTo;
  if (fallback) node.dataset.fallback = fallback;
  paintSmokePlate(node);
  return node;
}
function syncSmokePlate() {
  for (const node of document.querySelectorAll(".speaker .portrait-smoke")) {
    if (pavVeilUp()) { paintSmokePlate(node); continue; }
    const img = el("img"); // the smoke is gone: cut to the clear portrait
    img.alt = node.getAttribute("aria-label") || "Hattie";
    mount(img, node.dataset.clearTo, node.dataset.fallback || null);
    node.replaceWith(img);
  }
}

// Hawkeye pass (Arlong/Usopp 2026-10-25): at the Pavilion a smoke veil (js/beats.js smokeVeil, CSS blobs) hangs over her
// mask and face until the hero choice; the veil: "whisk" line clears it. One persistent node, re-added on every render
// so the drift keeps going; gone once cleared or when the save is already past the unmasking.
// Brook's pavilion/smoke strips are full 320x180 frames aligned to bg/pavilion (her head at x 195-208, y 53-70), so the
// wrap is the whole scene; without them, the procedural CSS blobs in the small box over her head (fallback only).
const PAV_VEIL = { spot: "gobbler", ids: "pavilion/smoke", box: [0, 0, 320, 180], fallbackBox: [190, 44, 34, 34] }; // logical px: left, top, w, h
function pavilionVeil(state, world) {
  if (state.room !== "pavilion") return;
  if (!veilLifted(state) && (!ui.pavVeil || ui.pavVeil.cleared)) {
    const art = !!(artUrl(`${PAV_VEIL.ids}-drift`) && artUrl(`${PAV_VEIL.ids}-clear`));
    const wrap = el("div", `pav-veil${art ? " pav-veil-art" : ""}`);
    const pv = { wrap, veil: null, clearing: false, cleared: false, phase: "drift", frame: 0 };
    ui.pavVeil = pv;
    // her portrait smoke steps on the stage smoke's own tick (syncSmokePlate)
    preloadTheme(MOMENT_THEMES.gobbler); // her reveal hits on the smoke clear: decoded ahead
    preloadSignCut(); // the club sign cut after her speech: its layers decoded ahead
    const veil = smokeVeil("thick", { ids: PAV_VEIL.ids, onFrame: (phase, i) => {
      pv.phase = phase; pv.frame = i;
      if (phase === "done") pv.cleared = true;
      if (ui.pavVeil === pv) { syncSmokePlate(); if (phase === "done") syncMusic(REVEAL_XFADE_S); } // the acid theme on the clear
    } });
    pv.veil = veil;
    wrap.append(veil.node);
    const [x, y, w, h] = art ? PAV_VEIL.box : PAV_VEIL.fallbackBox;
    wrap.style.left = pct(x, "x"); wrap.style.top = pct(y, "y"); wrap.style.width = pct(w, "x"); wrap.style.height = pct(h, "y");
  }
  const v = ui.pavVeil;
  if (!v || v.cleared || !world.querySelector(`img.cast[data-spot="${PAV_VEIL.spot}"]`)) return;
  v.wrap.style.zIndex = String(actorZ(110) + 1);
  world.append(v.wrap);
}

// One-shot tweens on existing frames (push gags): entry.anim = { <cast spot id | "hero">: "wobble" | "puff" | "recoil" }.
function playAnim(entry) {
  if (!entry.anim) return;
  for (const [who, kind] of Object.entries(entry.anim)) {
    const node = who === "hero" ? document.querySelector(".world .hero, .world .pose") : document.querySelector(`.world img.cast[data-spot="${who}"]`);
    if (!node) continue;
    if (who === "hero") {
      const other = Object.keys(entry.anim).find((k) => k !== "hero");
      const o = other && document.querySelector(`.world img.cast[data-spot="${other}"]`);
      node.style.setProperty("--away", o && o.getBoundingClientRect().left > node.getBoundingClientRect().left ? -1 : 1);
    }
    node.classList.remove(`anim-${kind}`);
    void node.offsetWidth; // restart
    node.classList.add(`anim-${kind}`);
  }
}

// A cued one-shot over the scene (the bell's painted DING!): room.fx[cue] = { art, at: [left, top] }, fades out by CSS.
// render() rebuilds the world, so the pop lives in ui.fx and each render re-adds it with its animation clock carried over.
const FX_MS = 1000;
function popFx(entry) {
  const room = ui.state && ROOMS[ui.state.room];
  const fx = entry.cue && room && room.fx && room.fx[entry.cue];
  if (!fx) return;
  ui.fx = { ...fx, room: ui.state.room, start: performance.now() };
  render();
  setTimeout(() => { if (ui.fx && performance.now() - ui.fx.start >= FX_MS) { ui.fx = null; render(); } }, FX_MS + 30);
}

function fxNode(state) {
  const fx = ui.fx;
  if (!fx || fx.room !== state.room) return null;
  const age = performance.now() - fx.start;
  if (age >= FX_MS) return null;
  const node = el("img", "fx-pop");
  node.alt = "";
  node.dataset.id = fx.art;
  placeAt(node, fx.art, fx.at);
  node.style.animationDelay = `${-Math.round(age)}ms`;
  return node;
}

function dispatch(action) {
  if (ui.cutscene) return;
  if (ui.pendingAct && ui.pendingAct !== action) cancelPendingAct(); // a new command replaces the walk-then-act

  const before = ui.state;
  const result = act(ui.state, action);
  ui.state = result.state;
  soundsFor(before, result.state, action, result);
  if (result.beats && result.beats.length) playBeats(result.beats);
  if (result.lines.length) {
    ui.queue = result.lines;
    ui.index = 0;
    showLine(ui.queue[0]);
    return;
  }
  ui.queue = [];
  ui.index = 0;
  render();
}

// Push C cue wiring: door / hatch / turnstile on a room change, pickup when a pocket fills, the ring toss.
function soundsFor(before, after, action, result) {
  if (!before || !after) return;
  if (after.room !== before.room) {
    if (before.room === "gate" && after.room === "midway") playCue("turnstile");
    else if (before.room === "henhouse" || after.room === "henhouse") playCue("hatch");
    else playCue("door");
    if (after.room === "fence") setTimeout(() => playCue("hen-cluck"), 500); // the yard hens
  } else if (action.id === "turnstile" && (action.t === "go" || action.t === "hotspot")) playCue("turnstile");
  if ((after.inv || []).length > (before.inv || []).length) playCue("pickup");
  if (action.t === "choice" && before.choice && before.choice.id === "ringtoss") playCue("ring-toss");
  // Henny looked at / talked to / handed something: she clucks (her thought lines cluck on their own in showLine)
  if (action.t === "hotspot" && action.id === "henny" && !(result && result.lines || []).some((l) => l.speaker === SPEAKER.henny)) playCue("henny-cluck");
}

function advance() {
  if (ui.cutscene) return;
  if (ui.index < ui.queue.length - 1) {
    ui.index += 1;
    showLine(ui.queue[ui.index]);
    return;
  }
  render();
}

/* ---------- Cutscenes: a scripted beat on existing frames (room.cutscenes[name], see the barn's grub) ----------
 * Each actor track is keys [t, sprite | [frames], at?, to?, ms?]: from t it shows that frame (frames cycle every
 * STEP_MS) at `at` (else where it was), moving to `to` over `ms`. props fall/vanish, events pop fx / shake / sound.
 * Input is locked (a blocker over the page) until it ends; then `end` places the hero and `done` shows the lines. */
function playCutscene(name, done) {
  const room = ROOMS[ui.state.room];
  const cs = room && room.cutscenes && room.cutscenes[name];
  const world = document.querySelector(".world");
  if (!cs || !world) { done(); return; }
  ui.cutscene = name;
  const block = el("div", "cs-block");
  document.body.append(block);
  const castNode = (spot) => [...castNodes].find(([n, c]) => c.spot === spot && n.isConnected);
  const goatEntry = castNode("goat");
  const heroNode = world.querySelector(".hero");
  const actors = {};
  // Push A: a beat played from wherever he stands, facing `faceTo` (x): "{f}" in a frame name is his facing
  const f = cs.faceTo !== undefined ? (hero.x > cs.faceTo ? "l" : "r") : hero.face === "l" ? "l" : "r";
  const heroH = cs.heroH || (room.hero && room.hero.depth ? depthHeight(room.hero, hero.y) : 64);
  // sizes per actor: the hero by depth (or one fixed size for a beat off the floor, cs.heroH: the glide), Mortgage at h44
  const size = { hero: (y) => (cs.heroH ? `-h${cs.heroH}` : room.hero.depth ? `-h${depthHeight(room.hero, y)}` : sizeTag(room.hero)), goat: () => (goatEntry ? sizeTag(goatEntry[1]) : "-h44") };
  for (const who of ["hero", "goat"]) {
    if (!cs[who]) continue;
    const real = who === "hero" ? heroNode : goatEntry && goatEntry[0];
    if (real) real.style.visibility = "hidden";
    const node = el("img", "cast cs-actor");
    node.alt = "";
    world.append(node);
    const start = who === "hero" ? [hero.x, hero.y] : goatEntry ? goatEntry[1].at : cs[who][0][2];
    actors[who] = { node, real, keys: cs[who], start };
  }
  // the prop's real overlay (already gone from the state, still on screen until the next render) hides under the copy
  for (const p of cs.props || []) for (const n of world.querySelectorAll(`img.overlay[data-id="${p.art}"]:not(.cs-prop)`)) n.style.visibility = "hidden";
  const props = (cs.props || []).map((p) => {
    // at: "hero" = from his raised fist (the sauce toss): just above his head on the side he faces
    const at = p.at === "hero" ? [hero.x + (f === "l" ? -0.29 : 0.29) * heroH - 3, hero.y - 1.06 * heroH] : p.at;
    const node = el("img", "overlay cs-prop"); node.alt = ""; node.style.zIndex = 950; placeAt(node, p.art, at);
    if (p.show) node.style.visibility = "hidden";
    world.append(node);
    // apexY: the lob clears that height at its top (the sauce bottle goes over the cage), whatever his fist height
    const arc = p.arc && p.apexY !== undefined ? [p.arc[0], p.arc[1], p.arc[2], Math.max(p.arc[3], (at[1] + p.arc[2][1]) / 2 - p.apexY)] : p.arc;
    return { ...p, at, arc, node };
  });
  if (cs.cueOnHit) ui.cueAt = { line: currentLine(), t: Infinity }; // the line's cue waits for the hit
  const fxRun = cutsceneFx(cs, world);
  const fired = new Set();
  const t0 = performance.now();
  const tint = world.querySelector(".cast") && world.querySelector(".cast").style.filter;
  const posAt = (a, t) => { // walk the keys up to t, carrying the position
    let at = a.start, key = a.keys[0];
    for (const k of a.keys) {
      if (k[0] > t) break;
      const from = k[2] || at;
      if (k[3]) { const u = Math.min(1, (t - k[0]) / (k[4] || 1)); at = [from[0] + (k[3][0] - from[0]) * u, from[1] + (k[3][1] - from[1]) * u]; } else at = from;
      key = k;
    }
    return { at, key };
  };
  const tick = () => {
    if (!world.isConnected) { finish(); return; }
    const t = performance.now() - t0;
    for (const [who, a] of Object.entries(actors)) {
      const { at, key } = posAt(a, t);
      const frames = (Array.isArray(key[1]) ? key[1] : [key[1]]).map((x) => x.replace("{f}", f));
      const sprite = frames[Math.floor((t - key[0]) / (frames.length > 1 && who === "goat" && !key[3] ? 220 : STEP_MS)) % frames.length];
      placeSprite(a.node, `sprite/${sprite}${size[who](at[1])}`, at);
      a.node.style.zIndex = who === "hero" && cs.heroZ ? cs.heroZ : actorZ(at[1]); // heroZ: up in the air, over the crowd
      if (tint) a.node.style.filter = tint;
    }
    for (const p of props) {
      if (p.gone !== undefined && t >= p.gone) { p.node.remove(); continue; }
      if (p.show) p.node.style.visibility = t >= p.show ? "" : "hidden";
      if (p.arc && t >= p.arc[0]) { // [t0, ms, to, height]: a lob, spinning
        const u = Math.min(1, (t - p.arc[0]) / p.arc[1]);
        placeAt(p.node, p.art, [p.at[0] + (p.arc[2][0] - p.at[0]) * u, p.at[1] + (p.arc[2][1] - p.at[1]) * u - 4 * p.arc[3] * u * (1 - u)]);
        p.node.style.transform = `rotate(${Math.round(u * (f === "l" ? -540 : 540))}deg)`;
      }
      if (p.fall && t >= p.fall[0]) {
        const u = Math.min(1, (t - p.fall[0]) / p.fall[1]);
        const sway = Math.sin(u * Math.PI * 3) * 4 * (1 - u);
        placeAt(p.node, p.art, [p.at[0] + (p.fall[2][0] - p.at[0]) * u + sway, p.at[1] + (p.fall[2][1] - p.at[1]) * u * u]);
        p.node.style.transform = `rotate(${sway * 6}deg)`;
      }
    }
    (cs.events || []).forEach(([te, ev], i) => {
      if (t < te || fired.has(i)) return;
      fired.add(i);
      if (ev.sound) playCue(ev.sound);
      if (ev.fx) { const n = el("img", "fx-pop"); n.alt = ""; placeAt(n, ev.fx, ev.at); world.append(n); setTimeout(() => n.remove(), FX_MS + 100); }
      if (ev.shake) { world.classList.remove("shake"); void world.offsetWidth; world.classList.add("shake"); setTimeout(() => world.classList.remove("shake"), ev.shake); }
    });
    fxRun.tick(t);
    if (t >= cs.ms) { finish(); return; }
    requestAnimationFrame(tick);
  };
  let over = false;
  function finish() {
    if (over) return;
    over = true;
    for (const a of Object.values(actors)) { a.node.remove(); if (a.real) a.real.style.visibility = ""; }
    for (const p of props) p.node.remove();
    fxRun.finish();
    block.remove();
    if (cs.end && cs.end.hero && room.hero) { hero.x = hero.tx = cs.end.hero[0]; hero.y = hero.ty = cs.end.hero[1]; hero.path = []; hero.walking = false; hero.face = cs.end.face || "front"; }
    else if (cs.faceTo !== undefined && room.hero) hero.face = f;
    ui.cutscene = null;
    done();
  }
  requestAnimationFrame(tick);
}

/* ---------- Cutscene fx slots (beta v17, Arlong Oct 27: the hot sauce toss) ----------
 * cs.slots: [{ slot, art, t, at | path, frames?, frameMs?, anchor?, ms?, z?, placeholder }] named sprite strips Brook
 * paints. With its art in the manifest a slot plays the strip: one frame is the manifest `size`, `frames` across
 * (slot.frames, else manifest frames), `frameMs` each (slot, else manifest frameMs, else 70), drawn with the
 * manifest `anchor` (or slot.anchor) on `at`. `path: { from, to, height, ms }` moves it along a lob (the oil blob,
 * its frames looping) instead. Without the art, code-drawn droplets stand in (placeholder: "burst" | "blob" |
 * "spray" | "puff"). Also, all on the same clock:
 * slot.face ("l" | "r") points a placeholder spray / puff the way she faces.
 *   cs.hit: ms, the impact; the line's cue (cs.cueOnHit) starts there, so her chain release syncs to the hit
 *   cs.recoil: { spot, t, ms, px: [dx, dy] }: a cast member knocked back and settling
 *   cs.sway: { match, kicks: [[t, deg]], period, decay, creak }: a pendulum on a hanging prop (the cage + its chain,
 *     one sprite), pivoting at the sprite's top (the chain's top); `creak` plays the sound slot on each kick;
 *     `drop: { t, ms, by: [dx, dy] }` lowers it during the beat (the cage drop on her release).
 * The sway keeps running after the beat until it has died out (ui.sway), so the drop low over the oil settles. */
const PLACEHOLDER_OIL = ["#ffcf5a", "#f0962e", "#c85a17", "#7a3210"];
function cutsceneFx(cs, world) {
  const nodes = [];
  const rand = (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })(); // same drops every time
  const runs = (cs.slots || []).map((sl) => ({ ...sl, started: false, done: false, parts: [] }));
  const lob = (pth, u) => [pth.from[0] + (pth.to[0] - pth.from[0]) * u, pth.from[1] + (pth.to[1] - pth.from[1]) * u - 4 * (pth.height || 0) * u * (1 - u)];
  const drop = (sz, color, z) => { const d = el("div", "cs-drop"); d.style.width = pct(sz, "x"); d.style.height = pct(sz, "y"); d.style.background = color; d.style.zIndex = z; world.append(d); nodes.push(d); return d; };
  const put = (d, x, y, sz) => { d.style.left = pct(x - sz / 2, "x"); d.style.top = pct(y - sz / 2, "y"); };
  const start = (r) => {
    r.started = true;
    const info = r.art && assetInfo(r.art);
    const url = info && info.pixel !== false && artUrl(r.art);
    const z = r.z || 960;
    if (url) { // Brook's strip
      const n = r.frames || info.frames || 1;
      const node = el("div", "cs-strip");
      node.dataset.slot = r.slot;
      node.style.backgroundImage = `url("${url}")`;
      node.style.setProperty("--frames", String(n));
      node.style.width = pct(info.size[0], "x"); node.style.height = pct(info.size[1], "y"); node.style.zIndex = z;
      world.append(node); nodes.push(node);
      r.strip = { node, n, ms: r.frameMs || info.frameMs || 70, anchor: r.anchor || info.anchor || [0, 0], size: info.size };
      return;
    }
    // placeholder droplets (code-drawn until the strip is in)
    const kind = r.placeholder || "burst";
    const count = kind === "blob" ? 7 : kind === "puff" ? 6 : kind === "spray" ? 16 : 18;
    for (let i = 0; i < count; i++) {
      const sz = kind === "blob" ? (i ? 2.5 : 5) : kind === "puff" ? 3 + rand() * 3 : 1.5 + rand() * 2;
      const color = kind === "puff" ? (i % 3 === 2 ? "#6e6266" : i % 2 ? "#ffd060" : "#ff8a2a") : PLACEHOLDER_OIL[i % PLACEHOLDER_OIL.length];
      const d = drop(sz, color, z);
      d.dataset.slot = r.slot;
      const a = kind === "burst" ? -Math.PI / 2 + (rand() - 0.5) * 1.6 : kind === "spray" ? Math.PI * (r.face === "r" ? 0.15 : 0.85) + (rand() - 0.5) * 2.4 : (r.face === "r" ? -0.35 : Math.PI + 0.35) + (rand() - 0.5) * 0.6; // puff: out of her mouth, up and her way (face, default "l")
      const v = kind === "burst" ? 50 + rand() * 60 : kind === "spray" ? 25 + rand() * 45 : 14 + rand() * 16;
      r.parts.push({ d, sz, vx: Math.cos(a) * v, vy: Math.sin(a) * v, lag: i * 35 });
    }
  };
  const tickSlot = (r, t) => {
    const age = t - r.t;
    const life = r.ms || (r.path ? r.path.ms : r.strip ? r.strip.n * r.strip.ms : 600);
    if (age >= life) { r.done = true; for (const p of r.parts) p.d.remove(); if (r.strip) r.strip.node.remove(); return; }
    if (r.strip) {
      const { node, n, ms, anchor, size } = r.strip;
      const frame = r.path ? Math.floor(age / ms) % n : Math.min(n - 1, Math.floor(age / ms));
      const at = r.path ? lob(r.path, Math.min(1, age / r.path.ms)) : r.at;
      node.style.left = pct(at[0] - anchor[0], "x"); node.style.top = pct(at[1] - anchor[1], "y");
      node.style.backgroundPosition = `${n > 1 ? (frame / (n - 1)) * 100 : 0}% 0`;
      node.dataset.frame = String(frame + 1);
      void size;
      return;
    }
    const s = age / 1000;
    for (const p of r.parts) {
      if (r.path) { // the blob and its trailing drips follow the lob
        const u = Math.max(0, Math.min(1, (age - p.lag) / r.path.ms));
        const [x, y] = lob(r.path, u);
        put(p.d, x, y + (p.lag ? 1 : 0), p.sz);
        p.d.style.opacity = u >= 1 ? "0" : "1";
        continue;
      }
      const g = r.placeholder === "puff" ? -18 : 160; // puffs rise, oil falls
      const x = r.at[0] + p.vx * s, y = r.at[1] + p.vy * s + 0.5 * g * s * s;
      put(p.d, x, y, p.sz * (r.placeholder === "puff" ? 1 + s * 2 : 1));
      p.d.style.opacity = String(Math.max(0, 1 - age / life));
    }
  };
  // sway: a damped pendulum, one sum of kicks
  const sw = cs.sway;
  const swayNode = () => sw && [...world.querySelectorAll("img.cast")].find((n) => (n.dataset.file || "").startsWith(sw.match));
  const swayDeg = (t) => (sw ? sw.kicks.reduce((sum, [tk, deg]) => (t < tk ? sum : sum + deg * Math.exp(-(t - tk) / (sw.decay || 900)) * Math.sin((2 * Math.PI * (t - tk)) / (sw.period || 1300))), 0) : 0);
  const kicked = new Set();
  let recoilNode = null, hitDone = false;
  return {
    tick(t) {
      for (const r of runs) { if (r.done || t < r.t) continue; if (!r.started) start(r); tickSlot(r, t); }
      if (cs.hit !== undefined && !hitDone && t >= cs.hit) {
        hitDone = true;
        if (cs.cueOnHit) ui.cueAt = { line: currentLine(), t: performance.now() };
      }
      const rc = cs.recoil;
      if (rc && t >= rc.t) {
        recoilNode = recoilNode || world.querySelector(`img.cast[data-spot="${rc.spot}"]`);
        const u = Math.min(1, (t - rc.t) / rc.ms), k = u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.75;
        if (recoilNode) recoilNode.style.translate = u >= 1 ? "" : `${pct(rc.px[0] * k, "x")} ${pct(rc.px[1] * k, "y")}`;
      }
      if (sw) {
        sw.kicks.forEach(([tk], i) => { if (t >= tk && !kicked.has(i)) { kicked.add(i); if (sw.creak) playCue(sw.creak); } });
        const n = swayNode();
        if (n) {
          n.style.transformOrigin = "50% 0"; n.style.rotate = `${swayDeg(t).toFixed(2)}deg`;
          // the drop on the hit, while the beat still shows the cage it started with (the line's own cue walk ends
          // in the same place when the scene re-renders after the beat)
          const d = sw.drop, u = d && t >= d.t ? Math.min(1, (t - d.t) / d.ms) : 0;
          if (d) n.style.translate = u ? `${pct(d.by[0] * u, "x")} ${pct(d.by[1] * u * u, "y")}` : "";
        }
      }
    },
    finish() {
      for (const n of nodes) n.remove();
      if (recoilNode) recoilNode.style.translate = "";
      if (!sw) return;
      // let the pendulum die out after the beat (the cast ticker re-finds the cage after the next render)
      const t1 = performance.now() - cs.ms;
      const end = Math.max(...sw.kicks.map(([tk]) => tk)) + 4 * (sw.decay || 900);
      ui.sway = { tick() { const t = performance.now() - t1; const n = [...document.querySelectorAll(".world img.cast")].find((x) => (x.dataset.file || "").startsWith(sw.match)); if (t >= end) { if (n) n.style.rotate = ""; ui.sway = null; return; } if (n) { n.style.transformOrigin = "50% 0"; n.style.rotate = `${swayDeg(t).toFixed(2)}deg`; } } };
      const step = () => { if (!ui.sway) return; ui.sway.tick(); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    },
  };
}

function roomOf(state) {
  return ROOMS[state.room];
}

function render() {
  document.body.classList.toggle("hints", !!ui.hints);
  if (ui.screen === "title") {
    renderTitle();
    return;
  }
  titleIntro.played = false; // the fade plays again next time the title comes up
  const lineNow = currentLine();
  const state = shownState(ui.state, lineNow);
  const room = roomOf(state);
  const atEndOfQueue = !lineNow || ui.index >= ui.queue.length - 1;
  const choosing = state.mode === "choice" && atEndOfQueue && ui.queue.length > 0;
  const ended = state.mode === "end" && atEndOfQueue;

  app.replaceChildren();
  castNodes.clear();
  const cabinet = el("div", "cabinet");
  const head = el("header", "top");
  head.append(
    el("div", "brand", "RADIOACTIVE ROOSTER"),
    el("span", "beta", "BETA"),
    el("div", "room", room.name),
    artToggle(),
    button("Menu", "ghost", () => {
      ui.menu = !ui.menu;
      render();
    }),
  );
  cabinet.append(head);

  const view = roomView(room, state.flags);
  const stage = el("div", `stage art-${artMode()}`);
  if (view.state) stage.dataset.view = view.state;
  // The world layer (plate, meters, actors, foreground cutouts) has its own z order keyed by feet y; HUD sits above.
  const world = el("div", "world");
  stage.append(world);
  const plate = el("img", "plate");
  plate.alt = "";
  mount(plate, view.plate);
  world.append(plate);
  if (room.sign) world.append(neonSign(room.sign, state));
  if (room.vat) world.append(vat(room.vat, state));
  const realPlate = !artUrl(view.plate).startsWith("art/placeholders/");

  const hidePose = lineNow && lineNow.big;
  const tint = spriteFilter({ spriteTint: view.spriteTint }); // per-room (or per-plate-state) sprite tint, "" (off) unless set
  // Poses: the legacy [left, top, width] box (crow, gate squat), or a seated sprite { sprite, x, seat, via } whose seat
  // row (manifest `seat`) sits exactly on the rail line `seat`, with a one-beat `via` frame on sitting down and standing up.
  let poseCfg = state.pose && room.poseAt && room.poseAt[state.pose];
  // A seat he isn't at yet (clicked from across the yard): he walks to the foot of the rail first, then sits. No warp.
  let poseWalk = false;
  if (poseCfg && !Array.isArray(poseCfg) && room.hero && hero.room === room.id && ui.poseShown !== `${room.id}:${state.pose}`) {
    const sy = poseCfg.standY || hero.y;
    if (Math.hypot(hero.x - poseCfg.x, hero.y - sy) > 3 && !(hero.poseTry > 2)) {
      if (!(hero.walking && hero.poseTarget === state.pose)) {
        walkTo(room, poseCfg.x, sy);
        hero.poseTarget = state.pose;
        hero.poseTry = (hero.poseTry || 0) + 1; // never stuck walking: after a blocked try or two he just sits
        hero.onArrive = () => { hero.poseTarget = null; render(); };
      }
      poseWalk = true;
      poseCfg = null;
    } else hero.poseTry = 0;
  }
  if (!hidePose && poseCfg) {
    const pose = el("img", "pose");
    pose.alt = "";
    if (Array.isArray(poseCfg)) {
      pose.style.left = pct(poseCfg[0], "x");
      pose.style.top = pct(poseCfg[1], "y");
      pose.style.width = pct(poseCfg[2], "x");
      mount(pose, state.pose === "crow" ? "sprite-crow.png" : "sprite-squat.png");
    } else {
      const fresh = ui.poseShown !== `${room.id}:${state.pose}`;
      // he sits facing the way he came at the rail (approach direction), and keeps that facing until he stands up
      if (fresh) ui.seatFace = poseCfg.front && hero.room !== room.id ? null : hero.face === "r" || hero.face === "l" ? hero.face : hero.x <= poseCfg.x ? "r" : "l";
      seatSprite(pose, poseCfg, seatFrame(room, poseCfg, fresh ? "hop" : "sit"));
      if (fresh && poseCfg.hop) setTimeout(() => { if (pose.isConnected) seatSprite(pose, poseCfg, seatFrame(room, poseCfg, "sit")); }, POSE_BEAT_MS);
    }
    if (tint) pose.style.filter = tint;
    world.append(pose);
  }
  const wasSeated = !state.pose && !poseWalk && ui.poseShown && ui.poseShown.startsWith(`${room.id}:`) ? ui.poseShown.slice(room.id.length + 1) : null;
  ui.poseShown = state.pose && poseCfg ? `${room.id}:${state.pose}` : null;

  if (room.hero && !hidePose && (!state.pose || poseWalk)) {
    heroSync(room);
    const node = el("img", "hero");
    node.alt = "";
    const seat = wasSeated && room.poseAt && room.poseAt[wasSeated];
    if (seat && !Array.isArray(seat) && seat.hop) {
      // stand-up beat: the in-between frame on the rail, then he's on his feet at the foot of the fence
      const area = heroArea(room);
      [hero.x, hero.y] = area ? clampToArea(area, seat.x, seat.standY || hero.y) : [seat.x, hero.y];
      hero.tx = hero.x; hero.ty = hero.y; hero.path = []; hero.face = ui.seatFace || "front";
      const beat = el("img", "pose");
      beat.alt = "";
      seatSprite(beat, seat, seatFrame(room, seat, "hop"));
      if (tint) beat.style.filter = tint;
      world.append(beat);
      node.style.visibility = "hidden";
      setTimeout(() => { beat.remove(); node.style.visibility = ""; }, POSE_BEAT_MS);
    }
    placeHero(node, room);
    if (tint) node.style.filter = tint;
    world.append(node);
  }

  // Plate overlays: small cutouts that belong to the scenery but change with the story (the ribbon on its nail, the
  // spoon and stub on the nest shelf). Painted over the plate, under every actor; shown while their when/whenNot hold.
  const fxPop = realPlate && fxNode(state);
  if (fxPop) world.append(fxPop);
  world.classList.toggle("flashback", !!(lineNow && lineNow.flashback)); // Oct 21 items 15/20
  const fb = flashFade(lineNow); // beta v17 item 6: dissolve into and out of the flashback, never a hard cut
  if (fb.sepia) { world.classList.add(`flash-${fb.sepia}`); world.style.setProperty("--flash-delay", fb.delay); }
  // Push C PLACEHOLDER colour shift: dusk blue -> deep night -> hot-oil red at the Pavilion, one driver with the music
  if (ui.nightShift) {
    const tint = nightTint(nightOf(state.room, state.night));
    const wash = el("div", "night-tint");
    wash.style.backgroundColor = tint;
    world.append(wash);
    const nightTag = el("div", "night-tag", "PLACEHOLDER tint");
    world.append(nightTag);
  }
  if (fb.kind === "past") world.append(flashbackLayer(lineNow.flashStep, fb.past === "in" ? fb.delay : null));
  else if (fb.past === "out") world.append(flashbackLayer(5, fb.delay, true)); // the past Pavilion dissolves back to the room
  // Oct 23 item 31: a new room fades in (never a black flash while its art loads), and its neighbours' plates preload
  if (ui.shownRoom !== state.room) {
    if (ui.shownRoom) stage.classList.add("fadein");
    ui.shownRoom = state.room;
    preloadNeighbours(room, state);
  }
  // Oct 21 item 4: inventory Look holds the item up close in his gloves at the bottom of the screen
  if (lineNow && lineNow.closeup && !lineNow.big && ui.closeupDismissed !== lineNow) {
    const box = el("div", "closeup");
    const gloves = el("img", "closeup-gloves"); gloves.alt = ""; placeAt(gloves, "fx/closeup-gloves", [70, 103]);
    const held = el("img", "closeup-item"); held.alt = ""; mount(held, lineNow.closeup);
    held.style.left = pct(136, "x"); held.style.top = pct(78, "y"); held.style.width = pct(48, "x");
    box.append(gloves, held);
    world.append(box);
  }
  if (room.overlays && realPlate) {
    for (const o of room.overlays) {
      // holdCues: a prop stays on screen while a cued line still plays it out (the bell until Ned has walked over)
      if (!visible(state, o) && !(o.holdCues && lineNow && o.holdCues.includes(lineNow.cue))) continue;
      if (o.signPart && !!signParts(state)[o.signPart] !== !!o.whenLit) continue; // club sign: a dead patch only while its part is dark, a whenLit patch only once it's lit
      const node = el("img", "overlay");
      node.alt = "";
      node.dataset.id = o.art;
      placeAt(node, o.art, o.at || (assetInfo(o.art) && assetInfo(o.art).at) || [0, 0]);
      if (o.z) node.style.zIndex = occluderZ(o.z); // a foreground overlay (the Pavilion crowd): over actors whose feet are above z
      world.append(node);
    }
  }

  if (room.cast && (ui.cast || realPlate)) {
    const shown = new Set(spotsFor(state).map((s) => s.id));
    for (const c of room.cast) {
      if (c.spot && !shown.has(c.spot)) continue;
      if (!visible(state, c)) continue;
      const node = el("img", "cast");
      node.alt = "";
      node.dataset.who = c.sprite;
      if (c.spot) node.dataset.spot = c.spot;
      node.style.zIndex = actorZ(c.at[1]);
      if (tint) node.style.filter = tint;
      castNodes.set(node, c);
      placeCast(node, c, performance.now());
      world.append(node);
    }
  }

  pavilionVeil(state, world);

  // Walk-behind: foreground cutouts of this plate (posts, cart, booth, bucket). Appended after the actors so a
  // tie goes to the scenery; see walk.js behind(). Only over real art (cutouts are cut from the pixel plates).
  if (room.occluders && realPlate) {
    for (const o of room.occluders) {
      const id = occluderFile(o, view.plate, state.flags);
      if (!assetInfo(id)) continue;
      // A sloped object (the rooftop hatch, seen corner-on) has an `edge`: one node, wholly over or under him by his
      // feet against that edge (edgeZ, re-checked every step in placeHero).
      const node = el("img", "fg");
      node.alt = "";
      node.dataset.id = o.id;
      node.dataset.base = occluderBase(o, view.plate);
      node.style.zIndex = o.edge ? edgeZ(o) : occluderZ(occluderBase(o, view.plate));
      if (o.edge) node.dataset.edge = "1";
      mount(node, id);
      world.append(node);
    }
  }

  if (lineNow && lineNow.big) {
    const bang = el("div", "pah", "PAH-KAW!!!");
    stage.append(bang);
    const crow = el("img", "crow-flash");
    crow.alt = "";
    mount(crow, "sprite-crow.png");
    stage.append(crow);
  }

  if (state.mode !== "choice") {
    for (const spot of spotsFor(state)) {
      const hit = el("button", `spot${ui.spots ? " spotted" : ""}`);
      hit.type = "button";
      hit.style.left = pct(spot.rect[0], "x");
      hit.style.top = pct(spot.rect[1], "y");
      hit.style.width = pct(spot.rect[2], "x");
      hit.style.height = pct(spot.rect[3], "y");
      hit.dataset.id = spot.id;
      hit.setAttribute("aria-label", preview(state, spot));
      // Hover preview goes to the sentence line (LucasArts style), never into the caption: the reply in #caption
      // only changes on a click/tap or when the queue advances.
      hit.addEventListener("pointerenter", () => setSentence(preview(state, spot)));
      hit.addEventListener("pointerleave", () => setSentence(null));
      hit.addEventListener("click", () => {
        if (ui.cutscene) return;
        if (spot.id !== "cutout") standUp(room); // item 1: out of the gate squat before he walks anywhere
        const now = ui.state;
        const action = { t: "hotspot", id: spot.id };
        const lastAct = { spot: spot.id, verb: now.pending ? "item" : now.verb };
        // Oct 23 item 40: some things he throws from where he stands (the hot sauce into the vat): no walk
        if (!room.hero || (now.pending && (spot.tossItems || []).includes(now.pending))) {
          cancelPendingAct();
          ui.lastAct = lastAct;
          dispatch(action);
          return;
        }
        // beside it, not in it (js/walk.js standFor): the side he comes from, facing the thing; exits keep their point
        heroSync(room);
        const castIds = new Set((room.cast || []).filter((c) => !c.when || now.flags[c.when]).map((c) => c.spot));
        const avoid = spotsFor(now).filter((s) => castIds.has(s.id) && s.id !== spot.id).map((s) => s.core || s.rect);
        const st = standFor(room, spot, { walk: heroArea(room), from: [hero.x, hero.y], avoid });
        const [sx, sy] = st ? [st.x, st.y] : spot.stand || [spot.rect[0] + spot.rect[2] / 2, spot.rect[1] + spot.rect[3]];
        // Oct 23 item 35: he reaches his mark first, then the action (and its line and cutscene) plays
        walkThen(room, sx, sy, st && st.face, action, lastAct);
      });
      // Arlong: double-click an edge exit to go straight through, whatever verb is up (no nav words needed)
      if (spot.exit) hit.addEventListener("dblclick", () => {
        if (ui.state.mode === "choice" || ui.cutscene) return;
        dispatch({ t: "go", id: spot.id });
      });
      stage.append(hit);
    }
  }

  // Oct 23 item 30: holding an item (or looking), click Rooster himself
  // (under the hotspots in the stacking order: where he stands in front of one, the hotspot wins)
  if (state.mode !== "choice" && !ended && room.hero && !state.pose && state.pending) {
    const me = el("button", "spot self");
    me.type = "button";
    me.dataset.id = "self";
    me.setAttribute("aria-label", state.pending ? `Use the ${itemOf(state, state.pending).name} on Rooster` : "Look at Rooster");
    me.addEventListener("pointerenter", () => setSentence(me.getAttribute("aria-label")));
    me.addEventListener("pointerleave", () => setSentence(null));
    me.addEventListener("click", () => { if (ui.cutscene) return; cancelPendingAct(); dispatch({ t: "self" }); });
    placeSelf(me, room);
    if (world.parentNode === stage) world.after(me); else stage.prepend(me);
  }
  // Oct 23 item 29: click anywhere on the floor and he walks there (SCUMM); blocked, he gets as close as he can
  stage.addEventListener("click", (ev) => {
    if (ev.target !== stage || ui.cutscene || !room.hero || ui.state.mode === "choice" || ui.state.mode === "end") return;
    const r = world.getBoundingClientRect(); // the scene box (the stage adds a frame border)
    if (!r.width) return;
    standUp(room); // item 1: a click off the gate cutout stands him up and walks him there (he used to stay crouched)
    if (ui.state.pose) return; // the rail seat keeps its own way down (its spots)
    cancelPendingAct();
    walkTo(room, ((ev.clientX - r.left) / r.width) * SCENE.w, ((ev.clientY - r.top) / r.height) * SCENE.h);
  });

  // Talking head sits in the dialogue row under the scene (SCUMM-style), never over the art.
  // a narration line can carry her plate (the Pavilion whisk line), so her portrait is up while the smoke clears
  const speakerFile = lineNow && (lineNow.speaker || (lineNow.plate && lineNow.plate.portrait));
  const heroFile = HERO[state.mood] || HERO.talk;
  let face;
  if (speakerFile && !speakerFile.includes("rooster")) {
    const voiceOnly = speakerFile.startsWith("voice:");
    face = el("div", `speaker${voiceOnly ? " voice" : ""}${lineNow.thought ? " thinking" : ""}`);
    // lineNow.plate (js/logic.js plates): her lines before "I'm the Cock Gobbler" read "Hattie" (smoke-hidden portrait
    // while the smoke is up, the clear portrait the moment it clears), same voice id
    const plateName = (lineNow.plate && lineNow.plate.name) || NAMES[speakerFile] || "";
    let plateFace = (lineNow.plate && lineNow.plate.portrait) || speakerFile;
    const plateFallback = lineNow.plate && lineNow.plate.fallback;
    if (plateFallback && !artUrl(plateFace)) plateFace = plateFallback;
    const smoky = !voiceOnly && lineNow.plate && lineNow.plate.smoke && pavVeilUp() && artUrl("portrait/hattie-smoke");
    if (smoky) {
      const node = smokePlateNode(plateFace, plateFallback);
      node.setAttribute("aria-label", plateName || "Speaker");
      face.append(node);
    } else if (!voiceOnly) {
      const img = el("img");
      img.alt = plateName || "Speaker";
      mount(img, plateFace, plateFallback || null);
      face.append(img);
    }
    face.append(el("div", "who", `${plateName}${lineNow.thought ? " (thinking)" : ""}`));
  } else {
    face = el("div", "bust");
    const bustImg = el("img");
    bustImg.alt = "Radioactive Rooster";
    mount(bustImg, heroFile);
    face.append(bustImg);
    talkFlap(face, lineNow);
  }

  if (state.mode === "choice" && state.choice && state.choice.set === "crow") {
    const gauge = el("div", "oil-gauge");
    gauge.setAttribute("aria-label", `Oil heat ${state.heat || 0} of ${maxHeat(state)}`);
    const max = maxHeat(state);
    for (let i = max - 1; i >= 0; i -= 1) gauge.append(el("span", i < (state.heat || 0) ? "hot" : ""));
    gauge.append(el("b", "", "OIL"));
    stage.append(gauge);
  }

  if (ended && state.ending && ENDINGS[state.ending]) {
    stage.append(cover(ENDINGS[state.ending]));
    // optional voice for the comic panels, once per ending shown (audio/in/voice/<id>, same ids as dialogue)
    if (ui.endVoiced !== state.ending) {
      ui.endVoiced = state.ending;
      const panels = (ENDINGS[state.ending].panels || []).map(panelVoice);
      playVoiceSeq(panels.map((p) => p.id));
      if (panels.some((p) => p.cluck)) setTimeout(() => playCue("henny-cluck"), 900);
    }
  } else ui.endVoiced = null;

  cabinet.append(stage);

  const caption = el("button", "caption");
  caption.type = "button";
  caption.id = "caption";
  caption.textContent = lineNow ? (lineNow.rap ? lineNow.text.split(" / ").join("\n") : lineNow.text) : "The night is waiting.";
  if (lineNow && lineNow.thought) caption.classList.add("thought");
  if (lineNow && lineNow.rap) caption.classList.add("rap"); // TODO(audio): start/stop Rocco's boom-bap loop here (sound on hold)
  // Arlong: make it obvious that clicking the text moves the talk on (Hattie's scene especially)
  const more = lineNow && ui.queue.length && ui.index < ui.queue.length - 1;
  if (more) {
    caption.classList.add("more");
    caption.append(el("span", "advance", `click to continue \u25BC ${ui.index + 1}/${ui.queue.length}`));
  }
  caption.addEventListener("click", advance);
  const talkRow = el("div", "talkrow");
  talkRow.append(face, caption);
  cabinet.append(talkRow);

  if (choosing) {
    const choices = el("div", "choices");
    for (const option of choicesFor(state)) {
      const b = button(option.locked ? "???" : option.say, `choice${option.locked ? " locked" : ""}`, () => dispatch({ t: "choice", id: option.id }));
      b.dataset.id = option.id;
      choices.append(b);
    }
    cabinet.append(choices);
  }

  if (ended) {
    const end = ENDINGS[state.ending] || {};
    // Every ending closes on the same old-comics hook (Usopp's placeholder until Issue 2 is decided), under the cover.
    const next = el("p", "next-issue");
    next.append(el("span", "ni-label", "NEXT ISSUE:"), document.createTextNode(` ${NEXT_ISSUE}`));
    cabinet.append(next);
    const row = el("div", "title-actions end-row");
    if ((end.rewind || end.retry) && state.checkpoint) {
      row.append(button(end.rewind ? "Rewind" : "Try the crow-down again", "end-btn rewind", () => dispatch({ t: "rewind" })));
    }
    row.append(button("Back to the title", "end-btn", () => {
      ui.screen = "title";
      ui.queue = [];
      render();
    }));
    cabinet.append(row);
  }

  // Sentence line: what a click would do ("Take the bucket."), between the caption and the verbs.
  const sentence = el("div", "sentence");
  sentence.id = "sentence";
  sentence.setAttribute("aria-live", "off");
  sentence.textContent = sentenceIdle(state);
  cabinet.append(sentence);

  const verbs = el("div", "verbs");
  VERBS.forEach(([id, label], index) => {
    const verb = button(`${index + 1} ${label}`, state.verb === id ? "on" : "", () => {
      if (state.mode === "choice") return;
      dispatch({ t: "verb", verb: id });
    });
    verb.setAttribute("aria-pressed", state.verb === id ? "true" : "false");
    verbs.append(verb);
  });
  cabinet.append(verbs);

  const exits = el("nav", "exits");
  for (const exit of room.exits || []) {
    exits.append(button(exit.label, "exit", () => {
      if (state.mode === "choice") return;
      dispatch({ t: "go", id: exit.spot });
    }));
  }
  cabinet.append(exits);

  const pending = el("div", "pending");
  pending.textContent = state.pending ? `Use the ${itemOf(state, state.pending).name} on...` : "";
  cabinet.append(pending);

  const inv = el("div", "inv");
  if (!state.inv.length) inv.append(el("div", "empty", "Pockets empty."));
  for (const id of state.inv) {
    const item = itemOf(state, id);
    const chip = el("button", `item${state.pending === id ? " held" : ""}`);
    chip.dataset.id = id;
    chip.type = "button";
    const img = el("img");
    img.alt = "";
    mount(img, item.icon);
    chip.append(img, el("span", "", item.name));
    chip.addEventListener("click", () => {
      if (state.mode === "choice") return;
      dispatch({ t: "item", id });
    });
    inv.append(chip);
  }
  cabinet.append(inv);

  if (ui.menu) cabinet.append(menuPanel());
  app.append(cabinet);
  setTension(nightOf(state.room, state.night));
  // Beta v17: decode the line-tagged themes a room ahead, so they start on their line, not a decode later
  if (state.room === "wkuk") preloadTheme(MOMENT_THEMES["hattie-call"]); // the geiger slot's phone call
  if (state.inv.includes("half") && state.inv.includes("stub")) preloadTheme(MOMENT_THEMES.ticket); // he can join them now
  playBed(state.room, musicMoment(state, ended));
}

// The Pavilion's music (Arlong 2026-10-26, js/audio.js MOMENT_THEMES). While her smoke veil is up the midway theme
// plays on (she's still Hawkeye Hattie in the smoke). Her first reveal: Brook's acid club-theme ("gobbler") starts the
// instant the stage smoke is gone (the veil: "whisk" line; smokeVeil's "done" frame, the same moment her portrait cuts
// to portrait/gobbler), never before. It carries her speech and the sign cut to her lit club; the chase-theme takes the
// showdown from the cut back to the stage (the signCut line) through the crow-down, the glide and the cage; every
// Pavilion ending cover (all five endings) goes back to the acid theme, the finale's own music. Saves already past
// the unmasking get the right one straight away.
function musicMoment(state, ended) {
  // beta v17 item 7: a line's own music moment (Hattie's radio call, the joined ticket), and Hattie's phone choice
  const cur = currentLine();
  if (cur && cur.music && !ended) return cur.music;
  if (state.mode === "choice" && state.choice && state.choice.id === "phone") return "hattie-call";
  if (state.room !== "pavilion") return null;
  if (ended) return "gobbler";
  if (!state.flags.unmasked || (ui.pavVeil && !ui.pavVeil.cleared)) return null;
  const k = ui.queue.findIndex((l) => l.signCut);
  if (k >= 0 && (ui.index < k || (ui.index === k && (!ui.queue[k].played || beatActive())))) return "gobbler";
  return "chase";
}
function syncMusic(fade) {
  const state = ui.state;
  if (!state) return;
  const lineNow = currentLine();
  const ended = state.mode === "end" && (!lineNow || ui.index >= ui.queue.length - 1);
  playBed(state.room, musicMoment(state, ended), fade);
}

// Push C PLACEHOLDER talk animation: while Rooster's own spoken line (a quote in his caption) is fresh, the bust flaps
// between frame A and frame B (portrait/rooster-talk-b when that file lands; until then a dark mouth wedge). He has no
// front eyes (canon: he sees through the beak nostrils), so the flap only touches the beak.
const FLAP_MS = 260;
function talkFlap(face, lineNow) {
  if (!lineNow || lineNow.thought || !/["“]/.test(lineNow.text || "")) return;
  const talkMs = Math.min(4200, Math.max(900, (lineNow.text || "").length * 38));
  const age = performance.now() - ui.lineAt;
  if (age >= talkMs) return;
  face.classList.add("talking");
  face.style.setProperty("--flaps", String(Math.ceil(talkMs / FLAP_MS)));
  face.style.setProperty("--flap-delay", `${-Math.round(age)}ms`);
  const b = artUrl("portrait/rooster-talk-b");
  if (b) {
    const img = el("img", "talk-b");
    img.alt = "";
    img.src = b;
    face.append(img);
  } else face.classList.add("no-b");
  setTimeout(() => { if (ui.lineAt && performance.now() - ui.lineAt >= talkMs) document.querySelectorAll(".bust.talking").forEach((n) => n.classList.remove("talking")); }, talkMs - age + 20);
}

// Walking hero sprite for rooms with a `hero` entry. Purely visual: game logic and timing are unchanged.
// Two-frame walk (side idle / side walk), faces the way he moves, front idle when he enters a room.
const HERO_SPEED = 70; // logical px per second
const STEP_MS = 160;
const FOOTSTEP_MS = 390; // one footfall (Brook's README: 380-400 ms; Arlong Oct 27: 390)
const hero = { room: null, view: null, x: 0, y: 0, tx: 0, ty: 0, face: "front", walking: false, last: 0, t: 0, stuck: 0, stepClock: 0, stepped: false, raf: 0 };

function heroArea(room) {
  return roomView(room, (ui.state && ui.state.flags) || {}).walk;
}

// Frame size: depth rooms pick the 4 px bucket for his feet y (js/walk.js depthHeight), others the fixed height.
function heroSize(room) {
  return room.hero.depth ? `-h${depthHeight(room.hero, hero.y)}` : sizeTag(room.hero);
}

function heroFrame(room) {
  const size = heroSize(room);
  // room.heroHold: { flag, sprite, size } -> his side frame while he holds something (the Yolk at the finish)
  const hold = room.heroHold && ui.state && ui.state.flags[room.heroHold.flag];
  if (hold) return `sprite/${room.heroHold.sprite}-${hero.face === "l" ? "l" : "r"}${room.heroHold.size || size}`;
  if (hero.face === "front") return `sprite/rooster-front${size}`;
  const stride = hero.walking && Math.floor(hero.t / STEP_MS) % 2 === 1;
  return `sprite/rooster-${stride ? "walk" : "side"}-${hero.face}${size}`;
}

// Per-room sprite size: `height: N` picks the frames cut at N px tall (`-hN`), `half: true` the half set.
function sizeTag(entry) {
  if (entry.height) return `-h${entry.height}`;
  return entry.half ? "-half" : "";
}

function heroSync(room) {
  const view = roomView(room, (ui.state && ui.state.flags) || {}).state;
  if (hero.room === room.id) {
    if (hero.view !== view) {
      // Background state changed (e.g. rope opened): keep him where he is, but inside the new walk area.
      hero.view = view;
      const area = heroArea(room);
      if (area) [hero.x, hero.y] = clampToArea(area, hero.x, hero.y);
    }
    return;
  }
  // room.hero.from[<previous room>]: where he comes in from that room, and the few steps he walks in (Oct 21 note 5)
  const entry = room.hero.from && hero.room && room.hero.from[hero.room];
  hero.room = room.id;
  hero.view = view;
  [hero.x, hero.y] = entry ? entry.at : room.hero.at;
  const area = heroArea(room);
  if (area) [hero.x, hero.y] = clampToArea(area, hero.x, hero.y);
  hero.tx = hero.x;
  hero.ty = hero.y;
  hero.face = "front";
  hero.walking = false;
  // New room: drop the old room's walk loop and footstep clock, so nothing carries over the cut (Chopper N1)
  cancelAnimationFrame(hero.raf);
  hero.stepClock = 0;
  if (entry && entry.walk) setTimeout(() => { if (hero.room === room.id && !hero.walking && ui.state && ui.state.room === room.id && !ui.state.pose) walkTo(room, ...entry.walk); }, 0);
}

// A seated pose: the sprite's `seat` row (manifest) lands on the rail line `cfg.seat`, centred on `cfg.x`.
// Frames (tools/sprites/cut_sit.py): `sit` / `hop` side frames per facing (-r / -l), `front` when there's no facing,
// at his depth size for the foot of the rail (`standY`).
const POSE_BEAT_MS = 260;
function seatFrame(room, cfg, kind) {
  const size = room.hero && room.hero.depth ? `-h${depthHeight(room.hero, cfg.standY || room.hero.at[1])}` : sizeTag(room.hero || {});
  if (!ui.seatFace) return `${cfg.front || cfg.sit + "-r"}${size}`; // no hop either: he is simply sitting there
  // Beta v17 item 3 (Arlong Oct 27): on the rail he sits in the front-view puffed sit; the side hop (the way he came)
  // is only the one beat of getting up there and back down.
  if (kind === "sit" && cfg.front) return `${cfg.front}${size}`;
  return `${cfg[kind]}-${ui.seatFace}${size}`;
}
function seatSprite(node, cfg, sprite, room = ui.state && ROOMS[ui.state.room]) {
  let id = `sprite/${sprite}`;
  // never invisible: a frame the manifest doesn't know falls back to the front sit, then to his standing front frame
  const size = room && room.hero && room.hero.depth ? `-h${depthHeight(room.hero, cfg.standY || room.hero.at[1])}` : "";
  const chain = [id, cfg.front && `sprite/${cfg.front}${size}`, `sprite/rooster-front${size}`].filter(Boolean);
  id = chain.find((k) => assetInfo(k)) || id;
  const info = assetInfo(id);
  const [, h] = info ? info.size : [28, 31];
  const seatRow = info && info.seat !== undefined ? info.seat : h;
  placeSprite(node, id, [cfg.x, cfg.seat + (h - seatRow)], chain[chain.length - 1]);
  node.style.zIndex = actorZ(cfg.seat);
}

// Sprites sit on their feet: `at` is the bottom-center point in logical px.
// Double-buffered frame swaps (Oct 21 note 1: Rooster vanished mid-walk on the roof). Frames lazy-load one at a time
// (no bulk preload: the rate-limit design), and swapping an <img> src to a frame that isn't loaded yet shows nothing
// until it arrives. So while a sprite already shows a loaded frame, the next one loads off-screen first; the old frame
// keeps walking (moved, at its own size) until the new one is ready, then they swap in one step. One request per frame.
const frameReady = new Set();
const frameLoading = new Set();
function placeSprite(node, id, at, fallback = null) {
  node._want = [id, at, fallback];
  let showId = id;
  const shown = node.dataset.file;
  if (shown && shown !== id && node.complete && node.naturalWidth > 0) {
    const url = urlOf(id);
    if (!frameReady.has(url)) {
      showId = shown;
      if (!frameLoading.has(url)) {
        frameLoading.add(url);
        const pre = new Image();
        const done = () => {
          frameLoading.delete(url);
          frameReady.add(url); // loaded, or failed: mount's fallback chain takes it from here
          if (node.isConnected && node._want) placeSprite(node, ...node._want);
        };
        pre.onload = () => (pre.decode ? pre.decode().catch(() => {}).then(done) : done());
        pre.onerror = done;
        pre.src = url;
      } else {
        // another node is loading this frame; re-check shortly
        setTimeout(() => { if (node.isConnected && node._want && node._want[0] === id) placeSprite(node, ...node._want); }, 50);
      }
    }
  } else if (shown !== id) {
    frameReady.add(urlOf(id));
  }
  const info = assetInfo(showId);
  const [w, h] = info ? info.size : [48, 64];
  node.style.left = pct(at[0] - w / 2, "x");
  node.style.top = pct(at[1] - h, "y");
  node.style.width = pct(w, "x");
  if (node.dataset.file !== showId) mount(node, showId, showId === id ? fallback : null);
}

// Overlays and title cutouts: `at` is the top-left point in logical px, size from the manifest.
function placeAt(node, id, at) {
  const info = assetInfo(id);
  const [w] = info ? info.size : [16, 16];
  node.style.left = pct(at[0], "x");
  node.style.top = pct(at[1], "y");
  node.style.width = pct(w, "x");
  if (node.dataset.file !== id) mount(node, id);
}

/* ---------- Cast frames: idle, talk, cue poses, short walks and ambient loops ---------- */
// A cast entry: { sprite, at, height|half, spot?, when?, whenNot?,
//   talk?, voice?: speaker key(s) from SPEAKER, talkOn?: hotspot ids  -> talk/idle flap while that voice speaks,
//   cues?: { <line cue>: sprite | { walk: [frames], to: [x, y], end?: sprite } }  -> pose while a cued line shows,
//   frames?: [...], every?: ms  -> ambient loop (the yard roosters) }.
// Purely visual: game logic never reads it.
const castNodes = new Map();

function placeCast(node, c, now) {
  const line = currentLine();
  // a cutscene can start the line's cue at its own moment (sauce_toss: the chain release on the oil's hit), ui.cueAt
  const since = now - (ui.cueAt && ui.cueAt.line === line ? ui.cueAt.t : ui.lineAt);
  const { sprite, at } = castFrame(c, { line, since, now, lastAct: ui.lastAct, speakers: SPEAKER });
  placeSprite(node, `sprite/${sprite}${sizeTag(c)}`, at);
  node.style.zIndex = actorZ(at[1]);
}

// One light ticker for every animated cast member (loops, talk flaps, cue walks); static frames are left alone.
setInterval(() => {
  if (ui.screen !== "play" || !castNodes.size) return;
  const now = performance.now();
  for (const [node, c] of castNodes) {
    if (!node.isConnected) continue;
    if (c.frames || c.talk || c.cues) placeCast(node, c, now);
  }
}, 80);

function placeHero(node, room) {
  placeSprite(node, heroFrame(room), [hero.x, hero.y], `sprite/rooster-front${heroSize(room)}`);
  node.style.zIndex = actorZ(hero.y);
  const me = document.querySelector(".stage .spot.self");
  if (me) placeSelf(me, room);
  // edge occluders (the hatch) follow him: just over him while he's behind, just under him while he's in front
  for (const fg of document.querySelectorAll('.world img.fg[data-edge="1"]')) {
    const o = (room.occluders || []).find((x) => x.id === fg.dataset.id);
    if (o) fg.style.zIndex = edgeZ(o);
  }
}

function edgeZ(o) {
  return behindOccluder(o, hero.x, hero.y) ? actorZ(hero.y) + 1 : actorZ(hero.y) - 1;
}

// What the scene draws, which can lag the game state while a line plays it out (beta v17):
//   line.pose: a held pose for this line only (the gate cutout squat while the guard stamps); he stands back up when
//     the line ends, or straight away if a click sends him somewhere (standUp).
//   line.holdFlags (+ holdMs): those flags are drawn unset for the line (or its first holdMs), e.g. the Pavilion rope
//     stays up and locked until Pip's hand is on the padlock; then one re-render shows it, with the padlock click.
// Only the drawing: clicks, saves and the walk use ui.state.
function shownState(s, lineNow) {
  if (!s || !lineNow) return s;
  const pose = !s.pose && lineNow.pose && ui.poseDropped !== lineNow ? lineNow.pose : null;
  let held = lineNow.holdFlags ? lineNow.holdFlags.filter((f) => s.flags[f]) : [];
  if (held.length && lineNow.holdMs !== undefined) {
    const left = lineNow.holdMs - (performance.now() - ui.lineAt);
    if (left <= 0) held = [];
    else if (ui.holdTimer !== lineNow) {
      ui.holdTimer = lineNow;
      setTimeout(() => { if (currentLine() === lineNow) { playCue("click"); render(); } }, left + 10);
    }
  }
  if (!pose && !held.length) return s;
  const flags = { ...s.flags };
  for (const f of held) delete flags[f];
  return { ...s, flags, ...(pose ? { pose } : {}) };
}

// Beta v17 item 1 (Arlong Oct 27: stuck behind the fairground cutout; clicks off it played footsteps but he never
// moved). Root cause: the gate cutout sets the legacy squat pose ([left, top, width] in room.poseAt), and only a room
// change cleared it; while posed the floor click was ignored and a hotspot click walked his hidden sprite (footsteps,
// nothing on screen). A legacy pose is a held crouch, not a seat: any click that takes him somewhere stands him up
// first (logic action "stand", no line). He pops up where the squat was: his standing sprite takes over at his feet.
function standUp(room) {
  const s = ui.state;
  const lineNow = currentLine();
  if (lineNow && lineNow.pose && ui.poseDropped !== lineNow && !s.pose) { ui.poseDropped = lineNow; render(); return; }
  if (!s || !s.pose || !room.poseAt || !Array.isArray(room.poseAt[s.pose])) return;
  ui.state = act(s, { t: "stand" }).state;
  render();
}

/* ---------- Push A (Oct 24): walk first, then act; flashback layer; neighbour preload ---------- */
function cancelPendingAct() {
  ui.pendingAct = null;
  ui.actToken = (ui.actToken || 0) + 1;
  hero.onArrive = null;
}

function walkThen(room, x, y, face, action, lastAct) {
  cancelPendingAct();
  const token = ui.actToken;
  ui.pendingAct = action;
  const go = () => {
    if (ui.actToken !== token || ui.pendingAct !== action) return;
    ui.pendingAct = null;
    ui.lastAct = lastAct;
    dispatch(action);
  };
  hero.onArrive = go;
  walkTo(room, x, y, face);
  if (!hero.walking) { hero.onArrive = null; go(); } // already on his mark
}

function placeSelf(node, room) {
  const h = room.hero.depth ? depthHeight(room.hero, hero.y) : room.hero.height || 64;
  place(node, [hero.x - 0.3 * h, hero.y - h, 0.6 * h, h]);
}

// Oct 23 item 41: the stunt-night beats play on the Pavilion as it was (bg/pavilion-aged), the crowd gathering a row
// at a time, and in it, from the stunt night on, the silhouette of the man who rigged it (the mayor's muscle).
const FLASH_CROWD = [0, 168, 158, 148, 140, 136];
// Beta v17 item 6 (Arlong Oct 27: the joined-ticket flashback cut in abruptly, and the past Pavilion jumped over the
// room he's standing in). Each line is a fresh render, so the fades are CSS animations keyed to the line's first
// render with a negative delay (re-renders mid-line pick up where the fade is): the sepia eases in on the first
// flashback line and out after the last; the past Pavilion dissolves in over the sepia room, and back out to it.
const FLASH_FADE_MS = 900;
function flashKind(l) {
  if (!l || !l.flashback) return null;
  return l.flashStep >= 1 && l.flashStep <= 5 ? "past" : "sepia";
}
function flashFade(lineNow) {
  if (ui.fbLine !== lineNow) {
    ui.fbPrev = ui.fbLine === undefined ? null : flashKind(ui.fbLine);
    ui.fbLine = lineNow;
    ui.fbAt = performance.now();
  }
  const kind = flashKind(lineNow), prev = ui.fbPrev;
  const age = performance.now() - ui.fbAt;
  const out = { kind, sepia: null, past: null, delay: `${-Math.round(age)}ms` };
  if (age >= FLASH_FADE_MS) return out;
  if (kind && !prev) out.sepia = "in";
  if (!kind && prev) out.sepia = "out";
  if (kind === "past" && prev !== "past") out.past = "in";
  if (kind !== "past" && prev === "past") out.past = "out";
  return out;
}

function flashbackLayer(step, fadeDelay = null, fadeOut = false) {
  const layer = el("div", `flash-past${fadeDelay !== null ? (fadeOut ? " dissolve-out" : " dissolve-in") : ""}`);
  if (fadeDelay !== null) layer.style.animationDelay = fadeDelay;
  const bg = el("img", "flash-bg"); bg.alt = ""; mount(bg, "bg/pavilion-aged");
  const sil = el("img", "flash-sil"); sil.alt = "";
  placeSprite(sil, "sprite/stogie-sil-arms-r-h64", [262, 170]);
  sil.style.opacity = step >= 3 ? "1" : step === 2 ? "0.55" : "0";
  const crowd = el("img", "flash-crowd"); crowd.alt = ""; placeAt(crowd, "fg/pavilion--crowd", [0, FLASH_CROWD[step]]);
  layer.append(bg, sil, crowd);
  return layer;
}

const preloaded = new Set();
function preloadNeighbours(room, state) {
  const ids = new Set();
  for (const sp of room.spots || []) if (sp.exit && sp.go && sp.go.room) ids.add(sp.go.room);
  if (room.id === "midway") ids.add("pavilion");
  if (room.id === "pavilion") ids.add("midway");
  for (const id of ids) {
    if (!ROOMS[id]) continue;
    const url = urlOf(roomView(ROOMS[id], state.flags).plate);
    if (!url || preloaded.has(url)) continue;
    preloaded.add(url);
    const img = new Image();
    img.src = url;
  }
}

function walkTo(room, x, y, faceOnArrive = null) {
  if (!room || !room.hero) return;
  heroSync(room);
  hero.faceOnArrive = faceOnArrive; // turn to the thing he walked up to
  const area = heroArea(room);
  const wantY = y === undefined ? hero.y : y;
  if (area) {
    hero.path = findPath(area, [hero.x, hero.y], [x, wantY]); // waypoints around a hole (the rooftop hatch)
    [hero.tx, hero.ty] = hero.path.shift();
  } else {
    hero.path = [];
    const [lo, hi] = room.hero.walk || [0, SCENE.w];
    [hero.tx, hero.ty] = [Math.max(lo, Math.min(hi, x)), hero.y];
  }
  if (Math.hypot(hero.tx - hero.x, hero.ty - hero.y) < 2 && !(hero.path && hero.path.length)) {
    if (faceOnArrive && hero.face !== faceOnArrive) {
      hero.face = faceOnArrive; // already there: just turn
      const node = document.querySelector(".hero");
      if (node) placeHero(node, room);
    }
    return;
  }
  if (Math.abs(hero.tx - hero.x) >= 1) hero.face = hero.tx > hero.x ? "r" : "l";
  else if (hero.face === "front") hero.face = "r";
  if (hero.walking) return;
  hero.walking = true;
  hero.t = 0;
  // Each walk starts its own footstep beat: first step FOOTSTEP_MS in, nothing carried from the last walk (Chopper N1).
  hero.stepClock = 0;
  hero.stepped = false;
  hero.last = performance.now();
  // One walk loop only: a stopped walk (room change, cutscene end) can leave a frame queued that would run beside this one.
  cancelAnimationFrame(hero.raf);
  hero.raf = requestAnimationFrame(heroTick);
}

function heroTick(now) {
  const dt = Math.max(0, now - hero.last);
  hero.last = now;
  hero.t += dt;
  const room = ui.state && ROOMS[ui.state.room];
  if (!hero.walking || !room || !room.hero || hero.room !== room.id) {
    hero.walking = false;
    return;
  }
  const stepPx = (HERO_SPEED * dt) / 1000;
  const area = heroArea(room);
  const before = [hero.x, hero.y];
  [hero.x, hero.y] = area ? stepToward(area, before, [hero.tx, hero.ty], stepPx) : [hero.tx, hero.ty];
  const left = Math.hypot(hero.tx - hero.x, hero.ty - hero.y);
  const moved = Math.hypot(hero.x - before[0], hero.y - before[1]);
  if (moved >= stepPx * 0.05) hero.stuck = 0;
  if (left < 0.5 && hero.path && hero.path.length) {
    [hero.tx, hero.ty] = hero.path.shift(); // next leg of the route
    if (Math.abs(hero.tx - hero.x) >= 1) hero.face = hero.tx > hero.x ? "r" : "l";
  } else if (left < 0.5 || (dt > 0 && moved < stepPx * 0.05 && ++hero.stuck >= 3)) {
    // arrived, or really stuck against an edge (three ticks in a row: one slow frame, e.g. a tab hiccup, isn't a wall)
    hero.walking = false;
    hero.stuck = 0;
    // A walk too short for a full beat still gets one footfall as he plants (no silent short walks).
    if (!hero.stepped) { hero.stepped = true; playCue("footstep"); }
    if (hero.faceOnArrive) hero.face = hero.faceOnArrive;
    if (hero.onArrive) { const f = hero.onArrive; hero.onArrive = null; setTimeout(f, 0); }
  }
  const node = document.querySelector(".hero");
  if (node) placeHero(node, room);
  // Push C: a footstep every other walk frame while he moves
  hero.stepClock += dt;
  // Beta v17 (Arlong approved Brook's v2 steps, Oct 27): one single-step file every FOOTSTEP_MS, a relaxed noir stroll.
  // Its own clock, apart from STEP_MS (the walk animation frames are unchanged).
  // Carry the overshoot so frame rounding does not stretch the beat (60 fps rounded 390 up to 400).
  if (hero.walking && hero.stepClock >= FOOTSTEP_MS) { hero.stepClock = Math.min(hero.stepClock - FOOTSTEP_MS, FOOTSTEP_MS / 2); hero.stepped = true; playCue("footstep"); }
  if (hero.walking) hero.raf = requestAnimationFrame(heroTick);
}

function place(node, rect) {
  node.style.left = pct(rect[0], "x");
  node.style.top = pct(rect[1], "y");
  node.style.width = pct(rect[2], "x");
  node.style.height = pct(rect[3], "y");
}

// NED'S FEED & SEED neon: the ambient temptation meter. The unlit sign (dim bent-glass tubes, thin mounts) is painted
// into the room plate; each lit tube is one glow frame of fx/neon-<room> (tools/neon/paint_neon.py), switched on per
// temptation level like a SCUMM background state. Never labeled. The next tube to die flickers.
function neonSign(sign, state) {
  const info = assetInfo(sign.art);
  const node = el("div", `neon s${signLevel(state)}${info && info.scale === 1 ? " px" : ""}`);
  node.setAttribute("aria-hidden", "true");
  place(node, sign.rect);
  const now = signLetters(state);
  const level = signLevel(state);
  const next = level < 3 ? signLetters({ ...state, temptation: level + 1 }) : null;
  // only one tube flickers: the last lit letter that goes dark at the next level
  const dyingKey = next ? [...sign.frames].reverse().find((k) => k !== "hawk" && now[k].on && !next[k].on) : undefined;
  const n = sign.frames.length;
  const url = artUrl(sign.art);
  sign.frames.forEach((key, i) => {
    const on = key === "hawk" ? level >= 3 : now[key].on;
    if (!on) return;
    const dying = key === dyingKey;
    const tube = el("i", `neon-tube${dying ? " dying" : ""}`);
    tube.style.backgroundImage = `url("${url}")`;
    tube.style.backgroundSize = `100% ${n * 100}%`;
    tube.style.backgroundPosition = `0 ${n > 1 ? (i / (n - 1)) * 100 : 0}%`;
    node.append(tube);
  });
  return node;
}

// Pavilion vat bubbles: the hidden finale temptation meter. Simple animated overlay (art ids fx/vat-*).
function vat(rect, state) {
  const node = el("div", `vat v-${vatState(state)}`);
  node.setAttribute("aria-hidden", "true");
  place(node, rect);
  for (let i = 0; i < 14; i += 1) {
    const b = el("span", "bub");
    b.style.left = `${(i * 37) % 84 + 6}%`;
    b.style.bottom = `${8 + ((i * 29) % 50)}%`;
    b.style.animationDelay = `${((i * 0.37) % 1.6).toFixed(2)}s`;
    b.style.setProperty("--sz", `${9 + ((i * 7) % 10)}`); // unitless: css scales it to the vat (cqw)
    b.style.setProperty("--rise", `${14 + ((i * 13) % 26)}px`);
    node.append(b);
  }
  // TODO(audio): vat bubbling loop per state (sound on hold)
  return node;
}

// Comic-cover ending screen. end.splash: the Silver Age cover (comicCover); else the code-drawn cover.
function cover(end) {
  if (end.final) return finalCover(end);
  if (end.splash) return comicCover(end);
  const wrap = el("div", `cover tone-${end.tone}`);
  const page = el("div", "cover-page");
  page.append(el("div", "cover-series", end.series));
  page.append(el("div", "cover-title", end.title));
  if (end.stamp) page.append(el("div", "cover-stamp", end.stamp));
  page.append(el("div", "cover-art", end.art));
  page.append(el("div", "cover-blurb", end.blurb));
  if (end.credit) page.append(el("div", "cover-credit", end.credit));
  const strip = el("div", "cover-panels");
  for (const p of end.panels) {
    if (typeof p === "string") {
      strip.append(el("div", "panel", p));
    } else if (p.thought) {
      const panel = el("div", "panel");
      panel.append(el("div", "panel-who", `${p.thought} (thinking)`), el("div", "bubble thought", p.text));
      strip.append(panel);
    } else {
      const panel = el("div", "panel spoken");
      panel.append(el("div", "panel-who", `${p.say}, out loud. He can hear her.`), el("div", "bubble speech", p.text));
      strip.append(panel);
    }
  }
  page.append(strip);
  if (!end.retry) page.append(el("div", "cover-click", "*click.*"));
  wrap.append(page);
  return wrap;
}

// The approved painted cover as the whole final page, letterboxed to the stage; nothing code-drawn on top.
function finalCover(end) {
  const wrap = el("div", `cover final tone-${end.tone}`);
  const img = el("img", "cover-final");
  img.src = end.final;
  img.alt = `${end.series}: ${end.title} ${end.art}`;
  wrap.append(img);
  if (!end.retry) wrap.append(el("div", "cover-click", "*click.*"));
  return wrap;
}

// Silver Age cover (Arlong 2026-10-19): series banner + price/issue corner box, the splash with the issue title and a
// blurb burst over it, then a strip of inset panels: painted art (or Ben-Day dots), a yellow narration caption, a
// speech or thought bubble, and an editor's note when Henny speaks out loud.
function comicCover(end) {
  const wrap = el("div", `cover comic tone-${end.tone}`);
  const page = el("div", "cover-page comic");
  const top = el("div", "cc-banner");
  const corner = el("div", "cc-corner");
  corner.append(el("div", "cc-price", "10¢"), el("div", "cc-issue", "No. 1"));
  top.append(corner, el("div", "cc-series", end.series));
  page.append(top);
  const splash = el("div", "cc-splash");
  const img = el("img", "cc-splash-art");
  img.alt = end.art;
  mount(img, end.splash);
  splash.append(img, el("div", "cc-title", end.title), el("div", "cc-burst", end.blurb));
  if (end.credit) splash.append(el("div", "cc-credit", end.credit));
  page.append(splash);
  const strip = el("div", "cc-panels");
  for (const raw of end.panels) {
    const p = typeof raw === "string" ? { text: raw } : raw;
    const panel = el("div", `cc-panel${p.art ? "" : " dots"}`);
    if (p.art) {
      const art = el("img", "cc-panel-art");
      art.alt = "";
      mount(art, p.art);
      panel.append(art);
    }
    if (p.say || p.thought) {
      const who = p.say || p.thought;
      panel.append(el("div", `cc-bubble ${p.thought ? "thought" : "speech"} noted`, p.text));
      panel.append(el("div", "cc-note", p.say ? `*${who}, out loud. He can hear her now! -Ed.` : `*${who}, thinking. -Ed.`));
    } else {
      // a quote in the narration is spoken: it goes in a bubble, the rest stays in the caption
      const m = p.text.match(/"([^"]+)"/);
      const caption = m ? p.text.replace(m[0], "").replace(/\s{2,}/g, " ").replace(/\s+([.,:;!?])/g, "$1").trim() : p.text;
      if (caption) panel.append(el("div", "cc-caption", caption));
      if (m) panel.append(el("div", "cc-bubble speech", m[1]));
    }
    strip.append(panel);
  }
  page.append(strip);
  if (!end.retry) page.append(el("div", "cover-click", "*click.*"));
  wrap.append(page);
  return wrap;
}

function menuPanel() {
  const panel = el("div", "menu");
  panel.append(el("h2", "", "Saves"));
  const slots = saves();
  slots.forEach((slot, index) => {
    const row = el("div", "slot");
    const label = slot
      ? `${slot.room} · ${slot.at.slice(0, 16).replace("T", " ")}`
      : "Empty slot";
    row.append(el("span", "", `Slot ${index + 1}: ${label}`));
    row.append(button("Save", "", () => {
      const next = saves();
      const snap = structuredClone(ui.state);
      if (snap.mode === "choice") snap.mode = "play";
      snap.pending = null;
      // the lines still to come (Chopper 2026-10-26): act() commits a beat's flags at once (the Pavilion unmasking
      // sets the sign lit at the hero choice) but its lines only live in ui.queue, so a save mid-speech kept GOBBLER lit
      // and dropped the sign cut that lights it; the tail from the current line resumes on Continue / Load
      const lines = structuredClone(ui.queue.slice(ui.index));
      next[index] = { at: new Date().toISOString(), room: ROOMS[snap.room].name, data: snap, lines };
      writeSaves(next);
      ui.menu = false;
      render();
    }));
    row.append(button("Load", "", () => {
      if (!slot) return;
      ui.menu = false;
      resumeSlot(slot);
    }));
    panel.append(row);
  });
  panel.append(button(ui.hints ? "Hints: on (hover highlights)" : "Hints: off", "", () => {
    ui.hints = !ui.hints;
    try { localStorage.setItem("rr-hints", ui.hints ? "1" : "0"); } catch { /* private mode */ }
    if (ui.hints) playCue("crow");
    render();
  }));
  panel.append(button(ui.spots ? "Hide hotspots" : "Show hotspots", "", () => {
    ui.spots = !ui.spots;
    render();
  }));
  panel.append(artToggle());
  panel.append(soundPanel());
  panel.append(el("h2", "", "Placeholder beats"));
  panel.append(button(ui.coldOpen ? "Cold open: on" : "Cold open: off", "", () => {
    ui.coldOpen = !ui.coldOpen;
    try { localStorage.setItem("rr-coldopen", ui.coldOpen ? "1" : "0"); } catch { /* private mode */ }
    render();
  }));
  panel.append(button(ui.nightShift ? "Night colour shift: on" : "Night colour shift: off", "", () => {
    ui.nightShift = !ui.nightShift;
    try { localStorage.setItem("rr-nightshift", ui.nightShift ? "1" : "0"); } catch { /* private mode */ }
    render();
  }));
  panel.append(button("Title screen", "", () => {
    ui.screen = "title";
    ui.menu = false;
    ui.queue = [];
    render();
  }));
  return panel;
}

// Sound settings (Push C): music / effects / voice volume and mute, kept per device (localStorage rr-audio).
function soundPanel() {
  const box = el("div", "sound");
  box.append(el("h2", "", "Sound"));
  const st = audioSettings();
  for (const [key, label] of [["music", "Music"], ["sfx", "Effects"], ["voice", "Voice"]]) {
    const row = el("label", "slider");
    row.append(el("span", "", label));
    const input = el("input");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.value = String(Math.round(st[key] * 100));
    input.dataset.audio = key;
    input.setAttribute("aria-label", `${label} volume`);
    input.addEventListener("input", () => setAudio({ [key]: Number(input.value) / 100 }));
    input.addEventListener("change", () => { if (key === "sfx") playCue("blip"); });
    row.append(input);
    box.append(row);
  }
  box.append(button(st.muted ? "Sound: muted" : "Sound: on", "", () => {
    setAudio({ muted: !audioSettings().muted });
    render();
  }));
  return box;
}

// Title (Arlong 2026-10-26): Brook's cover art in three aligned 320x180 layers, the scene (bg/title), then the
// "RADIOACTIVE ROOSTER" logo (bg/title-logo) and "THE YOLK OF MIDNIGHT" (bg/title-sub) fading in, then the menu
// bottom-right over the water (clear of the logo and both faces). The h1 is visually hidden, so the title shows once.
// Any key or tap shows it all at once; prefers-reduced-motion skips the fade (css). Plays once per visit to the title.
const TITLE_INTRO_MS = 3000;
let titleIntro = { played: false, timer: 0 };

function finishTitleIntro() {
  clearTimeout(titleIntro.timer);
  titleIntro.played = true;
  const screen = document.querySelector(".title-screen.intro");
  if (screen) screen.classList.replace("intro", "shown");
}

function renderTitle() {
  app.replaceChildren();
  if (!titleIntro.played && matchMedia("(prefers-reduced-motion: reduce)").matches) titleIntro.played = true;
  const intro = !titleIntro.played;
  const screen = el("div", `title-screen ${intro ? "intro" : "shown"}`);
  const frame = el("div", "title-frame");
  const img = el("img");
  img.alt = "Radioactive Rooster in his cowl on a night dock, the masked Hawk over the moon behind him";
  mount(img, "bg-title.jpg");
  const titleArt = el("div", "title-art");
  titleArt.append(img);
  for (const [id, cls] of [["bg/title-logo", "title-logo"], ["bg/title-sub", "title-sub"]]) {
    if (!assetInfo(id)) continue;
    const layer = el("img", `title-layer ${cls}`);
    layer.alt = "";
    layer.setAttribute("aria-hidden", "true");
    mount(layer, id);
    titleArt.append(layer);
  }
  frame.append(titleArt);
  const copy = el("div", "title-copy");
  copy.append(el("h1", "vh", "Radioactive Rooster"), el("p", "vh", "The Yolk of Midnight"));
  frame.append(copy);
  const menu = el("div", "title-menu");
  const row = el("div", "title-actions");
  row.append(button("New game", "on", startGame));
  const slots = saves().filter(Boolean);
  if (slots.length) {
    row.append(button("Continue", "", () => {
      const latest = slots.slice().sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      ui.screen = "play";
      resumeSlot(latest);
    }));
  }
  menu.append(row, el("span", "beta", "BETA"));
  frame.append(menu);
  screen.append(frame);
  screen.append(el("p", "logline", "A pure-hearted rooster, a stolen Yolk, and the femme fatale who used to be his partner. One night. One fryer. Midnight."));
  screen.append(el("p", "how", "Look, Talk, Take, Use, Push. To use an item, click it, then click the thing it goes on. Number keys 1–5 pick verbs. Click the caption to continue."));
  const artRow = el("div", "title-actions");
  artRow.append(artToggle());
  screen.append(artRow);
  screen.append(el("p", "how", "Pixel art is the default. Fancy art drops into art/fancy/ with the same file names; anything missing falls back to pixel. Press G to switch."));
  if (intro) {
    screen.addEventListener("pointerdown", finishTitleIntro, { once: true });
    clearTimeout(titleIntro.timer);
    titleIntro.timer = setTimeout(finishTitleIntro, TITLE_INTRO_MS);
  }
  app.append(screen);
}

function startGame() {
  ui.state = newGame();
  Object.assign(ui.state.flags, ui.flagOverride);
  ui.screen = "play";
  ui.queue = [];
  ui.menu = false;
  resumeAudio();
  playCue("title-sting");
  render();
  // Push C PLACEHOLDER opening: the cold open (behind its flag), then SIX HOURS TO MIDNIGHT
  playBeats([...(ui.coldOpen ? [{ kind: "coldopen" }] : []), ...startBeats(ui.state)]);
}

// Saves from before Push C have no night clock: seed it, and count the cards for rooms already behind him as shown.
function seedNight(state) {
  if (!state) return state;
  if (!Array.isArray(state.cards)) {
    state.night = nightOf(state.room, state.night);
    state.cards = TIME_CARDS.filter((c) => c.on === "start" || (c.on.room && nightOf(c.on.room) <= state.night)).map((c) => c.id);
  }
  return state;
}

function atChoice() {
  return !currentLine() || ui.index >= ui.queue.length - 1;
}

function sentenceIdle(state) {
  if (state.mode === "choice" || state.mode === "end") return "";
  if (state.pending && ITEMS[state.pending]) return `Use the ${itemOf(state, state.pending).name} on...`;
  const verb = VERBS.find(([id]) => id === state.verb);
  return verb ? verb[1] : "";
}

function setSentence(text) {
  const node = document.querySelector("#sentence");
  if (!node || !ui.state) return;
  node.textContent = text || sentenceIdle(ui.state);
  node.classList.toggle("hot", !!text);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(text, className, onClick) {
  const node = el("button", className, text);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

// Beta v17 item 5 (Arlong Oct 27): the inventory Look close-up (the item in his gloves) goes away on any other click
// on screen, not only when the caption moves on. Capture phase, and the node is just removed (no re-render), so the
// click itself still lands on whatever was under it; a new Look makes a new line, so it shows again.
document.addEventListener("pointerdown", () => {
  const l = currentLine();
  if (!l || !l.closeup || ui.closeupDismissed === l) return;
  ui.closeupDismissed = l;
  document.querySelectorAll(".world .closeup").forEach((n) => n.remove());
}, true);

// Full-screen insert (Usopp, beta v17): an image over the whole screen (a note, a clue board), fading in and out, with
// an optional caption; a click or a key dismisses it. Separate from the gloves close-up (lineNow.closeup). Mechanism
// only, no content wired yet (Brook is painting the bucket note + clarion and the conspiracy board). Two ways in:
//   showInsert({ art, caption, fadeMs }) -> Promise (resolves once it has faded out); art = an art id or a file.
//   a line with insert: { art, caption } shows it before the line (like a cutscene), then the line.
// Dev check: ?insert (a placeholder image), or __RR.insert({ art, caption }) from the console.
const INSERT_FADE_MS = 400;
function showInsert({ art, caption = "", fadeMs = INSERT_FADE_MS } = {}) {
  if (ui.insert) ui.insert.close(true);
  return new Promise((resolve) => {
    const box = el("div", "insert");
    box.style.setProperty("--insert-fade", `${fadeMs}ms`);
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", caption || "Close-up");
    const img = el("img", "insert-art"); img.alt = caption || "";
    if (art && /\//.test(art) && /\.(png|jpe?g|svg|webp|gif)$/i.test(art)) img.src = art; // a file path as it is
    else if (art) mount(img, art); // an art id (or a legacy placeholder name)
    box.append(img);
    if (caption) box.append(el("div", "insert-caption", caption));
    box.append(el("div", "insert-hint", "click to close"));
    let done = false;
    // Any click anywhere closes it and does nothing else. The layer itself lets the pointer through (CSS
    // pointer-events: none), so the click is caught on window in the capture phase and swallowed there.
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    const onClick = (ev) => { swallow(ev); if (done) window.removeEventListener("click", onClick, true); };
    const onDown = (ev) => { swallow(ev); close(); };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("click", onClick, true);
    const close = (now = false) => {
      if (done) return;
      done = true;
      window.removeEventListener("pointerdown", onDown, true);
      setTimeout(() => window.removeEventListener("click", onClick, true), 1000); // if the press's click never comes (a key)
      if (ui.insert && ui.insert.box === box) ui.insert = null;
      box.classList.remove("on");
      setTimeout(() => { box.remove(); resolve(); }, now ? 0 : fadeMs);
    };
    ui.insert = { box, close };
    document.body.append(box);
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add("on")));
  });
}

document.addEventListener("keydown", (event) => {
  if (ui.insert) { event.preventDefault(); ui.insert.close(); return; } // a key closes the insert, and does nothing else
  if (ui.screen === "title" && !titleIntro.played) finishTitleIntro(); // any key shows the whole title at once
  if ((event.key === "g" || event.key === "G") && ui.screen === "title") {
    setArtMode(artMode() === "pixel" ? "fancy" : "pixel");
    return;
  }
  if (ui.screen !== "play" || !ui.state) return;
  const verbIndex = ["1", "2", "3", "4", "5"].indexOf(event.key);
  if (verbIndex >= 0 && ui.state.mode === "choice" && atChoice()) {
    const opts = choicesFor(ui.state);
    if (opts[verbIndex]) dispatch({ t: "choice", id: opts[verbIndex].id });
    return;
  }
  if (verbIndex >= 0 && ui.state.mode !== "choice") {
    dispatch({ t: "verb", verb: VERBS[verbIndex][0] });
    return;
  }
  if (event.key === "g" || event.key === "G") {
    setArtMode(artMode() === "pixel" ? "fancy" : "pixel");
    return;
  }
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    advance();
  }
  if (event.key === "Escape") {
    if (ui.state.pending) {
      ui.state.pending = null;
      render();
    } else {
      ui.menu = !ui.menu;
      render();
    }
  }
});

window.__RR = {
  get state() {
    return ui.state;
  },
  get index() {
    return ui.index;
  },
  get queue() {
    return ui.queue;
  },
  start: startGame,
  hero: () => ({ ...hero }),
  // walkthrough drain: a hotspot click walks first, so the action is still pending (or a cutscene is playing)
  get busy() {
    return !!(ui.pendingAct || ui.cutscene || beatActive());
  },
  walkTo: (x, y) => walkTo(ui.state && ROOMS[ui.state.room], x, y),
  beats: (list) => playBeats(list), // preview a beat: __RR.beats([{ kind: "club" }])
  insert: (opts) => showInsert(opts), // preview a full-screen insert: __RR.insert({ art: "bg/wkuk", caption: "..." })
  audio: () => audioState(),
  act: dispatch,
  advance,
  setArtMode,
  artMode,
  choices: () => choicesFor(ui.state),
  spots(on) {
    ui.spots = on;
    render();
  },
};

// Dev-only check of the insert layer (no game content uses it yet): ?insert shows a placeholder image and caption.
if (new URLSearchParams(location.search).has("insert")) {
  showInsert({ art: "art/placeholders/cast-sheet.jpg", caption: "PLACEHOLDER insert: click or press a key to close." });
}

// Live art switch: re-render the current view only. Game state, captions and held items are untouched.
onArtChange(() => render());
// a beat that ends hands the voice of the line it covered back, so a line never talks over a time card
onBeatsDone(() => {
  if (ui.voiceAfterBeat) { const id = ui.voiceAfterBeat; ui.voiceAfterBeat = null; playVoice(id); }
});
// first gesture unlocks WebAudio (autoplay rules)
window.addEventListener("pointerdown", () => resumeAudio(), { once: true, capture: true });
renderTitle();
initArt();
initAudio();
