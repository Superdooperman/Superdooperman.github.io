// Night Lark v2: every size and tunable lives here.
// Physics runs in TILE UNITS. v1 numbers were in v1 pixels (16 px per tile), so they are
// converted with v1px() below. Dividing by 16 is exact in floating point, which keeps the
// port numerically identical to v1 (see test/parity.test.mjs).

/** Logical frame. 480x270 is exactly 1/4 of 1080p, so it integer-scales to 1080p/1440p/4K.
 *  BASE_W x BASE_H is the minimum view. swing-feel: the live view (VIEW_W x VIEW_H, live ES
 *  bindings) grows past it to fill the screen at the same whole-number scale instead of
 *  letterboxing (canvas.js fillBox; setViewSize is the only writer). Tests keep 480x270. */
export const BASE_W = 480;
export const BASE_H = 270;
export let VIEW_W = BASE_W;
export let VIEW_H = BASE_H;
export function setViewSize(w, h) {
  VIEW_W = Math.max(BASE_W, Math.round(w));
  VIEW_H = Math.max(BASE_H, Math.round(h));
}
/** Pixels per tile in the v2 logical frame (render only; physics never reads this). */
export const TILE_PX = 16;
/** Character sprite frame size in logical pixels (the Lark is ~48 px tall). */
export const SPRITE_W = 32;
export const SPRITE_H = 48;
/** Per-strip frame size in logical px (BUILD-PLAN: 32x48 by default; the line and roll strips
 *  are wider, the ledge climb taller). Every strip pivots bottom-centre. */
export const STRIP_FRAMES = Object.freeze({
  default: Object.freeze({ w: 32, h: 48 }),
  'lark-fire': Object.freeze({ w: 48, h: 48 }),
  'lark-swing': Object.freeze({ w: 48, h: 48 }),
  'lark-land-roll': Object.freeze({ w: 48, h: 48 }),
  'lark-ledge-climb': Object.freeze({ w: 32, h: 64 }),
});
export const frameSizeFor = (strip) => STRIP_FRAMES[strip] || STRIP_FRAMES.default;
/** v2 template room size in tiles: a 30x16 playfield (480x256 px) under a 14 px HUD strip
 *  (VIEW_H 270 = HUD_H 14 + 16 rows x 16 px). Ported v1 rooms are 40x14. */
export const ROOM_COLS = 30;
export const ROOM_ROWS = 16;
/** Height of the HUD strip across the top of the screen, in logical px (M3). */
export const HUD_H = 14;

/** Fixed-step loop (ported from v1's rAF loop). */
export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.1; // v1: Math.min(0.1, elapsed)
export const SIM_DT_CLAMP = 0.05; // v1: Math.min(0.05, e) inside step

/** v1 tile was 16 v1-pixels. */
export const V1_TILE_PX = 16;
export const v1px = (v) => v / V1_TILE_PX;
/** One v1 pixel in tiles (1/16, exact): v1's "within 1 px" landing, lip, climb and sight rules. */
export const PX1 = v1px(1);

/** Gameplay tuning, in tiles and seconds. Comments give the v1 value in v1 px. */
export const TUNING = Object.freeze({
  // body
  halfWidth: v1px(5), // ue = 5
  standHeight: v1px(14), // G = 14
  crouchHeight: v1px(8), // G = 8 when crouched
  // movement
  gravity: v1px(820),
  maxFall: v1px(460),
  walkSpeed: v1px(100),
  crouchSpeed: v1px(52),
  airAccel: v1px(640),
  airOverspeed: v1px(30), // air cap = walk (or crouch) + 30
  groundDamping: 0.2, // vx *= 0.2 with no input on the ground
  jumpVelocity: v1px(-270),
  coyoteTime: 0.08, // v1 parity (oe = 0.08). v2 uses FEEL.coyoteTime, 100 ms.
  jumpBuffer: 0.1, // 100 ms. v2 reads FEEL.jumpBuffer, the same length.
  edgePad: v1px(1), // world x clamp: halfWidth + 1 px
  // grapple
  lineRange: v1px(176),
  lineRangeSpark: v1px(224),
  lineMin: v1px(28),
  attachSlack: v1px(6), // a ring can be latched up to range + 6
  targetSlack: v1px(0.01),
  reelSpeed: v1px(110),
  pumpAccel: v1px(980),
  pumpMinTangent: 0.08,
  ropeIterations: 4,
  ropeJumpVelocity: v1px(-210),
  ropeJumpKeepAbove: v1px(-40), // if vy > -40 jump at -210, else vy - 30
  ropeJumpExtra: v1px(-30),
  landUnhookSpeed: v1px(60), // landing faster than this while taut drops the line
  // line of sight and guards
  losStep: v1px(4),
  coneRange: v1px(78),
  coneHalfAngle: 0.62,
  // Watchman flashlight lens (art/manifest.json lightOrigin [28, 19] on pivot [16, 47]).
  // 12 px in front of the body, 28 px above the feet. Was v1px(12), which sat at the
  // knees of the 48 px sprite. Vision and the drawn cone share this origin.
  guardFlashTipX: 12 / TILE_PX,
  guardEyeHeight: 28 / TILE_PX,
  hideLampRadius: v1px(54),
  meterFill: 0.85,
  meterSparkMul: 0.7, // v1 applies x0.7 while the spark/charm is held
  meterDecay: 0.6,
  // pickups and use
  pickupRadius: v1px(20),
  useRadius: v1px(28),
  // falling out of the room (v1: y > 270, or > 520 while hooked, with a 224 px tall room)
  killBelowRoom: v1px(46),
  killBelowRoomHooked: v1px(296),
  // collision epsilons (v1: 0.01 and 0.02 px)
  eps: v1px(0.01),
  footEps: v1px(0.02),
  // timers
  throughHold: 0.65,

  // ---- M2: stealth (BRIEF "Stealth rules"); v1 had only cones, the meter and a respawn ----
  graceTime: 0.6, // meter full: the watcher freezes with a "!" this long; break sight to get away
  escapeMeter: 0.5, // the meter drops to this after a clean escape (still warm)
  catchHold: 1.1, // caught: the bark plays this long before the room resets
  nightOverDelay: 1.0, // NIGHT OVER card: Start / A only restarts after this long
  searchTime: 3.0, // after an escape the watcher searches the last-seen spot this long
  searchSpeedMul: 1.4, // a searching guard walks this much faster than his patrol
  searchReach: 4, // ...but no more than this many tiles outside his patrol path
  searchStopShort: 1.0, // and stops this far short of the spot
  searchLookFlip: 0.75, // looking around: turn every 0.75 s
  hearingRadius: v1px(40), // footsteps heard within 2.5 tiles (Soft Soles halves it)
  hearingWallMul: 0.5, // through stone the radius is halved
  hearingMinSpeed: v1px(40), // walking slower than this (or crouched) is silent
  landNoiseDrop: 2, // landing after a 2+ tile drop is a noise...
  landNoiseMul: 1.6, // ...this much louder than a footstep
  listenTime: 0.9, // a guard who hears something turns to it and stands this long
  touchRange: v1px(10), // bumping into a watchman (this close, either side, about level) counts as seen
  litSightRange: v1px(140), // in a lamp pool she is seen from this far...
  litHalfAngle: 1.1, // ...by anyone roughly facing her (wider than the cone)
  searchlightRange: 12,
  searchlightHalf: 0.15,
  searchlightPeriod: 5, // seconds for a full sweep there and back

  // ---- M1: new grapple controls (BRIEF "Grapple controls"); only used with controls: 'v2' ----
  fireBuffer: 0.1, // B tapped up to 100 ms before a point is in range still fires
  // (jumpBuffer above is the 100 ms A buffer)
  lineCoyote: 0.08, // A up to 80 ms after letting go still gets the jump-off boost
  jumpOffBoostX: v1px(40), // A off the line: extra speed in the swing direction
  aimHoldTime: 0.18, // B held this long (not hooked) = manual aim; shorter = tap
  aimTimeScale: 0.5, // the game runs at half speed while aiming
  targetHoldTime: 0.2, // auto-target keeps its point at least this long...
  targetSwitchMargin: v1px(16), // ...and only switches to a point this much better
  targetBehindPenalty: v1px(128), // points behind her facing are a last resort
  targetBelowPenalty: v1px(64), // points below her centre lose to points above
  targetDirBias: v1px(128), // D-pad held: up to this much penalty for points off that direction
  tapPickRadius: 1.5, // tap/click within this many tiles of a point fires at it
  // ---- M1: minimal automatic parkour (no buttons) ----
  rollDrop: 4, // landing after falling 4+ tiles (v1 jump peak is ~2.8) rolls
  rollTime: 0.3,
  rollSpeed: v1px(115),
  climbReach: v1px(12), // ledge top up to 12 v1 px above her feet (she is 14 tall) is climbable
  climbProbe: v1px(4), // how far in front of her body a ledge is looked for
  climbMaxFall: v1px(260), // falling faster than this does not catch a ledge
  climbMinVy: v1px(-120), // rising faster than this is still a jump, not a climb
  climbTime: 0.22,
  dropNudge: v1px(1), // DOWN + A on wood: start this far below the plank top
  // ---- M4: power-ups (powerups.js has which power-up sets which hook) ----
  smokeTime: 3, // Smoke Pellet: the cloud lasts this long...
  smokeRadius: 1.6, // ...and blocks any sight line passing this close to its middle
  cloakInner: 0.6, // Shadow Cloak: cloaked, a cone only sees her in its inner 60% (range and angle)
  tieReachX: 0.7, // Tie-Line: falling onto a guard's head within this much of his middle...
  tieBounce: v1px(-200), // ...ties him up and bounces her off
});

/** Swing feel (branch swing-feel, Oct 28 2026). Every swing tunable in one place. v2 controls
 *  only: the v1 parity port (controls: 'v1') still uses the plain TUNING rope above.
 *  Sources and the Floor 1-4 Perch numbers: ../FEEL-PLAN.md. */
// Tall rooms (swing-feel prototype, js/levels/tall-shaft.js). A level def with fallCost
// 'feather' costs a feather for a drop of featherDrop tiles or more; 'height' (default) costs
// nothing but the climb. Tall rooms also keep the last checkpoint after a catch.
export const TALL = Object.freeze({ featherDrop: 6 });

/** Grappleable architecture (Superdooperman, Oct 28 2026: "all ledges are grappleable... building
 *  pieces with statues or railings to grapple to"). js/anchors.js derives anchors from the
 *  assembled solid map; js/kit/ holds the piece library. Rooms opt in with def.anchors 'arch'
 *  (kit rooms) or 'mixed' (old rings + ledge anchors, ?anchors=arch playtest flag); old
 *  templates stay 'rings'. Distances in tiles. */
export const ARCH = Object.freeze({
  cornerOut: 0.12, // a corner anchor sits this far out past the ledge's side face...
  lipLift: 0.12, // ...and this far above its top, so the hook is in open air on the lip
  edgeSpacing: 4, // extra anchors along a ledge's exposed top, every this many tiles
  edgeMinRun: 6, // ...only on runs at least this wide (and never within 1.5 tiles of a corner)
  minDist: 1.25, // auto-aim ignores points closer than this (the corner she stands beside)
  aimConeHalf: 0.6 * Math.PI / 2, // D-pad held: only points within this of the held direction (54 deg), if any
  kindBias: Object.freeze({ prop: -0.75, corner: 0, edge: 1.5, ring: 0 }), // added to the score (lower wins)
  // auto climb at the end of a grapple onto the ledge she hooked: reeled fully in (or zipping),
  // feet up to lineClimbReach below the top, within lineClimbDx of the anchor sideways
  lineClimbReach: 2.6,
  lineClimbDx: 1.25,
});

/** Player settings that change input, not physics. yankInput: 'button' (separate yank key K/V,
 *  pad R1, touch ZIP; B is unchanged) or 'hold' (hold B on the line to zip, release B to launch).
 *  main.js sets it from ?yank= or localStorage. Default is 'button' because 'hold' defers B's
 *  let-go to the release, which breaks the browser walkthrough (FEEL-PLAN.md, "B-hold clash"). */
export const SETTINGS = { yankInput: 'button', anchors: null, feel: 'fix2', grapple: 'classic', abilities: { pullGrapple: false }, touch: 'auto' }; // feel: 'fix2' (default), 'fix1' (?physics=fix1) or 'legacy'; grapple: what B fires, 'classic' or 'pull' (?grapple=pull); abilities.pullGrapple: the earned warp-pull, off at a fresh start (feel pass 1; ?pull=1 or ?grapple=pull grant it on the dev page); touch: 'on'|'off'|'auto' // anchors: null (room decides) or 'mixed' (?anchors=arch)

export const SWING = Object.freeze({
  // pumping (Worms rope style): holding the way the swing is already going adds more than
  // holding against it takes away, so rocking left/right in time builds height
  pumpWithMul: 1.0, // x TUNING.pumpAccel while the held direction matches the swing
  pumpAgainstMul: 0.55, // x TUNING.pumpAccel while it's against the swing (was 1.0)
  // reel-in keeps angular momentum (L*v constant), so reeling at the bottom of the arc speeds
  // her up, like standing up on a playground swing
  reelConserve: true,
  maxSwingSpeed: v1px(800), // cap on speed along the arc while reeling (50 tiles/s; freefall swings need room)
  // jump off the line (A): keep the swing's speed, plus a kick
  releaseCarry: 1.3, // x her velocity at release (sweep: best of 1.12 / 1.25 / 1.3) (Hayao codex: 1.0-1.4 is the forgiving range)
  releaseUpKick: v1px(-100), // added to an upward release (was ropeJumpExtra -30)
  releaseBoostX: v1px(80), // extra speed in the swing direction (was jumpOffBoostX 40)
  // arrival assist (Dead Cells / Celeste style): for a moment after leaving the line, a ledge
  // top up to this far above her feet is caught and climbed (was climbReach 12 v1 px)
  ledgeReachAfterLine: v1px(28),
  ledgeAssistTime: 0.5,
  // Freefall (Superdooperman, 9:13 PM): falling is a choice, never a penalty. v2 terminal velocity is
  // higher than v1's 460 px/s, and a mid-air hook keeps her speed.
  fallMax: v1px(720), // v2 terminal velocity, 45 tiles/s (v1 maxFall 460 = 28.75)
  attachProject: true, // v2: a mid-air hook turns her velocity along the arc instead of cutting the outward part
  attachKeep: 1.0, // mid-air hook: this share of her speed is turned along the arc (v1: the radial part is lost)
  // Yank / zip (SANABI style). Default input: a separate key (K / V, pad RB, touch ZIP) and B
  // keeps letting go on press; ?yank=hold makes holding B on the line (yankHold) the yank.
  yankSpeed: v1px(600), // speed toward the anchor while zipping, 37.5 tiles/s
  yankHold: 0.14, // ?yank=hold only: s of B held on the line before it counts as a yank, not a let-go tap
  yankGravityMul: 0.2, // gravity while zipping
  yankPassDist: 1.0, // tiles from the anchor: the line lets go and she flies on past it
  yankMaxTime: 0.6, // s, a zip never lasts longer
  yankPerAttach: 1, // zips per hook
  yankCooldown: 0.35, // s between zips
});

/** M4 power-up numbers, all tunable here (BUILD-PLAN: "the 3 feathers stay tunable" too). */
export const POWERUP_TUNING = Object.freeze({
  softSolesHearing: 0.5, longLineMul: 1.4, quickReelMul: 2, smokeUses: 2, cloakTime: 1, doubleLineRefires: 1,
  // synergies
  flyingRefires: 2, ghostCloakTime: 0.5, blackoutSmokeBonus: 1, ziplineReelMul: 3,
});

/** Health is one tunable value (BUILD-PLAN section 6). */
export const HEALTH = Object.freeze({
  startFeathers: 3, // a caught costs one feather and resets the room; 0 = the night is over
  hud: 'feathers', // 'feathers' (icons) or 'gauge' (one bar), the BRIEF's switchable HUD
});

/** Save key: new key, no migration. v2 never touches nightlark.save.v1. */
export const SAVE_KEY = 'nightlark.v2.save';

/** Feel pass 1. Every new movement and combat number lives here. v2 only: the v1 parity
 *  port keeps TUNING.coyoteTime (80 ms) and never dodges, strikes or hit-stops.
 *  coyoteTime and jumpBuffer are the 100 ms forgiveness windows. Hit-stop values are the
 *  requested freeze; sim.js holds for whole steps that fit inside them (see hitStopHeld). */
export const FEEL = Object.freeze({
  coyoteTime: 0.1,
  jumpBuffer: 0.1,
  // dodge: a short dash. i-frames outlast the dash by a little. Not usable on the rope.
  dodgeTime: 0.16,
  dodgeIFrames: 0.2,
  dodgeCooldown: 0.45,
  dodgeSpeed: v1px(340),
  dodgeGravityMul: 0.15, // share of gravity while dashing (the rope's own gravity is untouched)
  dodgeVyKeep: 0.2, // vy multiplied once when the dash starts
  // touch swipe (CSS pixels, milliseconds). A swipe dodges; a tap still fires the line.
  swipeMinPx: 36,
  swipeMaxMs: 260,
  swipeAxis: 1.25, // |dx| must be at least this times |dy|
  // strike: windup and active are committed; recovery is the cancel window
  attackWindup: 0.05,
  attackActive: 0.08,
  attackRecover: 0.14,
  attackReach: 1.15, // tiles in front of her centre
  attackBehind: -0.15, // a guard this close beside her still catches the swing
  attackVert: 1.25, // |feet y - guard floor| within this
  attackLunge: v1px(48), // grounded speed during windup and active
  // hit-stop. Both sit in the 40-80 ms band. The shake is skipped when motion is reduced,
  // and so is the freeze (sim reducedMotion).
  hitStop: 0.06,
  takedownStop: 0.07,
  hitShakeAmp: 1.5, // px, smaller than the catch shake (FX.shakeCaught is 3)
  hitShakeDur: 0.14,
  // a bump that i-frames can ignore. Sight and the stealth touch box do not read these.
  contactRange: v1px(10),
  contactAbove: 2,
  // guard reaction. A state on the existing watchman, not a new enemy.
  staggerTime: 0.32,
  knockbackSpeed: v1px(150),
  knockbackTime: 0.12,
});

/** Feel fix 1 (Superdooperman, Nov 1 2026: "Yes let's fix this mess"). v2 only, and only in worlds made
 *  with feel 'fix1' or 'fix2' (createWorld opts.feel, or SETTINGS.feel; 'fix2', a superset of
 *  this, is the default). The generator's
 *  move probes (gen/moves.js) plan with SETTINGS.feel too, so every generated room is proven
 *  finishable in the feel it is played with (towers differ from the legacy-feel ones). All speeds in tiles/s (1 tile = 16 px). */
export const FEELFIX = Object.freeze({
  // ground: a short ramp instead of the instant set and the 80%-a-frame damping
  groundAccel: 62.5, // t/s^2: 0 -> walk (6.25 t/s) in 0.1 s
  groundDecel: 80, // t/s^2 with no direction held: walk -> 0 in ~0.08 s (a missed key sample costs 1.3 t/s, not 5)
  groundTurn: 140, // t/s^2 when the held direction is against her motion
  groundOverDecel: 30, // t/s^2 skid down to walk speed when she lands faster than it
  // air: over the cap, same-way input stops adding and a drag pulls her back toward the cap
  airOverDrag: 6, // t/s^2
  // bunny hops: a ground jump this soon after landing gets a lower air cap (mashing A)
  hopWindow: 0.12, // s on the ground before a jump counts as deliberate
  hopOverspeed: 0.5, // t/s over walk for a re-hop (a deliberate jump keeps TUNING.airOverspeed)
  // aim slow-mo: a longer hold, and only with a ring in reach (no target = no slow-mo)
  aimHoldTime: 0.3,
  aimNeedsTarget: true,
  // jump off the line: the carry and boost are paid only after a real swing...
  realSwingTaut: 0.2, // s taut on this hook
  realSwingArc: 0.35, // rad of arc swept on this hook (~20 deg)
  // ...released in the timing window: the angle past the low point, in the swing direction
  windowMin: 10 * Math.PI / 180,
  windowMax: 70 * Math.PI / 180,
  missKeep: 0.85, // early (no real swing) or mistimed jump-off: share of vx kept, no boost
  releaseMaxVx: 18, // hard cap on |vx| right after any jump-off
  // swing chain: each well-timed release adds one (max chainMax); a miss takes one;
  // standing on the ground longer than chainGroundGrace clears it. It raises the air cap only.
  chainMax: 4,
  chainCaps: Object.freeze([0, 10, 12.5, 15, 17]), // air cap (t/s) at chain 1..4 (0: walk + overspeed)
  chainGroundGrace: 0.2,
  // a clean hook: the ring came into reach less than this long ago when she caught it, with a chain going
  cleanCatchWindow: 0.12,
  cleanCatchKick: 1.5, // t/s added along her motion
  grabStop: 0.034, // s hit-pause on a mid-air grab (2 steps; skipped with reduced motion)
  // trail behind her, grows with the chain (render only)
  trailPerChain: 4, // points per chain level
});

/** Feel fix 2 (Nov 3 2026, Superdooperman's playtest notes). On top of FEELFIX, only with feel 'fix2'
 *  (the default; ?physics=fix1 keeps the fix-1 feel, ?physics=legacy the old one). */
export const FEELFIX2 = Object.freeze({
  // hold to aim: once the plant starts (AIM_PLANT), Wren holds perfectly still until B is let go or the aim is cancelled
  aimFreeze: true,
  // aim: the reticle is the reachable point nearest the aim direction (held D-pad, else facing,
  // tilted up), inside aimConeHalf if any is; ledges and props win over rings
  aimConeHalf: 40 * Math.PI / 180,
  aimFacingUp: 0.6, // facing aim tilt: (face, -aimFacingUp)
  aimLineDash: 3, // px (render)
  // pumping: the push along the swing is this much stronger than fix 1 (1.6 tried: the planner's
  // predicted landings drifted on 5/40 night seeds; 1.5 keeps all 40 on plan)
  pumpMul: 1.5,
  // snap reel: the normal reel (hold UP) is unchanged; a double-tap of UP on a line adds a short
  // fast burst reel-in. Angular momentum is kept, so a snap at the bottom of the arc slingshots
  // her. snapReel: false removes it (the warp-pull mode may cover this).
  snapReel: true,
  snapReelTap: 0.28, // s between the two UP taps
  snapReelLen: 3, // tiles reeled in by one snap (never below the line's minimum)
  snapReelMul: 4, // x the normal reel speed during the burst (3 tiles in ~0.11 s)
  // mash damping: a hook within mashWindow s of a jump-off that was not a GOOD release catches
  // with only mashKeep of her speed along the arc, and none of a rising jump's upward speed
  mashWindow: 0.45,
  mashKeep: 0.45,
});

/** Feel fix 3b: when the aim plant (FEELFIX2.aimFreeze) is allowed to start.
 *  A B press held for tapFrames or fewer is a tap: she keeps moving, on the ground and in the air.
 *  Past that it is a hold and she plants. In the air that plant is once per airtime (a real
 *  hold stops her; mashing B cannot stack freezes into a hover). The count resets on landing
 *  or a successful hook. Nothing in reach: no air plant at all, she keeps falling. */
export const AIM_PLANT = Object.freeze({
  tapFrames: 8, // 6-frame tap, and mash patterns 5/1, 8/2, 3/3, stay inside this and do not plant
  perAir: 1, // mid-air plants before she lands or hooks
});

/** Searchlights and lamps (Superdooperman, feel-fix-3). Tunable in one place. Warm/amber = home;
 *  cold SW = Company. Every lamp, warm or cold, counts for the 54 px hide rule
 *  (TUNING.hideLampRadius, the one definition of that radius). */
export const LIGHT = Object.freeze({
  // Searchlights: battlements floor 2+ and the lantern room only. Max 1 per band. Never the shaft.
  searchFromFloor: 2,
  searchMaxPerBand: 1,
  searchSizes: Object.freeze(['small', 'big']), // small = searchlight-head 16px, big = searchlight-prop-32
});

/** The watchman's bark when he catches her (the sim's 'caught' event, the game, the render). */
export const CAUGHT_BARK = "IT'S BATGUY!";

/** Mini moon towers: a few per level. Relight = checkpoint + small safe pocket + map reveal.
 *  revealRadius 320 is a PLACEHOLDER. */
export const MINI_TOWER = Object.freeze({
  perLevelMin: 2,
  perLevelMax: 3,
  revealRadius: 320, // px, placeholder
  poolRadius: 80, // px
  useRange: 1.6, // tiles
});

/** Warp-pull grapple (Metroid-style suit power, abilities.pullGrapple: earned, so off at a fresh
 *  start; ?pull=1 grants it on the dev page. Fired by the PULL button: C / L, pad X, touch PULL;
 *  G / pad Y switch what B fires, for one-button play). The hook
 *  point is an invisible anchor; a spring pulls her straight at it. Let go mid-pull and she
 *  keeps the pull's speed (flies on past); hold on and once she is close (or the pull stalls)
 *  the line becomes a normal swing at that length. */
export const PULL = Object.freeze({
  spring: 120, // t/s^2 per tile of stretch toward the anchor (pull toward it)
  maxAccel: 260, // t/s^2 cap on the spring
  damping: 1.5, // 1/s of sideways damping during the pull (keeps it a pull, not an orbit)
  maxSpeed: 28, // t/s cap along the pull
  gravityMul: 0.15, // gravity share while pulling
  swingKeep: 0.85, // held on: this share of her speed turns along the swing (the way she was going)
  swingAt: 2.2, // tiles from the anchor: hold on and the line turns into a normal swing
  maxTime: 0.9, // s: hold on past this and it becomes a swing wherever she is
  minLen: 1.75,
});

/** Ground run cycle (render only). Brook's 'lark-run' strip (Nov 1 2026): 8 frames of 32x48,
 *  16 fps at full run speed (walkSpeed 6.25 t/s = 100 px/s, so 50 px per 0.5 s cycle); the rate
 *  scales with |vx| / walkSpeed. Shown while grounded and moving. Without the strip loaded, the
 *  idle frames step and bob 1 px instead (stopgap, fix1 feel only). */
export const WALK = Object.freeze({ sheet: 'lark-run', frames: 8, fps: 16, bobPx: 1, minSpeed: 0.5 });

/** Dynamic camera zoom (Superdooperman, 6:01 PM): the art stays 1 px per art pixel in the backbuffer;
 *  the visible area widens with speed and chain (Dead Cells style). zoom 1 = the normal view,
 *  0.75 = a third more each way (480x270 -> 640x360). Render only: the sim never reads it. */
export const ZOOM = Object.freeze({
  enabled: true,
  min: 0.75, // widest
  speedFrom: 9, // t/s (smoothed |v|) where zooming out starts
  speedFull: 15, // t/s where it is fully out
  chainFull: 3, // chain level that zooms fully out on its own
  speedRise: 0.12, // s time constant of the smoothed speed going up (a real burst counts quickly)
  speedSmooth: 0.35, // s time constant going down (no pumping on every hop)
  holdOut: 0.6, // s the wide target is held after the trigger drops (hysteresis)
  outTime: 0.7, // s to ease out (wider)
  inTime: 1.5, // s to drift back in after a chain break / slowing down
  guardInTime: 0.6, // s to ease back in when a guard is near or alert
  guardNear: 9, // tiles: a guard closer than this (or any alert / meter) pulls the zoom in
  lookAhead: 36, // logical px max look-ahead in the direction of travel
  lookFull: 12, // t/s where the look-ahead is full
  lookTime: 0.45, // s ease of the look-ahead
  fallFrom: 20, // t/s: off a line, a fall faster than this counts toward the zoom (a jump's landing, ~13, does not)
  wholeScale: true, // feel fix 2: targets moved to whole-number screen scales (no resting at 1.5x)
  // Render method (compared Nov 3): 'direct' (scene drawn into the device canvas with a scale
  // transform) and a plain nearest blit both let a 16 px tile come out 54 or 55 device px at
  // scale 3.43 as the camera steps 1 px, so edges crawl while she runs (shimmer). 'backbuffer'
  // (draw at the logical view size, then sharp bilinear: nearest up to the next whole scale, one
  // smooth step down) keeps every art px the same width, for a 1-device-px soft edge. Chosen.
  render: 'backbuffer', // 'backbuffer' | 'nearest' | 'direct' (?zoomrender= to compare)
});
