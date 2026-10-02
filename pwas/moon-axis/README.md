# MOON AXIS — Hellcats of the Void

A first-person vector shooter in the 1983 *Star Wars* arcade mold: glowing wireframe ships, a cockpit rail, seven sorties from the dark side into the Staff. Play in the browser or add to a phone home screen.

**Title:** MOON AXIS  
**Tagline:** *Hellcats of the Void*  
**Player craft:** F6F-V **Voidcat**

Live: https://superdooperman.github.io/pwas/moon-axis/

## Box copy

> **1945 was supposed to be the end of the war.**  
> It wasn’t. A splinter of the Axis — the **Mondstab** — had already thrown a Peenemünde shot into cislunar space on a hull of stolen meteor-iron. By 1947 they had **Festung Selene** in Schrödinger crater and were dropping kinetic “selene rods” into the Pacific.  
> The Allies answer with **Pacific Void Command**. Converted Essex-class carriers catapult the first space-rated fighters off a mass-driver deck. You fly the **F6F-V Voidcat**.  
> The fortress you crack is only the first battery. Seven sorties. One moon. Do not let them finish the rod.

Pulp alt-history (*Iron Sky* / *Wolfenstein* energy), not a history lesson. Factions are **Space Allies** vs **Moon Axis (Mondstab)**. No real-world insignia.

## Sorties

1. **Cislunar scramble** — Nachtschwalbe / Würger-X. Starfork on your left.
2. **Schrödinger surface** — flak towers, Stuka-Selene dives.
3. **Festung Selene trench** — wall guns, then the **Mondsichel**. Sichel can eject. Shoot the wreck and he burns; let him go and he comes back.
4. **Kesselgrube** — far-side yard. Moonhogs want the doors open. Fork peels a Würger pair; kill them in time or Reyes dies.
5. **Stabzug** — match speed with the meteor-iron train. Eisenwurm tail, Geist on cover.
6. **Inside the Staff** — throat, foundry, hanging core. False win.
7. **Out of the well** — escape the collapsing hull. Real win: *the Pacific stays blue.*

## Roster

| Call | WWII ghost | Side |
|---|---|---|
| F6F-V Voidcat | Hellcat | Player (Cat) |
| P-38 Starfork | Lightning | Lt. Reyes, wingman |
| TBF Moonhog | Avenger | Escort bomber |
| Nachtschwalbe | Bf 109 | Axis dart |
| Würger-X | Fw 190 | Axis interceptor |
| Stuka-Selene | Ju 87 | Dive bomber |
| Silbergeist | Me 262 | Geist, Act II ace |
| Mondsichel | Horten Ho 229 | Sichel, flying-wing rival |
| Stabzug / Eisenwurm | — | Rail train / tail AA |
| Void Hornet | Essex-class | Captain Hale (“Hook”) |
| The Staff | — | Oberst Rabe |

## Branches

- **Fork:** save him by killing the peel pair in Kesselgrube. Death plays `fork_05` and Hale’s “off the board” brief before the rail. Survival skips those lines.
- **Sichel:** after Mondsichel dies he ejects for ~2.5s. Finish him and Hale warns that the next wide wing is not him. Let him go and you get the alt taunts in the Staff.

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

Fighters, towers, trench guns, rail cars, no-hit stage bonus, bosses. HI SCORES is a top-10 on this device (`moon-axis-scores`); best is also `moon-axis-hiscore`. GitHub Pages cannot host a worldwide board without a backend.
