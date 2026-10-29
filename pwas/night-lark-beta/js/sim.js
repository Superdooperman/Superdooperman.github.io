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
import { TUNING, SIM_DT_CLAMP, HEALTH } from './config.js';
import { parseLevel, tileAt } from './level.js';
import { bodyBlocked, findLanding, pushOut, woodUnderFeet, findLedge } from './physics.js';
import { solveRope, pumpSwing, reel } from './rope.js';
import { lineOfSight } from './los.js';
import { stepStealth, noiseRadius, tieCheck } from './stealth.js';
import { chooseTarget, reachable, stepReticle, pickAt } from './targeting.js';

const NO_INPUT = Object.freeze({ held: {}, pressed: {}, released: {} });

export function createWorld(levelDef, opts = {}) {
  const T = TUNING;
  const level = parseLevel(levelDef);
  const v2 = (opts.controls ?? 'v2') === 'v2';
  const parkour = opts.parkour ?? true;
  const w = {
    level,
    controls: v2 ? 'v2' : 'v1',
    phase: 'play', // 'play' | 'through' | 'caught' | 'night-over'
    time: 0,
    events: [],
    stats: { pushOuts: 0, rolls: 0, climbs: 0 },
    // Lark
    x: level.spawn.x, y: level.spawn.y, vx: 0, vy: 0, face: 1,
    grounded: true, coyote: T.coyoteTime, jumpBuf: 0, crouch: false, h: T.standHeight,
    // line
    anchor: null, ropeLen: T.lineRange, taut: false, everHooked: false,
    // v2 grapple controls
    target: null, targetAge: 0, fireBuf: 0, lineCoyote: 0, bArmed: false, bTime: 0,
    aiming: false, reticle: null,
    // parkour
    peakY: level.spawn.y, roll: 0, rollDir: 1, climb: null, dropRow: null,
    // inventory and room state
    doorsOpen: false, hasSpark: !!opts.hasSpark, motes: new Set(),
    note: null, hold: 0,
    // stealth (M2)
    meter: 0, alerts: 0, alert: null, meterSrc: null, hidden: false, lit: false,
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
  };

  const roomStart = { hasSpark: !!opts.hasSpark, motes: [] };
  const emit = (type, data) => {
    w.events.push({ type, ...data });
    for (const p of level.prompts) {
      if (p.done) continue;
      if ([].concat(p.doneOn).includes(type) && (p.shown || inArea(p))) { p.done = true; p.shown = false; }
      else if (p.showOn === type) p.shown = true; // M2: a prompt shown by an event (no area)
    }
  };
  const center = () => w.y - w.h * 0.5;
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
  const inArea = (p) => p.c0 !== undefined && w.x >= p.c0 && w.x < p.c1 + 1 && w.y > p.r0 && w.y <= p.r1 + 1;

  function release(why = 'release') {
    if (!w.anchor) return;
    w.anchor = null;
    w.taut = false;
    emit('release', { why });
  }

  function respawn(reason) {
    release('respawn');
    const cp = reason === 'fall' && w.checkpoint ? w.checkpoint : level.spawn;
    w.x = cp.x; w.y = cp.y; w.vx = 0; w.vy = 0; w.grounded = true;
    w.roll = 0; w.climb = null; w.dropRow = null; w.peakY = w.y; w.fireBuf = 0; w.aiming = false; w.bArmed = false;
    emit('respawn', { reason });
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
  function attach(ring, inAir, how = 'auto') {
    const d = Math.hypot(w.x - ring.x, center() - ring.y);
    if (d > lineRange() + T.attachSlack) return false;
    if (!lineOfSight(level, w.x, center(), ring.x, ring.y, w.doorsOpen)) return false;
    w.anchor = ring;
    w.ropeLen = inAir || v2 ? Math.min(lineRange(), Math.max(T.lineMin, d)) : lineRange();
    w.everHooked = true;
    w.taut = inAir;
    w.fireBuf = 0;
    w.roll = 0;
    w.dropRow = null;
    w.target = null; w.targetAge = 0;
    emit('attach', { ring, how });
    return true;
  }

  /** unhookCheck: v1's "landed hard while taut lets go" test ran on every landing check.
   *  The roll, slack line and 'land' event only happen on a real air-to-ground landing. */
  function onLanded(vyBefore, unhookCheck) {
    if (unhookCheck && w.taut && vyBefore > T.landUnhookSpeed) release('land');
    if (w.stepStartGrounded) return;
    if (v2 && w.anchor) w.ropeLen = lineRange(); // landing while attached: the line goes slack
    w.stepStartGrounded = true;
    const drop = w.y - w.peakY;
    if (parkour && drop >= T.rollDrop && !w.anchor) {
      w.roll = T.rollTime;
      w.rollDir = Math.abs(w.vx) > 0.5 ? Math.sign(w.vx) : w.face;
      w.stats.rolls++;
      emit('roll', { drop });
    }
    emit('land', { drop });
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

  /** v2 B button and pointer taps (BRIEF "Grapple controls"). Runs before the physics. */
  function grappleControls(input, realDt) {
    const H = input.held;
    const P = input.pressed;
    const R = input.released || {};
    const range = lineRange() + T.targetSlack;
    // auto-target, always shown before you press (no target while hanging on the line)
    if (!w.anchor) {
      const t = chooseTarget(level, { x: w.x, cy: center(), face: w.face, dir: heldDir(H), range, doorsOpen: w.doorsOpen },
        { target: w.target, age: w.targetAge + realDt });
      w.target = t.target; w.targetAge = t.age;
    } else { w.target = null; w.targetAge = 0; }

    // tap or click directly on a point
    if (input.aimAt) {
      const pick = pickAt(reachable(level, w.x, center(), range, w.doorsOpen), input.aimAt.x, input.aimAt.y);
      if (pick && pick !== w.anchor) {
        if (w.anchor) release('retarget');
        attach(pick, !w.grounded, 'tap-point');
        w.aiming = false; w.bArmed = false;
      } else if (!pick && w.snuffer) {
        const lamp = lampInReach(input.aimAt.x, input.aimAt.y);
        if (lamp) snuff(lamp, 'tap');
      }
    }

    if (P.fire) {
      let refired = false;
      if (w.anchor && !w.grounded && w.refires > 0) {
        // Double Line: fire again from the line, at the best other ring in reach
        const from = w.anchor;
        const t = chooseTarget({ ...level, rings: level.rings.filter((r) => r !== from) },
          { x: w.x, cy: center(), face: w.face, dir: heldDir(H), range, doorsOpen: w.doorsOpen }, { target: null, age: 0 });
        if (t.target) {
          release('refire');
          if (attach(t.target, true, 'refire')) { w.refires -= 1; refired = true; emit('refire', { left: w.refires }); }
        }
      }
      if (refired) { w.bArmed = false; }
      else if (w.anchor) { release('letgo'); w.lineCoyote = T.lineCoyote; w.bArmed = false; emit('letgo'); }
      else { w.bArmed = true; w.bTime = 0; }
    }
    if (w.bArmed && H.fire) {
      w.bTime += realDt;
      if (!w.aiming && w.bTime >= T.aimHoldTime) {
        const cands = reachable(level, w.x, center(), range, w.doorsOpen);
        w.aiming = true;
        w.reticle = w.target || cands[0] || null;
        emit('aim-start');
      }
    }
    if (w.aiming) {
      const cands = reachable(level, w.x, center(), range, w.doorsOpen);
      if (w.reticle && !cands.includes(w.reticle)) w.reticle = null;
      if (!w.reticle && cands.length) w.reticle = w.target || cands[0];
      if (w.reticle) {
        for (const [a, d] of [['left', { x: -1, y: 0 }], ['right', { x: 1, y: 0 }], ['up', { x: 0, y: -1 }], ['down', { x: 0, y: 1 }]])
          if (P[a]) w.reticle = stepReticle(cands, w.reticle, d);
      }
      if (P.jump) { w.aiming = false; w.bArmed = false; w.reticle = null; emit('aim-cancel'); return { ateJump: true }; }
    }
    if (w.bArmed && (R.fire || !H.fire)) {
      if (w.aiming) {
        const r = w.reticle;
        w.aiming = false; w.reticle = null;
        if (r && attach(r, !w.grounded, 'aim')) emit('aimfire');
        else emit('aim-cancel');
      } else {
        w.fireBuf = T.fireBuffer; // tap: fire now, or within 100 ms if a point comes in range
        w.fireArmedAt = w.time;
      }
      w.bArmed = false;
    }
    if (w.fireBuf > 0 && !w.anchor) {
      if (w.target && attach(w.target, !w.grounded, 'tap')) { /* attached */ }
      else {
        w.fireBuf -= realDt;
        if (w.fireBuf <= 1e-9) {
          w.fireBuf = 0;
          const lamp = w.snuffer ? lampInReach() : null; // Lamp Snuffer: B with no ring puts out the nearest lamp
          if (lamp) snuff(lamp, 'b'); else emit('thunk');
        }
      }
    }
    return { ateJump: false };
  }

  function startClimb(ledge) {
    if (w.anchor) release('climb');
    w.climb = { t: 0, x0: w.x, y0: w.y, x1: ledge.x, y1: ledge.y };
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
      w.climb = null; w.x = c.x1; w.y = c.y1; w.grounded = true; w.coyote = T.coyoteTime; w.peakY = w.y;
      emit('climb-done');
    }
  }

  /** v1 At(): one step of the Lark. dt = physics dt (half while aiming), realDt = wall step. */
  function stepLark(input, dt, realDt) {
    const H = input.held;
    const P = input.pressed;
    const left = !!H.left, right = !!H.right, up = !!H.up, down = !!H.down;
    if (w.note) { if (P.use) w.note = null; return; }

    if (left && !right) w.face = -1;
    if (right && !left) w.face = 1;
    w.stepStartGrounded = w.grounded;
    let jumpPressed = !!P.jump;
    if (v2) { const g = grappleControls(input, realDt); if (g.ateJump) jumpPressed = false; }
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
    if (w.anchor) w.ropeLen = reel(w.ropeLen, up, down, lineRange(), dt, w.reelMul);
    w.jumpBuf = jumpPressed ? T.jumpBuffer : Math.max(0, w.jumpBuf - realDt);
    if (v2) w.lineCoyote = Math.max(0, w.lineCoyote - realDt);
    const swingDir = Math.abs(w.vx) > 0.25 ? Math.sign(w.vx) : w.face;
    const offLine = v2 ? (w.anchor && !w.grounded) || (!w.anchor && w.lineCoyote > 0) : !!w.anchor;
    if (offLine && (v2 ? w.jumpBuf > 0 : jumpPressed)) {
      // jump off the line (v1 rope jump); v2 adds a boost in the swing direction
      const vy = w.vy > T.ropeJumpKeepAbove ? T.ropeJumpVelocity : w.vy + T.ropeJumpExtra;
      const coy = !w.anchor;
      release('jump');
      w.vy = vy; w.grounded = false; w.coyote = 0; w.jumpBuf = 0; w.lineCoyote = 0;
      if (v2) w.vx += swingDir * T.jumpOffBoostX;
      w.stepStartGrounded = false;
      w.roll = 0;
      emit('jump', { from: 'line' });
      if (v2) emit('jumpoff', { coyote: coy });
    } else if (v2 && w.jumpBuf > 0 && w.grounded && down && woodUnderFeet(level, w.x, w.y, w.doorsOpen) !== null) {
      // DOWN + A on a wooden ledge: drop through it
      w.dropRow = woodUnderFeet(level, w.x, w.y, w.doorsOpen);
      w.y += T.dropNudge; w.vy = 0; w.grounded = false; w.coyote = 0; w.jumpBuf = 0; w.stepStartGrounded = false;
      if (w.anchor) w.ropeLen = lineRange();
      emit('drop', { row: w.dropRow });
    } else if (w.jumpBuf > 0 && (w.grounded || w.coyote > 0) && (!w.anchor || (v2 && w.grounded))) {
      w.vy = T.jumpVelocity; w.grounded = false; w.coyote = 0; w.jumpBuf = 0; w.roll = 0; w.stepStartGrounded = false;
      emit('jump', { from: 'ground' });
    }

    const wasGrounded = w.grounded;
    if (!w.grounded) w.coyote = Math.max(0, w.coyote - dt);
    w.vy += T.gravity * dt;
    if (w.vy > T.maxFall) w.vy = T.maxFall;

    const speed = w.crouch && w.roll <= 0 ? T.crouchSpeed : T.walkSpeed;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (w.roll > 0 && w.grounded) {
      w.roll -= dt;
      w.vx = w.rollDir * T.rollSpeed;
    } else if (!w.taut || w.grounded) {
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
    if (bodyBlocked(level, w.x, w.y, w.h, w.doorsOpen)) { w.x = prevX; w.vx = 0; if (w.roll > 0) w.roll = 0; }

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
      w.taut = solveRope(w, w.anchor, w.ropeLen);
      if (w.taut && w.anchor) pumpSwing(w, w.anchor, dir, dt);
    }
    // the line never drags her into stone: undo the rope move if it would
    if (bodyBlocked(level, w.x, w.y, w.h, w.doorsOpen)) { w.x = prevX; w.y = preRopeY; w.vx = 0; }
    if (w.y >= preRopeY) tryLand(preRopeY, vyBefore);

    // auto ledge climb: in the air (falling onto it, at the end of a grapple, or jumping into
    // it), a ledge top just in front of her and above her feet. No input needed.
    if (parkour && !w.grounded) {
      const moving = dir !== 0 ? dir : (Math.abs(w.vx) > 0.5 ? Math.sign(w.vx) : 0);
      if (moving && w.vy >= T.climbMinVy && w.vy <= T.climbMaxFall) {
        const ledge = findLedge(level, w.x, w.y, moving, w.doorsOpen, w.dropRow);
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
    if (w.grounded) {
      w.coyote = T.coyoteTime;
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
    w.vx = 0; w.vy = 0; w.aiming = false; w.reticle = null; w.bArmed = false;
    emit('caught', { by: by.kind, bark: "IT'S BATGUY!" });
    emit('feather-lost', { left: w.feathers });
  }

  /** M2: the full room reset. The level is rebuilt from its definition (items, doors, guards,
   *  searchlights); the Lark goes back to the spawn with what she carried in. Finished tutorial
   *  prompts stay finished. */
  function resetRoom() {
    const fresh = parseLevel(levelDef);
    fresh.prompts.forEach((p, i) => { if (level.prompts[i]?.done) p.done = true; });
    Object.assign(level, fresh);
    w.doorsOpen = false; w.hasSpark = roomStart.hasSpark; w.motes = new Set(roomStart.motes);
    w.meter = 0; w.alert = null; w.meterSrc = null; w.hidden = false; w.lit = false; w.caughtBy = null;
    w.checkpoint = null; w.crouch = false; w.h = T.standHeight; w.target = null; w.targetAge = 0;
    w.jumpBuf = 0; w.lineCoyote = 0; w.note = null; w.face = 1;
    if (w.snuffed.size) level.lamps = level.lamps.filter((l) => !w.snuffed.has(lampKey(l))); // out stays out
    w.smokes = []; w.stillT = 0; w.cloaked = false; w.refires = w.doubleLine;
    w.phase = 'play';
    respawn('caught');
    emit('room-reset', { feathers: w.feathers });
  }

  /** v1 xt(): one fixed step. input = { held, pressed, released?, aimAt? }. */
  function step(dt, input = NO_INPUT) {
    const n = Math.min(SIM_DT_CLAMP, dt);
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
    const phys = w.aiming ? n * T.aimTimeScale : n; // manual aim: half speed
    w.time += phys;
    const ev0 = w.events.length;
    stepLark(input, phys, n);
    if (w.smokes.length) { for (const s of w.smokes) s.t -= phys; w.smokes = w.smokes.filter((s) => s.t > 0); }
    if (w.cloakTime > 0) { // Shadow Cloak: still, on the ground, off the line, out of the light
      const still = w.grounded && !w.anchor && !w.climb && Math.abs(w.vx) < 0.05 && !w.lit;
      w.stillT = still ? w.stillT + phys : 0;
      const on = w.stillT >= w.cloakTime;
      if (on !== w.cloaked) { w.cloaked = on; emit(on ? 'cloak' : 'uncloak'); }
    }
    if (w.tieLine && w.phase === 'play') { const g = tieCheck(w, level); if (g) { w.vy = T.tieBounce; w.ties += 1; emit('tie', { x: g.x }); } }
    if (w.phase === 'play') {
      let landDrop = null;
      for (let i = ev0; i < w.events.length; i++) if (w.events[i].type === 'land') landDrop = Math.max(landDrop ?? 0, w.events[i].drop);
      const by = stepStealth(w, level, phys, emit, noiseRadius(w, landDrop));
      if (by) caught(by);
    }
    stepPrompts();
  }

  w.step = step;
  w.release = release;
  w.attach = attach;
  w.bestRing = bestRing;
  w.center = center;
  w.tileAt = (c, r) => tileAt(level, c, r);
  return w;
}
