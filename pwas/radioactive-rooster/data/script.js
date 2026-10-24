// Radioactive Rooster and the Yolk of Midnight: story v2 data (beta slice 2).
// Scene coordinates are logical pixels in a 320x180 scene (see art/manifest.json).
// Source of truth for story: github-pages-plans/rooster-story.md (v2.x).
export const SCENE = { w: 320, h: 180 };

export const HERO = {
  talk: "portrait-rooster.png",
  smitten: "portrait-rooster-smitten.png",
  embarrassed: "portrait-rooster-embarrassed.png",
  crow: "portrait-rooster-crow.png",
};

// Image speakers use a portrait file. "voice:" speakers have no portrait yet and show a name plate only.
export const SPEAKER = {
  gobbler: "portrait-gobbler.png",
  henny: "portrait-henny.jpg",
  peck: "portrait-peck.jpg",
  deejay: "portrait-deejay.jpg",
  guard: "portrait-guard.jpg",
  corny: "portrait-barker.jpg",
  clerk: "portrait-clerk.jpg",
  hattie: "portrait-hattie.png", // Oct 21 item 9: a silhouette behind a frosted door, no spoiler (tools/sprites/cut_oct21.py)
  dot: "voice:dot",
  rocco: "voice:rocco",
  pip: "voice:pip",
  kids: "voice:kids",
  goat: "voice:goat",
};

export const NAMES = {
  [HERO.talk]: "Radioactive Rooster",
  [HERO.smitten]: "Radioactive Rooster",
  [HERO.embarrassed]: "Radioactive Rooster",
  [HERO.crow]: "Radioactive Rooster",
  [SPEAKER.gobbler]: "The Cock Gobbler",
  [SPEAKER.henny]: "Henny",
  [SPEAKER.peck]: "Farmer Peck",
  [SPEAKER.deejay]: "DeeJay Cluck",
  [SPEAKER.guard]: "Gate guard",
  [SPEAKER.corny]: "Slick Corny",
  [SPEAKER.clerk]: "Ned",
  [SPEAKER.hattie]: "Hattie",
  [SPEAKER.dot]: "Dot",
  [SPEAKER.rocco]: "Rocco",
  [SPEAKER.pip]: "Pip",
  [SPEAKER.kids]: "The Jingle Kids",
  [SPEAKER.goat]: "Mortgage",
};

// Henny NEVER speaks out loud (Arlong, 2026-10-16). Every Henny line is a thought bubble.
export const HENNY_THINKS = { speaker: SPEAKER.henny, thought: true };

// Title-screen cutouts drawn over bg/title (top-left `at` in its 320x180 px). See js/main.js renderTitle.
export const TITLE = {
  overlays: [
    { art: "sprite/titlehen-side-l-h16", at: [58, 58] }, // the white hen on the barn-roof peak (feet at 67,74), a sprite now, not plate paint
  ],
};

export const ITEMS = {
  geiger: {
    name: "geiger counter",
    look: "Old Rad-Safe issue. It clicks near the Yolk of Midnight. It also clicks near him, sometimes. Nobody has ever asked why.",
    icon: "item/item-geiger",
    talk: "\"Find me the Yolk, buddy.\" Click. Click. It clicks at him. He decides that's encouragement.",
    take: "Already in the belt pouch. It clicks once, to say it's comfortable.",
    push: "He taps the dial. The needle swings toward him, then away, like it's being polite.",
    combine: "He waves the geiger counter over the {other}. A couple of clicks. Nothing glowing. A relief, and a letdown.",
    // after the bulb+geiger combine (Arlong 2026-10-19): its own name and icon
    alt: [{
      when: "geiger_rigged",
      name: "geiger counter with bulb",
      icon: "item/item-geiger-bulb",
      look: "The old Rad-Safe counter with Rooster's spare coop bulb jammed on top. It clicks in time now, and the bulb flickers on every click. It is, technically, a rhythm section.",
    }],
  },
  bulb: {
    name: "spare bulb",
    look: "Off the coop lamp. Forty watts of optimism.",
    icon: "item/item-bulb",
    talk: "\"Stay bright, buddy.\" Forty watts of optimism, currently unlit.",
    take: "Still in a pocket. Rad-Safe Rule 4 is satisfied.",
    push: "He gives the bulb a little twist in the air. There's nothing to screw it into. Rule 4 didn't plan this far.",
    combine: "He holds the bulb up to the {other} like it'll shed some light. It isn't plugged in. It sheds nothing.",
  },
  photo: {
    name: "autograph photo",
    look: "Signed \"Stay safe! — Radioactive Rooster.\" He means it every time. He has signed four hundred of these for people who did not ask.",
    icon: "item/item-photo",
    talk: "\"Lookin' good, champ.\" The photo smiles back. It's signed, of course.",
    take: "He already has it. He also has four hundred more at home.",
    push: "He straightens the photo's corner. Presentation matters.",
    combine: "He almost signs the {other} too, out of habit. He stops the pen at \"Stay sa—\".",
  },
  spoon: {
    name: "tasting spoon",
    look: "Silver. Monogrammed C.G. Somebody brought her own spoon to a fry.",
    icon: "item/item-spoon",
    talk: "\"Tell me about C.G.\" The spoon shines. It's very discreet, for silverware.",
    take: "Already pocketed, well away from his beak. Evidence etiquette.",
    push: "He spins the spoon on his palm. It points at nobody. Then, slowly, toward the fair.",
    combine: "He taps the {other} with the tasting spoon. Ting. Smells like perfume and fried things.",
  },
  stub: {
    name: "torn ticket stub",
    look: "Half a fair ticket, lipstick on the ragged edge. Tiny print through the nostril holes: \"R— & H— Admit Tw—\". He knows this ticket. He tore it.",
    icon: "item/item-stub",
    talk: "He doesn't talk to the stub. He just holds it a while.",
    take: "Already tucked in his belt, against his chest, where tickets go when you don't want to think about them.",
    push: "He smooths the torn edge. It fits nothing. Yet.",
    combine: "He lines up the stub against the {other}. The torn edge doesn't match. Somewhere, there's an edge that does.",
  },
  half: {
    name: "other ticket half",
    look: "The other half. \"—ooster & —attie: —o.\" It's been in Corny's cash box. Somebody pawned it.",
    icon: "item/item-half",
    talk: "\"Where've you been?\" In Corny's cash box, apparently. Pawned. He won't forgive Corny that one.",
    take: "Safe in his belt now. Out of the cash box, at least.",
    push: "He turns the half over. On the back, in Corny's grease pencil: 5¢.",
    combine: "He holds the half against the {other}. Wrong tear. Only one other scrap of paper in town fits this one.",
  },
  ticket: {
    name: "joined ticket",
    look: "\"ROOSTER & HATTIE: ADMIT TWO.\" Dated the stunt night. The edges still fit. That's the worst part.",
    icon: "item/item-ticket",
    talk: "\"Admit two.\" He says it out loud, once, to hear how it sounds. It sounds like a long time ago.",
    take: "It's in his belt with the edges together. He checks twice. Still whole.",
    push: "He presses the seam flat. Some things are easier to fix than others.",
    combine: "He tucks the {other} behind the joined ticket. It doesn't belong there. Only two names do.",
  },
  grub: {
    name: "fat grub",
    look: "It would change a goat's whole evening.",
    icon: "item/item-grub",
    talk: "\"Hang in there, buddy.\" The grub wiggles. It isn't sure about this partnership.",
    take: "Already in the pouch. The pouch wiggles occasionally.",
    push: "He pokes the grub. It curls up, offended. A goat would appreciate it more.",
    combine: "He offers the grub to the {other}. The {other} does not eat grubs. A goat would.",
  },
  ribbon: {
    name: "blue ribbon",
    look: "GUEST JUDGE, Best Wattle. Farmer Peck's pride. The pin still works.",
    icon: "item/item-ribbon",
    talk: "\"Best Wattle, huh?\" He touches his own wattle. It's a decent wattle. Not a guest-judge wattle.",
    take: "Already pinned inside his belt. The pin still works. He found that out personally.",
    push: "He polishes the ribbon on his sleeve. GUEST JUDGE gleams. Peck would be proud, if he could hear it.",
    combine: "He pins the ribbon on the {other}. It doesn't look like a winner. He unpins it.",
  },
  sauce: {
    name: "hot sauce",
    look: "Ned's hottest bottle. \"Not a gift. A line item.\"",
    icon: "item/item-sauce",
    talk: "\"Easy, hot stuff.\" The bottle sloshes, menacingly.",
    take: "Already pocketed. The bottle is warm. It might always be warm.",
    push: "He shakes the hot sauce. Now it's angry. Good.",
    combine: "He considers hot sauce on the {other}. Some things don't need seasoning. That's one of them.",
  },
  mirror: {
    name: "hand mirror",
    look: "It shows people the thing they actually came to see, which is usually themselves.",
    icon: "item/item-mirror",
    talk: "He checks himself in the mirror. \"Lookin' good, Rooster.\" One eye agrees. The other is looking at the sky.",
    take: "Already in a pocket, face in, so it doesn't get vain.",
    push: "He tilts the mirror. It catches the light and throws it straight into his own eyes. Ow. Both of them.",
    combine: "He holds the mirror up to the {other}. It shows the {other}, and behind it, a guy in a rooster suit. Handsome guy.",
  },
  bill: {
    name: "past-due bill",
    look: "NED'S FEED & SEED. \"ORPINGTON, BRAHM A. 1x deodorant (economy). 40 lbs scratch. PAST DUE.\" Ned asked Rooster to deliver it. Rooster said he'd make sure Brahm gets it. He will.",
    icon: "item/item-bill",
    talk: "\"Brahm A. Orpington, huh.\" He says the name a little too fast. \"Never met him. Nice fella, probably.\"",
    take: "In the belt. He promised Ned he'd deliver it. Funny how nobody's ever seen Brahm and Rooster in the same room.",
    push: "He folds the bill smaller. PAST DUE gets smaller. It doesn't get any less past due.",
    combine: "He tucks the {other} into the bill like a payment. Ned won't accept it. Ned accepts cash and guilt.",
  },
  speaker: {
    name: "loudspeaker",
    look: "A parking-lot horn with a WKUK sticker. It makes a small voice sound like a decision.",
    icon: "item/item-speaker",
    talk: "He clears his throat into the loudspeaker. *pah.* Even amplified, the crow is a wheeze. A louder wheeze.",
    take: "Already on his belt. It bangs his hip when he walks. Heroic bruising.",
    push: "He squeezes the trigger. *FWEEP.* Three blocks away, a dog files a complaint.",
    combine: "He announces the {other} through the loudspeaker. Nobody is impressed. Nobody is even here.",
  },
  map: {
    name: "fair map",
    look: "DeeJay circled two things: the Hot Oil Pavilion, and Slick Corny's ring-toss booth. \"Follow the money,\" in grease pencil.",
    icon: "item/item-map",
    talk: "\"Follow the money.\" He says it in his best DeeJay voice. It is not a good DeeJay voice.",
    take: "Already folded in his belt, the wrong way. Maps only fold the wrong way.",
    push: "He refolds the map. The Pavilion ends up on the outside, circled twice. Subtle, DeeJay.",
    combine: "He checks the {other} against the map. It isn't on there. DeeJay only circled two things.",
  },
  pass: {
    name: "stamped pass",
    look: "A corner of cardboard with a real stamp. The guard's tooth was very distracting.",
    icon: "item/item-pass",
    talk: "\"Thanks, pal.\" The pass doesn't answer. The guard's tooth still haunts him, though.",
    take: "Already in his belt. It's the most official thing he owns.",
    push: "He smooths the stamp. It's real. He keeps checking.",
    combine: "He holds the pass next to the {other}. The pass gets him places. The {other} doesn't.",
  },
  vip: {
    name: "gold VIP card",
    look: "\"THE COCK GOBBLER — ADMIT ONE, NO QUESTIONS.\" On the back, in lipstick: \"Wear something nice, Big Green.\"",
    icon: "item/item-vip",
    talk: "\"Wear something nice, Big Green.\" He reads the lipstick out loud, then looks around in case anybody heard.",
    take: "In his belt, face down, so the lipstick can't look at him.",
    push: "He flips the card. Gold side. Lipstick side. Gold side. It isn't helping.",
    combine: "He tucks the VIP card behind the {other}. It glows gold anyway. Her things always do.",
  },
  basket: {
    name: "rubber basket",
    look: "Ring-toss prize. It can catch an egg, if the egg can be talked down.",
    icon: "item/item-basket",
    talk: "\"Ready to catch something, buddy?\" The basket stays rubbery and noncommittal.",
    take: "On his belt. It bounces when he walks. Everything about him bounces a little tonight.",
    push: "He squeezes the basket. It squeaks. Rubber baskets do that.",
    combine: "He sets the {other} in the rubber basket for a second. It fits fine. That's not what the basket's for.",
  },
  tickets: {
    name: "prize tickets",
    look: "A roll of ring-toss prize tickets. Pip's. They came with the rigged win. They feel heavier than paper should.",
    icon: "item/item-tickets",
    talk: "\"Sorry.\" He says it to the tickets, because Pip isn't here. It doesn't count, and he knows it.",
    take: "Still in his belt. They feel heavier every time he checks.",
    push: "He counts the tickets. All of them. They're all Pip's.",
    combine: "He wraps the tickets around the {other}. It doesn't make them any less Pip's.",
  },
};

// Oct 23 item 30: any inventory item used on Rooster himself (click him while holding it) gets its own line.
export const SELF_LINES = {
  geiger: "He waves the counter over his own chest. Click. Click-click. He decides that's the suit. It's probably the suit.",
  bulb: "He holds the spare bulb up to his own beak. Nothing lights up. Some ideas need a socket.",
  photo: "He signs his own photo again, under the first signature. \"To me. Stay safe.\" He feels a little better.",
  spoon: "He checks his reflection in the spoon. Upside down, the hero looks worried. Right side up, too.",
  stub: "He tucks the stub against his heart, under the suit. It's been there before. It knows the way.",
  half: "He holds the half ticket up beside his own face, like a mugshot. Exhibit A: a bird who knows too much.",
  ticket: "ADMIT TWO. He looks at it, then at himself. Admit one. For now.",
  grub: "He considers the grub as a snack. The grub considers him back. They agree to see other people.",
  ribbon: "He pins the GUEST JUDGE ribbon to his own chest and nods at himself. The judge finds him very heroic.",
  sauce: "He thinks about a dab of hot sauce on his own beak, for courage. Rad-Safe Rule 4: never season the hero.",
  mirror: "He checks the hero in the mirror. Feathers: puffed. Beak: heroic. Eyes: tired. He puffs the feathers more.",
  bill: "He reads the bill against his own chest, in case it's for him. It isn't. He's relieved, then ashamed of being relieved.",
  speaker: "He holds the speaker up to his own ear. It's quiet. It's waiting for something worth saying.",
  map: "He traces the map's lines across his own belly, in case he is the treasure. He is not on the map.",
  pass: "He flashes the gold pass at himself. He lets himself in. Nothing happens. It's a very exclusive club.",
  vip: "He reads the VIP card to himself, out loud, in her voice. It's worse in his voice.",
  basket: "He puts the rubber basket on his head. It fits. He takes it off before anybody sees. Somebody saw.",
  tickets: "He tries to hand the tickets to himself. He won't take them. Good. They're Pip's.",
};
for (const [id, text] of Object.entries(SELF_LINES)) if (ITEMS[id]) ITEMS[id].self = text;

export const ITEM_ON_ITEM = {
  "bulb+geiger": {
    unlessFlag: "geiger_rigged",
    already: "The bulb is already spent. The counter still clicks, which is the part that matters.",
    consume: ["bulb"],
    set: ["geiger_rigged"],
    say: "He snaps the spare bulb onto the geiger counter. Now it clicks in time. Badly. Bravely.",
    sound: "click",
  },
  "half+stub": { special: "join_ticket" },
};

// Hattie's temptations before the finale. Follow = +1 temptation. The 4th is "...One bite." in crow-down round 2.
export const TEMPT = {
  phone: {
    where: "WKUK",
    options: [
      { id: "follow", say: "\"Sure, Hattie. I'll come by the club.\"" },
      { id: "pull", say: "\"That's real nice of you, Hattie. I've got folks to check on first.\"" },
    ],
  },
  vip: {
    where: "gate",
    options: [
      { id: "follow", say: "Flash Hattie's gold card and walk in like royalty." },
      { id: "pull", say: "Put the card away. Get in the honest way." },
    ],
  },
  ringtoss: {
    where: "midway",
    options: [
      { id: "follow", say: "Do it her way. Rig the ring toss." },
      { id: "pull", say: "\"No, Hattie. Not again.\"" },
    ],
  },
};

// Crow-down (Monkey Island rules). need: a flag or item; unmet options show as "???".
export const CROW = [
  {
    her: "Nice wattle. You still apologizing for things that weren't your fault?",
    options: [
      { id: "mean", say: "At least my wattle's real. Is your beak?", her: "Cheap shot, sugar. You don't even know how to aim one.", right: false },
      { id: "henny", say: "Only the ones I could fix. Showing up's standard issue.", her: "...Henny taught you that. I can tell. She never said a word, did she.", right: true, need: "learned_henny" },
      { id: "flex", say: "I can hide it if I puff my cheeks. Watch.", her: "Don't puff at me. I invented puffing.", right: false },
    ],
  },
  {
    her: "Eat it with me. One bite each. Nobody ever tells us no again.",
    options: [
      { id: "ticket", say: "\"I already told you no once, Hattie. It was the kindest thing I ever did.\" He holds up the joined ticket.", her: "...You kept your half. Of course you kept your half.", right: true, need: "ticket" },
      { id: "bill", say: "I pay my debts. Starting with the town.", her: "She leans close enough to read the bill. Only she can see the name on it. \"Collections. How romantic, B.O.\"", right: true, need: "bill" },
      { id: "flirt", say: "If I say yes, do I get the cape?", her: "You get the oil, hero. Try again without the drool.", right: false },
      { id: "vip", say: "Hand back her gold card.", vip: true },
      { id: "bite", say: "...One bite.", bite: true },
    ],
  },
  {
    her: "Then crow for your crowd, little hero.",
    options: [
      { id: "warn", say: "He turns his back on her. \"Folks, step back from the fryer. Please.\"", her: "You spent your big moment warning the rubes. I'm almost moved. ...I'm not. Almost.", right: true, sound: "wheeze" },
      { id: "hero", say: "PAH—! I am the crow that curdles crime!", her: "Save it for the poster. That wasn't even the real call.", right: true, showboat: true },
      { id: "mock", say: "Only if you squat first, Gobbler.", her: "I don't take requests from the audience.", right: false },
    ],
  },
];

// Comic-cover endings. With `splash` (hero, allies, smitten): a Silver Age cover, the painted splash under the series
// banner and title, then the story beats as inset panels (panel.art = painted pixel panel; text becomes a narration
// caption, a quote in it becomes a speech bubble; say/thought = that character's bubble + an editor's note).
// Without it (showboat, darkside, eggfried): the older code-drawn cover.
export const ENDINGS = {
  hero: {
    series: "RADIOACTIVE ROOSTER #1",
    title: "ROOSTER RETURNS!",
    // Arlong 2026-10-19: a Silver Age (1950s-60s) comic cover. Splash = the glide, red webbing out; the beats below
    // are inset panels with painted pixel art (bg/cover-hero-1..4), narration captions, bubbles and editor's notes.
    splash: "bg/cover-hero",
    // Arlong 2026-10-19: the approved painted cover (lettering + panels baked in) is the whole final page for now
    final: "art/ending/cover-final-hero.webp", // source: rooster-scene-art-v2/cover-final-hero-approved.png
    blurb: "The Yolk is safe. The Hawk has flown.",
    art: "Rooster gliding over the Pavilion, red webbing out, the Yolk in a rubber basket.",
    panels: [
      { text: "The getaway car's taillights, heading for the county line. \"Spare set.\"", art: "bg/cover-hero-1" }, // Oct 23 item 45: his car, not Marge's cart
      { text: "A single hawk feather on the rooftop bucket.", art: "bg/cover-hero-2" },
      { text: "Across town, the neon hawk flickers. For one frame it reads HATTIE'S.", art: "bg/cover-hero-3" },
      { text: "Took you long enough, Rooster. Name. Business. ...Welcome home.", say: "Henny", art: "bg/cover-hero-4" },
    ],
    tone: "hero",
  },
  allies: {
    series: "RADIOACTIVE ROOSTER & FRIENDS · SPECIAL EDITION",
    title: "THE WHOLE COOP CROWS!",
    splash: "bg/cover-hero", // panel art to come: these panels show Ben-Day dots under their captions
    blurb: "Featuring Henny, Mortgage, DeeJay Cluck and the Jingle Kids!",
    art: "Everybody on the rooftop at dawn: Henny, Mortgage, DeeJay, Dot, Rocco, Pip, and one rooster, crowing for real.",
    panels: [
      "The Jingle Kids sing the whole jingle, rewritten. It is, for once, actually good.",
      "Brahm walks past the party in a cardigan. Henny holds her comb-size form up to his head and starts writing.",
      { text: "Name. Business. Comb size...", thought: "Henny" },
      { text: "...Forget it. I'm off duty.", say: "Henny" },
    ],
    credit: "Guest-starring HENNY as the Real Guard",
    tone: "allies",
  },
  smitten: {
    series: "RADIOACTIVE ROOSTER ROMANCE ANNUAL",
    title: "NEXT FAIR, BIG GREEN",
    splash: "bg/cover-hero", // panel art to come: these panels show Ben-Day dots under their captions
    blurb: "She stole the Yolk... but he stole her heart!",
    art: "Dawn on the rooftop coop. Two masked lovebirds beak to beak inside a big pink heart.",
    panels: [
      "Dawn. She has the getaway car drop her at the corner and climbs up to the coop instead of running. Across the street, Gizzard plays something sweet, in a major key, through the club's open window.",
      "Two gloved fingers touch the ticket. The halves fit. \"Nobody's ever said no to me nicely before.\" Beaks bump. Both googly pupils spin. Neither eye was looking. Didn't matter.",
      "A soft, real kiss as the sun clears the water tower. Down below, little hearts pop over Mortgage the goat.",
      "\"Next fair, Big Green. Save me a seat.\" Over her shoulder, softly: \"Bye, B.O.\" He glides beside her a few seconds, red webbing glowing, then lets her go.",
      { text: "...About time.", say: "Henny" },
    ],
    tone: "smitten",
  },
  showboat: {
    series: "RADIOACTIVE ROOSTER #1 · MISPRINT EDITION",
    title: "ROOSTER SAVES EGG, NOT FACES!",
    // Oct 21 item 19: a Silver Age cover too. Splash = the kick off the vat rim, a wave of oil over the front row
    // (bg/cover-showboat, tools/sprites/cut_oct21.py); the beats are painted inset panels (bg/cover-showboat-1..4).
    splash: "bg/cover-showboat",
    blurb: "Collectors' item! Oil stains included!",
    art: "Rooster mid-crow, very proud. Behind him, a front row wearing the fryer.",
    panels: [
      { text: "The town hoses itself off by the ferris wheel.", art: "bg/cover-showboat-1" },
      { text: "Ned reviews the hot sauce: \"Tasted like humiliation.\"", art: "bg/cover-showboat-2" },
      { text: "You've got oil on your beak.", say: "Henny", art: "bg/cover-showboat-3" },
      { text: "Under the boardwalk lights, his own poster, face down in the oil. Somebody stepped on the beak.", art: "bg/cover-showboat-4" },
    ],
    tone: "showboat",
  },
  darkside: {
    series: "THE COCK & HAWK #1",
    title: "PARTNERS IN GRIME",
    blurb: "What if... the Rooster said yes?",
    art: "New neon over the Pavilion: THE COCK & HAWK. Rooster in an apron, working her fryer.",
    panels: [
      "Two voices. One county. Nobody ever tells them no again.",
      "The panel tears in half. \"That's not how it goes. Not for him.\"",
    ],
    tone: "darkside",
    rewind: true,
  },
  eggfried: {
    series: "RADIOACTIVE ROOSTER #1",
    title: "HARD-BOILED",
    stamp: "CANCELLED",
    blurb: "The oil got there first.",
    art: "One very crisp Yolk of Midnight.",
    panels: ["Try the crow-down again. The comebacks you learned are still yours."],
    tone: "eggfried",
    retry: true,
  },
};

// NED'S FEED & SEED neon: which letters stay lit at each temptation level (0..3+). Never labeled in game.
export const FEEDSEED = {
  text: "NED'S FEED & SEED",
  lit: [
    null, // all lit
    [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15], // NED'S F ED & SEE
    [1, 2, 3, 4, 6, 7, 9], // ED'S FE D
    [6, 8, 9], // F ED -> FED, plus the red hawk
  ],
};

// Endings where Rooster gets the Yolk: its real power is hearing chickens, so Henny's line is SPOKEN there
// (say: "Henny"), the first time he ever hears her. Everywhere else she only thinks (thought: "Henny").
export const VAT_STATES = ["simmer", "gentle", "boil", "rolling"];

export const KINDNESS = ["kind_henny", "kind_deejay", "kind_goat", "kind_pip"];

function spot(partial) {
  return partial;
}

// A walk along waypoints as a cue `seq` (Push A, Oct 24): one step every STEP ms, the walk frames alternating, facing
// the way she's heading. frames: { r: [...], l: [...] }.
// Oct 23 items 33/42: the clock shimmy (midway.cutscenes.shimmy). The post is at plate x ~125; frame a has its glove on
// the post 37 px from its left edge and 33 px above its feet, frame b 34 px / 12 px (its anchor is 30): so for a glove
// height g, a stands at [125, g + 33] and b at [121, g + 12]. Hand over hand from g 108 to g 60, up behind the clock.
const SHIMMY = (() => {
  const keys = [[0, ["rooster-walk-l", "rooster-side-l"], [168, 146], [140, 142], 700]];
  let t = 700;
  const gs = [108, 102, 96, 90, 84, 78, 72, 66, 60];
  gs.forEach((g, i) => { keys.push([t, i % 2 ? "rooster-shimmy-b-r" : "rooster-shimmy-a-r", i % 2 ? [121, g + 12] : [125, g + 33]]); t += 260; });
  t += 700; // the nudge at the top (a, glove at 60, just under the housing; he reaches round behind it)
  keys.push([t, "rooster-shimmy-a-r", [125, 60 + 33], [125, 141], 550]);
  t += 650;
  keys.push([t, ["rooster-walk-r", "rooster-side-r"], [140, 142], [168, 146], 650]);
  t += 650;
  // the clock housing (cut from the plate) is drawn over him for the beat: he goes up behind it
  // heroZ: in front of the vendor (who stands before the post) but under the clock cutout (950)
  return { ms: t, heroH: 88, heroZ: 900, hero: keys, props: [{ art: "fg/midway--clock", at: [108, 10] }], events: [[700 + 260 * gs.length + 250, { sound: "click" }]], end: { hero: [168, 146], face: "l" } };
})();

function walkSeq(points, frames, speed = 60) {
  const STEP = 120, out = [];
  let n = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1], points[i]];
    const steps = Math.max(1, Math.round((Math.hypot(b[0] - a[0], b[1] - a[1]) / speed) * 1000 / STEP));
    const f = frames[b[0] >= a[0] ? "r" : "l"];
    for (let k = 1; k <= steps; k += 1) {
      out.push([f[n % f.length], STEP, [Math.round(a[0] + ((b[0] - a[0]) * k) / steps), Math.round(a[1] + ((b[1] - a[1]) * k) / steps)]]);
      n += 1;
    }
  }
  return out;
}

// Oct 21 item 14: Pip tiptoes behind the side rope to the corn-dog cart (Marge has her back to her), lifts Corny's key
// ring off the hook and tiptoes back with it, keys first (pip-sneak = with the keys, pip-sneak2 = without).
// Push A: a real two-frame sneak walk both ways, not a slide.
const PIP_SNEAK = {
  walk: ["pip-sneak-r", "pip-sneak2-r"], to: [206, 138], ms: 1700,
  seq: [["pip-sneak2-r", 500], ["pip-sneak-l", 260], ...walkSeq([[206, 138], [176, 138], [146, 137], [122, 140]], { r: ["pip-sneak-r", "pip-sneak2-r"], l: ["pip-sneak-l", "pip-sneak2-l"] }, 45)],
};
// Oct 23 item 38: she walks round the side rope's back post to the front of the lock post, unlocks it with her hand
// on the padlock (pip-reach-r: hand at +18, 37 up; the padlock is at ~(102, 138)), then walks back to her spot.
const PIP_PATH = [[122, 140], [156, 141], [156, 150], [124, 176], [84, 175]];
const PIP_UNLOCK = {
  seq: [...walkSeq(PIP_PATH, { r: ["pip-walk-r", "pip-side-r"], l: ["pip-walk-l", "pip-side-l"] }),
    ["pip-reach-r", 1100, [84, 175]],
    ...walkSeq([...PIP_PATH].reverse(), { r: ["pip-walk-r", "pip-side-r"], l: ["pip-walk-l", "pip-side-l"] }),
    ["pip-front", 1, [122, 140]]],
};

export const ROOMS = {
  hq: {
    id: "hq",
    name: "Rooftop coop",
    plate: "bg-hq.jpg",
    hero: { at: [122, 156], height: 96, depth: { horizon: 99 } }, // depth: height scales with feet y, 96 at y 156 (hatch lid perspective gives horizon ~99); starts beside the hatch he climbed out of
    // Walking Rooster: feet [x, y]. Door 92 px (y 55-147): his hood (~84) stands just under it. Crate (x<34) off limits.
    // The roof hatch is a raised box (x149-255, front corner at the plate bottom): never on it. He goes round it behind,
    // on the strip of roof between the hatch and the parapet (y>=134.5, in front of the clothes-line post), where the
    // hatch cutout covers his boots; findPath (js/walk.js) routes him round. He can step behind the bucket (y<173).
    walk: [
      [[40, 150], [143, 150], [146, 154], [146, 160.5], [200, 177], [40, 177]], // left: door, board, in front of the hatch's left face
      [[143, 150], [146, 140], [152, 134.5], [258, 134.5], [262, 150], [258, 152], [254, 150.5], [230, 143.3], [204, 135.5],
        [200, 135.9], [185, 141.3], [166, 148], [150, 154], [146, 154]], // behind the hatch
      [[258, 150], [302, 150], [302, 166], [262, 168], [255, 177], [227, 177], [258.5, 154]], // right: behind/beside the bucket, in front of the hatch's right face
    ],
    sign: { art: "fx/neon-hq", rect: [293,  53,  27,  18], frames: [6, 7, 8, 9, "hawk"] }, // NED'S FEED & SEED neon painted into the plate (rooftop board on the distant town house); per-letter glow frames (tools/neon/paint_neon.py)
    states: [
      // Bulb taken: the coop lamp is dark. Relit plate (tools/bg/relight_hq.py): moonlight only, the window and the
      // town still glow; the sprites drop into it with a cooler, darker tint.
      { flag: "got_bulb", plate: "bg/hq-dark", spriteTint: { brightness: 0.74, saturate: 0.78, contrast: 0.96 } },
    ],
    occluders: [
      { id: "bucket", base: 173 },
      // fg/hq--hatch is ONE cutout, never split: he's wholly behind it while his feet are behind its front edge
      // (the polyline under the lid, sampled at his feet x, clamped to the hatch's ends), wholly in front otherwise.
      // One decision per feet position, so no column stripes of him through it and no flicker while he walks.
      { id: "hatch", base: 177, edge: [[149.5, 158], [165, 163], [185, 169.5], [205, 176], [211, 177.5], [221, 176.5], [240, 163], [254.5, 153.5]] },
    ], // fg/hq--bucket: drawn over him while his feet are behind its base (tools/bg/occluders.py)
    exits: [{ spot: "hatch", label: "Down the hatch" }],
    spots: [
      spot({
        id: "bucket",
        name: "bucket",
        rect: [261, 136, 38, 38],
        // Arlong 2026-10-18: "for this instance let him stand behind the bucket". Upstage of it, side-on facing left
        // (his front frame's claws poke out past the rim): the bucket covers his boots and shins cleanly, nothing
        // sticks out below the rim. Exempt from the stand-beside rule (js/walk.js standFor).
        stand: [281, 158], beside: false, standBehind: true, face: "l",
        look: { special: "read_note" },
        take: "He leaves the bucket. The note is already stuck in his head.",
        talk: "\"Whoever you are, friend, I'm coming.\" The bucket does not confirm it's a friend.",
        push: "It rocks. The note doesn't get any friendlier.",
        use: "He puts the bucket on his head. Visibility: zero. Mystery: unchanged. He takes it off.",
        useAny: "He drops the {item} in the bucket, then fishes it back out. The bucket was never the clue. The note was.",
      }),
      spot({
        id: "board",
        name: "conspiracy board",
        rect: [98, 80, 57, 58],
        stand: [126, 152], // in front of the hatch line
        look: { special: "look_board" },
        useItem: { "*": { special: "pin_board" } },
        talk: "He asks the board who did it. The red string points at the goat. It always points at the goat.",
        push: "A pin falls out. The goat photo swings. It still looks guilty.",
        take: "\"Uhhh, I can't fit that in my suit.\" He tries anyway. The red string gets involved. For one second, he IS the conspiracy.",
        use: "He runs one more string from WHO TOOK THE YOLK? to the goat photo. That's eleven strings to the goat. The goat is winning.",
      }),
      spot({
        id: "door",
        name: "coop door",
        rect: [56, 55, 38, 92],
        stand: [75, 152], // in front of the hatch line
        look: "His coop. Headquarters, autograph storage, and a cot. A lamp's on inside like somebody's home. Somebody is: him.",
        use: { special: "coop_photo" },
        take: { special: "coop_photo" },
        talk: "\"Back by midnight.\" The coop has heard that before.",
        push: "The door swings in. Inside, a stack of signed photos waits for anybody who might need cheering up.",
        useAny: "He holds the {item} up to the coop door. The door has seen weirder things. It lives with him.",
      }),
      spot({
        id: "lamp",
        name: "coop lamp",
        rect: [74, 26, 22, 18],
        stand: [85, 152], // in front of the hatch line
        whenNot: "got_bulb",
        look: "A lamp over the door, the only light on the roof. Rad-Safe Rule 4: always carry a spare bulb. He keeps meaning to buy one.",
        take: [
          {
            give: ["bulb"],
            set: ["got_bulb"],
            mood: "embarrassed",
            anim: { hero: "juggle" }, // Oct 21 note 2: the hot-bulb juggle, hand to hand
            say: "He unscrews the bulb. \"Ooh, ouch, ah, ah! Hot bulb! Who uses tungsten bulbs anymore?!\" He juggles it glove to glove until it stops glowing.",
          },
          "The roof drops into moonlight. Rule 4, technically honored: now he's carrying a spare.",
        ],
        talk: "\"Good work tonight, lamp.\" It hums. Honestly, it's the most reliable member of the team.",
        use: "He flicks it off and on. Rad-Safe Rule 9: check your lighting. Rules 5 through 8 were never written down.",
        push: "He nudges the shade. The moths reorganize into a new government.",
        useAny: "He shows the {item} to the lamp. It lights it beautifully. That's all a lamp can do, and it does it well.",
      }),
      spot({
        id: "lamp-off",
        name: "dark lamp",
        rect: [74, 26, 22, 18],
        stand: [85, 152],
        when: "got_bulb",
        look: "The coop lamp, dark. Its bulb is in his pocket. The moon is doing the lighting now, and it doesn't do requests.",
        take: "He's already got the bulb. The shade can stay. It doesn't go with the suit.",
        talk: "\"Sorry, lamp. Duty calls.\" It says nothing. It never did, but now it says it in the dark.",
        use: "He flicks the switch. Nothing. He knows exactly where the bulb is. It's in his pocket.",
        push: "He nudges the shade. It creaks round in the dark. The moths have moved to the window.",
        useAny: "He holds the {item} up to the dark lamp. Nobody can see it. Not even him.",
      }),
      spot({
        id: "crate",
        name: "old crates",
        rect: [0, 118, 32, 38],
        whenNot: "got_geiger",
        look: "Crates stenciled RAD-SAFE. A geiger counter is asleep on top, tired of good news.",
        take: {
          give: ["geiger"],
          set: ["got_geiger"],
          say: "The geiger counter. It clicks near the Yolk of Midnight. It also clicks near him, a little. He has decided not to think about that.",
          sound: "geiger",
        },
        talk: "\"At ease, crates.\" The crates were already at ease. They're crates.",
        use: "He sits on the crates for a heroic think. The think comes up empty, but his posture is excellent.",
        push: "He shoves the crates. Under the RAD-SAFE stencil, older paint: PROPERTY OF THE COUNTY FAIR. He shoves them back.",
        useAny: "He files the {item} in a crate marked EVIDENCE (MISC.), then takes it back out. Evidence works better in a pocket.",
      }),
      spot({
        id: "laundry",
        name: "laundry line",
        rect: [119, 30, 36, 36],
        stand: [137, 152], // in front of the hatch line
        look: "Three towels on the line. One is monogrammed in gold thread. He has never explained it to anyone, and nobody has ever seen it but the moon.",
        take: "Not in the suit. A hero does not carry a towel. (A hero should, honestly.)",
        talk: "The towels flap. They know things.",
        use: "He dabs his brow through the mask with a towel. It accomplishes nothing, but it feels like a training montage.",
        push: "The towels swing. The gold monogram turns toward the street. He turns it back to face the wall.",
        useAny: "He clips the {item} to the line next to the towels. It doesn't dry any faster. He unclips it.",
      }),
      spot({
        id: "tower",
        name: "water tower",
        rect: [158, 4, 52, 70],
        stand: [140, 152], // in front of the hatch line
        look: "The water tower. The left eye is looking at it. The right eye is looking at a different water tower.",
        talk: "The tower keeps his secrets, mostly by being a tower.",
        push: "It's a water tower.",
        take: "He'd need a bigger suit. And a bigger belt. And a crane.",
        use: "No time to climb it. He salutes it instead, and one eye even lands on it.",
        useAny: "He holds the {item} up to the water tower. From down here, it's a very small gesture.",
      }),
      spot({
        id: "hawk",
        name: "red neon hawk",
        rect: [232, 68, 22, 24],
        stand: [262, 152], // in front of the hatch line
        look: { special: "look_hawk_far" },
        talk: "He doesn't call across town to it. He thinks about it, though.",
        take: "It's across town, it's neon, and it isn't his. Three strikes.",
        use: "He makes a little hawk shape with his gloves. It comes out more like a duck. He stops.",
        push: "He'd have to push a whole town out of the way. He pushes the thought away instead.",
        useAny: "He holds the {item} up toward the red hawk across town, like it might want it. It glows the same either way.",
      }),
      spot({
        id: "wheel",
        name: "the fair",
        rect: [258, 52, 36, 38],
        stand: [280, 152], // in front of the hatch line
        look: "The County Fair. One ferris wheel, a thousand bulbs, and a fry-off at midnight. Six hours. Plenty of time to be good at something.",
        talk: "\"Hang on, fair. I'm coming.\" Six hours to midnight. The wheel turns like it heard him. It didn't.",
        take: "Uhhh, the whole fair? He checks his belt. The belt says no.",
        use: "Not from up here. He'd need the farm road, the town, and a plan. Mostly the plan.",
        push: "He leans toward the fair like it'll get him there faster. It doesn't. The hatch would.",
        useAny: "He waves the {item} at the distant ferris wheel. Somewhere a carny waves back, probably at somebody else.",
      }),
      spot({
        id: "hatch",
        name: "roof hatch",
        rect: [152, 133, 104, 38],
        stand: [170, 172], // in front of its left face, never on the lid
        exit: true,
        look: "The hatch down to the stairwell and the fire escape. The farm road is at the bottom.",
        talk: "The hatch doesn't do banter.",
        go: {
          needFlag: "read_note",
          blocked: "The bucket first. Somebody left a note, and a hero reads his mail.",
          room: "fence",
          pose: null,
          mood: "talk",
          say: "Down the hatch, along the gutter, down the fire escape. The red webbing under his arms twitches for the last drop. He doesn't let it out. He climbs. He hasn't glided since that night.",
        },
        useAny: "He thinks about dropping the {item} down the hatch to save time. Then he'd have to go get it. No time saved.",
      }),
      // Oct 21 item 21: an Act 1 memory (a red herring, not a puzzle): the golden hawk feather on the coop windowsill
      spot({
        id: "feather",
        name: "coop window",
        rect: [62, 58, 24, 30],
        look: "On the sill inside, in a jam jar: one golden hawk feather. Hattie left it the night they split. He's moved it twice. Both times he put it back.",
        talk: "\"Evening.\" He says it to the feather. The feather, being a feather, lets it go.",
        take: "He reaches for it and stops. Some things stay where she left them.",
        use: "He breathes on the glass and wipes it with his glove. Now the feather's clearer. That doesn't help.",
        push: "He nudges the window. The jar doesn't move. Neither does he, for a while.",
        useAny: "He holds the {item} up to the window, next to the feather. Neither one explains anything.",
      }),
    ],
  },
  fence: {
    id: "fence",
    name: "Fence line",
    plate: "bg-fence.jpg",
    // Crossroads pixel bg (Arlong's approved fence.jpg, 2026-10-18). Far scene: the split-rail fence (posts ~23 px, base y ~110,
    // top rail ~17 px above the ground) sits at his waist-to-chest when he stands at it, so he's ~30 px there.
    hero: { at: [170, 152], from: { hq: { at: [4, 150], walk: [40, 150] } }, height: 60, depth: { horizon: 68, min: 28, max: 80 } }, // from the rooftop he comes in from the left edge (Oct 21 note 5) // ~30 at the fence (y 110), 36 at Henny's crate, ~80 at the bottom edge
    // In front of the fence (base y ~110, ~102-105 at the right end), never through the crate; a slot behind the crate;
    // up the Main Street road past the fence end; the ditch, reeds and bank (bottom right) are off limits.
    walk: [
      [[6, 112], [101, 112], [101, 118.5], [122, 118.5], [122, 112], [240, 112], [250, 107.5], [276, 105.5], [296, 104.5], [300, 99], [307, 93], [318, 90], [318, 117], [285, 119], [262, 127], [249, 139], [243, 158], [238, 178], [6, 178]],
      [[96, 111.5], [127, 111.5], [127, 113.5], [96, 113.5]],
    ],
    occluders: [ // fg/fence--<id> cutouts (tools/bg/occluders.py)
      { id: "crate", base: 117 },
      { id: "post-end", base: 102 },
    ],
    cast: [
      { spot: "henny", sprite: "henny-front", at: [128, 116], half: true }, // a real hen at her checkpoint, knee-high (9 px) to him at that spot (~36); drawn only over real art (?cast forces)
      // The yard roosters ("the professionals"), perched on the lower rail of the yard fence: side, peck, side, crow.
      { spot: "birds", sprite: "yardrooster-side-r", at: [58, 104], height: 10, every: 900,
        frames: ["yardrooster-side-r", "yardrooster-peck-r", "yardrooster-side-r", "yardrooster-crow-r"] },
      { spot: "birds", sprite: "yardrooster-peck-l", at: [78, 108], height: 12, every: 1100,
        frames: ["yardrooster-peck-l", "yardrooster-side-l", "yardrooster-crow-l", "yardrooster-side-l"] },
    ],
    sign: { art: "fx/neon-fence", rect: [264,  49,  32,  18], frames: [6, 7, 8, 9, "hawk"] }, // NED'S FEED & SEED neon painted into the plate (billboard on legs over the distant Main Street roofline); per-letter glow frames (tools/neon/paint_neon.py)
    // Sitting on the top rail between the left posts (rail top y91, posts x56-59 and x89-91), among the yard roosters:
    // seat row on the rail line, boots dangling in front of the lower rail. Painted sit frames (tools/sprites/cut_sit.py):
    // side sit facing the way he came, the hop on the way down and up, the front sit when there's no facing (a loaded save).
    poseAt: { squat: { sit: "rooster-sit", hop: "rooster-sithop", front: "rooster-sit-front", x: 70, seat: 91, standY: 112 } },
    exits: [
      { spot: "to-hq", label: "Rooftop" },
      { spot: "door", label: "Henhouse" },
      { spot: "to-barn", label: "Barn" },
      { spot: "to-main", label: "Main Street" },
      { spot: "to-ditch", label: "Ditch road" },
    ],
    spots: [
      spot({
        id: "birds",
        name: "yard roosters",
        rect: [49, 92, 40, 18],
        useItem: { photo: { say: "He holds the photo out to the yard roosters. One pecks the signature, decides it isn't corn, and goes back to standing like a rooster. Brutal crowd." } }, // he keeps the stack: everybody gets one
        look: "Round. Cheeks full. Quiet. Employed. That's the whole job and they're good at it.",
        talk: "They're busy looking like roosters. It's a skilled trade.",
        use: { special: "squat_rail" },
        take: "He doesn't take a rooster. Roosters are colleagues. Sort of. These ones are better at it.",
        push: "He nudges one. It doesn't move. It doesn't even look. That's professionalism.",
        useAny: "He offers the {item} to the yard roosters. They stay round and quiet. They don't need props. That's the whole lesson.",
      }),
      spot({
        id: "rail",
        name: "top rail",
        rect: [0, 84, 246, 11],
        stand: [72, 113],
        look: "A rail worn smooth by honest poultry. It has never held a utility belt.",
        use: { special: "squat_rail" },
        push: "The rail is already committed.",
        talk: "Talking to furniture is how cover gets blown.",
        take: "It's a fence rail, not a souvenir. Henny would put him on the form.",
        useAny: "He sets the {item} on the rail. The rail holds it with the same quiet dignity it holds everything.",
      }),
      spot({
        id: "door",
        name: "henhouse door",
        rect: [16, 56, 42, 26],
        exit: true,
        stand: [150, 113], // through the gate, past Henny
        look: "Dark inside. Warm straw. A hint of lipstick, which is not a hen product.",
        talk: "Doors are a quiet people.",
        go: { special: "coop_door" },
        useAny: "He knocks on the henhouse door with the {item}. Henny's eyes find him from across the yard. He stops knocking.",
      }),
      spot({
        id: "to-barn",
        name: "path to the barn",
        rect: [114, 50, 44, 28],
        exit: true,
        stand: [155, 113],
        look: "The barn light is on. Somebody in there owns a ribbon and a goat named Mortgage.",
        go: { room: "barn", pose: null, say: "Across the yard. The barn smells like hay and unfinished arguments." },
        talk: "\"Coming, Mortgage!\" Somewhere across the yard, a goat decides not to care.",
        useAny: "He points the {item} at the barn like a compass. The barn stays where it is, which is helpful of it.",
      }),
      spot({
        id: "gate",
        name: "gate",
        rect: [143, 86, 24, 25],
        look: "A split-rail gate on a loop of baling wire. Past it: the yard, the henhouse, the barn. Henny's checkpoint decides who goes through.",
        talk: "The gate has no opinion. Henny has all of them.",
        use: { special: "coop_door" },
        push: { special: "coop_door" },
        take: "It's on hinges, it's on baling wire, and it's on Henny's watch. Not happening.",
        useAny: "He holds the {item} up at the gate like a pass. The gate has no slot. The checkpoint is the hen.",
      }),
      spot({
        id: "crate",
        name: "checkpoint crate",
        rect: [100, 95, 23, 23],
        look: "Henny's checkpoint: an upturned crate with a clipboard. The form has three lines. Name. Business. Comb size.",
        take: "It's an official document. Henny would know.",
        use: "Name: Rooster. Business: ...He puts the pencil down. Henny is watching.",
        talk: "The clipboard has heard every excuse in the county.",
        push: "He nudges the checkpoint crate. Henny's head swivels. He un-nudges it, very carefully.",
        useAny: "He sets the {item} on Henny's clipboard like paperwork. There's no line on the form for that.",
      }),
      spot({
        id: "henny",
        name: "Henny",
        rect: [120, 104, 16, 13],
        look: "Henny runs this door like a nightclub that only admits spheres. She never says a word. She has never needed to.",
        talk: { special: "talk_henny" },
        use: "She doesn't want to be used. She wants a normal rooster on that rail.",
        useItem: { photo: { special: "photo_henny" } },
        take: "You don't pick up the law. Henny gives him a look that could stamp a passport.",
        push: { special: "push_henny" },
        useAny: "He offers Henny the {item}. She looks at it, then at him, then at the rail. Wrong paperwork.",
      }),
      spot({
        id: "signpost",
        name: "signpost",
        rect: [218, 52, 22, 58],
        look: "Four arrows on one post: HENHOUSE, BARN, MAIN ST., DITCH RD. Tacked under them, a weathered county map with the fair circled in red.",
        talk: "It already told him everything it knows.",
        take: "It's load-bearing. The whole county would get lost.",
        use: "He follows all four arrows in his head at once. Both eyes cooperate for once. Then they don't.",
        push: "It leans a little toward MAIN ST. He straightens it. A hero leaves the county the way he found it.",
        useAny: "He holds the {item} up to the county map. There's no arrow for it. There's never an arrow for the important stuff.",
      }),
      spot({
        id: "to-main",
        name: "Main Street",
        rect: [296, 58, 24, 40],
        exit: true,
        look: "Main Street: the Feed & Seed, and WKUK's radio tower blinking red over the rooftops.",
        go: { room: "store", pose: null, say: "Down Main Street, under the NED'S FEED & SEED sign." },
        talk: "\"Evening, Main Street.\" The Feed & Seed sign buzzes. WKUK's tower blinks. That's practically a conversation.",
        useAny: "He shows the {item} to Main Street. Main Street has seen it all, mostly on sale at Ned's.",
      }),
      spot({
        id: "to-ditch",
        name: "ditch road",
        rect: [248, 118, 72, 62],
        exit: true,
        stand: [300, 114],
        look: "The ditch road follows the reeds out toward the back of the fairgrounds. Frogs, mud, and nobody watching.",
        go: "Not yet. The ditch road ends at the fair's back fence, and he doesn't have a way in until WKUK. Town first.",
        talk: "\"Not tonight, frogs.\" The frogs disagree, loudly and at length.",
        useAny: "He thinks about tossing the {item} in the ditch for luck. Rad-Safe Rule 2: never feed the ditch.",
      }),
      spot({
        id: "to-hq",
        name: "way up",
        rect: [0, 112, 12, 30],
        exit: true,
        look: "Back up to the roof and the conspiracy board.",
        go: { room: "hq", pose: null, say: "Back up the fire escape to the coop. The board is waiting for string." },
        talk: "\"Be right back, board.\" The board can't hear him from here. It knows anyway.",
        useAny: "He could carry the {item} back up to the board, but it'll keep. Clues are patient. Midnight isn't.",
      }),
    ],
  },
  henhouse: {
    id: "henhouse",
    name: "Henhouse",
    plate: "bg-henhouse.jpg",
    // Henhouse A (2026-10-18), now a walk-in room: h96 at the front edge, h80 at the wall line (y128); horizon -158.
    hero: { at: [70, 178], height: 96, depth: { horizon: -158 } },
    walk: [[[8, 128], [280, 128], [284, 140], [314, 140], [314, 179], [8, 179]]], // the straw floor; off the nest row (base y122) and the roost ladder's foot (y137)
    cast: [{ spot: "hen", sprite: "sittinghen-idle-l", talk: "sittinghen-cluck-l", talkOn: "hen", at: [212, 107], height: 22 }], // in the box next to Midnight's
    overlays: [
      { art: "fg/henhouse--spoon", at: [132, 70], whenNot: "got_spoon" }, // on the nest-box shelf
      { art: "fg/henhouse--stub", at: [196, 69], whenNot: "got_stub" },
      { art: "fg/henhouse--grub", at: [221, 104], when: "hen_up", whenNot: "got_grub" }, // freed when she shifts onto the photo
    ],
    spriteTint: { brightness: 0.72, saturate: 0.8, sepia: 0.15, hue: -4 }, // lantern-dim coop: sprites sink into the warm dark
    exits: [{ spot: "back", label: "Fence" }],
    spots: [
      spot({
        id: "spoon",
        name: "tasting spoon",
        rect: [126, 62, 28, 16],
        stand: [140, 132],
        whenNot: "got_spoon",
        look: "Silver, monogrammed C.G., recently in a mouth that was not a hen's.",
        take: {
          give: ["spoon"],
          set: ["got_spoon"],
          say: "The tasting spoon. C.G. on the handle. She practiced here, and she brought her own silver.",
        },
        talk: "\"Who do you belong to, little spoon?\" The spoon says C.G., in engraved silver. That's an answer.",
        use: "He doesn't taste with it. A hero doesn't put a suspect's spoon in his beak. Also, the mask has no mouth hole.",
        push: "He nudges the spoon. It clinks against the nest box like a very small alarm.",
        useAny: "He taps the spoon with the {item}. Ting. Fancy. Even the noise is fancy.",
      }),
      spot({
        id: "stub",
        name: "torn ticket",
        rect: [189, 61, 24, 18],
        stand: [201, 132],
        whenNot: "got_stub",
        look: "Half a fair ticket with a lipstick kiss on it. Left where he'd find it.",
        take: {
          give: ["stub"],
          set: ["got_stub"],
          say: "He squints through the nostril holes at the tiny print. \"R— & H— Admit Tw—\". He goes quiet for a while. He knows who tore this ticket. He did.",
          mood: "embarrassed",
        },
        talk: "He reads the stub out loud, very quietly. \"R— & H—.\" Then he stops reading out loud.",
        use: "He holds the stub up to the light. The lipstick kiss holds still. It always did.",
        push: "He nudges the stub with one glove. It doesn't blow away. It was left to stay.",
        useAny: "He sets the {item} next to the stub. They don't match. Only one thing in this county matches that stub.",
      }),
      spot({
        id: "warm",
        name: "Midnight's empty nest",
        rect: [154, 80, 38, 30],
        stand: [172, 132],
        look: { special: "look_box" },
        take: "Heat is a rude thing to pocket.",
        use: "His gloves are warm already. His conscience is working on it.",
        talk: "\"Where'd you go, Midnight?\" The empty nest stays warm and says nothing, like a good witness.",
        push: "He nudges the straw. Underneath: one long red feather. Not a hen feather. He puts the straw back.",
        useAny: "He sets the {item} in Midnight's nest. It doesn't hatch. He takes it back, slightly disappointed.",
      }),
      spot({
        id: "hen",
        name: "sitting hen",
        rect: [196, 80, 26, 30],
        stand: [212, 132],
        look: "A dreamy fangirl of a hen, sitting on a grub like it's a secret. She's staring at his mask with her whole heart.",
        talk: "She swoons a little. Conversation isn't the currency here. Autographs might be.",
        take: "She pecks the glove. The glove files a complaint.",
        useItem: {
          photo: { // he keeps his stack: a fresh one off the top, signed on the spot (Arlong 2026-10-19)
            set: ["hen_up"],
            unlessFlag: "hen_up",
            already: "She's already sitting on his face. Once is a compliment. Twice is a residency.",
            say: "He peels a fresh one off the stack, signs it \"To my biggest fan\" and slides it under her. She shifts onto it, overcome. The grub is free, and somewhere a hen is very seen.",
          },
        },
        use: "She's a hen, not a cushion. Also, she's already sitting. The job is taken.",
        push: "He nudges her. She swoons harder. That's the opposite of what he wanted.",
        useAny: "She glances at the {item}, then back at his mask. She doesn't want that. She wants him. On paper. Signed.",
        alt: [{
          when: "hen_up", // she shifted onto the signed photo: the grub's out from under her
          name: "starstruck hen",
          look: "She's settled on his signed photo like it's a throne and she's the queen of it. The grub is no longer her problem, or anybody's secret.",
          talk: "\"Enjoying the photo?\" She closes her eyes and sighs. That's a yes. That's a forever yes.",
          take: "She tucks the photo under her and gives him a look. It's hers now. That's how autographs work.",
          use: "She's sitting on his face, in a nice way. Any more help and it gets weird.",
        }],
      }),
      spot({
        id: "grub",
        name: "fat grub",
        rect: [217, 98, 16, 14],
        stand: [228, 132],
        when: "hen_up",
        whenNot: "got_grub",
        look: "A fat grub, suddenly unemployed.",
        take: {
          give: ["grub"],
          set: ["got_grub"],
          say: "A fat grub. It will change a goat's whole evening.",
        },
        talk: "\"You're free, little guy.\" The grub wiggles toward freedom at the top speed of a grub.",
        use: "He has no idea what you'd use a grub for. A goat might.",
        push: "He nudges the grub. It wiggles, indignant. It's had a big night.",
        useAny: "He offers the {item} to the grub. The grub has no hands and no interest.",
      }),
      spot({
        id: "back",
        name: "door back",
        rect: [4, 38, 32, 92],
        stand: [22, 134],
        exit: true,
        look: "Out to the rail, where the professionals are still squatting.",
        go: { room: "fence", pose: null, say: "Out to the fence line. Henny pretends she never let him in." },
        talk: "\"Thanks for having me, ladies.\" The hen swoons. The straw stays professional.",
        useAny: "He waves the {item} at the door like a key. It's a door. It's already open.",
      }),
    ],
  },
  barn: {
    id: "barn",
    name: "Barn",
    plate: "bg-barn.jpg",
    // Barn C (2026-10-18): h96 at the front edge (y178), h80 at the wall line (y128); horizon -158.
    hero: { at: [186, 178], height: 96, depth: { horizon: -158 } },
    walk: [[[8, 128], [312, 128], [312, 179], [8, 179]]], // the barn floor; the pen, post, ladder, hay and bench all stand against the back wall (bases y122-128)
    cast: [
      { spot: "goat", sprite: "mortgage-idle-r", talk: "mortgage-chew-r", voice: "goat", at: [93, 137], height: 44 }, // loose in front of the pen
      { spot: "peck", sprite: "peck-front", talk: "peck-talk", voice: "peck", at: [237, 139], height: 80 }, // by the hay and his weather vane
    ],
    overlays: [{ art: "fg/barn--ribbon", at: [154, 26], whenNot: "got_ribbon" }], // on the post nail until Mortgage rams it down
    // Give grub to Mortgage (Arlong 2026-10-18): Rooster the matador (rooster-matador-sprites-v3), up and back right
    // beside the ribbon post (Arlong 2026-10-19: was too low/forward), holds the grub out, she
    // paws and charges along the floor (walk area, y131-137), he sidesteps downstage with a knee-up flourish, she rams
    // the post (BONK!, shake), sees stars, the ribbon flutters down, he picks it up and she gets the grub, then she
    // ambles back to her spot. Input is locked while it plays (js/main.js playCutscene). Sprites take their size per
    // actor: the hero by depth, Mortgage at her barn h44. Keys: [t ms, sprite or [frames], at, to?, ms?].
    cutscenes: {
      grub: {
        ms: 7300,
        hero: [[0, ["rooster-walk-l", "rooster-side-l"], null, [147, 130], 1000], [1000, "rooster-matador-raise-l", [147, 130]],
          [1700, "rooster-matador-stance-l"], [2450, "rooster-matador-flourish-l"], [2650, "rooster-matador-hop-r", null, [182, 134], 350],
          [3000, "rooster-matador-flourish-l"], [3600, "rooster-matador-stance-l"], [4500, "rooster-matador-raise-l"],
          [5000, ["rooster-walk-l", "rooster-side-l"], null, [162, 136], 450], [5450, "rooster-front"]],
        goat: [[0, "mortgage-idle-r", [93, 137]], [1700, ["mortgage-paw-r", "mortgage-idle-r"]], [2500, "mortgage-charge-r", null, [134, 131], 500],
          [3000, "mortgage-bonk-r"], [3500, "mortgage-dazed-r"], [5600, "mortgage-grub-r"],
          [6400, ["mortgage-walk-l", "mortgage-side-l"], null, [93, 137], 800], [7200, "mortgage-idle-r"]],
        props: [{ art: "fg/barn--ribbon", at: [154, 26], fall: [3450, 900, [146, 112]], gone: 5450 }],
        events: [[3000, { fx: "fx/bonk", at: [136, 78] }], [3000, { shake: 350, sound: "bonk" }]],
        end: { hero: [162, 136], face: "front" },
      },
    },
    exits: [
      { spot: "to-fence", label: "Fence" },
      { spot: "to-town", label: "Town" },
    ],
    spots: [
      spot({
        id: "goat",
        name: "Mortgage the goat",
        rect: [70, 95, 48, 43],
        stand: [104, 152],
        look: "Mortgage. Bored, bellied, and smarter than everyone in this barn. Never proven.",
        talk: { special: "talk_goat" },
        useItem: {
          photo: { say: "Mortgage takes the signed photo very gently, looks Rooster in the eye, and eats it. Slowly. Signature last. \"meeeh.\" A review." }, // he keeps the stack: everybody gets one
          grub: {
            consume: ["grub"],
            set: ["got_ribbon"],
            give: ["ribbon"],
            unlessFlag: "got_ribbon",
            already: "Mortgage has already done the crime. Mortgage is retired.",
            cutscene: "grub", // the matador beat (barn.cutscenes.grub) plays first, then this line
            say: "Mortgage takes the grub, sniffs Rooster for a long time, says \"meeeeh,\" and charges the post. The blue ribbon flutters down. Farmer Peck says it looks like rain.",
          },
        },
        take: "Mortgage weighs more than his whole belt and has opinions. Not portable.",
        use: "He tries to ride the goat. Mortgage simply sits down. The ride is over.",
        push: "He pushes Mortgage. Mortgage leans back, harder, on principle.",
        useAny: "Mortgage sniffs the {item}, chews it once for the record, and gives it back. Not a grub.",
      }),
      spot({
        id: "ribbon",
        name: "blue ribbon",
        rect: [148, 20, 24, 28],
        stand: [170, 140],
        look: { special: "look_ribbon" },
        take: "Nailed high. Pride is not a ladder.",
        push: "It flutters. It stays.",
        talk: "\"You've had a big night too, huh.\" The ribbon flutters. GUEST JUDGE. It knows what it is.",
        use: "He can't reach it. The ladder is rotten. The goat, though, is right there and very tall when angry.",
        useAny: "He waves the {item} up at the ribbon. It stays nailed high. Something taller, or angrier, would help.",
        alt: [{
          when: "got_ribbon", // Mortgage knocked it down and it's in his pocket: what's left is the nail
          name: "bare nail",
          look: "A bare nail, high on the post, where GUEST JUDGE used to hang. It looks lighter. Less judgmental. Still pointy.",
          take: "He's not prying a nail out of a barn for a souvenir. The ribbon was the souvenir. The nail was just the frame.",
          push: "He can't reach it. Nobody could, which was the whole point of the nail.",
          talk: "\"You did good, nail.\" Years of holding up other people's prizes. Not one of its own.",
          use: "There's nothing to hang on it. He considers hanging himself up there for a second, as the Best Wattle. Too high.",
          useAny: "He waves the {item} up at the bare nail. The nail has retired from holding things. It held the ribbon. That was its career.",
        }],
      }),
      spot({
        id: "ladder",
        name: "rotten ladder",
        rect: [165, 56, 20, 68],
        stand: [178, 134],
        look: "A ladder in the philosophical sense. In the practical sense, a stack of apologies.",
        push: "Rotten. A hero and a ladder should both be trustworthy. This one isn't.",
        use: "He puts a foot on it. The foot files for divorce.",
        take: "Taking it would only spread the rot.",
        talk: "\"Steady, old-timer.\" The ladder creaks an apology in advance.",
        useAny: "He props the {item} against the ladder like a splint. The ladder is beyond help.",
      }),
      spot({
        id: "peck",
        name: "Farmer Peck",
        rect: [212, 60, 50, 80],
        useItem: { photo: { say: "\"An autograph? Ha! I KNOW that fella!\" Peck holds it to the brass horn like it might talk. \"...Who is it?\" He keeps it anyway. \"Looks like rain on him.\"" } }, // he keeps the stack: everybody gets one
        stand: [200, 150],
        look: "Farmer Peck. Hard of hearing, brass horn, and he only talks about the weather.",
        talk: { special: "talk_peck" },
        use: "He's not a tool. The goat is closer.",
        take: "Farmer Peck is a whole farmer. Also, he's holding a brass horn, and he'd use it.",
        push: { special: "push_peck" },
        useAny: "He shows Peck the {item}. Peck squints at it down the brass horn. \"Looks like rain.\"",
      }),
      spot({
        id: "to-fence",
        name: "yard door",
        rect: [0, 40, 44, 88],
        stand: [24, 132],
        exit: true,
        look: "Back to the fence and Henny's standards.",
        go: { room: "fence", pose: null, say: "Out to the rail." },
        talk: "\"Back soon, Henny!\" She can't hear it from here. She'd judge it anyway.",
        useAny: "He holds up the {item} toward the yard. Henny's checkpoint doesn't take deposits.",
      }),
      spot({
        id: "to-town",
        name: "road to town",
        rect: [284, 50, 30, 76],
        stand: [298, 132],
        exit: true,
        look: "Town. Ned's Feed & Seed, and a radio station that keeps bad hours.",
        go: { room: "store", pose: null, say: "Into town, under the NED'S FEED & SEED sign." },
        talk: "\"Keep the sign lit, Ned.\" The Feed & Seed glows over the trees like it's been waiting.",
        useAny: "He checks the {item} against the road to town. It's not a road thing. Town has people for that.",
      }),
    ],
  },
  store: {
    id: "store",
    name: "Ned's Feed & Seed",
    plate: "bg-store.jpg",
    // Store C (2026-10-18): h96 at the front edge (feet y178), h84 at the counter/door line (y131); horizon -222.
    hero: { at: [250, 178], height: 96, depth: { horizon: -222 } },
    walk: [[[44, 131], [294, 131], [294, 179], [44, 179]]], // the floorboards in front of the counter: off the feed sacks (left) and the barrel (right)
    occluders: [{ id: "counter", base: 128 }], // Ned stands behind it (feet y122)
    cast: [{ spot: "clerk", sprite: "ned-front", talk: "ned-talk", voice: "clerk", at: [180, 122], height: 80,
      // the bell gag (ned-bell-sprites-v1, tools/sprites/cut_matador.py): he walks down the counter to the bell, pulls
      // the screwdriver from his apron, bends and unscrews it (the tip on the bell's base screws at the counter top,
      // y89; the bent frame stands 2 px lower so his hands reach it, the counter still covers him), lifts it (the
      // overlay goes, the same bell is in his hand) and tucks it in his apron pocket
      cues: { ned_bell: { walk: ["ned-walk-l", "ned-side-l"], to: [171, 122], ms: 900,
        seq: [["ned-pull-l", 700], ["ned-twist-l", 260, [171, 124]], ["ned-twist-l", 260, [170, 124]], ["ned-twist-l", 260, [171, 124]], ["ned-twist-l", 260, [170, 124]], ["ned-twist-l", 260, [171, 124]], ["ned-pull-l", 9e9]] },
        ned_pocket: { at: [171, 122], seq: [["ned-bell-l", 1100], ["ned-pocket-l", 9e9]] },
        ned_back: { walk: ["ned-walk-r", "ned-side-r"], from: [171, 122], to: [180, 122], end: "ned-front" } } }],
    // the brass service bell on the counter; it stays put through the last ding and while Ned walks over to it
    overlays: [{ art: "fg/store--bell", at: [145, 82], whenNot: "bell_gone", holdCues: ["ding", "ned_bell"] }],
    fx: { ding: { art: "fx/ding", at: [136, 66] } }, // painted-pixel DING! pop over the bell when it rings
    sign: { art: "fx/neon-store", rect: [196,  13,  61,  16], frames: [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 13, 14, 15, 16, "hawk"] }, // NED'S FEED & SEED neon painted into the plate (one line on Ned's blank plank above the window); per-letter glow frames (tools/neon/paint_neon.py)
    exits: [
      { spot: "to-barn", label: "Barn" },
      { spot: "to-wkuk", label: "WKUK" },
    ],
    spots: [
      spot({
        id: "jars",
        name: "jars",
        rect: [36, 18, 146, 74],
        stand: [110, 134],
        look: "Pickles, nails, and a powder that claims to be flour. The labels gave up years ago.",
        take: "Ned's face says the price is your dignity, and it isn't on sale.",
        talk: "The jars are neutral.",
        use: "He opens a jar marked FLOUR. It is not flour. He closes it fast and doesn't ask.",
        push: "The jars clink together in a nervous little chorus. Ned's eye twitches along.",
        useAny: "He holds the {item} up next to the jars for comparison. It doesn't fit the theme. Nothing in here has a theme.",
      }),
      spot({
        id: "clerk",
        name: "Ned",
        rect: [154, 40, 52, 60],
        stand: [180, 134],
        look: "Ned has priced everything in the county, including trouble. He looks like a man carrying forty gallons of guilt.",
        talk: { special: "talk_clerk" },
        useItem: {
          photo: { say: "Ned takes the photo, turns it over, and pins it to the wall behind the register next to the bounced checks. \"Good likeness. I'll put it with the others who owe me money.\"" }, // he keeps the stack: everybody gets one
          spoon: {
            consume: ["spoon"],
            set: ["traded"],
            give: ["sauce", "mirror", "bill"],
            unlessFlag: "traded",
            already: "He already squared the books with you. Don't make him reopen them.",
            say: "Ned sees the C.G. and goes pale. \"A lady in a beak bought forty gallons of fryer oil off me this afternoon. Paid in cash. I didn't ask what for. I feel sick about it.\" He presses a bottle of hot sauce and a hand mirror on the hero. Then a bill. \"And while you're out saving folks, if you see Brahm Orpington, quiet fella, cardigan, give him this. It's a line item, not a judgment.\"",
            speaker: SPEAKER.clerk,
          },
        },
        take: "Ned isn't for sale. Everything else in here is, including the jars that aren't.",
        use: "\"Ned, buddy, I need a favor.\" Ned taps a little sign: FAVORS ARE A LINE ITEM.",
        push: "He leans on the counter. Ned leans back. It's a stalemate of leaning.",
        useAny: "Ned rings up the {item} out of habit, then voids it. \"That's not store credit, Rooster.\"",
      }),
      spot({
        id: "bell",
        name: "service bell",
        rect: [139, 83, 21, 14],
        stand: [150, 134],
        look: "A brass service bell, screwed to the counter. It has summoned Ned through three wars and one spice recall. Ned has never once been in the back.",
        use: { special: "ring_bell" },
        push: { special: "ring_bell" },
        talk: "He leans in close. \"Ding?\" The bell holds its tongue. It only talks when it's hit, like a lot of folks in this town.",
        take: "It's screwed down. Ned screwed it there himself, during one of the wars. He'd hear a screwdriver from the moon.",
        useAny: "He holds the {item} over the bell, then thinks better of it. Ned's eyebrow is already halfway up. It knows.",
        alt: [{
          when: "bell_gone", // Ned unscrewed it at the sixth ding (js/logic.js ringBell)
          name: "screw holes",
          look: "Two little screw holes and a clean square of counter where the bell used to be. The counter looks naked. Ned looks relieved.",
          use: "He taps the screw holes. No ding. Just a finger on a counter. Ned doesn't even look up, and that's a choice.",
          push: "He presses where the bell was. Silence. It's the loudest thing in the store.",
          talk: "\"Ding,\" he says, quietly, to the holes. Ned turns a ledger page very loudly.",
          take: "There's nothing to take but two holes, and Ned would bill him for those.",
          useAny: "He sets the {item} on the screw holes. It doesn't ding. Nothing dings anymore. He did this.",
        }],
      }),
      spot({
        id: "to-barn",
        name: "back lane",
        rect: [0, 30, 32, 86],
        stand: [46, 140],
        exit: true,
        look: "The lane back to Peck's barn.",
        go: { room: "barn", pose: null, say: "Back toward the barn. Mortgage hasn't written." },
        talk: "\"See you, Mortgage.\" The lane says nothing. The goat, far away, says nothing louder.",
        useAny: "He waves the {item} down the back lane. It's dark down there. It was dark when he came in, too.",
      }),
      spot({
        id: "to-wkuk",
        name: "street door",
        rect: [258, 30, 56, 94],
        stand: [284, 134],
        exit: true,
        look: "The street. WKUK's on-air light stains the wet pavement down the block.",
        go: { room: "wkuk", pose: null, say: "Down the block to WKUK." },
        talk: "\"WKUK, here I come.\" Down the block, the on-air light blinks like it heard.",
        useAny: "He holds the {item} up to the street door. Wet pavement. Red light. No answer.",
      }),
    ],
  },
  wkuk: {
    id: "wkuk",
    name: "WKUK",
    plate: "bg-wkuk.jpg",
    // WKUK C (2026-10-18): same scale as the store, h96 at the front edge, h84 at the wall line (y131); horizon -222.
    hero: { at: [150, 178], height: 96, depth: { horizon: -222 } },
    walk: [[[4, 131], [316, 131], [316, 179], [4, 179]]], // the hall floor in front of the wall (wall meets the floor at y127)
    occluders: [{ id: "booth", base: 128 }], // wall, sill, desk, console, mullion and mic head, in front of DeeJay (feet y110)
    cast: [{ spot: "deejay", sprite: "deejay-front", talk: "deejay-talk", voice: "deejay", at: [174, 110], height: 72 }], // behind the glass at the mic
    sign: { art: "fx/neon-wkuk", rect: [7,  24,  43,  17], frames: [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 13, 14, 15, 16, "hawk"] }, // NED'S FEED & SEED neon painted into the plate (down the side hall, over the notice board: the way back to Ned's); per-letter glow frames (tools/neon/paint_neon.py)
    exits: [
      { spot: "to-store", label: "Store" },
      { spot: "to-gate", label: "Fair gate" },
    ],
    spots: [
      spot({
        id: "slot",
        name: "mail slot",
        rect: [66, 31, 47, 96],
        stand: [90, 134],
        look: "DeeJay Cluck is on the air behind the glass, pointing at a dead pair of guest headphones and mouthing one word. Beat.",
        talk: { special: "talk_slot" },
        useItem: {
          geiger: { special: "geiger_slot" },
        },
        push: "The door is locked from the side that has the microphone.",
        take: "It's bolted to the door. Mail slots are loyal like that.",
        use: "He pokes a glove through the slot and waves. DeeJay waves back without looking up. A professional.",
        useAny: "He slides the {item} halfway through the slot, sees DeeJay frown, and slides it back out. Not what the man needs.",
      }),
      spot({
        id: "deejay",
        name: "DeeJay Cluck",
        rect: [154, 38, 34, 46],
        useItem: { photo: { say: "DeeJay holds it up to the booth glass. \"A signed glossy, live on WKUK! Folks, he's handing these out like coupons. Call in if you want one. Nobody? ...Nobody.\"" } }, // he keeps the stack: everybody gets one
        stand: [172, 134],
        look: "The overnight voice of Cluck County. He aired the \"accident\" story years ago. He never quite believed it.",
        talk: { special: "talk_deejay" },
        take: "DeeJay is live. You can't take a man off the air. There are forms.",
        use: "\"DeeJay, put me on!\" DeeJay points at the mail slot. Around here, everything goes through the slot.",
        push: "He taps the glass. DeeJay holds up one finger: one minute. Radio minutes are longer.",
        useAny: "He holds the {item} up to the glass. DeeJay reads it out on air like a sponsor. \"Brought to you by... that.\"",
      }),
      spot({
        id: "onair",
        name: "on-air light",
        rect: [71, 15, 36, 11], // the lit box above the studio door (tools/bg/next_signs.py); was a red panel in the window
        stand: [100, 134],
        look: "On air. The whole county is listening, which is a lot of pressure for a wheeze.",
        talk: "The light has no notes.",
        take: "Uhhh, the light? It's wired into the building. And into DeeJay's whole personality.",
        use: "He waits for the light to go off. It doesn't. WKUK never sleeps. It barely blinks.",
        push: "He presses the light. It's warm and very red. ON AIR. He takes his glove back.",
        useAny: "He holds the {item} under the ON AIR light. Now it's on the radio. Sort of.",
      }),
      spot({
        id: "horn",
        name: "wall horn",
        rect: [214, 31, 32, 31],
        stand: [230, 134],
        look: "A parking-lot horn on a nail. It could make a polite cough sound like a station ID.",
        take: "It comes down when DeeJay says so. He hasn't said so.",
        use: "It's on his side of the glass.",
        talk: "\"Testing, testing.\" The horn says nothing. It's waiting for a better voice than his.",
        push: "He reaches for the horn. It's on the other side of the glass. The glass wins.",
        useAny: "He holds the {item} up next to the horn for scale. The horn is bigger. The horn usually is.",
      }),
      spot({
        id: "to-store",
        name: "hall",
        rect: [0, 20, 56, 108],
        stand: [14, 140],
        exit: true,
        look: "Back toward Ned and the jars.",
        go: { room: "store", pose: null, say: "Back to the Feed & Seed." },
        talk: "\"Back in a minute, Ned!\" Two blocks away, somehow, Ned frowns.",
        useAny: "He waves the {item} down the hall like a flashlight. It is not a flashlight. The hall stays dark.",
      }),
      spot({
        id: "to-gate",
        name: "fair road",
        rect: [266, 33, 48, 95],
        stand: [290, 134],
        exit: true,
        look: "The fair is a glow at the end of the road. Midnight is the threat.",
        go: { special: "to_gate" },
        talk: "\"Hang on, fair. Big Green's coming.\" He winces. That's her name for him. He doesn't use it.",
        useAny: "He holds the {item} up toward the fair's glow. The road is long. The {item} doesn't make it shorter.",
      }),
      // Oct 21 item 21: an Act 1 memory (a red herring): the old Rooster & Hattie poster under the hall flyers
      spot({
        id: "poster",
        name: "notice board",
        rect: [10, 36, 26, 34],
        stand: [34, 134],
        look: "Flyers: a lost goat, fiddle lessons, the fry-off. Under them, sun-faded, a poster: ROOSTER & HATTIE, CRIME-STOPPERS, two masked birds back to back. She's laughing in it. He forgot she laughed like that.",
        talk: "He reads the poster's slogan out loud, quietly: \"Two birds. One county. No crooks.\" It used to sound better with her saying half.",
        take: "He starts to unpin it, then pins it back. Straighter.",
        use: "He smooths the corner flat where it's curling. That's all. That's all he can fix.",
        push: "He presses a loose pin back in. The poster stays up. It always does.",
        useAny: "He holds the {item} next to the poster. Back then he'd have known what to do with it. Back then she'd have told him.",
      }),
    ],
  },
  gate: {
    id: "gate",
    name: "Fair gate",
    plate: "bg-gate.jpg",
    // Gate B (2026-10-18): h84 at the gate line (fence base y131), h96 at the front edge; horizon -198.
    hero: { at: [130, 178], height: 96, depth: { horizon: -198 } },
    // The plaza in front of the turnstile (base y131), the booth front (y135) and the cutout's feet (y140).
    walk: [[[6, 137], [229, 137], [233, 144], [291, 144], [295, 137], [314, 137], [314, 179], [6, 179]]],
    occluders: [{ id: "front", base: 135 }], // roof, window header, sill, booth front and posts in front of the seated guard (feet y128)
    // seated inside the booth: h68 with feet at y128 keeps his cap under the window header (opening top y62); the roof
    // and header are in gate--front too (tools/bg/handcut/gate_header.py), so only the frame ever trims him
    cast: [{ spot: "guard", sprite: "guard-front", talk: "guard-talk", voice: "guard", at: [148, 128], height: 68 }],
    spriteTint: { brightness: 0.8, saturate: 0.85, sepia: 0.1 }, // cool night plaza: sprites sit back into the string-light glow
    sign: { art: "fx/neon-gate", rect: [40,  38,  56,  16], frames: [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 13, 14, 15, 16, "hawk"] }, // NED'S FEED & SEED neon painted into the plate (tubes clipped to the turnstile canopy panel); per-letter glow frames (tools/neon/paint_neon.py)
    poseAt: { squat: [236, 66, 50] }, // squatting behind the cardboard prize rooster, in its place
    exits: [
      { spot: "to-wkuk", label: "WKUK" },
      { spot: "turnstile", label: "Midway" },
    ],
    spots: [
      spot({
        id: "guard",
        name: "gate guard",
        rect: [124, 56, 46, 50],
        stand: [150, 140],
        look: "A tired man with a fan. He has stamped a thousand tickets and believed maybe six of them. Hattie's people walk in free.",
        talk: { special: "talk_guard" },
        useItem: {
          photo: { say: "The guard squints at it, then at him, then at it. \"Says Radioactive Rooster. You're the guy?\" A long look at the suit. \"Huh. Still smells like goat in here. Whole ticket, pal.\"" }, // he keeps the stack: everybody gets one
          mirror: {
            set: ["guard_distracted"],
            unlessFlag: "guard_distracted",
            already: "He's still checking a tooth. He has his own full attention.",
            say: "The hand mirror goes up. The guard checks a tooth like it owes him money. The cutout beside him is briefly unsupervised.",
            speaker: SPEAKER.guard,
          },
          stub: {
            say: "Half a ticket. The guard looks at it the way a man looks at a short paycheck.",
            speaker: SPEAKER.guard,
          },
          vip: { special: "offer_vip" },
        },
        take: "He doesn't take the guard. He takes a breath. The guard takes nothing, including bribes. Mostly.",
        use: "\"Pal, can you help a hero out?\" The guard fans himself, slowly. That's a no in fan.",
        push: "He gives the guard a friendly shoulder bump. The guard doesn't budge. He's anchored by a lifetime of shifts.",
        useAny: "The guard looks at the {item}, then at his fan, then at nothing. \"Ticket.\"",
      }),
      spot({
        id: "cutout",
        name: "prize-rooster cutout",
        rect: [235, 62, 51, 79],
        stand: [262, 150],
        look: "Cardboard. Ideal proportions. The shape is what matters.",
        use: { special: "cutout" },
        talk: "The cutout grins. It has never had to mean it.",
        take: "It's a cardboard rooster with ideal proportions. He can't carry the competition.",
        push: "He nudges the cutout. It wobbles and grins. Even falling over, it would look better than him.",
        useAny: "He props the {item} against the cutout. The cutout still looks better. Cardboard always does.",
      }),
      spot({
        id: "turnstile",
        name: "turnstile",
        rect: [25, 88, 76, 44],
        stand: [62, 140],
        exit: true,
        look: "A turnstile with a very developed sense of paperwork.",
        talk: "It clicks for a living.",
        go: { special: "turnstile" },
        useItem: { vip: { special: "offer_vip" } },
        useAny: "He feeds the {item} to the turnstile. It spits it back out. It has standards, and they're paper.",
      }),
      spot({
        id: "to-wkuk",
        name: "road back",
        rect: [0, 120, 22, 58],
        stand: [12, 160],
        exit: true,
        look: "Back toward the station.",
        go: { room: "wkuk", pose: null, say: "Back down the road. The on-air light is still a gossip." },
        talk: "\"See you, DeeJay.\" Behind him, the station's tower blinks red: stay on the dial.",
        useAny: "He holds the {item} up toward town. Town is behind him. So is the help.",
      }),
    ],
  },
  midway: {
    id: "midway",
    name: "Midway, 11:40",
    plate: "bg-midway.jpg",
    hero: { at: [180, 152], height: 104, depth: { horizon: 105 } }, // depth: 104 at y 152 (booth counter at his belt), smaller toward the railing
    walk: [[[20, 151], [84, 149], [88, 141], [252, 141], [250, 146], [290, 177], [20, 177]]], // boardwalk up to the railing posts (bases y 130-145), past the booth's right corner (booth occludes him behind y 147); the Pavilion rope (Arlong's painted rope, Oct 24 item 46: back post foot (256,146), front post foot (303,179)) is off limits, he stops on its near side // booth counter top y 103, booth floor y 147 (~44 px): counter meets his belt
    occluders: [{ id: "booth", base: 147 }, { id: "rope", base: 179, edge: [[256, 146], [303, 179]] }], // + Oct 24 item 46: Arlong's HOT OIL rope as a foreground cutout (tools/sprites/cut_push_a.py rope()), in front of anyone on its far side // the booth front; its counter window is open (the kids stand behind the counter)
    // Oct 23 items 33/42: "fix the clock" plays: he walks round behind Corny to the post, shinnies up it hand over hand
    // (sit v2 frames: rooster-shimmy-a/b, each with its glove on the post, manifest `post`), nudges the minute hand,
    // slides back down and walks back to his mark.
    cutscenes: { shimmy: SHIMMY },
    overlays: [{ art: "fg/midway--cashbox", at: [63, 92], z: 148 }], // over the booth front cutout (z); Corny's cash box on the end of the counter (tools/sprites/cut_next.py)
    cast: [
      { spot: "kids", sprite: "dot-front", talk: "dot-talk", voice: ["dot", "kids"], at: [38, 140], height: 72 }, // behind the counter window
      { spot: "kids", sprite: "rocco-front", talk: "rocco-talk", voice: ["rocco", "kids"], at: [59, 141], height: 72 },
      { spot: "corny", sprite: "corny-front", talk: "corny-talk", voice: "corny", at: [126, 141], height: 80, cues: { corny_pitch: "corny-ringtoss-r" } }, // by the clock post
    ],
    sign: { art: "fx/neon-midway", rect: [266,  48,  54,  20], frames: [6, 7, 8, 9, 11, 13, 14, 15, 16, "hawk"] }, // NED'S FEED & SEED neon painted into the plate (board across the right-hand building, clear of Hattie's hawk); per-letter glow frames (tools/neon/paint_neon.py)
    exits: [
      { spot: "to-gate", label: "Gate" },
      { spot: "rope", label: "Pavilion" },
    ],
    spots: [
      spot({
        id: "tent",
        name: "ring-toss tent",
        rect: [0, 0, 90, 56],
        look: "SLICK CORNY'S RING-A-DING TOSS, red and white and rigged all over. The pegs are a quarter-inch too fat. Everybody knows. Everybody plays.",
        talk: "The tent flaps. It's on commission.",
        take: "It's a whole tent. Corny would charge him for the stakes.",
        use: "He tries the tent flap. Behind it: more tent, and the smell of quarters.",
        push: "He pushes the tent. It ripples like a man laughing at a mark.",
        useAny: "He holds up the {item} at the tent. Corny's grin appears in the flap. \"Three rings a dollar, pal.\"",
      }),
      spot({
        id: "kids",
        name: "Jingle Kids",
        rect: [24, 60, 50, 40],
        look: "Two teens in faded Rad-Safe chick suits, Dot and Rocco, and a third so small she's just eyes over the counter: Pip. As little kids they sang the old Rad-Safe jingle. They'd like you to know they're over it.",
        talk: { special: "talk_kids" },
        useItem: {
          tickets: { special: "repay_pip" },
          photo: { special: "photo_pip" },
        },
        take: "These are kids. Heroes don't take kids anywhere. Heroes make sure the kids get home.",
        use: "\"Kids! Help a hero out?\" Dot, flat: \"We're on the clock.\" Rocco drums the counter. Pip just watches him.",
        push: "He leans on their counter. Dot moves his elbow off it without looking up.",
        useAny: "Dot looks at the {item}. \"Cool.\" She does not think it's cool. Rocco is already drumming a beat about it.",
      }),
      spot({
        id: "booth",
        name: "ring-toss pegs",
        rect: [18, 98, 50, 12],
        // Oct 21 items 21/22: where he met Hattie; and the hint that only something loud will shake the bottles loose
        look: "Three rings, a row of bottles and pegs, and a prize shelf with one rubber basket on it. The pegs are glued. These won't budge in an earthquake. Right here, years ago, he beat Hawkeye Hattie at her own game.",
        use: { special: "toss_plain" },
        take: { special: "toss_plain" },
        useItem: { speaker: { special: "toss_speaker" } },
        talk: "\"Play fair, pegs.\" The pegs are a quarter-inch too fat. They don't do fair.",
        push: "He nudges a peg. It doesn't budge. Somebody glued it, and the somebody is wearing a straw boater.",
        useAny: "He tosses the {item} instead of a ring. Corny catches it and hands it back. \"Rings only, pal. House rules.\"",
      }),
      spot({
        id: "cashbox",
        name: "Corny's cash box",
        rect: [68, 92, 16, 14],
        look: { special: "look_cashbox" },
        take: { special: "take_cashbox" },
        use: { special: "take_cashbox" },
        talk: "\"I know what you did.\" The cash box rattles with Corny's quarters. It isn't sorry.",
        push: "He nudges the cash box. Across the booth, Corny's quarter stops mid-flip. He un-nudges.",
        useAny: "He doesn't put the {item} in Corny's cash box. Things go in there and come out pawned.",
      }),
      spot({
        id: "corny",
        name: "Slick Corny",
        rect: [103, 61, 42, 80],
        stand: [126, 150], // talk from the boardwalk in front of the booth line (y147), never tucked behind its corner
        look: "Slick Corny, the barker, leans on the clock post in a straw boater and a corn-yellow vest, flipping a quarter. A man made entirely of fairground hustle. Something under the smile is counting.",
        talk: { special: "talk_corny" },
        useItem: { photo: { say: "Corny flips it over, fast as a quarter. \"Signed? I could move these at a buck apiece.\" He pockets it. \"Twenty percent to the talent. Ten. Five. Get outta here.\"" }, mirror: "He looks into the mirror and likes what he sees, but he never lets go of the cash box key. Professional.", map: "\"Follow the money,\" the map says. Corny sees it and stops smiling for exactly one second." },
        take: "You can't take Slick Corny anywhere. People have tried. Usually he takes them.",
        use: "\"Corny, my man.\" Corny flips his quarter. \"Your man costs a dollar.\"",
        push: "He bumps the clock post. Corny doesn't wobble. Corny is held up by grease and confidence.",
        useAny: "Corny eyes the {item}. \"I'll give you a quarter for it.\" He flips the quarter. It's the same quarter.",
      }),
      spot({
        id: "clock",
        name: "midway clock",
        rect: [112, 14, 34, 38],
        stand: [168, 146], beside: false, face: "l", // Arlong: to the barker's RIGHT, looking up past him; neither hides the other
        look: { special: "look_clock" },
        push: { special: "fix_clock" },
        use: { special: "fix_clock" },
        talk: "\"What time is it really, clock?\" Eleven-forty. The minute hand looks a little nervous.",
        take: "It's bolted to Corny's post. Everything on this boardwalk is Corny's, apparently.",
        useAny: "He holds the {item} up to the clock face. Time doesn't care. Time never does at a fair.",
      }),
      spot({
        id: "wheel",
        name: "ferris wheel",
        rect: [148, 12, 64, 80],
        look: "The ferris wheel. Rooster and Hattie rode it once, after their first save. She said you could see the whole county from the top. He was looking at her.",
        talk: "It creaks. It remembers.",
        use: "Not tonight. Not with midnight on the clock.",
        take: "Uhhh. He can fit the memory in his suit. Not the wheel.",
        push: "He gives the wheel a nudge. It keeps turning, the way it did that night.",
        useAny: "He holds the {item} up toward the top car. That's where she said you could see the whole county. He lowers it.",
      }),
      spot({
        id: "hawk",
        name: "red neon hawk",
        rect: [215, 27, 44, 42], // the painted-in Cock Gobbler neon (tools/bg/next_signs.py club)
        look: "THE COCK GOBBLER, in red neon over the club that went up across from the Pavilion. A hawk's head in profile, hooked beak, all hot red glass. Hattie always did like a sign.",
        talk: "The neon buzzes back. Not a yes. Not a no.",
        take: "It's her sign, over her club. You don't take a woman's neon.",
        use: "He studies the hawk like a clue. It studies him back. Red, steady, not blinking.",
        push: "It's on a building across the boardwalk. He'd have to push the boardwalk.",
        useAny: "He holds the {item} up to the neon. It turns pink in the glow. Everything does, around her.",
      }),
      spot({
        id: "club",
        name: "club doorway",
        rect: [214, 74, 46, 26],
        look: "The club door is propped open. Sad piano drifts out, minor keys. Somebody is leaning in the dark of the doorway, just out of the light.",
        talk: { special: "talk_hattie_door" },
        take: "He can't take the doorway. He can barely take the music.",
        use: "He doesn't go in. Not yet. The piano says it'll wait. The piano always says that.",
        push: "He pushes the door wider. The piano plays a sadder chord. He lets it swing back.",
        useAny: "He holds the {item} up to the dark doorway. Somebody in there laughs softly. \"Cute, sugar.\"",
      }),
      spot({
        id: "rope",
        name: "way to the Hot Oil Pavilion",
        rect: [266, 102, 54, 48],
        stand: [252, 152], // the near side of the rope
        exit: true,
        look: "The boardwalk runs to the Hot Oil Pavilion's velvet rope. The rope wants a reason.",
        talk: "The rope is velvet and judgmental.",
        go: { special: "rope" },
        useItem: {
          ribbon: { special: "rope_in", say: "\"Guest judge.\" The rope believes in ribbons. He ducks inside before it can change its mind." },
          bill: { special: "rope_in", say: "He waves the past-due bill like a health inspector who has seen things. The rope decides it's above this and lets him through." },
        },
        useAny: "He offers the {item} to the velvet rope. The rope wants a reason, and that isn't one.",
      }),
      spot({
        id: "to-gate",
        name: "boardwalk to the gate",
        rect: [0, 150, 70, 30],
        exit: true,
        look: "Back to the turnstile.",
        go: { room: "gate", pose: null, say: "Back to the gate. The guard is still thinking about his tooth." },
        talk: "\"Wait for me, gate guy.\" Back at the turnstile, the guard fans himself in reply.",
        useAny: "He holds the {item} up toward the gate. That way's out. The Yolk is the other way.",
      }),
    ],
  },
  pavilion: {
    id: "pavilion",
    name: "Hot Oil Pavilion",
    plate: "bg-pavilion.jpg",
    // New pixel bg (Arlong, 2026-10-17). Scene scale measured: height ~= 1.57 * (feetY - 92) (cart counter 109 / wheels 145 = waist; stage edge 114-131 = knee).
    // Arlong (2026-10-19): he read far too big down by the lock. Now he's Corny's height (88 at y148) give or take, a
    // touch bigger only because he's nearer the camera: 84 at y153, ~92 at the front rope (y171), ~72 at the stage front.
    hero: { at: [150, 153], height: 84, depth: { horizon: -20 } },
    // Rope barrier: the front rope is padlocked between the left post (x 8-17) and the centre-left post (x 104-116, base y 168).
    // A second rope runs back from the centre-left post (base 112,168) to the post at (150,145): stay in front of it.
    // Closed: open floor in front of both ropes, back to the stage front (y 131); he can step behind the cart's left corner (cart occludes, base 146).
    walk: [[[112, 171], [152, 147], [165, 131], [245, 131], [258, 139], [262, 148], [298, 152], [298, 177], [112, 177]]],
    states: [
      // Pip unlocks the padlock with Corny's key ring once she trusts him (js/logic.js, rope puzzle).
      { flag: "rope_open", plate: "bg/pavilion-open", walk: [[[112, 171], [152, 147], [165, 131], [245, 131], [258, 139], [262, 148], [298, 152], [298, 177], [112, 177]], [[20, 149], [104, 149], [106, 166], [112, 171], [112, 177], [20, 177]]] }, // + vat front, through the gap where the front rope hung
    ],
    occluders: [ // fg/<plate>--<id> cutouts (tools/bg/occluders.py); drawn over actors whose feet are above `base`
      { id: "post-left", base: 170 },
      { id: "post-front", base: 169 },
      { id: "post-mid", base: 146 },
      { id: "cart", base: 146 },
      // The rope swags as their own layers (hand-traced, tools/bg/handcut): anyone behind a rope is crossed by it.
      { id: "rope-front", base: 170, bases: { "pavilion-open": 172 }, hangs: true }, // closed: post-left to the padlock; open: the dropped rope and its coil
      { id: "rope-side", base: 146, hangs: true }, // centre-left post back to post-mid (Pip and the crowd stand behind it)
      { id: "rope-back", base: 130, hangs: true }, // along the stage front, with the back posts
    ],
    cast: [
      // on the stage, in the spotlight; at the finish she walks off stage right to her getaway cart
      // Oct 21 item 16: she visibly holds the cage chain (it runs up off the top of the screen, over to the cage), and
      // yanks it when the lamp blinds her or the sauce makes her lean (cage_jog). tools/sprites/cut_oct21.py
      { spot: "gobbler", sprite: "hattie-chain-l", at: [205, 110], height: 52,
        cues: { cage_jog: "hattie-flinch-l", hattie_exit: { walk: ["hattie-exit-walk-r", "hattie-exit-side-r"], to: [246, 112], ms: 1600, end: "hattie-exit-back" } } },
      // Pip, front row behind the side rope; she drifts into the crowd for the keys, then pops the padlock (left of her).
      { spot: "pip", sprite: "pip-front", talk: "pip-talk", voice: "pip", at: [122, 140], height: 56,
        cues: { pip_lift: PIP_SNEAK, pip_unlock: PIP_UNLOCK } },
      // Marge, the corn-dog vendor, at the cart (Arlong 2026-10-19: her own sprite, not the barker); she looks round
      // when Rooster reaches for Corny's keys on the cart hook.
      { spot: "vendor", sprite: "vendor-idle-r", at: [238, 148], height: 80, cues: { corny_turn: "vendor-talk-l" } },
      // The prize cage with the glowing Yolk (a prop, tools/sprites/cut_next.py; the plate's painted cage is gone): it
      // hangs by the vat, swings out over the oil on the CLUNK, jogs down on the lamp/sauce beat, and is empty once
      // the Yolk drops into the basket. The Yolk pulses (two glow frames). The chain runs off the top of the screen.
      { sprite: "cage-egg-a", frames: ["cage-egg-a", "cage-egg-b"], every: 520, at: [114, 79], height: 150, prop: true, whenNot: "crowd_won" },
      { sprite: "cage-egg-a", frames: ["cage-egg-a", "cage-egg-b"], every: 520, at: [88, 62], height: 150, prop: true, when: "crowd_won", whenNot: "cage_jogged",
        cues: { cage_out: { walk: ["cage-egg-a", "cage-egg-b"], from: [114, 79], to: [88, 62], ms: 1800, end: "cage-egg-a" } } },
      { sprite: "cage-egg-a", frames: ["cage-egg-a", "cage-egg-b"], every: 300, at: [88, 72], height: 150, prop: true, when: "cage_jogged", whenNot: "egg_saved",
        cues: { cage_jog: { walk: ["cage-egg-b", "cage-egg-a"], from: [88, 62], to: [88, 72], ms: 500, end: "cage-egg-b" } } },
      { sprite: "cage-empty", at: [88, 72], height: 150, prop: true, when: "egg_saved" },
      // Steam and red glow rolling off the oil (Arlong: more ominous vat), 4 loop frames over the oil surface.
      { sprite: "vat-steam-a", frames: ["vat-steam-a", "vat-steam-b", "vat-steam-c", "vat-steam-d"], every: 200, at: [56, 76], height: 40, prop: true },
      // The little brown hen in the crowd behind the side rope: only at the finish, where she speaks.
      // Oct 23 item 39: she struts out under the side rope to the front, so the gag reads, and stays there.
      { sprite: "littlehen-idle-r", at: [140, 138], height: 18, when: "egg_saved",
        cues: { littlehen: { walk: ["littlehen-idle-r", "littlehen-cluck-r"], to: [170, 152], ms: 1400, seq: [["littlehen-cluck-r", 1]] },
          hen_out: { sprite: "littlehen-idle-r", at: [170, 152] }, hattie_exit: { sprite: "littlehen-idle-r", at: [170, 152] } } },
      // Oct 23 item 45: the getaway car waits out the back flap, his elbow out the window (the stogie guy, Mayor
      // Bantam's muscle, at the wheel); the cart's cutout hides its wheels. On her exit it holds, then pulls away right.
      { sprite: "getaway-car-r", at: [286, 66], height: 16, prop: true, when: "egg_saved",
        cues: { hattie_exit: { seq: [["getaway-car-r", 1700], ...Array.from({ length: 12 }, (_, i) => ["getaway-car-r", 90, [286 + (i + 1) * 6, 66]])] } } },
    ],
    vat: [14, 66, 84, 17], // the glowing oil surface
    // The foreground crowd presses in with each step of the crow-down (crowd_1..3, js/logic.js talkGobbler/onCrow), so
    // the glide over their heads makes sense; once he's herded them back from the fryer they settle low again.
    // One row of heads (fg/pavilion--crowd, 320 x 66), drawn over everybody (z: in front of any feet line).
    overlays: [
      { art: "fg/pavilion--crowd", at: [0, 162], when: "crowd_1", whenNot: "crowd_2", z: 200 },
      { art: "fg/pavilion--crowd", at: [0, 148], when: "crowd_2", whenNot: "crowd_3", z: 200 },
      { art: "fg/pavilion--crowd", at: [0, 132], when: "crowd_3", whenNot: "crowd_won", z: 200, holdCues: ["cage_out", "glide"] },
      { art: "fg/pavilion--crowd", at: [0, 160], when: "crowd_won", z: 200 },
    ],
    // Finale beats (Arlong 2026-10-19: every finale action animates). Played when their line comes up (js/main.js).
    cutscenes: {
            glide: {
        // over the front row: up and left toward the fryer, a long pass right over their heads, back and down
        ms: 3800, heroH: 84, heroZ: 950,
        hero: [[0, "rooster-glide-l", null, [70, 116], 900], [900, "rooster-glide-r", null, [270, 124], 1500],
          [2400, "rooster-glide-l", null, [180, 128], 700], [3100, "rooster-glide-l", null, [150, 153], 700]],
        end: { hero: [150, 153], face: "front" },
      },
      // Oct 23 item 40: the hot sauce toss. From wherever he stands he raises Ned's bottle like the matador, lobs it in
      // an arc into the vat, SPLASH, and the spicy oil hits her in the face ({f}: facing the vat, faceTo x).
      sauce_toss: {
        ms: 2100, faceTo: 56,
        hero: [[0, "rooster-sauce-raise-{f}", null], [650, "rooster-matador-raise-{f}", null], [1500, "rooster-matador-flourish-{f}", null]],
        props: [{ art: "fx/sauce-bottle", at: "hero", show: 650, arc: [650, 700, [50, 62], 46], gone: 1350 }],
        events: [[1350, { fx: "fx/oil-splash-a", at: [6, 28] }], [1350, { shake: 350 }], [1380, { sound: "bonk" }], [1650, { fx: "fx/oil-splash-b", at: [160, 46] }]],
      },
      // the catch: the Yolk drops out of the cage into the rubber basket (he stands left of the low cage, ~(58, 149), facing it)
      catch: {
        ms: 1300,
        props: [{ art: "fx/yolk-egg", at: [79, 50], fall: [150, 900, [64, 92]], gone: 1300 }],
        events: [[1050, { sound: "geiger" }]],
      },
      // the bad ending: the chain slips, the Yolk drops into the fryer
      fried: {
        ms: 1400,
        props: [{ art: "fx/yolk-egg", at: [79, 50], fall: [200, 700, [79, 70]], gone: 900 }],
        events: [[900, { shake: 400 }]],
      },
      // the dark side: the vat erupts
      erupt: { ms: 900, events: [[0, { shake: 700 }]] },
      // Oct 21 items 17/18: PAH-KAW. Hero ending: one big lunge forward off his planted boots, the Yolk held high.
      pahkaw: {
        ms: 1100, heroH: 84,
        hero: [[0, "rooster-lunge-r", null, [96, 160], 450], [450, "rooster-lunge-r", null, [112, 158], 350], [800, "rooster-yolk-r", null, [112, 158], 300]],
        events: [[450, { shake: 250 }]],
        end: { hero: [112, 158], face: "r" },
      },
      // ...showboat ending ("the front row, wearing the fryer"): up onto the vat rim, then a kick off it that sends a
      // wave of hot oil over the front row, and a lunge out to centre stage.
      pahkaw_show: {
        ms: 1700, heroH: 84, heroZ: 950,
        hero: [[0, "rooster-yolk-r", null, [46, 92], 400], [450, "rooster-lunge-r", null, [46, 92], 150], [600, "rooster-lunge-r", null, [150, 152], 750], [1350, "rooster-yolk-r", null, [150, 152], 350]],
        events: [[600, { fx: "fx/oil-splash-b", at: [20, 36] }], [600, { shake: 500 }], [650, { sound: "bonk" }]],
        end: { hero: [150, 152], face: "r" },
      },
    },
    // Oct 21 item 17: once the Yolk is in the basket he stands holding it (no squat), side frames rooster-yolk-r/-l.
    heroHold: { flag: "egg_saved", sprite: "rooster-yolk", size: "-h84" },
    poseAt: { squat: [30, 83, 56] }, // (legacy: no longer used at the finish since Oct 21 item 17)
    exits: [{ spot: "out", label: "Midway" }],
    spots: [
      spot({
        id: "gobbler",
        name: "The Cock Gobbler",
        rect: [180, 44, 48, 68],
        side: "l", // from the right he'd end up behind the side rope swag: always talk to him from the front-left
        look: { special: "look_gobbler" },
        talk: { special: "talk_gobbler" },
        useItem: { sauce: { say: "He holds Ned's hottest bottle up to the stage. She looks at it, then at him, one hand on her hip. \"Whatsa matter, I'm not hot enough for ya?\"", speaker: SPEAKER.gobbler }, photo: { say: "Hattie takes the photo from the edge of the stage with two black-gloved fingers, reads \"Stay safe!\", and laughs low. \"Oh, sugar. Still signing these?\" She tucks it in her glove anyway." }, vip: { special: "return_vip" } },
        take: "You don't take The Cock Gobbler anywhere. She takes the stage, the Yolk, and the last word.",
        use: "\"Hattie, let's talk.\" She smiles from the stage. \"We are talking, sugar. It's called a show.\"",
        push: "He takes one step toward the stage. The whole crowd shushes him. He takes the step back.",
        useAny: "He holds up the {item}. Hattie blows him a kiss. \"Bring me something I don't have, Big Green.\"",
      }),
      spot({
        id: "lamp",
        name: "heat lamp",
        rect: [44, 0, 40, 57],
        stand: [152, 170], beside: false, face: "l", // looks up at it from right of Pip, not on top of her
        look: "A heat lamp aimed at the oil. It could be aimed at a person, if the person stood where vanity put her.",
        useItem: {
          mirror: { special: "mirror_lamp" },
        },
        talk: "\"Easy, lamp.\" The heat lamp roars at the oil. It doesn't take notes from roosters.",
        take: "It's red-hot and bolted to the rigging. He takes the hint instead.",
        use: "He tries to aim the lamp by hand. The glove gets hot. The glove files its second complaint tonight.",
        push: "He shoves the lamp arm. It swings right back, like it's on Corny's payroll.",
        useAny: "He holds the {item} under the heat lamp. It gets warm and does nothing else. Something shiny would do more.",
      }),
      spot({
        id: "cage",
        name: "egg cage",
        rect: [99, 26, 30, 53],
        alt: [{ when: "crowd_won", rect: [73, 5, 30, 57] }, { when: "cage_jogged", rect: [73, 15, 30, 57] },
          { when: "egg_saved", look: "The prize cage, empty, swinging over the oil. The Yolk's in the basket now." }],
        look: "The Yolk of Midnight, pitch black and glowing, in the same old prize cage from the stunt night. They say whoever eats it gets the Crow: a voice the whole county obeys.",
        useItem: {
          basket: { special: "basket_cage" },
        },
        talk: "The Yolk hums. It sounds almost like clucking, if you were listening for that. Nobody is.",
        take: "It's on a chain over a vat of hot oil. Even a hero has a reach.",
        use: "The cage hangs over the oil, out of reach. He'd need something to catch with.",
        push: "He'd have to push the cage over boiling oil, and the oil would have to be okay with that.",
        useAny: "He waves the {item} at the cage. The Yolk hums. It wants something to land in, not a wave.",
      }),
      spot({
        id: "fryer",
        name: "championship fryer",
        rect: [6, 64, 98, 84],
        look: { special: "look_vat" },
        useItem: {
          basket: { special: "basket_fryer" },
          sauce: { special: "sauce_oil" },
        },
        tossItems: ["sauce"], // Oct 23 item 40: he throws it from where he stands, no walk to the vat
        talk: "\"Steady, big guy.\" The oil pops back, rude and hot.",
        take: "Uhhh, a vat of hot oil does not fit in the suit. Nothing should fit in the suit.",
        use: "He's not putting his gloves anywhere near that oil. Rad-Safe Rule 1: don't fry the hero.",
        push: "He is not pushing a vat of boiling oil. He's earnest, not crazy.",
        useAny: "He holds the {item} over the oil and thinks better of it. The fryer would eat it, and it doesn't share.",
      }),
      spot({
        id: "crowd",
        name: "crowd",
        rect: [104, 76, 54, 30],
        side: "r", // from the stage side; on the vat side (rope open) the side rope swag cuts him
        look: "They came for a tasting. They are one bad wire away from leaving without eyebrows.",
        talk: "They shush each other. The show hasn't started, or it has, and they can't tell.",
        take: "He can't take a whole crowd. He'd need a bus, and a reason, and they'd want snacks.",
        use: "\"Folks! Stay calm!\" They were calm. Now they're less calm.",
        push: "He nudges into the crowd. They shush him in four-part harmony.",
        useAny: "He holds the {item} up to the crowd. A few people clap politely. They think it's part of the show.",
      }),
      spot({
        id: "vendor",
        name: "corn-dog lady",
        rect: [228, 68, 24, 80],
        side: "l",
        look: "Marge, who runs the corn-dog cart. Striped paper hat, striped apron, a corn dog held like a scepter. Corny hangs his keys on her cart hook because nobody gets past Marge.",
        talk: "\"Corn dog, hon? Two bucks. Rooster discount: also two bucks.\" She never takes her eyes off the cart hook.",
        useItem: { photo: { say: "Marge takes the signed photo, squints at it, and props it up against the mustard. \"Hon, you look taller on paper.\"" } },
        take: "He reaches for a corn dog. Marge raps his glove with the next one. \"Two bucks.\"",
        use: "\"One corn dog, please.\" \"Two bucks.\" He has no bucks. He has feathers.",
        push: "He is not shoving Marge. Nobody shoves Marge.",
        useAny: "He offers Marge the {item}. \"We don't barter, hon. This is a cart, not a church raffle.\"",
      }),
      spot({
        id: "cart",
        name: "corn-dog cart",
        rect: [253, 62, 64, 85],
        stand: [204, 150], beside: false, face: "r", // left of Marge, so neither hides the other
        look: "Marge's corn-dog cart, parked by the back flap. Out past it, an engine idles in the dark. She always plans her exit.",
        alt: [{ when: "egg_saved", look: "Marge's corn-dog cart. Just a cart. The getaway car was out back the whole time." }],
        use: "It isn't time to borrow her exit.",
        push: "The cart stays. For now.",
        talk: "\"Nice cart.\" The corn dogs sweat under the lamp. They know he's onto something.",
        take: "He can't fit a corn-dog cart in the suit. He checks twice, just to be thorough.",
        useAny: "He leaves the {item} on the corn-dog cart, then takes it right back. Nothing left on that cart stays put.",
      }),
      spot({
        id: "out",
        name: "tent flap",
        rect: [262, 20, 58, 40],
        exit: true,
        look: "Back to the midway, if you need a breath that isn't made of oil.",
        go: { special: "pavilion_out" },
        talk: "\"Back in a sec, folks.\" Nobody notices. Everyone's watching the stage.",
        useAny: "He waves the {item} at the tent flap. The night outside smells like corn dogs and decisions.",
      }),
      spot({
        id: "pip",
        name: "Pip",
        rect: [110, 84, 24, 56], // front row behind the side rope, right of the centre-left post (sprite pip-front h56 at 122,140)
        look: { special: "look_pip_pav" },
        talk: { special: "talk_pip_pav" },
        use: { special: "talk_pip_pav" },
        take: "She's a person, not a prize. Corny's the one who confuses those.",
        push: "He doesn't push kids. He catches them. He did once.",
        useAny: "He shows Pip the {item}. She looks at it, then back at the cage. \"Cool, mister. Not helpful, though.\"",
      }),
      spot({
        id: "padlock",
        name: "padlock",
        rect: [98, 131, 11, 13],
        look: { special: "look_padlock" },
        use: { special: "use_padlock" },
        take: { special: "use_padlock" },
        push: { special: "use_padlock" },
        talk: "\"Open sesame.\" Nothing. Wrong genre, wrong padlock.",
        useAny: "He jiggles the {item} at the padlock. It doesn't fit. Padlocks are picky. Only one little brass key will do.",
        alt: [{
          when: "rope_open", // Pip popped it
          name: "open padlock",
          talk: "\"Nothing personal.\" The open padlock dangles. It's had a rough night too.",
          useAny: "He offers the {item} to the open padlock. It's done locking things tonight. It's off the clock.",
        }],
      }),
      spot({
        id: "keyring",
        name: "Corny's key ring",
        rect: [300, 113, 14, 17],
        whenNot: "rope_open",
        look: "Slick Corny's key ring on a hook on the corn-dog cart: cart key, cash-box key, and one little brass key the same color as the padlock. He hangs it in plain sight. Nobody would dare.",
        use: { special: "use_keyring" },
        take: { special: "use_keyring" },
        talk: "\"Hey, keys.\" They jingle in the draft. Across the crowd, Corny's ear twitches.",
        push: "He flicks the key ring. It jingles. Corny's head starts to turn. He freezes. Corny's head stops.",
        useAny: "He hangs the {item} on the hook next to Corny's keys, then takes it back before anybody notices. Swaps aren't his game.",
      }),
    ],
  },
};
