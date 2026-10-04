const KEYS = {
  god: 'moon-axis-unleashed-cheat-god',
  boost: 'moon-axis-unleashed-cheat-boost',
  mult: 'moon-axis-unleashed-cheat-mult',
};

const CODE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA',
];
const MODS = new Set([
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight',
  'CapsLock', 'NumLock', 'ScrollLock', 'OSLeft', 'OSRight',
]);
const IDLE_MS = 2000;

function readFlag(key) {
  try { return localStorage.getItem(key) === '1'; } catch (_) { return false; }
}
function writeFlag(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch (_) { /* private mode */ }
}

let god = readFlag(KEYS.god);
let infBoost = readFlag(KEYS.boost);
let scoreMulOn = readFlag(KEYS.mult);

let hooks = null;
let menu = null;
let flashEl = null;
let buttons = [];
let open = false;
let sel = 0;
let buf = [];
let lastAt = 0;
let flashed = false;
let flashT = 0;

function typingTarget(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function paint() {
  if (!buttons.length) return;
  buttons.forEach((b, i) => {
    b.classList.toggle('sel', i === sel);
    const act = b.dataset.act;
    let on = false;
    let label = b.dataset.base;
    if (act === 'god') on = god;
    else if (act === 'boost') on = infBoost;
    else if (act === 'mult') on = scoreMulOn;
    if (act === 'god' || act === 'boost' || act === 'mult') label = `${b.dataset.base}  ${on ? 'ON' : 'OFF'}`;
    b.textContent = label;
    b.classList.toggle('on', on);
  });
}

function showFlash() {
  if (!flashEl || flashed) return;
  flashed = true;
  flashEl.classList.remove('hidden');
  clearTimeout(flashT);
  flashT = setTimeout(() => flashEl.classList.add('hidden'), 1200);
}

function setOpen(next) {
  open = !!next;
  if (menu) menu.classList.toggle('hidden', !open);
  if (hooks) hooks.hold(open);
  if (open) {
    sel = 0;
    paint();
    showFlash();
    const ae = document.activeElement;
    if (ae && ae !== document.body && typeof ae.blur === 'function') ae.blur();
  }
}

function toggleMenu() {
  setOpen(!open);
}

function activate(i) {
  const b = buttons[i];
  if (!b) return;
  sel = i;
  const act = b.dataset.act;
  if (act === 'god') {
    god = !god;
    writeFlag(KEYS.god, god);
  } else if (act === 'boost') {
    infBoost = !infBoost;
    writeFlag(KEYS.boost, infBoost);
  } else if (act === 'mult') {
    scoreMulOn = !scoreMulOn;
    writeFlag(KEYS.mult, scoreMulOn);
  } else if (act === 'stage') {
    const index = Number(b.dataset.stage);
    setOpen(false);
    if (hooks) hooks.warp(index);
    return;
  }
  paint();
}

function move(dir) {
  if (!buttons.length) return;
  sel = (sel + dir + buttons.length) % buttons.length;
  paint();
  const b = buttons[sel];
  if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' });
}

function onKey(e) {
  if (typingTarget(e.target)) return;
  if (e.repeat) return;
  const code = e.code || '';
  if (!code || MODS.has(code)) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  if (open) {
    if (code === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (code === 'ArrowUp' || code === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    } else if (code === 'ArrowDown' || code === 'ArrowRight') {
      e.preventDefault();
      move(1);
    } else if (code === 'Enter' || code === 'Space') {
      e.preventDefault();
      activate(sel);
    }
  }

  const now = performance.now();
  if (now - lastAt > IDLE_MS) buf = [];
  lastAt = now;
  if (code === CODE[buf.length]) {
    buf.push(code);
    if (buf.length === CODE.length) {
      buf = [];
      toggleMenu();
    }
  } else {
    buf = code === CODE[0] ? [code] : [];
  }
}

function build(stages) {
  menu = document.createElement('div');
  menu.id = 'cheats';
  menu.className = 'overlay panel hidden';
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-label', 'Cheats');

  const eye = document.createElement('p');
  eye.className = 'eyebrow';
  eye.textContent = 'PACIFIC VOID COMMAND';
  const title = document.createElement('h2');
  title.textContent = 'CHEATS';
  menu.append(eye, title);

  const toggles = [
    ['god', 'GOD MODE'],
    ['boost', 'INFINITE BOOST'],
    ['mult', 'SCORE \u00d72'],
  ];
  toggles.forEach(([act, base]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.act = act;
    b.dataset.base = base;
    menu.append(b);
  });

  const sub = document.createElement('p');
  sub.className = 'eyebrow';
  sub.textContent = 'SORTIE';
  menu.append(sub);

  stages.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.act = 'stage';
    b.dataset.stage = String(i);
    b.dataset.base = `SORTIE ${i + 1}  ${s.briefTitle}`;
    menu.append(b);
  });

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'ARROWS SELECT \u00b7 ENTER SETS \u00b7 ESC CLOSE';
  menu.append(hint);

  flashEl = document.createElement('div');
  flashEl.id = 'cheat-flash';
  flashEl.className = 'hidden';
  flashEl.textContent = 'CHEATS';

  const app = document.getElementById('app') || document.body;
  app.append(menu, flashEl);

  buttons = [...menu.querySelectorAll('button')];
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !menu.contains(b)) return;
    e.preventDefault();
    const i = buttons.indexOf(b);
    if (i >= 0) activate(i);
  });
  paint();
}

const Cheats = {
  get god() { return god; },
  get infBoost() { return infBoost; },
  get scoreMul() { return scoreMulOn ? 2 : 1; },
  isOpen() { return open; },
  attach(next) {
    hooks = next || {};
    if (!menu) build(hooks.stages || []);
    window.addEventListener('keydown', onKey);
  },
};

export default Cheats;
