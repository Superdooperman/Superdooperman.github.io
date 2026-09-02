export const GEARS = {
  "-1": { name: "R", ratio: -3.545 },
  0: { name: "N", ratio: 0 },
  1: { name: "1", ratio: 3.545 },
  2: { name: "2", ratio: 2.105 },
  3: { name: "3", ratio: 1.433 },
  4: { name: "4", ratio: 1.091 },
  5: { name: "5", ratio: 0.878 },
  6: { name: "6", ratio: 0.720 },
};

export const FINAL_DRIVE = 3.94;
export const WHEEL_RADIUS = 0.318;
export const MASS = 1380;
export const IDLE = 850;
export const REDLINE = 6800;
export const STALL_RPM = 520;
export const ENGINE_INERTIA = 0.22;
export const CLUTCH_MAX_TORQUE = 320;
export const MAX_BRAKE_FORCE = 9000;
export const HANDBRAKE_FORCE = 7000;
export const DRAG_COEFF = 0.42;
export const FRONTAL_AREA = 2.15;
export const AIR_DENSITY = 1.225;
export const ROLLING = 110;
export const BITE_START = 0.58;
export const BITE_END = 0.18;

export const GATE = {
  1: { x: 40, y: 50 },
  3: { x: 100, y: 50 },
  5: { x: 160, y: 50 },
  2: { x: 40, y: 210 },
  4: { x: 100, y: 210 },
  6: { x: 160, y: 210 },
  "-1": { x: 190, y: 68 },
  0: { x: 100, y: 130 },
};

export const LESSONS = [
  {
    id: "intro",
    title: "Cockpit check",
    text: "This is a real H-pattern. Clutch on the left, throttle on the right, brake in the middle. The car will not start unless the clutch is on the floor — like many modern manuals.",
    goals: ["Press the clutch fully", "Press START (or Enter)", "Release the handbrake with B"],
  },
  {
    id: "bite",
    title: "Find the bite",
    text: "Engine on, 1st gear, handbrake on. Slowly raise the clutch until the nose dips and RPM sags. That sag is the friction zone. Hold it. Don’t stall.",
    goals: ["Select 1st with clutch in", "Raise clutch into the bite", "Hold the bite for 2 seconds without stalling"],
  },
  {
    id: "launch",
    title: "Pull away",
    text: "Clutch in, 1st, a little throttle (~1500 RPM), handbrake off. Raise the clutch to the bite, add a breath of gas, then fully out. If it shudders, you dumped it. If it dies, you didn’t give it enough fuel.",
    goals: ["Start moving in 1st", "Reach 10 mph", "Clutch fully released while rolling"],
  },
  {
    id: "upshift",
    title: "Upshift 1 → 2 → 3",
    text: "At about 3000 RPM: clutch in, lift throttle, slot the next gear, clutch out smoothly while rolling back on the gas. Don’t dump it. Don’t wait until the redline on every gear — that’s not how you drive.",
    goals: ["Shift into 2nd", "Shift into 3rd", "Still moving, no stall"],
  },
  {
    id: "stop",
    title: "Come to a stop",
    text: "Brake. When the engine would lug (around 1200 RPM in gear), clutch in so it doesn’t stall. Select neutral as you stop, or keep clutch in with 1st ready. Handbrake when parked.",
    goals: ["Slow below 5 mph", "Clutch in before a stall", "Stop with handbrake on"],
  },
  {
    id: "downshift",
    title: "Downshift & rev-match",
    text: "From 3rd, brake, clutch in, blip the throttle in neutral (or while the clutch is down) so RPM rises to what 2nd wants, then select 2nd and let the clutch out. The match cue on the tach is the ghost needle.",
    goals: ["Be in 3rd at speed", "Downshift to 2nd", "Clutch out without a big lurch"],
  },
  {
    id: "reverse",
    title: "Reverse lockout",
    text: "Full stop. Clutch in. Hold Q (reverse lock) and press R, or drag the knob to R. A little bite, a little gas, look behind you (in your imagination).",
    goals: ["Stop completely", "Engage reverse", "Roll backward 5 meters"],
  },
  {
    id: "hill",
    title: "Hill start",
    text: "You’re on a grade. Handbrake holds the car. Bite + gas until the car wants to go, then release HB and finish the clutch. If you roll back, that’s a fail — catch it with bite or brake, not panic.",
    goals: ["Stop on the hill with HB", "Launch uphill", "No rollback past 0.4 m"],
  },
  {
    id: "free",
    title: "Free drive",
    text: "No script. Mix starts, shifts, a stop, maybe reverse. Smoothness is scored. Stalls and grinds hurt the score. Try a 2-minute clean run.",
    goals: ["Drive 60 seconds without stalling", "Make 4 clean shifts", "Keep smoothness above 70"],
  },
];
