// The game shell around the sim: pause (Start), the rotate-your-phone prompt (portrait pauses,
// landscape resumes), room changes and the night. Pure: no DOM, so it is unit tested; main.js wires it.
//
// rooms: one room function or a list of them, played in order (wrapping). Feathers carry from
// room to room. At 0 feathers the world is 'night-over'; after nightOverDelay, Start or A starts
// a new night from the first room with full feathers.
import { createWorld } from './sim.js';
import { TUNING, HEALTH } from './config.js';

export function isPortrait(w, h) { return h > w; }

export function createShell(rooms, opts = {}) {
  const list = Array.isArray(rooms) ? rooms : [rooms];
  const first = Math.max(0, Math.min(list.length - 1, opts.startRoom ?? 0));
  const { startRoom, ...worldOpts } = opts;
  const make = (i, feathers) => createWorld(list[i](), { ...worldOpts, feathers });
  const sh = {
    roomIndex: first,
    world: null,
    paused: false, // paused by Start
    portrait: false, // paused by the rotate prompt
    clears: 0,
    nights: 1,
    lastHeld: [],
    events: [],
    get running() { return !sh.paused && !sh.portrait; },
    setViewport(w, h) {
      const p = isPortrait(w, h);
      if (p !== sh.portrait) { sh.portrait = p; sh.events.push({ type: p ? 'rotate-pause' : 'rotate-resume' }); }
    },
    /** One fixed step: Start toggles pause; the sim only runs when not paused or portrait. */
    step(dt, input) {
      sh.lastHeld = Object.keys(input.held).filter((k) => input.held[k]);
      const w = sh.world;
      if (w.phase === 'night-over' && !sh.portrait) {
        w.step(dt, input);
        if (w.overT >= TUNING.nightOverDelay && (input.pressed.start || input.pressed.jump)) {
          sh.nights++;
          sh.roomIndex = first;
          sh.world = make(first, opts.feathers ?? HEALTH.startFeathers);
          sh.events.push({ type: 'new-night' });
        }
        return true;
      }
      if (input.pressed.start && !sh.portrait) { sh.paused = !sh.paused; sh.events.push({ type: sh.paused ? 'pause' : 'resume' }); }
      if (!sh.running) return false;
      w.step(dt, input);
      for (const e of w.events) {
        sh.events.push(e);
        if (e.type === 'room-done') {
          sh.clears++;
          sh.roomIndex = (sh.roomIndex + 1) % list.length;
          sh.world = make(sh.roomIndex, w.feathers);
        }
      }
      w.events.length = 0;
      return true;
    },
  };
  sh.world = make(first, opts.feathers ?? HEALTH.startFeathers);
  return sh;
}
