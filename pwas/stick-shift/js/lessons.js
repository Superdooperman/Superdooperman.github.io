import { LESSONS } from "./config.js";
import { clutchEngagement, rpmForGear } from "./physics.js";

export function createLessons(car) {
  let index = 0;
  let progress = {};
  let holdBite = 0;
  let holdTime = 0;
  let launchOk = false;
  let rollback = 0;
  let hillStopped = false;
  let freeTimer = 0;
  let feedback = "";
  const done = new Set();

  function resetRuntime() {
    holdBite = 0;
    holdTime = 0;
    launchOk = false;
    rollback = 0;
    hillStopped = false;
    freeTimer = 0;
    feedback = "";
    progress = {};
  }

  function setGoal(i, ok) {
    progress[i] = ok;
  }

  function tick(dt) {
    const id = LESSONS[index].id;
    const eng = clutchEngagement(car.clutch);
    const mph = Math.abs(car.speed) * 2.23694;

    if (id === "intro") {
      setGoal(0, car.clutch > 0.85);
      setGoal(1, car.engineOn);
      setGoal(2, !car.handbrake && car.engineOn);
    }
    if (id === "bite") {
      setGoal(0, car.gear === 1);
      const inBite = car.engineOn && car.gear === 1 && eng > 0.12 && eng < 0.85 && car.rpm > 600;
      if (inBite) holdBite += dt; else holdBite = Math.max(0, holdBite - dt);
      setGoal(1, holdBite > 0.4);
      setGoal(2, holdBite > 2);
      if (car.stalledJustNow) feedback = "Stalled — clutch in, restart, slower on the way up.";
    }
    if (id === "launch") {
      if (mph > 0.8 && car.gear === 1) launchOk = true;
      setGoal(0, launchOk);
      setGoal(1, mph >= 10);
      setGoal(2, launchOk && car.clutch < 0.12 && mph > 4);
    }
    if (id === "upshift") {
      setGoal(0, car.gear >= 2 && mph > 8);
      setGoal(1, car.gear >= 3 && mph > 14);
      setGoal(2, car.engineOn && mph > 5);
    }
    if (id === "stop") {
      setGoal(0, mph < 5 && car.engineOn);
      setGoal(1, car.clutch > 0.6 || car.gear === 0 || mph === 0);
      setGoal(2, mph < 0.4 && car.handbrake);
    }
    if (id === "downshift") {
      if (car.gear === 3 && mph > 18) holdTime = 1;
      setGoal(0, holdTime === 1);
      setGoal(1, holdTime === 1 && car.gear === 2);
      const target = rpmForGear(car.speed, 2);
      const mismatch = Math.abs(car.rpm - target);
      setGoal(2, car.gear === 2 && car.clutch < 0.2 && mismatch < 900 && mph > 8);
    }
    if (id === "reverse") {
      setGoal(0, mph < 0.4);
      setGoal(1, car.gear === -1);
      if (car.speed < -0.3) holdTime += dt;
      setGoal(2, holdTime > 1.2);
    }
    if (id === "hill") {
      if (car.hillZone && mph < 0.5 && car.handbrake) hillStopped = true;
      setGoal(0, hillStopped);
      if (hillStopped && car.speed < -0.15) rollback += Math.abs(car.speed) * dt;
      setGoal(1, hillStopped && car.speed > 1.2 && car.position);
      setGoal(2, rollback < 0.4 && hillStopped && car.speed > 0.8);
      if (rollback > 0.4) feedback = "Rolled back — more bite and gas before you drop the handbrake.";
    }
    if (id === "free") {
      if (car.engineOn && !car.stalledJustNow) freeTimer += dt;
      if (car.stalledJustNow) freeTimer = 0;
      setGoal(0, freeTimer > 60);
      setGoal(1, car.cleanShifts >= 4);
      setGoal(2, car.smoothness >= 70 && freeTimer > 20);
    }

    const lesson = LESSONS[index];
    const mets = lesson.goals.map((_, i) => !!progress[i]);
    if (mets.every(Boolean)) done.add(lesson.id);
    return mets;
  }

  return {
    list: LESSONS,
    get index() { return index; },
    get feedback() { return feedback; },
    done,
    select(i) {
      index = i;
      resetRuntime();
      const id = LESSONS[index].id;
      car.speed = 0;
      car.clutch = id === "intro" ? 0 : 1;
      car.throttle = 0;
      car.brake = 0;
      if (id === "hill") {
        car.position = 110;
        car.handbrake = true;
        car.gear = 0;
        car.wantedGear = 0;
      } else if (id === "downshift") {
        car.position = 10;
        car.handbrake = false;
      } else {
        car.position = 0;
        if (id === "bite" || id === "intro") car.handbrake = true;
      }
    },
    tick,
    progressOf(i) { return !!progress[i]; },
  };
}
