// Walkable areas + alternate background states. Pure functions (no DOM) so node tests can cover them.
// A room may define `walk: [[ [x, y], ... ], ...]`: one or more polygons in logical px (feet positions).
// A room may define `states: [{ flag, plate, walk }]`: when game flag `flag` is set, that plate and walk area win
// (later entries win over earlier ones).

export function inPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function onSeg(ax, ay, bx, by, x, y) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
  return [ax + t * dx, ay + t * dy];
}

export function inArea(area, x, y) {
  if (!area || !area.length) return true;
  return area.some((poly) => inPoly(poly, x, y) || onEdge(poly, x, y));
}

function onEdge(poly, x, y) {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [px, py] = onSeg(poly[j][0], poly[j][1], poly[i][0], poly[i][1], x, y);
    if (Math.hypot(px - x, py - y) < 1e-6) return true;
  }
  return false;
}

// Nearest reachable point to (x, y). Unchanged if it is already inside.
export function clampToArea(area, x, y) {
  if (inArea(area, x, y)) return [x, y];
  let best = null;
  for (const poly of area) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const p = onSeg(poly[j][0], poly[j][1], poly[i][0], poly[i][1], x, y);
      const d = Math.hypot(p[0] - x, p[1] - y);
      if (!best || d < best.d) best = { p, d };
    }
  }
  return best.p;
}

// One movement step toward `to`, sliding along the edge instead of leaving the area.
export function stepToward(area, from, to, dist) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len <= dist) return clampToArea(area, to[0], to[1]);
  const nx = from[0] + (dx / len) * dist;
  const ny = from[1] + (dy / len) * dist;
  return clampToArea(area, nx, ny);
}

// Active plate + walk area for a room given the game flags.
export function roomView(room, flags = {}) {
  let view = { plate: room.plate, walk: room.walk || null, state: null };
  for (const st of room.states || []) {
    if (flags[st.flag]) view = { plate: st.plate || view.plate, walk: st.walk || view.walk, state: st.flag };
  }
  return view;
}

// "?flags=rope_open,ropeOpen" -> { rope_open: true } (camelCase is converted to the game's snake_case).
export function parseFlagOverride(search) {
  const raw = new URLSearchParams(search).get("flags");
  const out = {};
  if (!raw) return out;
  for (const part of raw.split(",")) {
    const name = part.trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    if (name) out[name] = true;
  }
  return out;
}

/* ---------- Depth: per-room scale from feet y + walk-behind occluders ---------- */
// hero: { at, height, depth: { horizon, refY?, min?, max? } }. Height is linear in (feetY - horizon) and equals
// `height` at refY (default: the room's start spot, where the height was measured against the background).
// Snapped to the 4 px frame buckets cut by tools/sprites/cut_cast.py, so every size is a crisp hand-cut frame.
export const DEPTH_STEP = 4;
export const DEPTH_MIN = 60;
export const DEPTH_MAX = 120;

export function depthHeight(cfg, y) {
  if (!cfg || !cfg.depth) return cfg ? cfg.height : undefined;
  const { horizon, refY = cfg.at[1], min = DEPTH_MIN, max = DEPTH_MAX } = cfg.depth;
  const raw = (cfg.height * (y - horizon)) / (refY - horizon);
  const snapped = Math.round(raw / DEPTH_STEP) * DEPTH_STEP;
  return Math.max(min, Math.min(max, snapped));
}

// Stacking inside the scene: actors and foreground cutouts share one z order keyed by feet y.
// An occluder covers an actor exactly when the actor's feet are behind (above) its base line.
export function actorZ(y) {
  return 101 + Math.floor(y * 4);
}
export function occluderZ(base) {
  return 100 + base * 4;
}
export function behind(feetY, base) {
  return feetY < base;
}

// Cutout asset id for an occluder on the active plate: "fg/<plate name>--<id>".
export function occluderAsset(plate, id) {
  const name = String(plate).replace(/^bg[/-]/, "").replace(/\.[a-z0-9]+$/i, "");
  return `fg/${name}--${id}`;
}
