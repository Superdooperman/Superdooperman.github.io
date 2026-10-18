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
  hattie: "voice:hattie",
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

export const ITEMS = {
  geiger: {
    name: "geiger counter",
    look: "Old Rad-Safe issue. It clicks near the Yolk of Midnight. It also clicks near him, sometimes. Nobody has ever asked why.",
    icon: "item-geiger.svg",
  },
  bulb: {
    name: "spare bulb",
    look: "Off the coop lamp. Forty watts of optimism.",
    icon: "item-bulb.svg",
  },
  photo: {
    name: "autograph photo",
    look: "Signed \"Stay safe! — Radioactive Rooster.\" He means it every time. He has signed four hundred of these for people who did not ask.",
    icon: "item-photo.svg",
  },
  spoon: {
    name: "tasting spoon",
    look: "Silver. Monogrammed C.G. Somebody brought her own spoon to a fry.",
    icon: "item-spoon.svg",
  },
  stub: {
    name: "torn ticket stub",
    look: "Half a fair ticket, lipstick on the ragged edge. Tiny print through the nostril holes: \"R— & H— Admit Tw—\". He knows this ticket. He tore it.",
    icon: "item-stub.svg",
  },
  half: {
    name: "other ticket half",
    look: "The other half. \"—ooster & —attie: —o.\" It's been in Corny's cash box. Somebody pawned it.",
    icon: "item-stub.svg",
  },
  ticket: {
    name: "joined ticket",
    look: "\"ROOSTER & HATTIE: ADMIT TWO.\" Dated the stunt night. The edges still fit. That's the worst part.",
    icon: "item-pass.svg",
  },
  grub: {
    name: "fat grub",
    look: "It would change a goat's whole evening.",
    icon: "item-grub.svg",
  },
  ribbon: {
    name: "blue ribbon",
    look: "GUEST JUDGE, Best Wattle. Farmer Peck's pride. The pin still works.",
    icon: "item-ribbon.svg",
  },
  sauce: {
    name: "hot sauce",
    look: "Ned's hottest bottle. \"Not a gift. A line item.\"",
    icon: "item-sauce.svg",
  },
  mirror: {
    name: "hand mirror",
    look: "It shows people the thing they actually came to see, which is usually themselves.",
    icon: "item-mirror.svg",
  },
  bill: {
    name: "past-due bill",
    look: "NED'S FEED & SEED. \"ORPINGTON, BRAHM A. 1x deodorant (economy). 40 lbs scratch. PAST DUE.\" Ned asked Rooster to deliver it. Rooster said he'd make sure Brahm gets it. He will.",
    icon: "item-bill.svg",
  },
  speaker: {
    name: "loudspeaker",
    look: "A parking-lot horn with a WKUK sticker. It makes a small voice sound like a decision.",
    icon: "item-speaker.svg",
  },
  map: {
    name: "fair map",
    look: "DeeJay circled two things: the Hot Oil Pavilion, and Slick Corny's ring-toss booth. \"Follow the money,\" in grease pencil.",
    icon: "item-map.svg",
  },
  pass: {
    name: "stamped pass",
    look: "A corner of cardboard with a real stamp. The guard's tooth was very distracting.",
    icon: "item-pass.svg",
  },
  vip: {
    name: "gold VIP card",
    look: "\"THE COCK GOBBLER — ADMIT ONE, NO QUESTIONS.\" On the back, in lipstick: \"Wear something nice, Big Green.\"",
    icon: "item-pass.svg",
  },
  basket: {
    name: "rubber basket",
    look: "Ring-toss prize. It can catch an egg, if the egg can be talked down.",
    icon: "item-basket.svg",
  },
  tickets: {
    name: "prize tickets",
    look: "A roll of ring-toss prize tickets. Pip's. They came with the rigged win. They feel heavier than paper should.",
    icon: "item-stub.svg",
  },
};

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

// Comic-cover endings (code-drawn for now; art ids bg/ending-* later).
export const ENDINGS = {
  hero: {
    series: "RADIOACTIVE ROOSTER #1",
    title: "ROOSTER RETURNS!",
    blurb: "The Yolk is safe. The Hawk has flown.",
    art: "Rooster gliding over the Pavilion, red webbing out, the Yolk in a rubber basket.",
    panels: [
      "The corn-dog cart's taillights, heading for the county line. \"Spare set.\"",
      "A single hawk feather on the rooftop bucket.",
      "Across town, the neon hawk flickers. For one frame it reads HATTIE'S.",
      { text: "Took you long enough, Rooster. Name. Business. ...Welcome home.", say: "Henny" },
    ],
    tone: "hero",
  },
  allies: {
    series: "RADIOACTIVE ROOSTER & FRIENDS · SPECIAL EDITION",
    title: "THE WHOLE COOP CROWS!",
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
    blurb: "She stole the Yolk... but he stole her heart!",
    art: "Dawn on the rooftop coop. Two masked lovebirds beak to beak inside a big pink heart.",
    panels: [
      "Dawn. She parks the corn-dog cart and climbs up to the coop instead of running. Across the street, Gizzard plays something sweet, in a major key, through the club's open window.",
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
    blurb: "Collectors' item! Oil stains included!",
    art: "Rooster mid-crow, very proud. Behind him, a front row wearing the fryer.",
    panels: [
      "The town hoses itself off by the ferris wheel.",
      "Ned reviews the hot sauce: \"Tasted like humiliation.\"",
      { text: "You've got oil on your beak.", say: "Henny" },
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

export const ROOMS = {
  hq: {
    id: "hq",
    name: "Rooftop coop",
    plate: "bg-hq.jpg",
    hero: { at: [205, 156], height: 96, depth: { horizon: 99 } }, // depth: height scales with feet y, 96 at y 156 (hatch lid perspective gives horizon ~99)
    walk: [[[40, 150], [302, 150], [302, 166], [262, 168], [255, 177], [40, 177]]], // floor in front of the door/board; crate (x<34) off limits; he can step behind the bucket (y<173), the hatch is floor-level // walking Rooster: feet [x, y], walk x range, scene height (px). Door 92 px (y 55-147): his hood (~84) stands just under it; starts on the hatch he climbed out of
    sign: [258, 99, 54, 8],
    occluders: [{ id: "bucket", base: 173 }], // fg/hq--bucket: drawn over him while his feet are behind its base (tools/bg/occluders.py)
    exits: [{ spot: "hatch", label: "Down the hatch" }],
    spots: [
      spot({
        id: "bucket",
        name: "bucket",
        rect: [261, 136, 38, 38],
        stand: [250, 170], // walk up beside it, not behind it
        look: { special: "read_note" },
        take: "He leaves the bucket. The note is already stuck in his head.",
        talk: "\"Whoever you are, friend, I'm coming.\" The bucket does not confirm it's a friend.",
        push: "It rocks. The note doesn't get any friendlier.",
      }),
      spot({
        id: "board",
        name: "conspiracy board",
        rect: [98, 80, 57, 58],
        look: { special: "look_board" },
        useItem: { "*": { special: "pin_board" } },
        talk: "He asks the board who did it. The red string points at the goat. It always points at the goat.",
        push: "A pin falls out. The goat photo swings. It still looks guilty.",
        take: "The board stays. It's load-bearing, emotionally.",
      }),
      spot({
        id: "door",
        name: "coop door",
        rect: [56, 55, 38, 92],
        look: "His coop. Headquarters, autograph storage, and a cot. A lamp's on inside like somebody's home. Somebody is: him.",
        use: { special: "coop_photo" },
        take: { special: "coop_photo" },
        talk: "\"Back by midnight.\" The coop has heard that before.",
        push: "The door swings in. Inside, a stack of signed photos waits for anybody who might need cheering up.",
      }),
      spot({
        id: "lamp",
        name: "coop lamp",
        rect: [74, 26, 22, 18],
        whenNot: "got_bulb",
        look: "A lamp over the door with a spare bulb clipped to the shade. Rad-Safe Rule 4: always carry a spare.",
        take: {
          give: ["bulb"],
          set: ["got_bulb"],
          say: "Spare bulb. Pocketed. Rule 4, honored.",
        },
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
      }),
      spot({
        id: "laundry",
        name: "laundry line",
        rect: [119, 30, 36, 36],
        look: "Three towels on the line. One is monogrammed in gold thread. He has never explained it to anyone, and nobody has ever seen it but the moon.",
        take: "Not in the suit. A hero does not carry a towel. (A hero should, honestly.)",
        talk: "The towels flap. They know things.",
      }),
      spot({
        id: "tower",
        name: "water tower",
        rect: [158, 4, 52, 70],
        look: "The water tower. The left eye is looking at it. The right eye is looking at a different water tower.",
        talk: "The tower keeps his secrets, mostly by being a tower.",
        push: "It's a water tower.",
      }),
      spot({
        id: "hawk",
        name: "red neon hawk",
        rect: [232, 68, 22, 24],
        look: { special: "look_hawk_far" },
        talk: "He doesn't call across town to it. He thinks about it, though.",
      }),
      spot({
        id: "wheel",
        name: "the fair",
        rect: [258, 52, 36, 38],
        look: "The County Fair. One ferris wheel, a thousand bulbs, and a fry-off at midnight. Six hours. Plenty of time to be good at something.",
      }),
      spot({
        id: "hatch",
        name: "roof hatch",
        rect: [152, 133, 104, 38],
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
      }),
    ],
  },
  fence: {
    id: "fence",
    name: "Fence line",
    plate: "bg-fence.jpg",
    // Crossroads pixel bg (Arlong's approved fence.jpg, 2026-10-18). Far scene: the split-rail fence (posts ~23 px, base y ~110,
    // top rail ~17 px above the ground) sits at his waist-to-chest when he stands at it, so he's ~30 px there.
    hero: { at: [170, 152], height: 60, depth: { horizon: 68, min: 28, max: 80 } }, // ~30 at the fence (y 110), 36 at Henny's crate, ~80 at the bottom edge
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
    cast: [{ spot: "henny", sprite: "henny-front", at: [128, 116], half: true }], // a real hen at her checkpoint, knee-high (9 px) to him at that spot (~36); drawn only over real art (?cast forces)
    sign: [254, 52, 40, 6], // NED'S FEED & SEED glowing over Main Street
    poseAt: { squat: [60, 66, 24] }, // on the top rail between the left posts
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
        rect: [48, 74, 26, 12],
        look: "Round. Cheeks full. Quiet. Employed. That's the whole job and they're good at it.",
        talk: "They're busy looking like roosters. It's a skilled trade.",
        use: { special: "squat_rail" },
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
      }),
      spot({
        id: "to-barn",
        name: "path to the barn",
        rect: [114, 50, 44, 28],
        exit: true,
        stand: [155, 113],
        look: "The barn light is on. Somebody in there owns a ribbon and a goat named Mortgage.",
        go: { room: "barn", pose: null, say: "Across the yard. The barn smells like hay and unfinished arguments." },
      }),
      spot({
        id: "gate",
        name: "gate",
        rect: [143, 86, 24, 25],
        look: "A split-rail gate on a loop of baling wire. Past it: the yard, the henhouse, the barn. Henny's checkpoint decides who goes through.",
        talk: "The gate has no opinion. Henny has all of them.",
        use: { special: "coop_door" },
        push: { special: "coop_door" },
      }),
      spot({
        id: "crate",
        name: "checkpoint crate",
        rect: [100, 95, 23, 23],
        look: "Henny's checkpoint: an upturned crate with a clipboard. The form has three lines. Name. Business. Comb size.",
        take: "It's an official document. Henny would know.",
        use: "Name: Rooster. Business: ...He puts the pencil down. Henny is watching.",
        talk: "The clipboard has heard every excuse in the county.",
      }),
      spot({
        id: "henny",
        name: "Henny",
        rect: [120, 104, 16, 13],
        look: "Henny runs this door like a nightclub that only admits spheres. She never says a word. She has never needed to.",
        talk: { special: "talk_henny" },
        use: "She doesn't want to be used. She wants a normal rooster on that rail.",
        useItem: { photo: { special: "photo_henny" } },
      }),
      spot({
        id: "signpost",
        name: "signpost",
        rect: [218, 52, 22, 58],
        look: "Four arrows on one post: HENHOUSE, BARN, MAIN ST., DITCH RD. Tacked under them, a weathered county map with the fair circled in red.",
        talk: "It already told him everything it knows.",
        take: "It's load-bearing. The whole county would get lost.",
      }),
      spot({
        id: "to-main",
        name: "Main Street",
        rect: [296, 58, 24, 40],
        exit: true,
        look: "Main Street: the Feed & Seed, and WKUK's radio tower blinking red over the rooftops.",
        go: { room: "store", pose: null, say: "Down Main Street, under the NED'S FEED & SEED sign." },
      }),
      spot({
        id: "to-ditch",
        name: "ditch road",
        rect: [248, 118, 72, 62],
        exit: true,
        stand: [300, 114],
        look: "The ditch road follows the reeds out toward the back of the fairgrounds. Frogs, mud, and nobody watching.",
        go: "Not yet. The ditch road ends at the fair's back fence, and he doesn't have a way in until WKUK. Town first.",
      }),
      spot({
        id: "to-hq",
        name: "way up",
        rect: [0, 112, 12, 30],
        exit: true,
        look: "Back up to the roof and the conspiracy board.",
        go: { room: "hq", pose: null, say: "Back up the fire escape to the coop. The board is waiting for string." },
      }),
    ],
  },
  henhouse: {
    id: "henhouse",
    name: "Henhouse",
    plate: "bg-henhouse.jpg",
    exits: [{ spot: "back", label: "Fence" }],
    spots: [
      spot({
        id: "spoon",
        name: "tasting spoon",
        rect: [134, 50, 70, 25],
        whenNot: "got_spoon",
        look: "Silver, monogrammed C.G., recently in a mouth that was not a hen's.",
        take: {
          give: ["spoon"],
          set: ["got_spoon"],
          say: "The tasting spoon. C.G. on the handle. She practiced here, and she brought her own silver.",
        },
      }),
      spot({
        id: "stub",
        name: "torn ticket",
        rect: [198, 50, 90, 29],
        whenNot: "got_stub",
        look: "Half a fair ticket with a lipstick kiss on it. Left where he'd find it.",
        take: {
          give: ["stub"],
          set: ["got_stub"],
          say: "He squints through the nostril holes at the tiny print. \"R— & H— Admit Tw—\". He goes quiet for a while. He knows who tore this ticket. He did.",
          mood: "embarrassed",
        },
      }),
      spot({
        id: "warm",
        name: "Midnight's empty nest",
        rect: [96, 86, 77, 54],
        look: { special: "look_box" },
        take: "Heat is a rude thing to pocket.",
        use: "His gloves are warm already. His conscience is working on it.",
      }),
      spot({
        id: "hen",
        name: "sitting hen",
        rect: [173, 86, 96, 65],
        look: "A dreamy fangirl of a hen, sitting on a grub like it's a secret. She's staring at his mask with her whole heart.",
        talk: "She swoons a little. Conversation isn't the currency here. Autographs might be.",
        take: "She pecks the glove. The glove files a complaint.",
        useItem: {
          photo: {
            consume: ["photo"],
            set: ["hen_up"],
            unlessFlag: "hen_up",
            already: "She's already sitting on his face. Once is a compliment. Twice is a residency.",
            say: "He signs it \"To my biggest fan\" and slides it under her. She shifts onto it, overcome. The grub is free, and somewhere a hen is very seen.",
          },
        },
      }),
      spot({
        id: "grub",
        name: "fat grub",
        rect: [192, 126, 58, 29],
        when: "hen_up",
        whenNot: "got_grub",
        look: "A fat grub, suddenly unemployed.",
        take: {
          give: ["grub"],
          set: ["got_grub"],
          say: "A fat grub. It will change a goat's whole evening.",
        },
      }),
      spot({
        id: "back",
        name: "door back",
        rect: [0, 63, 26, 72],
        exit: true,
        look: "Out to the rail, where the professionals are still squatting.",
        go: { room: "fence", pose: null, say: "Out to the fence line. Henny pretends she never let him in." },
      }),
    ],
  },
  barn: {
    id: "barn",
    name: "Barn",
    plate: "bg-barn.jpg",
    exits: [
      { spot: "to-fence", label: "Fence" },
      { spot: "to-town", label: "Town" },
    ],
    spots: [
      spot({
        id: "goat",
        name: "Mortgage the goat",
        rect: [51, 83, 83, 79],
        look: "Mortgage. Bored, bellied, and smarter than everyone in this barn. Never proven.",
        talk: { special: "talk_goat" },
        useItem: {
          grub: {
            consume: ["grub"],
            set: ["got_ribbon"],
            give: ["ribbon"],
            unlessFlag: "got_ribbon",
            already: "Mortgage has already done the crime. Mortgage is retired.",
            say: "Mortgage takes the grub, sniffs Rooster for a long time, says \"meeeeh,\" and charges the post. The blue ribbon flutters down. Farmer Peck says it looks like rain.",
          },
        },
      }),
      spot({
        id: "ribbon",
        name: "blue ribbon",
        rect: [166, 7, 45, 40],
        look: { special: "look_ribbon" },
        take: "Nailed high. Pride is not a ladder.",
        push: "It flutters. It stays.",
      }),
      spot({
        id: "ladder",
        name: "rotten ladder",
        rect: [128, 72, 51, 90],
        look: "A ladder in the philosophical sense. In the practical sense, a stack of apologies.",
        push: "Rotten. A hero and a ladder should both be trustworthy. This one isn't.",
        use: "He puts a foot on it. The foot files for divorce.",
        take: "Taking it would only spread the rot.",
      }),
      spot({
        id: "peck",
        name: "Farmer Peck",
        rect: [205, 54, 102, 112],
        look: "Farmer Peck. Hard of hearing, brass horn, and he only talks about the weather.",
        talk: { special: "talk_peck" },
        use: "He's not a tool. The goat is closer.",
      }),
      spot({
        id: "to-fence",
        name: "yard door",
        rect: [0, 50, 38, 90],
        exit: true,
        look: "Back to the fence and Henny's standards.",
        go: { room: "fence", pose: null, say: "Out to the rail." },
      }),
      spot({
        id: "to-town",
        name: "road to town",
        rect: [282, 54, 38, 90],
        exit: true,
        look: "Town. Ned's Feed & Seed, and a radio station that keeps bad hours.",
        go: { room: "store", pose: null, say: "Into town, under the NED'S FEED & SEED sign." },
      }),
    ],
  },
  store: {
    id: "store",
    name: "Ned's Feed & Seed",
    plate: "bg-store.jpg",
    sign: [252, 26, 62, 10],
    exits: [
      { spot: "to-barn", label: "Barn" },
      { spot: "to-wkuk", label: "WKUK" },
    ],
    spots: [
      spot({
        id: "clerk",
        name: "Ned",
        rect: [134, 40, 102, 76],
        look: "Ned has priced everything in the county, including trouble. He looks like a man carrying forty gallons of guilt.",
        talk: { special: "talk_clerk" },
        useItem: {
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
      }),
      spot({
        id: "bell",
        name: "service bell",
        rect: [160, 112, 45, 29],
        look: "A bell that has summoned Ned through three wars and one spice recall.",
        use: "Ding. Ned was already looking at you. Now he's looking harder.",
        push: "Ding.",
        talk: "Ding is the whole vocabulary.",
      }),
      spot({
        id: "jars",
        name: "jars",
        rect: [6, 7, 128, 99],
        look: "Pickles, nails, and a powder that claims to be flour. The labels gave up years ago.",
        take: "Ned's face says the price is your dignity, and it isn't on sale.",
        talk: "The jars are neutral.",
      }),
      spot({
        id: "to-barn",
        name: "back lane",
        rect: [0, 99, 32, 72],
        exit: true,
        look: "The lane back to Peck's barn.",
        go: { room: "barn", pose: null, say: "Back toward the barn. Mortgage hasn't written." },
      }),
      spot({
        id: "to-wkuk",
        name: "street door",
        rect: [237, 29, 77, 130],
        exit: true,
        look: "The street. WKUK's on-air light stains the wet pavement down the block.",
        go: { room: "wkuk", pose: null, say: "Down the block to WKUK." },
      }),
    ],
  },
  wkuk: {
    id: "wkuk",
    name: "WKUK",
    plate: "bg-wkuk.jpg",
    sign: [4, 26, 60, 9],
    exits: [
      { spot: "to-store", label: "Store" },
      { spot: "to-gate", label: "Fair gate" },
    ],
    spots: [
      spot({
        id: "slot",
        name: "mail slot",
        rect: [58, 40, 70, 126],
        look: "DeeJay Cluck is on the air behind the glass, pointing at a dead pair of guest headphones and mouthing one word. Beat.",
        talk: { special: "talk_slot" },
        useItem: {
          geiger: { special: "geiger_slot" },
        },
        push: "The door is locked from the side that has the microphone.",
      }),
      spot({
        id: "deejay",
        name: "DeeJay Cluck",
        rect: [160, 54, 90, 83],
        look: "The overnight voice of Cluck County. He aired the \"accident\" story years ago. He never quite believed it.",
        talk: { special: "talk_deejay" },
      }),
      spot({
        id: "onair",
        name: "on-air light",
        rect: [128, 43, 51, 25],
        look: "On air. The whole county is listening, which is a lot of pressure for a wheeze.",
        talk: "The light has no notes.",
      }),
      spot({
        id: "horn",
        name: "wall horn",
        rect: [218, 29, 58, 40],
        look: "A parking-lot horn on a nail. It could make a polite cough sound like a station ID.",
        take: "It comes down when DeeJay says so. He hasn't said so.",
        use: "It's on his side of the glass.",
      }),
      spot({
        id: "to-store",
        name: "hall",
        rect: [0, 36, 38, 126],
        exit: true,
        look: "Back toward Ned and the jars.",
        go: { room: "store", pose: null, say: "Back to the Feed & Seed." },
      }),
      spot({
        id: "to-gate",
        name: "fair road",
        rect: [282, 36, 38, 126],
        exit: true,
        look: "The fair is a glow at the end of the road. Midnight is the threat.",
        go: { special: "to_gate" },
      }),
    ],
  },
  gate: {
    id: "gate",
    name: "Fair gate",
    plate: "bg-gate.jpg",
    sign: [4, 4, 60, 9],
    poseAt: { squat: [166, 61, 70] },
    exits: [
      { spot: "to-wkuk", label: "WKUK" },
      { spot: "turnstile", label: "Midway" },
    ],
    spots: [
      spot({
        id: "guard",
        name: "gate guard",
        rect: [109, 54, 90, 112],
        look: "A tired man with a fan. He has stamped a thousand tickets and believed maybe six of them. Hattie's people walk in free.",
        talk: { special: "talk_guard" },
        useItem: {
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
      }),
      spot({
        id: "cutout",
        name: "prize-rooster cutout",
        rect: [198, 40, 109, 119],
        look: "Cardboard. Ideal proportions. The shape is what matters.",
        use: { special: "cutout" },
        talk: "The cutout grins. It has never had to mean it.",
      }),
      spot({
        id: "turnstile",
        name: "turnstile",
        rect: [6, 50, 90, 122],
        exit: true,
        look: "A turnstile with a very developed sense of paperwork.",
        talk: "It clicks for a living.",
        go: { special: "turnstile" },
        useItem: { vip: { special: "offer_vip" } },
      }),
      spot({
        id: "to-wkuk",
        name: "road back",
        rect: [0, 0, 45, 40],
        exit: true,
        look: "Back toward the station.",
        go: { room: "wkuk", pose: null, say: "Back down the road. The on-air light is still a gossip." },
      }),
    ],
  },
  midway: {
    id: "midway",
    name: "Midway, 11:40",
    plate: "bg-midway.jpg",
    hero: { at: [180, 152], height: 104, depth: { horizon: 105 } }, // depth: 104 at y 152 (booth counter at his belt), smaller toward the railing
    walk: [[[20, 151], [84, 149], [88, 141], [262, 141], [262, 177], [20, 177]]], // boardwalk up to the railing posts (bases y 130-145), past the booth's right corner (booth occludes him behind y 147); the Pavilion rope (x>262) is off limits // booth counter top y 103, booth floor y 147 (~44 px): counter meets his belt
    occluders: [{ id: "booth", base: 147 }],
    sign: [268, 92, 48, 8],
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
      }),
      spot({
        id: "kids",
        name: "Jingle Kids",
        rect: [24, 58, 52, 38],
        look: "Three teenagers in faded Rad-Safe chick-costume uniforms behind the counter: Dot, Rocco and Pip. As little kids they sang the jingle in the old Rad-Safe ads. They would like you to know they are over it.",
        talk: { special: "talk_kids" },
        useItem: {
          tickets: { special: "repay_pip" },
          photo: { special: "photo_pip" },
        },
      }),
      spot({
        id: "booth",
        name: "ring-toss pegs",
        rect: [18, 98, 50, 12],
        look: "Three rings, a row of bottles and pegs, and a prize shelf with one rubber basket on it.",
        use: { special: "toss_plain" },
        take: { special: "toss_plain" },
        useItem: { speaker: { special: "toss_speaker" } },
      }),
      spot({
        id: "cashbox",
        name: "Corny's cash box",
        rect: [68, 92, 16, 14],
        look: { special: "look_cashbox" },
        take: { special: "take_cashbox" },
        use: { special: "take_cashbox" },
      }),
      spot({
        id: "corny",
        name: "Slick Corny",
        rect: [106, 88, 40, 50],
        look: "Slick Corny, the barker, leans on the clock post in a straw boater and a corn-yellow vest, flipping a quarter. A man made entirely of fairground hustle. Something under the smile is counting.",
        talk: { special: "talk_corny" },
        useItem: { mirror: "He looks into the mirror and likes what he sees, but he never lets go of the cash box key. Professional.", map: "\"Follow the money,\" the map says. Corny sees it and stops smiling for exactly one second." },
      }),
      spot({
        id: "clock",
        name: "midway clock",
        rect: [112, 14, 34, 38],
        look: { special: "look_clock" },
        push: { special: "fix_clock" },
        use: { special: "fix_clock" },
      }),
      spot({
        id: "wheel",
        name: "ferris wheel",
        rect: [148, 12, 64, 80],
        look: "The ferris wheel. Rooster and Hattie rode it once, after their first save. She said you could see the whole county from the top. He was looking at her.",
        talk: "It creaks. It remembers.",
        use: "Not tonight. Not with midnight on the clock.",
      }),
      spot({
        id: "hawk",
        name: "red neon hawk",
        rect: [214, 30, 32, 42],
        look: "THE COCK GOBBLER, in red neon over the club that went up across from the Pavilion. A hawk in profile, wings half open. Hattie always did like a sign.",
        talk: "The neon buzzes back. Not a yes. Not a no.",
      }),
      spot({
        id: "club",
        name: "club doorway",
        rect: [214, 74, 46, 26],
        look: "The club door is propped open. Sad piano drifts out, minor keys. Somebody is leaning in the dark of the doorway, just out of the light.",
        talk: { special: "talk_hattie_door" },
      }),
      spot({
        id: "rope",
        name: "way to the Hot Oil Pavilion",
        rect: [266, 102, 54, 48],
        exit: true,
        look: "The boardwalk runs to the Hot Oil Pavilion's velvet rope. The rope wants a reason.",
        talk: "The rope is velvet and judgmental.",
        go: { special: "rope" },
        useItem: {
          ribbon: { special: "rope_in", say: "\"Guest judge.\" The rope believes in ribbons. He ducks inside before it can change its mind." },
          bill: { special: "rope_in", say: "He waves the past-due bill like a health inspector who has seen things. The rope decides it's above this and lets him through." },
        },
      }),
      spot({
        id: "to-gate",
        name: "boardwalk to the gate",
        rect: [0, 150, 70, 30],
        exit: true,
        look: "Back to the turnstile.",
        go: { room: "gate", pose: null, say: "Back to the gate. The guard is still thinking about his tooth." },
      }),
    ],
  },
  pavilion: {
    id: "pavilion",
    name: "Hot Oil Pavilion",
    plate: "bg-pavilion.jpg",
    // New pixel bg (Arlong, 2026-10-17). Scene scale measured: height ~= 1.57 * (feetY - 92) (cart counter 109 / wheels 145 = waist; stage edge 114-131 = knee).
    hero: { at: [150, 153], height: 96, depth: { horizon: 92 } }, // depth: 96 at y 153; ~1.57 px per px of feet y (horizon 92), so ~61 at the stage front
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
    ],
    cast: [{ spot: "gobbler", sprite: "hattie-front", at: [205, 110], height: 52 }], // on the stage, in the spotlight
    sign: [266, 6, 48, 8],
    vat: [14, 66, 84, 17], // the glowing oil surface
    poseAt: { squat: [128, 76, 70] },
    exits: [{ spot: "out", label: "Midway" }],
    spots: [
      spot({
        id: "gobbler",
        name: "The Cock Gobbler",
        rect: [180, 44, 56, 68],
        look: { special: "look_gobbler" },
        talk: { special: "talk_gobbler" },
        useItem: { vip: { special: "return_vip" } },
      }),
      spot({
        id: "lamp",
        name: "heat lamp",
        rect: [44, 0, 40, 57],
        look: "A heat lamp aimed at the oil. It could be aimed at a person, if the person stood where vanity put her.",
        useItem: {
          mirror: { special: "mirror_lamp" },
        },
      }),
      spot({
        id: "cage",
        name: "egg cage",
        rect: [99, 26, 30, 53],
        look: "The Yolk of Midnight, pitch black and glowing, in the same old prize cage from the stunt night. They say whoever eats it gets the Crow: a voice the whole county obeys.",
        useItem: {
          basket: { special: "basket_cage" },
        },
        talk: "The Yolk hums. It sounds almost like clucking, if you were listening for that. Nobody is.",
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
      }),
      spot({
        id: "crowd",
        name: "crowd",
        rect: [104, 76, 54, 30],
        look: "They came for a tasting. They are one bad wire away from leaving without eyebrows.",
        talk: "They shush each other. The show hasn't started, or it has, and they can't tell.",
      }),
      spot({
        id: "cart",
        name: "corn-dog cart",
        rect: [253, 62, 64, 85],
        look: "A corn-dog cart parked like a getaway car. Keys in it. She always plans her exit.",
        use: "It isn't time to borrow her exit.",
        push: "The cart stays. For now.",
      }),
      spot({
        id: "out",
        name: "tent flap",
        rect: [262, 20, 58, 40],
        exit: true,
        look: "Back to the midway, if you need a breath that isn't made of oil.",
        go: { special: "pavilion_out" },
      }),
      spot({
        id: "pip",
        name: "Pip",
        rect: [120, 98, 16, 34], // front row by the rope, right of the centre-left post (no sprite yet)
        look: { special: "look_pip_pav" },
        talk: { special: "talk_pip_pav" },
        use: { special: "talk_pip_pav" },
        take: "She's a person, not a prize. Corny's the one who confuses those.",
      }),
      spot({
        id: "padlock",
        name: "padlock",
        rect: [98, 131, 11, 13],
        look: { special: "look_padlock" },
        use: { special: "use_padlock" },
        take: { special: "use_padlock" },
        push: { special: "use_padlock" },
      }),
      spot({
        id: "keyring",
        name: "Corny's key ring",
        rect: [300, 113, 14, 17],
        whenNot: "rope_open",
        look: "Slick Corny's key ring on a hook on the corn-dog cart: cart key, cash-box key, and one little brass key the same color as the padlock. He hangs it in plain sight. Nobody would dare.",
        use: { special: "use_keyring" },
        take: { special: "use_keyring" },
      }),
    ],
  },
};
