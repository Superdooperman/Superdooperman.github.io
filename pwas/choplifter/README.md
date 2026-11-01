# Choplifter!

A tribute to Choplifter by Dan Gorlin, Broderbund 1982

## Play

Live: https://superdooperman.github.io/pwas/choplifter/

```bash
cd pwas/choplifter
python3 -m http.server 8080
```

Local: `http://localhost:8080`. From the site root, the game is `/pwas/choplifter/`.

## Controls

**Desktop:** Arrow keys / WASD to fly, Space to shoot, Z to change facing, P to pause.

**Mobile:** On-screen joystick + Fire/Face buttons. Optional motion controls (tap MOTION, calibrate, tilt to fly).

## Install as Web App

On mobile, use "Add to Home Screen" after loading the page. Works offline after the first visit.

## Goal

The post office base is on the right. Fly left, shoot a barracks from the side to open it, and land level so hostages can climb aboard (16 at a time). Set them down on the pad. Sixty-four hostages, three sorties. The counters are hostages lost, aboard, and safely home.

Z (or the Face button) is the original turn button: a short press faces you, a held press carries the nose through to the other side. Space fires, and only a forward-facing shot reaches a tank. P or Esc pauses. Ctrl-S toggles sound. Ctrl-A and Ctrl-V reverse the stick. Ctrl-L, then a key, sets the level to that key's low two bits.