// M4 power-ups (BUILD-PLAN M4; BRIEF "Power-ups"): eight of them in three tiers, four synergies,
// the perch offers, and the sim hooks each one turns on. Tiers are green / teal / blue (art.js
// PC / PR / PL): no yellow, gold or red power-ups. Numbers live in config.js POWERUP_TUNING.
import { POWERUP_TUNING as P } from './config.js';
import { createRng, hashSeed } from './gen/rng.js';

export const TIERS = Object.freeze({
  common: { name: 'COMMON', ramp: ['PC2', 'PC1', 'PC0'] },
  rare: { name: 'RARE', ramp: ['PR2', 'PR1', 'PR0'] },
  legendary: { name: 'LEGENDARY', ramp: ['PL2', 'PL1', 'PL0'] },
});

export const POWERUPS = Object.freeze([
  { id: 'soft-soles', name: 'SOFT SOLES', tier: 'common', text: ['GUARDS HEAR YOUR STEPS', 'AT HALF THE RANGE'] },
  { id: 'long-line', name: 'LONG LINE', tier: 'common', text: ['YOUR LINE REACHES', '1.4 TIMES AS FAR'] },
  { id: 'quick-reel', name: 'QUICK REEL', tier: 'common', text: ['UP ON THE LINE', 'REELS IN TWICE AS FAST'] },
  { id: 'smoke', name: 'SMOKE PELLET', tier: 'common', text: ['SELECT: A CLOUD NO ONE', 'SEES THROUGH. 2 A NIGHT'] },
  { id: 'cloak', name: 'SHADOW CLOAK', tier: 'rare', text: ['STAND STILL IN THE DARK:', 'CONES SEE LESS OF YOU'] },
  { id: 'snuffer', name: 'LAMP SNUFFER', tier: 'rare', text: ['B WITH NO RING IN REACH', 'PUTS A LAMP OUT'] },
  { id: 'double-line', name: 'DOUBLE LINE', tier: 'rare', text: ['B ON THE LINE IN THE AIR', 'FIRES AGAIN, ONCE'] },
  { id: 'tie-line', name: 'TIE-LINE', tier: 'legendary', text: ['DROP ONTO A GUARD', 'TO TIE HIM UP'] },
]);
export const byId = (id) => POWERUPS.find((p) => p.id === id) || null;

export const SYNERGIES = Object.freeze([
  { id: 'flying', name: 'FLYING', needs: ['long-line', 'double-line'], text: 'TWO RE-FIRES' },
  { id: 'ghost', name: 'GHOST', needs: ['cloak', 'soft-soles'], text: 'CLOAK IN HALF A SECOND' },
  { id: 'blackout', name: 'BLACKOUT', needs: ['snuffer', 'smoke'], text: 'ONE MORE SMOKE PELLET' },
  { id: 'zipline', name: 'ZIPLINE', needs: ['quick-reel', 'long-line'], text: 'REEL IN THREE TIMES AS FAST' },
]);
export const activeSynergies = (held) => SYNERGIES.filter((s) => s.needs.every((n) => held.includes(n)));

/** The sim options for what she holds (sim.js createWorld). Nothing held = every default. */
export function worldOpts(held, smokeLeft = 0) {
  const has = (id) => held.includes(id);
  const syn = new Set(activeSynergies(held).map((s) => s.id));
  const o = {};
  if (has('soft-soles')) o.hearingMul = P.softSolesHearing;
  if (has('long-line')) o.lineMul = P.longLineMul;
  if (has('quick-reel')) o.reelMul = syn.has('zipline') ? P.ziplineReelMul : P.quickReelMul;
  if (has('smoke')) o.smoke = smokeLeft;
  if (has('cloak')) o.cloakTime = syn.has('ghost') ? P.ghostCloakTime : P.cloakTime;
  if (has('snuffer')) o.snuffer = true;
  if (has('double-line')) o.refires = syn.has('flying') ? P.flyingRefires : P.doubleLineRefires;
  if (has('tie-line')) o.tieLine = true;
  return o;
}

/** Smoke uses a new power-up brings (the pellet itself, or the Blackout synergy it completes). */
export function smokeGain(heldBefore, id) {
  const after = [...heldBefore, id];
  let n = id === 'smoke' ? P.smokeUses : 0;
  const was = activeSynergies(heldBefore).some((s) => s.id === 'blackout');
  if (!was && activeSynergies(after).some((s) => s.id === 'blackout')) n += P.blackoutSmokeBonus;
  return n;
}

/** Tier odds at each floor's perch (later floors lean rarer). */
export const TIER_WEIGHTS = Object.freeze({
  1: { common: 0.75, rare: 0.25, legendary: 0 },
  2: { common: 0.5, rare: 0.4, legendary: 0.1 },
  3: { common: 0.3, rare: 0.45, legendary: 0.25 },
});

/** The perch offer: up to 3 different power-ups she does not hold. Same seed, floor and holdings,
 *  same offer. */
export function perchOffer(seed, floor, held) {
  const rng = createRng(hashSeed(seed, floor, 'perch', held.join('+')));
  const wts = TIER_WEIGHTS[floor] || TIER_WEIGHTS[3];
  const left = POWERUPS.filter((p) => !held.includes(p.id));
  const out = [];
  while (out.length < 3 && left.length) {
    const r = rng.next();
    let tier = 'common';
    let acc = 0;
    for (const t of ['common', 'rare', 'legendary']) { acc += wts[t]; if (r < acc) { tier = t; break; } }
    let pool = left.filter((p) => p.tier === tier);
    if (!pool.length) pool = left; // that tier is used up: anything left
    const p = rng.pick(pool);
    out.push(p.id);
    left.splice(left.indexOf(p), 1);
  }
  return out;
}

/** Power-ups the Stash can keep: commons and rares (never the legendary). */
export const stashable = (id) => { const p = byId(id); return !!p && (p.tier === 'common' || p.tier === 'rare'); };
