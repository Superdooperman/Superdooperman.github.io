# Stick Shift Simulator

A browser trainer for a 6-speed H-pattern manual. It models clutch bite, stalling, synchro grind, rev-matching, engine braking, hills, and a scored free-drive.

## Play it

Live: [https://superdooperman.github.io/pwas/stick-shift/](https://superdooperman.github.io/pwas/stick-shift/)

Or from this folder:

```bash
python3 -m http.server 8765
```

Then open [http://127.0.0.1:8765/](http://127.0.0.1:8765/) and click **Ignition**.

(Modules will not load from a raw `file://` URL.)

## What to practice

1. Cockpit check — clutch-to-start, handbrake
2. Find the bite — hold the friction zone without stalling
3. Pull away — 1st gear launch
4. Upshift 1 → 2 → 3
5. Come to a stop without killing the engine
6. Downshift and rev-match (cyan ghost needle on the tach)
7. Reverse lockout (`Q` then `R`)
8. Hill start with the handbrake
9. Free drive — smoothness score

## Controls

| Action | Keys |
| --- | --- |
| Clutch | `Ctrl` / `C` / `Space` — or drag the left pedal / mouse-wheel |
| Throttle | `W` or `↑` — or drag the right pedal |
| Brake | `S` or `↓` |
| Gears | `1`–`6`, `N` or `` ` ``, reverse `Q`+`R` — or drag the knob |
| Start | `Enter` or **START** (clutch must be down) |
| Handbrake | `B` |
| Steer | `A` / `D` if “Keep car in lane” is off |

Gamepad: left trigger clutch, right trigger throttle, left bumper brake, A start, B handbrake.

Turn on **Show bite meter** and **Slow keyboard clutch** while you are learning the friction zone.
