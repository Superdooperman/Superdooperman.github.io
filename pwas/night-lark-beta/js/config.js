// Night Lark v2: every size and tunable lives here.
// Physics runs in TILE UNITS. v1 numbers were in v1 pixels (16 px per tile), so they are
// converted with v1px() below. Dividing by 16 is exact in floating point, which keeps the
// port numerically identical to v1 (see test/parity.test.mjs).

/** Logical frame. 480x270 is exactly 1/4 of 1080p, so it integer-scales to 1080p/1440p/4K. */
export const VIEW_W = 480;
export const VIEW_H = 270;
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
export const STRIP_PIVOT = 'bottom-centre';
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
  coyoteTime: 0.08,
  jumpBuffer: 0.1,
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
  guardEyeHeight: v1px(12),
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
