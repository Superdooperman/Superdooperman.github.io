import Settings from './settings.js';

const Input = {
  keys: Object.create(null),
  aimX: 0,
  aimY: 0,
  fire: false,
  boost: false,
  roll: false,
  start: false,
  pause: false,
  touch: false,
  _rollLatch: false,
  _pauseLatch: false,

  init() {
    this.touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (this.touch) document.body.classList.add('touch');

    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => {
      Object.keys(this.keys).forEach((k) => { this.keys[k] = false; });
      this.fire = false;
    });

    const canvas = document.getElementById('game');
    canvas.addEventListener('mousemove', (e) => {
      if (this.touch) return;
      const r = canvas.getBoundingClientRect();
      this.aimX = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.aimY = -(((e.clientY - r.top) / r.height) * 2 - 1);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.fire = true;
    });
    window.addEventListener('mouseup', () => { this.fire = false; });

    this._bindTouch();
  },

  _bindTouch() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const joy = { active: false, id: null, ox: 0, oy: 0 };

    const updateKnob = (dx, dy) => {
      const max = 42;
      const cx = Math.max(-max, Math.min(max, dx));
      const cy = Math.max(-max, Math.min(max, dy));
      knob.style.transform = `translate(${cx}px, ${cy}px)`;
      this.aimX = cx / max;
      this.aimY = -cy / max;
    };
    const endJoy = () => {
      joy.active = false;
      joy.id = null;
      updateKnob(0, 0);
    };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joy.active = true;
      joy.id = t.identifier;
      const r = zone.getBoundingClientRect();
      joy.ox = r.left + r.width / 2;
      joy.oy = r.top + r.height / 2;
      updateKnob(t.clientX - joy.ox, t.clientY - joy.oy);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!joy.active) return;
      for (const t of e.changedTouches) {
        if (t.identifier === joy.id) {
          e.preventDefault();
          updateKnob(t.clientX - joy.ox, t.clientY - joy.oy);
        }
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joy.id) endJoy();
      }
    });

    const hold = (el, setter) => {
      const down = (e) => { e.preventDefault(); setter(true); };
      const up = (e) => { if (e) e.preventDefault(); setter(false); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    };
    hold(document.getElementById('btn-fire'), (v) => { this.fire = v; if (v) Settings.flushRumble(); });
    hold(document.getElementById('btn-boost'), (v) => { this.boost = v; if (v) Settings.flushRumble(); });
    document.getElementById('btn-roll').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._rollTap = true;
      Settings.flushRumble();
    });
    document.getElementById('btn-pause').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._pauseTap = true;
    });
    document.getElementById('btn-start').addEventListener('click', () => { this.start = true; });
    document.getElementById('btn-again').addEventListener('click', () => { this.start = true; });
  },

  sample() {
    const k = this.keys;
    const kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const ky = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const aimX = Math.max(-1, Math.min(1, this.aimX + kx * 0.55));
    let aimY = Math.max(-1, Math.min(1, this.aimY + ky * 0.55));
    if (Settings.invertY) aimY = -aimY;
    const fire = this.fire || !!k.Space;
    const boost = this.boost || !!k.ShiftLeft || !!k.ShiftRight;
    const rollEdge = (!this._rollLatch && (k.KeyB || this._rollTap));
    const pauseEdge = (!this._pauseLatch && (k.KeyP || k.Escape || this._pauseTap));
    const start = this.start || k.Enter || k.Space;
    const reelUp = !!(k.KeyW || k.ArrowUp);
    const reelDown = !!(k.KeyS || k.ArrowDown);
    // Reels ignore invert-Y and the mouse rest that flight aim uses.
    // Touch stick still works; desktop mouse is left to the on-screen ▲▼.
    const reelY = reelUp || reelDown
      ? ((reelUp ? 1 : 0) - (reelDown ? 1 : 0))
      : (this.touch ? this.aimY : 0);
    this._rollLatch = !!(k.KeyB || this._rollTap);
    this._pauseLatch = !!(k.KeyP || k.Escape || this._pauseTap);
    this._rollTap = false;
    this._pauseTap = false;
    this.start = false;
    if (fire || boost || rollEdge) Settings.flushRumble();
    return {
      aimX, aimY, fire, boost, roll: rollEdge, pause: pauseEdge, start,
      reelUp, reelDown, reelY,
    };
  },
};

export default Input;
