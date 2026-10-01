# MOON AXIS — Hellcats of the Void

A first-person vector shooter in the 1983 *Star Wars* arcade mold: glowing wireframe ships, a cockpit rail, three sorties to the moon. Play in the browser or add to a phone home screen.

**Title:** MOON AXIS  
**Tagline:** *Hellcats of the Void*  
**Player craft:** F6F-V **Voidcat**

Live: https://superdooperman.github.io/pwas/moon-axis/

## Box copy

> **1945 was supposed to be the end of the war.**  
> It wasn’t. A splinter of the Axis — the **Mondstab** — had already thrown a Peenemünde shot into cislunar space on a hull of stolen meteor-iron. By 1947 they had **Festung Selene** in Schrödinger crater and were dropping kinetic “selene rods” into the Pacific.  
> The Allies answer with **Pacific Void Command**. Converted Essex-class carriers catapult the first space-rated fighters off a mass-driver deck. You fly the **F6F-V Voidcat**: a Hellcat whose radial engine is now a fusion ring, folding wings tipped with thrusters, .50s recast as Hispano-X plasma.  
> Three sorties. One moon. Do not let them finish the rod.

Pulp alt-history (*Iron Sky* / *Wolfenstein* energy), not a history lesson. Factions are **Space Allies** vs **Moon Axis (Mondstab)**. No real-world insignia.

## Sorties

1. **Cislunar scramble** — Nachtschwalbe / Würger-X dogfight among the stars. Starfork wingmen peel off the rail.
2. **Schrödinger surface** — low lunar pass, flak towers, Stuka-Selene dive attacks.
3. **Festung Selene trench** — side turrets, then the **Mondsichel** flying-wing boss over the crater core.

## Roster

| Call | WWII ghost | Side |
|---|---|---|
| F6F-V Voidcat | Hellcat | Player |
| P-38 Starfork | Lightning | Ally wingman |
| Nachtschwalbe | Bf 109 | Axis dart |
| Würger-X | Fw 190 | Axis interceptor |
| Stuka-Selene | Ju 87 | Dive bomber |
| Silbergeist | Me 262 | Ace jet |
| Mondsichel | Horten Ho 229 | Boss |

## Play local

```bash
cd /home/pibot/moon-axis
python3 -m http.server 8765
```

Then open `http://localhost:8765` (or `http://<pi-ip>:8765` from a phone on the same LAN).

## Controls

**Desktop:** mouse aims (yoke), WASD trims, click / Space fire, Shift boost, B barrel-roll (i-frames), P pause / settings.

**Phone (landscape):** left stick aims, FIRE / BOOST / ROLL. FULL (top right) hides browser chrome. Pause opens settings: invert Y (classic flight — pull back to climb) and haptics. Rotate to landscape. Add to Home Screen for the true full cabinet — iPhone Safari cannot drop its tab bar via the web Fullscreen API.

## Scoring

Fighters, towers, trench guns, no-hit stage bonus, Mondsichel core. HI SCORES is a top-10 on this device (`moon-axis-scores`); best is also `moon-axis-hiscore`. GitHub Pages cannot host a worldwide board without a backend.
