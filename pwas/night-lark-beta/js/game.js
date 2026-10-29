// M4 the game around the sim (BUILD-PLAN M4): title, the start card (the night is generated
// behind it), the rooms, perch picks, pause, night over, the reveal, the end card, the Stash pick
// and AGAIN. A pure state machine (no DOM): main.js feeds it input and draws game.screen with
// screens.js; tests drive it directly.
//
// opts: { storage, generate(seed) -> tower, createWorld, seed, needsRender }
//   needsRender: the start card must be drawn once before the (blocking, ~2 s) generation runs.
import { TUNING } from './config.js';
import { createWorld as defaultCreateWorld } from './sim.js';
import { generateTower } from './gen/generator.js';
import { loadSave, writeSave } from './save.js';
import { perchOffer, worldOpts, activeSynergies } from './powerups.js';
import {
  createRun, currentRoom, isPerch, isVault, floorOf, absorbWorld, takePowerup, stashChoices,
  finishNight, nextSeed,
} from './run.js';

export const ALERT_BARKS = Object.freeze(['BATGUY?!', 'I SAW A CAPE!', 'WHO GOES THERE?', 'WAS THAT A BAT?']);
export const CAUGHT_BARK = "IT'S BATGUY!";
/** The reveal (placeholder staging): the first cleared night only; UNMASKED on the title replays it. */
export const REVEAL = Object.freeze([
  { who: 'THE HARBORMASTER', lines: ['WHO ARE YOU, BATGUY?'] },
  { who: 'THE LARK', lines: ['NIGHT LARK.', 'AND IT WAS NEVER BATGUY.'] },
  { who: '', lines: ['WREN LARKIN.', 'THE NIGHT LARK.'], unmask: true },
  { who: 'A WATCHMAN', lines: ['...BATGUY WAS A GIRL?'], stinger: true },
  { who: 'ANOTHER WATCHMAN', lines: ['BATGAL.'], stinger: true },
]);

const anyOk = (P) => !!(P.jump || P.start);

export function createGame(opts = {}) {
  const storage = opts.storage ?? null;
  const generate = opts.generate ?? generateTower;
  const createWorld = opts.createWorld ?? defaultCreateWorld;
  const g = {
    screen: 'title', t: 0, sel: 0,
    save: loadSave(storage),
    seed: null, tower: null, run: null, world: null,
    offer: null, reveal: 0, revealFromMenu: false,
    bark: null, toast: null,
    cardRendered: !opts.needsRender, genMs: 0,
    steps: 0, events: [], sfx: [],
    menu() {
      return ['NEW NIGHT', 'RETURNED SHELF', ...(g.save.revealSeen ? ['UNMASKED'] : []), `SOUND: ${g.save.settings.mute ? 'OFF' : 'ON'}`,
        `MOTION: ${g.reducedMotion() ? 'REDUCED' : 'FULL'}`];
    },
    stashOptions() { return g.run ? [...stashChoices(g.run), null] : [null]; },
    step, setMute, noteRendered() { g.cardRendered = true; },
    /** M5: effects off? The saved MOTION choice, or the system's prefers-reduced-motion on 'auto'. */
    reducedMotion() { const m = g.save.settings.motion; return m === 'reduced' || (m !== 'full' && !!opts.systemReducedMotion); },
    pause() { if (g.screen === 'play') go('pause'); },
  };
  g.seed = opts.seed ?? g.save.nextSeed ?? 1;

  function go(screen, sel = 0) { g.screen = screen; g.t = 0; g.sel = sel; g.events.push({ type: 'screen', screen }); }
  function persist() { writeSave(storage, g.save); }
  function setMute(m) { g.save.settings.mute = !!m; persist(); }

  function startCard(seed) {
    g.seed = seed; g.tower = null; g.run = null; g.world = null; g.cardRendered = !opts.needsRender;
    go('card');
  }
  function startRoom() {
    const r = g.run;
    g.world = createWorld(structuredClone(currentRoom(r)), { ...worldOpts(r.held, r.smokeLeft), feathers: r.feathers });
    g.bark = null;
    go('play');
  }
  function afterRoom(def) {
    const r = g.run;
    if (isVault(def)) { r.stolen = true; g.toast = { text: `GOT IT: ${r.target.name}`, t: 3 }; g.sfx.push('steal'); }
    r.index += 1;
    if (isPerch(def)) {
      g.offer = perchOffer(r.seed, floorOf(def), r.held);
      if (g.offer.length) { go('perch'); return; }
    }
    if (r.index >= r.rooms.length) {
      r.cleared = true;
      const first = !g.save.revealSeen;
      g.save = finishNight(g.save, r);
      g.save.nextSeed = nextSeed(r.seed);
      persist();
      g.sfx.push('clear');
      if (first) { g.reveal = 0; g.revealFromMenu = false; go('reveal'); } else go('end');
      return;
    }
    startRoom();
  }

  function stepPlay(dt, input) {
    const w = g.world;
    if (input.pressed.start) { go('pause'); g.sfx.push('pause'); return; }
    w.step(dt, input);
    if (g.bark) { g.bark.t -= dt; if (g.bark.t <= 0) g.bark = null; }
    if (g.toast) { g.toast.t -= dt; if (g.toast.t <= 0) g.toast = null; }
    for (const e of w.events) {
      g.events.push(e);
      if (e.type === 'alert') {
        g.bark = { text: ALERT_BARKS[(g.run.alerts + w.alerts - 1) % ALERT_BARKS.length], t: 1.4, src: w.alert ? w.alert.src : null };
        g.sfx.push('alert');
      } else if (e.type === 'caught') g.sfx.push('caught');
      else if (e.type === 'tie') { g.bark = { text: 'MMPH!', t: 1, src: null, at: e.x }; g.sfx.push('tie'); }
      else if (e.type === 'attach') g.sfx.push('attach');
      else if (e.type === 'pickup') g.sfx.push('pickup');
      else if (e.type === 'snuff' || e.type === 'smoke') g.sfx.push(e.type);
      else if (e.type === 'room-done') {
        absorbWorld(g.run, w);
        w.events.length = 0;
        afterRoom(currentRoom(g.run));
        return;
      } else if (e.type === 'night-over') {
        absorbWorld(g.run, w);
        g.run.over = true;
        g.save = finishNight(g.save, g.run);
        g.save.nextSeed = nextSeed(g.run.seed);
        persist();
        w.events.length = 0;
        g.sfx.push('over');
        go('over');
        return;
      }
    }
    w.events.length = 0;
  }

  function step(dt, input) {
    g.steps += 1;
    g.t += dt;
    const P = input.pressed;
    switch (g.screen) {
      case 'title': {
        const m = g.menu();
        if (P.up) g.sel = (g.sel + m.length - 1) % m.length;
        if (P.down) g.sel = (g.sel + 1) % m.length;
        if (anyOk(P)) {
          const it = m[g.sel];
          g.sfx.push('select');
          if (it === 'NEW NIGHT') startCard(g.seed);
          else if (it === 'RETURNED SHELF') go('shelf');
          else if (it === 'UNMASKED') { g.reveal = 0; g.revealFromMenu = true; go('reveal'); }
          else if (it.startsWith('MOTION')) { g.save.settings.motion = g.reducedMotion() ? 'full' : 'reduced'; persist(); }
          else setMute(!g.save.settings.mute);
        }
        return;
      }
      case 'shelf':
        if (anyOk(P) || P.fire) go('title', 1);
        return;
      case 'card':
        if (!g.tower) {
          if (!g.cardRendered) return;
          const t0 = performance.now();
          g.tower = generate(g.seed);
          g.genMs = performance.now() - t0;
          g.run = createRun(g.seed, g.save, g.tower);
          g.t = 0;
          return;
        }
        if (g.t > 0.3 && anyOk(P)) startRoom();
        return;
      case 'play':
        stepPlay(dt, input);
        return;
      case 'pause':
        if (P.start || P.jump) { go('play'); g.sfx.push('pause'); }
        else if (P.select) { g.save.nights += 1; persist(); go('title'); }
        return;
      case 'perch': {
        const n = g.offer.length;
        if (P.left || P.up) g.sel = (g.sel + n - 1) % n;
        if (P.right || P.down) g.sel = (g.sel + 1) % n;
        if (g.t > 0.3 && anyOk(P)) {
          const id = g.offer[g.sel];
          const before = activeSynergies(g.run.held).map((s) => s.id);
          takePowerup(g.run, id);
          const fresh = activeSynergies(g.run.held).filter((s) => !before.includes(s.id));
          g.events.push({ type: 'powerup', id });
          g.sfx.push('powerup');
          if (fresh.length) g.toast = { text: `SYNERGY: ${fresh.map((s) => s.name).join(' + ')}`, t: 3 };
          g.offer = null;
          startRoom();
        }
        return;
      }
      case 'over':
        if (g.t >= TUNING.nightOverDelay && anyOk(P)) startCard(g.save.nextSeed);
        else if (g.t >= TUNING.nightOverDelay && P.select) go('title');
        return;
      case 'reveal':
        if (g.t > 0.4 && (anyOk(P) || P.fire)) {
          g.reveal += 1; g.t = 0;
          if (g.reveal >= REVEAL.length) {
            g.save.unmasked = true; persist();
            if (g.revealFromMenu) go('title', 2); else go('end');
          }
        }
        return;
      case 'end':
        if (g.t > 0.6 && anyOk(P)) {
          const opts2 = g.stashOptions();
          go('stash', g.save.stash ? Math.max(0, opts2.indexOf(g.save.stash)) : 0); // feel call: default to keeping something
        }
        return;
      case 'stash': {
        const o = g.stashOptions();
        if (P.up || P.left) g.sel = (g.sel + o.length - 1) % o.length;
        if (P.down || P.right) g.sel = (g.sel + 1) % o.length;
        if (g.t > 0.3 && anyOk(P)) {
          g.save.stash = o[g.sel];
          persist();
          g.events.push({ type: 'stash', id: o[g.sel] });
          startCard(g.save.nextSeed);
        }
        return;
      }
      default:
    }
  }
  return g;
}
