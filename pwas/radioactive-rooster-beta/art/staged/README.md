# Staged art (not wired into the game)

Approved by Arlong. Wiring into the game, 2026-10-18: once a room is wired its staged files move to their live paths (plates via tools/neon/src or art/pixel/bg, cutouts to art/pixel/fg) and are removed from here; the notes below stay as the measurement record.

Wired: store, barn, wkuk, gate, henhouse, fence, title, midway, pavilion (all rooms; nothing left staged but these notes)

| File | What | Notes |
|---|---|---|
| `src/store-c-empty.jpg` | Store candidate C, empty master (1280x720) | Approved 2026-10-18. No people, no lettering; blank plank above the window for the Feed & Seed neon (paint_neon.py) |
| `pixel/bg/store.png` | 320x180 plate | borders trimmed, LANCZOS 1280x720 then BOX 320x180, no patches needed |
| `pixel-4x/bg/store.png` | 4x nearest | |

To wire the store later, remap the room. In 320x180 the measurements are:
- counter top y91, base y128, x73-190
- street door opening x205-255, y31-127
- back-lane door x0-25
- blank neon plank x155-205, y9-24
- Rooster h96 at the front edge (feet y178) and h84 at the counter/door line (feet y128), so depth.horizon is about -222
- Ned at h80 behind the counter (feet y122) needs a counter occluder

## Barn (candidate C, approved 2026-10-18)

| File | What |
|---|---|
| `src/barn-c.jpg` | 1280x720 master. Empty: no people, animals or lettering |
| `pixel/bg/barn.png` / `pixel-4x/bg/barn.png` | 320x180 plate and its 4x version. Hand patches: the third ladder rung (y86-88) is snapped with the left half hanging, and there is a nail on the centre post at x159, y26 |
| `pixel/fg/barn--ribbon.png` | 11x18 blue-ribbon overlay. Top-left goes at (154,26) so it hangs from the nail. Show it until `got_ribbon` is set (Mortgage rams the post) |

Barn measurements, in 320x180:
- back wall meets the floor at y122
- yard door opening x9-42, y42-127 (left)
- road door x289-309, y52-123 (right)
- goat pen x65-150
- centre post x155-163; ladder rails x168-181, y59-122
- hay bales x188-228, y84-123
- workbench and weather vane x222-277

Scale and cast:
- Rooster is h96 at the front edge (y178) and h80 at the wall line (y122), so depth.horizon is about -158
- Peck h80 and Mortgage h44 sprites are in `art/pixel/sprite/`

## WKUK (candidate C, approved 2026-10-18)

| File | What |
|---|---|
| `src/wkuk-c.jpg` | 1280x720 master. Empty: no people, no lettering, no neon |
| `pixel/bg/wkuk.png` / `pixel-4x/bg/wkuk.png` | 320x180 plate and its 4x version (no patches) |

Measurements, in 320x180:
- hall wall meets the floor at y127
- hall exit to the store on the left (x0-55); outer door to the fair road on the right (x265-312, y33-127)
- studio door x66-113, y31-127, with the mail slot around y86
- blank wall above the studio door (x66-113, y10-29) is the spot for paint_neon to bake the NED'S FEED & SEED sign
- booth window x125-262, y18-105, mullion x189-196
- on the booth wall: blank red on-air box x167-205, y34-49; brass horn x215-245, y32-60
- desk top y81; console x143-185, y63-81; mic head about (159,56)

Scale and cast:
- Rooster is h96 at the front edge and h84 at the wall line, the same as the store (depth.horizon about -222)
- DeeJay is h72 behind the glass at the mic (feet y110, x174)
- his occluders in front: x120-268 y81-128 (desk and wall), the console, the mullion, and the mic head x152-166 y50-63

## Gate (candidate B, approved 2026-10-18)

| File | What |
|---|---|
| `src/gate-b.jpg` | 1280x720 master. Empty: no people, no lettering. The cardboard prize-rooster cutout stays as a painted prop |
| `pixel/bg/gate.png` / `pixel-4x/bg/gate.png` | 320x180 plate and its 4x version (no patches) |

Measurements, in 320x180:
- ground line (fence base) y131
- blank panel on the turnstile arch, x37-95, y35-53: the spot for paint_neon to bake the NED'S FEED & SEED sign
- waist-high turnstile x25-100, y92-131
- booth x109-212; window x125-200, y58-103 (sill y103); stool x131-147
- fan x170-193, y64-103; ticket roll x152-173, y85-102
- cutout x235-285, y62-140; puddle x35-100, y152-166

Scale and cast:
- Rooster is h96 at the front edge and about h84 at the gate line
- Gate Guard is h72, seated (frames `guard-front`/`guard-talk`), at x148 with feet y126 behind the sill. The paper hand fan he holds in `guard-talk`/side/walk is a prop, not an artifact
- his occluder is `pixel/fg/gate--front.png` (base 135): a clean alpha cut of only the sill and booth front (y101-136, x108-214) plus the two solid window-frame posts (x108-125, x199-214). The ticket roll is deliberately NOT an occluder (it sits behind his resting arm, so he draws over it), and the fan needs none at x148 (his figure ends at x166-179, short of it). The earlier rectangular plate patches (roll, fan) pasted a dark box over his arm; they are gone

## Henhouse (candidate A, approved 2026-10-18)

| File | What |
|---|---|
| `src/henhouse-a.jpg` | 1280x720 master. Empty: no hens, no people, no notes |
| `pixel/bg/henhouse.png` / `pixel-4x/bg/henhouse.png` | 320x180 plate and its 4x version. Hand patch: a soft warm-gold glow on the middle nest (Midnight's still-warm empty nest, centre about 173,101) |
| `pixel/fg/henhouse--spoon.png` | 16x5 silver tasting spoon. Top-left at (132,70) on the nest-box shelf top. Hide once taken |
| `pixel/fg/henhouse--stub.png` | 11x7 torn ticket stub with a lipstick kiss. Top-left at (196,69). Hide once taken |

Measurements, in 320x180:
- back wall meets the floor at y122
- door back to the fence x9-34, y38-130 (left)
- nest-box row x72-275, openings y80-109; box centres x94, 133, 173 (Midnight's), 212, 252
- shelf top y69-77; roost ladder x285-315

Scale and cast:
- This is now a walk-in room: Rooster is h96 at the front edge and h80 at the wall (depth.horizon about -158)
- Sitting Hen is h22 in box x212 (feet y107). Hens are knee-high: h26 next to Rooster h96 (Henny's size), h22 at the wall

## Fence (approved fence.jpg, yard roosters removed)

| File | What |
|---|---|
| `tools/neon/src/fence.png` | The unbaked 320x180 source, now without the two tiny painted yard roosters (inpainted; 56 px changed, all inside x60-71, y79-84; nothing else touched) |
| `pixel/bg/fence.png` / `pixel-4x/bg/fence.png` | `paint_neon.py`'s fence output re-run from that source (`room_fence()` only). It differs from the live `art/pixel/bg/fence.png` in exactly those 56 px; the neon sheet `fx/neon-fence` and its rect [264,49,32,18] are unchanged |

To wire: copy these two over `art/pixel/bg/fence.png` and `art/pixel-4x/bg/fence.png` (a full `paint_neon.py` run now gives the same result).
Yard roosters are sprites (`yardrooster-*`: front, side, peck, crow, walk; left and right; h6-h40 and half). Place them closer than the painted ones were, feet about y100-110 in front of the yard fence, at about h10-h12 (fence depth: Rooster is about h23-h30 there, and a rooster stands a bit taller than Henny's 0.36). Loop: side, peck, side, crow.

## Title (barn-roof hen removed)

| File | What |
|---|---|
| `pixel/bg/title.png` / `pixel-4x/bg/title.png` | The live title plate with the white hen on the barn roof removed (210 px, box x56-77, y55-73): same-row, same-parity sky fill so the checker dither and gradient run straight through, and the feet/shadow bump on the ridge returned to the sky. Everything else is identical |

The hen is now a sprite: `titlehen-side-l-h16` (also side-r, idle-l/r, h16/h18). It is the Sitting Hen remapped into the title's own 98-colour palette with a 2x2 Bayer dither and the title's outline colour. Feet go at (67,74) on the roof peak.

## Pip (Pavilion rope puzzle)

Sprites `pip-*` in `art/pixel/sprite/`: front (idle), talk (whisper), side, walk (sneak), reach (pickpocket); h32-h72 and half. She is a 12-year-old in a yellow chick suit with the hood up.
- Scale is about 0.76 of Rooster at the same depth (Pavilion depth.horizon 92).
- Placement (revised): she stands BEHIND the side rope, feet (122,140) at h56, so the rope swag crosses her ankles through the rope layer below.
- Spot fix for wiring: the `pip` spot rect `[120,98,16,34]` becomes **`[112,84,20,56]`** (h56, feet y140). (Supersedes the earlier [120,84,16,48].)

## Sprite tint (apply when these rooms are wired)

`spriteTint` is a room field (default off; see `spriteFilter()` in `js/walk.js`). Suggested values from the before/after comps:
- gate: `spriteTint: { brightness: 0.8, saturate: 0.85, sepia: 0.1 }`
- henhouse: `spriteTint: { brightness: 0.72, saturate: 0.8, sepia: 0.15, hue: -4 }`

## Midway and Pavilion cast

The Midway plate has no painted people. The Pavilion has only the crowd silhouettes behind the rope, which stay as scenery; its corn-dog cart has no vendor painted in. All cast below are sprites in `art/pixel/sprite/` (cut_cast pipeline), not wired.

| Sprites | Frames | Scale / placement (from the comps) |
|---|---|---|
| `corny-*` (Slick Corny) | front, talk, side, walk, ringtoss (one ring held up with a wink, a second ring palmed behind his back); h40-h112 + half | Midway: by the clock post, `corny` spot, feet about (126,141) at h80, facing Rooster. Pavilion: beside his corn-dog cart, feet (238,148) at h88 |
| `dot-*` (Dot, sheet v2) | front (arms crossed), talk (eye-roll), side, walk; h40-h108 + half. Pink gum bubble at the side of her mouth (kept off the magenta key and protected in the palette), lifted skin so the face reads small | Behind the ring-toss window, feet (38,140) at h72; the booth hides her below the sill |
| `rocco-*` (Rocco, sheet v2) | front, talk (rapping), side, walk; h40-h108 + half. Chick hood up, red cap worn backwards over it | Behind the window beside Dot, feet (59,141) at h72 |
| `littlehen-*` (the reveal hen) | idle, cluck (talk), side, walk; h16-h36 + half | The Sitting Hen v2 base recoloured to a small pale cream bantam (different from red-brown Henny and the buff Sitting Hen). At the Pavilion she stands behind the side rope with the crowd, feet (140,138) at h18; the rope swag and post-mid overlap her |

| File | What |
|---|---|
| `pixel/fg/midway--booth.png` | Replacement for the live `art/pixel/fg/midway--booth.png`: the same cutout with the dark window opening (x25-72, y59-99) made transparent, so Dot and Rocco show through the window while the counter, the pegs and the booth front still cover their legs. The occluder base stays at 147 |

## Pavilion rope/post layer (both plates)

Characters never stand on or in front of scenery that should frame them, so every rope swag is its own alpha-cut foreground layer (cut from the plate's own pixels: the lit strand plus its dark underside, along a fitted sag curve). The engine sorts one base per layer, so the ropes are split by depth. The posts stay the existing occluders (`post-left` 170, `post-front` 169, `post-mid` 146, `cart` 146).

| File | Base | What |
|---|---|---|
| `pixel/fg/pavilion--rope-front.png` | 170 | front swag, left post to the padlock |
| `pixel/fg/pavilion--rope-side.png` | 146 | swag from the centre-left post back to post-mid (Pip and the little hen stand behind it) |
| `pixel/fg/pavilion--rope-back.png` | 130 | back swags + the thin back posts along the stage front (crowd side) |
| `pixel/fg/pavilion-open--rope-front.png` | 172 | open state: the rope hanging from the left post + its coil on the floor |
| `pixel/fg/pavilion-open--rope-side.png` / `--rope-back.png` | 146 / 130 | same as closed, cut from the open plate |

Wiring: add `{ id: "rope-front", base: 170 }, { id: "rope-side", base: 146 }, { id: "rope-back", base: 130 }` to the pavilion's occluders (the open state uses base 172 for its rope-front), and copy these files to `art/pixel/fg/`. Rooster's walk area is entirely in front of all three ropes, so he is never covered by them.
Same rule elsewhere: Midway railing is behind the walkable boardwalk (nobody stands behind it); fence yard roosters sit on the rail. Barn: Mortgage stands loose in front of the shallow pen (the pen boards are flush with the back wall, so there is no pen interior to stand in).
