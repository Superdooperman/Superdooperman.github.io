// Boot: canvas, input (keyboard, touch, gamepad, pointer taps), the shell (pause and the
// rotate prompt) and the fixed loop. Rooms: the FIRST RING tutorial, then the M2 WATCH ROOM
// (stealth). ?room=watch starts in the WATCH ROOM (Walkthrough 3 and feel checks).
// ?room=gen&seed=N plays M3's generated tower for seed N instead (a dev preview).
// M4: with no ?room the page is the game (game.js / screens.js): title, a generated night,
// perches, the vault, the escape, the end card and the Stash. ?seed=N picks the first night.
// ?room=first / ?room=watch / ?room=gen stay on the old room shell (walkthroughs 1-3).
// ?room=tall[&fall=feather] plays the tall-shaft prototype (swing-feel branch).
import { firstRing } from './levels/first-ring.js';
import { watchRoom } from './levels/watch-room.js';
import { tallShaft, tallShaftRings } from './levels/tall-shaft.js';
import { createInput, bindKeyboard, bindGamepads } from './input.js';
import { createLoop, prefersReducedMotion } from './loop.js';
import { setupCanvas } from './canvas.js';
import { render, cameraFor, withLerp } from './render.js';
import { loadArt } from './art.js';
import { hasWren, ropeOriginFor, cloakOriginFor } from './wren.js';
import { createShell } from './shell.js';
import { bindTouch } from './touch.js';
import { VIEW_W, VIEW_H, TILE_PX, SETTINGS, ZOOM } from './config.js';
import { createPresenter, stepZoom } from './zoom.js';
import { promptText } from './prompts.js';
import { generateTower } from './gen/generator.js';
import { createGame } from './game.js';
import { drawGame } from './screens.js';
import { createAudio } from './audio.js';
import { isPortrait } from './shell.js';
import { createFx } from './fx.js';
import { registerServiceWorker } from './pwa.js';
import { drawText } from './font.js';
import { PLACEHOLDER } from './art.js';

const params = new URLSearchParams(location.search);
// Feel fix 1 (Azzato, Nov 1 2026): the new movement feel is the default in the browser;
// ?physics=legacy plays the old one. The generator plans with the same feel (gen/moves.js).
SETTINGS.feel = params.get('physics') === 'legacy' ? 'legacy' : 'fix1';
// The test build (tools/build-beta.mjs --test) sets <html data-storage="...">: every
// 'nightlark.v2.' key then lives under that prefix instead, so it never shares a save or a
// setting with the dev page, the beta or v1 on the same origin.
const STORAGE_NS = document.documentElement.dataset.storage || '';
const nsKey = (k) => (STORAGE_NS && k.startsWith('nightlark.v2.') ? STORAGE_NS + '.' + k.slice('nightlark.v2.'.length) : k);
function scopedStorage() {
  let ls; try { ls = window.localStorage; } catch { return null; }
  if (!ls || !STORAGE_NS) return ls;
  return { getItem: (k) => ls.getItem(nsKey(k)), setItem: (k, v) => ls.setItem(nsKey(k), v), removeItem: (k) => ls.removeItem(nsKey(k)) };
}
// swing-feel: yank input. 'button' (default) = the separate ZIP button / K / V / pad RB; 'hold' = hold B on the line.
// ?yank=button|hold sets it and remembers it, so Azzato can compare.
{
  let y = params.get('yank');
  try { const ls = scopedStorage(); if (y) ls.setItem('nightlark.v2.yankInput', y); else y = ls.getItem('nightlark.v2.yankInput'); } catch { /* private mode */ }
  if (y === 'button' || y === 'hold') SETTINGS.yankInput = y;
  document.body.classList.toggle('yank-button', SETTINGS.yankInput === 'button');
}
const canvas = document.getElementById('game');
// swing-feel: the view fills the screen (no letterbox); ?letterbox=1 restores the 480x270 fit.
// Feel fix 1: the dynamic zoom draws through zoom.js (device-pixel canvas + backbuffer);
// ?zoom=0 turns it off (the old whole-number fill), ?zoomrender=backbuffer|nearest|direct
// picks how a zoomed view reaches the screen.
const zoomOn = SETTINGS.feel === 'fix1' && ZOOM.enabled && !params.has('letterbox') && params.get('zoom') !== '0';
const presenter = zoomOn ? createPresenter(canvas, window, { mode: params.get('zoomrender') || ZOOM.render }) : null;
const { ctx } = presenter || setupCanvas(canvas, window, { letterbox: params.has('letterbox') });
const tune = params.has('tune'); // feel fix 1: chain / speed / cap / zoom overlay
let lastDraw = 0;
const frameDt = () => { const t = performance.now(); const d = lastDraw ? (t - lastDraw) / 1000 : 1 / 60; lastDraw = t; return d; };
/** Draw one frame: zoom eased for `world` (null: zoom 1), Wren interpolated by alpha. */
// Feel fix 1: the build's commit (tools/build-beta.mjs sets <html data-commit>), bottom right
// on every screen; the dev page shows 'dev'.
const COMMIT = document.documentElement.dataset.commit || 'dev';
function stamp(c) { drawText(c, COMMIT, VIEW_W - COMMIT.length * 4 - 2, VIEW_H - 7, PLACEHOLDER.hudDim, 1); }
function present(world, alpha, draw) {
  const dt = frameDt();
  if (!presenter) { withLerp(world, alpha, () => draw(ctx)); stamp(ctx); return; }
  const z = world ? stepZoom(world, dt) : 1;
  presenter.frame(z, (c) => { withLerp(world, alpha, () => draw(c)); stamp(c); });
}
// Feel fix 1: full screen in landscape. The first touch in landscape asks the browser for full
// screen (it needs a user gesture; iOS Safari has no element full screen, so there it is the
// full window, or the home-screen app). ?nofs turns it off.
if (!params.has('nofs')) {
  const fs = (e) => {
    const de = document.documentElement;
    if (e.pointerType !== 'touch' || document.fullscreenElement || !de.requestFullscreen) return;
    if (!window.matchMedia('(orientation: landscape)').matches) return;
    de.requestFullscreen({ navigationUI: 'hide' }).catch(() => { /* not allowed here: the window still fills */ });
  };
  window.addEventListener('pointerup', fs, { passive: true });
}
/** Pointer -> logical view px (the zoomed view when the presenter is on). */
function toView(e) {
  if (presenter) return presenter.toLogical(e.clientX, e.clientY);
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * VIEW_W, y: ((e.clientY - r.top) / r.height) * VIEW_H };
}
const input = createInput();
bindKeyboard(input);
bindGamepads(input);
const debug = params.has('debug');
const feel = params.get('feel') === '1'; // feel pass 1 timings overlay
const reducedMotion = prefersReducedMotion();
// M5: ?fx=off forces the reduced-motion look (no shake, flash, particles, flicker; cloak at rest)
const fxOff = params.get('fx') === 'off';
const fx = createFx({ reduced: reducedMotion || fxOff });
registerServiceWorker();
let sheets = null;
loadArt().then((s) => {
  sheets = s;
  if (hasWren(s)) fx.ropeOrigin = ropeOriginFor(s); // live rope leaves from her gun muzzle
  if (hasWren(s)) fx.cloakOrigin = cloakOriginFor(s); // engine tail pinned at each frame's tailAnchor (pass 4)
});

if (params.has('room')) bootShell(); else bootGame();

function bootShell() {
const ROOMS = { first: firstRing, watch: watchRoom };
const genTower = params.get('room') === 'gen' ? generateTower(Number(params.get('seed')) || 1) : null;
// ?room=tall: the swing-feel tall-shaft prototype on its own; &fall=feather makes a big fall cost a feather
// &seed=N picks the seeded kit route (default TALL_SEED); &anchors=rings plays the old ring shaft;
// &anchors=arch adds ledge/prop anchors on top of the rings in old rooms ('mixed', FEEL-PLAN §9.5)
const fallCost = params.get('fall') === 'feather' ? 'feather' : 'height';
if (params.get('anchors') === 'arch') SETTINGS.anchors = 'mixed';
const tall = params.get('anchors') === 'rings' ? () => tallShaftRings({ fallCost })
  : () => tallShaft({ fallCost, seed: params.has('seed') && params.get('room') === 'tall' ? Number(params.get('seed')) : undefined });
ROOMS.tall = tall;
const order = genTower ? genTower.floors.flatMap((f) => f.rooms).map((def) => () => structuredClone(def))
  : params.get('room') === 'tall' ? [tall] : [firstRing, watchRoom];
const shell = createShell(order, { startRoom: Math.max(0, order.indexOf(ROOMS[params.get('room')])) });
const rotate = document.getElementById('rotate');
function onViewport() {
  shell.setViewport(innerWidth, innerHeight);
  rotate.hidden = !shell.portrait;
}
addEventListener('resize', onViewport);
addEventListener('orientationchange', onViewport);
onViewport();
// Leaving the tab pauses (Start resumes); never runs the sim in the background.
document.addEventListener('visibilitychange', () => { if (document.hidden && !shell.paused) shell.paused = true; });

const touch = bindTouch(input, document.getElementById('touch'), {
  forceShow: params.has('touch'),
});

// Tap or click a grapple point to fire at it (BRIEF: "Tap a point to fire at it").
canvas.addEventListener('pointerdown', (e) => {
  const cam = cameraFor(shell.world); const v = toView(e);
  const wx = (v.x + cam.x) / TILE_PX;
  const wy = (v.y + cam.y) / TILE_PX;
  if (e.pointerType === 'touch') { input.beginTouch(e.clientX, e.clientY, wx, wy); touch.show(); return; }
  input.pointAt(wx, wy, 'key');
});
canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') input.moveTouch(e.clientX, e.clientY); });
canvas.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') input.endTouch(); });
canvas.addEventListener('pointercancel', () => input.cancelTouch());

const loop = createLoop({
  step(dt) {
    if (shell.world) shell.world.reducedMotion = fx.reduced;
    const ran = shell.step(dt, input.sample());
    if (ran) fx.step(dt, shell.world, shell.events);
    for (const e of shell.events) {
      if (e.type === 'attach' && input.device === 'touch' && navigator.vibrate) navigator.vibrate(12);
    }
    shell.events.length = 0;
    return ran;
  },
  render(alpha) {
    present(shell.world, alpha, (c) => render(c, shell.world, sheets, { debug, feel, tune, reducedMotion: fx.reduced, fx, device: input.device, paused: shell.paused && !shell.portrait }));
  },
});
loop.start();

// ?probe=1: a read-only snapshot for the headless walkthrough. Never writes game state.
if (params.has('probe')) {
  window.__nlProbe = () => {
    const w = shell.world;
    return JSON.parse(JSON.stringify({
      x: w.x, y: w.y, vx: w.vx, vy: w.vy, h: w.h, grounded: w.grounded, crouch: w.crouch,
      anchor: w.anchor ? { id: w.anchor.id, x: w.anchor.x, y: w.anchor.y } : null,
      ropeLen: w.ropeLen, climbing: !!w.climb, aiming: w.aiming, time: w.time,
      target: w.target ? w.target.id : null, phase: w.phase, room: w.level.name,
      scale: Number(canvas.dataset.scale), view: canvas.dataset.view, letterbox: params.has('letterbox'),
      paused: shell.paused, portrait: shell.portrait,
      running: shell.running, clears: shell.clears, device: input.device,
      prompt: w.prompt ? promptText(w.prompt.text, input.device) : null,
      touchShown: touch.shown, held: shell.lastHeld, climbingFlag: !!w.climb, motes: w.motes ? w.motes.size : 0,
      // M2 stealth
      feathers: w.feathers, meter: w.meter, alert: !!w.alert, hidden: w.hidden, lit: w.lit,
      alerts: w.alerts, escapes: w.escapes, catches: w.catches, overT: w.overT, nights: shell.nights,
      guards: w.level.guards.map((g) => ({ x: g.x, dir: g.dir, state: g.state, sees: g.sees })),
      searchlights: (w.level.searchlights || []).map((s) => ({ angle: s.angle, state: s.state, sees: s.sees })),
      items: w.level.items.length,
    }));
  };
}
}

function bootGame() {
  const seedParam = Number(params.get('seed'));
  const storage = scopedStorage();
  const game = createGame({ storage, needsRender: true, systemReducedMotion: reducedMotion, seed: Number.isInteger(seedParam) && seedParam > 0 ? seedParam : undefined });
  const audio = createAudio(game.save.settings);
  let portrait = false;
  const rotate = document.getElementById('rotate');
  function onViewport() { portrait = isPortrait(innerWidth, innerHeight); rotate.hidden = !portrait; if (portrait) game.pause(); }
  addEventListener('resize', onViewport);
  addEventListener('orientationchange', onViewport);
  onViewport();
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });
  const touch = bindTouch(input, document.getElementById('touch'), { forceShow: params.has('touch') });
  const wake = () => audio.start();
  addEventListener('keydown', (e) => {
    wake();
    if (e.code === 'KeyM') { game.setMute(!game.save.settings.mute); audio.setMute(game.save.settings.mute); }
  });
  canvas.addEventListener('pointerdown', (e) => {
    wake();
    const point = () => {
      if (!(game.world && game.screen === 'play')) return null;
      const cam = cameraFor(game.world); const v = toView(e);
      return { x: (v.x + cam.x) / TILE_PX, y: (v.y + cam.y) / TILE_PX };
    };
    if (e.pointerType === 'touch') {
      const p = point();
      if (p) input.beginTouch(e.clientX, e.clientY, p.x, p.y);
      touch.show();
      return;
    }
    const p = point();
    if (p) input.pointAt(p.x, p.y, 'key');
  });
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') input.moveTouch(e.clientX, e.clientY); });
  canvas.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') input.endTouch(); });
  canvas.addEventListener('pointercancel', () => input.cancelTouch());
  let lastHeld = [];
  const renderMs = [];
  const loop = createLoop({
    step(dt) {
      const inp = input.sample();
      lastHeld = Object.keys(inp.held).filter((k) => inp.held[k]);
      if (portrait) return;
      game.step(dt, inp);
      fx.setReduced(fxOff || game.reducedMotion());
      if (game.screen === 'play') fx.step(dt, game.world, game.events);
      for (const s of game.sfx) audio.sfx(s);
      game.sfx.length = 0;
      for (const e of game.events) {
        if (e.type === 'attach' && input.device === 'touch' && navigator.vibrate) navigator.vibrate(12);
        if (e.type === 'screen' && e.screen === 'title') audio.setMute(game.save.settings.mute);
      }
      game.events.length = 0;
    },
    render(alpha) {
      const t0 = performance.now();
      const room = game.world && (game.screen === 'play' || game.screen === 'pause' || game.screen === 'perch') ? game.world : null;
      present(room, alpha, (c) => drawGame(c, game, sheets, { debug, feel, tune, reducedMotion: fx.reduced, fx, device: input.device }));
      if (game.screen === 'card') game.noteRendered();
      renderMs.push(performance.now() - t0); if (renderMs.length > 240) renderMs.shift(); // probe: frame cost (walkthrough 5)
    },
  });
  loop.start();
  if (params.has('probe')) {
    window.__nlProbe = () => {
      const w = game.world; const r = game.run;
      return JSON.parse(JSON.stringify({
        screen: game.screen, t: game.t, steps: game.steps, seed: game.seed, sel: game.sel, ready: !!game.tower, genMs: game.genMs,
        offer: game.offer, reveal: game.reveal, held: lastHeld, device: input.device, portrait,
        // view size (logical px, from canvas.js) so the walkthrough maps clicks without assuming 480x270
        scale: Number(canvas.dataset.scale), view: canvas.dataset.view, letterbox: params.has('letterbox'),
        zoom: Number(canvas.dataset.zoom || 1), physics: SETTINGS.feel, commit: COMMIT, storageNs: STORAGE_NS || null,
        run: r ? { index: r.index, rooms: r.rooms.length, held: r.held, smokeLeft: r.smokeLeft, feathers: r.feathers,
          catches: r.catches, alerts: r.alerts, motes: r.motes, totalMotes: r.totalMotes, time: r.time,
          target: r.target.id, stolen: r.stolen, cleared: r.cleared, over: r.over } : null,
        world: w ? {
          x: w.x, y: w.y, vx: w.vx, vy: w.vy, h: w.h, grounded: w.grounded, crouch: w.crouch, face: w.face,
          anchor: w.anchor ? { id: w.anchor.id, x: w.anchor.x, y: w.anchor.y } : null,
          ropeLen: w.ropeLen, climb: !!w.climb, roll: w.roll, peakY: w.peakY,
          lineCoyote: w.lineCoyote, phase: w.phase, chain: w.chain, airCap: w.airCap, room: w.level.name, feathers: w.feathers, catches: w.catches,
          alerts: w.alerts, time: w.time, motes: w.motes ? w.motes.size : 0, smoke: w.smoke, cloaked: w.cloaked,
          cam: cameraFor(w), cols: w.level.cols, rows: w.level.rows,
        } : null,
        save: game.save,
        mute: game.save.settings.mute, audio: audio.started,
        fx: { reduced: fx.reduced, parts: fx.parts.length, spawned: fx.stats.spawned, shake: fx.shake.t, flash: fx.flash,
          cloak: fx.cloak ? fx.cloak.pts.length : 0, rope: !!fx.rope, build: document.documentElement.dataset.build || 'dev' },
        renderMs,
      }));
    };
  }
}
