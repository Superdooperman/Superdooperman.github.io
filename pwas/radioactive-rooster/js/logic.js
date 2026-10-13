import { CROW, HERO, ITEM_ON_ITEM, ITEMS, ROOMS, SPEAKER } from "../data/script.js";

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
  };
}

export function line(text, extra = {}) {
  return {
    text,
    speaker: extra.speaker || null,
    mood: extra.mood || null,
    sound: extra.sound || null,
    big: !!extra.big,
  };
}

export function visible(state, spot) {
  if (spot.when && !state.flags[spot.when]) return false;
  if (spot.whenNot && state.flags[spot.whenNot]) return false;
  return true;
}

export function spotsFor(state) {
  const room = ROOMS[state.room];
  if (!room) return [];
  return room.spots.filter((spot) => visible(state, spot));
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

const FALLBACK = {
  look: "Nothing you can use. Plenty you can judge.",
  talk: "No answer. Rude, but consistent.",
  take: "It stays put.",
  use: "That is not the move.",
  push: "It declines to be pushed.",
};

function commit(s, fx, out) {
  for (const flag of fx.set || []) s.flags[flag] = true;
  for (const flag of fx.clear || []) delete s.flags[flag];
  for (const id of fx.give || []) {
    if (!s.inv.includes(id)) s.inv.push(id);
  }
  for (const id of fx.consume || []) s.inv = s.inv.filter((item) => item !== id);
  if (Object.prototype.hasOwnProperty.call(fx, "pose")) s.pose = fx.pose;
  if (fx.mood) s.mood = fx.mood;
  if (fx.room) {
    s.room = fx.room;
    if (!Object.prototype.hasOwnProperty.call(fx, "pose")) s.pose = null;
  }
  if (fx.mode) s.mode = fx.mode;
  if (fx.end) s.mode = "end";
  if (fx.say) {
    out.lines.push(line(fx.say, {
      speaker: fx.speaker || null,
      mood: fx.mood || null,
      sound: fx.sound || null,
      big: fx.big,
    }));
  }
}

function apply(s, fx, out) {
  if (fx == null) return;
  if (typeof fx === "string") {
    out.lines.push(line(fx));
    return;
  }
  if (fx.needFlag && !s.flags[fx.needFlag]) {
    out.lines.push(line(fx.blocked || "Not yet."));
    return;
  }
  if (fx.needItem && !s.inv.includes(fx.needItem)) {
    out.lines.push(line(fx.blocked || "You don't have that."));
    return;
  }
  if (fx.unlessFlag && s.flags[fx.unlessFlag]) {
    out.lines.push(line(fx.already || "Already done."));
    return;
  }
  if (fx.special) {
    specials[fx.special](s, out);
    return;
  }
  commit(s, fx, out);
}

function blowCover(s, out) {
  s.pose = null;
  s.mood = "embarrassed";
  s.flags.blew_cover = true;
  out.lines.push(line(
    "He can't help it. \"PAH—! Radioactive Rooster, the crow that curdles crime!\" It comes out as a wheeze and a press release. Henny throws him off the rail. The yard birds do not apply for his job.",
    { speaker: HERO.embarrassed, mood: "embarrassed", sound: "wheeze" },
  ));
}

function squatRail(s, out) {
  s.pose = "squat";
  s.mood = "talk";
  out.lines.push(line(
    "He drops onto the rail. Gut forward. Cheeks puffed. Wings in. For one second he is a plump, ordinary, extremely suspicious rooster.",
  ));
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
    s.pose = null;
    s.room = "henhouse";
    out.lines.push(line(
      "Henny jerks her beak at the door. He waddles through in the squat and only stands up when the door shuts. Commit to the bit. That's the lesson.",
    ));
    return;
  }
  out.lines.push(line(
    "Henny fills the door. The roosters on the rail are round, quiet, and employed. He is none of those things yet.",
    { speaker: SPEAKER.henny },
  ));
}

function talkHenny(s, out) {
  out.lines.push(line(
    "She looks at the wattle, then at the belt. \"Yard birds don't wear belts,\" she says. \"Get round or get lost.\"",
    { speaker: SPEAKER.henny },
  ));
}

function readNote(s, out) {
  if (!s.flags.read_note) {
    s.flags.read_note = true;
    s.mood = "embarrassed";
    out.lines.push(line(
      "Lipstick on a bucket. \"Bring that gobbler to the fair at dusk or the yolk gets it. — C.G.\"",
      { mood: "embarrassed" },
    ));
    out.lines.push(line(
      "The Atomic Egg is gone from the buckle. He tries the call, just to see. *pah.* Somewhere a dog is not impressed.",
      { sound: "wheeze", mood: "embarrassed" },
    ));
    return;
  }
  out.lines.push(line("The note has not improved. The yolk is still the threat. The gobbler she means is attached to his chin."));
}

function lookBox(s, out) {
  out.lines.push(line("A nest with the heat still in it. Somebody sat here who was not a hen."));
  if (s.inv.includes("geiger")) {
    out.lines.push(line(
      "The counter clicks like popcorn. She practiced here. The lipstick on the stub agrees.",
      { sound: "geiger" },
    ));
  }
}

function lookRibbon(s, out) {
  if (s.inv.includes("ribbon") || s.flags.got_ribbon) {
    out.lines.push(line("The nail is bare. The ribbon is in a pocket, where a judge can find it."));
    return;
  }
  out.lines.push(line("Last year's Best Wattle ribbon, nailed where a short hero cannot reach. The ladder is a rumor."));
}

function talkPeck(s, out) {
  if (!s.flags.peck_talked) {
    s.flags.peck_talked = true;
    out.lines.push(line(
      "He squints at the chin. \"That a medical situation?\" Nobody confirms it. He nods like a man who has done his duty and will never speak of it again. The ribbon, he adds, is the goat's problem.",
      { speaker: SPEAKER.peck },
    ));
    return;
  }
  out.lines.push(line(
    "He cups the horn over his ear this time. \"Ribbon's the goat's problem,\" he says, whether or not it already is.",
    { speaker: SPEAKER.peck },
  ));
}

function talkClerk(s, out) {
  if (s.flags.traded) {
    out.lines.push(line(
      "\"Tell her the hot sauce is not a gift. It is a line item.\"",
      { speaker: SPEAKER.clerk },
    ));
    return;
  }
  out.lines.push(line(
    "\"If you have her spoon, I have her tab. If you don't, I have jars.\"",
    { speaker: SPEAKER.clerk },
  ));
}

function talkSlot(s, out) {
  s.flags.heard_dj = true;
  out.lines.push(line(
    "Through the glass, DeeJay is all teeth and headphones. \"Station ID, feathers. I need a crow with a beat. Yours sounds like a polite cough.\"",
    { speaker: SPEAKER.deejay },
  ));
}

function geigerSlot(s, out) {
  if (s.flags.deejay_won) {
    out.lines.push(line(
      "DeeJay waves through the glass. You are already a legend in the mail-slot community.",
      { speaker: SPEAKER.deejay },
    ));
    return;
  }
  if (!s.flags.geiger_rigged) {
    out.lines.push(line(
      "It clicks. He cannot cue a click. A beat would do it. The spare bulb might teach the counter timing.",
      { speaker: SPEAKER.deejay, sound: "geiger" },
    ));
    return;
  }
  s.flags.deejay_won = true;
  if (!s.inv.includes("speaker")) s.inv.push("speaker");
  if (!s.inv.includes("map")) s.inv.push("map");
  s.mood = "embarrassed";
  out.lines.push(line(
    "He holds the rigged counter to the slot. Click. Click. Click. DeeJay points, and Rooster mouths the station ID in silence, with opera sincerity.",
    { speaker: SPEAKER.deejay, sound: "click" },
  ));
  out.lines.push(line(
    "*pah.* The parking-lot horn comes off its nail. A fair map comes with it, the pavilion circled in lipstick.",
    { sound: "wheeze", mood: "embarrassed" },
  ));
}

function talkGuard(s, out) {
  out.lines.push(line(
    "\"Whole ticket,\" he says, to the concept of effort. He does not look up for long.",
    { speaker: SPEAKER.guard },
  ));
}

function cutout(s, out) {
  if (s.inv.includes("pass") || s.flags.got_pass) {
    out.lines.push(line("The cutout is already stamped. The corner is in a pocket."));
    return;
  }
  if (!s.flags.guard_distracted) {
    out.lines.push(line("The guard is watching. A man in a rooster suit hiding behind cardboard is a very short story."));
    return;
  }
  s.pose = "squat";
  s.flags.got_pass = true;
  if (!s.inv.includes("pass")) s.inv.push("pass");
  out.lines.push(line(
    "He drops into the yard-bird squat behind the cutout. Gut out. Cheeks full. The guard stamps the cardboard without looking up. Rooster peels the stamped corner free.",
  ));
}

function turnstile(s, out) {
  if (s.flags.fair_in) {
    s.room = "midway";
    s.pose = null;
    out.lines.push(line("Onto the midway. The bulbs are loud and the night is louder."));
    return;
  }
  if (!s.inv.includes("pass")) {
    out.lines.push(line(
      "The guard wants a whole ticket. Half a stub is a philosophy, not a pass.",
      { speaker: SPEAKER.guard },
    ));
    return;
  }
  s.inv = s.inv.filter((id) => id !== "pass");
  s.flags.fair_in = true;
  s.room = "midway";
  s.pose = null;
  out.lines.push(line("The stamp is a conversation. The turnstile agrees. He is in."));
}

function seeHer(s, out) {
  s.flags.seen_her = true;
  s.mood = "smitten";
  out.lines.push(line(
    "There she is. Black gown, red feathers, a smile like a posted notice. His knees file for independence. The poster did not mention the eyes.",
    { speaker: SPEAKER.gobbler, mood: "smitten" },
  ));
}

function talkStage(s, out) {
  s.flags.seen_her = true;
  s.mood = "smitten";
  if (s.flags.invited) {
    out.lines.push(line(
      "\"Don't stare. It's complimentary and it's wasting midnight.\"",
      { speaker: SPEAKER.gobbler, mood: "smitten" },
    ));
    return;
  }
  s.flags.invited = true;
  out.lines.push(line(
    "\"Step up, feathers. Show the fair what you're good at. I'm bad. I won't practice being good. You want the yolk, you want me. The pavilion is that way. Don't be late, and don't be good.\"",
    { speaker: SPEAKER.gobbler, mood: "smitten" },
  ));
}

function talkBarker(s, out) {
  if (!s.flags.seen_her) {
    out.lines.push(line(
      "\"Spotlight. You can't miss her. Nobody does. That's the problem. I run this lot. She runs the light. Don't get ideas about running off with the act.\"",
      { speaker: SPEAKER.barker },
    ));
    return;
  }
  out.lines.push(line(
    "\"Wipe your beak. She's trouble and you're obvious.\"",
    { speaker: SPEAKER.barker },
  ));
}

function bottles(s, out) {
  if (s.flags.got_basket) {
    out.lines.push(line("The barker will not survive a second miracle.", { speaker: SPEAKER.barker }));
    return;
  }
  s.flags.got_basket = true;
  if (!s.inv.includes("basket")) s.inv.push("basket");
  s.mood = "talk";
  out.lines.push(line(
    "He wheezes into the horn. *pah.* The bottles shiver and a ring walks itself over three necks.",
    { sound: "wheeze" },
  ));
  out.lines.push(line(
    "The barker looks personally betrayed. From the stage, very soft: \"That's either talent or a medical situation.\" The prize is a rubber basket.",
    { speaker: SPEAKER.gobbler },
  ));
}

function rope(s, out) {
  if (s.flags.pavilion_in) {
    s.room = "pavilion";
    s.pose = null;
    out.lines.push(line("Under the lamps again. The oil is patient."));
    return;
  }
  let hint = "A rope wants a reason.";
  if (s.inv.includes("ribbon")) hint += " The blue ribbon would do.";
  if (s.inv.includes("bill")) hint += " So would her past-due bill.";
  if (!s.inv.includes("ribbon") && !s.inv.includes("bill")) {
    hint += " A guest-judge ribbon, or the bill Ned pressed on you.";
  }
  out.lines.push(line(hint));
}

function talkGobbler(s, out) {
  if (s.flags.crowd_won) {
    out.lines.push(line(
      "\"The switch is thrown. The cage is over the oil. Impress me before I change my mind.\"",
      { speaker: SPEAKER.gobbler },
    ));
    return;
  }
  if (!s.flags.seen_her) {
    s.flags.seen_her = true;
    s.mood = "smitten";
    out.lines.push(line(
      "Up close she is worse, which is to say better. His sentence goes out for cigarettes and does not come back.",
      { speaker: SPEAKER.gobbler, mood: "smitten" },
    ));
  }
  s.mode = "choice";
  const round = CROW[s.crowRound] || CROW[0];
  out.lines.push(line(round.her, { speaker: SPEAKER.gobbler }));
}

function mirrorLamp(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("She is not at the lamp yet. The crow-down comes first."));
    return;
  }
  if (s.flags.cage_jogged) {
    out.lines.push(line("The cage already dipped. No need to blind a lady twice."));
    return;
  }
  s.flags.cage_jogged = true;
  out.lines.push(line(
    "He tips the mirror. The heat lamp finds her eyes. She flinches, elegant even while blinded, and the cage jogs down into reach.",
    { speaker: SPEAKER.gobbler },
  ));
}

function sauceOil(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("Seasoning a crime you have not been invited to yet. Win the room first."));
    return;
  }
  if (s.flags.cage_jogged) {
    out.lines.push(line("The oil is already seasoned enough, and the cage is already low."));
    return;
  }
  s.inv = s.inv.filter((id) => id !== "sauce");
  s.flags.cage_jogged = true;
  s.mood = "smitten";
  out.lines.push(line(
    "He tips the hot sauce into the oil. She announces a tasting, leans in, and the cage swings down with her.",
    { speaker: SPEAKER.gobbler, mood: "smitten" },
  ));
  out.lines.push(line("\"Did you season my crime?\" \"A little.\"", { mood: "smitten" }));
}

function basketFryer(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("The cage is not over the oil yet. Win the room first."));
    return;
  }
  out.lines.push(line("The basket is too low. The cage is still up on the chain, hugging the egg."));
}

function finish(s, out) {
  s.inv = s.inv.filter((id) => id !== "basket");
  s.flags.egg_saved = true;
  s.mode = "end";
  s.pose = "squat";
  s.mood = "crow";
  out.lines.push(line("The rubber basket takes the egg. It is warm, angry, and whole.", { sound: "geiger" }));
  out.lines.push(line("The geiger counter loses its mind."));
  out.lines.push(line(
    "He plants his talons, forgets he is still squatting, and lets the whole fair have the real thing.",
    { mood: "crow", speaker: HERO.crow },
  ));
  out.lines.push(line("PAH-KAW!!!", { big: true, sound: "pah-kaw", mood: "crow", speaker: HERO.crow }));
  out.lines.push(line(
    "The corn-dog cart peels out. She looks back once. Furious. Impressed. Already writing the sequel.",
    { speaker: SPEAKER.gobbler },
  ));
  out.lines.push(line("Cluck County stays unfried. He bows from the squat. Standing up can wait."));
}

function basketCage(s, out) {
  if (!s.flags.crowd_won) {
    out.lines.push(line("Win the room first. She has not thrown the switch."));
    return;
  }
  if (!s.flags.cage_jogged) {
    out.lines.push(line("Too high. The chain needs a jog. A light in her eyes, or a reason for her to lean in."));
    return;
  }
  finish(s, out);
}

const specials = {
  squat_rail: squatRail,
  coop_door: coopDoor,
  talk_henny: talkHenny,
  read_note: readNote,
  look_box: lookBox,
  look_ribbon: lookRibbon,
  talk_peck: talkPeck,
  talk_clerk: talkClerk,
  talk_slot: talkSlot,
  geiger_slot: geigerSlot,
  talk_guard: talkGuard,
  cutout,
  turnstile,
  see_her: seeHer,
  talk_stage: talkStage,
  talk_barker: talkBarker,
  bottles,
  rope,
  talk_gobbler: talkGobbler,
  mirror_lamp: mirrorLamp,
  sauce_oil: sauceOil,
  basket_fryer: basketFryer,
  basket_cage: basketCage,
};

function onItem(s, id, out) {
  const item = ITEMS[id];
  if (!item || !s.inv.includes(id)) {
    out.lines.push(line("That isn't in a pocket."));
    return { state: s, lines: out.lines };
  }
  if (s.verb === "look") {
    out.lines.push(line(item.look));
    return { state: s, lines: out.lines };
  }
  if (s.verb === "talk") {
    out.lines.push(line("It has nothing to say, which is a mercy."));
    return { state: s, lines: out.lines };
  }
  if (s.verb !== "use") {
    out.lines.push(line("It's already in the pocket. That's as taken as it gets."));
    return { state: s, lines: out.lines };
  }
  if (s.pending && s.pending !== id) {
    const key = [s.pending, id].sort().join("+");
    const fx = ITEM_ON_ITEM[key];
    s.pending = null;
    if (!fx) {
      out.lines.push(line("Those two things refuse to collaborate."));
      return { state: s, lines: out.lines };
    }
    apply(s, fx, out);
    return { state: s, lines: out.lines };
  }
  s.pending = id;
  out.lines.push(line(`Use the ${item.name} on...`));
  return { state: s, lines: out.lines };
}

function onSpot(s, id, out, asGo) {
  const room = ROOMS[s.room];
  const spot = room && room.spots.find((entry) => entry.id === id);
  if (!spot || !visible(s, spot)) {
    out.lines.push(line("Nothing there."));
    return { state: s, lines: out.lines };
  }
  if (s.room === "fence" && s.pose === "squat" && s.verb === "talk" && !asGo) {
    blowCover(s, out);
    return { state: s, lines: out.lines };
  }
  if (s.pending && spot.useItem && spot.useItem[s.pending]) {
    const fx = spot.useItem[s.pending];
    s.pending = null;
    apply(s, fx, out);
    return { state: s, lines: out.lines };
  }
  if (asGo || (spot.exit && s.verb !== "look" && s.verb !== "talk")) {
    s.pending = null;
    apply(s, spot.go, out);
    return { state: s, lines: out.lines };
  }
  if (s.pending) {
    const name = ITEMS[s.pending].name;
    s.pending = null;
    out.lines.push(line(`The ${name} doesn't work on the ${spot.name}.`));
    return { state: s, lines: out.lines };
  }
  const fx = spot[s.verb];
  if (!fx) {
    out.lines.push(line(FALLBACK[s.verb] || FALLBACK.look));
    return { state: s, lines: out.lines };
  }
  apply(s, fx, out);
  return { state: s, lines: out.lines };
}

function onChoice(s, id, out) {
  const round = CROW[s.crowRound];
  if (!round) {
    s.mode = "play";
    return { state: s, lines: out.lines };
  }
  const opt = round.options.find((option) => option.id === id);
  if (!opt) return { state: s, lines: out.lines };
  if (opt.pose) s.pose = opt.pose;
  if (opt.sound) s.mood = s.mood;
  out.lines.push(line(opt.say, {
    speaker: HERO[s.mood] || HERO.talk,
    mood: s.mood,
    sound: opt.sound || null,
  }));
  out.lines.push(line(opt.her, { speaker: SPEAKER.gobbler }));
  if (opt.right) {
    s.crowRound += 1;
    if (s.crowRound >= CROW.length) {
      s.mode = "play";
      s.flags.crowd_won = true;
      out.lines.push(line(
        "She throws the switch with a flourish she learned from a worse life. The cage swings out over the oil. The clock has still given up. The oil does not care what time it is.",
      ));
    } else {
      s.mode = "choice";
      out.lines.push(line(CROW[s.crowRound].her, { speaker: SPEAKER.gobbler }));
    }
  } else {
    s.mode = "choice";
  }
  return { state: s, lines: out.lines };
}

export function act(state, action) {
  const s = structuredClone(state);
  const out = { lines: [] };
  if (s.mode === "end") return { state: s, lines: [] };
  if (s.mode === "choice" && action.t !== "choice") {
    return { state: s, lines: [line("She's waiting on an answer.")] };
  }
  if (action.t === "verb") {
    s.verb = action.verb;
    s.pending = null;
    return { state: s, lines: [] };
  }
  if (action.t === "item") return onItem(s, action.id, out);
  if (action.t === "hotspot") return onSpot(s, action.id, out, false);
  if (action.t === "go") return onSpot(s, action.id, out, true);
  if (action.t === "choice") return onChoice(s, action.id, out);
  return { state: s, lines: out.lines };
}

export { CROW, HERO, ITEMS, ROOMS, SPEAKER };
