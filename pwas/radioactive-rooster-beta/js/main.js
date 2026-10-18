import { ENDINGS, NAMES, ROOMS, SCENE } from "../data/script.js";
import { artMode, artUrl, assetInfo, fancyCount, initArt, onArtChange, setArtMode } from "./art.js";
import { playBed, playCue } from "./audio.js";
import { clampToArea, parseFlagOverride, roomView, stepToward, depthHeight, actorZ, occluderZ, occluderAsset } from "./walk.js";
import { act, choicesFor, HERO, ITEMS, maxHeat, newGame, preview, signLetters, signLevel, spotsFor, vatState } from "./logic.js";

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

function mount(img, file) {
  img.dataset.file = file;
  const url = artUrl(file);
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
  if (entry.mood) ui.state.mood = entry.mood;
  if (entry.sound) playCue(entry.sound);
  render();
}

function dispatch(action) {
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
  if (ui.index < ui.queue.length - 1) {
    ui.index += 1;
    showLine(ui.queue[ui.index]);
    return;
  }
  render();
}

function roomOf(state) {
  return ROOMS[state.room];
}

function render() {
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
  if (room.sign) world.append(feedSeed(room.sign, state));
  if (room.vat) world.append(vat(room.vat, state));
  const realPlate = !artUrl(view.plate).startsWith("art/placeholders/");

  const hidePose = lineNow && lineNow.big;
  if (!hidePose && state.pose && room.poseAt && room.poseAt[state.pose]) {
    const pose = el("img", "pose");
    pose.alt = "";
    const at = room.poseAt[state.pose];
    pose.style.left = pct(at[0], "x");
    pose.style.top = pct(at[1], "y");
    pose.style.width = pct(at[2], "x");
    mount(pose, state.pose === "crow" ? "sprite-crow.png" : "sprite-squat.png");
    world.append(pose);
  }

  if (room.hero && !hidePose && !state.pose) {
    heroSync(room);
    const node = el("img", "hero");
    node.alt = "";
    placeHero(node, room);
    world.append(node);
  }

  if (room.cast && (ui.cast || realPlate)) {
    const shown = new Set(spotsFor(state).map((s) => s.id));
    for (const c of room.cast) {
      if (c.spot && !shown.has(c.spot)) continue;
      const node = el("img", "cast");
      node.alt = "";
      node.dataset.who = c.sprite;
      placeSprite(node, `sprite/${c.sprite}${sizeTag(c)}`, c.at);
      node.style.zIndex = actorZ(c.at[1]);
      world.append(node);
    }
  }

  // Walk-behind: foreground cutouts of this plate (posts, cart, booth, bucket). Appended after the actors so a
  // tie goes to the scenery; see walk.js behind(). Only over real art (cutouts are cut from the pixel plates).
  if (room.occluders && realPlate) {
    for (const o of room.occluders) {
      const id = occluderAsset(view.plate, o.id);
      if (!assetInfo(id)) continue;
      const node = el("img", "fg");
      node.alt = "";
      node.dataset.id = o.id;
      node.dataset.base = o.base;
      node.style.zIndex = occluderZ(o.base);
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
      hit.addEventListener("pointerenter", () => setCaption(preview(state, spot), true));
      hit.addEventListener("click", () => {
        const [sx, sy] = spot.stand || [spot.rect[0] + spot.rect[2] / 2, spot.rect[1] + spot.rect[3]];
        walkTo(room, sx, sy); // nearest reachable point (or the spot's own `stand` point)
        dispatch({ t: "hotspot", id: spot.id });
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
  pending.textContent = state.pending ? `Use the ${ITEMS[state.pending].name} on...` : "";
  cabinet.append(pending);

  const inv = el("div", "inv");
  if (!state.inv.length) inv.append(el("div", "empty", "Pockets empty."));
  for (const id of state.inv) {
    const item = ITEMS[id];
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
const hero = { room: null, view: null, x: 0, y: 0, tx: 0, ty: 0, face: "front", walking: false, last: 0, t: 0 };

function heroArea(room) {
  return roomView(room, (ui.state && ui.state.flags) || {}).walk;
}

// Frame size: depth rooms pick the 4 px bucket for his feet y (js/walk.js depthHeight), others the fixed height.
function heroSize(room) {
  return room.hero.depth ? `-h${depthHeight(room.hero, hero.y)}` : sizeTag(room.hero);
}

function heroFrame(room) {
  const size = heroSize(room);
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
  hero.room = room.id;
  hero.view = view;
  [hero.x, hero.y] = room.hero.at;
  const area = heroArea(room);
  if (area) [hero.x, hero.y] = clampToArea(area, hero.x, hero.y);
  hero.tx = hero.x;
  hero.ty = hero.y;
  hero.face = "front";
  hero.walking = false;
}

// Sprites sit on their feet: `at` is the bottom-center point in logical px.
function placeSprite(node, id, at) {
  const info = assetInfo(id);
  const [w, h] = info ? info.size : [48, 64];
  node.style.left = pct(at[0] - w / 2, "x");
  node.style.top = pct(at[1] - h, "y");
  node.style.width = pct(w, "x");
  if (node.dataset.file !== id) mount(node, id);
}

function placeHero(node, room) {
  placeSprite(node, heroFrame(room), [hero.x, hero.y]);
  node.style.zIndex = actorZ(hero.y);
}

function walkTo(room, x, y) {
  if (!room || !room.hero) return;
  heroSync(room);
  const area = heroArea(room);
  const wantY = y === undefined ? hero.y : y;
  if (area) [hero.tx, hero.ty] = clampToArea(area, x, wantY);
  else {
    const [lo, hi] = room.hero.walk || [0, SCENE.w];
    [hero.tx, hero.ty] = [Math.max(lo, Math.min(hi, x)), hero.y];
  }
  if (Math.hypot(hero.tx - hero.x, hero.ty - hero.y) < 2) return;
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
  if (left < 0.5 || (dt > 0 && moved < stepPx * 0.05)) hero.walking = false; // arrived, or slid into an edge
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

// NED'S FEED & SEED neon: the ambient temptation meter. Code-drawn for now (art ids fx/feedseed-*). Never labeled.
function feedSeed(rect, state) {
  const sign = el("div", `feedseed s${signLevel(state)}`);
  sign.setAttribute("aria-hidden", "true");
  place(sign, rect);
  const text = el("div", "fs-text");
  for (const { ch, on } of signLetters(state)) text.append(el("span", on ? "on" : "off", ch === " " ? "\u00a0" : ch));
  sign.append(text);
  if (signLevel(state) >= 3) sign.append(el("i", "fs-hawk"));
  return sign;
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
    b.style.setProperty("--sz", `${9 + ((i * 7) % 10)}px`);
    b.style.setProperty("--rise", `${14 + ((i * 13) % 26)}px`);
    node.append(b);
  }
  // TODO(audio): vat bubbling loop per state (sound on hold)
  return node;
}

// Comic-cover ending screen (code-drawn; art ids bg/ending-* later).
function cover(end) {
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
  frame.append(img);
  const copy = el("div", "title-copy");
  copy.append(el("h1", "", "RADIOACTIVE ROOSTER"), el("span", "beta", "BETA"));
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

function setCaption(text, hover) {
  const node = document.querySelector("#caption");
  if (!node) return;
  if (hover && currentLine() && ui.index < ui.queue.length - 1) return;
  if (hover) node.textContent = text;
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
