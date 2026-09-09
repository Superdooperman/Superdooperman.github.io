const Input = (() => {
  const keys = {};
  let touchActive = false;
  let joyX = 0;
  let joyY = 0;
  let fire = false;
  let aimDown = false;
  let startPressed = false;
  let pausePressed = false;

  const joystick = { active: false, originX: 0, originY: 0, id: null, pointer: false };

  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function init() {
    window.addEventListener('keydown', (e) => {
      keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('blur', () => {
      Object.keys(keys).forEach((k) => { keys[k] = false; });
    });

    const touchControls = document.getElementById('touch-controls');
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const btnFire = document.getElementById('btn-fire');
    const btnFacing = document.getElementById('btn-facing');
    const btnMotion = document.getElementById('btn-motion');
    const motionPanel = document.getElementById('motion-panel');
    const btnCalibrate = document.getElementById('btn-calibrate');
    const btnMotionClose = document.getElementById('btn-motion-close');
    const sensitivity = document.getElementById('motion-sensitivity');
    const rotateHint = document.getElementById('rotate-hint');

    touchControls.classList.remove('hidden');
    touchActive = true;

    function updateKnob(dx, dy) {
      const max = 35;
      const cx = Math.max(-max, Math.min(max, dx));
      const cy = Math.max(-max, Math.min(max, dy));
      knob.style.transform = `translate(${cx}px, ${cy}px)`;
      joyX = cx / max;
      joyY = cy / max;
    }

    function startJoystick(clientX, clientY) {
      joystick.active = true;
      const rect = zone.getBoundingClientRect();
      joystick.originX = rect.left + rect.width / 2;
      joystick.originY = rect.top + rect.height / 2;
      updateKnob(clientX - joystick.originX, clientY - joystick.originY);
    }

    function endJoystick() {
      joystick.active = false;
      joystick.pointer = false;
      joystick.id = null;
      updateKnob(0, 0);
    }

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joystick.id = t.identifier;
      startJoystick(t.clientX, t.clientY);
    }, { passive: false });

    zone.addEventListener('mousedown', (e) => {
      e.preventDefault();
      joystick.pointer = true;
      startJoystick(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e) => {
      if (!joystick.active || joystick.pointer) return;
      for (const t of e.changedTouches) {
        if (t.identifier === joystick.id) {
          e.preventDefault();
          updateKnob(t.clientX - joystick.originX, t.clientY - joystick.originY);
        }
      }
    }, { passive: false });

    window.addEventListener('mousemove', (e) => {
      if (!joystick.active || !joystick.pointer) return;
      updateKnob(e.clientX - joystick.originX, e.clientY - joystick.originY);
    });

    window.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joystick.id) endJoystick();
      }
    });

    window.addEventListener('mouseup', () => {
      if (joystick.pointer) endJoystick();
    });

    btnFire.addEventListener('touchstart', (e) => { e.preventDefault(); fire = true; }, { passive: false });
    btnFire.addEventListener('touchend', () => { fire = false; });
    btnFire.addEventListener('mousedown', (e) => { e.preventDefault(); fire = true; });
    btnFire.addEventListener('mouseup', () => { fire = false; });

    btnFacing.addEventListener('touchstart', (e) => { e.preventDefault(); aimDown = true; }, { passive: false });
    btnFacing.addEventListener('touchend', () => { aimDown = false; });
    btnFacing.addEventListener('mousedown', (e) => { e.preventDefault(); aimDown = true; });
    btnFacing.addEventListener('mouseup', () => { aimDown = false; });

    if (Motion.isAvailable()) {
      btnMotion.addEventListener('touchstart', async (e) => {
        e.preventDefault();
        await toggleMotion(btnMotion, motionPanel);
      }, { passive: false });
      btnMotion.addEventListener('click', async (e) => {
        e.preventDefault();
        await toggleMotion(btnMotion, motionPanel);
      });
    } else {
      btnMotion.style.display = 'none';
    }

    btnCalibrate.addEventListener('click', () => Motion.calibrate());
    btnMotionClose.addEventListener('click', () => motionPanel.classList.add('hidden'));
    sensitivity.addEventListener('input', () => Motion.setSensitivity(parseFloat(sensitivity.value)));

    function checkOrientation() {
      const portrait = window.innerHeight > window.innerWidth;
      rotateHint.classList.toggle('hidden', !portrait || !isTouchDevice());
    }
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();
  }

  async function toggleMotion(btn, panel) {
    if (Motion.isEnabled()) {
      Motion.disable();
      btn.classList.remove('active');
      btn.textContent = 'MOTION';
    } else {
      const ok = await Motion.enable();
      if (ok) {
        panel.classList.remove('hidden');
        btn.classList.add('active');
        btn.textContent = 'MOTION ON';
      }
    }
  }

  function keyboardMovement() {
    let x = 0;
    let y = 0;
    if (keys.ArrowLeft || keys.KeyA) x -= 1;
    if (keys.ArrowRight || keys.KeyD) x += 1;
    if (keys.ArrowUp || keys.KeyW) y -= 1;
    if (keys.ArrowDown || keys.KeyS) y += 1;
    return { x, y };
  }

  function consumeStart() {
    const v = startPressed || keys.Space || keys.Enter;
    startPressed = false;
    return v;
  }

  function consumePause() {
    const v = pausePressed || keys.KeyP;
    pausePressed = false;
    return v;
  }

  function getMovement() {
    const kb = keyboardMovement();
    const kbActive = Math.abs(kb.x) > 0 || Math.abs(kb.y) > 0;
    const aim = keys.KeyS || aimDown;

    let x = 0;
    let y = 0;

    if (kbActive) {
      x = kb.x;
      y = kb.y;
    } else if (joystick.active || Math.abs(joyX) > 0.05 || Math.abs(joyY) > 0.05) {
      x = joyX;
      y = joyY;
    } else if (Motion.isEnabled() && Motion.isCalibrated()) {
      const m = Motion.getInput();
      x = m.x;
      y = m.y;
    }

    return { x, y, aimDown: aim };
  }

  function isShooting() {
    return keys.Space || fire;
  }

  return {
    init, getMovement, isShooting,
    consumeStart, consumePause, isTouchDevice,
  };
})();