// The first mini boss on the shaft roof (follow-up Nov 7 2026, Azzato's steering 6:05 PM CST).
// NOT a boss fight: no health, no attacks, no combat system. A short scripted scene that runs
// once, on a save that does not have the warp-pull yet:
//   1. she climbs the shaft by hand (ledges, jumps, swing; no pull) and lands on the perch roof;
//   2. 'approach': he walks across the roof to her (no hidden snap of either actor). The grab
//      does not start until they are inside INTRO.contactRange;
//   3. 'struggle' (INTRO.struggle s): the first mini boss grabs her at that contact; in the
//      scuffle she knocks some of his gear loose (it drops into the shaft);
//   4. 'fall': he throws her down the freefall lane from their actual staged x. This is SCRIPTED
//      quick movement, not the physics: she drops straight down the lane (only wood landings in
//      it, which she passes through like a drop-through), accelerating to INTRO.fallMax, in the
//      same world, so the one camera follows her all the way down. She draws in Brook's freefall
//      pose (her vy is set to the scripted speed);
//   5. 'land': she hits the shaft floor in a landing roll and skids back to the spawn spot;
//   6. 'gear': his gear clatters down after her and stops at her feet: she picks it up there, at
//      the bottom. That grants abilities.pullGrapple and emits 'pull-earned' (game.js saves it).
//      The guards are back on their rounds as at the start of the room (so the climb back up is
//      the same proven climb), and she climbs again, now with the PULL button.
// The boss is gone after the throw. Placeholder look: Brook's watchman drawn at twice the size
// with a MINI BOSS plate (no mini boss art exists yet; noted for the art crew).
import { TUNING } from './config.js';

export const INTRO = Object.freeze({
  // grab envelope: the existing item-touch radius (TUNING.pickupRadius, 20 v1-px = 1.25 tiles).
  // Shared by the sim, the story assertions and the page probe: not a magic huge radius.
  contactRange: TUNING.pickupRadius,
  approachSpeed: 12, // t/s: he closes a far-roof gap in about a second
  struggle: 1.1, // s, the scuffle on the roof once they are in contact
  gearLoose: 0.55, // s into the scuffle: his gear comes loose
  fall0: 12, fallAcc: 70, fallMax: 72, // t/s, t/s^2, t/s: the throw down the lane (scripted)
  laneX: 13.5, // the freefall lane's middle (ROUTE.lane 11-16)
  skid: 0.55, // s, the landing roll back to the spawn spot
  gearLag: 0.35, // s after her landing roll ends, his gear is at her feet
  gotHold: 0.9, // s holding still with it before she has control again
  bark: 'STAY DOWN, BATGUY!',
});

/** Horizontal tiles between her and the mini boss (Infinity if there is no intro). */
export function actorGap(w) {
  const b = w?.intro?.boss;
  if (!b) return Infinity;
  return Math.abs(w.x - b.x);
}

/** True when they are inside the named grab envelope. */
export const inContact = (w) => actorGap(w) <= INTRO.contactRange + 1e-9;

/** Read-only intro snapshot for the ?probe=1 page probe and the tests. Never writes the world. */
export function probeIntro(w) {
  const I = w?.intro;
  if (!I) return null;
  const b = I.boss;
  return {
    phase: I.phase,
    t: I.t,
    bossX: b ? b.x : null,
    bossFloorY: b ? b.floorY : null,
    gone: !!(b && b.gone),
    gap: b ? Math.abs(w.x - b.x) : null,
    triggered: I.triggered,
  };
}

/** The intro state for a new world, or null (no mini boss in this room, or pull already had). */
export function createIntro(levelDef, abilities) {
  const b = levelDef.miniBoss;
  if (!b || abilities?.pullGrapple) return null;
  return { phase: 'wait', t: 0, boss: { x: b.c + 0.5, floorY: b.floor, dir: b.dir, gone: false }, gear: null, roofRow: b.floor, triggered: 0 };
}

/** Is the intro scene running (her input, stealth and the physics are off)? */
export const introActive = (w) => !!w.intro && w.intro.phase !== 'wait' && w.intro.phase !== 'done';

function freezeHer(w) {
  w.vx = 0; w.vy = 0; w.aiming = false; w.reticle = null; w.roll = 0; w.dodge = null; w.atk = null; w.climb = null;
}

function faceEachOther(w, I) {
  w.face = Math.sign(I.boss.x - w.x) || w.face || 1;
  I.boss.dir = Math.sign(w.x - I.boss.x) || I.boss.dir;
}

function startStruggle(w, I, api) {
  I.phase = 'struggle'; I.t = 0;
  freezeHer(w); w.grounded = true;
  faceEachOther(w, I);
  api.emit('boss-grab', { x: w.x, y: w.y, bossX: I.boss.x, gap: actorGap(w) });
}

/** Landed on the roof with no pull: start the scene. Called from the sim right after a move.
 *  The grab itself is proximity-gated: if they are already inside contactRange it starts now,
 *  otherwise he walks to her (phase 'approach') and the grab waits for contact. */
export function introCheck(w, api) {
  const I = w.intro;
  if (!I || I.phase !== 'wait' || !w.grounded || w.abilities.pullGrapple) return false;
  if (Math.abs(w.y - (I.roofRow - TUNING.footEps)) > 0.1) return false;
  I.triggered += 1;
  api.release('scene');
  api.clearGrappleInput();
  freezeHer(w);
  faceEachOther(w, I);
  I.t = 0;
  api.emit('boss-intro', { x: I.boss.x, y: I.boss.floorY, gap: actorGap(w) });
  if (inContact(w)) startStruggle(w, I, api);
  else I.phase = 'approach';
  return true;
}

/** One step of the scene. api: { emit, release, bottomY, spawnX, resetGuards, grant }. */
export function stepIntro(w, dt, api) {
  const I = w.intro;
  I.t += dt;
  const G = I.gear;
  if (G && !G.taken) stepGear(w, G, dt, api);
  if (I.phase === 'approach') {
    freezeHer(w); w.grounded = true;
    faceEachOther(w, I);
    const gap = actorGap(w);
    if (gap <= INTRO.contactRange) { startStruggle(w, I, api); return; }
    const dir = Math.sign(w.x - I.boss.x) || 0;
    const step = INTRO.approachSpeed * dt;
    const close = gap - INTRO.contactRange;
    I.boss.x += dir * Math.min(step, Math.max(0, close));
    if (inContact(w)) startStruggle(w, I, api);
    return;
  }
  if (I.phase === 'struggle') {
    freezeHer(w); w.grounded = true;
    faceEachOther(w, I);
    // keep them inside the grab envelope for every struggle frame (he holds her; she does not teleport)
    if (actorGap(w) > INTRO.contactRange) {
      const dir = Math.sign(w.x - I.boss.x) || 0;
      I.boss.x = w.x - dir * INTRO.contactRange;
    }
    if (!G && I.t >= INTRO.gearLoose) {
      I.gear = { x: I.boss.x - 0.5 * (I.boss.dir || 1), y: I.boss.floorY - 1.4, vy: -6, landed: false, taken: false, t: 0 };
      api.emit('gear-loose', { x: I.gear.x, y: I.gear.y });
    }
    if (I.t >= INTRO.struggle) {
      I.phase = 'fall'; I.t = 0; I.fromY = w.y; I.fromX = w.x; I.boss.gone = true;
      w.grounded = false; w.peakY = w.y;
      api.emit('knockdown', { fromY: w.y, fromX: w.x, bark: INTRO.bark });
    }
    return;
  }
  if (I.phase === 'fall') {
    const sp = Math.min(INTRO.fallMax, INTRO.fall0 + INTRO.fallAcc * I.t);
    w.vy = sp; w.grounded = false;
    w.x += (INTRO.laneX - w.x) * Math.min(1, dt * 8); // out over the lane first
    w.y = Math.min(api.bottomY, w.y + sp * dt);
    if (w.y >= api.bottomY) {
      w.y = api.bottomY; w.vy = 0; w.grounded = true;
      I.phase = 'land'; I.t = 0; I.landX = w.x;
      w.roll = TUNING.rollTime; w.rollDir = Math.sign(api.spawnX - w.x) || -1; w.face = w.rollDir;
      api.emit('land', { drop: w.y - I.fromY, scripted: true });
      api.emit('knockdown-land', { drop: w.y - I.fromY });
    }
    return;
  }
  if (I.phase === 'land') {
    const k = Math.min(1, I.t / INTRO.skid);
    const e = 1 - (1 - k) * (1 - k); // ease out
    w.x = I.landX + (api.spawnX - I.landX) * e; w.vx = 0; w.vy = 0; w.grounded = true;
    w.roll = Math.max(1e-3, TUNING.rollTime * (1 - k));
    if (k >= 1) { w.x = api.spawnX; w.roll = 0; I.phase = 'gear'; I.t = 0; }
    return;
  }
  if (I.phase === 'gear') {
    w.vx = 0; w.vy = 0; w.grounded = true;
    if (G && G.taken) G.hold = (G.hold || 0) + dt;
    if (G && G.taken && G.hold >= INTRO.gotHold) {
      I.phase = 'done'; I.t = 0;
      api.resetGuards();
      api.emit('intro-done');
    }
  }
}

/** His gear: pops up, then drops down the lane after her, then rolls to her feet. */
function stepGear(w, G, dt, api) {
  G.t += dt;
  const I = w.intro;
  if (!G.landed) {
    if (I.phase === 'struggle') { G.vy += 30 * dt; G.y = Math.min(I.boss.floorY - 0.5, G.y + G.vy * dt); return; }
    // it falls with her, a little behind
    G.x += (INTRO.laneX + 0.8 - G.x) * Math.min(1, dt * 6);
    G.vy = Math.max(G.vy, (w.vy || 0) * 0.92);
    if (I.phase !== 'fall') G.vy = Math.max(G.vy, 40);
    G.y = Math.min(api.bottomY - 0.5, G.y + G.vy * dt);
    if (G.y >= api.bottomY - 0.5 && (I.phase === 'gear' || I.phase === 'land')) { G.landed = true; G.t = 0; G.fromX = G.x; api.emit('gear-land', { x: G.x }); }
    return;
  }
  // landed: it rolls to her feet, then she has it
  const to = w.x + 0.5;
  const k = Math.min(1, G.t / INTRO.gearLag);
  G.x = G.fromX + (to - G.fromX) * k;
  if (k >= 1 && I.phase === 'gear') {
    G.taken = true;
    api.grant();
  }
}
