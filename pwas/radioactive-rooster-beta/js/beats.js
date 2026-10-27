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
// club: the stogie henchman's smack lands at smack ms; THE COCK sputters for sputter ms (neon-sputter starts with it).
// sign: neon-lightup (2.6 s) crackles 0.14-0.9 s and snaps on at 0.95 s. GOBBLER is one continuous tube (Arlong
// 2026-10-26), so the whole word sputters together: lit during each gobbler [on, off] window (each one sits on a crackle
// in neon-lightup), dark between, then lit for good at snap ms with the glow; neon-hum-full loops from when the cue ends.
export const SIGN_MS = { smack: 1800, sputter: 500, thecock: 140, gobbler: [[140, 170], [320, 370], [530, 570], [680, 740], [860, 890]], snap: 950, lightup: 2600 };
// The redrawn sign cut (Brook's sign-cut-v2, liked by Arlong 2026-10-26; follows the club-B3 neon, one red-orange
// colour): 320x180 layers at 0,0, staged from assets/art-placeholder/club/sign-cut/ by tools/art_files.py. base (every
// tube dead, GOBBLER a faint ghost), then each part's glow (screen; the fade is in the file's alpha), then each part's
// lit tube (normal). A part flickers by toggling its glow and lit together; GOBBLER is one layer, so the whole word
// moves at once. Until base + GOBBLER lit exist the cut zooms bg/midway (pre-reveal plate) with GOBBLER's lit patches.
const SIGN_CUT_PARTS = ["hawk", "thecock", "gobbler"];
function signCutArt() {
  const ids = { base: "signcut/base" };
  for (const p of SIGN_CUT_PARTS) ids[p] = { glow: `signcut/${p}-glow`, lit: `signcut/${p}-lit` };
  return ids;
}
// Decode the sign-cut layers ahead (called when the Pavilion's veil goes up), so the cut's first frame is complete.
export function preloadSignCut() {
  const ids = signCutArt();
  for (const id of [ids.base, ...SIGN_CUT_PARTS.flatMap((p) => [ids[p].glow, ids[p].lit])]) if (artUrl(id)) new Image().src = artUrl(id);
}
// Brook's henchman frames (sprite/stogie-sil-smack-l-h72-*): each pose shows from its ms (from the club node's start)
// until the next; idle from the walk-in, the hit spans the impact at SIGN_MS.smack, settle holds to the end of the beat.
export const HENCH_FRAMES = [["idle", 0], ["windup", 1480], ["wind", 1580], ["swing", 1720], ["hit", 1750], ["settle", 1850]]; // windup: Brook's arm-fix in-between (2026-10-25)
// Lit-letter cutouts of Brook's B3 (tools/neon/club_sign_parts.py). Before the reveal only THE COCK ever sputters
// (Arlong 2026-10-26: GOBBLER stays dark until the sign cut, the smack must not give it away): dark THE COCK (variant A)
// flashes its lit cutout and dies again; lit THE COCK (variant B) blinks out under a code-side dead mask and comes back.
const SIGN_LIT_ART = { thecock: "club/sign-thecock-lit" };
// Stand-in dead THE COCK over the lit plate (until Brook paints a dead THE COCK layer): near-black masked by the lit
// cutout's alpha, nudged 1 plate px each way so the tube glow goes too; the wrapper's opacity is the dim (.78 matches
// the plate's GOBBLER ghost).
const DEAD_NUDGE = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
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
    if (beat.smack && !sign.thecock) { // variant A: THE COCK's lit letters flash and die again (GOBBLER never flashes)
      const lit = art(SIGN_LIT_ART.thecock, "beat-bg club-sign-flash");
      if (lit) stage.append(lit);
    } else if (beat.smack && !sign.gobbler && artUrl(SIGN_LIT_ART.thecock)) { // variant B: THE COCK blinks out, recovers
      const dead = el("div", "club-sign-dead");
      dead.dataset.id = "club/sign-thecock-dead (code stand-in)";
      for (const [dx, dy] of DEAD_NUDGE) {
        const m = el("div", "club-sign-dead-mask");
        m.style.maskImage = m.style.webkitMaskImage = `url("${artUrl(SIGN_LIT_ART.thecock)}")`;
        m.style.transform = `translate(${(dx * 100) / 320}%, ${(dy * 100) / 180}%)`;
        dead.append(m);
      }
      stage.append(dead);
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
  // Usopp 2026-10-25: a stogie henchman walks up and smacks the sign (the hawk stays lit). Arlong 2026-10-26: he's
  // trying to get it to work, so THE COCK sputters for half a second and stays on; GOBBLER stays dark the whole time. Brook's six smack frames (HENCH_FRAMES); the SVG stand-in only if they're missing.
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

// One neon tube's timeline as stepped Web Animations keyframes (no fades): lit during each [on, off] window (ms from the
// cut's start), dark between, lit for good from onMs. dead: the node is a dead-tube patch over lit art (flipped).
// Toggles visibility by default (keeps the glows' screen blend in the plate's stacking context), opacity for the patches.
function tubeFlicker(node, windows, onMs, { dead = false, prop = "visibility" } = {}) {
  const [on, off] = prop === "opacity" ? [1, 0] : ["visible", "hidden"];
  const lit = dead ? off : on, dark = dead ? on : off;
  const total = onMs + 1;
  const kf = [{ offset: 0, [prop]: dark }];
  for (const [a, z] of windows) kf.push({ offset: a / total, [prop]: lit }, { offset: z / total, [prop]: dark });
  kf.push({ offset: onMs / total, [prop]: lit }, { offset: 1, [prop]: lit });
  return node.animate(kf.map((k) => ({ ...k, easing: "steps(1, end)" })), { duration: total, fill: "both" });
}

// The cut after Hattie's Pavilion speech (Usopp 2026-10-25): the club sign across the boardwalk. The dark parts light
// in sync with neon-lightup: THE COCK (variant A only; lit from the start in B) on its own blip, then GOBBLER as one tube
// (SIGN_MS.gobbler); the full name holds over neon-hum-full, then back to the Pavilion. Flag CLUB_SIGN.lit keeps it lit.
// Brook's sign-cut-v2 layers (signCutArt) when present, else the Midway plate close-up with his dead-tube patches.
function signNode() {
  const node = el("div", "beat beat-sign");
  node.dataset.beat = "sign";
  const stage = el("div", "beat-stage");
  const zoom = el("div", "sign-zoom");
  const before = CLUB_SIGN.before[SIGN_VARIANT] || CLUB_SIGN.before.A;
  const ids = signCutArt();
  const redrawn = !!(artUrl(ids.base) && artUrl(ids.gobbler.lit));
  if (redrawn) {
    node.classList.add("sign-redrawn");
    zoom.append(art(ids.base, "beat-bg"));
    const layers = { hawk: [], thecock: [], gobbler: [] };
    for (const kind of ["glow", "lit"]) for (const p of SIGN_CUT_PARTS) { // all glows over the base, then all lit tubes
      const img = art(ids[p][kind], kind === "glow" ? "beat-bg sign-halo" : "beat-bg sign-lit");
      if (!img) continue;
      img.dataset.part = p;
      zoom.append(img);
      layers[p].push(img);
    }
    // THE COCK: the dead-patch's tube-on blip (lit 36 ms, dark 27 ms, then on); GOBBLER: the shared one-tube timeline
    if (!before.thecock) layers.thecock.forEach((img) => tubeFlicker(img, [[SIGN_MS.thecock, SIGN_MS.thecock + 36]], SIGN_MS.thecock + 63));
    if (!before.gobbler) layers.gobbler.forEach((img) => tubeFlicker(img, SIGN_MS.gobbler, SIGN_MS.snap));
  } else {
    const bg = art("bg/midway", "beat-bg");
    if (bg) zoom.append(bg);
    else zoom.append(el("div", "gb sign-gb"));
    const patch = (id, parent, ms) => {
      const info = assetInfo(id);
      const img = art(id, "sign-patch");
      if (!img || !info || !info.at) return;
      Object.assign(img.style, { left: `${(info.at[0] / 320) * 100}%`, top: `${(info.at[1] / 180) * 100}%`, width: `${(info.size[0] / 320) * 100}%`, height: `${(info.size[1] / 180) * 100}%` });
      if (ms != null) img.style.setProperty("--on-ms", `${ms}ms`); else img.classList.add("sign-patch-held");
      parent.append(img);
    };
    if (!before.thecock) patch("fx/clubsign-dark-thecock", zoom, SIGN_MS.thecock);
    if (!before.gobbler) {
      // the plate's GOBBLER is dead (Brook's midway-sign-v1): all seven lit letter patches in one group on one timeline
      // (tube-lit, the inverse of the dead patch's tube-on), so the tube sputters and lights as a whole word
      const tube = el("div", "sign-tube");
      tube.dataset.part = "gobbler";
      for (let i = 1; i <= 7; i += 1) patch(`fx/clubsign-lit-g${i}`, tube, null);
      zoom.append(tube);
      tubeFlicker(tube, SIGN_MS.gobbler, SIGN_MS.snap, { prop: "opacity" });
    }
  }
  node.style.setProperty("--snap-ms", `${SIGN_MS.snap}ms`);
  stage.append(zoom);
  if (!redrawn) stage.append(el("div", "sign-glow")); // the redrawn art carries its own glow layers
  node.append(stage);
  // real art (sign-cut-v2): no PLACEHOLDER caption; the Midway fallback keeps its tag
  if (!redrawn) tag(node, "club sign cut (Midway plate close-up; Brook's midway-sign-v1 lit patches; GOBBLER one tube)");
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
    // a line read over the beat (the Pavilion sign cut's narration, Arlong 2026-10-27), in the game's caption box
    if (beat.caption) node.append(el("div", "beat-caption", beat.caption));
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
