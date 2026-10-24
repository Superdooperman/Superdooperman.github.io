import { ENDINGS, NAMES, ROOMS, SCENE, SPEAKER, TITLE } from "../data/script.js";
import { artMode, artUrl, assetInfo, fancyCount, initArt, onArtChange, setArtMode } from "./art.js";
import { playBed, playCue } from "./audio.js";
import { clampToArea, findPath, parseFlagOverride, roomView, stepToward, depthHeight, actorZ, occluderZ, occluderAsset, occluderBase, spriteFilter, castFrame, standFor, behindOccluder } from "./walk.js";
import { act, choicesFor, HERO, ITEMS, itemOf, maxHeat, newGame, preview, signLetters, signLevel, spotsFor, vatState, visible } from "./logic.js";

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

// `fallback`: another asset to show if this one is unknown or fails to load, so a missing frame never leaves an
// empty image (Rooster must never vanish). An id the manifest doesn't know yet (stale manifest) is tried directly as
// art/pixel/<id>.png first.
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
  // a line with a cutscene plays its beat first (input locked), then shows; the queue waits for it
  if (entry.cutscene && !entry.played) {
    entry.played = true;
    playCutscene(entry.cutscene, () => showLine(entry));
    return;
  }
  ui.lineAt = performance.now();
  if (entry.mood) ui.state.mood = entry.mood;
  if (entry.sound) playCue(entry.sound);
  render();
  popFx(entry);
  playAnim(entry);
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
  const result = act(ui.state, action);
  ui.state = result.state;
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
  const props = (cs.props || []).map((p) => { const node = el("img", "overlay cs-prop"); node.alt = ""; node.style.zIndex = 950; placeAt(node, p.art, p.at); world.append(node); return { ...p, node }; });
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
      const frames = Array.isArray(key[1]) ? key[1] : [key[1]];
      const sprite = frames[Math.floor((t - key[0]) / (frames.length > 1 && who === "goat" && !key[3] ? 220 : STEP_MS)) % frames.length];
      placeSprite(a.node, `sprite/${sprite}${size[who](at[1])}`, at);
      a.node.style.zIndex = who === "hero" && cs.heroZ ? cs.heroZ : actorZ(at[1]); // heroZ: up in the air, over the crowd
      if (tint) a.node.style.filter = tint;
    }
    for (const p of props) {
      if (p.gone !== undefined && t >= p.gone) { p.node.remove(); continue; }
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
    if (t >= cs.ms) { finish(); return; }
    requestAnimationFrame(tick);
  };
  let over = false;
  function finish() {
    if (over) return;
    over = true;
    for (const a of Object.values(actors)) { a.node.remove(); if (a.real) a.real.style.visibility = ""; }
    for (const p of props) p.node.remove();
    block.remove();
    if (cs.end && cs.end.hero && room.hero) { hero.x = hero.tx = cs.end.hero[0]; hero.y = hero.ty = cs.end.hero[1]; hero.path = []; hero.walking = false; hero.face = cs.end.face || "front"; }
    ui.cutscene = null;
    done();
  }
  requestAnimationFrame(tick);
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
  const state = ui.state;
  const room = roomOf(state);
  const lineNow = currentLine();
  const atEndOfQueue = !lineNow || ui.index >= ui.queue.length - 1;
  const choosing = state.mode === "choice" && atEndOfQueue && ui.queue.length > 0;
  const ended = state.mode === "end" && atEndOfQueue;

  app.replaceChildren();
  castNodes.clear();
  const cabinet = el("div", "cabinet");
  const head = el("header", "top");
  head.append(
    el("div", "brand", "RADIOACTIVE ROOSTER"),
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
  // Oct 21 item 4: inventory Look holds the item up close in his gloves at the bottom of the screen
  if (lineNow && lineNow.closeup && !lineNow.big) {
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
      const node = el("img", "overlay");
      node.alt = "";
      node.dataset.id = o.art;
      placeAt(node, o.art, o.at);
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

  // Walk-behind: foreground cutouts of this plate (posts, cart, booth, bucket). Appended after the actors so a
  // tie goes to the scenery; see walk.js behind(). Only over real art (cutouts are cut from the pixel plates).
  if (room.occluders && realPlate) {
    for (const o of room.occluders) {
      const id = occluderAsset(view.plate, o.id);
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
        // beside it, not in it (js/walk.js standFor): the side he comes from, facing the thing; exits keep their point
        if (room.hero) heroSync(room);
        const castIds = new Set((room.cast || []).filter((c) => !c.when || state.flags[c.when]).map((c) => c.spot));
        const avoid = spotsFor(state).filter((s) => castIds.has(s.id) && s.id !== spot.id).map((s) => s.core || s.rect);
        const st = room.hero ? standFor(room, spot, { walk: heroArea(room), from: [hero.x, hero.y], avoid }) : null;
        const [sx, sy] = st ? [st.x, st.y] : spot.stand || [spot.rect[0] + spot.rect[2] / 2, spot.rect[1] + spot.rect[3]];
        walkTo(room, sx, sy, st && st.face);
        ui.lastAct = { spot: spot.id, verb: state.pending ? "item" : state.verb };
        dispatch({ t: "hotspot", id: spot.id });
      });
      // Arlong: double-click an edge exit to go straight through, whatever verb is up (no nav words needed)
      if (spot.exit) hit.addEventListener("dblclick", () => {
        if (ui.state.mode === "choice" || ui.cutscene) return;
        dispatch({ t: "go", id: spot.id });
      });
      stage.append(hit);
    }
  }

  // Talking head sits in the dialogue row under the scene (SCUMM-style), never over the art.
  const speakerFile = lineNow && lineNow.speaker;
  const heroFile = HERO[state.mood] || HERO.talk;
  let face;
  if (speakerFile && !speakerFile.includes("rooster")) {
    const voiceOnly = speakerFile.startsWith("voice:");
    face = el("div", `speaker${voiceOnly ? " voice" : ""}${lineNow.thought ? " thinking" : ""}`);
    if (!voiceOnly) {
      const img = el("img");
      img.alt = NAMES[speakerFile] || "Speaker";
      mount(img, speakerFile);
      face.append(img);
    }
    face.append(el("div", "who", `${NAMES[speakerFile] || ""}${lineNow.thought ? " (thinking)" : ""}`));
  } else {
    face = el("div", "bust");
    const bustImg = el("img");
    bustImg.alt = "Radioactive Rooster";
    mount(bustImg, heroFile);
    face.append(bustImg);
  }

  if (state.mode === "choice" && state.choice && state.choice.set === "crow") {
    const gauge = el("div", "oil-gauge");
    gauge.setAttribute("aria-label", `Oil heat ${state.heat || 0} of ${maxHeat(state)}`);
    const max = maxHeat(state);
    for (let i = max - 1; i >= 0; i -= 1) gauge.append(el("span", i < (state.heat || 0) ? "hot" : ""));
    gauge.append(el("b", "", "OIL"));
    stage.append(gauge);
  }

  if (ended && state.ending && ENDINGS[state.ending]) stage.append(cover(ENDINGS[state.ending]));

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
  playBed(state.room);
}

// Walking hero sprite for rooms with a `hero` entry. Purely visual: game logic and timing are unchanged.
// Two-frame walk (side idle / side walk), faces the way he moves, front idle when he enters a room.
const HERO_SPEED = 70; // logical px per second
const STEP_MS = 160;
const hero = { room: null, view: null, x: 0, y: 0, tx: 0, ty: 0, face: "front", walking: false, last: 0, t: 0, stuck: 0 };

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
  if (entry && entry.walk) setTimeout(() => { if (hero.room === room.id && !hero.walking && ui.state && ui.state.room === room.id && !ui.state.pose) walkTo(room, ...entry.walk); }, 0);
}

// A seated pose: the sprite's `seat` row (manifest) lands on the rail line `cfg.seat`, centred on `cfg.x`.
// Frames (tools/sprites/cut_sit.py): `sit` / `hop` side frames per facing (-r / -l), `front` when there's no facing,
// at his depth size for the foot of the rail (`standY`).
const POSE_BEAT_MS = 260;
function seatFrame(room, cfg, kind) {
  const size = room.hero && room.hero.depth ? `-h${depthHeight(room.hero, cfg.standY || room.hero.at[1])}` : sizeTag(room.hero || {});
  if (!ui.seatFace) return `${cfg.front || cfg.sit + "-r"}${size}`; // no hop either: he is simply sitting there
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
  const { sprite, at } = castFrame(c, { line: currentLine(), since: now - ui.lineAt, now, lastAct: ui.lastAct, speakers: SPEAKER });
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
  // edge occluders (the hatch) follow him: just over him while he's behind, just under him while he's in front
  for (const fg of document.querySelectorAll('.world img.fg[data-edge="1"]')) {
    const o = (room.occluders || []).find((x) => x.id === fg.dataset.id);
    if (o) fg.style.zIndex = edgeZ(o);
  }
}

function edgeZ(o) {
  return behindOccluder(o, hero.x, hero.y) ? actorZ(hero.y) + 1 : actorZ(hero.y) - 1;
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
  hero.last = performance.now();
  requestAnimationFrame(heroTick);
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
    if (hero.faceOnArrive) hero.face = hero.faceOnArrive;
    if (hero.onArrive) { const f = hero.onArrive; hero.onArrive = null; setTimeout(f, 0); }
  }
  const node = document.querySelector(".hero");
  if (node) placeHero(node, room);
  if (hero.walking) requestAnimationFrame(heroTick);
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
      next[index] = { at: new Date().toISOString(), room: ROOMS[snap.room].name, data: snap };
      writeSaves(next);
      ui.menu = false;
      render();
    }));
    row.append(button("Load", "", () => {
      if (!slot) return;
      ui.state = slot.data;
      ui.queue = [];
      ui.menu = false;
      render();
    }));
    panel.append(row);
  });
  panel.append(button(ui.hints ? "Hints: on (hover highlights)" : "Hints: off", "", () => {
    ui.hints = !ui.hints;
    try { localStorage.setItem("rr-hints", ui.hints ? "1" : "0"); } catch { /* private mode */ }
    render();
  }));
  panel.append(button(ui.spots ? "Hide hotspots" : "Show hotspots", "", () => {
    ui.spots = !ui.spots;
    render();
  }));
  panel.append(artToggle());
  panel.append(button("Title screen", "", () => {
    ui.screen = "title";
    ui.menu = false;
    ui.queue = [];
    render();
  }));
  return panel;
}

function renderTitle() {
  app.replaceChildren();
  const screen = el("div", "title-screen");
  const frame = el("div", "title-frame");
  const img = el("img");
  img.alt = "Night over the coop and the fair";
  mount(img, "bg-title.jpg");
  // Title cutouts (the hen on the barn roof): sprites on the title plate, top-left `at` in its 320x180 px.
  const titleArt = el("div", "title-art");
  titleArt.append(img);
  if (!artUrl("bg-title.jpg").startsWith("art/placeholders/")) {
    for (const o of TITLE.overlays || []) {
      const node = el("img", "title-cast");
      node.alt = "";
      placeAt(node, o.art, o.at);
      titleArt.append(node);
    }
  }
  frame.append(titleArt);
  const copy = el("div", "title-copy");
  copy.append(el("h1", "", "RADIOACTIVE ROOSTER"));
  copy.append(el("p", "sub", "and the Yolk of Midnight"));
  frame.append(copy);
  screen.append(frame);
  screen.append(el("p", "logline", "A pure-hearted rooster, a stolen Yolk, and the femme fatale who used to be his partner. One night. One fryer. Midnight."));
  const row = el("div", "title-actions");
  row.append(button("New game", "on", startGame));
  const slots = saves().filter(Boolean);
  if (slots.length) {
    row.append(button("Continue", "", () => {
      const latest = slots.slice().sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      ui.state = latest.data;
      ui.screen = "play";
      ui.queue = [];
      render();
    }));
  }
  screen.append(row);
  screen.append(el("p", "how", "Look, Talk, Take, Use, Push. To use an item, click it, then click the thing it goes on. Number keys 1–5 pick verbs. Click the caption to continue."));
  const artRow = el("div", "title-actions");
  artRow.append(artToggle());
  screen.append(artRow);
  screen.append(el("p", "how", "Pixel art is the default. Fancy art drops into art/fancy/ with the same file names; anything missing falls back to pixel. Press G to switch."));
  app.append(screen);
}

function startGame() {
  ui.state = newGame();
  Object.assign(ui.state.flags, ui.flagOverride);
  ui.screen = "play";
  ui.queue = [];
  ui.menu = false;
  render();
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

document.addEventListener("keydown", (event) => {
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
  walkTo: (x, y) => walkTo(ui.state && ROOMS[ui.state.room], x, y),
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

// Live art switch: re-render the current view only. Game state, captions and held items are untouched.
onArtChange(() => render());
renderTitle();
initArt();
