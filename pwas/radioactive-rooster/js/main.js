import { NAMES, ROOMS } from "../data/script.js";
import { playBed, playCue } from "./audio.js";
import { act, CROW, HERO, ITEMS, newGame, preview, spotsFor } from "./logic.js";

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
  img.src = `art/placeholders/${file}`;
  fetch(`art/in/${file}`, { method: "HEAD" }).then((response) => {
    if (response.ok && img.dataset.file === file) img.src = `art/in/${file}`;
  }).catch(() => {});
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
    el("div", "room", room.name),
    button("Menu", "ghost", () => {
      ui.menu = !ui.menu;
      render();
    }),
  );
  cabinet.append(head);

  const stage = el("div", "stage");
  const plate = el("img", "plate");
  plate.alt = "";
  mount(plate, room.plate);
  stage.append(plate);

  const hidePose = lineNow && lineNow.big;
  if (!hidePose && state.pose && room.poseAt && room.poseAt[state.pose]) {
    const pose = el("img", "pose");
    pose.alt = "";
    const at = room.poseAt[state.pose];
    pose.style.left = `${at[0] * 100}%`;
    pose.style.top = `${at[1] * 100}%`;
    pose.style.width = `${at[2] * 100}%`;
    mount(pose, state.pose === "crow" ? "sprite-crow.png" : "sprite-squat.png");
    stage.append(pose);
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
      hit.style.left = `${spot.rect[0] * 100}%`;
      hit.style.top = `${spot.rect[1] * 100}%`;
      hit.style.width = `${spot.rect[2] * 100}%`;
      hit.style.height = `${spot.rect[3] * 100}%`;
      hit.dataset.id = spot.id;
      hit.setAttribute("aria-label", preview(state, spot));
      hit.addEventListener("pointerenter", () => setCaption(preview(state, spot), true));
      hit.addEventListener("click", () => dispatch({ t: "hotspot", id: spot.id }));
      stage.append(hit);
    }
  }

  const speakerFile = lineNow && lineNow.speaker;
  const heroFile = HERO[state.mood] || HERO.talk;
  const bust = el("div", "bust");
  const bustImg = el("img");
  bustImg.alt = "Radioactive Rooster";
  mount(bustImg, heroFile);
  bust.append(bustImg);
  stage.append(bust);

  if (speakerFile && !speakerFile.includes("rooster")) {
    const card = el("div", "speaker");
    const img = el("img");
    img.alt = NAMES[speakerFile] || "Speaker";
    mount(img, speakerFile);
    card.append(img, el("div", "who", NAMES[speakerFile] || ""));
    stage.append(card);
  }

  cabinet.append(stage);

  const caption = el("button", "caption");
  caption.type = "button";
  caption.id = "caption";
  caption.textContent = lineNow ? lineNow.text : "The night is waiting.";
  caption.addEventListener("click", advance);
  cabinet.append(caption);

  if (choosing && CROW[state.crowRound]) {
    const choices = el("div", "choices");
    for (const option of CROW[state.crowRound].options) {
      choices.append(button(option.say, "choice", () => dispatch({ t: "choice", id: option.id })));
    }
    cabinet.append(choices);
  }

  if (ended) {
    cabinet.append(button("Back to the title", "end-btn", () => {
      ui.screen = "title";
      ui.queue = [];
      render();
    }));
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
  copy.append(el("h1", "", "RADIOACTIVE ROOSTER"));
  copy.append(el("p", "sub", "and the Yolk of Midnight"));
  frame.append(copy);
  screen.append(frame);
  screen.append(el("p", "logline", "A good heart, a stolen egg, and a femme fatale with a fryer. His crow is a wheeze until he can say it for real."));
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
  screen.append(el("p", "how", "Placeholder art. Drop a file with the same name in art/in/ and it replaces the stand-in."));
  app.append(screen);
}

function startGame() {
  ui.state = newGame();
  ui.screen = "play";
  ui.queue = [];
  ui.menu = false;
  render();
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
  if (ui.screen !== "play" || !ui.state) return;
  const verbIndex = ["1", "2", "3", "4", "5"].indexOf(event.key);
  if (verbIndex >= 0 && ui.state.mode !== "choice") {
    dispatch({ t: "verb", verb: VERBS[verbIndex][0] });
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
  get queue() {
    return ui.queue;
  },
  start: startGame,
  act: dispatch,
  advance,
  spots(on) {
    ui.spots = on;
    render();
  },
};

renderTitle();
