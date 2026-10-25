# Voice line ids (Push C, 2026-10-24)

Optional voice acting: put `audio/in/voice/<line id>.ogg` (or `.mp3`) here, then run `python3 tools/audio_files.py`.
A line with a file plays it, and a line without one stays silent. The full list of lines is in `/workspace/reports/rr-voice-script.csv`.

## Scheme

`<speaker key>-<8 hex>`, for example `rr-3fa9c021` or `henny-0b7d11e4`.

- **Speaker key**: the line's `SPEAKER` key in data/script.js (`gobbler`, `henny`, `peck`, `deejay`, `guard`,
  `corny`, `clerk`, `hattie`, `dot`, `rocco`, `pip`, `kids`, `goat`, ...). Lines with no speaker, and Rooster's own
  portrait lines, use `rr` (Radioactive Rooster narrates). Unknown speakers get `x`.
- **Hash**: the FNV-1a 32-bit hash of the exact text shown, with whitespace collapsed (`voiceId()` in js/logic.js).
  Templated lines hash the filled-in text, so each variant has its own id.
- The **same words from the same voice give the same id**, so a repeated line is recorded once.
- **No id**: thought bubbles (`thought: true`; Henny never speaks aloud in play), and empty lines.
- **Ending comic panels** (`ENDINGS[*].panels`, via `panelVoice()`): a plain caption gets an `rr` id
  (narration); `{ say: "Henny", real: true }` gets a `henny` id; `{ thought }` gets none. When the ending shows, its panels play in order.
- **Henny** (Arlong, 2026-10-24): her only real words are `...About time.` (the smitten ending, marked `real: true`).
  Her other out-loud ending bubbles get no id and play `henny-cluck` gibberish, as do her thoughts in play.

The prefix is the speaker slot, not always the voice you hear. Some `rr` narration lines quote other
characters inside them, for example Marge at the corn-dog cart or the little brown hen at the finish. The
voice script's `character` column says who to cast.

## Stability

An id changes only when that line's words or speaker change. If you edit a line, rename or re-record its file.
`test/lines.test.js` pins the scheme.
