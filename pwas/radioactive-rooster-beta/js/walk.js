// Walkable areas + alternate background states. Pure functions (no DOM) so node tests can cover them.
// A room may define `walk: [[ [x, y], ... ], ...]`: one or more polygons in logical px (feet positions).
// A room may define `states: [{ flag, plate, walk, spriteTint }]`: when game flag `flag` is set, that plate, walk area
// and sprite tint win
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

// Walk route: [to] when the straight line stays inside the area, else waypoints around whatever blocks it
// (a 1 px grid search over the area, then string-pulled to the fewest straight legs). Used when the area has a hole
// or a deep notch (the rooftop hatch), where sliding along an edge would get him stuck at a corner.
export function clearLine(area, a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 0; i <= n; i++) if (!inArea(area, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n)) return false;
  return true;
}

const GRIDS = new WeakMap();
export function findPath(area, from, to, W = 320, H = 180) {
  if (!area || !area.length) return [to];
  const start = clampToArea(area, from[0], from[1]);
  const goal = clampToArea(area, to[0], to[1]);
  if (clearLine(area, start, goal)) return [goal];
  let ok = GRIDS.get(area);
  if (!ok) {
    ok = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) ok[y * W + x] = inArea(area, x + 0.5, y + 0.5) ? 1 : 0;
    GRIDS.set(area, ok); // the walk area arrays are static room data: build each grid once
  }
  const cell = ([x, y]) => {
    let cx = Math.max(0, Math.min(W - 1, Math.floor(x))), cy = Math.max(0, Math.min(H - 1, Math.floor(y)));
    if (ok[cy * W + cx]) return cy * W + cx;
    let best = -1, bd = Infinity; // nearest walkable cell
    for (let i = 0; i < W * H; i++) if (ok[i]) { const d = Math.hypot((i % W) - cx, Math.floor(i / W) - cy); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  const s = cell(start), g = cell(goal);
  if (s < 0 || g < 0) return [goal];
  const prev = new Int32Array(W * H).fill(-1);
  prev[s] = s;
  const q = [s];
  for (let h = 0; h < q.length && prev[g] < 0; h++) {
    const i = q[h], x = i % W, y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (!ok[j] || prev[j] >= 0) continue;
      prev[j] = i;
      q.push(j);
    }
  }
  if (prev[g] < 0) return [goal]; // unreachable: fall back to sliding
  const raw = [];
  for (let i = g; i !== s; i = prev[i]) raw.push([(i % W) + 0.5, Math.floor(i / W) + 0.5]);
  raw.reverse();
  raw[raw.length - 1] = goal;
  const out = [];
  let at = start, k = 0;
  while (k < raw.length) {
    let far = k;
    for (let j = raw.length - 1; j > k; j--) if (clearLine(area, at, raw[j])) { far = j; break; }
    out.push(raw[far]);
    at = raw[far];
    k = far + 1;
  }
  return out;
}

// Active plate + walk area for a room given the game flags.
export function roomView(room, flags = {}) {
  let view = { plate: room.plate, walk: room.walk || null, state: null, spriteTint: room.spriteTint || null };
  for (const st of room.states || []) {
    if (flags[st.flag]) view = { plate: st.plate || view.plate, walk: st.walk || view.walk, state: st.flag, spriteTint: st.spriteTint || view.spriteTint };
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

// An occluder's base line on the active plate: `bases` overrides per plate name (the opened rope sits lower).
// Feet y of an occluder's front edge at feet x (`edge` polyline, clamped to its ends): behind it while feet y < this.
export function edgeY(edge, x) {
  if (x <= edge[0][0]) return edge[0][1];
  for (let i = 1; i < edge.length; i++) {
    const [x0, y0] = edge[i - 1], [x1, y1] = edge[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return edge[edge.length - 1][1];
}

// Is he (feet x, y) behind occluder o? `edge` occluders decide from his feet against their front edge; others by base.
export function behindOccluder(o, x, y, plate) {
  return o.edge ? y < edgeY(o.edge, x) : behind(y, occluderBase(o, plate));
}

export function occluderBase(o, plate) {
  const name = String(plate).replace(/^bg[/-]/, "").replace(/\.[a-z0-9]+$/i, "");
  return (o.bases && o.bases[name] !== undefined) ? o.bases[name] : o.base;
}

// Cutout asset id for an occluder on the active plate: "fg/<plate name>--<id>".
export function occluderAsset(plate, id) {
  const name = String(plate).replace(/^bg[/-]/, "").replace(/\.[a-z0-9]+$/i, "");
  return `fg/${name}--${id}`;
}

// Per-room sprite tint (draft, default off). A room may set
//   spriteTint: { brightness: 0.8, saturate: 0.85, sepia: 0.1, hue: -5 }
// to sit the lit-for-daylight character sprites into a dark plate. It becomes one CSS filter applied to every
// character sprite in the room (hero, pose, cast); scenery and occluders are untouched. Unknown keys and
// non-numeric or out-of-range values are dropped, so a typo can't blank a sprite. No field, null or {} = "" (off).
const TINT_KEYS = [
  ["brightness", "brightness", "", 0, 2],
  ["contrast", "contrast", "", 0, 2],
  ["saturate", "saturate", "", 0, 2],
  ["sepia", "sepia", "", 0, 1],
  ["hue", "hue-rotate", "deg", -180, 180],
];
export function spriteFilter(room) {
  const t = room && room.spriteTint;
  if (!t || typeof t !== "object") return "";
  const parts = [];
  for (const [key, fn, unit, lo, hi] of TINT_KEYS) {
    const v = t[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) continue;
    parts.push(`${fn}(${+v.toFixed(3)}${unit})`);
  }
  return parts.join(" ");
}

/* ---------- Cast frames: idle, talk flaps, cue poses, short cue walks, ambient loops ---------- */
// Pure: js/main.js calls it on every render and from an 80 ms ticker. Purely visual; game logic never reads it.
export const TALK_MS = 2600; // a talk flap lasts this long after its line appears
export const FLAP_MS = 190;
export const CUE_WALK_MS = 2200;

function speaking(c, line, lastAct, speakers) {
  if (!line) return false;
  const voices = [].concat(c.voice || []);
  if (voices.some((v) => speakers[v] && speakers[v] === line.speaker)) return true;
  // Silent characters (the sitting hen) flap when their own hotspot was the one talked to.
  return !!(c.talkOn && lastAct && lastAct.verb === "talk" && [].concat(c.talkOn).includes(lastAct.spot) && !line.speaker);
}

// A timed beat sequence, played once and held on its last frame: seq = [[sprite, ms, at?], ...] (at defaults to `at`).
function seqFrame(seq, since, at) {
  let t = Math.max(0, since);
  for (const [sprite, ms, where] of seq) {
    if (t < ms) return { sprite, at: where || at };
    t -= ms;
  }
  const [sprite, , where] = seq[seq.length - 1];
  return { sprite, at: where || at };
}

export function castFrame(c, { line = null, since = Infinity, now = 0, lastAct = null, speakers = {} } = {}) {
  let cue = line && line.cue && c.cues && c.cues[line.cue];
  // since < 0: the line is up but its cue hasn't started (a cutscene holds it for its hit): poses wait, walks sit at their start
  if (cue && since < 0 && !cue.walk) cue = null;
  if (cue && typeof cue === "string") return { sprite: cue, at: c.at };
  if (cue && !cue.walk && cue.seq) return seqFrame(cue.seq, since, cue.at || c.at);
  if (cue && !cue.walk) return { sprite: cue.sprite, at: cue.at || c.at }; // a held pose somewhere else: { sprite, at }
  if (cue) {
    const ms = cue.ms || CUE_WALK_MS;
    const t = Math.min(1, Math.max(0, since) / ms);
    const from = cue.from || c.at; // a walk can start where an earlier cue left him (`from`)
    const at = [from[0] + (cue.to[0] - from[0]) * t, from[1] + (cue.to[1] - from[1]) * t];
    if (t >= 1 && cue.seq) return seqFrame(cue.seq, since - ms, cue.to); // walk there, then play the beat
    if (t >= 1) return { sprite: cue.end || cue.walk[0], at };
    return { sprite: cue.walk[Math.floor(Math.max(0, since) / 160) % cue.walk.length], at };
  }
  const fresh = line && since >= 0 && since < TALK_MS;
  if (c.talk && fresh && speaking(c, line, lastAct, speakers)) return { sprite: Math.floor(since / FLAP_MS) % 2 ? c.sprite : c.talk, at: c.at };
  if (c.frames) return { sprite: c.frames[Math.floor(now / (c.every || 700)) % c.frames.length], at: c.at };
  return { sprite: c.sprite, at: c.at };
}

// Every sprite a cast entry can show (idle, talk, cue poses and walks, loop frames): what the manifest must carry.
export function castSprites(c) {
  const out = new Set([c.sprite]);
  if (c.talk) out.add(c.talk);
  for (const f of c.frames || []) out.add(f);
  for (const cue of Object.values(c.cues || {})) {
    if (typeof cue === "string") out.add(cue);
    else if (!cue.walk && !cue.seq) out.add(cue.sprite);
    else { for (const f of cue.walk || []) out.add(f); if (cue.end) out.add(cue.end); }
    for (const [f] of (cue && cue.seq) || []) out.add(f);
  }
  return [...out];
}

/* ---------- Stand beside, not in front (Arlong, 2026-10-18) ----------
 * To use a hotspot he walks to its left or right side, never into it: his idle side frame, facing the object, must
 * not overlap the hotspot's core rect (spot.core, else its rect; HERO_ALLOW px of overlap is fine). He prefers the
 * side he is coming from, else the nearest open side, and turns to face the object when he arrives. Characters get
 * conversational distance on top. Exits keep their own stand point (he walks *into* those).
 * Overrides per spot: `beside: false` (keep `stand`, e.g. he has to be on top of it), `side: "l" | "r"` (only that
 * side), `core: [x, y, w, h]` (the solid part, when the clickable rect is generous), `stand` (its y is the feet line
 * to try first). */
export const HERO_REACH = 0.2; // the idle side frame's beak/glove reach in front of his feet, as a share of his height
export const HERO_BACK = 0.39; // ...and the tail behind him
export const HERO_ALLOW = 2; // px his frame may overlap a hotspot's core rect
const TALK_GAP = 0.1; // extra gap to a character, share of his height

export function heroHeightAt(room, y) {
  return room.hero.depth ? depthHeight(room.hero, y) : room.hero.height || 64;
}

// His frame's box at feet (x, y) facing `face` ("l" | "r"): [x0, y0, x1, y1].
export function heroBox(room, x, y, face) {
  const h = heroHeightAt(room, y);
  const fwd = HERO_REACH * h, back = HERO_BACK * h;
  return face === "r" ? [x - back, y - h, x + fwd, y] : [x - fwd, y - h, x + back, y];
}

function overlaps(box, core, allow = HERO_ALLOW) {
  const [cx, cy, cw, ch] = core;
  return box[0] < cx + cw - allow && box[2] > cx + allow && box[1] < cy + ch - allow && box[3] > cy + allow;
}

// Other characters' hotspot rects he shouldn't plant himself in front of while using something else.
export function castRects(room, except) {
  const ids = new Set((room.cast || []).map((c) => c.spot).filter(Boolean));
  return room.spots.filter((s) => ids.has(s.id) && s.id !== except).map((s) => s.core || s.rect);
}

// The other characters' bodies (head, shoulders, chest: the part that reads), from their feet and height, for the
// "neither blocks the other" rule (Arlong: Rooster hidden behind Corny at the clock). `when` cast only when shown.
export function castBodies(room, except, flags = {}) {
  const out = [];
  for (const c of room.cast || []) {
    if ((except && c.spot === except) || (c.when && !flags[c.when]) || (c.whenNot && flags[c.whenNot]) || !c.height || c.prop) continue; // props (cage, steam) aren't bodies
    const h = c.height, w = Math.round(h * 0.4);
    out.push([c.at[0] - w / 2, c.at[1] - h, w, Math.round(h * 0.6)]);
  }
  return out;
}

export function standFor(room, spot, { walk, from, cast = room.cast || [], avoid = castRects(room, spot.id), bodies = castBodies(room, spot.id) } = {}) {
  const fallback = spot.stand || [spot.rect[0] + spot.rect[2] / 2, spot.rect[1] + spot.rect[3]];
  const core = spot.core || spot.rect;
  const mid = core[0] + core[2] / 2;
  const faceTo = (x) => (Math.abs(mid - x) < 2 ? null : mid > x ? "r" : "l");
  const [fx0, fy0] = walk ? clampToArea(walk, ...fallback) : fallback;
  if (spot.exit || spot.beside === false || !walk) return { x: fx0, y: fy0, face: spot.face || faceTo(fx0), rule: spot.standBehind ? "behind" : "fixed" };
  const facing0 = faceTo(fx0) || "r";
  const box0 = heroBox(room, fx0, fy0, facing0);
  if (!overlaps(box0, core) && !bodies.some((a) => overlaps(box0, a))) return { x: fx0, y: fy0, face: faceTo(fx0), rule: "clear" };
  const npc = spot.npc || cast.some((c) => c.spot === spot.id);
  // the side he comes from first (else the side his old stand point leaned to), then the other; each down a few feet lines
  const sides = spot.side ? [spot.side] : (from ? from[0] < mid : fx0 < mid) ? ["l", "r"] : ["r", "l"];
  const ys = [0, 4, -4, 8, -8, 12, 16, 20, 24].map((d) => fy0 + d);
  let spare = null;
  for (const side of sides) {
    for (const y of ys) {
      const h = heroHeightAt(room, y);
      const gap = (npc ? TALK_GAP * h : 0) + 0.5;
      const reach = HERO_REACH * h;
      const x = side === "l" ? core[0] + HERO_ALLOW - reach - gap : core[0] + core[2] - HERO_ALLOW + reach + gap;
      const [px, py] = clampToArea(walk, x, y);
      const face = side === "l" ? "r" : "l";
      if (Math.hypot(px - x, py - y) > 1.5) {
        // pushed by the walk area's edge: still fine if the clamped point clears the object from the same side
        if (overlaps(heroBox(room, px, py, face), core)) continue;
        if ((side === "l" && px > mid) || (side === "r" && px < mid)) continue;
      }
      const cand = { x: px, y: py, face, side, rule: npc ? "talk" : "beside" };
      // don't stand in front of somebody else (the bell's right side is Ned): keep looking, remember it as a last resort
      const box = heroBox(room, px, py, face);
      if (avoid.some((r) => overlaps(box, r, Math.min(r[2], r[3]) * 0.25)) || bodies.some((r) => overlaps(box, r, Math.min(r[2], r[3]) * 0.25))) { spare = spare || cand; continue; }
      return cand;
    }
  }
  if (spare) return spare;
  return { x: fx0, y: fy0, face: faceTo(fx0), rule: "blocked" };
}
