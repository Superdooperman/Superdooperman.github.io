export function createInput(car, opts) {
  const keys = new Set();
  const pedals = { clutch: null, brake: null, throttle: null };
  const pointers = new Map();
  let draggingKnob = false;
  let rlockHeld = false;

  window.addEventListener("keydown", (e) => {
    if (e.repeat && [" ", "Control", "Shift", "c", "C"].includes(e.key)) e.preventDefault();
    keys.add(e.key);
    if ([" ", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key));
  window.addEventListener("blur", () => keys.clear());

  function pedalFromY(el, clientY) {
    const r = el.getBoundingClientRect();
    const t = (clientY - r.top) / r.height;
    return Math.max(0, Math.min(1, t));
  }

  document.querySelectorAll(".pedal-arm").forEach((el) => {
    const name = el.parentElement.dataset.pedal;
    const go = (ev) => {
      const y = ev.clientY ?? ev.touches?.[0]?.clientY;
      if (y == null) return;
      pedals[name] = pedalFromY(el, y);
    };
    el.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      pointers.set(ev.pointerId, name);
      go(ev);
    });
    el.addEventListener("pointermove", (ev) => {
      if (pointers.get(ev.pointerId) !== name) return;
      go(ev);
    });
    const end = (ev) => {
      if (pointers.get(ev.pointerId) !== name) return;
      pointers.delete(ev.pointerId);
      if (![...pointers.values()].includes(name)) pedals[name] = null;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });

  window.addEventListener("wheel", (e) => {
    const over = e.target.closest?.("[data-pedal='clutch']");
    if (!over) return;
    e.preventDefault();
    car.clutch = Math.max(0, Math.min(1, car.clutch + Math.sign(e.deltaY) * 0.05));
  }, { passive: false });

  function readGamepad() {
    const gp = navigator.getGamepads?.()[0];
    if (!gp) return null;
    const axis = (i, dead = 0.08) => {
      const v = gp.axes[i] ?? 0;
      return Math.abs(v) < dead ? 0 : v;
    };
    return {
      clutch: gp.buttons[6]?.value ?? 0,
      throttle: gp.buttons[7]?.value ?? 0,
      brake: gp.buttons[4]?.pressed ? 1 : Math.max(0, axis(1)),
      start: gp.buttons[0]?.pressed,
      hb: gp.buttons[1]?.pressed,
      reverseLock: gp.buttons[5]?.pressed,
    };
  }

  function held(...list) {
    return list.some((k) => keys.has(k));
  }

  function approach(cur, target, rate) {
    if (cur < target) return Math.min(target, cur + rate);
    if (cur > target) return Math.max(target, cur - rate);
    return cur;
  }

  return {
    keys,
    pedals,
    setDraggingKnob(v) { draggingKnob = v; },
    isDraggingKnob() { return draggingKnob; },
    setReverseLock(v) { rlockHeld = v; },
    held,
    poll(dt) {
      const gp = readGamepad();
      const slow = opts.slowClutch();

      let clutchTarget = held("Control", "c", "C", " ") ? 1 : 0;
      if (gp) clutchTarget = Math.max(clutchTarget, gp.clutch);
      if (pedals.clutch != null) car.clutch = pedals.clutch;
      else {
        const upRate = slow ? 1.35 : 5;
        car.clutch = approach(car.clutch, clutchTarget, dt * (clutchTarget > car.clutch ? 8 : upRate));
      }

      let thTarget = held("w", "W", "ArrowUp") ? 1 : 0;
      let brTarget = held("s", "S", "ArrowDown") ? 1 : 0;
      if (gp) {
        thTarget = Math.max(thTarget, gp.throttle);
        brTarget = Math.max(brTarget, gp.brake);
      }
      if (pedals.throttle != null) car.throttle = 1 - pedals.throttle;
      else car.throttle = approach(car.throttle, thTarget, dt * (thTarget ? 2.4 : 3.5));
      if (pedals.brake != null) car.brake = pedals.brake;
      else car.brake = approach(car.brake, brTarget, dt * 5);

      car.reverseLock = held("q", "Q") || gp?.reverseLock || rlockHeld;
      if (!opts.autoSteer()) {
        const l = held("a", "A");
        const r = held("d", "D");
        car.steer = (r ? 1 : 0) - (l ? 1 : 0);
      } else car.steer = 0;

      return { gp };
    },
  };
}
