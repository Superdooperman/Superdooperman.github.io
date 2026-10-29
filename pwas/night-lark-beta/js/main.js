// Boot: canvas, input (keyboard, touch, gamepad, pointer taps), the shell (pause and the
// rotate prompt) and the fixed loop. Rooms: the FIRST RING tutorial, then the M2 WATCH ROOM
// (stealth). ?room=watch starts in the WATCH ROOM (Walkthrough 3 and feel checks).
// ?room=gen&seed=N plays M3's generated tower for seed N instead (a dev preview).
// M4: with no ?room the page is the game (game.js / screens.js): title, a generated night,
// perches, the vault, the escape, the end card and the Stash. ?seed=N picks the first night.
// ?room=first / ?room=watch / ?room=gen stay on the old room shell (walkthroughs 1-3).
import { firstRing } from './levels/first-ring.js';
import { watchRoom } from './levels/watch-room.js';
import { createInput, bindKeyboard, bindGamepads } from './input.js';
import { createLoop, prefersReducedMotion } from './loop.js';
import { setupCanvas } from './canvas.js';
import { render, cameraFor } from './render.js';
import { loadArt } from './art.js';
import { hasWren, ropeOriginFor } from './wren.js';
import { createShell } from './shell.js';
import { bindTouch } from './touch.js';
import { VIEW_W, VIEW_H, TILE_PX } from './config.js';
import { promptText } from './prompts.js';
import { generateTower } from './gen/generator.js';
import { createGame } from './game.js';
import { drawGame } from './screens.js';
import { createAudio } from './audio.js';
import { isPortrait } from './shell.js';
import { createFx } from './fx.js';
import { registerServiceWorker } from './pwa.js';

const canvas = document.getElementById('game');
const { ctx } = setupCanvas(canvas);
const input = createInput();
bindKeyboard(input);
bindGamepads(input);
const params = new URLSearchParams(location.search);
const debug = params.has('debug');
const reducedMotion = prefersReducedMotion();
// M5: ?fx=off forces the reduced-motion look (no shake, flash, particles, flicker; cloak at rest)
const fxOff = params.get('fx') === 'off';
const fx = createFx({ reduced: reducedMotion || fxOff });
registerServiceWorker();
let sheets = null;
loadArt().then((s) => {
  sheets = s;
  if (hasWren(s)) fx.ropeOrigin = ropeOriginFor(s); // live rope leaves from her gun muzzle
});

if (params.has('room')) bootShell(); else bootGame();

function bootShell() {
const ROOMS = { first: firstRing, watch: watchRoom };
const genTower = params.get('room') === 'gen' ? generateTower(Number(params.get('seed')) || 1) : null;
const order = genTower ? genTower.floors.flatMap((f) => f.rooms).map((def) => () => structuredClone(def)) : [firstRing, watchRoom];
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
  const r = canvas.getBoundingClientRect();
  const cam = cameraFor(shell.world);
  const lx = ((e.clientX - r.left) / r.width) * VIEW_W + cam.x;
  const ly = ((e.clientY - r.top) / r.height) * VIEW_H + cam.y;
  input.pointAt(lx / TILE_PX, ly / TILE_PX, e.pointerType === 'touch' ? 'touch' : 'key');
  if (e.pointerType === 'touch') touch.show();
});

const loop = createLoop({
  step(dt) {
    const ran = shell.step(dt, input.sample());
    if (ran) fx.step(dt, shell.world, shell.events);
    for (const e of shell.events) {
      if (e.type === 'attach' && input.device === 'touch' && navigator.vibrate) navigator.vibrate(12);
    }
    shell.events.length = 0;
    return ran;
  },
  render() {
    render(ctx, shell.world, sheets, { debug, reducedMotion: fx.reduced, fx, device: input.device, paused: shell.paused && !shell.portrait });
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
      scale: Number(canvas.dataset.scale), paused: shell.paused, portrait: shell.portrait,
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
  const storage = (() => { try { return window.localStorage; } catch { return null; } })();
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
    if (game.world && game.screen === 'play') {
      const r = canvas.getBoundingClientRect();
      const cam = cameraFor(game.world);
      const lx = ((e.clientX - r.left) / r.width) * VIEW_W + cam.x;
      const ly = ((e.clientY - r.top) / r.height) * VIEW_H + cam.y;
      input.pointAt(lx / TILE_PX, ly / TILE_PX, e.pointerType === 'touch' ? 'touch' : 'key');
    }
    if (e.pointerType === 'touch') touch.show();
  });
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
    render() {
      const t0 = performance.now();
      drawGame(ctx, game, sheets, { debug, reducedMotion: fx.reduced, fx, device: input.device });
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
        run: r ? { index: r.index, rooms: r.rooms.length, held: r.held, smokeLeft: r.smokeLeft, feathers: r.feathers,
          catches: r.catches, alerts: r.alerts, motes: r.motes, totalMotes: r.totalMotes, time: r.time,
          target: r.target.id, stolen: r.stolen, cleared: r.cleared, over: r.over } : null,
        world: w ? {
          x: w.x, y: w.y, vx: w.vx, vy: w.vy, h: w.h, grounded: w.grounded, crouch: w.crouch, face: w.face,
          anchor: w.anchor ? { id: w.anchor.id, x: w.anchor.x, y: w.anchor.y } : null,
          ropeLen: w.ropeLen, climb: !!w.climb, roll: w.roll, peakY: w.peakY,
          lineCoyote: w.lineCoyote, phase: w.phase, room: w.level.name, feathers: w.feathers, catches: w.catches,
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
