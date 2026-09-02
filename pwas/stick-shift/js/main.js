import { LESSONS } from "./config.js";
import { createCar, step, selectGear, tryStart } from "./physics.js";
import { createAudio } from "./audio.js";
import { createInput } from "./input.js";
import { createLessons } from "./lessons.js";
import { drawRoad, drawGauges, syncKnob, nearestGate, updateDom, flash } from "./render.js";

const car = createCar();
const audio = createAudio();
const opts = {
  autoSteer: () => document.getElementById("opt-autosteer").checked,
  bite: () => document.getElementById("opt-bite").checked,
  match: () => document.getElementById("opt-match").checked,
  slowClutch: () => document.getElementById("opt-slowclutch").checked,
};
const input = createInput(car, opts);
const lessons = createLessons(car);

let unitsMph = true;
let last = performance.now();
let hbLatch = false;
let startLatch = false;

function fitCanvas(id) {
  const c = document.getElementById(id);
  const r = c.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.max(320, r.width * dpr);
  c.height = Math.max(160, r.height * dpr);
}

function renderLessons() {
  const list = document.getElementById("lesson-list");
  list.innerHTML = "";
  LESSONS.forEach((ls, i) => {
    const b = document.createElement("button");
    b.textContent = `${i + 1}. ${ls.title}`;
    if (i === lessons.index) b.classList.add("active");
    if (lessons.done.has(ls.id)) b.classList.add("done");
    b.addEventListener("click", () => {
      lessons.select(i);
      renderLessons();
      refreshLessonCopy();
    });
    list.appendChild(b);
  });
  refreshLessonCopy();
}

function refreshLessonCopy() {
  const ls = LESSONS[lessons.index];
  document.getElementById("lesson-title").textContent = ls.title;
  document.getElementById("lesson-text").textContent = ls.text;
  document.getElementById("opt-bite").checked = ls.id === "bite" || opts.bite();
}

function updateLessonUi(mets) {
  const ls = LESSONS[lessons.index];
  const ul = document.getElementById("lesson-goals");
  ul.innerHTML = "";
  ls.goals.forEach((g, i) => {
    const li = document.createElement("li");
    li.textContent = g;
    if (mets[i]) li.classList.add("met");
    ul.appendChild(li);
  });
  const pct = mets.filter(Boolean).length / mets.length;
  document.getElementById("lesson-bar").style.width = `${pct * 100}%`;
  document.getElementById("lesson-feedback").textContent = lessons.feedback;
  document.getElementById("bite-meter").hidden = !document.getElementById("opt-bite").checked;
}

function applyGear(g) {
  const res = selectGear(car, g);
  if (res.grind) { audio.grind(); flash("GEAR GRIND"); }
  else if (res.ok === false) flash(res.reason, "info");
  else if (g !== 0) audio.shift();
  syncKnob(car);
}

function handleDiscrete(gp) {
  if (input.held("b", "B") || gp?.hb) {
    if (!hbLatch) {
      car.handbrake = !car.handbrake;
      hbLatch = true;
    }
  } else hbLatch = false;

  const startHeld = input.held("Enter") || input.held("i") || input.held("I") || gp?.start;
  if (startHeld) {
    if (!startLatch) {
      const r = tryStart(car);
      if (r.ok) { audio.start(); flash("ENGINE ON", "info"); }
      else flash(r.reason, "info");
      startLatch = true;
    }
  } else startLatch = false;
}

function setupShifter() {
  const svg = document.getElementById("gate");
  const knob = document.getElementById("knob");
  const pt = svg.createSVGPoint();
  function local(ev) {
    pt.x = ev.clientX; pt.y = ev.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener("pointerdown", (ev) => {
    svg.setPointerCapture(ev.pointerId);
    input.setDraggingKnob(true);
    const p = local(ev);
    knob.setAttribute("cx", p.x);
    knob.setAttribute("cy", p.y);
  });
  svg.addEventListener("pointermove", (ev) => {
    if (!input.isDraggingKnob()) return;
    const p = local(ev);
    knob.setAttribute("cx", Math.max(20, Math.min(200, p.x)));
    knob.setAttribute("cy", Math.max(30, Math.min(230, p.y)));
  });
  function end() {
    if (!input.isDraggingKnob()) return;
    input.setDraggingKnob(false);
    const x = Number(knob.getAttribute("cx"));
    const y = Number(knob.getAttribute("cy"));
    const g = nearestGate(x, y);
    if (g === -1) car.reverseLock = true;
    const res = selectGear(car, g);
    if (res.grind) { audio.grind(); flash("GEAR GRIND"); }
    else if (res.ok === false) flash(res.reason, "info");
    else if (g !== 0) audio.shift();
    syncKnob(car);
  }
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const { gp } = input.poll(dt);
  handleDiscrete(gp);
  if (opts.autoSteer()) car.lane *= 0.9;
  step(car, dt);
  audio.update(car);
  if (car.stalledJustNow) { audio.stall(); flash("STALLED"); }

  const road = document.getElementById("road");
  const gauges = document.getElementById("gauges");
  drawRoad(road, car, opts);
  drawGauges(gauges, car, { match: opts.match() }, unitsMph);
  if (!input.isDraggingKnob()) syncKnob(car);
  updateDom(car, unitsMph);
  const mets = lessons.tick(dt);
  updateLessonUi(mets);
  requestAnimationFrame(loop);
}

function boot() {
  document.getElementById("boot").hidden = true;
  document.getElementById("app").hidden = false;
  audio.resume();
  fitCanvas("road");
  window.addEventListener("resize", () => fitCanvas("road"));
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    let g = null;
    if (e.key === "n" || e.key === "N" || e.key === "`") g = 0;
    else if (e.key === "r" || e.key === "R") g = -1;
    else if (e.key >= "1" && e.key <= "6") g = Number(e.key);
    if (g !== null) applyGear(g);
  });
  renderLessons();
  setupShifter();
  syncKnob(car);
  requestAnimationFrame((t) => { last = t; loop(t); });
}

document.getElementById("start-btn").addEventListener("click", boot);
document.getElementById("btn-start").addEventListener("click", () => {
  const r = tryStart(car);
  if (r.ok) { audio.start(); flash("ENGINE ON", "info"); }
  else flash(r.reason, "info");
});
document.getElementById("btn-hb").addEventListener("click", () => { car.handbrake = !car.handbrake; });
document.getElementById("btn-units").addEventListener("click", (e) => {
  unitsMph = !unitsMph;
  e.target.textContent = unitsMph ? "mph" : "km/h";
});
document.getElementById("btn-mute").addEventListener("click", (e) => {
  e.target.textContent = audio.toggle() ? "Unmute" : "Mute";
});
document.getElementById("btn-help").addEventListener("click", () => {
  document.getElementById("help").hidden = false;
});
document.getElementById("help-close").addEventListener("click", () => {
  document.getElementById("help").hidden = true;
});
document.getElementById("opt-bite").addEventListener("change", () => {
  document.getElementById("bite-meter").hidden = !document.getElementById("opt-bite").checked;
});

if (location.hash === "#play") boot();
