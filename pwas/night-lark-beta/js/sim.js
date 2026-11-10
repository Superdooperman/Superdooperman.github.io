// The simulation: one room, the Lark, the line, pickups and guards.
// A hand port of v1's mt() step (xt -> At -> vt -> tt), renamed, in tile units, plus M1:
// the v2 grapple controls, ledge materials (stone solid, wood one-way) and minimal automatic
// parkour (landing roll, ledge climb). No DOM, no audio, no rendering: events are pushed to
// world.events for those layers.
//
// opts.controls: 'v2' (default; BRIEF "Grapple controls") or 'v1' (v1's toggle fire, E to use,
//   rope jump with no boost; used by the parity replay and the M0 regressions).
// opts.parkour: auto roll and ledge climb (default true).
// opts.feathers: feathers carried into this room (default HEALTH.startFeathers).
// opts.hearingMul / opts.graceMul: power-up hooks (Soft Soles 0.5, Ninth Feather > 1).
// M4 power-up hooks (powerups.js builds them; every default leaves the sim exactly as before):
//   opts.lineMul (Long Line), opts.reelMul (Quick Reel: reel-in only), opts.smoke (Smoke Pellet
//   uses left, dropped with Select), opts.cloakTime (Shadow Cloak: seconds standing still in the
//   dark), opts.snuffer (Lamp Snuffer), opts.refires (Double Line: re-fires per air time),
//   opts.tieLine (Tie-Line), opts.snuffed (lamps already out in this room, kept on a reset).
//
// M2 stealth (stealth.js): a catch costs a feather, plays the bark for catchHold, then resets
// the whole room (level, items, doors, guards, the Lark at the spawn). At 0 feathers the phase
// becomes 'night-over' and the sim stops.
import { TUNING, SWING, SETTINGS, SIM_DT_CLAMP, HEALTH, TALL, ARCH, FEEL, FEELFIX, FEELFIX2, AIM_PLANT, PULL, PX1, CAUGHT_BARK } from './config.js';
import { parseLevel, tileAt } from './level.js';
import { bodyBlocked, findLanding, pushOut, oneWayUnderFeet, findLedge, bodyCenterY } from './physics.js';
import { solveRope, pumpSwing, reel, conserveSwing } from './rope.js';
import { lineOfSight } from './los.js';
import { stepStealth, noiseRadius, tieCheck } from './stealth.js';
import { chooseTarget, reachable, stepReticle, pickAt, aimPick, aimCandidates, isSnuffLamp } from './targeting.js';
import { canCancelAttack, attackLimit, guardBump, attackReaches } from './feel.js';
import { stepMiniTowers, warmLightBuff } from './mini-tower.js';
import { createIntro, introCheck, stepIntro, introActive } from './shaft-intro.js';

const NO_INPUT = Object.freeze({ held: {}, pressed: {}, released: {} });

export function createWorld(levelDef, opts = {}) {
  const T = TUNING;
  const anchorOpt = { anchors: opts.anchors ?? SETTINGS.anchors ?? undefined };
  const level = parseLevel(levelDef, anchorOpt);
  const v2 = (opts.controls ?? 'v2') === 'v2';
  const parkour = opts.parkour ?? true;
  const yankInput = () => opts.yankInput ?? SETTINGS.yankInput; // 'hold' (B held on the line) or 'button'
  // Feel fix 1 (config.js FEELFIX): v2 worlds asked for with feel 'fix1' only. Off = the old feel, bit for bit.
  const feelName = opts.feel ?? levelDef.feel ?? SETTINGS.feel; // a def may pin its feel (the tall-shaft prototype)
  const fix = v2 && (feelName === 'fix1' || feelName === 'fix2');
  // Feel fix 2 (config.js FEELFIX2): aim freeze and cone, faster pump and reel, mash damping. A superset of fix 1.
  const fix2 = v2 && feelName === 'fix2';
  const F = FEELFIX;
  const F2 = FEELFIX2;
  const w = {
    level,
    controls: v2 ? 'v2' : 'v1',
    phase: 'play', // 'play' | 'through' | 'caught' | 'night-over'
    time: 0,
    events: [],
    stats: { pushOuts: 0, rolls: 0, climbs: 0 },
    // Lark
    x: level.spawn.x, y: level.spawn.y, vx: 0, vy: 0, face: 1,
    grounded: true, coyote: v2 ? FEEL.coyoteTime : T.coyoteTime, jumpBuf: 0, crouch: false, h: T.standHeight,
    // line
    anchor: null, ropeLen: T.lineRange, taut: false, everHooked: false,
    // v2 grapple controls
    target: null, targetAge: 0, fireBuf: 0, lineCoyote: 0, ledgeAssist: 0, snapCatch: false, snapped: false, yank: null, yanks: 0, yankCd: 0, bLine: null, lineFall: false, bArmed: false, bTime: 0, bHoldFrames: 0,
    aimPlantSkip: false, airPlantsLeft: AIM_PLANT.perAir, airPlanting: false,
    aiming: false, reticle: null,
    // parkour
    peakY: level.spawn.y, roll: 0, rollDir: 1, climb: null, dropRow: null,
    // feel pass 1 (v2). A dodge is refused while anchor is set, so it never lets go of a line
    // and never spends a Double Line re-fire. The rope solver and the zip are not touched.
    dodge: null, dodgeCd: 0, invuln: 0, dodgeLatch: null,
    atk: null, atkLatch: false,
    hitStop: 0, reducedMotion: !!opts.reducedMotion,
    coyoteMax: v2 ? FEEL.coyoteTime : T.coyoteTime,
    bufferMax: v2 ? FEEL.jumpBuffer : T.jumpBuffer,
    // inventory and room state
    doorsOpen: false, hasSpark: !!opts.hasSpark, motes: new Set(),
    note: null, hold: 0,
    // stealth (M2)
    meter: 0, alerts: 0, alert: null, meterSrc: null, hidden: false, lit: false,
    noise: 0, // feel pass 1 (F): this step's footstep / landing noise radius, the hearing rule (render draws the ring)
    escapes: 0, catches: 0, caughtBy: null, overT: 0,
    feathers: opts.feathers ?? HEALTH.startFeathers, maxFeathers: Math.max(HEALTH.startFeathers, opts.feathers ?? 0),
    hearingMul: opts.hearingMul ?? 1, graceMul: opts.graceMul ?? 1,
    // M4 power-ups (all off by default)
    lineMul: opts.lineMul ?? 1, reelMul: opts.reelMul ?? 1,
    smoke: opts.smoke ?? 0, smokes: [],
    cloakTime: opts.cloakTime ?? 0, stillT: 0, cloaked: false,
    snuffer: !!opts.snuffer, snuffed: new Set(opts.snuffed || []),
    doubleLine: opts.refires ?? 0, refires: opts.refires ?? 0,
    tieLine: !!opts.tieLine, ties: 0,
    // tutorial prompts (from the room definition)
    prompt: null,
    // render interpolation: where she was at the start of the last step (render.js lerps by alpha)
    px: level.spawn.x, py: level.spawn.y,
    // feel fix 1 (all inert unless feelFix)
    feelFix: fix, chain: 0, chainGround: 0, tautT: 0, arc: 0, swingAng: null, relStat: null,
    landT: 1, hopCap: false, airCap: 0, lastGrade: null, cleanCatches: 0,
    // feel fix 2: aim direction (render draws the aim line), the last jump-off (mash damping), catch keep
    feelFix2: fix2, aimDir: null, relAt: -1, relGood: true, catchKeep: SWING.attachKeep, mashCatches: 0, upTapAt: -1, snapReelT: 0,
    // abilities (Metroid-style). pullGrapple: the warp-pull suit power. Earned, so off at a fresh
    // start (SETTINGS.abilities; ?pull=1 grants it on the dev page). Without it the PULL button
    // fires a swing, and B can't be switched to pull.
    abilities: { pullGrapple: !!(opts.abilities?.pullGrapple ?? SETTINGS.abilities?.pullGrapple) },
    // grappleMode: what B (the SWING button) fires: 'classic' (swing) or 'pull'. The PULL button
    // always fires pull once the ability is had, so this is only the one-button accessibility
    // toggle (G / pad Y). game.js and shell.js carry it into the next room.
    grappleMode: (opts.grapple ?? SETTINGS.grapple) === 'pull' ? 'pull' : 'classic', pull: null,
    // grapple button state (audit F3/F4): bBtn is the physical button that owns the B state
    // machine ('fire' = SWING, 'pull' = PULL) while it is held; fireKind is what the armed press
    // will fire ('swing' | 'pull'); lineKind is what the live line was fired as.
    bBtn: null, fireKind: null, lineKind: null, fireHeld: false,
    warmBuff: false, // read by the warm-light buff stub (mini-tower.js warmLightBuff, the one TODO)
  };
  // the shaft's first mini boss (shaft-intro.js): a scripted scene, only while pull is not had
  w.intro = createIntro(levelDef, w.abilities);

  const roomStart = { hasSpark: !!opts.hasSpark, motes: [] };
  const emit = (type, data) => {
    w.events.push({ type, ...data });
    for (const p of level.prompts) {
      if (p.done) continue;
      if ([].concat(p.doneOn).includes(type) && (p.shown || inArea(p))) { p.done = true; p.shown = false; }
      else if (p.showOn === type) p.shown = true; // M2: a prompt shown by an event (no area)
    }
  };
  const center = () => bodyCenterY(w);
  const lineRange = () => (w.hasSpark ? T.lineRangeSpark : T.lineRange) * w.lineMul;
  const lampKey = (l) => `${l.x},${l.y}`;
  if (w.snuffed.size) level.lamps = level.lamps.filter((l) => !w.snuffed.has(lampKey(l)));

  /** Lamp Snuffer: put a lamp out for the rest of the room (in line range, clear line). */
  function snuff(lamp, how) {
    level.lamps = level.lamps.filter((l) => l !== lamp);
    w.snuffed.add(lampKey(lamp));
    emit('snuff', { x: lamp.x, y: lamp.y, how });
  }
  function lampInReach(px, py) {
    let best = null;
    let bd = Infinity;
    for (const l of level.lamps) {
      const d = Math.hypot(w.x - l.x, center() - l.y);
      if (d > lineRange() + T.targetSlack || !lineOfSight(level, w.x, center(), l.x, l.y, w.doorsOpen)) continue;
      const k = px === undefined ? d : Math.hypot(px - l.x, py - l.y);
      if (px !== undefined && k > T.tapPickRadius) continue;
      if (k < bd) { bd = k; best = l; }
    }
    return best;
  }
  const rangeSlack = () => lineRange() + T.targetSlack;
  const aimCands = () => aimCandidates(level, w.x, center(), rangeSlack(), w.doorsOpen, w.snuffer);
  const inArea = (p) => p.c0 !== undefined && w.x >= p.c0 && w.x < p.c1 + 1 && w.y > p.r0 && w.y <= p.r1 + 1;

  function release(why = 'release') {
    if (!w.anchor) return;
    if (fix) w.relStat = swingStat();
    w.anchor = null;
    w.taut = false;
    w.yank = null; w.bLine = null; w.snapCatch = false; w.pull = null; w.lineKind = null; // a pull let go keeps its speed: she flies on past
    if (!w.grounded && why !== 'respawn' && why !== 'caught') w.lineFall = true; // a fall from here is a missed swing
    emit('release', { why });
  }

  function respawn(reason) {
    release('respawn');
    const cp = (reason === 'fall' || levelDef.tall) && w.checkpoint ? w.checkpoint : level.spawn; // tall rooms: a catch also goes back to the last perch
    w.x = cp.x; w.y = cp.y; w.vx = 0; w.vy = 0; w.grounded = true;
    w.roll = 0; w.climb = null; w.dropRow = null; w.peakY = w.y; w.lineFall = false; w.bHoldFrames = 0;
    clearGrappleInput();
    w.aimPlantSkip = false; w.airPlantsLeft = AIM_PLANT.perAir; w.airPlanting = false;
    w.dodge = null; w.dodgeCd = 0; w.invuln = 0; w.dodgeLatch = null; w.atk = null; w.atkLatch = false; w.hitStop = 0;
    if (fix) { w.chain = 0; w.hopCap = false; w.relStat = null; }
    w.px = w.x; w.py = w.y;
    emit('respawn', { reason });
  }

  /** Audit D5 (part): the grapple-button fields every reset clears, in one place, so a new
   *  field (fireKind) is cleared everywhere. Same assignments the sites made before, plus it. */
  function clearGrappleInput() {
    w.fireBuf = 0; w.aiming = false; w.bArmed = false; w.fireKind = null;
  }

  /** v1 Qe(): nearest ring in range with a clear line (v1 controls). */
  function bestRing() {
    let best = null;
    let bd = lineRange() + T.targetSlack;
    for (const r of level.rings) {
      const d = Math.hypot(w.x - r.x, center() - r.y);
      if (d < bd && lineOfSight(level, w.x, center(), r.x, r.y, w.doorsOpen)) { best = r; bd = d; }
    }
    return best;
  }

  /** v1 ze(): never attach through solid (LOS); in the air the line is cut to length.
   *  v2: on the ground too (so walking off the edge swings instead of dropping a full line). */
  function attach(ring, inAir, how = 'auto', kind) {
    if (isSnuffLamp(ring)) return false; // Lamp Snuffer: a lamp is snuffed, never hooked
    const d = Math.hypot(w.x - ring.x, center() - ring.y);
    if (d > lineRange() + T.attachSlack) return false;
    if (!lineOfSight(level, w.x, center(), ring.x, ring.y, w.doorsOpen)) return false;
    w.anchor = ring;
    w.ropeLen = inAir || v2 ? Math.min(lineRange(), Math.max(T.lineMin, d)) : lineRange();
    // v2 freefall catch: the first time the line snaps taut she keeps her speed along the arc
    // (rope.js solveRope keep). A slack hook mid-fall snaps a few frames later, not here.
    w.snapCatch = v2 && inAir && (opts.attachProject ?? SWING.attachProject);
    w.catchKeep = SWING.attachKeep;
    // kind (audit F4): what this line was fired as. Omitted (the old callers): B's mode.
    const k = kind ?? (pullMode() ? 'pull' : 'swing');
    w.pull = v2 && k === 'pull' && w.abilities.pullGrapple ? { t: 0 } : null;
    w.lineKind = w.pull ? 'pull' : 'swing';
    if (w.pull) { w.snapCatch = false; w.ropeLen = Math.max(PULL.minLen, d); }
    else if (fix2 && inAir && !w.relGood && w.relAt >= 0 && w.time - w.relAt <= F2.mashWindow) {
      // mash damping: a re-hook straight after a jump-off that was not a GOOD release (Space+J
      // mashing) catches with only part of her speed and none of the jump's rise
      if (w.vy < 0) w.vy = 0;
      w.catchKeep = F2.mashKeep;
      w.mashCatches += 1;
      emit('mash-catch');
    }
    w.snapReelT = 0; w.upTapAt = -1;
    w.yanks = 0; w.yank = null; w.bLine = null; w.lineFall = false; w.ledgeAssist = 0; // assist is for arriving off a line, not on one
    w.everHooked = true;
    if (w.pull) emit('pull-start', { ring, how }); // (the shaft's PULL prompt is done on this)
    w.airPlantsLeft = AIM_PLANT.perAir; w.airPlanting = false; // a hook spends the airtime; the next one can plant again
    w.taut = inAir;
    w.fireBuf = 0;
    w.roll = 0;
    w.dropRow = null;
    const age = w.targetAge;
    w.target = null; w.targetAge = 0;
    emit('attach', { ring, how });
    if (fix) {
      w.tautT = 0; w.arc = 0; w.swingAng = null; w.relStat = null;
      if (inAir) {
        // a clean hook: the ring had only just come into reach, with a chain going
        if (w.chain > 0 && age <= F.cleanCatchWindow && how !== 'refire' && how !== 'chain') { // a swing-to-pull chain keeps her speed as it is
          const sp = Math.hypot(w.vx, w.vy);
          if (sp > 1e-6) { const k = (sp + F.cleanCatchKick) / sp; w.vx *= k; w.vy *= k; }
          w.cleanCatches += 1;
          emit('clean-catch', { chain: w.chain });
        }
        startHitStop('grab', F.grabStop);
      }
    }
    return true;
  }

  /** Feel fix: the swing so far on this hook (or the hook just let go). */
  function swingStat() {
    const a = w.anchor;
    if (!a) return w.relStat;
    const ang = Math.atan2(w.x - a.x, center() - a.y); // 0 straight below the anchor, + to its right
    const dir = Math.abs(w.vx) > 0.25 ? Math.sign(w.vx) : w.face;
    return { real: w.tautT >= F.realSwingTaut && w.arc >= F.realSwingArc, phi: ang * dir, tautT: w.tautT, arc: w.arc };
  }
  /** Warp-pull grapple: the ability is had and the mode is on. */
  const pullMode = () => w.abilities.pullGrapple && w.grappleMode === 'pull';
  /** What a grapple button fires. PULL ('pull'): a pull once the suit power is had, else a swing
   *  (so it is a second B until then). SWING ('fire') or no button (a tap on a point): B's mode. */
  const kindFor = (b) => (b === 'pull' ? (w.abilities.pullGrapple ? 'pull' : 'swing') : (pullMode() ? 'pull' : 'swing'));
  /** The one-B-state-machine view of the two grapple buttons (audit F3). The button that was
   *  pressed first owns it until it is up again; the other one is ignored meanwhile (pressing
   *  PULL while holding B to aim does nothing). Returns held/pressed/released where `fire` is the
   *  owner's. With the PULL button untouched it returns the input's own objects, unchanged. */
  function grappleButton(input) {
    const H0 = input.held; const P0 = input.pressed; const R0 = input.released || {};
    let own = w.bBtn;
    if (own && !H0[own] && !P0[own] && !R0[own]) own = null; // up, and its release was seen
    if (!own) own = P0.fire ? 'fire' : P0.pull ? 'pull' : H0.fire ? 'fire' : H0.pull ? 'pull' : null;
    w.bBtn = own;
    if (own !== 'pull' && !H0.pull && !P0.pull && !R0.pull) { w.fireHeld = !!H0.fire; return { H: H0, P: P0, R: R0 }; }
    const of = (S) => (own ? !!S[own] : false);
    const H = { ...H0, fire: of(H0) };
    w.fireHeld = H.fire;
    return { H, P: { ...P0, fire: of(P0) }, R: { ...R0, fire: of(R0) } };
  }
  /** Switch classic / pull for this world only. The next world starts again from
   *  opts.grapple or SETTINGS.grapple (boot / ?grapple=pull), not from this toggle. */
  function setGrappleMode(mode) {
    if (!w.abilities.pullGrapple) return w.grappleMode;
    w.grappleMode = mode ?? (w.grappleMode === 'pull' ? 'classic' : 'pull');
    emit('grapple-mode', { mode: w.grappleMode });
    return w.grappleMode;
  }
  /** One pull step: a spring toward the invisible anchor (velocity only; the move is the normal one). */
  function stepPull(dt) {
    const p = w.pull; p.t += dt;
    const dx = w.anchor.x - w.x; const dy = w.anchor.y - center(); const d = Math.hypot(dx, dy) || 1e-6;
    if (d <= PULL.swingAt || p.t >= PULL.maxTime) { // held on: a normal swing at this length
      w.pull = null; w.ropeLen = Math.max(T.lineMin, Math.min(lineRange(), d)); w.taut = true;
      w.tautT = 0; w.arc = 0; w.swingAng = null;
      // her speed turns along the swing, the way she was going across
      const tx = -dy / d, ty = dx / d; const sp = Math.hypot(w.vx, w.vy) * PULL.swingKeep;
      const sgn = Math.sign(w.vx * tx + w.vy * ty) || Math.sign(w.vx * tx) || w.face * Math.sign(tx) || 1;
      w.vx = tx * sp * sgn; w.vy = ty * sp * sgn;
      emit('pull-swing', { len: w.ropeLen });
      return;
    }
    const nx = dx / d; const ny = dy / d;
    const a = Math.min(PULL.maxAccel, PULL.spring * d);
    w.vx += nx * a * dt; w.vy += ny * a * dt;
    // damp the sideways part so it is a pull, not an orbit
    const along = w.vx * nx + w.vy * ny; const k = Math.exp(-PULL.damping * dt);
    let sx = (w.vx - along * nx) * k; let sy = (w.vy - along * ny) * k;
    const al = Math.min(PULL.maxSpeed, along);
    w.vx = al * nx + sx; w.vy = al * ny + sy;
  }
  const chainCap = () => (w.chain > 0 ? F.chainCaps[Math.min(w.chain, F.chainCaps.length - 1)] : 0);

  /** unhookCheck: v1's "landed hard while taut lets go" test ran on every landing check.
   *  The roll, slack line and 'land' event only happen on a real air-to-ground landing. */
  function onLanded(vyBefore, unhookCheck) {
    if (unhookCheck && w.taut && vyBefore > T.landUnhookSpeed) release('land');
    if (w.stepStartGrounded) return;
    if (v2 && w.anchor) w.ropeLen = lineRange(); // landing while attached: the line goes slack
    w.stepStartGrounded = true;
    if (fix) { w.landT = 0; w.hopCap = false; }
    const drop = w.y - w.peakY;
    if (parkour && drop >= T.rollDrop && !w.anchor && !w.dodge) {
      w.roll = T.rollTime;
      w.rollDir = Math.abs(w.vx) > 0.5 ? Math.sign(w.vx) : w.face;
      w.stats.rolls++;
      emit('roll', { drop });
    }
    emit('land', { drop });
    const missed = w.lineFall; w.lineFall = false; w.ledgeAssist = 0;
    // tall-room option: only a missed swing (she left a line and landed lower) can cost a
    // feather. A freefall she chose (stepped or jumped off a ledge) never does.
    if (levelDef.fallCost === 'feather' && missed && drop >= TALL.featherDrop && w.phase === 'play') {
      w.feathers = Math.max(0, w.feathers - 1);
      emit('feather-lost', { left: w.feathers, why: 'fall' });
      if (w.feathers <= 0) { w.phase = 'night-over'; w.overT = 0; emit('night-over'); }
    }
  }

  function land(top, vyBefore) {
    const unhookCheck = !w.grounded;
    w.y = top - T.footEps;
    w.vy = 0;
    w.grounded = true;
    onLanded(vyBefore, unhookCheck);
  }

  function tryLand(prevY, vyBefore) {
    const top = findLanding(level, w.x, w.y, prevY, w.doorsOpen, w.dropRow);
    if (top === null) return false;
    land(top, vyBefore);
    return true;
  }

  function collect(item) {
    if (item.t === 'k') w.doorsOpen = true;
    else if (item.t === '*') w.hasSpark = true;
    else if (item.t === 'm') w.motes.add(item.id);
    level.items = level.items.filter((i) => i !== item);
    emit('pickup', { item: item.t });
  }

  function takeExit() {
    w.phase = 'through';
    w.hold = T.throughHold;
    release('exit');
    emit('exit');
  }

  /** v1 Ze(): read a note or take the exit. */
  function use() {
    if (w.note) { w.note = null; return; }
    let best = null;
    let bd = T.useRadius;
    for (const it of level.items) {
      if (it.t !== 'n' && it.t !== 'E') continue;
      const d = Math.hypot(w.x - it.x, center() - it.y);
      if (d < bd) { best = it; bd = d; }
    }
    if (!best) return;
    if (best.t === 'n') { w.note = (best.text ?? '...').split('\n'); emit('note'); return; }
    takeExit();
  }

  function heldDir(H) {
    return { x: (H.right ? 1 : 0) - (H.left ? 1 : 0), y: (H.down ? 1 : 0) - (H.up ? 1 : 0) };
  }
  /** Feel fix 2 aim: the held D-pad (8-way), else her facing tilted up. Unit vector. */
  function aimDirection(H, stick) {
    if (stick && Math.hypot(stick.x, stick.y) >= 0.25) {
      const l = Math.hypot(stick.x, stick.y);
      return { x: stick.x / l, y: stick.y / l };
    }
    let d = heldDir(H);
    if (!d.x && !d.y) d = { x: w.face, y: -F2.aimFacingUp };
    const l = Math.hypot(d.x, d.y);
    return { x: d.x / l, y: d.y / l };
  }

  /** Swing-to-pull chain (follow-up Nov 7 2026). PULL pressed while she swings on a line (fired
   *  as a swing, or a pull that has turned into a swing), once the warp-pull is earned: re-target with the same intent Double Line uses (the held
   *  direction, else her facing; the grip she is on is left out) and attach there as a pull,
   *  instead of letting go. Her speed is kept as it is (no clean-catch kick, no mash damping);
   *  the pull's spring takes it from there, with the tuned PULL numbers. It never spends a Double
   *  Line re-fire. No point in reach: she stays on her swing and it thunks. It reads the raw PULL
   *  press, so a held (or just-let-go) B, which owns the B state, does not swallow it. Not here:
   *  a locked pull (PULL is a second B and lets go, as before), a pull still pulling (PULL lets
   *  go or re-fires, as before), a zip, a held hold-yank, a dash or a committed strike.
   *  Returns true when the press was used (the caller hides it from the B state machine). */
  function chainToPull(input) {
    if (!w.anchor || w.grounded || w.pull || !w.abilities.pullGrapple) return false; // swinging (a pull that turned into a swing counts)
    if (w.bLine || w.yank || w.dodge || w.climb || (w.atk && !canCancelAttack(w.atk.phase))) return false;
    const from = w.anchor;
    const range = lineRange() + T.targetSlack;
    const t = chooseTarget({ ...level, rings: level.rings.filter((r) => r !== from) },
      { x: w.x, cy: center(), face: w.face, dir: heldDir(input.held), range, doorsOpen: w.doorsOpen }, { target: null, age: 0 });
    const to = t.target;
    const ok = to && Math.hypot(w.x - to.x, center() - to.y) <= lineRange() + T.attachSlack && lineOfSight(level, w.x, center(), to.x, to.y, w.doorsOpen);
    if (!ok) { emit('thunk', { why: 'chain' }); return true; } // she keeps the swing she is on
    const vx = w.vx; const vy = w.vy;
    release('chain');
    attach(to, true, 'chain', 'pull');
    w.vx = vx; w.vy = vy; // (attach leaves speed alone for a pull; kept explicit)
    w.bArmed = false; w.aiming = false; w.reticle = null; w.fireBuf = 0;
    emit('pull-chain', { from: from.id, to: to.id });
    return true;
  }

  /** v2 B button and pointer taps (BRIEF "Grapple controls"). Runs before the physics. */
  function grappleControls(input, realDt) {
    // SWING (fire) and PULL share one B state machine (audit F3): the button view below says
    // what "fire" means this step, and the kind goes to attach. With only B pressed this is the
    // old input, bit for bit.
    if (v2 && input.pressed.pull && chainToPull(input)) input = { ...input, pressed: { ...input.pressed, pull: false } };
    const btn = grappleButton(input);
    const H = btn.H;
    let P = btn.P;
    const R = btn.R;
    const range = lineRange() + T.targetSlack;
    // auto-target, always shown before you press (no target while hanging on the line)
    if (!w.anchor) {
      const t = chooseTarget(level, { x: w.x, cy: center(), face: w.face, dir: heldDir(H), range, doorsOpen: w.doorsOpen },
        { target: w.target, age: w.targetAge + realDt });
      w.target = t.target; w.targetAge = t.age;
    } else { w.target = null; w.targetAge = 0; }

    // A dash stays off the rope. B during it does not fire, re-fire or let go, so Double Line
    // (a B press while hooked) is unchanged: dodge is refused before it can run on a line.
    if (v2 && w.dodge) {
      w.fireBuf = 0; w.bArmed = false;
      if (w.aiming) { w.aiming = false; w.reticle = null; emit('aim-cancel'); }
      return { ateJump: false };
    }
    // A committed strike ignores B. Recovery is the cancel window: B cuts it and fires.
    if (v2 && w.atk && !canCancelAttack(w.atk.phase)) {
      P = { ...P, fire: false, yank: false };
      input = { ...input, pressed: P, aimAt: null };
      w.bArmed = false;
      if (w.aiming) { w.aiming = false; w.reticle = null; }
    } else if (v2 && w.atk && canCancelAttack(w.atk.phase) && (P.fire || input.aimAt)) {
      w.atk = null;
      emit('cancel', { by: 'grapple' });
    }

    // tap or click directly on a point
    if (input.aimAt) {
      const pick = pickAt(reachable(level, w.x, center(), range, w.doorsOpen), input.aimAt.x, input.aimAt.y);
      const lamp = w.snuffer ? lampInReach(input.aimAt.x, input.aimAt.y) : null;
      const lampCloser = lamp && (!pick || Math.hypot(input.aimAt.x - lamp.x, input.aimAt.y - lamp.y) < Math.hypot(input.aimAt.x - pick.x, input.aimAt.y - pick.y));
      if (lampCloser) {
        snuff(lamp, 'tap');
        w.aiming = false; w.bArmed = false;
      } else if (pick && pick !== w.anchor) {
        if (w.anchor) release('retarget');
        attach(pick, !w.grounded, 'tap-point', kindFor('fire')); // a tap on a point fires what B fires
        w.aiming = false; w.bArmed = false;
      }
    }

    // Yank / zip. 'hold': B pressed on the line waits; held past yankHold it zips, let go of B
    // and she launches; a shorter tap does what a press used to (let go, or Double Line refire).
    // 'button': a separate yank action zips; B lets go on press as before.
    const holdYank = yankInput() === 'hold';
    // (pressed but already up = a tap that ended inside the frame: it acts at once, as before)
    if (holdYank && P.fire && H.fire && w.anchor && !w.grounded) { w.bLine = { t: 0 }; P = { ...P, fire: false }; }
    if (w.bLine && w.anchor) {
      if (H.fire && !R.fire) {
        w.bLine.t += realDt;
        if (!w.yank && !w.bLine.zipped && w.bLine.t >= SWING.yankHold) { w.bLine.zipped = true; startYank(); }
      } else {
        const zipped = w.bLine.zipped; w.bLine = null;
        if (w.yank) { endYank('launch'); } else if (!zipped) P = { ...P, fire: true }; // a tap: the old press
      }
    }
    if (!holdYank && P.yank && w.anchor && !w.grounded) startYank();
    if (P.fire) {
      let refired = false;
      if (w.anchor && !w.grounded && w.refires > 0) {
        // Double Line: fire again from the line, at the best other ring in reach
        const from = w.anchor;
        const t = chooseTarget({ ...level, rings: level.rings.filter((r) => r !== from) },
          { x: w.x, cy: center(), face: w.face, dir: heldDir(H), range, doorsOpen: w.doorsOpen }, { target: null, age: 0 });
        if (t.target) {
          release('refire');
          if (attach(t.target, true, 'refire', kindFor(w.bBtn))) { w.refires -= 1; refired = true; emit('refire', { left: w.refires }); }
        }
      }
      if (refired) { w.bArmed = false; }
      else if (w.anchor) { release('letgo'); w.lineCoyote = T.lineCoyote; w.bArmed = false; if (v2 && !w.grounded) w.ledgeAssist = SWING.ledgeAssistTime; emit('letgo'); }
      else { w.bArmed = true; w.bTime = 0; w.bHoldFrames = 0; w.fireKind = kindFor(w.bBtn); }
    }
    if (w.bArmed && H.fire) {
      w.bTime += realDt;
      w.bHoldFrames += 1;
      if (!w.aiming && w.bTime >= (fix ? F.aimHoldTime : T.aimHoldTime)) {
        const cands = aimCands();
        // A second mid-air hold in the same airtime does not aim (that would slow-mo a mash into a hover).
        const airLocked = fix2 && !w.grounded && !w.airPlanting && w.airPlantsLeft <= 0;
        if (!airLocked && !(fix && F.aimNeedsTarget && !cands.length)) { // fix: nothing in reach = no aim, no slow-mo (the release still taps)
          w.aiming = true;
          w.reticle = fix2 ? aimPick(cands, w.x, center(), aimDirection(H, input.aimStick), F2.aimConeHalf) : (w.target || cands[0] || null);
          emit('aim-start');
        }
      }
    }
    if (w.aiming) {
      const cands = aimCands();
      if (w.reticle && !cands.includes(w.reticle)) w.reticle = null;
      const lettingGo = R.fire || !H.fire; // release uses the last held reticle, not a snap to facing
      if (fix2 && !lettingGo) { // the reticle follows the aim: nearest reachable point to the held direction
        w.aimDir = aimDirection(H, input.aimStick);
        w.reticle = aimPick(cands, w.x, center(), w.aimDir, F2.aimConeHalf);
      } else if (!w.reticle && cands.length) w.reticle = w.target || cands[0];
      if (w.reticle && !fix2) {
        for (const [a, d] of [['left', { x: -1, y: 0 }], ['right', { x: 1, y: 0 }], ['up', { x: 0, y: -1 }], ['down', { x: 0, y: 1 }]])
          if (P[a]) w.reticle = stepReticle(cands, w.reticle, d);
      }
      if (P.jump) { w.aiming = false; w.bArmed = false; w.reticle = null; emit('aim-cancel'); return { ateJump: true }; }
    }
    if (w.bArmed && (R.fire || !H.fire)) {
      if (w.aiming) {
        const r = w.reticle;
        w.aiming = false; w.reticle = null;
        if (isSnuffLamp(r)) { snuff(r, 'aim'); emit('aim-snuff'); }
        else if (r && attach(r, !w.grounded, 'aim', w.fireKind ?? undefined)) emit('aimfire');
        else emit('aim-cancel');
      } else {
        w.fireBuf = T.fireBuffer; // tap: fire now, or within 100 ms if a point comes in range
      }
      w.bArmed = false;
    }
    if (w.fireBuf > 0 && !w.anchor) {
      if (w.target && attach(w.target, !w.grounded, 'tap', w.fireKind ?? undefined)) { /* attached */ }
      else {
        w.fireBuf -= realDt;
        if (w.fireBuf <= 1e-9) {
          w.fireBuf = 0;
          const lamp = w.snuffer ? lampInReach() : null; // Lamp Snuffer: B with no ring puts out the nearest lamp
          if (lamp) snuff(lamp, 'b'); else { emit('thunk'); if (fix && w.chain > 0) w.chain -= 1; }
        }
      }
    }
    return { ateJump: false };
  }

  /** Yank / zip: the line snaps taut and pulls her hard at the anchor (once per hook, cooldown). */
  function startYank() {
    if (!w.anchor || w.yank || w.pull || w.yanks >= SWING.yankPerAttach || w.yankCd > 0) return false;
    w.yanks += 1; w.yank = { t: 0, sp: Math.max(SWING.yankSpeed, Math.hypot(w.vx, w.vy)) }; w.yankCd = SWING.yankCooldown; // a zip never slows her
    w.stats.yanks = (w.stats.yanks || 0) + 1;
    emit('yank', { ring: w.anchor });
    return true;
  }
  /** End a zip: the line lets go and she keeps the zip's speed, so she flies on past the anchor. */
  function endYank(why) {
    if (!w.yank) return;
    w.yank = null;
    release('yank-' + why);
    w.lineCoyote = T.lineCoyote; w.ledgeAssist = SWING.ledgeAssistTime;
    emit('yank-end', { why });
  }
  function stepYank(dt) {
    const y = w.yank; y.t += dt;
    const dx = w.anchor.x - w.x; const dy = w.anchor.y - center(); const d = Math.hypot(dx, dy) || 1;
    if (d <= SWING.yankPassDist || y.t >= SWING.yankMaxTime) { endYank(d <= SWING.yankPassDist ? 'pass' : 'time'); return; }
    w.vx = (dx / d) * y.sp; w.vy = (dy / d) * y.sp;
    w.ropeLen = Math.max(T.lineMin, d); // the line follows her in, it never holds her back
  }

  function startClimb(ledge) {
    if (w.anchor) release('climb');
    w.dodge = null; w.atk = null;
    w.climb = { t: 0, x0: w.x, y0: w.y, x1: ledge.x, y1: ledge.y, lip: ledge.col != null ? { col: ledge.col, row: ledge.row } : null, face: ledge.face || (w.face < 0 ? -1 : 1) };
    w.vx = 0; w.vy = 0; w.roll = 0;
    w.stats.climbs++;
    emit('climb');
  }

  function stepClimb(dt) {
    const c = w.climb;
    c.t += dt;
    const k = Math.min(1, c.t / T.climbTime);
    // straight up first (60%), then over the edge (40%); never both at once, so the body
    // never cuts the ledge corner (findLedge checked the up-sweep and the standing spot)
    const ky = Math.min(1, k / 0.6);
    const kx = Math.max(0, (k - 0.6) / 0.4);
    w.y = c.y0 + (c.y1 - c.y0) * ky;
    w.x = c.x0 + (c.x1 - c.x0) * kx;
    if (k >= 1) {
      w.climb = null; w.x = c.x1; w.y = c.y1; w.grounded = true; w.coyote = w.coyoteMax; w.peakY = w.y; w.lineFall = false;
      emit('climb-done');
    }
  }

  function cutAttack(by) {
    if (!w.atk || !canCancelAttack(w.atk.phase)) return false;
    w.atk = null;
    emit('cancel', { by });
    return true;
  }

  function beginDodge(dir) {
    const d = dir < 0 ? -1 : 1;
    w.dodge = { t: 0, dir: d };
    w.invuln = FEEL.dodgeIFrames;
    w.dodgeCd = FEEL.dodgeCooldown;
    w.vy *= FEEL.dodgeVyKeep;
    w.roll = 0;
    w.face = d;
    if (w.aiming || w.bArmed) { clearGrappleInput(); w.reticle = null; emit('aim-cancel'); }
    emit('dodge', { dir: d });
  }

  /** Off the rope, off a zip, not already dashing. A line (including Double Line) is never dropped here. */
  function canDodge() {
    return v2 && w.phase === 'play' && !w.anchor && !w.climb && !w.yank && !w.dodge && w.dodgeCd <= 0;
  }

  function canAttack() {
    return v2 && w.phase === 'play' && !w.anchor && !w.climb && !w.dodge && !w.yank && !w.aiming && !w.bArmed && !w.atk;
  }

  /** Dodge, strike, i-frames. Returns true when a dodge ate this step's jump. */
  function stepFeel(input, dt, left, right) {
    let dodgeDir = 0;
    let dodgePressed = !!input.pressed.dodge;
    if (w.dodgeLatch !== null && w.dodgeLatch !== undefined) {
      dodgePressed = true;
      dodgeDir = w.dodgeLatch || 0;
      w.dodgeLatch = null;
    }
    if (input.dodgeDir) dodgeDir = input.dodgeDir;
    const attackPressed = !!input.pressed.attack || w.atkLatch;
    w.atkLatch = false;
    let ateJump = false;
    if (dodgePressed && !(w.atk && !canCancelAttack(w.atk.phase)) && canDodge()) {
      if (w.atk) cutAttack('dodge');
      const dir = dodgeDir || (left && !right ? -1 : right && !left ? 1 : w.face);
      beginDodge(dir);
      ateJump = true;
    }
    if (attackPressed && canAttack()) {
      w.atk = { phase: 'windup', t: 0, landed: false };
      w.roll = 0;
      emit('attack', { phase: 'windup' });
    }
    if (w.dodgeCd > 0) w.dodgeCd = Math.max(0, w.dodgeCd - dt);
    if (w.invuln > 0) {
      w.invuln = Math.max(0, w.invuln - dt);
      if (w.invuln < 1e-6) w.invuln = 0; // 0.2 - 12 frames is a float speck, not another safe step
    }
    if (w.dodge) {
      w.dodge.t += dt;
      if (w.dodge.t >= FEEL.dodgeTime - 1e-9) w.dodge = null;
    }
    if (w.atk) {
      w.atk.t += dt;
      if (w.atk.t >= attackLimit(w.atk.phase) - 1e-9) {
        w.atk.t = 0;
        if (w.atk.phase === 'windup') w.atk.phase = 'active';
        else if (w.atk.phase === 'active') w.atk.phase = 'recover';
        else w.atk = null;
      }
    }
    return ateJump;
  }

  function resolveStrike() {
    if (!v2 || !w.atk || w.atk.landed) return;
    for (const g of level.guards) {
      if (!attackReaches(w, g)) continue;
      w.atk.landed = true;
      g.state = 'stagger';
      g.t = FEEL.staggerTime;
      g.kbT = FEEL.knockbackTime;
      g.kbVx = (w.face < 0 ? -1 : 1) * FEEL.knockbackSpeed;
      emit('hit', { x: g.x, y: g.floorY, kind: 'strike' });
      startHitStop('hit');
      break;
    }
  }

  /** A body bump. I-frames swallow it. Sight is not touched: a dodge does not hide her. */
  function resolveBump() {
    if (!v2) return;
    for (const g of level.guards) {
      const on = g.state !== 'tied' && guardBump(w, g);
      if (!on || w.invuln > 0) { g._bump = false; continue; }
      if (g._bump) continue;
      g._bump = true;
      emit('hurt', { x: g.x });
    }
  }

  function startHitStop(kind, durOverride) {
    const dur = durOverride ?? (kind === 'takedown' ? FEEL.takedownStop : FEEL.hitStop);
    const reduced = !!w.reducedMotion;
    emit('hitstop', { ms: Math.round(dur * 1000), dur, kind, reduced });
    if (!reduced) w.hitStop = Math.max(w.hitStop || 0, dur);
  }

  /** Feel fix: ground ramp, air accel, and the pull back down to the air cap. */
  function moveFix(dir, speed, dt) {
    if (w.grounded && !w.taut) {
      const target = dir * speed;
      if (dir === 0) w.vx = Math.sign(w.vx) * Math.max(0, Math.abs(w.vx) - F.groundDecel * dt);
      else if (w.vx * dir < 0) w.vx = dir * Math.min(speed, (w.vx * dir) + F.groundTurn * dt);
      else if (Math.abs(w.vx) <= speed) w.vx = dir * Math.min(speed, Math.abs(w.vx) + F.groundAccel * dt);
      else w.vx = dir * Math.max(speed, Math.abs(w.vx) - F.groundOverDecel * dt);
      if (Math.abs(w.vx - target) < 1e-9) w.vx = target;
      w.airCap = speed + T.airOverspeed;
      return;
    }
    const cap = Math.max(speed + (w.hopCap ? F.hopOverspeed : T.airOverspeed), chainCap());
    w.airCap = cap;
    const s = Math.sign(w.vx);
    if (Math.abs(w.vx) > cap && dir !== -s) {
      w.vx = s * Math.max(cap, Math.abs(w.vx) - F.airOverDrag * dt); // over the cap: no push, a drag back toward it
      return;
    }
    if (dir === 0) return;
    const before = w.vx;
    w.vx += dir * T.airAccel * dt;
    if (w.vx > cap && before <= cap) w.vx = cap;
    if (w.vx < -cap && before >= -cap) w.vx = -cap;
  }

  /** Feel fix bookkeeping, once per step after the move. */
  function trackFix(realDt) {
    if (w.anchor && w.taut && !w.grounded) {
      const a = w.anchor;
      const ang = Math.atan2(w.x - a.x, center() - a.y);
      if (w.swingAng !== null) w.arc += Math.abs(ang - w.swingAng);
      w.swingAng = ang;
      w.tautT += realDt;
    } else if (w.anchor) w.swingAng = null;
    if (w.grounded) {
      w.landT += realDt;
      w.chainGround += realDt;
      if (w.chainGround > F.chainGroundGrace && w.chain > 0) { w.chain = 0; emit('chain-break', { why: 'ground' }); }
    } else w.chainGround = 0;
  }

  function latchFeel(input) {
    const P = input.pressed || {};
    if (P.jump) w.jumpBuf = w.bufferMax;
    if (P.dodge) w.dodgeLatch = input.dodgeDir || 0;
    if (P.attack) w.atkLatch = true;
  }

  /** True when this step should freeze her for an aim hold. Speed is left as it is. */
  function aimPlant(fireHeld, jumpPressed) {
    if (!fix2 || !F2.aimFreeze || w.anchor || !fireHeld || jumpPressed) return false;
    const pastTap = w.bHoldFrames > AIM_PLANT.tapFrames;
    const preAim = w.bArmed && pastTap && w.bTime < F.aimHoldTime;
    if (!w.aiming && !preAim) return false;
    if (w.grounded) return true;
    if (w.aimPlantSkip && !w.aiming) return false;
    if (w.airPlanting) return true;
    if (w.airPlantsLeft <= 0) return false;
    if (!w.aiming && !aimCands().length) return false;
    w.airPlantsLeft -= 1;
    w.airPlanting = true;
    return true;
  }

  /** v1 At(): one step of the Lark. dt = physics dt (half while aiming), realDt = wall step.
   *
   *  Timer clocks (audit I13; tuned feel, do NOT unify). While aim slow-mo runs, dt is half of
   *  realDt, so the two clocks drift apart:
   *    - on dt (physics time, slowed while aiming): coyote, yankCd.
   *    - on realDt (wall time): jumpBuf, lineCoyote, ledgeAssist, and grappleControls' bTime and
   *      bLine.t.
   *  A new timer must pick its clock on purpose. Use dt if it is part of the motion, and realDt
   *  if it is a player-input window.
   *
   *  B hold, frames vs seconds (audit I14): the same hold is counted twice. bHoldFrames counts
   *  fixed steps against AIM_PLANT.tapFrames (tap vs plant, so 60 Hz is assumed). bTime counts
   *  realDt seconds against aimHoldTime (when the aim starts). Both reset together when B is
   *  armed. Keep both as they are; a later grapple-button state object should carry both. */
  function stepLark(input, dt, realDt) {
    const H = input.held;
    const P = input.pressed;
    const left = !!H.left, right = !!H.right, up = !!H.up, down = !!H.down;
    if (w.note) { if (P.use) w.note = null; return; }

    if (left && !right) w.face = -1;
    if (right && !left) w.face = 1;
    w.stepStartGrounded = w.grounded;
    let jumpPressed = !!P.jump;
    if (P.pullToggle) setGrappleMode();
    if (v2) { const g = grappleControls(input, realDt); if (g.ateJump) jumpPressed = false; }
    stepMiniTowers(w, input);
    warmLightBuff(w);
    if (!w.aiming) w.aimDir = null;
    // Aim plant (AIM_PLANT): a tap keeps moving. Past tapFrames a hold plants her, speed kept,
    // until B is let go, she jumps, or the hold expires with nothing to aim at. In the air the
    // plant is once per airtime and only when a point is in reach (or she is already aiming),
    // so mashing or holding B over empty air cannot hover. Landing or a hook refills it.
    // A jump during the tap window is a jump, not an aim: that press does not pre-plant in the air.
    if (w.grounded) { w.airPlantsLeft = AIM_PLANT.perAir; w.airPlanting = false; }
    if (jumpPressed && (w.grounded || w.coyote > 0) && w.bArmed && w.bHoldFrames <= AIM_PLANT.tapFrames && !w.anchor) w.aimPlantSkip = true;
    const fireHeld = v2 ? !!w.fireHeld : !!H.fire; // v2: whichever grapple button owns B (SWING or PULL)
    if (!w.bArmed || !fireHeld) { w.airPlanting = false; w.aimPlantSkip = false; }
    if (aimPlant(fireHeld, jumpPressed)) { w.jumpBuf = 0; return; }
    if (v2 && stepFeel(input, dt, left, right)) { jumpPressed = false; w.jumpBuf = 0; }
    if (w.climb) { stepClimb(dt); afterMove(); return; }

    // crouch, but do not stand up into stone
    const wantCrouch = down || !!H.crouch || w.roll > 0;
    const h = wantCrouch ? T.crouchHeight : T.standHeight;
    if (h <= w.h || !bodyBlocked(level, w.x, w.y, h, w.doorsOpen)) { w.h = h; w.crouch = wantCrouch; }
    if (P.use) use();
    if (P.select && w.smoke > 0) { // Smoke Pellet: a cloud where she stands
      w.smoke -= 1;
      w.smokes.push({ x: w.x, y: center(), t: T.smokeTime, r: T.smokeRadius });
      emit('smoke', { left: w.smoke });
    }
    if (!v2 && P.fire) {
      if (w.anchor) release();
      else { const r = bestRing(); if (r) attach(r, !w.grounded); }
    }
    if (w.anchor) {
      const oldLen = w.ropeLen;
      if (!w.pull) w.ropeLen = reel(w.ropeLen, up, down, lineRange(), dt, w.reelMul);
      // feel fix 2 snap reel: double-tap UP on a line = a short fast burst reel-in, on top of the
      // normal (slow, unchanged) reel. Angular momentum is kept, so at the bottom of the arc it slingshots.
      if (fix2 && F2.snapReel && !w.pull && !w.yank) {
        if (P.snap) { w.snapReelT = F2.snapReelLen; w.upTapAt = -1; emit('snap-reel'); }
        else if (P.up) {
          if (w.time - w.upTapAt <= F2.snapReelTap) { w.snapReelT = F2.snapReelLen; w.upTapAt = -1; emit('snap-reel'); }
          else w.upTapAt = w.time;
        }
        if (w.snapReelT > 0) {
          const step = Math.min(w.snapReelT, T.reelSpeed * F2.snapReelMul * dt); // snapReelT: tiles left to reel
          w.snapReelT -= step;
          w.ropeLen = Math.max(T.lineMin, w.ropeLen - step);
          if (w.ropeLen <= T.lineMin) w.snapReelT = 0;
        }
      }
      if (v2 && w.taut && !w.grounded) conserveSwing(w, w.anchor, oldLen, w.ropeLen);
    }
    if (v2) w.ledgeAssist = Math.max(0, (w.ledgeAssist || 0) - realDt);
    w.jumpBuf = jumpPressed ? w.bufferMax : Math.max(0, w.jumpBuf - realDt);
    // windup and the active frames are committed: a jump press does not come out of them
    if (v2 && w.atk && !canCancelAttack(w.atk.phase)) w.jumpBuf = 0;
    if (v2) w.lineCoyote = Math.max(0, w.lineCoyote - realDt);
    const swingDir = Math.abs(w.vx) > 0.25 ? Math.sign(w.vx) : w.face;
    const offLine = v2 ? (w.anchor && !w.grounded) || (!w.anchor && w.lineCoyote > 0) : !!w.anchor;
    if (offLine && (v2 ? w.jumpBuf > 0 : jumpPressed)) {
      // jump off the line (v1 rope jump); v2 adds a boost in the swing direction
      // feel fix: grade the release. good = a real swing let go inside the window
      const st = fix ? swingStat() : null;
      const pulled = !!w.pull; // a jump off a pull keeps the pull's speed, ungraded
      const good = !fix || (!!st && st.real && st.phi >= F.windowMin && st.phi <= F.windowMax);
      const carry = v2 && good ? SWING.releaseCarry : 1;
      const vy = pulled ? Math.min(w.vy, T.ropeJumpVelocity * 0.5) : w.vy > T.ropeJumpKeepAbove ? T.ropeJumpVelocity : w.vy * carry + (v2 ? SWING.releaseUpKick : T.ropeJumpExtra);
      const coy = !w.anchor;
      if (v2) cutAttack('jump');
      release('jump');
      w.vy = vy; w.grounded = false; w.coyote = 0; w.jumpBuf = 0; w.lineCoyote = 0;
      if (pulled) { w.relAt = w.time; w.relGood = true; emit('pull-release', { vx: w.vx, vy: w.vy }); }
      else if (fix) {
        if (good) { w.vx = w.vx * carry + swingDir * SWING.releaseBoostX; w.chain = Math.min(F.chainMax, w.chain + 1); }
        else { w.vx *= F.missKeep; w.chain = Math.max(0, w.chain - 1); }
        w.vx = Math.max(-F.releaseMaxVx, Math.min(F.releaseMaxVx, w.vx));
        w.lastGrade = good ? 'GOOD' : !st || !st.real ? 'EARLY' : st.phi < F.windowMin ? 'EARLY' : 'LATE';
        w.relAt = w.time; w.relGood = good;
        w.ledgeAssist = SWING.ledgeAssistTime; w.relStat = null; w.hopCap = false;
        emit('release-grade', { good, grade: w.lastGrade, chain: w.chain });
      } else if (v2) { w.vx = w.vx * carry + swingDir * SWING.releaseBoostX; w.ledgeAssist = SWING.ledgeAssistTime; }
      w.stepStartGrounded = false;
      w.roll = 0;
      emit('jump', { from: 'line' });
      if (v2) emit('jumpoff', { coyote: coy });
    } else if (v2 && w.jumpBuf > 0 && w.grounded && down && oneWayUnderFeet(level, w.x, w.y, w.doorsOpen) !== null) {
      // DOWN + A on a one-way ledge (wood or grating): drop through it
      w.dropRow = oneWayUnderFeet(level, w.x, w.y, w.doorsOpen);
      cutAttack('jump');
      w.y += T.dropNudge; w.vy = 0; w.grounded = false; w.coyote = 0; w.jumpBuf = 0; w.stepStartGrounded = false;
      if (w.anchor) w.ropeLen = lineRange();
      emit('drop', { row: w.dropRow });
    } else if (w.jumpBuf > 0 && (w.grounded || w.coyote > 0) && (!w.anchor || (v2 && w.grounded))) {
      if (v2) cutAttack('jump');
      if (fix) w.hopCap = w.landT < F.hopWindow; // a re-hop straight off a landing (mashing A)
      w.vy = T.jumpVelocity; w.grounded = false; w.coyote = 0; w.jumpBuf = 0; w.roll = 0; w.stepStartGrounded = false;
      emit('jump', { from: 'ground' });
    }

    const wasGrounded = w.grounded;
    if (!w.grounded) {
      w.coyote = Math.max(0, w.coyote - dt);
      if (w.coyote < 1e-6) w.coyote = 0; // 0.1 - 6 frames is a float speck, not another jump
    }
    if (v2) w.yankCd = Math.max(0, w.yankCd - dt);
    if (w.yank && w.anchor) stepYank(dt);
    if (w.pull && w.anchor) stepPull(dt);
    const dodging = !!(v2 && w.dodge);
    w.vy += T.gravity * dt * (w.yank ? SWING.yankGravityMul : w.pull ? PULL.gravityMul : dodging ? FEEL.dodgeGravityMul : 1);
    const fallCap = v2 ? SWING.fallMax : T.maxFall;
    if (w.vy > fallCap) w.vy = fallCap;

    const speed = w.crouch && w.roll <= 0 ? T.crouchSpeed : T.walkSpeed;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dodging) {
      w.vx = w.dodge.dir * FEEL.dodgeSpeed;
    } else if (v2 && w.atk && !canCancelAttack(w.atk.phase) && w.grounded && !w.taut && !w.yank) {
      w.vx = w.face * FEEL.attackLunge;
    } else if (w.roll > 0 && w.grounded) {
      w.roll -= dt;
      w.vx = w.rollDir * T.rollSpeed;
    } else if (w.pull && !w.grounded) {
      // pulling: no air control, the spring steers
    } else if (fix && (!w.taut || w.grounded) && !w.yank) {
      moveFix(dir, speed, dt);
    } else if ((!w.taut || w.grounded) && !w.yank) {
      if (dir !== 0) {
        if (w.grounded && !w.taut) w.vx = dir * speed;
        else {
          w.vx += dir * T.airAccel * dt;
          const cap = speed + T.airOverspeed;
          if (w.vx > cap && w.vx - dir * T.airAccel * dt <= cap) w.vx = cap;
          if (w.vx < -cap && w.vx - dir * T.airAccel * dt >= -cap) w.vx = -cap;
          if (!v2) { if (w.vx > cap) w.vx = cap; if (w.vx < -cap) w.vx = -cap; }
        }
      } else if (w.grounded && !w.taut) w.vx *= T.groundDamping;
    }
    if (w.roll > 0 && !w.grounded) w.roll = 0;

    // horizontal
    const prevX = w.x;
    w.x += w.vx * dt;
    const minX = T.halfWidth + T.edgePad;
    const maxX = level.cols - T.halfWidth - T.edgePad;
    if (w.x < minX) { w.x = minX; w.vx = 0; }
    if (w.x > maxX) { w.x = maxX; w.vx = 0; }
    if (bodyBlocked(level, w.x, w.y, w.h, w.doorsOpen)) { w.x = prevX; w.vx = 0; if (w.roll > 0) w.roll = 0; if (w.dodge) w.dodge = null; }

    // vertical
    const prevY = w.y;
    const vyBefore = w.vy;
    w.y += w.vy * dt;
    w.grounded = false;
    if (bodyBlocked(level, w.x, w.y, w.h, w.doorsOpen)) {
      if (vyBefore >= 0) {
        w.y = Math.floor(w.y) - T.footEps; w.vy = 0; w.grounded = true;
        onLanded(vyBefore, !wasGrounded);
      } else {
        w.y = Math.floor(w.y - w.h) + 1 + w.h + T.footEps; w.vy = 0;
      }
    }
    if (!bodyBlocked(level, w.x, w.y, w.h, w.doorsOpen)) tryLand(prevY, vyBefore);

    // rope
    const preRopeY = w.y;
    if (!w.anchor) w.taut = false;
    else {
    if (w.pull) w.taut = false; // pulling: the spring, not a rope length
    else {
      w.taut = solveRope(w, w.anchor, w.ropeLen, undefined, w.snapCatch ? w.catchKeep : 0);
      if (w.snapCatch && w.snapped) { w.snapCatch = false; emit('snap', { speed: Math.hypot(w.vx, w.vy) }); }
      if (w.taut && w.anchor && !w.yank) pumpSwing(w, w.anchor, dir, dt, v2, fix2 ? F2.pumpMul : 1);
    }
    }
    // the line never drags her into stone. Full undo used to abandon the length against a
    // wall, so gravity won every frame (slow slide with no input). Hold her on the circle at
    // the pre-rope x instead — same still hang as in open air (playtest, Nov 9 2026).
    if (bodyBlocked(level, w.x, w.y, w.h, w.doorsOpen)) {
      w.vx = 0;
      let held = false;
      if (w.anchor && !w.pull && !w.grounded && w.ropeLen > 0) {
        // Prefer pre-rope x; if that is already in stone, nudge toward the anchor onto clear air.
        let xHold = prevX;
        if (bodyBlocked(level, xHold, preRopeY, w.h, w.doorsOpen)) {
          const toward = Math.sign(w.anchor.x - xHold) || (w.face || 1);
          for (let s = 0.05; s <= T.halfWidth + 0.5; s += 0.05) {
            const x = prevX + toward * s;
            if (!bodyBlocked(level, x, preRopeY, w.h, w.doorsOpen)) { xHold = x; break; }
          }
        }
        const dx = xHold - w.anchor.x;
        const rem = w.ropeLen * w.ropeLen - dx * dx;
        if (rem >= 0) {
          const cy0 = bodyCenterY({ y: preRopeY, h: w.h });
          const root = Math.sqrt(rem);
          const cyBelow = w.anchor.y + root;
          const cyAbove = w.anchor.y - root;
          const cy = Math.abs(cyBelow - cy0) <= Math.abs(cyAbove - cy0) ? cyBelow : cyAbove;
          const yHold = cy + w.h * 0.5;
          if (!bodyBlocked(level, xHold, yHold, w.h, w.doorsOpen)) {
            w.x = xHold; w.y = yHold; w.vy = 0; w.taut = true; held = true;
          }
        }
      }
      if (!held) { w.x = prevX; w.y = preRopeY; }
    }
    if (w.y >= preRopeY) tryLand(preRopeY, vyBefore);
    if (v2) resolveStrike();

    // grappleable architecture: hooked on a ledge's corner or edge and reeled all the way in
    // (or zipping in on a yank), she pulls herself up onto THAT ledge. No direction needed.
    if (parkour && !w.grounded && w.anchor?.ledge && (w.yank || w.pull || w.ropeLen <= T.lineMin + 1e-6)) {
      const lg = w.anchor.ledge;
      const feetBelow = w.y - lg.top;
      if (feetBelow > PX1 &&feetBelow <= ARCH.lineClimbReach && Math.abs(w.x - w.anchor.x) <= ARCH.lineClimbDx) {
        const face = lg.side === 'L' ? 1 : lg.side === 'R' ? -1 : (Math.sign(w.anchor.x - w.x) || w.face);
        const ledge = findLedge(level, w.x, w.y, face, w.doorsOpen, null, ARCH.lineClimbReach);
        if (ledge && ledge.row === lg.top) { w.anchorClimbed = true; startClimb(ledge); afterMove(); return; }
      }
    }
    // auto ledge climb: in the air (falling onto it, at the end of a grapple, or jumping into
    // it), a ledge top just in front of her and above her feet. No input needed.
    if (parkour && !w.grounded) {
      const moving = dir !== 0 ? dir : (Math.abs(w.vx) > 0.5 ? Math.sign(w.vx) : 0);
      if (moving && w.vy >= T.climbMinVy && w.vy <= T.climbMaxFall) {
        const reach = v2 && w.ledgeAssist > 0 ? SWING.ledgeReachAfterLine : T.climbReach;
        const ledge = findLedge(level, w.x, w.y, moving, w.doorsOpen, w.dropRow, reach);
        if (ledge) { startClimb(ledge); afterMove(); return; }
      }
    }
    afterMove();
  }

  function afterMove() {
    // v2 fix for v1's player-inside-platform bug (playtest/BUG-player-inside-platform-room1):
    // v1 only collided with the TOPS of ground, so a swing or a sideways move could carry the
    // body into it. Stone now blocks the body on every move above; as a last line of defence,
    // push the body out of any solid tile the same frame (shortest of up/left/right/down).
    if (!w.climb) {
      const out = pushOut(level, w.x, w.y, w.h, w.doorsOpen);
      if (out) {
        w.x = out.x; w.y = out.y;
        if (out.axis === 'left' || out.axis === 'right') w.vx = 0;
        else if (out.axis === 'up') { if (w.vy > 0) w.vy = 0; w.grounded = true; }
        else if (w.vy < 0) w.vy = 0;
        w.stats.pushOuts++;
        emit('pushout', { axis: out.axis });
      }
    }
    if (v2) resolveBump();
    if (w.grounded) {
      w.coyote = w.coyoteMax;
      w.refires = w.doubleLine;
      for (const k of level.checkpoints)
        if (w.x >= k.c0 && w.x < k.c1 + 1 && Math.abs(w.y - k.top) < 0.1) w.checkpoint = { x: k.x, y: k.top - T.footEps };
      if (w.dropRow !== null && Math.floor(w.y + T.footEps * 2) !== w.dropRow) w.dropRow = null;
    }
    if (w.dropRow !== null && w.y > w.dropRow + 1 + 0.5) w.dropRow = null;
    if (w.grounded || w.climb || (w.anchor && w.taut)) w.peakY = w.y;
    else w.peakY = Math.min(w.peakY, w.y);

    for (const it of [...level.items]) {
      if (it.t === 'n' || it.t === 'E') continue;
      if (Math.hypot(w.x - it.x, center() - it.y) < T.pickupRadius) collect(it);
    }
    if (w.intro && introCheck(w, introApi)) return; // the shaft roof, no pull yet: the mini boss scene
    if (level.autoExit && w.grounded) {
      const ex = level.items.find((i) => i.t === 'E');
      if (ex && Math.hypot(w.x - ex.x, center() - ex.y) < T.useRadius) { takeExit(); return; }
    }
    const killY = level.rows + (w.anchor ? T.killBelowRoomHooked : T.killBelowRoom);
    if (w.y > killY) respawn('fall');
  }

  /** Tutorial prompts: shown on arrival in their area, hidden once done (emit marks done). */
  function stepPrompts() {
    let cur = null;
    for (const p of level.prompts) {
      if (p.done) continue;
      if (inArea(p)) p.shown = true;
      else if (p.shown && p.doneOn === 'leave') { p.done = true; p.shown = false; continue; } // seen once, then gone
      else if (p.shown && !p.sticky) p.shown = false;
      if (p.shown && !cur) cur = p;
    }
    w.prompt = cur;
  }

  /** M2: caught. One feather, the bark, then (after catchHold) the room reset or the night ends. */
  function caught(by) {
    w.catches += 1;
    w.feathers = Math.max(0, w.feathers - 1);
    w.phase = 'caught';
    w.hold = T.catchHold;
    w.caughtBy = by;
    w.meter = 1;
    release('caught');
    w.vx = 0; w.vy = 0; clearGrappleInput(); w.reticle = null; // (fireBuf too: unused while caught; respawn cleared it anyway)
    w.dodge = null; w.atk = null; w.hitStop = 0; w.invuln = 0;
    emit('caught', { by: by.kind, bark: CAUGHT_BARK });
    emit('feather-lost', { left: w.feathers });
  }

  /** M2: the full room reset. The level is rebuilt from its definition (items, doors, guards,
   *  searchlights); the Lark goes back to the spawn with what she carried in. Finished tutorial
   *  prompts stay finished. */
  function resetRoom() {
    const fresh = parseLevel(levelDef, anchorOpt);
    fresh.prompts.forEach((p, i) => { if (level.prompts[i]?.done) p.done = true; });
    Object.assign(level, fresh);
    w.doorsOpen = false; w.hasSpark = roomStart.hasSpark; w.motes = new Set(roomStart.motes);
    w.meter = 0; w.alert = null; w.meterSrc = null; w.hidden = false; w.lit = false; w.caughtBy = null;
    if (!levelDef.tall) w.checkpoint = null;
    w.crouch = false; w.h = T.standHeight; w.target = null; w.targetAge = 0;
    w.jumpBuf = 0; w.lineCoyote = 0; w.note = null; w.face = 1;
    if (w.snuffed.size) level.lamps = level.lamps.filter((l) => !w.snuffed.has(lampKey(l))); // out stays out
    w.smokes = []; w.stillT = 0; w.cloaked = false; w.refires = w.doubleLine;
    w.phase = 'play';
    respawn('caught');
    emit('room-reset', { feathers: w.feathers });
  }

  /** What the shaft intro may do to the world (shaft-intro.js). */
  const introApi = {
    emit, release, clearGrappleInput,
    get bottomY() { return level.spawn.y; }, // the shaft floor, where she started
    get spawnX() { return level.spawn.x; },
    /** The scene is over: the guards are on their rounds as at the start of the room. */
    resetGuards() {
      level.guards = parseLevel(levelDef, anchorOpt).guards;
      w.meter = 0; w.alert = null; w.meterSrc = null;
      w.checkpoint = { x: level.spawn.x, y: level.spawn.y };
      w.peakY = w.y; w.lineFall = false; w.px = w.x; w.py = w.y;
    },
    /** She has his gear: the warp-pull suit power (game.js saves it). */
    grant() {
      w.abilities.pullGrapple = true;
      emit('pickup', { item: 'gear' });
      emit('pull-earned');
    },
  };

  /** v1 xt(): one fixed step. input = { held, pressed, released?, aimAt? }. */
  function step(dt, input = NO_INPUT) {
    const n = Math.min(SIM_DT_CLAMP, dt);
    w.px = w.x; w.py = w.y; // render interpolation: the start of this step (frozen steps hold still)
    if (w.phase === 'night-over') { w.overT += n; return; }
    if (w.phase === 'caught') {
      w.hold -= n;
      if (w.hold > 0) return;
      if (w.feathers <= 0) { w.phase = 'night-over'; w.overT = 0; emit('night-over'); }
      else resetRoom();
      return;
    }
    if (w.phase === 'through') {
      w.hold -= n;
      if (w.hold <= 0 && !w.roomDone) { w.roomDone = true; emit('room-done'); }
      return;
    }
    if (w.note) { if (input.pressed.use) w.note = null; return; }
    // the shaft intro (shaft-intro.js): a short script; no input, no physics, no stealth meanwhile
    if (introActive(w)) { w.hitStop = 0; w.time += n; stepIntro(w, n, introApi); stepPrompts(); return; }
    // Hit-stop: whole steps that fit in the freeze. A leftover shorter than one step does not
    // add another step (that would push a 70 ms stop past 80 ms). Presses during it are latched.
    if (w.hitStop > 1e-9 && n <= w.hitStop + 1e-12) {
      latchFeel(input);
      w.hitStop -= n;
      return;
    }
    w.hitStop = 0;
    const phys = w.aiming && (!fix || w.reticle) ? n * T.aimTimeScale : n; // manual aim: half speed (fix: only with a target)
    w.time += phys;
    const ev0 = w.events.length;
    stepLark(input, phys, n);
    if (fix) trackFix(n);
    if (w.smokes.length) { for (const s of w.smokes) s.t -= phys; w.smokes = w.smokes.filter((s) => s.t > 0); }
    if (w.cloakTime > 0) { // Shadow Cloak: still, on the ground, off the line, out of the light
      const still = w.grounded && !w.anchor && !w.climb && Math.abs(w.vx) < 0.05 && !w.lit;
      w.stillT = still ? w.stillT + phys : 0;
      const on = w.stillT >= w.cloakTime;
      if (on !== w.cloaked) { w.cloaked = on; emit(on ? 'cloak' : 'uncloak'); }
    }
    if (w.tieLine && w.phase === 'play') {
      const g = tieCheck(w, level);
      if (g) { w.vy = T.tieBounce; w.ties += 1; emit('tie', { x: g.x }); startHitStop('takedown'); }
    }
    if (w.phase === 'play') {
      let landDrop = null;
      for (let i = ev0; i < w.events.length; i++) if (w.events[i].type === 'land') landDrop = Math.max(landDrop ?? 0, w.events[i].drop);
      w.noise = noiseRadius(w, landDrop); // the same value hearing uses, kept for the ring
      const by = stepStealth(w, level, phys, emit, w.noise);
      if (by) caught(by);
    }
    stepPrompts();
  }

  w.step = step;
  w.release = release;
  w.attach = attach;
  w.setGrappleMode = setGrappleMode;
  w.bestRing = bestRing;
  w.center = center;
  w.tileAt = (c, r) => tileAt(level, c, r);
  return w;
}
