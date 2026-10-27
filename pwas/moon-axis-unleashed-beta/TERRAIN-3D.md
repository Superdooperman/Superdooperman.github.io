# Terrain 3D test (branch `terrain-3d`, local only)

A one-day test. It brings the height-map ground and ground collision from the prototype
(`moon-axis-dev` @ terrain-proto f290a7f, used as reference only) into Unleashed's 3D chase camera.
It is **off by default**. Nothing changes unless the URL has `?terrain=1`.

## How to run
- `python3 -m http.server 8740` in the repo
- Open `http://127.0.0.1:8740/?terrain=1&scene=play&stage=1` to go straight to Sortie 2, or open `/?terrain=1` and play through.
- A normal load (no flag) does not fetch `js/terrain/*` at all. `main.js` only dynamic-imports it when the flag is set.

## What's built
- `js/terrain/heightmap.js`: the prototype's lunar map bake (512², ~90 ms, done once when Sortie 2's surface is built).
- `js/terrain/terrain3d.js`:
  - A scrolling lit mesh made of 10 recycled 32-unit chunks. Columns are dense near the lane and sparse at the edges, about 30k triangles in total.
  - The height is the base map plus a detail octave, with canyon walls rising past |x| 26. It is capped so the spawn height always clears.
  - Lambert vertex colours in the copper range (#c45c26 mixed in on crests, darker mare patches), plus a raking warm sun.
  - `heightAt(x,z)` for collision. A "PULL UP" warning shows when clearance is under 3.0.
- `js/terrain/earth.js`: the Earth with continents, desert and ice (the prototype's polygons) painted onto a lit sphere. It has a cloud shell and a soft blue limb, and turns slowly in the sky.
- `js/scenes/play.js` (every change is gated on terrain active and the surface stage):
  - The old wireframe moon floor and crater discs are skipped. Battery towers sit on the ground.
  - The camera follows the player lower, and the player can fly lower (py floor -13 instead of -10).
  - Enemies stay above the ground.
  - Fork's P-38 **Starfork** (`starfork()`) joins at 0.35 of the stage and holds the player's left wing. It has no VO and scores nothing.
  - **Ground crash:** below ground + 1.1, the game's own `shatterBurst`, kick, rumble and `playerHit()` play (VOIDCAT DOWN, hurt flash, VO, minus one life). The player is then lifted clear with 2 s of invuln. During invuln or a roll the ship skims the surface instead.
- Ships: only the existing `js/ships/catalog.js` meshes are used. The player is the F6F-V Voidcat (Hellcat). Fork is the P-38 Starfork. Enemies are the stock Würger, Stuka, Nachtschwalbe and so on.
- Untouched: `sw.js` (cache name included), localStorage keys, sortie content and story beats in normal play.
  - The normal-load screenshots are pixel-identical to b7f1996 at every tested size.

## Perf (headless Chromium, 4x CPU throttle, swiftshader software GL)
Sortie 2, measured over about 8 s of live play.

| Viewport | Mode | Frame interval avg / p95 | Main-thread JS / frame avg / p95 | Terrain CPU avg / p95 | three.js render() CPU avg / p95 |
|---|---|---|---|---|---|
| 1280x800 | terrain | 105.9 / 166.6 ms | 4.81 / 13.8 ms | 0.28 / 0.9 ms | 3.30 / 6.7 ms |
| 1280x800 | off | 87.3 / 133.3 ms | 3.47 / 5.8 ms | n/a | n/a |
| 844x390 (DPR 3, touch) | terrain | 66.5 / 100.1 ms | 4.69 / 10.2 ms | 0.16 / 0.7 ms | 3.37 / 7.3 ms |
| 844x390 (DPR 3, touch) | off | 48.9 / 100.0 ms | 3.99 / 10.2 ms | n/a | n/a |

How to read it:
- **The CPU side is cheap.** Terrain CPU (chunk recycling plus ground probes) is about 0.2–0.3 ms average and under 1 ms at p95, well inside the ~4 ms budget. Main-thread JS stays well under 16.7 ms.
- **The frame interval numbers are not real-device numbers.** swiftshader rasterises on the CPU in the GPU process, and the throttle doesn't apply there. Even with terrain off, the frame interval is 50–90 ms.
- **The extra 18–20 ms per frame with terrain on is software fill cost.** It comes from a lit mesh covering half the screen. It is a real signal that **fill rate on phones is the risk to watch**, but it says nothing exact about a GPU.
- **A real phone test is still needed.**
- There is a one-off hitch when Sortie 2 starts: the ~90 ms map bake (unthrottled). This should move into a worker or to load time.

## Honest read: is a full Sortie 2 terrain level worth it?
**Yes, probably, if it's kept narrow.**
- Flying low over lit ground with the Earth up there gives Sortie 2 something the flat starfield can't: speed you can feel, and the threat of the ground.
- Collision works cleanly with the game's existing hit feedback.

What this test doesn't prove:
- Whether it's *fun*. The player range, enemy heights and enemy fire were tuned only enough to make a clip.
- Low flight plus enemy bullets plus the ground currently stacks damage. In the clip a shield hit and then a crash came close together.

**Estimate:** about 4–6 working days for a shippable Sortie 2 terrain level.
- 1 day: gameplay tuning, meaning altitude band, enemy flight paths that follow the terrain, and crash fairness.
- 1 day: set pieces. Canyon runs and the battery placed into the terrain need work, because the existing story beats were written for a flat floor.
- 1 day: art pass with Usopp's calls.
- 0.5–1 day: perf on real phones, with LOD or lower DPR on the terrain if fill hurts.
- 1 day: QA and Chopper's verify.
- +1–2 days if terrain comes to other sorties too.

**Risks**
- Fill rate on mid-range phones (DPR 3).
- Sortie 2's story beats and turret placement assume flat ground.
- Enemy fire combined with ground collision may feel unfair.
- Map-bake hitch at stage start.
- The look is placeholder (see below).
- Not tested on any real device or in Safari.

## Look calls for Usopp
1. **Terrain colour/material:** dusty brown-grey with copper on the crests, Lambert (matte, cheap). Options:
   - push more copper into the whole ramp (#c45c26 family)
   - or keep it grey and use copper only for lighting and accents
   - flat-shaded facets would read more "Unleashed" and cost the same.
2. **Earth style:** a realistic-ish painted globe with a blue limb. Option: a stylised flat-colour Earth to match the HUD, or bigger and lower on the horizon for drama.
3. **Fog:** existing FogExp2 0x1a1614 / 0.0085. It hides chunk pop-in at the far edge. Option: a warmer, denser horizon haze (slightly copper), or less fog for a harsher vacuum look.
4. **Sun:** a raking warm light from the left. The direction and colour set the whole mood.

## Not done / follow-ups
- No real-device perf.
- No gameplay tuning beyond the demo.
- No new terrain set pieces.
- Map bake is not yet in a worker.
- Fork has no VO/story in terrain mode, on purpose: story beats were off-limits.
- Not merged, pushed or deployed. That needs Arlong.
