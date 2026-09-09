# Choplifter!

A faithful HTML5 recreation of the 1982 Apple II classic. Rescue hostages from the Bungeling Empire and fly them back to the USPS base.

## Play

Live: https://superdooperman.github.io/pwas/choplifter/

```bash
cd /home/pibot/choplifter
python3 -m http.server 8080
```

Local: `http://localhost:8080` (or `http://<pi-ip>:8080` from another device).

## Controls

**Desktop:** Arrow keys / WASD to fly, Space to shoot, Z to change facing, P to pause.

**Mobile:** On-screen joystick + Fire/Face buttons. Optional motion controls (tap MOTION, calibrate, tilt to fly).

## Install as Web App

On mobile, use "Add to Home Screen" after loading the page. Works offline after the first visit.

## Goal

Shoot barrack doors to free hostages, land level to pick them up (max 16), return to the home base on the left to unload. Rescue 40 hostages to win.