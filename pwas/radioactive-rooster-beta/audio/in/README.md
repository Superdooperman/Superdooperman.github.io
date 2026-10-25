# audio/in

Drop a file here and the game uses it instead of the WebAudio stand-in. No code change is needed.
After adding or removing a file, run `python3 tools/audio_files.py`. It rewrites `manifest.json`, and the game
only requests files listed there, so a missing file is never fetched.

- Cues and loops: `<cue>.ogg|wav|mp3`. The full list, with triggers, is in [CUES.md](CUES.md).
- Music beds: `bed-<area>-calm` / `bed-<area>-tense` (crossfaded by tension), or `bed-<area>` (a single layer).
  A per-room `bed-<room>[-calm|-tense]` overrides its area bed. Areas are farm, mainstreet, midway, club.
- Voice: `voice/<line id>.ogg|mp3`. The id scheme is in [VOICE-IDS.md](VOICE-IDS.md).

`python3 tools/audio_files.py --stage` copies Brook's pack from `assets/audio-placeholder/`: every cue plus the
area calm/tense beds. It skips the per-room beds, which would mask the area beds, and `_preview.mp3`.
Add `--force` to overwrite existing files.

Missing files: a cue or bed falls back to a synth stand-in, and a voice line stays silent. The title screen has no bed.
