# Audio cues (Push C, 2026-10-24): Brook's drop list

Files go in `audio/in/`. Use `.ogg`, `.wav` or `.mp3`; the manifest prefers ogg, then wav, then mp3.
Then run `python3 tools/audio_files.py`.
Lengths are those of Brook's current placeholders. A replacement can be a little longer or shorter.

## One-shot cues

| File | Type | Length | Trigger |
|---|---|---|---|
| `title-sting` | one-shot | 2.2 s | New game, before the cold open |
| `wheeze` | one-shot | 0.8 s | The crow with no Atomic Egg (`*pah*`) |
| `geiger` | one-shot | 1.4 s | Using or looking at the geiger counter |
| `click` | one-shot | 0.7 s | The rigged counter keeping time |
| `blip` | one-shot | 0.2 s | Small UI beep |
| `pah-kaw` | one-shot | 1.6 s | The real trademark call, only when the egg is saved |
| `ding` | one-shot | 1.3 s | Service bell at Ned's |
| `bonk` | one-shot | 0.6 s | Goat skull against a barn post |
| `crow` | one-shot | 1.3 s | Hints switched on (Menu), and the yard roosters |
| `footstep` | one-shot | 0.8 s | Every other walk step while Rooster walks |
| `door` | one-shot | 1.3 s | Any room change that isn't the hatch or turnstile |
| `hatch` | one-shot | 1.0 s | Into or out of the henhouse |
| `pickup` | one-shot | 0.5 s | Inventory gains an item |
| `turnstile` | one-shot | 0.8 s | Gate to Midway, and the turnstile spot |
| `clock-tick` | one-shot | 1.0 s | Each time card (three ticks, one a second) |
| `cutaway` | one-shot | 0.6 s | Cold open and club cutaway start |
| `ring-toss` | one-shot | 1.3 s | The ring-toss choice |
| `hen-cluck` | one-shot | 1.4 s | Entering the fence yard (the yard hens) |
| `neon-sputter` | one-shot | 1.45 s | Club cutaway: the stogie henchman's smack on the sign, at 1.8 s, with GOBBLER's 0.5 s flicker (`SIGN_MS.smack` in `js/beats.js`). **Brook's synthesized placeholder, approved by Arlong 2026-10-25** (`assets/audio-placeholder/neon-sputter.*`; WAV/OGG/MP3 staged, OGG plays) |
| `neon-lightup` | one-shot | 2.6 s | The cut to the club sign right after Hattie's "Hawkeye Hattie is dead" speech at the Pavilion. Letters come on across 0.14–0.9 s, and the full name snaps at 0.95 s when the hum does. Hands off to the `neon-hum-full` loop when it ends. **Brook's synthesized placeholder, approved by Arlong 2026-10-25** |
| `henny-cluck` | one-shot, 6 variants | ~0.5–1.4 s | Henny in play: every thought bubble, plus a look, talk or item on her that has no thought line. Also her non-`real` ending bubbles. She **never** speaks words in play. Files are `henny-cluck-1` to `henny-cluck-6` (Brook: `assets/audio-placeholder/henny/`, picked by `--stage`). Picked at random with no immediate repeat; falls back to `henny-cluck`, then `hen-cluck`, then the synth |
| `smoke-whoosh` | one-shot | ~1.2 s | Smoke veil clearing (reveal payoff), on the first frame of the clear strip (`pavilion/smoke-clear` at the Pavilion since the Hawkeye pass; `club/smoke-clear` for the club booth). Brook's has a sax note about 0.72 s in, timed to when the mask shows. Brook: `assets/audio-placeholder/smoke-whoosh.*`. **Brook's synthesized placeholder, approved by Arlong 2026-10-25** |
| `goat-bleat` | one-shot | 1.0 s | Mortgage's "meeeeeh." lines (only when no voice file exists for the line) |
| `potato-cannon` | one-shot | 1.5 s | Push B potato beat, launch (preview only: `__RR.beats([{kind:"potato"}])`) |
| `potato-flight` | one-shot | 2.1 s | Push B potato beat, 0.5 s in: the flaming arc |
| `potato-impact` | one-shot | 1.0 s | Push B potato beat, 2.6 s in: the splat |
| `ghost-scare` | one-shot | 1.8 s | Push B carny beat, 2.4 s in, as the guard runs (preview only) |
| `goop` | one-shot | 0.9 s | Registered only. The Push B styrofoam and acetone beat isn't built yet |

## Loops

| File | Type | Length | Trigger |
|---|---|---|---|
| `neon-hum` | loop | 4.0 s | During the club cutaway (the thin, flaky hum of the dark-letters sign before the reveal) |
| `neon-hum-full` | loop | 4.0 s | The fully lit sign: starts the moment `neon-lightup` ends (its `ended` event, `cueThenLoop` in `js/audio.js`; the cue's last 0.35 s matches the loop, so there's no crossfade), and runs until the sign cut ends. **Loop the OGG or WAV, never the MP3** (MP3 padding adds about 40 ms). The manifest prefers ogg. **Brook's synthesized placeholder, approved by Arlong 2026-10-25** |
| `bed-farm-calm` / `-tense` | loop, pair | 43.7 s | fence, henhouse, barn |
| `bed-mainstreet-calm` / `-tense` | loop, pair | 53.4 s | hq, store, wkuk |
| `bed-midway-calm` / `-tense` | loop, pair | 41.8 s | gate, midway, pavilion |
| `bed-club-calm` / `-tense` | loop, pair | 45.7 s | The club cutaway, which borrows the music and then hands back the room bed |

Calm and tense layers must have the same length and be sample-aligned. They play together and are
equal-power crossfaded by **tension** (0–1). Tension is the same night value that drives the colour shift
(`NIGHT` in data/script.js): hq 0, fence .15, henhouse .2, barn .25, store .35, wkuk .45, gate .6, midway .8,
pavilion 1. It never runs backwards. Beds play at volume 0.35 × Music.

Volume and mute (Music, Effects, Voice) are in the Menu and stored in localStorage `rr-audio`.
