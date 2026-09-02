import { GATE, BITE_START, BITE_END, IDLE, REDLINE } from "./config.js";
import { clutchEngagement, rpmForGear } from "./physics.js";

export function drawRoad(canvas, car, opts) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const horizon = h * (0.38 - car.grade * 0.7 - car.lastAccel * 0.008);
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, "#6aa7d6");
  sky.addColorStop(1, "#c8d8e8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#8fb56a";
  ctx.fillRect(0, horizon, w, h - horizon);

  const vpX = w * 0.5 + car.lane * 40;
  const roadNear = w * 1.1;
  ctx.beginPath();
  ctx.moveTo(vpX - 8, horizon);
  ctx.lineTo(vpX + 8, horizon);
  ctx.lineTo(w * 0.5 + roadNear / 2, h);
  ctx.lineTo(w * 0.5 - roadNear / 2, h);
  ctx.closePath();
  ctx.fillStyle = "#4a4a4c";
  ctx.fill();

  ctx.strokeStyle = "#d8d8d0";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(vpX - 6, horizon);
  ctx.lineTo(w * 0.5 - roadNear / 2 + 28, h);
  ctx.moveTo(vpX + 6, horizon);
  ctx.lineTo(w * 0.5 + roadNear / 2 - 28, h);
  ctx.stroke();

  const speed = car.speed;
  for (let i = 0; i < 14; i++) {
    const z = ((i / 14) + (car.distance * 0.12) % 1) % 1;
    const y = horizon + Math.pow(z, 1.6) * (h - horizon);
    const scale = (y - horizon) / (h - horizon);
    if (scale < 0.02) continue;
    const x = vpX;
    const dashH = 18 * scale;
    const dashW = 10 * scale;
    ctx.fillStyle = i % 2 === 0 ? "#e8e0a8" : "#e8e0a844";
    ctx.fillRect(x - dashW / 2, y, dashW, dashH);
  }

  for (let side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const z = ((i / 10) + car.distance * 0.05) % 1;
      const y = horizon + Math.pow(z, 1.4) * (h - horizon);
      const scale = (y - horizon) / (h - horizon);
      const x = vpX + side * (40 + 420 * scale);
      ctx.fillStyle = "#2f5a2a";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 18 * scale, y - 50 * scale);
      ctx.lineTo(x + 18 * scale, y - 50 * scale);
      ctx.fill();
      ctx.fillStyle = "#5a3a22";
      ctx.fillRect(x - 4 * scale, y - 8 * scale, 8 * scale, 16 * scale);
    }
  }

  if (car.hillZone) {
    ctx.fillStyle = "rgba(240,180,40,0.12)";
    ctx.fillRect(0, horizon - 30, w, 30);
  }
}

function needle(ctx, cx, cy, ang, len, color = "#e23b32") {
  const w = Math.max(2, len * 0.045);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w, w * 2);
  ctx.lineTo(0, -len);
  ctx.lineTo(w, w * 2);
  ctx.fill();
  ctx.restore();
}

function gaugeFace(ctx, cx, cy, r, label) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#141210";
  ctx.strokeStyle = "#c4b49a";
  ctx.lineWidth = Math.max(3, r * 0.055);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - Math.max(5, r * 0.07), 0, Math.PI * 2);
  ctx.strokeStyle = "#3a3228";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#d8c8a8";
  ctx.font = `${Math.max(8, r * 0.1)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(label, cx, cy + r * 0.36);
}

export function drawGauges(canvas, car, opts, unitsMph) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (w < 8 || h < 8) return;

  const pad = Math.max(6, Math.min(w, h) * 0.04);
  const r = Math.max(28, Math.min(w * 0.23, (h - pad * 2) / 2));
  const cy = h / 2;
  const tach = { x: w * 0.27, y: cy, r };
  const spd = { x: w * 0.73, y: cy, r };
  gaugeFace(ctx, tach.x, tach.y, tach.r, "RPM x1000");
  gaugeFace(ctx, spd.x, spd.y, spd.r, unitsMph ? "mph" : "km/h");

  const start = -Math.PI * 0.75;
  const span = Math.PI * 1.5;
  const tickIn = r * 0.17;
  const tickOut = r * 0.07;
  const numR = r * 0.3;
  const numSize = Math.max(8, r * 0.11);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${numSize}px sans-serif`;
  for (let i = 0; i <= 7; i++) {
    const a = start + span * (i / 7);
    ctx.beginPath();
    ctx.strokeStyle = i >= 6 ? "#e23b32" : "#e8dcc8";
    ctx.lineWidth = Math.max(1.5, r * 0.018);
    ctx.moveTo(tach.x + Math.cos(a) * (r - tickIn), tach.y + Math.sin(a) * (r - tickIn));
    ctx.lineTo(tach.x + Math.cos(a) * (r - tickOut), tach.y + Math.sin(a) * (r - tickOut));
    ctx.stroke();
    ctx.fillStyle = i >= 6 ? "#e23b32" : "#e8dcc8";
    ctx.fillText(String(i), tach.x + Math.cos(a) * (r - numR), tach.y + Math.sin(a) * (r - numR));
  }

  const vmax = unitsMph ? 140 : 220;
  for (let i = 0; i <= 14; i++) {
    const a = start + span * (i / 14);
    ctx.beginPath();
    ctx.strokeStyle = "#e8dcc8";
    ctx.lineWidth = Math.max(1.5, r * 0.018);
    ctx.moveTo(spd.x + Math.cos(a) * (r - tickIn), spd.y + Math.sin(a) * (r - tickIn));
    ctx.lineTo(spd.x + Math.cos(a) * (r - tickOut), spd.y + Math.sin(a) * (r - tickOut));
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.fillStyle = "#e8dcc8";
      ctx.fillText(String(i * (vmax / 14)), spd.x + Math.cos(a) * (r - numR), spd.y + Math.sin(a) * (r - numR));
    }
  }

  if (opts.match && car.gear !== 0) {
    const next = car.gear >= 1 && car.gear < 6 ? car.gear + 1 : car.gear;
    const ghost = rpmForGear(car.speed, next);
    if (ghost > 800) {
      const ga = start + span * Math.min(1, ghost / 7000);
      needle(ctx, tach.x, tach.y, ga + Math.PI / 2, r * 0.72, "#7ad4ff88");
    }
  }

  const ta = start + span * Math.min(1, car.rpm / 7000);
  needle(ctx, tach.x, tach.y, ta + Math.PI / 2, r * 0.78);
  const speedVal = unitsMph ? Math.abs(car.speed) * 2.23694 : Math.abs(car.speed) * 3.6;
  const sa = start + span * Math.min(1, speedVal / vmax);
  needle(ctx, spd.x, spd.y, sa + Math.PI / 2, r * 0.78);

  const hub = Math.max(5, r * 0.07);
  ctx.beginPath();
  ctx.arc(tach.x, tach.y, hub, 0, Math.PI * 2);
  ctx.arc(spd.x, spd.y, hub, 0, Math.PI * 2);
  ctx.fillStyle = "#222";
  ctx.fill();

  ctx.fillStyle = car.gear === -1 ? "#e23b32" : "#f0b429";
  ctx.font = `bold ${Math.max(14, r * 0.22)}px sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(car.gear === 0 ? "N" : car.gear === -1 ? "R" : String(car.gear), w / 2, Math.max(numSize + 4, cy - r * 0.15));

  if (car.rpm > 6200) {
    ctx.fillStyle = "#e23b32";
    ctx.font = `bold ${Math.max(10, r * 0.12)}px sans-serif`;
    ctx.fillText("SHIFT", tach.x, tach.y + r * 0.22);
  }
}

export function syncKnob(car) {
  const knob = document.getElementById("knob");
  const pos = GATE[car.wantedGear] || GATE[0];
  knob.setAttribute("cx", pos.x);
  knob.setAttribute("cy", pos.y);
}

export function nearestGate(x, y) {
  let best = 0;
  let dmin = 1e9;
  for (const [g, p] of Object.entries(GATE)) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < dmin) { dmin = d; best = Number(g); }
  }
  return dmin < 1400 ? best : 0;
}

export function updateDom(car, unitsMph) {
  const mph = Math.abs(car.speed) * 2.23694;
  const kph = Math.abs(car.speed) * 3.6;
  document.getElementById("hud-gear").textContent = car.gear === 0 ? "N" : car.gear === -1 ? "R" : String(car.gear);
  document.getElementById("hud-rpm").textContent = Math.round(car.rpm).toString();
  document.getElementById("hud-speed").textContent = Math.round(unitsMph ? mph : kph).toString();
  document.getElementById("hud-unit").textContent = unitsMph ? "mph" : "km/h";
  document.getElementById("hud-stalls").textContent = car.stallCount;
  document.getElementById("hud-grinds").textContent = car.grindCount;
  document.getElementById("hud-smooth").textContent = Math.round(car.smoothness).toString();
  const setPos = (id, v) => {
    const pad = document.getElementById(id);
    pad.style.setProperty("--pos", String(v));
    pad.parentElement?.style.setProperty("--pos", String(v));
  };
  setPos("pedal-clutch", car.clutch);
  setPos("pedal-brake", car.brake);
  setPos("pedal-throttle", car.throttle);
  document.querySelector("[data-pedal='clutch']")?.classList.toggle("floored", car.clutch >= 0.62);
  document.getElementById("btn-hb").classList.toggle("on", car.handbrake);
  document.getElementById("lamp-engine").classList.toggle("on", car.engineOn);
  document.getElementById("lamp-hb").classList.toggle("on", car.handbrake);
  document.getElementById("lamp-clutch").classList.toggle("on", car.clutch > 0.5);
  document.getElementById("lamp-rev").classList.toggle("hot", car.rpm > 6200);
  document.getElementById("lamp-rev").classList.toggle("on", car.gear === -1);

  const fill = document.getElementById("bite-fill");
  const mark = document.getElementById("bite-mark");
  if (fill) fill.style.width = `${clutchEngagement(car.clutch) * 100}%`;
  if (mark) mark.style.left = `${(1 - (BITE_START + BITE_END) / 2) * 100}%`;
}

export function flash(text, kind = "alert") {
  const box = document.getElementById("alerts");
  const el = document.createElement("div");
  el.className = kind === "info" ? "alert info" : "alert";
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}
