# Rooster beta: notes for the next version
Arlong's ideas logged here, worked on together in one batch when he says go.

**Next-version batch (Arlong said GO, 2026-10-19), local dev only, not deployed.** [x] = done in this batch; [deferred] = held back, reason given.
(The current batch, in progress locally: hatch/bucket fix, yard-rooster dismount line, rail-sit vanish, grub + all inventory icons, Mortgage matador cutscene, Peck/Henny push gags, Ned screwdriver bell.)

## Queued
- [x] Hover highlighting off by default; optional Hints/easy-mode toggle (maybe also the hover sentence line). Menu: Hints on/off (outline only).
- [deferred] Rail sit: Arlong may send a mockup of the pose he had in mind; repaint from it. Waiting on Arlong's mockup.
- [x] Jingle Kids: first Look says "trio of kids" but only 2 are on screen. Fix the text to match, or add the third kid.
- [x] Mortgage grub lure cutscene: Rooster stands too low/forward in the frame. Move him up and back, right beside the ribbon post in the background, so the charge lines up with the post.
- [x] Pavilion clock: when Rooster looks at the clock he stands directly behind the barker (hidden behind him). Set the clock stand point to the right of the barker so neither one blocks the other (photo: attachments/4e0643f0df6ef8c9745668eaef2ebfc2b9e9acb87824e1569f4c7a9caa26112c.jpg). Also check the stand-beside rule against NPCs standing in front of background hotspots in every room.
- Opening hook ideas: (a) a close-up of Rooster's gloved hands holding Hattie's note to kick off the adventure, and/or (b) a night intro scene: a thief sneaks toward the egg in the henhouse, Henny raises the alarm or lights a Rooster-signal in the sky (like the Bat-Signal). Check against rooster-story.md canon.
  - [deferred] Not built (Arlong: skip for now). Canon check: the story opens on the rooftop coop with the note in the bucket ("MIDNIGHT. FAIR. BRING NOTHING. —A friend."), so (a), a close-up of his gloves holding that note, fits canon as-is. (b) needs care: the Yolk is laid by the hen Midnight and stolen by Hattie offscreen, so a thief at the henhouse would need to be Hattie (or her shadow) and the egg Midnight's; Henny never speaks out loud (thought bubbles only), so she'd raise the alarm by flapping/lighting the signal, not shouting; a Rooster-signal in the sky is new canon and should be OK'd.

## Arlong notes after first full playthrough (2026-10-19)
- [x] Cock Gobbler club neon: match the box-art / gobbler-club-neon-ref.jpg sign (red neon hawk head, script "The", caps COCK GOBBLER), painted pixel neon.
- [x] Cock Gobbler dialogue portrait needs an update.
- [x] Hattie convo: not obvious that clicking the text advances it; add a clear advance cue.
- [x] During Hattie convo, a foreground crowd builds up more with each step, so the glide over the crowd makes sense.
- [x] Animate the cage moving over the vat.
- [x] Show the glowing Yolk of Midnight egg inside the cage.
- [x] Lock close-up: Rooster scaled too big; should match barker height, just lower on screen. Consider making the vat bigger/more ominous; maybe redo the background for drama.
- [x] Midway: tent alignment shifts as you hover different parts of the screen; fix.
- [x] Hot sauce on C.G.: she says "Whatsa matter, I'm not hot enough for ya?"
- [x] Double-clicking an edge exit should go straight to the next scene (no nav words needed).
- [x] Autographed photo stays in inventory after giving it to the hen. Maybe keep it on purpose: feed it to the goat, give it to different people for different reactions.
- [x] Radio station ON AIR light doesn't read ON AIR; move it above the door, and move the Feed & Seed sign elsewhere (e.g., down the side hallway back to Ned's store).
- [x] Corn dog cart: separate corndog vendor sprite instead of the barker.
- [x] Geiger counter + bulb: rename (e.g., "geiger counter with bulb") and new icon after combining.
- [x] Corny's cash box has no visual; paint it in.
- [x] Every finale action should animate.
- [x] Final image: make it a black-and-white newsprint front page with a photo of the big glide.

## How this batch did them (for review)
- Midway tent "shift": no layout change could be reproduced; with hints on, the tinted hover boxes over the striped tent read as the tent moving. Hover highlight is now off by default, and outline-only when Hints are on.
- Lock close-up: Pavilion scale now matches Corny's height (84 at y153); the vat got animated red-lit steam (bigger vat / new background not done; say if you still want a redraw).
- Corn-dog cart: new vendor Marge (vendor-sprites-v1.jpg) at the cart; she's the one who looks round when he reaches for Corny's keys.
- Finale: the cage + Yolk is a prop now (painted out of the plates); it swings out on the CLUNK, jogs down on the lamp/sauce beat (Hattie flinches/leans), the Yolk drops into the basket, Hattie walks off to her cart; the glide is a cutscene over the crowd; egg-fried and dark-side endings get a drop/shake. The Yolk is painted pitch black with a green glow (canon: "pitch black and glowing").
- Final image: Silver Age comic cover (splash + 4 illustrated panels with bubbles/editor notes). Newsprint version removed per Arlong 2026-10-19.

## Side notes (logged, not in current pass)
- Background gag character: paranoid homeless drug-addict/criminal type who keeps muttering about seeing a "giant cock" / "there's a giant cock comin after me!" (rooster wordplay). Midway or town background flavor.

## Playthrough notes, Oct 21 2026 (DONE in the Oct 21 batch, shipped Oct 23; see notes in brackets)
1. BUG: Rooster sometimes vanishes on the roof after clicking toward the bucket, then back toward the board (intermittent). [DONE: double-buffered frame swaps, old frame keeps walking until the next one loads]
2. Bulb unscrew gag: juggle hot bulb hand to hand, "Ooh, ouch, ah, ah! Hot bulb! Who uses tungsten bulbs anymore?!" [DONE]
3. Conspiracy board: change 3:14 to 3:33. [DONE]
4. Inventory Look: show a closeup of the item in his hands on the main screen. [DONE: closeup of the item in his gloves (fx/closeup-gloves)]
5. Rooftop -> Fence Line: he should enter from the left. [DONE: room.hero.from entry points]
6. Fence sit: walk to the fence spot from wherever he stands, no warp. [DONE: walks to the rail, then sits]
7. Icons wrong: blue ribbon looks like a torn ticket half; hot sauce looks like the ribbon; hand mirror looks like hot sauce; past due bill looks like the mirror; loudspeaker looks like paper. [DONE: icons re-cut]
8. KEEP: goat grub and Ned bell animations are great. [KEPT, untouched]
9. Portraits needed: Henny, Deejay, and a subtle Hattie portrait that doesn't spoil the reveal. [DONE: Henny and DeeJay portraits; Hattie is a silhouette behind a frosted door (review)]
10. Ticket half text: line break after "initialed S.C." so "Corny is..." starts a new line (it reads like a name "S.C. Corny"). [DONE]
11. Ring toss mini game or puzzle. [PARTIAL / PLACEHOLDER: still the horn-and-pegs puzzle, deepened by item 22's hints; no real mini game yet]
12. Midway right edge: show the rope/barrier so it reads as an interaction. [DONE: fg/midway--rope overlay]
13. Vat: animated bubbling and popping oil matching the painting. [DONE: CSS golden oil domes that swell and pop, plus a rolling-boil glow (respects reduced motion)]
14. Animate Pip sneaking the keys past Marge and unlocking the rope. [DONE, simple: Pip slides past on a single sneak frame (review)]
15. Flashback scene of the stunt night. Where? Before the Yolk save, or when the ticket halves are joined? (Decide with Arlong.) [DONE: see 20]
16. Cock Gobbler visibly holds the cage chain; when blinded by the mirror, animate her moving it. [DONE: hattie-chain / hattie-flinch frames]
17. New sprite for Rooster holding the Yolk. [DONE: rooster-yolk sprite while he holds it]
18. New lunge sprite for "Pah-KAW!", maybe him jumping and kicking off the oil vat, splashing the crowd (matches "wearing the fryer" egg-save ending). [DONE: pahkaw lunge cutscene; showboat version kicks off the vat rim with an oil splash (lunge head pasted; small smudge on the splash beak, review)]
19. Comic cover and panels for the egg-save (non-faces) ending too. [DONE: Silver Age showboat cover + 4 panels]
20. Flashback goes at the joined ticket halves (agreed Oct 21). [DONE: 7-line sepia flashback at the ticket join (CSS filter on existing plates, no new art yet)]
21. Backstory depth (agreed Oct 21): optional Act 1 memory items (Rooster & Hattie poster at WKUK, golden hawk feather in the coop) whose Look lines build longing; they are red herrings, not puzzle items. Hattie's clues should trail through places they shared (ring toss where they met, Pavilion where they split) and pay off in the flashback. [DONE as look-only spots (feather on the HQ coop window, poster on the WKUK notice board), not inventory items: no icon art]
22. Loudspeaker/pegs hint (agreed Oct 21): at WKUK DeeJay tests the loudspeaker and the vibration knocks something off a shelf; ring-toss pegs Look line "These won't budge in an earthquake"; Dot grumbles the only thing that rattles Corny's booth is Corny's own yelling. [DONE]
23. Farmer Peck exposition (Arlong idea Oct 21): his memory wanders and he shouts old memories of Rooster & Hattie, still phrased like weather reports (canon: he speaks only in weather). Keep it affectionate, not mocking. Connection to Hattie/Rooster TBD with Arlong. [DONE: four memories cycle, then "Barometer says goat."]
24. DECIDED (Arlong, Oct 21): Hattie is Farmer Peck's granddaughter. He calls her "my Hattie-girl," wonders why she quit visiting, and shouts old Rooster & Hattie memories as weather reports. New canon: add to rooster-story.md when this batch is worked. [DONE: canon added to rooster-story.md]

## Arlong ideas, Oct 23 2026 (QUEUED FOR THE NEXT BATCH, not the batch now running)
25. Fate of Atlantis-style "it actually works" combos: styrofoam + acetone = "weird smelly sticky goop"; goop on a potato; a homemade potato cannon (fire only somewhere open, like the farm field or the roof: "This is pretty dangerous to use here, maybe I need someplace with more space"); hair spray primes it, a lighter lights it; animation of the flaming potato arcing across the sky.
26. Replace the rope gate at the vat with a superstitious carny guard. Merge him with the paranoid background guy: he mutters about a shrunken-head ghost that's followed him "ever since that cursed island of monkeys" (Monkey Island homage). Normal way past: give him found items. Alternate: the flaming potato flies past, he thinks it's the ghost and runs. Alternate route earns a point toward a different ending or swaps a comic-cover panel. Conflicts with the Pip-trust rope mechanic and the Pip keys/Marge animation (item 14); resolve with Arlong.
27. Hot sauce vat beat: animate it (currently text only: she leans in to smell it and the cage jogs down). Make it a gag and animate the cage hitting C.G.
28. REVISED (Arlong, Oct 23 late): keep the corn-dog cart a cart (no trike). Change the ending text and comic panels so she escapes in a getaway car instead (whose car: see 45).

## Arlong notes, Oct 23 2026 evening (queued for next batch; pics coming)
29. Walk anywhere you click, SCUMM style: if the point is blocked, walk as far as he can toward it and stop. [DONE Push A, Oct 24: click the floor and he walks there (as far as he can get); hotspots walk him to the spot, then act]
30. Use any inventory item on Rooster himself, with a funny line for each. [DONE Push A: a Rooster button over him while an item is held; a line per item]
31. Scene loads show black while art loads: preload the next scenes' art (within rate-limit limits) or hide the load with a fade. [DONE Push A: rooms fade in (0.4s) and the neighbouring rooms' plates preload]
32. WKUK: after DeeJay's "You never did tell anybody what happened that night," the "Just did" line should cut to Rooster's portrait (it currently shows DeeJay's). [DONE Push A: the "Just did" line shows Rooster's portrait]
33. Clock fix: show him shimmying up the post (use the profile squat pose with knees slightly bent, or give Arlong a base sprite to edit). [DONE Push A with 42]
34. Arlong wants the rope assets to adjust the perspective himself (sent Oct 23).
35. Walk first, then animate: the rubber bucket egg catch and the hot sauce pour start the animation while he's still sliding into place. He must reach his mark, then the action plays (check every cutscene for this). [DONE Push A: every hotspot action waits for him to reach his mark (walk-then-act, cancelled by any other action); sauce toss needs no walk]
36. Arlong asked for the full script to read and fine-tune.
37. NEW ART (Arlong, Oct 23): rail-sit sprite set for the fat, puffed-up rooster, at rooster-scene-art-v2/rooster-sit-sprites-v2-arlong.jpg (magenta key; 4 poses: side sit, side sit with boots tucked, hop/dismount, front sit). Replaces the current sit frames; cut it with the cut_sit.py pipeline. [DONE Push A: cut_sit.py cuts the v2 set; the front sit is scaled to the fence]
38. Pip unlock (screenshot: shots/rooster-next/arlong-oct23-pip-unlock.jpg): her hand isn't over the padlock while she unlocks it, because she stays in her back position. She should walk to the front of the lock post, unlock it with her hand on the lock, then go back. [DONE Push A: Pip walks to the front of the lock post, unlocks with her hand on the lock, walks back]
39. Rope gag: when the chicken pops up behind the rope at the end, have it saunter out to the front so the gag is visible. [DONE Push A: the hen struts out to [170,152] in front of the rope]
40. Hot sauce gag (replaces 27): from where he stands, Rooster raises the bottle like the grub/matador pose (swap in the bottle), tosses it, and it arcs into the vat. SPLASH: spicy oil hits C.G.'s face, the heat makes her drop the chain, and the cage drops low enough. No walk to the vat, no C.G. sniff. The sauce leaves the inventory (it has no later use). [DONE Push A: matador raise, bottle lob, splash, chain drop; no walk, sauce leaves the inventory]
41. Flashback: keep the sepia fade. Use the same backgrounds tweaked to look years older (mostly just the Pavilion tent). The crowd gathers slowly, and in it is an intimidating silhouette of the man who rigged it: a big, gruff guy in his 40s-50s with a fat stogie, a chain bracelet and a goon cap. [DONE Push A: aged Pavilion plate, crowd rises a row per beat, stogie silhouette from beat 2]
42. Clock shimmy: use sprite 3 of Arlong's rail-sit set (rooster-sit-sprites-v2-arlong.jpg), or alternate sprites 1 and 2, with the arm edited so it wraps the pole; the bent legs sell the push up. Arlong is doing the rope art himself. [DONE Push A: alternates shimmy frames a/b hand over hand up the post, behind a clock-housing cutout, then slides down]
43. Midway right edge: replace the rope "bouncer" with the superstitious carny bouncer guarding it. Every existing way past the rope works on him; the potato ghost scare is an added gag. (Pip's Pavilion rope path is unchanged.)
44. Ring toss mini game: first-person view from slightly above the rings. A timing meter sets how far the ring flies, and his hand position sets left/right. Rigged and unwinnable as a troll (canon: glued pegs) until the loudspeaker trick, which keeps the existing puzzle.
45. DECIDED (Arlong, Oct 23): the gruff stogie guy (40s-50s, fat stogie, chain bracelet, goon cap; new character, name TBD) rigged the stunt night years ago, works for Mayor Bantam, and drives Hattie's getaway car in the finale. Corny is still busted on air. Needs a sprite (silhouette in the flashback crowd, then him at the wheel), the getaway car art, and the ending text and panels changed from corn-dog cart to his car. [DONE Push A: stogie silhouette + getaway car sprite, ending text and the hero cover's panel 1 caption changed to the car; he stays unnamed]
46. NEW ART (Arlong, Oct 24): his painted Midway rope, brass posts with a velvet rope and a "HOT OIL" sign, saved at rooster-scene-art-v2/rope-hot-oil-arlong.png. It replaces the Midway right-edge rope (Push A): scale it, fit its perspective, and use it as a foreground layer. In Push B the carny bouncer stands in front of it. [DONE Push A: scaled and fitted as fg/midway--rope (also baked into the midway plate)]
