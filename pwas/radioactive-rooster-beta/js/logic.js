import { CROW, ENDINGS, FEEDSEED, HENNY_THINKS, HERO, ITEM_ON_ITEM, ITEMS, KINDNESS, ROOMS, SPEAKER, TEMPT, VAT_STATES } from "../data/script.js";

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
  };
}

export function line(text, extra = {}) {
  return {
    text,
    speaker: extra.speaker || null,
    mood: extra.mood || null,
    sound: extra.sound || null,
    big: !!extra.big,
    thought: !!extra.thought,
    rap: !!extra.rap,
    cue: extra.cue || null, // stage cue for cast frames (js/main.js castFrame); never shown
  };
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
  if (state.pending) return `Use the ${ITEMS[state.pending].name} on the ${name}.`;
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
    out.lines.push(line(fx.say, { speaker: fx.speaker || null, mood: fx.mood || null, sound: fx.sound || null, big: fx.big }));
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
  out.lines.push(line("Around it, his finest work. CORN DOGS: WHY A STICK? WHO BENEFITS? WKUK plays the same song at 3:14 every night. CODE?? The ferris wheel moved two inches this year. TOWARD WHAT."));
  out.lines.push(line("HENNY: has never once blinked in front of him. And a clipping, circled: LOCAL MAN BRAHM A. ORPINGTON BEHIND ON FEED BILL. Labeled, in a hurry: DEAD END. DO NOT PURSUE."));
  const bits = [];
  if (s.flags.got_stub) bits.push("Pinned: a torn ticket stub. \"R— & H—\". He pins it face down.");
  if (s.flags.reveal) bits.push("The joined ticket goes in the middle. The string from THE COCK GOBBLER runs straight to HATTIE.");
  if (s.flags.saw_rig) bits.push("A new string: SLICK CORNY → FRYER WIRING → 12:00. It doesn't touch Hattie at all.");
  if (!bits.length) bits.push("Every single string still runs to a photo of the goat.");
  out.lines.push(line(bits.join(" ")));
}

function pinBoard(s, out) {
  const name = ITEMS[s.pending_used] ? ITEMS[s.pending_used].name : "clue";
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
  out.lines.push(line("Across town, a red neon hawk over a club that wasn't there last year. He knows that hawk. He looks away first."));
}

/* ---------- Fence / Henny (Henny NEVER speaks: thought bubbles only) ---------- */
function blowCover(s, out) {
  s.pose = null;
  s.mood = "embarrassed";
  s.flags.blew_cover = true;
  out.lines.push(line(
    "He can't help it. \"Evening, ladies! Radioactive Rooster, here to—\" Henny doesn't say a word. She just points one wing at the gravel. He gets off the rail.",
    { mood: "embarrassed", sound: "wheeze" },
  ));
  out.lines.push(henny("A real rooster doesn't explain himself."));
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
  drop(s, "photo");
  s.flags.kind_henny = true;
  out.lines.push(line("He signs the photo \"To Henny, the real guard,\" and holds it out. She takes it without a word. Then she sniffs it. Then she sniffs him. Long pause."));
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
  out.lines.push(line("\"Barometer says goat.\"", { speaker: SPEAKER.peck }));
}

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
    out.lines.push(line("DeeJay, off-air: \"You never did tell anybody what happened that night.\" \"Just did.\"", { speaker: SPEAKER.deejay }));
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
    out.lines.push(line("THE COCK GOBBLER — ADMIT ONE, NO QUESTIONS. On the back, in lipstick: \"Wear something nice.\" He pockets it. He doesn't use it. Yet."));
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
  if (has(s, "vip")) {
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
    out.lines.push(line("Dot doesn't look at Rocco. \"He does that.\"", { speaker: SPEAKER.dot }));
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
  out.lines.push(line("The lid's up. Under the quarters, a wiring sketch in grease pencil: FRYER → TIMER → 12:00, initialed S.C. And a torn half of a fair ticket with the same ragged edge as his."));
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
  out.lines.push(line("He lifts the ticket half and nothing else. Under it, the wiring sketch: FRYER → TIMER → 12:00, initialed S.C. Corny is still yelling about the jingle."));
}

function joinTicket(s, out) {
  drop(s, "half");
  drop(s, "stub");
  give(s, "ticket");
  s.flags.reveal = true;
  s.mood = "embarrassed";
  out.lines.push(line("The edges fit. \"ROOSTER & HATTIE: ADMIT TWO,\" dated the stunt night. Her half was pawned to Corny. The lipstick on his half is the Gobbler's."));
  out.lines.push(line("The Cock Gobbler is Hattie. And somebody else, initials S.C., wired the fryer to blow at midnight. She doesn't know.", { mood: "embarrassed" }));
}

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
  drop(s, "photo");
  s.flags.kind_pip = true;
  out.lines.push(line("He signs it \"To Pip. You were brave in there.\" Pip reads it twice. \"...How'd you know I was in there?\" He just tips his costume beak.", { speaker: SPEAKER.pip }));
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
  out.lines.push(line("He shinnies up the post and presses the minute hand back where it belongs. Somewhere, the fryer timer just lost a little ground."));
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
  out.lines.push(line(s.flags.reveal
    ? "Hawk mask, red lips, a feathered wing-cape over a slim black gown, opera gloves. He knows the smile under the mask. Hattie. \"You pushed me out of your life, sugar. I just built a nicer one across the street.\""
    : "Hawk mask, red lips, a feathered wing-cape over a slim black gown, opera gloves, a bubble-soap cigarette holder. Then she smiles, and he knows. Hattie. \"You pushed me out of your life, sugar. I just built a nicer one across the street.\"",
  { speaker: SPEAKER.gobbler, mood: "smitten" }));
  s.flags.reveal_seen = true;
}

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
  out.lines.push(line("He tips the mirror. The heat lamp finds her eyes. She flinches, elegant even blinded, and her elbow bumps the chain. The cage jogs down into reach.", { speaker: SPEAKER.gobbler }));
}

function sauceOil(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("Seasoning a crime you haven't been invited to yet. Win the room first."));
    return;
  }
  if (!reachVat(s, out)) return;
  if (s.flags.cage_jogged) {
    out.lines.push(line("The oil's seasoned enough, and the cage is already low."));
    return;
  }
  drop(s, "sauce");
  s.flags.cage_jogged = true;
  s.mood = "smitten";
  out.lines.push(line("He tips Ned's hot sauce into the oil. She can't help it, she leans in to smell it, and the cage swings down with her.", { speaker: SPEAKER.gobbler, mood: "smitten" }));
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
  out.lines.push(line("Pip looks at the cage over the oil, then at him. \"Corny never watches his own cart. He's too busy watching everybody else's money.\"", { speaker: SPEAKER.pip }));
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
    out.lines.push(line("He reaches for the keys. Corny's head turns like a weather vane. He un-reaches. Pip, beside him, sighs like he's hopeless.", { cue: "corny_turn" }));
    pipUnlocks(s, out);
    return;
  }
  out.lines.push(line("He reaches for the keys. Across the crowd, Corny's head turns like a weather vane. He un-reaches. A grown man in a rooster suit can't sneak. Somebody small could, if she trusted him.", { cue: "corny_turn" }));
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
  s.pose = "squat";
  s.mood = "crow";
  out.lines.push(line("The rubber basket takes the Yolk of Midnight. It's warm, and humming, and whole.", { sound: "geiger" }));
  out.lines.push(line("He plants his big orange costume boots, forgets he's still squatting, and gives the whole fair the real thing, the first real one since that night.", { mood: "crow", speaker: HERO.crow }));
  out.lines.push(line("PAH-KAW!!!", { big: true, sound: "pah-kaw", mood: "crow", speaker: HERO.crow }));
  out.lines.push(line("Nobody obeys. Nobody kneels. The Yolk doesn't give you the Crow. It never did."));
  out.lines.push(line("Instead, in the crowd, a little brown hen says, plainly, \"Is that him? He's shorter in person.\" He understands every word. The Yolk lets him hear chickens.", { cue: "littlehen" }));
  if (s.flags.showboat) out.lines.push(line("The front row, wearing the fryer, would like a word. Several words. He can hear all of them now."));
  else out.lines.push(line("Corny tries to slip out the back. The crowd he warned is standing right there. On WKUK, DeeJay names the buyer of the fairground land: Mayor Featherstone Bantam."));
  out.lines.push(line("The corn-dog cart's engine coughs. She looks back once. Furious. Impressed. Already writing the sequel.", { speaker: SPEAKER.gobbler }));
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
  const item = ITEMS[id];
  if (!item || !has(s, id)) {
    out.lines.push(line("That isn't in a pocket."));
    return;
  }
  if (s.verb === "look") {
    out.lines.push(line(item.look));
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
    const held = ITEMS[s.pending];
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

function onSpot(s, id, out, asGo) {
  const room = ROOMS[s.room];
  const spot = resolveSpot(s, room && room.spots.find((entry) => entry.id === id));
  if (!spot || !visible(s, spot)) {
    out.lines.push(line("Nothing there."));
    return;
  }
  if (s.room === "fence" && s.pose === "squat" && s.verb === "talk" && !asGo) {
    blowCover(s, out);
    return;
  }
  const itemFx = s.pending && ((spot.useItem && (spot.useItem[s.pending] || spot.useItem["*"])) || spot.useAny);
  if (itemFx) {
    // specific recipe, then the hotspot's own bespoke default for any other item (`useAny`, "{item}" = its name)
    const fx = fill(itemFx, { item: ITEMS[s.pending].name });
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
    const name = ITEMS[s.pending].name;
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
  out.lines.push(line("The oil gauge pegs. The chain slips a link. The Yolk of Midnight drops into the fryer with a sound like a very short applause."));
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
    out.lines.push(line("The vat erupts. Red glow everywhere. Two voices, one county.", { speaker: SPEAKER.gobbler }));
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
  }
  if (opt.showboat) s.flags.showboat = true;
  if (s.crowRound === 2 && !opt.showboat) s.flags.crowd_warned = true;
  s.crowRound += 1;
  if (s.crowRound >= CROW.length) {
    s.mode = "play";
    s.choice = null;
    s.flags.crowd_won = true;
    s.checkpoint = null;
    out.lines.push(line("Under the stage, something Corny wired goes CLUNK. The fryer starts to spit, and the cage swings out over the oil."));
    if (s.flags.showboat) {
      out.lines.push(line("He's still mid-boast when the oil spits. The front row wears it. Hattie watches the oil feed and doesn't touch it."));
    } else {
      out.lines.push(line("And he glides. First time since that night. Red webbing out, over the front row, herding them back from the fryer. Hattie's hand hovers over the oil feed... and cuts it."));
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

export function act(state, action) {
  let s = structuredClone(state);
  const out = { lines: [] };
  if (action.t === "rewind") {
    s = onRewind(s, out);
    return { state: s, lines: out.lines };
  }
  if (s.mode === "end") return { state: s, lines: [] };
  if (s.mode === "choice" && action.t !== "choice") {
    return { state: s, lines: [line(s.choice && s.choice.set === "tempt" ? "Hattie's waiting on an answer." : "She's waiting on an answer.")] };
  }
  if (action.t === "verb") {
    s.verb = action.verb;
    s.pending = null;
    return { state: s, lines: [] };
  }
  if (action.t === "item") onItem(s, action.id, out);
  else if (action.t === "hotspot") onSpot(s, action.id, out, false);
  else if (action.t === "go") onSpot(s, action.id, out, true);
  else if (action.t === "choice") onChoice(s, action.id, out);
  return { state: s, lines: out.lines };
}

export { CROW, ENDINGS, HERO, ITEMS, ROOMS, SPEAKER };
