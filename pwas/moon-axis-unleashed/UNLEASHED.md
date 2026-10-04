# Moon Axis Unleashed

## Genre

Cinematic **chase-rail** combat, not an isometric airplane game.

The seven sorties are forward corridors: a scramble, a low surface pass, a trench, a yard, a speed-matched train, a throat, and a collapsing well. The recorded lines assume that geography ("Starfork on your left", "stay low", "match speed", "out of the well"). A camera sitting behind and above a solid F6F-V Voidcat shows the Hellcat, the moon, and the fire without throwing those verbs away. Isometric was considered and rejected for that reason. Steering is still the flight plane: mouse or WASD slides and pitches the cat, click or Space fires the Hispano-X, Shift boosts, E or right-click barrel-rolls.

Pulp 1947 is unchanged. Pacific Void Command versus Moon Axis (Mondstab). Same seven sorties, same win and lose, same named characters, same branch flags (`forkDead`, `sichelAlive`).

## What changed

- Wireframe cabinet replaced with lit solid meshes: Hellcat, twin-boom Starfork, darts, Würger, gull-wing Stuka, twin-nacelle Geist, crescent flying wing, Moonhogs, meteor-iron flatcars, Eisenwurm cradle, foundry bell.
- Chase camera, moon and Earth on the scramble, regolith bowls, pinched trench ribs, amber Staff arches, dust, and fireball bursts instead of vector shatter.
- CRT scanlines pulled back. Title reads Unleashed. Theme color is copper `#c45c26` so the installed app is not the black Moon Axis icon.
- Separate score and settings keys (`moon-axis-unleashed-*`). Service worker cache is `moon-axis-unleashed-v1` and it only deletes caches with that prefix, so it will not wipe a Moon Axis cache on the same origin.
- `vox/` and `music/` were not regenerated. Cue IDs in `js/scenes/play.js` match the original file one-for-one (77 ids, same counts).

## Layout per sortie

Objectives, enemy types, beat times, and story gates are the original ones. Spacing and cover are new.

1. **Cislunar scramble** — Fork sits further out on the left; the second Starfork is high and right. Nachtschwalbe arrive in a taller, wider volume instead of a tight tunnel. Earth and a battered moon hang in the distance.
2. **Schrödinger surface** — Flak is a broken ring across offset crater bowls, not a straight battery down the centerline. Stuka dives and the `stuka_01` beat are unchanged.
3. **Festung Selene** — Trench ribs alternate wide and pinched and yaw slightly. Wall guns stagger instead of mirroring. Diamonds sit off the centerline, one high and one low, before Mondsichel. Eject window is still ~2.6s.
4. **Kesselgrube** — Yard doors are a horseshoe (near gate, mid pair, far arc) rather than a corridor. Moonhogs hold a wider right echelon. Fork peels from further left. The 12-second peel window is the same.
5. **Stabzug** — Flatcars are stretched along the snake (`holdZ` steps of 11, Eisenwurm further back). Shield orbs, Geist's two passes, and the cradle-exposed gate are unchanged.
6. **Inside the Staff** — Ribs breathe wider and narrower. Throat guns are staggered. The wide wing still holds at depth with drone cover; the foundry core still waits on its orbs. False win on the core.
7. **Out of the well** — Debris plates are larger and spread across a wider collapsing bore. Same shock blasts, same mouth line, same escape cinematic into the real win.

## Branch cue checklist

Verified by diffing every story cue id in `js/scenes/play.js` against the source game (same ids, same counts), then reading the conditions. Not playtested end-to-end with audio.

| Branch | When it fires | Cue |
|---|---|---|
| Every sortie launch bark | `beginCombat` | random `cat_launch_01`–`05` |
| Sortie 1 brief | radio, flags ignored | `card_01`, `hale_bark_02`, `cat_launch_03` |
| Fork on the left | stage 1, t=0.35 | `fork_01` |
| Head-on darts | stage 1, t=1.0 | `nacht_01` |
| Würger pair | stage 1, t=10.2 | `wurger_01` |
| Mondstab chatter | stage 1, t=35, 8s since last | random `mond_01`–`07` |
| Sortie 2 brief | radio | `card_02`, `hale_bark_01` |
| First Stuka | stage 2, t=4.5 | `stuka_01` |
| Sortie 3 brief | radio | `card_03`, `hale_bark_01` |
| Mondsichel intro | stage 3, t=22 | `cat_boss_01`, `sichel_02` |
| Sichel ejects | boss dies on sortie 3 | `sichel_01`, banner, `sichel-eject` music |
| Finish the wreck | eject pod shot inside ~2.6s | `sichelAlive = false`, `sichel-down` |
| Let him go | 2.6s elapse | `sichel_03`, `sichelAlive` stays true, `sichel-gone` |
| Sortie 4 brief | radio | `card_04`, `hale_bark_04`, `hale_brief_01`, `fork_02`, `cat_launch_05` |
| Yard doors | stage 4, t=0.3, Fork alive | `fork_04` |
| Peel | stage 4, t=22 | `fork_03`, `wurger_02` |
| Reyes dies | peel pair still up when `peelUntil` passes | `fork_05`, then `hale_bark_03`, `forkDead` |
| Reyes lives | both peel Würger die in the window | no `fork_05`; `fork-live` music |
| Sortie 5 brief, Fork dead | `radio()` filters with `forkDead` | `card_05`, `hale_brief_02`, `cat_radio_01` |
| Sortie 5 brief, Fork lives | same | `card_05`, `hale_bark_05` only. `hale_brief_02` and `cat_radio_01` are refused by `Vox.allowed` |
| Hale "off the board" | death plays `hale_bark_03` immediately; the brief line is `hale_brief_02` before the rail, and only if `forkDead` | see above |
| Train | stage 5, t=0.25 | `cat_boss_02` |
| Geist | t=8 and t=22 | `cat_boss_03`, `geist_01`, then `geist_02` |
| Sortie 6 brief, Sichel alive | radio | `card_06`, `rabe_radio_01`, `hale_bark_08`, `rabe_radio_02`, `cat_radio_02`, `hale_brief_03` |
| Sortie 6 brief, Sichel burned | radio | same list but `hale_bark_09` instead of `hale_brief_03` (`allowed` also blocks `hale_brief_03` when he is dead, and blocks `hale_bark_09` when he is alive) |
| Rabe in the throat | stage 6, t=1.4 | `rabe_02` |
| Alt taunts (let him go) | throat, `sichelAlive` | `cat_boss_04`, `sichel_03`, `sichel_alt_01`, `sichel_alt_02` |
| Wide wing is not him | throat, Sichel dead | `sichel_05` only |
| Foundry | stage 6, t=24 | `cat_boss_05`, then `sichel_04` if alive else `rabe_01` |
| Core dies | boss kill | `rabe_03` (false win) |
| Sortie 7 brief | radio | `card_07`, `hale_bark_06`, `rabe_radio_03`, `cat_radio_03` |
| Well closing | stage 7, t=0.2 | `rabe_04` |
| Sichel in the well | stage 7, t=12, only if alive | `sichel_alt_03` |
| Mouth | stage 7, t=48 and escape cinematic | `cat_win_02` |
| Real win | `finish(true)` | `cat_win_01`, `hale_bark_07`, `cat_win_03` |
| Kill barks | non-turret splash, 22% | `cat_kill_03` on a dart, else `cat_kill_01`–`04`; `cat_kill_05` only if `forkDead` |
| Hurt barks | shield hit | `cat_hurt_01` at 3, `cat_hurt_02` at 2, `cat_hurt_03`/`04` at 1, `cat_hurt_05` at 0 |

Briefings still unlock LAUNCH only when the radio queue goes idle. FIRE and click do not skip the VO. SKIP is the only skip. That lives in `js/main.js` and was not rewritten.

No cue was dropped.
