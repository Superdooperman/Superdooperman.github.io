# Placeholder manifest

The game loads `art/placeholders/<file>` first. The same filename in `art/in/` wins.

Background plates are 1280 by 720. Hotspots are fractions of that frame. Replace a plate without moving the objects far, or the click boxes in `data/script.js` need a nudge.

Radioactive Rooster is not baked into the rooms. Portraits and the two overlay sprites carry him.

## Canon the stand-ins only partly match

Recorded from the character notes:

- The big white eyes are stuffed plush eyes on the suit. Pupils point in wonky, disagreeing directions.
- His real eyes are under the mask. He sees through the nostril holes of the beak.
- Red feathers under the arms stay tucked. They pop out for a jump from a height or a glide, then tuck away. The full-body concept drawing is a glide, so feathers there are correct. Standing, squatting, and crowing in this episode should not show them.

## Concept drawings

Left in `art/concept/`. Signed Mike Azzato, Aug 07. Do not paint over these.

| File | Use |
| --- | --- |
| `photo_2026-10-06_00-13-53.jpg` | Full-color body. Canonical costume and the glide pose. |
| `photo_2026-10-06_00-13-57.jpg` | Ink pose. Speech bubble is the real call: PAH-KAW! |
| `photo_2026-10-06_00-14-01.jpg` | Flat bust. Profile, so one stuffed eye shows. |
| `photo_2026-10-06_00-13-48.jpg` | Painted bust. Mood only. Do not edit this painting. |

## Room plates

| File | Room | Known problems |
| --- | --- | --- |
| `bg-title.jpg` | Title | Split coop and fair. The chicken on it is a generic bird, not him. Title words are HTML under the picture, not painted on the white banner. Some fair lettering is mush. |
| `bg-hq.jpg` | Rooftop coop | Neon is brighter than the script (it should barely commit to being on). The water tower lettering "ELMWOOD RESERVOIR 1953" was invented. |
| `bg-fence.jpg` | Fence line | Usable. Fat yard birds, bouncer hen, coop door. |
| `bg-henhouse.jpg` | Henhouse | Spoon, hen, and warm nest read. A junk note says "NEST #3 - TASTING". |
| `bg-barn.jpg` | Barn | Usable. Goat, blue ribbon, rotten ladder, Peck with a horn. |
| `bg-store.jpg` | General store | Ned reads. Sign lettering is junk in places (RINGC, SALTED, CLOSED). BULK GOODS is readable. |
| `bg-wkuk.jpg` | WKUK | Strongest plate. MAIL, ON AIR, DJ, yellow horn. |
| `bg-gate.jpg` | Fair gate | Turnstile and sleepy guard work. The cutout invents "MEET ROY THE ROOSTER" and "1ST PLACE FAIR CHAMP". Marquee lettering is messy. The look line already says the sign cannot be trusted. |
| `bg-midway.jpg` | Midway | Booth reads as liquor bottles, not ring-toss pins. Barker is a jealous striped vest. Her face does not match `portrait-gobbler.png`. Do not treat the painted clock as a real time. Midnight is a threat, not a number on that clock. |
| `bg-pavilion.jpg` | Hot Oil Pavilion | Fryer, hanging cage, egg, red heat lamp, woman in a black gown and red boa, crowd, corn-dog cart. Her face is a third version and does not match the portrait. Sign reads "MISS FRY NIGHT". |

## Hero and villain

| File | Use | Known problems |
| --- | --- | --- |
| `portrait-rooster.png` | Default bust | Keyed off magenta. Pupils are not a reliable wonky pair. Profile-ish, so both stuffed eyes may not read. |
| `portrait-rooster-embarrassed.png` | After the bucket, and after he blows the squat | Sweat and a sideways glance. One cheek is a huge red ball. |
| `portrait-rooster-smitten.png` | First sight of her, through the pavilion | Two heart-shaped eyes. Off the googly-eye model. Usable as a lovestruck read until replaced. |
| `portrait-rooster-crow.png` | The real call | Same picture as the crow sprite, cropped by the bust frame. Arm feathers are out. Crow is not a glide. |
| `sprite-squat.png` | Fence, gate cutout, and the ending bow | Sits the gag: gut out, cheeks puffed, on the rail. Rounder than the athletic concept sheet. Arm feathers should be tucked for this pose and may still show. |
| `sprite-crow.png` | Payoff flash over the pavilion | Wings and mouth open, gold legs, green cowl, belt, white gloves. Arm feathers should be tucked unless you later decide the call pops them. |
| `portrait-gobbler.png` | Her speaker card | Black gown, red boa, hostess sash. Fully clothed. "1st PLACE" on the ribbon is slightly cropped. Face will not match the painted plates until you draw one face and use it everywhere. |

Magenta was removed by flooding the background, then clearing a purple fringe on the silhouette. A dark edge can remain. Your PNG in `art/in/` should already be transparent.

## Other people

Cropped out of the plates. Not tightened. Names are provisional.

`portrait-henny.jpg`, `portrait-peck.jpg`, `portrait-clerk.jpg`, `portrait-deejay.jpg`, `portrait-guard.jpg`, `portrait-barker.jpg`.

`cast-sheet.jpg` is an unused lineup. Outfits and the DJ do not match the plates. Shirt lettering is junk. Keep it as a scratch reference or delete your copy. The game does not load it.

## Item icons

Hand-drawn SVG. These are the reliable labels in the inventory bar.

`item-geiger.svg`, `item-bulb.svg`, `item-photo.svg`, `item-spoon.svg`, `item-stub.svg`, `item-grub.svg`, `item-ribbon.svg`, `item-sauce.svg`, `item-mirror.svg`, `item-bill.svg`, `item-speaker.svg`, `item-map.svg`, `item-pass.svg`, `item-basket.svg`.
