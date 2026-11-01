# Choplifter fidelity notes

This is an independent tribute. It does not include a Broderbund disk, an Apple II ROM, original shape bytes, or sampled sounds. Pictures and tones in `js/game.js` and `js/audio.js` are newly drawn. The old sprite PNGs were removed so this folder does not ship extracted art.

The recomp at https://github.com/sp00nznet/choplifter-apple2-recomp (MIT) publishes the host, notes, and screenshots. It does not publish the game logic: the recompiled C is gitignored. Numeric behaviour below is taken from that repo's notes where they exist (`host.c`: button 0 fires and turns, paddle axes, hi-res page flips) and from the published measurements of the same 1982 disk (routine names such as `thrust_table` at `$7418`). Those measurements were read for behaviour only. No listing, snapshot, or shape was copied here.

Screenshots of this build, set beside the recomp's `screenshots/title.png`, `flying.png`, and `gameplay.png`, are in the pull request.

## How to re-check

```bash
node pwas/choplifter/selftest.mjs
```

That script runs the simulation with no DOM. In Chrome, open `pwas/choplifter/` from a static server. `?shot=title`, `?shot=fly`, `?shot=gameplay`, and `?shot=rescue` pose the canvas for screenshots. A headless pass of those pages reported no page errors and no console errors, on a 1280×800 desktop viewport and on an 844×390 mobile viewport. Portrait shows the existing "Rotate to landscape" hint. Pause (P) toggles, and a held Z turns the nose through the forward face to the other side.

## Behaviour

| Original behaviour | Match | How it was checked |
|---|---|---|
| Screen is 280×192 hi-res, about 12 frames a second, no interrupt clock | Matched | Fixed 1/12 s step in `main.js`. Two-page flicker is not simulated; one canvas is drawn each step. |
| Six artifact colours: black, white, violet `#ff44fd`, green `#14f53c`, orange `#ff6a3c`, blue `#14cffd` | Matched | Same hex values as a colour Apple II render. Ground and the in-game score band use the even-column violet stripe of the `$55 $2A` fill, which is what the recomp flight BMPs show. White sprite edges pick up a one-pixel violet/green or orange/blue neighbour, the hi-res colour leak. Shapes are still newly drawn. |
| In play the score band is that violet stripe, with the three counters in black rounded boxes and white digits. The title's loading picture keeps the cyan/green/orange bar | Matched on the flight screens | `drawVioletHud` plus `lemon` for play, attract, and the end. Each box has a one-pixel orange, blue, or green rim. The title bar stays the rainbow, which is what `screenshots/title.png` in the recomp shows. Compared in `compare_flying.png`. |
| Stars twinkle; a planet about 22 dots across sits in the upper right of the screen | Partial | New star field and a new banded moon (white, orange, blue), about the size of the one in the recomp flight shot. It is not the original 66-store picture. |
| Big violet stepped masses rise off the floor and scroll at half the view speed. Barracks and the post office sit in front of them | Partial | `MESAS` is a new height map: plateaus up to about 120 dots tall, edges stepping 12 dots down every 8 across. Not the original four hill shapes. Barracks are a larger blue-and-white pyramid; the post office is a longer orange block with a flag and a green pad. Compared in `compare_flying.png` and `compare_rescue.png`. |
| Chopper, tank, and moon read at roughly the flight-shot sizes (chopper about 40 by 14, tank a small ground vehicle, moon about 20 across) | Partial | Side chopper is about 48 dots wide. Tank hull is white with green treads so it shows on the stripes. Moon radius is 11. Still simpler than the original shapes. |
| World: barracks at `$0380 $0480 $0580 $0680`, fence `$1174`, base `$1274`, door `$12D5`. Chopper clamped to `$02D0`–`$1300`, view to `$02B0`–`$1208`, start at `$1293` | Matched | Constants in `js/game.js`. Base is on the right; the flight back is the long one. |
| Scroll leads the chopper: future position 70 px from the left edge when flying left, 210 when flying right, closing at speed+4. On the pad the view eases toward the base at 4 px/frame | Matched | `scroll()` |
| Horizontal: lean follows the stick one step a frame (−5..+5). Thrust 0, 96, 180, 264, 348, 420 in 256ths. One sixteenth of speed is drag. Cap 21 dots/frame | Matched | `selftest`: full lean reaches exactly `21*256` and stays there |
| Vertical: 16 climb rates −10..−1, 0, 1, 2, 3, 4, 6. Speed closes half the difference a frame. Ceiling 112 | Matched | `selftest`: index 10 holds altitude. Keyboard and the on-screen stick rest on index 10 (the table's hover). A raw centred paddle is nearer index 8, a slight climb. That hardware bias is not copied onto a digital stick. |
| Landing: drop faster than about 4.4 dots/frame bounces. Touching down at the 21-dot cap crashes. A tilted landing rocks back to level (two steps a frame) and the door stays shut until it is level | Matched | `selftest` for the bounce, the crash, and "tilted does not board" |
| Pose is separate from velocity. Short press of the turn button faces the viewer. Holding it past the front carries on to the other side. Pressing while already facing out turns toward the stick | Matched | Z and the Face button are button 1. `selftest` checks the short press. A 500 ms hold in Chrome ended on the opposite pose (+4 from a start of −4). |
| Button 0 fires one shot per press, not on the ground, at most five in flight. Only a forward or turning shot comes down onto a tank. A side shot can open a barracks | Matched | `selftest`: a side shot leaves the tank; a down shot removes it. Space and Fire are button 0. |
| 64 hostages, 16 in each of four barracks. The fourth starts open with 8 already outside, gaps an even 32..158 | Matched | `selftest` counts |
| More hostages leave an open barracks every fourth frame, but not while 5 are outside and not while 16 are outside or walking home | Matched | `releaseOne()` |
| Level on the ground, outside the pad: +8/+9 or −10/−11 boards, −9..+7 is crushed, and only while the door is open. Capacity 16. A full chopper turns them away | Matched | `selftest` |
| On the pad (base+13..base+63), level, they climb out one at a time and count as home immediately, then walk to the door | Matched | `selftest` unload |
| Level 0..3 rises by one on the first unload after a boarding, and not on an unload with no new boarding | Matched | `selftest` |
| Spawn about 8 frames in every 256. Level 0 tanks only (max 1). Level 1 jet half the time else tank (max 2 tanks, 1 jet). Levels 2 and 3: drone 1 in 4, else jet half the time, else tank. Caps 2/2/1 then 2/2/2. Tanks and drones only while the chopper is 512 dots short of the fence | Matched | Table and `spawnEnemy()`. Not every random branch is asserted. |
| Tanks drive in until 128 dots away, then choose, and they do not cross the fence. Shells threaten a chopper near the ground and hostages. The original also puts right-side spawns at the world's far left and drops them, so tanks come from the left | Partial | Approach, the 128-dot band, fence stop (`selftest`), and left-side spawns are in. The gun's five aim steps are a single lob toward the chopper. Shells open a barracks they hit. |
| Jets cruise, come forward, fire a missile in the air or a bomb on the ground, and leave once the chopper is over the fence's block. Some are bold at levels 2 and 3 | Partial | Same phases and the bold chance (1/8 then 1/4). The original four-byte script steps are not reproduced. |
| Drones home at up to 5 dots/frame, match height, destroy the chopper on contact, and at level 3 drop shells. They are the only enemy that follows you onto the post-office side of the fence | Matched in behaviour | `stepDrones()`. They are only spawned on the battle side, then they follow. |
| Three sorties. A loss with passengers aboard adds them to the killed. 64 home shows crowns. Home+killed = 64, or the third chopper lost, shows THE END | Matched | `selftest` for 64 home, 63+1, and the third death. Banners say FIRST, SECOND, and THIRD SORTIE. The published notes name the first two and a message table; the third string is the natural reading and is flagged below. |
| Score is the three counters: killed (orange/red, left), aboard (blue, centre), home (green, right). No points for enemies | Matched | Lemons in the HUD. Destroying a tank does not change a point total. |
| Title, then attract ("your mission: RESCUE HOSTAGES"), any key starts. Title and attract are silent. New game plays the three three-note phrase | Partial | Title text and the mission card are drawn. The attract chopper is a new flight, not the original 32-step script. Tones use the published periods (144, 67, 97, then 112, 67, 97, then 80, 67, 97). |
| Other tones: shot (period 48, falling), board (255, 224, 152), killed (48, 67, 97), home (40), dirge (64, 84, 97, 131), noise for tank and jet fire | Partial | Same periods, played as square waves rather than speaker clicks. Drone ticks are sparse instead of every frame. No engine sound, which matches the Apple II (the speaker has no rotor loop). |
| Esc pauses. Ctrl-S sound. Ctrl-A / Ctrl-V reverse the stick. Ctrl-L then a key sets the level to the key's low two bits | Matched, plus P | Esc, P, and the on-screen Pause button. P is the control this page already advertised. |
| One barracks must be emptied before the next | Not the original | The manual says that. The code lets people out of whichever open barracks you are over, or else any open one. This build follows the code. |

## For Arlong

- The on-screen credit, the README, the manifest description, and the attract screen use Arlong's line exactly: "A tribute to Choplifter by Dan Gorlin, Broderbund 1982". The recreated "Broderbund Software presents…", "Dan Gorlin", "Copyright 1982", and "Independent tribute" lines are gone.
- `pwas/games/choplifter.html` is outside this folder and was not edited. Its blurb is still the older sentence.
- In play the three counters sit in black rounded boxes with white digits, on the violet stripe band. Each box has a one-pixel rim in the counter's colour (orange, blue, green), which is how those lemons read in the recomp flight frame.
- Sprites are new and simpler than the original shapes: the chopper, tank, jet, barracks, post office, and hostages read in the same palette and at a similar size, but they are not tracings. The logo is a block alphabet with an orange/blue offset, not the original hi-res wordmark.
- After a crash there are 18 frames in which the new chopper cannot be hit, so the explosion does not destroy it immediately.
- Cache name is `choplifter-v26`.
- Ground and cliffs are solid violet, not 1-pixel stripes, so scrolling does not moire. The cliff layer is the original half-speed hills, scrolled in whole pixels. Shots leave the cap when they hit, reach the ground, or leave the screen. The chopper hurtbox is the body, not the rotor. Jets and their missiles hit that body; a bullet that crosses a jet's sprite destroys the jet. A tank shell or a tank driving over a hostage squashes them. `?debug=1` draws the boxes.
