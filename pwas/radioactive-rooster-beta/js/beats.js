// PLACEHOLDER beats (Push C, 2026-10-24): time cards, the club cutaway and the cold open, so Arlong can feel the pacing
// before the real art, wording and timing land. Every beat wears a "PLACEHOLDER" tag.
//
// Beats live on document.body (render() rebuilds #app every frame). They never block input: pointer-events are off,
// and any click or key skips the beat that is playing while the click still goes through to the game. While one
// plays, beatActive() is true (window.__RR.busy reports it, so scripted playtests wait it out).
//
// Art: each beat draws its art id (art/manifest.json, listed in assets/PLACEHOLDERS.md) when a file exists, else a
// gray-box stand-in. Final art replaces it by file name: drop art/pixel/<id>.png, run tools/art_files.py. No code change.
import { artUrl, assetInfo } from "./art.js";
import { cueThenLoop, holdBed, loopCue, playCue, releaseBed, stopLoop } from "./audio.js";
import { CLUB_SIGN, GOBBLER_DIM, SIGN_VARIANT } from "../data/script.js";

export const BEAT_MS = { card: 2600, club: 4400, clubWhisk: 5400, coldopen: 5600, potato: 3200, carny: 4200, sign: 4600 };
// Club sign timings (Hawkeye pass 2026-10-25), synced to Brook's placeholder cues:
// club: the stogie henchman's smack lands at smack ms; the dark parts sputter for sputter ms (neon-sputter starts with it).
// sign: neon-lightup (2.6 s) flickers 0.14-0.9 s and snaps on at 0.95 s, so the dark letters come on one by one across
// that window (letters[i] ms), the full name snaps bright at snap ms, and neon-hum-full loops from when the cue ends.
export const SIGN_MS = { smack: 1800, sputter: 500, thecock: 140, letters: [200, 305, 410, 515, 620, 725, 830], snap: 950, lightup: 2600 };
// Brook's henchman frames (sprite/stogie-sil-smack-l-h72-*): each pose shows from its ms (from the club node's start)
// until the next; idle from the walk-in, the hit spans the impact at SIGN_MS.smack, settle holds to the end of the beat.
export const HENCH_FRAMES = [["idle", 0], ["windup", 1480], ["wind", 1580], ["swing", 1720], ["hit", 1750], ["settle", 1850]]; // windup: Brook's arm-fix in-between (2026-10-25)
// Lit-letter cutouts of Brook's B3 (tools/neon/club_sign_parts.py) that flash over the club plate while a part sputters.
const SIGN_LIT_ART = { thecock: "club/sign-thecock-lit", gobbler: "club/sign-gobbler-lit" };
// GOBBLER's tubes on the 320x180 club plate (for the GOBBLER_DIM box), in % of the plate.
const GOBBLER_BOX = { left: 38.5, top: 37, width: 20, height: 17 };
// Preview-only beats: never triggered by the story (Push B is not approved yet). __RR.beats([{ kind: "potato" }]).
export const PREVIEW_ONLY = ["potato", "carny"];

let current = null; // { kind, node, timer, resolve }
let signStop = null; // cancels neon-lightup's handoff and stops the neon-hum-full loop
let chain = Promise.resolve();
let pending = 0;
const listeners = new Set();

export function beatActive() {
  return pending > 0;
}

export function onBeatsDone(fn) {
  listeners.add(fn);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// The art file for an id if one has landed, else null (the gray box stays).
function art(id, cls) {
  const url = artUrl(id);
  if (!url) return null;
  const img = el("img", cls);
  img.alt = "";
  img.src = url;
  img.dataset.id = id;
  return img;
}

function tag(node, what) {
  const t = el("div", "beat-tag", `PLACEHOLDER: ${what}`);
  node.append(t);
}

function svg(markup, cls) {
  const wrap = el("div", cls);
  wrap.innerHTML = markup;
  return wrap;
}

/* ---------- the beats ---------- */

function cardNode(beat) {
  const node = el("div", "beat beat-card");
  node.dataset.beat = "card";
  node.dataset.card = beat.id;
  const bg = art("card/bg", "beat-bg");
  if (bg) node.append(bg);
  const box = el("div", "card-text");
  box.append(el("div", "card-title", beat.title));
  if (beat.sub) box.append(el("div", "card-sub", beat.sub));
  node.append(box);
  tag(node, "time card (wording + type to approve)");
  return node;
}

// Hawk silhouette in red neon tube: wings up, head turned. Gray-box club: back wall, bar, stools, a piano.
const HAWK = `<svg viewBox="0 0 96 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
<path d="M48 40 C40 30 30 22 6 14 C18 26 22 30 26 34 C20 34 16 36 12 38 C24 40 34 40 42 42"/>
<path d="M48 40 C56 30 66 22 90 14 C78 26 74 30 70 34 C76 34 80 36 84 38 C72 40 62 40 54 42"/>
<path d="M44 42 C44 36 46 30 50 28 C53 27 56 28 57 31 L62 32 L57 34 C56 38 54 42 52 46 L48 58 L44 46 Z"/>
<path d="M44 58 L40 62 M48 58 L48 63 M52 58 L56 62"/></g></svg>`;

// Hattie at the piano's end: a solid black hen silhouette (no features), domino-mask notch, long cigarette holder.
const HATTIE_SIL = `<svg viewBox="0 0 60 90" aria-hidden="true"><g fill="#050507">
<path d="M22 88 C14 70 14 52 20 42 C16 38 15 30 19 24 C21 16 30 12 36 16 C40 12 46 14 44 20 C48 22 49 28 46 32 L52 34 L46 37 C46 44 42 46 38 48 C46 56 48 72 42 88 Z"/>
<path d="M30 10 C32 4 38 2 40 6 C36 6 34 8 33 12 Z"/>
<rect x="44" y="35" width="15" height="1.6"/></g>
<path d="M26 26 C30 23 38 23 44 26 C40 29 30 29 26 26 Z" fill="#141018"/></svg>`;

// A small gloved hand, two fingers out, that taps the holder (placeholder gesture).
const GLOVE_FLICK = `<svg viewBox="0 0 20 14" aria-hidden="true"><path d="M2 9 C2 5 5 4 8 5 L16 3.4 C17.6 3.2 17.8 5 16.3 5.3 L11 6.4 L17 6.6 C18.6 6.7 18.5 8.5 16.9 8.4 L10.5 8.3 C9 11 5 12 3 11 Z" fill="#0b0a0e" stroke="#7a1616" stroke-width=".8"/></svg>`;

// smokeVeil (Arlong 2026-10-25): a reusable cigarette-smoke veil that hides Hattie's mask and face until the Pavilion
// unmasking (VEIL.flag in js/logic.js, right after the hero choice); only the holder's ember glows through. state "thick" (before the reveal), "whisk" (thick,
// then .clear() waits for the drift loop to come round to frame 01, which equals clear frame 01 (clear({ now: true }), the
// Pavilion reveal: starts at once; .finish() ends a clear on the spot), and plays the clear
// strip once with the gloved flick and the smoke-whoosh cue on its first frame; its sax note lands ~0.72 s in as the
// mask shows) or "open" (after the payoff: no smoke). Art: Brook's strips club/smoke-drift (12 x 320x180, 180 ms a
// frame, loop) and club/smoke-clear (8 frames, per-frame ms in the manifest, last frame clear); frame counts come from
// the strip width / 320 (tools/art_files.py). Procedural CSS blobs when the strips are missing. The optional club
// room's booth can mount the same node over its own Hattie. opts.ids picks the strips' id prefix ("club/smoke" default,
// "pavilion/smoke" for Brook's Pavilion strips, js/main.js pavilionVeil); opts.art = false forces the CSS blobs.
// opts.onFrame(phase, i): called on the same tick as every stage frame ("drift" i / "clear" i) and "done", so other
// art (Hattie's smoke portrait, js/main.js) can step in lockstep with the stage smoke.
const VEIL_BLOBS = [[-12, -8], [22, -14], [48, 4], [-6, 30], [30, 26], [8, 52], [44, 48]]; // % of the mask box
function frameMs(info, i) {
  const t = info && info.frame_ms;
  return Array.isArray(t) ? (t[i] ?? t[t.length - 1]) : (t || 1000 / ((info && info.fps) || 8));
}
// A strip stepped by timers (not CSS) so the veil knows which frame is up. Returns { node, frame(), stop() }.
function steppedStrip(id, cls) {
  const info = assetInfo(id) || {};
  const n = info.frames || 1;
  const node = el("div", `strip stepped ${cls || ""}`);
  node.dataset.id = id;
  node.style.backgroundImage = `url("${artUrl(id)}")`;
  node.style.setProperty("--frames", String(n));
  let i = 0, timer = null, stopped = false;
  const show = () => { node.style.backgroundPosition = `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0`; node.dataset.frame = String(i + 1); };
  const api = {
    node, n, frame: () => i,
    stop() { stopped = true; clearTimeout(timer); },
    last() { stopped = true; clearTimeout(timer); i = n - 1; show(); }, // jump to the last frame and stay there
    // loop: forever; once: to the last frame, then resolve. onFrame(i) after each step.
    run(loop, onFrame) {
      return new Promise((resolve) => {
        show();
        const tick = () => {
          if (stopped || !node.isConnected) { resolve(); return; }
          if (!loop && i >= n - 1) { resolve(); return; }
          i = loop ? (i + 1) % n : i + 1;
          show();
          if (onFrame) onFrame(i);
          timer = setTimeout(tick, frameMs(info, i));
        };
        timer = setTimeout(tick, frameMs(info, i));
      });
    },
  };
  return api;
}

export function smokeVeil(state = "thick", opts = {}) {
  const veil = el("div", `smoke-veil veil-${state}`);
  veil.dataset.veil = state;
  if (state === "open") return { node: veil, clear: () => Promise.resolve(), finish: () => Promise.resolve() };
  const drift = el("div", "veil-drift");
  const glove = svg(GLOVE_FLICK, "veil-glove");
  veil.append(drift, el("div", "veil-ember"), glove);
  const ids = opts.ids || "club/smoke"; // the strips' id prefix: "<ids>-drift" / "<ids>-clear" ("pavilion/smoke" at the Pavilion)
  const useArt = opts.art !== false && !!(artUrl(`${ids}-drift`) && artUrl(`${ids}-clear`));
  let loop = null, atFrame1 = null;
  if (useArt) {
    drift.classList.add("has-strip");
    loop = steppedStrip(`${ids}-drift`, "veil-strip");
    drift.append(loop.node);
    loop.run(true, (i) => {
      if (i === 0 && atFrame1) { const go = atFrame1; atFrame1 = null; go(); return; }
      if (opts.onFrame) opts.onFrame("drift", i);
    });
    if (opts.onFrame) opts.onFrame("drift", 0);
  } else {
    for (let i = 0; i < 7; i += 1) {
      const b = el("div", "veil-blob");
      b.style.setProperty("--i", String(i));
      b.style.left = `${VEIL_BLOBS[i][0]}%`;
      b.style.top = `${VEIL_BLOBS[i][1]}%`;
      drift.append(b);
    }
  }
  let gone = false, endNow = null;
  const done = () => { if (gone) return; gone = true; veil.classList.add("veil-gone"); veil.dataset.veil = "open"; if (opts.onFrame) opts.onFrame("done", -1); };
  const start = () => { playCue("smoke-whoosh"); veil.classList.add("veil-flick", "veil-clearing"); };
  let cleared = null;
  // clear({ now }): now = start the clear strip on this tick, cutting the drift loop short (the Pavilion reveal,
  // Chopper 2026-10-26: waiting for drift frame 01 cost up to 2 s); else wait for frame 01 (== clear frame 01, no pop).
  const clear = ({ now = false } = {}) => cleared || (cleared = new Promise((resolve) => {
    const end = () => { endNow = null; done(); resolve(); };
    if (!useArt) { // procedural: flick + whoosh + blobs streak right (~1 s)
      start();
      const t = setTimeout(end, 1000);
      endNow = () => { clearTimeout(t); end(); };
      return;
    }
    let once = null, hold = null;
    const swap = () => {
      if (!veil.isConnected) { resolve(); return; }
      loop.stop();
      once = steppedStrip(`${ids}-clear`, "veil-strip");
      drift.replaceChildren(once.node);
      start();
      if (opts.onFrame) opts.onFrame("clear", 0);
      once.run(false, (i) => { if (opts.onFrame) opts.onFrame("clear", i); }).then(() => { if (endNow) hold = setTimeout(end, frameMs(assetInfo(`${ids}-clear`), once.n - 1)); });
    };
    // finish(): the clear's last frame and "done" right now (the player moved on before the clear finished)
    endNow = () => {
      clearTimeout(hold);
      if (!once) { atFrame1 = null; swap(); }
      if (once) { once.last(); if (opts.onFrame) opts.onFrame("clear", once.n - 1); }
      end();
    };
    if (now || loop.frame() === 0) swap(); else atFrame1 = swap;
  }));
  // finish(): end the clear immediately (starting it if needed); resolves clear()'s promise
  const finish = () => { const p = clear({ now: true }); if (endNow) endNow(); return p; };
  return { node: veil, clear, finish };
}

function clubNode(beat = {}) {
  const node = el("div", "beat beat-club");
  node.dataset.beat = "club";
  const veilState = beat.veil || "thick";
  const stage = el("div", "beat-stage");
  // The sign (Hawkeye pass): the plate that matches the lit parts. B3 is all lit; thecock / signoff are Brook's variants.
  const sign = beat.sign || { hawk: true, thecock: true, gobbler: true };
  const dark = CLUB_SIGN.parts.filter((p) => !sign[p]);
  const plate = !dark.length ? CLUB_SIGN.clubArt.lit : sign.thecock ? CLUB_SIGN.clubArt.B : CLUB_SIGN.clubArt.A;
  const bg = art(plate, "beat-bg") || art("club/bg", "beat-bg");
  if (bg) stage.append(bg);
  if (bg) {
    node.dataset.plate = bg.dataset.id;
    if (!sign.gobbler && GOBBLER_DIM > 0) {
      const dim = el("div", "club-gob-dim");
      Object.assign(dim.style, { left: `${GOBBLER_BOX.left}%`, top: `${GOBBLER_BOX.top}%`, width: `${GOBBLER_BOX.width}%`, height: `${GOBBLER_BOX.height}%`, background: `rgba(6,2,8,${GOBBLER_DIM})` });
      stage.append(dim);
    }
    for (const p of dark) {
      const lit = SIGN_LIT_ART[p] && art(SIGN_LIT_ART[p], "beat-bg club-sign-flash");
      if (lit) stage.append(lit);
    }
  }
  else {
    stage.append(el("div", "gb club-wall"), el("div", "gb club-bar"), el("div", "gb club-piano"));
    for (let i = 0; i < 4; i += 1) {
      const s = el("div", "gb club-stool");
      s.style.left = `${18 + i * 9}%`;
      stage.append(s);
    }
  }
  // Brook's painted interior (club/bg, option B3) already has the back-bar neon hawk and Hattie's silhouette; the
  // stand-ins only draw over the gray box.
  if (!artUrl("club/bg") || artUrl("club/neon-hawk")) stage.append(art("club/neon-hawk", "club-hawk-art") || svg(HAWK, "club-hawk"));
  // Canon (2026-10-24): Hattie only as a masked silhouette with a cigarette holder. No face, ever.
  if (!artUrl("club/bg") || artUrl("club/hattie-sil")) {
    stage.append(art("club/hattie-sil", "club-hattie-art") || svg(HATTIE_SIL, "club-hattie"));
    stage.append(el("div", "club-holder-ember"));
  } else node.classList.add("on-art");
  // Arlong 2026-10-24: she says NOTHING here (her voice would give the twist away). Only a smoke wisp off the holder
  // and a small gloved flick of ash; Gizzard's piano (the club bed) carries the scene.
  stage.append(el("div", "club-smoke"), el("div", "club-smoke s2"), svg(GLOVE_FLICK, "club-gesture"));
  // Usopp 2026-10-25: a stogie henchman walks up and smacks the sign; the dark letters sputter about half a second and
  // die again (the hawk stays lit). Brook's six smack frames (HENCH_FRAMES); the SVG stand-in only if they're missing.
  if (beat.smack && dark.length) {
    const ids = HENCH_FRAMES.map(([pose]) => `sprite/stogie-sil-smack-l-h72-${pose}`);
    if (ids.every((id) => artUrl(id))) { // Brook's frames: one pixelated img, src swapped on the timeline (all preloaded)
      ids.forEach((id) => { new Image().src = artUrl(id); });
      const img = el("img", "club-hench club-hench-art");
      img.alt = ""; img.src = artUrl(ids[0]); img.dataset.pose = HENCH_FRAMES[0][0];
      stage.append(img);
      HENCH_FRAMES.slice(1).forEach(([pose, ms], i) => setTimeout(() => { if (img.isConnected) { img.src = artUrl(ids[i + 1]); img.dataset.pose = pose; } }, ms));
    } else stage.append(svg(HENCH, "club-hench")); // fallback: the SVG stand-in with the CSS arm swing
    node.style.setProperty("--smack-ms", `${SIGN_MS.smack}ms`);
    node.style.setProperty("--sputter-ms", `${SIGN_MS.sputter}ms`);
    setTimeout(() => { if (node.isConnected) node.classList.add("smacked"); }, SIGN_MS.smack);
  }
  const veil = smokeVeil(veilState);
  stage.append(veil.node);
  if (veilState === "whisk") setTimeout(() => { if (node.isConnected) veil.clear(); }, 1400); // payoff: flick, whisk, mask
  node.append(stage);
  tag(node, artUrl("club/bg") ? "club cutaway (Brook's interior option B3, not approved; no dialogue until approved)" : "club cutaway (gray box; no dialogue until approved)");
  return node;
}

// The stogie henchman stand-in (fallback when Brook's frames are missing): a broad dark silhouette in a fedora, red rim light, a lit stogie; the arm swings
// up-left into the sign at the smack.
const HENCH = `<svg viewBox="0 0 60 120" aria-hidden="true"><g fill="#0d0a10" stroke="#7a1414" stroke-width="1.2" stroke-linejoin="round">
<path d="M14 118 L16 70 C10 62 10 46 18 40 L42 40 C50 46 50 62 44 70 L46 118 Z"/>
<circle cx="30" cy="30" r="10"/>
<path d="M16 24 L44 24 L40 20 L38 12 L22 12 L20 20 Z"/></g>
<rect x="38" y="31" width="9" height="3" fill="#4a2a18"/><circle cx="47.5" cy="32.5" r="1.6" fill="#ff7a1a" class="hench-ember"/>
<g class="hench-arm"><path d="M20 44 L4 30 L1 33 L16 50 Z" fill="#0d0a10" stroke="#7a1414" stroke-width="1.2"/><circle cx="2.5" cy="31" r="3.4" fill="#0d0a10" stroke="#7a1414" stroke-width="1.2"/></g></svg>`;

// The cut after Hattie's Pavilion speech (Usopp 2026-10-25): the club sign across the boardwalk, close on the Midway
// plate. The dead-tube patches (the variant's dark parts) come off letter by letter in sync with neon-lightup, the full
// name snaps on and holds over neon-hum-full, then back to the Pavilion. Flag CLUB_SIGN.lit keeps it lit afterwards.
function signNode() {
  const node = el("div", "beat beat-sign");
  node.dataset.beat = "sign";
  const stage = el("div", "beat-stage");
  const zoom = el("div", "sign-zoom");
  const bg = art("bg/midway", "beat-bg");
  if (bg) zoom.append(bg);
  else zoom.append(el("div", "gb sign-gb"));
  const before = CLUB_SIGN.before[SIGN_VARIANT] || CLUB_SIGN.before.A;
  const patches = [];
  const patch = (id, ms) => {
    const info = assetInfo(id);
    const img = art(id, "sign-patch");
    if (!img || !info || !info.at) return;
    Object.assign(img.style, { left: `${(info.at[0] / 320) * 100}%`, top: `${(info.at[1] / 180) * 100}%`, width: `${(info.size[0] / 320) * 100}%`, height: `${(info.size[1] / 180) * 100}%` });
    img.style.setProperty("--on-ms", `${ms}ms`);
    zoom.append(img);
    patches.push(img);
  };
  if (!before.thecock) patch("fx/clubsign-dark-thecock", SIGN_MS.thecock);
  if (!before.gobbler) SIGN_MS.letters.forEach((ms, i) => patch(`fx/clubsign-dark-g${i + 1}`, ms));
  node.style.setProperty("--snap-ms", `${SIGN_MS.snap}ms`);
  stage.append(zoom, el("div", "sign-glow"));
  node.append(stage);
  tag(node, "club sign cut (Midway plate close-up; Brook's dead-tube patches)");
  return node;
}

// A white cartoon glove (four fingers, cuff), reaching right.
const GLOVE = `<svg viewBox="0 0 48 40" aria-hidden="true"><g fill="#e9e6dc" stroke="#1a1a22" stroke-width="1.5" stroke-linejoin="round">
<rect x="2" y="13" width="12" height="16" rx="3"/>
<path d="M13 14 C18 10 26 10 30 12 L42 12 C45 12 45 16 42 16 L32 16 L44 17 C47 17 47 21 44 21 L32 21 L43 22 C46 22 46 26 43 26 L31 26 L39 27 C42 27 42 31 39 31 L24 31 C18 31 14 29 13 28 Z"/>
<path d="M20 12 C21 7 26 6 27 10 L28 13"/></g></svg>`;

function coldOpenNode() {
  const node = el("div", "beat beat-coldopen");
  node.dataset.beat = "coldopen";
  const stage = el("div", "beat-stage");
  const bg = art("coldopen/bg", "beat-bg");
  if (bg) stage.append(bg);
  else {
    stage.append(el("div", "gb hh-wall"), el("div", "gb hh-roost"), el("div", "gb hh-nest"));
    for (let i = 0; i < 6; i += 1) {
      const plank = el("div", "gb hh-plank");
      plank.style.left = `${i * 17}%`;
      stage.append(plank);
    }
  }
  const egg = art("coldopen/egg-glow", "co-egg-art") || el("div", "co-egg");
  const glove = art("coldopen/glove", "co-glove-art") || svg(GLOVE, "co-glove");
  const ember = art("coldopen/ember", "co-ember-art") || el("div", "co-ember");
  const smoke = el("div", "co-smoke");
  stage.append(egg, glove, ember, smoke);
  node.append(stage);
  tag(node, "cold open (glove, egg glow, cigar ember only; no face; no dialogue until approved)");
  return node;
}

// One strip frame (art/manifest.json grid [frames, 1]) as a div with a background-position flipbook.
function strip(id, frames, fps, cls) {
  const url = artUrl(id);
  const n = el("div", `strip ${cls || ""}`);
  n.dataset.id = id;
  if (url) n.style.backgroundImage = `url("${url}")`;
  n.style.setProperty("--frames", String(frames));
  n.style.setProperty("--strip-ms", `${Math.round((1000 / fps) * frames)}ms`);
  return n;
}

// Push B PLACEHOLDER (preview only): the flaming potato's arc across the midway night, with its ember trail.
function potatoNode() {
  const node = el("div", "beat beat-potato");
  node.dataset.beat = "potato";
  const stage = el("div", "beat-stage");
  const bg = art("bg/midway", "beat-bg");
  if (bg) { bg.style.filter = "brightness(.45) saturate(.8)"; stage.append(bg); }
  const flyer = el("div", "potato-flyer");
  flyer.append(strip("fx/potato-trail", 6, 12, "potato-trail"), strip("fx/potato-flame", 8, 12, "potato-flame"));
  stage.append(flyer);
  node.append(stage);
  tag(node, "Push B potato cannon (Brook placeholder frames; preview only, not in the story)");
  return node;
}

// Push B PLACEHOLDER (preview only): the carny guard idles, talks, then runs off scared.
function carnyNode() {
  const node = el("div", "beat beat-carny");
  node.dataset.beat = "carny";
  const stage = el("div", "beat-stage");
  const bg = art("bg/midway", "beat-bg");
  if (bg) { bg.style.filter = "brightness(.5)"; stage.append(bg); }
  const guy = el("div", "carny");
  guy.append(strip("sprite/carny-guard-idle", 2, 2, "carny-idle"), strip("sprite/carny-guard-talk", 2, 6, "carny-talk"), strip("sprite/carny-guard-run", 4, 10, "carny-run"));
  stage.append(guy);
  node.append(stage);
  tag(node, "Push B carny guard idle / talk / run (Brook placeholder frames; preview only)");
  return node;
}

const BUILD = { card: cardNode, club: clubNode, coldopen: coldOpenNode, potato: potatoNode, carny: carnyNode, sign: signNode };

const SOUND = {
  card: () => { playCue("clock-tick"); return [setTimeout(() => playCue("clock-tick"), 1000), setTimeout(() => playCue("clock-tick"), 2000)]; },
  club: (b) => {
    playCue("cutaway"); loopCue("neon-hum"); // thin flaky hum: the dark-letters sign
    holdBed("club", b.unmasked ? "gobbler" : null); // the club's music: noir before the unmasking, the acid theme after
    return b.smack && b.sign && !Object.values(b.sign).every(Boolean) ? [setTimeout(() => playCue("neon-sputter"), SIGN_MS.smack)] : [];
  },
  // the sign cut keeps the Pavilion's music: the acid theme from the smoke clear on (js/main.js musicMoment)
  sign: () => { signStop = cueThenLoop("neon-lightup", "neon-hum-full", SIGN_MS.lightup); return []; },
  potato: () => { playCue("potato-cannon"); return [setTimeout(() => playCue("potato-flight"), 500), setTimeout(() => playCue("potato-impact"), 2600)]; },
  carny: () => [setTimeout(() => playCue("ghost-scare"), 2400)],
  coldopen: () => { playCue("cutaway"); return []; },
};

function runOne(beat) {
  return new Promise((resolve) => {
    const build = BUILD[beat.kind];
    if (!build) { resolve(); return; }
    const node = build(beat);
    document.body.append(node);
    const timers = SOUND[beat.kind](beat);
    const ms = (beat.kind === "club" && beat.veil === "whisk" ? BEAT_MS.clubWhisk : BEAT_MS[beat.kind]) || 2000;
    node.style.setProperty("--beat-ms", `${ms}ms`);
    const finish = () => {
      if (!current || current.node !== node) return;
      clearTimeout(current.timer);
      for (const t of timers) clearTimeout(t);
      if (beat.kind === "club") { stopLoop("neon-hum"); releaseBed(); }
      if (beat.kind === "sign" && signStop) { signStop(); signStop = null; }
      current = null;
      node.classList.add("beat-out");
      setTimeout(() => node.remove(), 250);
      resolve();
    };
    current = { kind: beat.kind, node, finish, timer: setTimeout(finish, ms) };
    requestAnimationFrame(() => node.classList.add("beat-in"));
  });
}

// Queue beats; they play in order. Returns a promise for when this batch is done.
export function playBeats(beats) {
  const list = (beats || []).filter((b) => BUILD[b.kind]);
  if (!list.length) return chain;
  pending += list.length;
  for (const b of list) {
    chain = chain.then(() => runOne(b)).finally(() => {
      pending -= 1;
      if (!pending) for (const fn of listeners) fn();
    });
  }
  return chain;
}

export function skipBeat() {
  if (current) current.finish();
}

// Any click or key skips the beat on screen; the click itself still reaches the game.
for (const type of ["pointerdown", "keydown"]) window.addEventListener(type, () => skipBeat(), true);
