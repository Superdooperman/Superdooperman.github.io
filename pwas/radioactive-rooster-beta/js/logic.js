import { CLUB_SIGN, CROW, GOBBLER_PLATE, ENDINGS, FEEDSEED, SIGN_LOOK, SIGN_VARIANT, HENNY_THINKS, HERO, ITEM_ON_ITEM, ITEMS, KINDNESS, NIGHT, ROOMS, SPEAKER, TEMPT, TIME_CARDS, VAT_STATES } from "../data/script.js";

export const MAX_TEMPTATION = 4;

export function newGame() {
  return {
    room: "hq",
    inv: [],
    flags: {},
    pose: null,
    verb: "look",
    pending: null,
    mood: "talk",
    crowRound: 0,
    mode: "play",
    choice: null, // { set: "tempt", id } | { set: "crow" }
    temptation: 0, // 0..4, never shown as UI
    heat: 0, // crow-down oil gauge (wrong answers)
    jingle: 0,
    ending: null,
    checkpoint: null,
    night: 0, // 0 dusk .. 1 midnight, ratchets up (nightOf): drives the colour shift and the music's tension
    cards: [], // time cards already shown (TIME_CARDS ids)
  };
}

/* ---------- Push C: night / tension and placeholder beats (2026-10-24) ---------- */

// Where the night stands in `room`, never going back down from `prev`.
export function nightOf(room, prev = 0) {
  return Math.max(prev || 0, NIGHT[room] ?? 0);
}

// PLACEHOLDER colour-shift wash for night t (BRIEF.md: dusk blue -> deep night -> hot-oil red at the Pavilion), as a
// CSS rgba() multiplied over the scene. Darkens monotonically; the last stretch swings the hue to oil red.
const TINT_STOPS = [
  [0, [150, 170, 230, 0.1]],
  [0.45, [70, 85, 170, 0.32]],
  [0.8, [35, 40, 110, 0.5]],
  [1, [150, 45, 25, 0.56]],
];
export function nightTint(t) {
  const u = Math.max(0, Math.min(1, Number(t) || 0));
  let i = 0;
  while (i < TINT_STOPS.length - 2 && u > TINT_STOPS[i + 1][0]) i += 1;
  const [t0, a] = TINT_STOPS[i];
  const [t1, b] = TINT_STOPS[i + 1];
  const k = (u - t0) / (t1 - t0);
  const mix = a.map((v, j) => v + (b[j] - v) * k);
  return `rgba(${Math.round(mix[0])}, ${Math.round(mix[1])}, ${Math.round(mix[2])}, ${mix[3].toFixed(3)})`;
}

// Beats owed after a move from `from` to the state's current room: time cards (once each) and what follows them.
// Mutates s.night and s.cards. Returns [{ kind: "card", id, title, sub } | { kind: "club" }].
export function roomBeats(s, from) {
  if (!Array.isArray(s.cards)) s.cards = [];
  s.night = nightOf(s.room, s.night);
  if (from === s.room) return [];
  const beats = [];
  for (const card of TIME_CARDS) {
    if (card.on === "start" || s.cards.includes(card.id)) continue;
    if (card.on.room !== s.room) continue;
    s.cards.push(card.id);
    beats.push({ kind: "card", id: card.id, title: card.title, sub: card.sub });
    for (const then of card.then || []) beats.push(then === "club" ? clubBeat(s) : { kind: then });
  }
  return beats;
}

// The club cutaway (PLACEHOLDER content) hides the figure behind a smoke veil until VEIL.flag is set. Canon (Arlong +
// Usopp, 2026-10-25, "Hawkeye" pass): she stays Hawkeye Hattie all game and Rooster knows it's her (noir dread, not a
// whodunit). The smoke only clears at the Pavilion, right after the hero choice (crow-down round 2 answered right, so
// every hero path, the Smitten one too): her "Hawkeye Hattie is dead" speech plays, the smoke whisks off her mask
// (a line with veil: "whisk", js/main.js) and she becomes the Cock Gobbler. The club cutaway always plays before that,
// so it stays thick and silent. ONE place to move the reveal: the flag, and the payoff room + crow round.
export const VEIL = { flag: "unmasked", payoff: { room: "pavilion", crowRound: 1 }, played: "pavilion_unveiled" };
export const veilLifted = (s) => !!(s.flags && s.flags[VEIL.flag]);

// The club sign's parts right now: { hawk, thecock, gobbler } -> lit? All lit once CLUB_SIGN.lit is set.
export function signParts(s, variant = SIGN_VARIANT) {
  const lit = !!(s && s.flags && s.flags[CLUB_SIGN.lit]);
  const before = CLUB_SIGN.before[variant] || CLUB_SIGN.before.A;
  return Object.fromEntries(CLUB_SIGN.parts.map((p) => [p, lit || !!before[p]]));
}

// The club cutaway: before the reveal (always, in play) the smoke is thick and the stogie henchman smacks the sign,
// which sputters its dark parts for half a second (js/beats.js).
export function clubBeat(s, veil) {
  const v = veil || (veilLifted(s) ? "open" : "thick");
  const sign = signParts(s);
  return { kind: "club", veil: v, sign, smack: !Object.values(sign).every(Boolean) };
}

function lookClubSign(s, out) {
  out.lines.push(line(s.flags[CLUB_SIGN.lit] ? SIGN_LOOK.lit : SIGN_LOOK[SIGN_VARIANT] || SIGN_LOOK.A));
}

// The Pavilion unmasking (Brook's draft, locked by Usopp 2026-10-25). Stage directions are narration beats, not spoken.
export const UNMASK_LINES = [
  { who: "rooster", text: "\"I still see her, you know. Hawkeye Hattie. Best shot on the Midway, best partner I ever had. She's still in there, Hat. I'd bet the farm on it.\"" },
  { who: "narration", text: "A soft laugh, somewhere behind the smoke." },
  { who: "her", text: "You always did bet on the wrong bird, sugar. You buried that girl the night you tore our ticket in half. Tonight you just threw the last shovel of dirt." },
  { who: "narration", text: "She lifts the mask's wings. The smoke clears, and the sax hits.", veil: "whisk" },
  { who: "her", text: "Hawkeye Hattie is dead, Big Green. What's left doesn't miss, doesn't forgive, and doesn't share the bill." },
  { who: "her", text: "I'm the Cock Gobbler. And I've been hungry for a long, long time.", names: true }, // nameplate flips here (GOBBLER_PLATE)
  // Usopp 2026-10-25: cut to the club sign across the boardwalk; GOBBLER buzzes on letter by letter (neon-lightup),
  // the full name holds on the neon-hum-full loop under the sax, then back to the Pavilion (js/beats.js "sign")
  { who: "narration", text: "Across the boardwalk, the old bar's sign stutters awake one letter at a time. G. O. B. B. L. E. R. THE COCK GOBBLER, every tube lit for the first time.", signCut: true },
];

// Plays once per run (a rewind to the Pavilion checkpoint clears the flags, so it plays again).
function unmask(s, out) {
  const at = VEIL.payoff;
  if (s.room !== at.room || s.crowRound !== at.crowRound || s.flags[VEIL.played]) return;
  s.flags[VEIL.flag] = true;
  s.flags[VEIL.played] = true;
  s.flags[CLUB_SIGN.lit] = true; // the whole name lights for the first time (the signCut line below)
  for (const l of UNMASK_LINES) {
    if (l.who === "rooster") out.lines.push(line(l.text, { speaker: HERO.talk, mood: "talk" }));
    else if (l.who === "her") out.lines.push(line(l.text, { speaker: SPEAKER.gobbler, names: l.names }));
    else out.lines.push(line(l.text, { ...(l.veil ? { veil: l.veil } : {}), ...(l.signCut ? { signCut: true } : {}) }));
  }
}

// The opening beats for a new game (the cold open is main.js's, behind its flag).
export function startBeats(s) {
  if (!Array.isArray(s.cards)) s.cards = [];
  const beats = [];
  for (const card of TIME_CARDS) {
    if (card.on !== "start" || s.cards.includes(card.id)) continue;
    s.cards.push(card.id);
    beats.push({ kind: "card", id: card.id, title: card.title, sub: card.sub });
  }
  return beats;
}

/* ---------- voice line ids (audio/in/VOICE-IDS.md) ---------- */

const SPEAKER_KEY = new Map(Object.entries(SPEAKER).map(([k, v]) => [v, k]));
for (const v of Object.values(HERO)) SPEAKER_KEY.set(v, "rr");

// Who voices a line: the SPEAKER key, or "rr" (Radioactive Rooster) for his own lines and the narration.
export function speakerKey(speaker) {
  return speaker ? SPEAKER_KEY.get(speaker) || "x" : "rr";
}

export function normalizeLine(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

// FNV-1a 32-bit, as 8 hex digits.
export function hash8(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// Stable id per spoken line: "<speaker key>-<hash of the exact text>". Same words + same voice = same id (record
// once). Henny's thought bubbles get none: Henny never speaks aloud.
export function voiceId(text, extra = {}) {
  if (extra.thought || !text) return null;
  return `${speakerKey(extra.speaker)}-${hash8(normalizeLine(text))}`;
}

// Ending comic panels (ENDINGS[*].panels) are voiced with the same ids: a plain caption is narration ("rr"), a
// { say: "Henny" } bubble is that character out loud, a { thought } bubble is never voiced.
const SAY_KEY = { Henny: SPEAKER.henny, Hattie: SPEAKER.hattie };
export function panelVoice(panel) {
  if (typeof panel === "string") return { id: voiceId(panel), text: panel, speaker: null };
  if (!panel || panel.thought) return { id: null, text: panel && panel.text, speaker: null };
  const speaker = panel.say ? SAY_KEY[panel.say] || null : null;
  // Arlong 2026-10-24: Henny's only real words are the panel marked `real: true` ("...About time."). Her other
  // out-loud bubbles stay on the page as text but are heard as henny-cluck gibberish, never as a voice line.
  if (speaker === SPEAKER.henny && !panel.real) return { id: null, text: panel.text, speaker, say: panel.say, cluck: true };
  return { id: voiceId(panel.text, { speaker }), text: panel.text, speaker, say: panel.say || null };
}

// Optional recorder for tools that list every line (the voice script). null in the game.
let lineHook = null;
export function onLine(fn) {
  lineHook = fn;
}

// An item as it is right now: `alt` entries ({ when: flag, name?, icon?, look?, ... }) override it once their flag is set
// (the geiger counter with the bulb snapped on).
export function itemOf(state, id) {
  const base = ITEMS[id];
  if (!base) return base;
  const alt = (base.alt || []).find((a) => state && state.flags && state.flags[a.when]);
  return alt ? { ...base, ...alt } : base;
}

export function line(text, extra = {}) {
  const made = {
    id: voiceId(text, extra), // voice file audio/in/voice/<id>.ogg|mp3 (js/audio.js playVoice)
    text,
    speaker: extra.speaker || null,
    mood: extra.mood || null,
    sound: extra.sound || null,
    big: !!extra.big,
    thought: !!extra.thought,
    rap: !!extra.rap,
    cue: extra.cue || null, // stage cue for cast frames (js/main.js castFrame); never shown
    ...(extra.anim ? { anim: extra.anim } : {}), // one-shot tweens (js/main.js playAnim); never shown
    ...(extra.cutscene ? { cutscene: extra.cutscene } : {}), // a scripted beat played before the line (js/main.js)
    ...(extra.flashback ? { flashback: true } : {}), // shown in old-photo sepia (js/main.js, css .world.flashback)
    ...(extra.flashStep !== undefined ? { flashStep: extra.flashStep } : {}), // the past beat 1..5 (js/main.js flashbackLayer)
    ...(extra.closeup ? { closeup: extra.closeup } : {}), // an item art id held up in his gloves while the line shows
    ...(extra.signCut ? { signCut: true } : {}), // plays the club-sign cut (js/beats.js "sign") before the line shows
    ...(extra.names ? { names: true } : {}), // her own-name line: from here on the nameplate is "The Cock Gobbler" (GOBBLER_PLATE)
    ...(extra.veil ? { veil: extra.veil } : {}), // "whisk": the Pavilion smoke veil clears off her mask as the line shows (js/main.js)
  };
  if (lineHook) lineHook(made);
  return made;
}

const henny = (text) => line(text, HENNY_THINKS);
const rocco = (text) => line(text, { speaker: SPEAKER.rocco, rap: true }); // TODO(audio): Rocco's boom-bap loop under rap lines (sound on hold)
const hattie = (text, extra = {}) => line(text, { speaker: SPEAKER.hattie, ...extra });

export function signLevel(state) {
  return Math.min(3, Math.max(0, state.temptation || 0));
}

export function signLetters(state) {
  const lit = FEEDSEED.lit[signLevel(state)];
  return [...FEEDSEED.text].map((ch, i) => ({ ch, on: ch !== " " && (!lit || lit.includes(i)) }));
}

export function vatState(state) {
  return VAT_STATES[signLevel(state)];
}

export function maxHeat(state) {
  return 3 + (state.flags.clock_fixed ? 1 : 0);
}

export function kindness(state) {
  return KINDNESS.filter((k) => state.flags[k]).length;
}

export function visible(state, spot) {
  if (spot.when && !state.flags[spot.when]) return false;
  if (spot.whenNot && state.flags[spot.whenNot]) return false;
  return true;
}

// A hotspot can change with the story: `alt: [{ when: flag, name?, look?, take?, ... }]` overrides its fields (name
// included, so the sentence-line preview follows) once `when` is set; later entries win.
export function resolveSpot(state, spot) {
  if (!spot || !spot.alt) return spot;
  let out = spot;
  for (const v of spot.alt) if (state.flags[v.when]) out = { ...out, ...v, when: spot.when, alt: undefined };
  return out;
}

export function spotsFor(state) {
  const room = ROOMS[state.room];
  if (!room) return [];
  return room.spots.filter((spot) => visible(state, spot)).map((spot) => resolveSpot(state, spot));
}

export function preview(state, spot) {
  const name = spot.name;
  if (state.pending) return `Use the ${itemOf(state, state.pending).name} on the ${name}.`;
  if (state.verb === "look") return `Look at the ${name}.`;
  if (state.verb === "talk") return `Talk to the ${name}.`;
  if (state.verb === "take") return `Take the ${name}.`;
  if (state.verb === "push") return `Push the ${name}.`;
  return `Use the ${name}.`;
}

function has(s, id) {
  return s.inv.includes(id);
}
function give(s, id) {
  if (!s.inv.includes(id)) s.inv.push(id);
}
function drop(s, id) {
  s.inv = s.inv.filter((x) => x !== id);
}
function tempt(s, delta) {
  s.temptation = Math.max(0, Math.min(MAX_TEMPTATION, (s.temptation || 0) + delta));
}

// The choice currently on screen, with locked ("???") options marked.
export function choicesFor(state) {
  if (state.mode !== "choice" || !state.choice) return [];
  if (state.choice.set === "tempt") {
    const t = TEMPT[state.choice.id];
    return t ? t.options.map((o) => ({ ...o, locked: false })) : [];
  }
  const round = CROW[state.crowRound];
  if (!round) return [];
  return round.options
    .filter((o) => !o.bite || state.temptation >= 3)
    .filter((o) => !o.vip || has(state, "vip"))
    .map((o) => ({ ...o, locked: !!o.need && !state.flags[o.need] && !has(state, o.need) }));
}

// Engine-level last resorts. Every hotspot verb, item verb, item-on-hotspot and item-on-item combo has bespoke
// text in data/script.js; test/lines.test.js fails if any of these generic lines can ever be shown.
const FALLBACK = {
  look: "Nothing useful. Plenty to judge.",
  talk: "No answer. Rude, but consistent.",
  take: "It stays put.",
  use: "That isn't the move.",
  push: "It declines to be pushed.",
};
export const GENERIC_LINES = [
  ...Object.values(FALLBACK),
  "Those two things refuse to collaborate.",
  "It has nothing to say, which is a mercy.",
  "It's already in a pocket. That's as taken as it gets.",
  "Nothing there.",
  "That isn't in a pocket.",
  "Not yet.",
  "Already done.",
];
export const GENERIC_PATTERNS = [/ doesn't work on the /];

// "{item}" / "{other}" in a bespoke default line names the item being used.
function fill(fx, vars) {
  if (typeof fx === "string") return fx.replace(/\{(item|other)\}/g, (_, k) => vars[k] || k);
  if (Array.isArray(fx)) return fx.map((x) => fill(x, vars));
  return fx;
}

function commit(s, fx, out) {
  for (const flag of fx.set || []) s.flags[flag] = true;
  for (const flag of fx.clear || []) delete s.flags[flag];
  for (const id of fx.give || []) give(s, id);
  for (const id of fx.consume || []) drop(s, id);
  if (Object.prototype.hasOwnProperty.call(fx, "pose")) s.pose = fx.pose;
  if (fx.mood) s.mood = fx.mood;
  if (fx.room) {
    s.room = fx.room;
    if (!Object.prototype.hasOwnProperty.call(fx, "pose")) s.pose = null;
  }
  if (fx.say) {
    out.lines.push(line(fx.say, { speaker: fx.speaker || null, mood: fx.mood || null, sound: fx.sound || null, big: fx.big, cutscene: fx.cutscene, anim: fx.anim, cue: fx.cue, thought: fx.thought }));
  }
}

function apply(s, fx, out, ctx = {}) {
  if (fx == null) return;
  if (Array.isArray(fx)) {
    // several short beats for one action (keeps each caption box small)
    for (const beat of fx) apply(s, beat, out, ctx);
    return;
  }
  if (typeof fx === "string") {
    out.lines.push(line(fx));
    return;
  }
  if (fx.needFlag && !s.flags[fx.needFlag]) {
    out.lines.push(line(fx.blocked || "Not yet."));
    return;
  }
  if (fx.unlessFlag && s.flags[fx.unlessFlag]) {
    out.lines.push(line(fx.already || "Already done."));
    return;
  }
  if (fx.special) {
    specials[fx.special](s, out, { ...ctx, fx });
    return;
  }
  commit(s, fx, out);
}

function snapshot(s) {
  const snap = structuredClone(s);
  snap.checkpoint = null;
  return snap;
}

function startChoice(s, choice) {
  s.mode = "choice";
  s.choice = choice;
}

/* ---------- Rooftop coop ---------- */
function readNote(s, out) {
  if (!s.flags.read_note) {
    s.flags.read_note = true;
    s.mood = "embarrassed";
    out.lines.push(line("A note in the bucket, in lipstick: \"MIDNIGHT. FAIR. BRING NOTHING. —A friend.\""));
    out.lines.push(line("Under it, tonight's Cluck County Clarion: YOLK OF MIDNIGHT STOLEN FROM HENHOUSE. FAIR'S FRY-OFF STILL ON FOR MIDNIGHT. Legend says whoever eats the Yolk gets the Crow: a voice the whole county obeys."));
    out.lines.push(line("A friend needs help. He's sure of it. He tries his crow, just to warm up. *pah.* It's been a wheeze since that night at the fair.", { sound: "wheeze", mood: "embarrassed" }));
    return;
  }
  out.lines.push(line("\"MIDNIGHT. FAIR. BRING NOTHING. —A friend.\" The lipstick is a very particular red. He decides not to have an opinion about that yet."));
}

function lookBoard(s, out) {
  out.lines.push(line("The conspiracy board. Red string, push pins, and in the middle, in his best capitals: WHO TOOK THE YOLK?"));
  out.lines.push(line("Around it, his finest work. CORN DOGS: WHY A STICK? WHO BENEFITS? WKUK plays the same song at 3:33 every night. CODE?? The ferris wheel moved two inches this year. TOWARD WHAT."));
  out.lines.push(line("HENNY: has never once blinked in front of him. And a clipping, circled: LOCAL MAN BRAHM A. ORPINGTON BEHIND ON FEED BILL. Labeled, in a hurry: DEAD END. DO NOT PURSUE."));
  const bits = [];
  if (s.flags.got_stub) bits.push("Pinned: a torn ticket stub. \"R— & H—\". He pins it face down.");
  if (s.flags.reveal) bits.push("The joined ticket goes in the middle. The string from the red neon hawk runs straight to HATTIE.");
  if (s.flags.saw_rig) bits.push("A new string: SLICK CORNY → FRYER WIRING → 12:00. It doesn't touch Hattie at all.");
  if (!bits.length) bits.push("Every single string still runs to a photo of the goat.");
  out.lines.push(line(bits.join(" ")));
}

function pinBoard(s, out) {
  const name = ITEMS[s.pending_used] ? itemOf(s, s.pending_used).name : "clue";
  out.lines.push(line(`He pins the ${name} to the board and runs red string to the nearest suspect. The goat. "The goat did everything." He takes it back down.`));
}

function coopPhoto(s, out) {
  if (has(s, "photo")) {
    out.lines.push(line("He already has a signed photo in his pocket. He signs another, out of habit, and leaves it on the cot for whoever might need cheering up."));
    return;
  }
  give(s, "photo");
  s.flags.got_photo = true;
  out.lines.push(line("Inside the coop, a stack of signed photos. He signs a fresh one, \"Stay safe!\", with a flourish. Somebody tonight is going to need this. He's sure of it."));
}

function lookHawkFar(s, out) {
  out.lines.push(line("Across town, a red neon hawk over the old bar that's been there forever. The hawk is new. He knows that hawk. He looks away first."));
}

/* ---------- Fence / Henny (Henny NEVER speaks: thought bubbles only) ---------- */
// Seated on the rail is the one state the dismount line belongs to: the rail's squat pose, in the yard. Only
// squat_rail sets it; every way into the yard clears it. (Arlong, beta v11: the dismount played while he looked
// unseated. The cause was the invisible rail-sit frame, not this gate; it stays explicit so it can't drift.)
export function seatedOnRail(s) {
  return s.room === "fence" && s.pose === "squat";
}

function blowCover(s, out) {
  const seated = seatedOnRail(s);
  s.pose = null;
  s.mood = "embarrassed";
  s.flags.blew_cover = true;
  out.lines.push(line(
    seated
      ? "He can't help it. \"Evening, ladies! Radioactive Rooster, here to—\" Henny doesn't say a word. She just points one wing at the gravel. He gets off the rail."
      : "He can't help it. \"Evening, ladies! Radioactive Rooster, here to—\" Henny doesn't say a word. She just looks at the costume until he stops.",
    { mood: "embarrassed", sound: "wheeze" },
  ));
  out.lines.push(henny("A real rooster doesn't explain himself."));
}

// Push gags (Arlong 2026-10-18): `anim` on a line plays a one-shot tween on that cast member / the hero (main.js).
function pushPeck(s, out) {
  out.lines.push(line("He gives Peck a friendly nudge. Peck wobbles like a weather vane in a gust. The brass horn pops off his ear, and he fumbles it twice before it's home.", { anim: { peck: "wobble" } }));
  out.lines.push(line("\"EH? PUSHY? No, son, it's not gonna be PUSHY tonight. Clear skies by Tuesday!\"", { speaker: SPEAKER.peck }));
}

function pushHenny(s, out) {
  out.lines.push(line("He reaches out and gives Henny the gentlest little push. Every feather she owns stands up at once. She doubles in size, hops, and pecks him square on the glove.", { anim: { henny: "puff", hero: "recoil" }, sound: "wheeze" }));
  out.lines.push(henny("Touch the hen, lose the hand."));
}

function squatRail(s, out) {
  s.pose = "squat";
  s.mood = "talk";
  out.lines.push(line("He drops onto the rail. Gut forward. Cheeks puffed. Costume wings in. For one second he's a plump, ordinary, extremely suspicious rooster, if you squint, and Henny squints."));
}

// Ned's service bell: every ring is counted; Ned's patience runs out at six and the bell goes in his pocket.
function ringBell(s, out) {
  const n = (s.flags.bell_rings || 0) + 1;
  s.flags.bell_rings = n;
  const ned = (text, extra = {}) => out.lines.push(line(text, { speaker: SPEAKER.clerk, ...extra }));
  const ding = (text) => out.lines.push(line(text, { sound: "ding", cue: "ding" }));
  if (n === 1) {
    ding("*DING.*");
    ned("\"Rooster. I'm right here. I've been right here. I'm always right here.\"");
  } else if (n === 2) {
    ding("*DING.*");
    ned("\"The bell's for when I'm in the back. There is no back. I'm the back.\"");
  } else if (n === 3) {
    ding("*DING.*");
    ned("\"That bell is a fixture, Rooster. Fixtures depreciate. Every ding comes straight off its resale value.\"");
  } else if (n === 4) {
    ding("*DING.*");
    ned("\"I'm writing it down. 'Bell, wear and tear, one mascot.' You're a line item now. Congratulations.\"");
  } else if (n === 5) {
    ding("*DING.*");
    out.lines.push(line("Ned closes the ledger very, very slowly. He doesn't say anything. That's worse."));
  } else {
    ding("*DING.*");
    out.lines.push(line("Ned comes round the end of the counter with a screwdriver he keeps for exactly this. Four turns. Not one wasted.", { cue: "ned_bell" }));
    ned("\"There. No more bell for you. I hope you're happy.\"", { cue: "ned_pocket" });
    out.lines.push(line("He is, a little. Ned pockets the bell and goes back to pretending he isn't watching.", { cue: "ned_back" }));
    s.flags.bell_gone = true;
  }
}

function coopDoor(s, out) {
  if (s.flags.henny_fooled) {
    s.room = "henhouse";
    s.pose = null;
    out.lines.push(line("The henhouse again. Lipstick and straw."));
    return;
  }
  if (s.pose === "squat") {
    s.flags.henny_fooled = true;
    s.flags.learned_henny = true;
    s.pose = null;
    s.room = "henhouse";
    out.lines.push(line("Henny jerks her beak at the door. As he waddles past in the squat, she gives him one long look. It says the whole lesson without a word, and he reads every bit of it."));
    out.lines.push(henny("Only fix what you can fix. Showing up is standard issue."));
    out.lines.push(line("He'll remember that look."));
    return;
  }
  out.lines.push(line("Henny fills the doorway and doesn't move. Her eyes go to the rail, where the yard roosters sit round, quiet and employed, then back to him."));
  out.lines.push(henny("Get round or get lost."));
}

function talkHenny(s, out) {
  if (!s.flags.henny_squint) {
    s.flags.henny_squint = true;
    out.lines.push(line("She doesn't answer. She looks at the wattle, then the belt. Then she squints at him, then down the road where some quiet guy in a cardigan walked past an hour ago, then back at him."));
    out.lines.push(henny("...Nah."));
    out.lines.push(henny("Yard birds don't wear belts."));
    return;
  }
  out.lines.push(line("Henny looks him up and down like a form she's filling out."));
  out.lines.push(henny("Name. Business. Comb size."));
}

function photoHenny(s, out) {
  if (s.flags.kind_henny) {
    out.lines.push(line("She already has one. It's tucked under her wing like a badge."));
    return;
  }
  s.flags.kind_henny = true; // he keeps his stack of signed photos (Arlong 2026-10-19): a fresh one, signed on the spot
  out.lines.push(line("He peels a fresh photo off the stack, signs it \"To Henny, the real guard,\" and holds it out. She takes it without a word. Then she sniffs it. Then she sniffs him. Long pause."));
  out.lines.push(henny("Something smells familiar."));
  out.lines.push(henny("...Coincidence. Lots of birds buy economy deodorant."));
  out.lines.push(line("She tucks the photo under her wing. She's keeping it, by the look of it."));
}

/* ---------- Henhouse / barn / store ---------- */
function lookBox(s, out) {
  out.lines.push(line("Midnight's nest. Still warm. The Yolk was here an hour ago."));
  if (has(s, "geiger")) {
    out.lines.push(line("The counter clicks like popcorn. The Yolk sat here. So did somebody in lipstick.", { sound: "geiger" }));
  }
}

function lookRibbon(s, out) {
  if (has(s, "ribbon") || s.flags.got_ribbon) {
    out.lines.push(line("The nail is bare. The ribbon's in a pocket, where a judge can find it."));
    return;
  }
  out.lines.push(line("GUEST JUDGE, Best Wattle, nailed where a short hero can't reach. The ladder is a rumor. The goat is a possibility."));
}

function talkGoat(s, out) {
  if (s.flags.got_ribbon && !s.flags.kind_goat) {
    s.flags.kind_goat = true;
    out.lines.push(line("\"Thanks, Mortgage. Couldn't have done it without you.\" He means it."));
    out.lines.push(line("meeeeeh.", { speaker: SPEAKER.goat }));
    out.lines.push(line("The goat knows something. The goat says nothing."));
    return;
  }
  out.lines.push(line("Mortgage sniffs him for a long time.", {}));
  out.lines.push(line("meeeeeeeh.", { speaker: SPEAKER.goat }));
}

function talkPeck(s, out) {
  if (!s.flags.peck_talked) {
    s.flags.peck_talked = true;
    out.lines.push(line("\"Fog by midnight. Hot front coming off the fairgrounds. Ribbon's the goat's problem.\"", { speaker: SPEAKER.peck }));
    return;
  }
  // Oct 21 items 23/24: Hattie is Peck's granddaughter. His memory wanders and he shouts old Rooster & Hattie
  // memories as weather reports, fondly. He never puts it together that the bird in front of him is the fella.
  const n = s.flags.peck_memory || 0;
  s.flags.peck_memory = n + 1;
  const MEM = PECK_MEMORIES[n % PECK_MEMORIES.length];
  for (const [text, who] of MEM) out.lines.push(line(text, who ? { speaker: SPEAKER.peck } : {}));
}

const PECK_MEMORIES = [
  [["\"FORECAST FOR THE MIDWAY! A high-pressure system in a hawk mask, and a big green front blowing in off the rooftops. Light winds at the ring-toss. Lovely conditions.\" He smiles at the hay. \"That was my Hattie-girl and her rooster fella.\"", true]],
  [["\"Hattie-girl used to visit Sundays. Sunny, every Sunday. Then a long dry spell.\" He taps the brass horn like it's a barometer. \"Years of drought now. Can't figure what dried it up.\"", true],
    ["He doesn't tell Peck why. He's never told anybody why.", false]],
  [["\"STORM WARNING OVER THE PAVILION! Big green bird gliding in low, red streaks across the sky!\" Quieter: \"Folks called it an accident. I called it weather. Prettiest weather I ever saw.\"", true]],
  [["\"Clear skies tonight for anybody who stops by to see their grandpa.\" Loud enough for the whole county. \"HINT, HINT, HATTIE-GIRL.\"", true]],
  [["\"Barometer says goat.\"", true]],
];

function talkClerk(s, out) {
  if (s.flags.traded) {
    out.lines.push(line("\"Funny smell in here tonight. Not you, Rooster. Probably the feed.\"", { speaker: SPEAKER.clerk }));
    return;
  }
  out.lines.push(line("\"Rooster! Funny smell in here tonight. Probably the feed.\" He lowers his voice. \"A lady bought a lot of oil today. If you find something with her name on it, I'd trade you for it.\"", { speaker: SPEAKER.clerk }));
}

/* ---------- WKUK (temptation 1) ---------- */
function talkSlot(s, out) {
  s.flags.heard_dj = true;
  out.lines.push(line("Through the glass, DeeJay taps his headphones. \"I'm detecting a funny smell at the mail slot, folks. Not you, Rooster. Probably the equipment. Listen, I need a beat for the station ID. Your crow sounds like a polite cough.\"", { speaker: SPEAKER.deejay }));
}

function talkDeejay(s, out) {
  if (!s.flags.deejay_won) {
    talkSlot(s, out);
    return;
  }
  if (!s.flags.kind_deejay) {
    s.flags.kind_deejay = true;
    out.lines.push(line("\"Mind if I finish a story on air? Years back, an 'accident' at the Pavilion. Kid in a cage, a bird in red streamers, and a partner nobody saw again.\" He lets DeeJay finish. Every word.", { speaker: SPEAKER.deejay }));
    out.lines.push(line("Then, gently, into the slot: \"It wasn't an accident. Somebody made a bad call, and somebody else stopped it. Everybody went home. That's the part that matters.\" He doesn't say her name."));
    out.lines.push(line("DeeJay, off-air: \"You never did tell anybody what happened that night.\"", { speaker: SPEAKER.deejay }));
    out.lines.push(line("\"Just did.\"", { speaker: HERO.talk })); // Oct 23 item 32: his line, his portrait
    return;
  }
  out.lines.push(line("\"WKUK. Cluck County's only station that knows the truth. Go get her, feathers.\"", { speaker: SPEAKER.deejay }));
}

function geigerSlot(s, out) {
  if (s.flags.deejay_won) {
    out.lines.push(line("DeeJay waves through the glass. You're already a legend in the mail-slot community.", { speaker: SPEAKER.deejay }));
    return;
  }
  if (!s.flags.geiger_rigged) {
    out.lines.push(line("It clicks. You can't cue a click. A beat would do it. The spare bulb might teach the counter some timing.", { speaker: SPEAKER.deejay, sound: "geiger" }));
    return;
  }
  s.flags.deejay_won = true;
  give(s, "speaker");
  give(s, "map");
  out.lines.push(line("He holds the rigged counter to the slot. Click. Click. Click. DeeJay finds the beat, and the station ID goes out on a geiger counter.", { speaker: SPEAKER.deejay, sound: "click" }));
  out.lines.push(line("DeeJay tests the parking-lot horn before he hands it over. \"TESTING, WKUK!\" The glass hums, and a coffee mug shivers itself right off the shelf behind him. \"...She's got some kick.\"", { speaker: SPEAKER.deejay, sound: "wheeze" })); // Oct 21 item 22: loud shakes things loose
  out.lines.push(line("The parking-lot horn comes off its nail and through the slot, with a fair map. DeeJay's circled two things."));
  out.lines.push(line("Then the phone lights up. DeeJay: \"Caller, you're on WKUK.\" A voice like warm syrup on a cold knife.", { speaker: SPEAKER.deejay }));
  out.lines.push(hattie("\"Still signing pictures for folks who didn't ask, sugar? Skip the farm-fair sleuthing. Meet me at the club. I'll tell you everything.\""));
  out.lines.push(line("Hattie. Of course it's Hattie.", { mood: "smitten" }));
  startChoice(s, { set: "tempt", id: "phone" });
}

function toGate(s, out) {
  s.room = "gate";
  s.pose = null;
  if (!s.flags.got_vip) {
    s.flags.got_vip = true;
    give(s, "vip");
    out.lines.push(line("Out to the fair gate. The guard holds up a gold card between two fingers without looking at him."));
    out.lines.push(line("\"Lady left this for somebody called Big Green. That you?\"", { speaker: SPEAKER.guard }));
    out.lines.push(line("A gold card with a red lipstick kiss on the front. ADMIT ONE, NO QUESTIONS. On the back, in lipstick: \"Wear something nice.\" He pockets it. He doesn't use it. Yet."));
    return;
  }
  out.lines.push(line("Out to the fair gate. The bulbs are already gossiping."));
}

/* ---------- Gate (temptation 2) ---------- */
function talkGuard(s, out) {
  out.lines.push(line("\"Huh. Smells like B.O. in here. ...Probably the goats. Whole ticket, pal.\"", { speaker: SPEAKER.guard }));
}

function cutout(s, out) {
  if (has(s, "pass") || s.flags.got_pass) {
    out.lines.push(line("The cutout's already stamped. The corner's in a pocket."));
    return;
  }
  if (!s.flags.guard_distracted) {
    out.lines.push(line("The guard is watching. A man in a rooster suit hiding behind cardboard is a very short story."));
    return;
  }
  s.pose = "squat";
  s.flags.got_pass = true;
  give(s, "pass");
  out.lines.push(line("He drops into Henny's squat behind the cutout. Gut out. Cheeks full. Doesn't explain himself. The guard stamps the cardboard without looking up. Rooster peels the stamped corner free."));
}

function offerVip(s, out) {
  if (s.flags.fair_in) {
    out.lines.push(line("He's already in. The card stays in his pocket, a little warm."));
    return;
  }
  out.lines.push(line("The gold card. Flash it and the guard waves you through like royalty, and takes the blame tomorrow when Corny counts the gate."));
  startChoice(s, { set: "tempt", id: "vip" });
}

function turnstile(s, out) {
  if (s.flags.fair_in) {
    s.room = "midway";
    s.pose = null;
    out.lines.push(line("Onto the midway. The bulbs are loud and the night is louder."));
    return;
  }
  if (has(s, "pass")) {
    drop(s, "pass");
    s.flags.fair_in = true;
    s.room = "midway";
    s.pose = null;
    out.lines.push(line("The stamp is a conversation. The turnstile agrees. He's in, the honest way. Mostly honest. Cardboard was involved."));
    return;
  }
  // The gold-card temptation fires once at the turnstile (Usopp playtest, Oct 24): after "the honest way", walking up
  // to the turnstile again gets the guard's ticket line, not the choice. Using the card on purpose still offers it.
  if (has(s, "vip") && !s.flags.vip_declined) {
    offerVip(s, out);
    return;
  }
  out.lines.push(line("The guard wants a whole ticket. Half a stub is a philosophy, not a pass.", { speaker: SPEAKER.guard }));
}

/* ---------- Midway (temptation 3, Jingle Kids, Corny, ticket reveal) ---------- */
const JINGLE = [
  "\"Rad-Safe Rooster—\" Dot clamps a hand over Pip's mouth. All three groan.",
  "\"Rad-Safe Rooster, keeps you clean—\" They catch themselves one word later than last time. The groan is longer.",
  "\"Rad-Safe Rooster, keeps you clean, safest bird you've ever seen!\" Silence. Dot stares into the middle distance. \"We were so close to being free.\"",
];

function talkKids(s, out) {
  const n = s.jingle || 0;
  s.jingle = n + 1;
  out.lines.push(line(JINGLE[Math.min(n, JINGLE.length - 1)], { speaker: SPEAKER.kids }));
  if (n === 0) {
    out.lines.push(line("\"Oh my gosh. It's the guy from the tape.\" Flat. \"Hi. Rings are three for a dollar. Nobody wins.\"", { speaker: SPEAKER.dot }));
    out.lines.push(rocco("Yo, the pegs are rigged, the rings are small / Corny glued a quarter-inch on the back of 'em all / Don't throw high, throw low and slow / Bounce off the bottle, and watch it go."));
    s.flags.heard_rap = true;
    out.lines.push(line("Dot doesn't look at Rocco. \"He does that. And forget the pegs. Only thing that ever rattles this booth is Corny's own yelling.\"", { speaker: SPEAKER.dot })); // Oct 21 item 22: loud shakes the bottles
    return;
  }
  if (n === 1) {
    out.lines.push(line("\"Hey,\" says the smallest one, Pip. \"You look like the bird from that night. In the cage. I don't remember a face. Just red streamers.\"", { speaker: SPEAKER.pip }));
    out.lines.push(rocco("Pip was in the cage, I was in the crowd / Some bird in red streamers glided down loud / Never got his name, never saw his face / But the dude smelled like... hold up. Different case."));
    out.lines.push(line("Over by the clock post, Slick Corny straightens up. \"HEY. What did I say about the jingle?\" He stalks over to the far end of the counter to yell at them properly. His cash box sits alone.", { speaker: SPEAKER.corny }));
    s.flags.box_open = true;
    return;
  }
  if (s.flags.pip_robbed && !s.flags.kind_pip) {
    out.lines.push(line("Pip is counting an empty ticket roll. Very quietly. Dot won't look at Pip.", { speaker: SPEAKER.dot }));
    return;
  }
  out.lines.push(line("\"We get it. You're very safe.\" Dot doesn't look up.", { speaker: SPEAKER.dot }));
  out.lines.push(rocco("Midnight's comin' and the oil's on high / Corny keeps checkin' his watch, I don't know why / Something smell funny, and it isn't you, chief / ...okay it's a little bit you. Good grief."));
}

function lookCashbox(s, out) {
  if (!s.flags.box_open) {
    out.lines.push(line("Corny's cash box, on the end of the counter, where Corny can see it. Corny can always see it."));
    return;
  }
  s.flags.saw_rig = true;
  out.lines.push(line("The lid's up. Under the quarters, a wiring sketch in grease pencil: FRYER → TIMER → 12:00, initialed S.C."));
  out.lines.push(line("And a torn half of a fair ticket, with the same ragged edge as his."));
}

function takeCashbox(s, out) {
  if (s.flags.got_half) {
    out.lines.push(line("Just quarters now. He's not that kind of bird."));
    return;
  }
  if (!s.flags.box_open) {
    out.lines.push(line("Corny's hand lands on the lid without him even turning around. \"Hands where I can count 'em, feathers.\"", { speaker: SPEAKER.corny }));
    return;
  }
  s.flags.got_half = true;
  s.flags.saw_rig = true;
  give(s, "half");
  out.lines.push(line("He lifts the ticket half and nothing else. Under it, the wiring sketch: FRYER → TIMER → 12:00, initialed S.C."));
  out.lines.push(line("Corny is still yelling about the jingle."));
}

function joinTicket(s, out) {
  drop(s, "half");
  drop(s, "stub");
  give(s, "ticket");
  s.flags.reveal = true;
  s.mood = "embarrassed";
  out.lines.push(line("The edges fit. \"ROOSTER & HATTIE: ADMIT TWO,\" dated the stunt night. Her half was pawned to Corny. The lipstick on his half is the same red."));
  // Oct 21 items 15/20: the stunt-night flashback plays here, at the joined ticket (agreed with Arlong Oct 21)
  // Oct 23 item 41: the past beats (flashStep 1..5) play on the aged Pavilion, the crowd gathering line by line, the
  // rigger's silhouette (Mayor Bantam's muscle, unnamed) in it (js/main.js flashbackLayer)
  FLASHBACK.forEach((text, i) => out.lines.push(line(text, { flashback: true, flashStep: i })));
  out.lines.push(line("It's Hattie. It was always Hattie. And somebody else, initials S.C., wired the fryer to blow at midnight. She doesn't know.", { mood: "embarrassed" }));
}

const FLASHBACK = [
  "The ticket's warm in his gloves, and for a second the whole fair goes the color of an old photograph.",
  "Years back. Corny's ring-toss, a trick-shot girl in a hawk mask, and a big green bird who beat her at her own game. She laughed, and offered him a partner's half of everything.",
  "The stunt night. Same Pavilion, same cage, same hot oil. Hattie's hand on the old prize-cage lever. \"Nobody gets hurt, sugar. The crowd gasps, you swoop in, and they love us forever.\"",
  "The lever goes. The cage swings out over the fryer, and there's a kid inside, a little one who climbed in for a prize.",
  "He glides. Red webbing out, the first time anybody ever saw it, and the kid's in his arms an inch above the oil.",
  "Later, behind the tent, he tears their ticket in half and gives her one piece. Gently: she can't be his partner anymore. He never tells anybody why.",
  "The fair comes back in color. He's still holding both halves.",
];

function tossPlain(s, out) {
  if (s.flags.got_basket) {
    out.lines.push(line("The prize shelf is empty. Dot gives him a look that says it has always been empty, spiritually."));
    return;
  }
  if (s.flags.heard_rap) {
    out.lines.push(line("Low and slow, like Rocco said. The ring bounces off the bottle and onto a peg... and slides off the glue. He needs the bottles to shiver. Something loud."));
    return;
  }
  out.lines.push(line("The ring bounces off. The pegs are not impressed by sincerity alone."));
}

function tossSpeaker(s, out) {
  if (s.flags.got_basket) {
    tossPlain(s, out);
    return;
  }
  s.flags.got_basket = true;
  s.flags.honest_toss = true;
  s.flags.pip_trust = true; // won it straight: Pip's tickets never left the counter
  give(s, "basket");
  out.lines.push(line("Low and slow, and he wheezes into the horn. *pah.* The bottles shiver, the glue lets go, and a ring walks itself over three necks.", { sound: "wheeze" }));
  out.lines.push(line("\"...Huh. Nobody wins,\" says Dot. \"Except, apparently.\" She hands over the rubber basket.", { speaker: SPEAKER.dot }));
}

function talkHattieDoor(s, out) {
  if (!s.flags.hattie_door) {
    s.flags.hattie_door = true;
    out.lines.push(hattie("\"Evening, B.O. Relax, sugar. Your secret smells safe with me... for now.\"", { mood: "smitten" }));
    out.lines.push(line("Hattie, half in the doorway's dark. No mask. Slim, glamorous, in a black gown, and the best-looking trouble this fair ever booked. Just the smile.", { mood: "smitten" }));
  }
  if (s.flags.got_basket) {
    out.lines.push(hattie("\"Go on, hero. The Pavilion's that way. Don't be late, and don't be good.\""));
    return;
  }
  out.lines.push(hattie("\"Corny's pegs drop flat if you lean on the counter just right. Rig it, take the prize, let the crowd see a hero. Like old times.\""));
  startChoice(s, { set: "tempt", id: "ringtoss" });
}

function repayPip(s, out) {
  drop(s, "tickets");
  s.flags.kind_pip = true;
  s.flags.pip_trust = true;
  tempt(s, -1);
  out.lines.push(line("He kneels at the counter and puts the roll of tickets in Pip's hand. \"These are yours. I'm sorry.\""));
  out.lines.push(line("Pip looks at the tickets, then at the red streamers under his costume arms, for a long second. \"...Thanks, mister.\"", { speaker: SPEAKER.pip }));
  out.lines.push(rocco("Gave it back, gave it back, that's a stand-up bird / That's the most legit thing I ever heard."));
}

function photoPip(s, out) {
  if (s.flags.kind_pip) {
    out.lines.push(line("Pip already has his thanks. Dot would like no more feelings at this counter."));
    return;
  }
  if (s.flags.pip_robbed) {
    out.lines.push(line("Pip doesn't want a picture. Pip wants the tickets back."));
    return;
  }
  s.flags.kind_pip = true; // a fresh one off the stack; he keeps the rest
  out.lines.push(line("He signs a fresh one \"To Pip. You were brave in there.\" Pip reads it twice. \"...How'd you know I was in there?\" He just tips his costume beak.", { speaker: SPEAKER.pip }));
}

function lookClock(s, out) {
  if (s.flags.clock_fixed) {
    out.lines.push(line("The minute hand sits right now. Every minute counts for something."));
    return;
  }
  s.flags.clock_seen = true;
  out.lines.push(line(s.flags.clock_tip
    ? "Twenty to midnight. The minute hand is taped on, just like Hattie said. It's been drifting. Someone wants midnight to come early."
    : "Twenty to midnight. The minute hand hangs funny, like it's taped on."));
}

function fixClock(s, out) {
  if (s.flags.clock_fixed) {
    out.lines.push(line("It's fixed. He pats it anyway."));
    return;
  }
  if (!s.flags.clock_seen && !s.flags.clock_tip) {
    out.lines.push(line("It's a clock. It goes. Look closer first."));
    return;
  }
  s.flags.clock_fixed = true;
  out.lines.push(line("He shinnies up the post and presses the minute hand back where it belongs. Somewhere, the fryer timer just lost a little ground.", { cutscene: "shimmy" }));
  if (s.flags.clock_tip) out.lines.push(hattie("\"Every minute, sugar. You're welcome.\" From the doorway. Then the door clicks shut."));
}

function talkCorny(s, out) {
  if (s.flags.saw_rig) {
    out.lines.push(line("Corny's smile doesn't move, but his eyes go to the cash box. \"Something you wanna ask me, feathers? No? Then enjoy the show. Big finish at midnight. Real big.\"", { speaker: SPEAKER.corny }));
    return;
  }
  out.lines.push(line("\"Step right up, step right up! Three rings a dollar, and every one's a winner, spiritually. You here for the fry-off? Best seats in the Pavilion. Wouldn't miss the finish for the world.\"", { speaker: SPEAKER.corny, cue: "corny_pitch" }));
}

function rope(s, out) {
  if (s.flags.pavilion_in) {
    enterPavilion(s, out, "Under the lamps again. The oil is patient.");
    return;
  }
  let hint = "The rope wants a reason.";
  if (has(s, "ribbon")) hint += " The guest-judge ribbon would do.";
  if (has(s, "bill")) hint += " So would waving an official-looking bill.";
  if (!has(s, "ribbon") && !has(s, "bill")) hint += " A judge's ribbon, or something official-looking.";
  out.lines.push(line(hint));
}

function ropeIn(s, out, ctx) {
  s.flags.pavilion_in = true;
  enterPavilion(s, out, ctx.fx.say);
}

function enterPavilion(s, out, say) {
  s.room = "pavilion";
  s.pose = null;
  if (say) out.lines.push(line(say));
  if (!s.flags.key_beat) {
    s.flags.key_beat = true;
    out.lines.push(line("From the stage, something small and brass sails at him. A cage key. \"For old times' sake, sugar.\" He catches it. The stage lights slam on, and he's pinned in a spotlight in front of the whole crowd.", { speaker: SPEAKER.gobbler }));
    out.lines.push(line("Help, then a trap. That's Hattie. The key fits the cage, if he ever gets near it."));
  }
  if (!s.flags.crowd_won) s.checkpoint = snapshot(s);
}

function pavilionOut(s, out) {
  s.room = "midway";
  s.pose = null;
  out.lines.push(line("Out under the bulbs. The rope remembers you."));
}

/* ---------- Pavilion: crow-down, vat, finish ---------- */
function lookGobbler(s, out) {
  s.mood = "smitten";
  // Usopp 2026-10-25: through the smoke, no mask in the words; the mask is described only once the smoke clears
  if (!s.flags.unmasked) out.lines.push(line(SMOKE_LOOK, { mood: "smitten" }));
  else out.lines.push(line("Hawk mask, red lips, a feathered wing-cape over a slim black gown, opera gloves. He knows the smile under the mask. Hattie. \"You pushed me out of your life, sugar. I just built a nicer one across the street.\"",
    { speaker: SPEAKER.gobbler, mood: "smitten" }));
  s.flags.reveal_seen = true;
}
export const SMOKE_LOOK = "Smoke, thick as a lie. One ember glows at the tip of a long cigarette holder. Something gold catches the light, then it's gone.";

function lookVat(s, out) {
  const st = vatState(s);
  const text = {
    simmer: "The oil barely moves. A few lazy bubbles. The cage hangs over it like a bad idea with good lighting.",
    gentle: "The oil bubbles gently. The cage hangs over it like a bad idea with good lighting.",
    boil: "The oil is at a steady boil, popping and steaming. The cage hangs over it like a bad idea with good lighting.",
    rolling: "A rolling boil. Spatter. A red glow comes up from under the surface. The cage hangs over it, and he can't stop looking at it.",
  }[st];
  out.lines.push(line(text));
}

function talkGobbler(s, out) {
  if (s.flags.crowd_won) {
    out.lines.push(line("\"The cage is over the oil, and something under this stage just went click. Impress me before I change my mind.\"", { speaker: SPEAKER.gobbler }));
    return;
  }
  if (!s.flags.reveal_seen) lookGobbler(s, out);
  s.flags.crowd_1 = true; // the foreground crowd starts pressing in (pavilion overlays)
  s.heat = s.heat || 0;
  out.lines.push(line(CROW[s.crowRound].her, { speaker: SPEAKER.gobbler }));
  if (s.crowRound === 1) hesitate(s, out);
  startChoice(s, { set: "crow" });
}

function hesitate(s, out) {
  const t = s.temptation;
  if (t <= 0) out.lines.push(line("He doesn't even blink."));
  else if (t === 1) out.lines.push(line("He hesitates. One beat."));
  else if (t === 2) out.lines.push(line("He hesitates longer. She leans in. The fair music thins out to almost nothing."));
  else out.lines.push(line("The oil rolls. He hears himself think it."));
}

function returnVip(s, out) {
  drop(s, "vip");
  s.flags.vip_returned = true;
  tempt(s, -1);
  out.lines.push(line(s.flags.tempt_vip
    ? "He holds out the gold card. \"This is yours, Hattie. I used it once. I shouldn't have.\""
    : "He holds out the gold card. \"This is yours, Hattie. I never used it.\""));
  out.lines.push(line("She takes it slowly, like it weighs more than it should. Behind her, the oil settles a little.", { speaker: SPEAKER.gobbler }));
}

function mirrorLamp(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("She isn't standing at the lamp yet. The crow-down comes first."));
    return;
  }
  if (s.flags.cage_jogged) {
    out.lines.push(line("The cage already dipped. No need to blind a lady twice."));
    return;
  }
  s.flags.cage_jogged = true;
  out.lines.push(line("He tips the mirror. The heat lamp finds her eyes. She flinches, elegant even blinded, and her elbow bumps the chain. The cage jogs down into reach.", { speaker: SPEAKER.gobbler, cue: "cage_jog", anim: { gobbler: "recoil" } }));
}

function sauceOil(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("Seasoning a crime you haven't been invited to yet. Win the room first."));
    return;
  }
  if (s.flags.cage_jogged) {
    out.lines.push(line("The oil's seasoned enough, and the cage is already low."));
    return;
  }
  // Oct 23 item 40: no walk, no sniff. He raises the bottle from where he stands and lobs it into the vat (cutscene
  // sauce_toss): SPLASH, the spicy oil catches her in the face, she drops the chain, and the cage drops low.
  drop(s, "sauce");
  s.flags.cage_jogged = true;
  s.mood = "smitten";
  out.lines.push(line("He raises Ned's hottest bottle like a matador and lobs it. It arcs over the rope and into the vat. SPLASH. Spicy oil catches her square in the mask, she lets go of the chain, and the cage drops low over the oil.", { speaker: SPEAKER.gobbler, mood: "smitten", cue: "cage_jog", cutscene: "sauce_toss" }));
  out.lines.push(line("\"Did you season my crime?\" \"A little.\"", { mood: "smitten" }));
}

function basketFryer(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("The cage isn't out over the oil yet. Win the room first."));
    return;
  }
  if (!reachVat(s, out)) return;
  out.lines.push(line("The basket's too low. The cage is still up on the chain, hugging the Yolk."));
}

/* ---------- Pavilion rope puzzle (Arlong, 2026-10-18): Pip lifts Corny's key ring ---------- */
// The front rope is padlocked; the vat beats need it open. Pip helps once she trusts him (pip_trust:
// refused the ring-toss rig, won it straight, or gave her tickets back). Never a soft-lock: the exit
// stays open after the crow-down, and every trust source stays available back on the Midway.
function reachVat(s, out) {
  if (s.flags.rope_open) return true;
  out.lines.push(line("The padlocked rope keeps him one long arm short of the oil. Corny's keys are on the corn-dog cart. Somebody small could get them."));
  return false;
}

function pipRefuses(s, out) {
  if (s.flags.pip_robbed) {
    out.lines.push(line("\"You won Corny's rigged prize with my tickets, mister. Ask somebody else for favors.\"", { speaker: SPEAKER.pip }));
    if (has(s, "tickets")) out.lines.push(line("The roll of prize tickets is still in his belt. It was never his."));
    return;
  }
  out.lines.push(line("\"Lots of guys wear costumes to the fair. Corny wears one, kind of.\" She nods back toward the Midway. \"Corny's ring-toss. Beat the pegs without his trick, then we'll talk.\"", { speaker: SPEAKER.pip }));
}

function pipUnlocks(s, out) {
  s.flags.rope_open = true;
  s.flags.pip_helped = true;
  out.lines.push(line("Pip looks at the cage over the oil, then at him. \"Marge watches grown-ups. Corny watches money. Nobody watches me.\"", { speaker: SPEAKER.pip }));
  out.lines.push(line("She drifts off through the crowd like a kid looking for her mom. A minute later the key ring is gone from the cart hook. Nobody notices. Nobody ever notices Pip.", { cue: "pip_lift" }));
  out.lines.push(line("*click.* The padlock pops. Pip lets the rope down and coils it at the post like she's done it a hundred times.", { cue: "pip_unlock" }));
  out.lines.push(line("\"You caught me last time,\" she whispers. \"My turn.\"", { speaker: SPEAKER.pip }));
}

function talkPipPavilion(s, out) {
  if (s.flags.rope_open) {
    out.lines.push(line("\"Go on. I'll watch the rope.\" Pip doesn't take her eyes off the cage. She was in one, once.", { speaker: SPEAKER.pip }));
    return;
  }
  if (!s.flags.pip_trust) {
    pipRefuses(s, out);
    return;
  }
  pipUnlocks(s, out);
}

function lookPipPavilion(s, out) {
  out.lines.push(line("Pip, on her break, front row by the rope, still in the chick-costume uniform. She's staring at the cage over the oil. She was the kid in that cage on the stunt night."));
}

function useKeyring(s, out) {
  if (s.flags.pip_trust) {
    out.lines.push(line("He reaches for the keys. Marge's head turns like a weather vane. \"Two bucks, hon.\" He un-reaches. Pip, beside him, sighs like he's hopeless.", { cue: "corny_turn" }));
    pipUnlocks(s, out);
    return;
  }
  out.lines.push(line("He reaches for the keys. At the cart, Marge's head turns like a weather vane. \"Two bucks, hon.\" He un-reaches. A grown man in a rooster suit can't sneak. Somebody small could, if she trusted him.", { cue: "corny_turn" }));
}

function lookPadlock(s, out) {
  out.lines.push(line(s.flags.rope_open
    ? "The padlock hangs open on the post. Pip's handiwork. Corny will blame the wind."
    : "A brass padlock through the rope's hook, on the post nearest the vat. Cheap, shiny, and the only thing between him and the oil."));
}

function usePadlock(s, out) {
  if (s.flags.rope_open) {
    out.lines.push(line("It's already open. He closes it anyway, then opens it again. Habit."));
    return;
  }
  out.lines.push(line("He tugs it. It's a padlock. It has exactly one job, and it's good at it. The key's on Corny's ring."));
}

export function computeEnding(s) {
  if (s.flags.showboat) return "showboat";
  if (s.temptation === 0 && kindness(s) >= 3) return "allies";
  if (s.flags.ticket_shown && s.temptation >= 1 && s.temptation <= 2) return "smitten";
  return "hero";
}

function finish(s, out) {
  drop(s, "basket");
  s.flags.egg_saved = true;
  s.mood = "crow";
  out.lines.push(line("The rubber basket takes the Yolk of Midnight. It's warm, and humming, and whole.", { sound: "geiger", cutscene: "catch" }));
  // Oct 21 items 17/18: he stands with the Yolk (room.heroHold) and lunges into the crow; on the showboat run he kicks
  // off the vat rim and the front row gets the fryer.
  if (s.flags.showboat) out.lines.push(line("He hops up on the vat rim with the Yolk hugged to his chest, plants his big orange costume boots, and gives the whole fair the real thing, the first real one since that night.", { mood: "crow", speaker: HERO.crow }));
  else out.lines.push(line("He hugs the Yolk to his chest, plants his big orange costume boots, and gives the whole fair the real thing, the first real one since that night.", { mood: "crow", speaker: HERO.crow }));
  out.lines.push(line("PAH-KAW!!!", { big: true, sound: "pah-kaw", mood: "crow", speaker: HERO.crow, cutscene: s.flags.showboat ? "pahkaw_show" : "pahkaw" }));
  out.lines.push(line("Nobody obeys. Nobody kneels. The Yolk doesn't give you the Crow. It never did."));
  out.lines.push(line("Instead, in the crowd, a little brown hen says, plainly, \"Is that him? He's shorter in person.\" He understands every word. The Yolk lets him hear chickens.", { cue: "littlehen" }));
  if (s.flags.showboat) out.lines.push(line("The front row, wearing the fryer, would like a word. Several words. He can hear all of them now.", { cue: "hen_out" }));
  else out.lines.push(line("Corny tries to slip out the back. The crowd he warned is standing right there. On WKUK, DeeJay names the buyer of the fairground land: Mayor Featherstone Bantam.", { cue: "hen_out" }));
  // Oct 23 item 45: her getaway car, out the back flap, a big man with a stogie at the wheel: the mayor's muscle.
  out.lines.push(line("Out the back flap, a getaway car's engine coughs. A big man with a fat stogie at the wheel. She looks back once. Furious. Impressed. Already writing the sequel.", { speaker: SPEAKER.gobbler, cue: "hattie_exit" }));
  s.ending = computeEnding(s);
  s.mode = "end";
  s.choice = null;
}

function basketCage(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("Win the room first. She hasn't swung the cage out."));
    return;
  }
  if (!reachVat(s, out)) return;
  if (!s.flags.cage_jogged) {
    out.lines.push(line("Too high. The chain needs a jog. A light in her eyes, or a reason for her to lean in."));
    return;
  }
  finish(s, out);
}

const specials = {
  read_note: readNote,
  look_board: lookBoard,
  pin_board: pinBoard,
  coop_photo: coopPhoto,
  look_hawk_far: lookHawkFar,
  squat_rail: squatRail,
  push_peck: pushPeck,
  push_henny: pushHenny,
  ring_bell: ringBell,
  coop_door: coopDoor,
  talk_henny: talkHenny,
  photo_henny: photoHenny,
  look_box: lookBox,
  look_ribbon: lookRibbon,
  talk_goat: talkGoat,
  talk_peck: talkPeck,
  talk_clerk: talkClerk,
  talk_slot: talkSlot,
  talk_deejay: talkDeejay,
  geiger_slot: geigerSlot,
  to_gate: toGate,
  talk_guard: talkGuard,
  cutout,
  offer_vip: offerVip,
  turnstile,
  talk_kids: talkKids,
  look_cashbox: lookCashbox,
  take_cashbox: takeCashbox,
  join_ticket: joinTicket,
  toss_plain: tossPlain,
  toss_speaker: tossSpeaker,
  talk_hattie_door: talkHattieDoor,
  repay_pip: repayPip,
  photo_pip: photoPip,
  look_clock: lookClock,
  fix_clock: fixClock,
  talk_corny: talkCorny,
  rope,
  rope_in: ropeIn,
  pavilion_out: pavilionOut,
  look_gobbler: lookGobbler,
  look_club_sign: lookClubSign,
  look_vat: lookVat,
  talk_gobbler: talkGobbler,
  return_vip: returnVip,
  mirror_lamp: mirrorLamp,
  sauce_oil: sauceOil,
  basket_fryer: basketFryer,
  basket_cage: basketCage,
  talk_pip_pav: talkPipPavilion,
  look_pip_pav: lookPipPavilion,
  use_keyring: useKeyring,
  look_padlock: lookPadlock,
  use_padlock: usePadlock,
};

function onItem(s, id, out) {
  const item = itemOf(s, id);
  if (!item || !has(s, id)) {
    out.lines.push(line("That isn't in a pocket."));
    return;
  }
  if (s.verb === "look") {
    out.lines.push(line(item.look, { closeup: item.icon })); // Oct 21 item 4: held up in his gloves on the main screen
    return;
  }
  if (s.verb === "talk") {
    apply(s, item.talk || "It has nothing to say, which is a mercy.", out);
    return;
  }
  if (s.verb !== "use") {
    apply(s, item[s.verb] || "It's already in a pocket. That's as taken as it gets.", out);
    return;
  }
  if (s.pending && s.pending !== id) {
    const key = [s.pending, id].sort().join("+");
    const fx = ITEM_ON_ITEM[key];
    const held = itemOf(s, s.pending);
    s.pending = null;
    if (!fx) {
      // the held item's own line for being used on something it doesn't go with
      apply(s, fill(held.combine || "Those two things refuse to collaborate.", { other: item.name }), out);
      return;
    }
    apply(s, fx, out);
    return;
  }
  s.pending = id;
  out.lines.push(line(`Use the ${item.name} on...`));
}

// Oct 23 item 30: use an inventory item on Rooster himself.
function onSelf(s, out) {
  const id = s.pending;
  s.pending = null;
  if (!id || !has(s, id)) {
    out.lines.push(line(s.verb === "look" ? "Big, green, puffed up, a little tired. Still the hero. Mostly." : "He pats himself down. All there."));
    return;
  }
  const item = itemOf(s, id);
  out.lines.push(line(item.self || `He tries the ${item.name} on himself. Nothing. He was hoping for a little something.`));
}

function onSpot(s, id, out, asGo) {
  const room = ROOMS[s.room];
  const spot = resolveSpot(s, room && room.spots.find((entry) => entry.id === id));
  if (!spot || !visible(s, spot)) {
    out.lines.push(line("Nothing there."));
    return;
  }
  if (seatedOnRail(s) && s.verb === "talk" && !asGo) {
    blowCover(s, out);
    return;
  }
  const itemFx = s.pending && ((spot.useItem && (spot.useItem[s.pending] || spot.useItem["*"])) || spot.useAny);
  if (itemFx) {
    // specific recipe, then the hotspot's own bespoke default for any other item (`useAny`, "{item}" = its name)
    const fx = fill(itemFx, { item: itemOf(s, s.pending).name });
    s.pending_used = s.pending;
    s.pending = null;
    apply(s, fx, out);
    delete s.pending_used;
    return;
  }
  if (asGo || (spot.exit && s.verb !== "look" && s.verb !== "talk")) {
    s.pending = null;
    apply(s, spot.go, out);
    return;
  }
  if (s.pending) {
    const name = itemOf(s, s.pending).name;
    s.pending = null;
    out.lines.push(line(`The ${name} doesn't work on the ${spot.name}.`));
    return;
  }
  const fx = spot[s.verb];
  if (!fx) {
    out.lines.push(line(FALLBACK[s.verb] || FALLBACK.look));
    return;
  }
  apply(s, fx, out);
}

function onTempt(s, opt, out) {
  const id = s.choice.id;
  s.mode = "play";
  s.choice = null;
  out.lines.push(line(opt.say, { speaker: HERO.talk }));
  if (id === "phone") {
    if (opt.id === "follow") {
      tempt(s, 1);
      s.flags.tempt_phone = true;
      s.flags.clock_tip = true;
      out.lines.push(hattie("\"Atta bird. Oh, and sugar? The midway clock's minute hand is taped on. You'll want every minute.\" Click."));
    } else {
      out.lines.push(hattie("\"Folks first. Always folks first.\" A long breath down the line. \"I left a card at the gate for you anyway. Wear something nice.\" Click."));
    }
    s.mood = "talk";
    out.lines.push(line("DeeJay, off-air, quietly: \"You never did tell anybody what happened that night.\"", { speaker: SPEAKER.deejay, mood: "talk" }));
    return;
  }
  if (id === "vip") {
    if (opt.id === "follow") {
      tempt(s, 1);
      s.flags.tempt_vip = true;
      s.flags.fair_in = true;
      s.room = "midway";
      s.pose = null;
      out.lines.push(line("The guard sees the gold and waves him through. Behind him, very quietly: \"Corny's gonna have my job for this.\" He doesn't turn around. He wants to.", { speaker: SPEAKER.guard }));
    } else {
      s.flags.vip_declined = true;
      out.lines.push(line("He tucks the card back in his belt. The honest way, then. The guard's tooth looks like it could use some attention, and that cutout has ideal proportions."));
    }
    return;
  }
  if (id === "ringtoss") {
    if (opt.id === "follow") {
      tempt(s, 1);
      s.flags.tempt_ring = true;
      s.flags.pip_robbed = true;
      s.flags.got_basket = true;
      give(s, "basket");
      give(s, "tickets");
      out.lines.push(line("He leans on the counter just where she said. The pegs drop flat. Three ringers. The crowd cheers for a hero, just like the old days."));
      out.lines.push(line("Corny pays out with a sour face: a rubber basket, and Pip's whole roll of prize tickets. Pip goes very quiet.", { speaker: SPEAKER.corny }));
      out.lines.push(hattie("\"See? Nobody got hurt.\" From the doorway. She's wrong, and he knows it."));
    } else {
      s.flags.refused_ring = true;
      s.flags.pip_trust = true; // he wouldn't take Corny's rig, or Pip's tickets
      out.lines.push(hattie("\"...You always did say no like it was a favor.\" The doorway goes dark."));
    }
  }
}

function eggFried(s, out) {
  s.ending = "eggfried";
  s.mode = "end";
  s.choice = null;
  out.lines.push(line("The oil gauge pegs. The chain slips a link. The Yolk of Midnight drops into the fryer with a sound like a very short applause.", { cutscene: "fried" }));
}

function onCrow(s, opt, out) {
  const round = CROW[s.crowRound];
  if (opt.vip) {
    returnVip(s, out);
    out.lines.push(line(round.her, { speaker: SPEAKER.gobbler }));
    return; // stays in choice
  }
  if (opt.bite) {
    s.mode = "end";
    s.choice = null;
    s.ending = "darkside";
    tempt(s, 1);
    out.lines.push(line(opt.say, { speaker: HERO.smitten, mood: "smitten" }));
    out.lines.push(line("The vat erupts. Red glow everywhere. Two voices, one county.", { speaker: SPEAKER.gobbler, cutscene: "erupt" }));
    out.lines.push(line("And the Crow... fizzles. Nobody obeys anything. Something is very wrong with this panel."));
    return;
  }
  out.lines.push(line(opt.say, { speaker: HERO[s.mood] || HERO.talk, mood: s.mood, sound: opt.sound || null }));
  out.lines.push(line(opt.her, { speaker: SPEAKER.gobbler }));
  if (!opt.right) {
    s.heat = (s.heat || 0) + 1;
    if (s.heat >= maxHeat(s)) {
      eggFried(s, out);
      return;
    }
    out.lines.push(line("The oil gauge ticks up."));
    out.lines.push(line(round.her, { speaker: SPEAKER.gobbler }));
    return;
  }
  if (s.crowRound === 1) {
    if (opt.id === "ticket") s.flags.ticket_shown = true;
    if (s.temptation >= 3) {
      s.temptation = 2;
      out.lines.push(line("And right there, in front of everybody, the rolling boil settles. The red glow sinks. The crowd lets out a breath it didn't know it was holding."));
    }
    unmask(s, out); // the hero choice: her speech, the smoke clears, the Cock Gobbler
  }
  if (opt.showboat) s.flags.showboat = true;
  if (s.crowRound === 2 && !opt.showboat) s.flags.crowd_warned = true;
  s.crowRound += 1;
  s.flags[`crowd_${Math.min(3, s.crowRound + 1)}`] = true; // ...and closer with every step toward the glide
  if (s.crowRound >= CROW.length) {
    s.mode = "play";
    s.choice = null;
    s.flags.crowd_won = true;
    s.checkpoint = null;
    out.lines.push(line("Under the stage, something Corny wired goes CLUNK. The fryer starts to spit, and the cage swings out over the oil.", { cue: "cage_out" }));
    if (s.flags.showboat) {
      out.lines.push(line("He's still mid-boast when the oil spits. The front row wears it. Hattie watches the oil feed and doesn't touch it."));
    } else {
      out.lines.push(line("And he glides. First time since that night. Red webbing out, over the front row, herding them back from the fryer. Hattie's hand hovers over the oil feed... and cuts it.", { cutscene: "glide", cue: "glide" }));
    }
    out.lines.push(line("The cage is still too high to reach. It needs a jog."));
    return;
  }
  out.lines.push(line(CROW[s.crowRound].her, { speaker: SPEAKER.gobbler }));
  if (s.crowRound === 1) hesitate(s, out);
}

function onChoice(s, id, out) {
  const opts = choicesFor(s);
  const opt = opts.find((o) => o.id === id);
  if (!opt || opt.locked) {
    if (opt && opt.locked) out.lines.push(line("??? He hasn't learned that one yet. Somebody out there could teach him."));
    return;
  }
  if (s.choice.set === "tempt") onTempt(s, opt, out);
  else onCrow(s, opt, out);
}

function onRewind(s, out) {
  if (s.mode !== "end" || !s.checkpoint) return s;
  const back = structuredClone(s.checkpoint);
  if (s.ending === "darkside") {
    back.temptation = 2;
    out.lines.push(line("That's not how it goes. Not for him. Back to the Pavilion."));
  } else {
    out.lines.push(line("Rewind. The Yolk is back in the cage, the oil is back to cold-ish, and he remembers every comeback."));
  }
  for (const f of ["learned_henny", "rope_open", "pip_helped"]) if (s.flags[f]) back.flags[f] = true;
  back.checkpoint = structuredClone(back);
  back.checkpoint.checkpoint = null;
  return back;
}

// Her nameplate before she names herself (GOBBLER_PLATE): gobbler lines get plate "before" (smoke-hidden portrait)
// while the smoke is up, "cleared" (the clear portrait, js/main.js swaps it the moment the veil clears) from the Pavilion
// whisk line on, and no plate (the gobbler's own) from the names line. The whisk line is narration (voice id unchanged)
// but carries her plate, so her portrait is on screen as the smoke clears.
function plates(s, lines) {
  for (const l of lines) {
    if (l.veil === "whisk") { s.flags[GOBBLER_PLATE.clearedFlag] = true; l.plate = GOBBLER_PLATE.cleared; continue; }
    if (l.speaker !== SPEAKER.gobbler || s.flags[GOBBLER_PLATE.flag]) continue;
    if (l.names) s.flags[GOBBLER_PLATE.flag] = true;
    else l.plate = s.flags[GOBBLER_PLATE.clearedFlag] ? GOBBLER_PLATE.cleared : GOBBLER_PLATE.before;
  }
}

export function act(state, action) {
  let s = structuredClone(state);
  const out = { lines: [] };
  if (action.t === "rewind") {
    s = onRewind(s, out);
    return { state: s, lines: out.lines };
  }
  if (s.mode === "end") return { state: s, lines: [] };
  const from = s.room;
  const res = actInner(s, action, out);
  plates(res.state, res.lines);
  res.beats = res.state.mode === "end" ? [] : roomBeats(res.state, from);
  return res;
}

function actInner(s, action, out) {
  if (s.mode === "choice" && action.t !== "choice") {
    return { state: s, lines: [line(s.choice && s.choice.set === "tempt" ? "Hattie's waiting on an answer." : "She's waiting on an answer.")] };
  }
  if (action.t === "verb") {
    s.verb = action.verb;
    s.pending = null;
    return { state: s, lines: [] };
  }
  if (action.t === "item") onItem(s, action.id, out);
  else if (action.t === "self") onSelf(s, out);
  else if (action.t === "hotspot") onSpot(s, action.id, out, false);
  else if (action.t === "go") onSpot(s, action.id, out, true);
  else if (action.t === "choice") onChoice(s, action.id, out);
  return { state: s, lines: out.lines };
}

export { CROW, ENDINGS, HERO, ITEMS, ROOMS, SPEAKER };
