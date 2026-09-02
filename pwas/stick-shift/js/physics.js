import {
  GEARS, FINAL_DRIVE, WHEEL_RADIUS, MASS, IDLE, REDLINE, STALL_RPM,
  ENGINE_INERTIA, CLUTCH_MAX_TORQUE, MAX_BRAKE_FORCE, HANDBRAKE_FORCE,
  DRAG_COEFF, FRONTAL_AREA, AIR_DENSITY, ROLLING, BITE_START, BITE_END,
} from "./config.js";

export function createCar() {
  return {
    rpm: 0,
    speed: 0,
    gear: 0,
    wantedGear: 0,
    clutch: 0,
    throttle: 0,
    brake: 0,
    handbrake: true,
    engineOn: false,
    stallCount: 0,
    grindCount: 0,
    shiftCount: 0,
    cleanShifts: 0,
    distance: 0,
    position: 0,
    grade: 0,
    steer: 0,
    lane: 0,
    smoothness: 100,
    clutchHeat: 0,
    lastAccel: 0,
    time: 0,
    engineOnTime: 0,
    reverseLock: false,
    lastGearChange: 0,
    lurch: 0,
    stalledJustNow: false,
    ground: false,
    hillZone: false,
  };
}

export function clutchEngagement(pedal) {
  if (pedal >= BITE_START) return 0;
  if (pedal <= BITE_END) return 1;
  const t = (BITE_START - pedal) / (BITE_START - BITE_END);
  return t * t * (3 - 2 * t);
}

export function engineTorque(rpm, throttle) {
  const n = Math.max(600, rpm);
  const peak = 1 - Math.pow((n - 4200) / 4200, 2);
  const tq = 210 * Math.max(0.15, peak);
  return tq * throttle;
}

function engineFriction(rpm, on) {
  if (!on) return 8 + rpm * 0.004;
  return 12 + rpm * 0.006;
}

export function wheelOmega(speed) {
  return speed / WHEEL_RADIUS;
}

export function rpmForGear(speed, gear) {
  const g = GEARS[gear];
  if (!g || g.ratio === 0) return 0;
  const wo = Math.abs(speed) / WHEEL_RADIUS;
  return (wo * Math.abs(g.ratio) * FINAL_DRIVE * 60) / (2 * Math.PI);
}

export function canSelectGear(car, next) {
  if (next === car.gear) return { ok: true };
  if (next === 0) return { ok: true };
  if (next === -1 && !car.reverseLock) {
    return { ok: false, reason: "Reverse lock — hold Q, then R" };
  }
  if (next === -1 && car.speed > 0.4) {
    return { ok: false, reason: "Stop before reverse", grind: true };
  }
  const eng = clutchEngagement(car.clutch);
  const targetRpm = rpmForGear(car.speed, next);
  const mismatch = Math.abs(car.rpm - targetRpm);
  const matchPct = targetRpm > 400 ? mismatch / targetRpm : 1;

  if (eng < 0.2) return { ok: true };
  if (matchPct < 0.1 && Math.abs(car.speed) > 1.5) return { ok: true, matched: true };
  if (eng > 0.3) return { ok: false, reason: "Clutch in (or rev-match)", grind: true };
  if (mismatch > 1400) return { ok: false, reason: "Synchros screaming — more clutch", grind: true };
  return { ok: true };
}

export function selectGear(car, next) {
  const check = canSelectGear(car, next);
  if (!check.ok) {
    if (check.grind) {
      car.grindCount += 1;
      car.smoothness = Math.max(0, car.smoothness - 8);
    }
    return check;
  }
  if (next !== car.gear && next !== 0 && car.gear !== 0) {
    car.shiftCount += 1;
    const target = rpmForGear(car.speed, next);
    const mismatch = Math.abs(car.rpm - target);
    if (mismatch < 700) car.cleanShifts += 1;
    else car.smoothness = Math.max(0, car.smoothness - 3);
  }
  car.gear = next;
  car.wantedGear = next;
  car.lastGearChange = car.time;
  return check;
}

export function hillGrade(position) {
  if (position < 80) return 0;
  const x = position - 80;
  const wave = Math.sin(x / 55);
  if (wave > 0.15) return 0.10 * Math.min(1, (wave - 0.15) / 0.7);
  if (wave < -0.2) return -0.06;
  return 0;
}

export function step(car, dt) {
  dt = Math.min(dt, 1 / 30);
  car.time += dt;
  car.stalledJustNow = false;
  car.grade = hillGrade(car.position);
  car.hillZone = Math.abs(car.grade) > 0.04;

  const g = GEARS[car.gear];
  const ratio = g.ratio * FINAL_DRIVE;
  const eng = car.engineOn ? clutchEngagement(car.clutch) : 0;

  let throttle = car.engineOn ? car.throttle : 0;
  if (car.engineOn && throttle < 0.04 && car.rpm < IDLE + 80) {
    throttle += Math.min(0.28, ((IDLE + 40) - car.rpm) / IDLE * 0.35);
  }

  const tq = car.engineOn ? engineTorque(car.rpm, throttle) : 0;
  const fr = engineFriction(car.rpm, car.engineOn);

  const engOmega = (car.rpm * 2 * Math.PI) / 60;
  const wOmega = wheelOmega(car.speed);
  const slip = engOmega - wOmega * ratio;
  const clutchTq = eng * CLUTCH_MAX_TORQUE * Math.tanh(slip / 18);

  if (eng > 0.05 && Math.abs(slip) > 25) {
    car.clutchHeat = Math.min(100, car.clutchHeat + dt * 12 * eng);
  } else {
    car.clutchHeat = Math.max(0, car.clutchHeat - dt * 8);
  }

  const netEng = tq - fr - clutchTq;
  const alpha = netEng / ENGINE_INERTIA;
  let newOmega = engOmega + alpha * dt;
  if (!car.engineOn) newOmega = Math.max(0, newOmega - dt * 40);
  if (car.engineOn && newOmega * 60 / (2 * Math.PI) > REDLINE) {
    newOmega = (REDLINE * 2 * Math.PI) / 60;
  }
  car.rpm = Math.max(0, (newOmega * 60) / (2 * Math.PI));

  const driveForce = (clutchTq * ratio) / WHEEL_RADIUS;
  const sign = car.speed === 0 ? 0 : Math.sign(car.speed);
  const brake = car.brake * MAX_BRAKE_FORCE + (car.handbrake ? HANDBRAKE_FORCE : 0);
  const drag = 0.5 * DRAG_COEFF * AIR_DENSITY * FRONTAL_AREA * car.speed * Math.abs(car.speed);
  const hill = MASS * 9.81 * Math.sin(Math.atan(car.grade));
  const rolling = sign * ROLLING;

  let force;
  if (Math.abs(car.speed) < 0.04) {
    const attempt = driveForce - hill;
    force = Math.abs(attempt) > brake + 40 ? attempt - Math.sign(attempt) * brake : 0;
  } else {
    force = driveForce - hill - drag - rolling - sign * brake;
  }

  const accel = force / MASS;
  car.lastAccel = accel;
  car.speed += accel * dt;

  if (Math.abs(car.speed) < 0.03 && brake > 400) car.speed = 0;
  car.speed = Math.max(-18, Math.min(70, car.speed));

  car.position += car.speed * dt;
  car.distance += Math.abs(car.speed) * dt;
  car.lurch = Math.abs(accel);

  if (car.engineOn) {
    car.engineOnTime += dt;
    if (car.rpm < STALL_RPM && eng > 0.55) {
      car.engineOn = false;
      car.rpm = 0;
      car.stallCount += 1;
      car.stalledJustNow = true;
      car.smoothness = Math.max(0, car.smoothness - 12);
    }
  }

  const jerkPenalty = Math.max(0, car.lurch - 4.5) * dt * 2;
  car.smoothness = Math.min(100, Math.max(0, car.smoothness - jerkPenalty + dt * 0.4));

  car.lane += car.steer * 1.8 * dt;
  car.lane *= (1 - dt * 0.8);
  car.lane = Math.max(-1.6, Math.min(1.6, car.lane));
}

export function tryStart(car) {
  if (car.engineOn) return { ok: false, reason: "Already running" };
  if (car.clutch < 0.62) return { ok: false, reason: "Clutch to the floor to start" };
  car.engineOn = true;
  car.rpm = IDLE;
  return { ok: true };
}
