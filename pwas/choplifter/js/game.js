// Choplifter tribute. Behaviour follows the 1982 Apple II game as measured
// in public notes (thrust, climb, map, boarding, spawns, sorties).
// Every picture here is newly drawn. No original bytes, shapes, or samples.
(function (root) {
  const BUILD = 'v30';
  const RUBBLE = '#8aa4c8';
  const W = 280;
  const H = 192;
  const GROUND = 168;
  const BARRACKS_X = [0x380, 0x480, 0x580, 0x680];
  const FENCE = 0x1174;
  const BASE = 0x1274;
  const DOOR = 0x12D5;
  const HELI_MIN = 0x02D0;
  const HELI_MAX = 0x1300;
  const VIEW_MIN = 0x02B0;
  const VIEW_MAX = 0x1208;
  const START_X = 0x1293;
  const THRUST = [0, 96, 180, 264, 348, 420];
  const CLIMB = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 6];
  const MAX_TANKS = [1, 2, 2, 2];
  const MAX_JETS = [0, 1, 2, 2];
  const MAX_DRONES = [0, 0, 1, 2];
  const INK = {
    W: '#ffffff', O: '#ff6a3c', B: '#14cffd', G: '#14f53c', V: '#ff44fd', K: '#000000',
  };

  const DIGIT = {
    0: ['11111', '11011', '11011', '11011', '11011', '11011', '11111'],
    1: ['00110', '01110', '00110', '00110', '00110', '00110', '11111'],
    2: ['11111', '00011', '00011', '11111', '11000', '11000', '11111'],
    3: ['11111', '00011', '00011', '11111', '00011', '00011', '11111'],
    4: ['11011', '11011', '11011', '11111', '00011', '00011', '00011'],
    5: ['11111', '11000', '11000', '11111', '00011', '00011', '11111'],
    6: ['11111', '11000', '11000', '11111', '11011', '11011', '11111'],
    7: ['11111', '00011', '00011', '00110', '01100', '01100', '01100'],
    8: ['11111', '11011', '11011', '11111', '11011', '11011', '11111'],
    9: ['11111', '11011', '11011', '11111', '00011', '00011', '11111'],
  };

  const FONT = {};
  function glyph(ch, rows) { FONT[ch] = rows; }
  glyph(' ', ['00000', '00000', '00000', '00000', '00000', '00000', '00000']);
  glyph('A', ['01110', '10001', '10001', '11111', '10001', '10001', '10001']);
  glyph('B', ['11110', '10001', '10001', '11110', '10001', '10001', '11110']);
  glyph('C', ['01111', '10000', '10000', '10000', '10000', '10000', '01111']);
  glyph('D', ['11110', '10001', '10001', '10001', '10001', '10001', '11110']);
  glyph('E', ['11111', '10000', '10000', '11110', '10000', '10000', '11111']);
  glyph('F', ['11111', '10000', '10000', '11110', '10000', '10000', '10000']);
  glyph('G', ['01111', '10000', '10000', '10111', '10001', '10001', '01111']);
  glyph('H', ['10001', '10001', '10001', '11111', '10001', '10001', '10001']);
  glyph('I', ['11111', '00100', '00100', '00100', '00100', '00100', '11111']);
  glyph('J', ['00111', '00010', '00010', '00010', '00010', '10010', '01100']);
  glyph('K', ['10001', '10010', '10100', '11000', '10100', '10010', '10001']);
  glyph('L', ['10000', '10000', '10000', '10000', '10000', '10000', '11111']);
  glyph('M', ['10001', '11011', '10101', '10101', '10001', '10001', '10001']);
  glyph('N', ['10001', '11001', '10101', '10011', '10001', '10001', '10001']);
  glyph('O', ['01110', '10001', '10001', '10001', '10001', '10001', '01110']);
  glyph('P', ['11110', '10001', '10001', '11110', '10000', '10000', '10000']);
  glyph('Q', ['01110', '10001', '10001', '10001', '10101', '10010', '01101']);
  glyph('R', ['11110', '10001', '10001', '11110', '10100', '10010', '10001']);
  glyph('S', ['01111', '10000', '10000', '01110', '00001', '00001', '11110']);
  glyph('T', ['11111', '00100', '00100', '00100', '00100', '00100', '00100']);
  glyph('U', ['10001', '10001', '10001', '10001', '10001', '10001', '01110']);
  glyph('V', ['10001', '10001', '10001', '10001', '01010', '01010', '00100']);
  glyph('W', ['10001', '10001', '10001', '10101', '10101', '10101', '01010']);
  glyph('X', ['10001', '01010', '00100', '00100', '00100', '01010', '10001']);
  glyph('Y', ['10001', '10001', '01010', '00100', '00100', '00100', '00100']);
  glyph('Z', ['11111', '00001', '00010', '00100', '01000', '10000', '11111']);
  glyph('0', ['01110', '10001', '10011', '10101', '11001', '10001', '01110']);
  glyph('1', ['00100', '01100', '00100', '00100', '00100', '00100', '01110']);
  glyph('2', ['01110', '10001', '00001', '00110', '01000', '10000', '11111']);
  glyph('3', ['11110', '00001', '00001', '01110', '00001', '00001', '11110']);
  glyph('4', ['00010', '00110', '01010', '10010', '11111', '00010', '00010']);
  glyph('5', ['11111', '10000', '11110', '00001', '00001', '10001', '01110']);
  glyph('6', ['00110', '01000', '10000', '11110', '10001', '10001', '01110']);
  glyph('7', ['11111', '00001', '00010', '00100', '01000', '01000', '01000']);
  glyph('8', ['01110', '10001', '10001', '01110', '10001', '10001', '01110']);
  glyph('9', ['01110', '10001', '10001', '01111', '00001', '00010', '01100']);
  glyph('.', ['00000', '00000', '00000', '00000', '00000', '01100', '01100']);
  glyph(':', ['00000', '01100', '01100', '00000', '01100', '01100', '00000']);
  glyph('-', ['00000', '00000', '00000', '11111', '00000', '00000', '00000']);
  glyph('!', ['00100', '00100', '00100', '00100', '00100', '00000', '00100']);
  glyph("'", ['00100', '00100', '01000', '00000', '00000', '00000', '00000']);

  // Side view faces right. Tail boom and tail rotor are on the left. 36×16, about 2:1.
  const HELI_SIDE = [
    'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
    'WW...............WW.................',
    'W.W..............WW.................',
    'WW...............WW.................',
    '.WWWWWWWWWWWWWWWWWWWWWWWW...........',
    '...WW..WWWWWWW......WWWWWWW.........',
    '..WWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
    '..WWWWWWWWWWWWWWWWWWWWWWWWWWW.......',
    '...WWWWWWWWWWWWWWWWWWWWWWWWW........',
    '.....WWWWWWWWWWWWWWWWWWWWW..........',
    '.......WW..............WW...........',
    '......WWWW............WWWW..........',
    '......W..W............W..W..........',
    '.....WW..WW..........WW..WW.........',
    '.....WW..WW..........WW..WW.........',
    '....WWW..WWW........WWW..WWW........',
  ];
  const HELI_FRONT = [
    '....WWWWWWWW....',
    '..WWWWWWWWWWWW..',
    '.WWWWWWWWWWWWWW.',
    'WWW..WWWWWW..WWW',
    'WWW..WWKKWW..WWW',
    'WWW..WKKKKW..WWW',
    '.WWWWWWWWWWWWWW.',
    '..WWWWWWWWWWWW..',
    '...WWW....WWW...',
    '....WW....WW....',
    '...WWW....WWW...',
    '....WW....WW....',
    '..WW.WWWWWW.WW..',
    '.WW...WWWW...WW.',
    'WW.....WW.....WW',
    '.W............W.',
  ];
  const MAN_IDLE = [
    ['..WW..', '..WW..', '.WWWW.', '..WW..', '..WW..', '.W..W.', '..WW..', '.W..W.', 'W....W'],
    ['..WW..', '..WW..', '.WWWW.', '..WW..', '..WW..', 'W....W', '..WW..', '.W..W.', '.W..W.'],
  ];
  const MAN_RUN = [
    ['..WW..', '..WW..', '.WWWW.', '..WW..', '..WW..', '.W..W.', '..WW..', 'W...W.', '.W...W'],
    ['..WW..', '..WW..', '.WWWW.', '..WW..', '..WW..', '.W..W.', '..WW..', '.W.W..', 'W...W.'],
  ];
  const MAN_WAVE = [
    ['W....W', '.W..W.', '..WW..', '..WW..', '.WWWW.', '..WW..', '..WW..', '.W..W.', 'W....W'],
    ['.W..W.', 'W....W', '..WW..', '..WW..', '.WWWW.', '..WW..', '..WW..', '.W..W.', '.W..W.'],
  ];
  const TANK_SPRITE = [
    '.......GGGG.........',
    '.....GGGGGGGG.......',
    '...GGGGGGGGGGGGGG...',
    '..GGGGGGGGGGGGGGGG..',
    '.GG..GG..GG..GG..GG.',
    'GG..GG..GG..GG..GGG.',
    '.GG..GG..GG..GG..GG.',
    '..G..G..G..G..G..G..',
  ];
  const JET_SPRITE = [
    '.............WW.............',
    '........WWWWWWWWWWWW........',
    '.....WWWWWWWWWWWWWWWWW......',
    '........WWWWWWWWWWWW........',
    '.............WW.............',
  ];

  const S = {};

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd() {
    S.rng = (Math.imul(S.rng, 1664525) + 1013904223) >>> 0;
    return S.rng;
  }

  function sfx(name) {
    if (S.quiet || !S.soundOn || S.mode !== 'play') return;
    if (typeof AudioFX === 'undefined' || !AudioFX[name]) return;
    try { AudioFX[name](); } catch (_) { /* ignore */ }
  }

  function loadMonitor() {
    S.monitor = 'colour';
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('choplifter-monitor') === 'green') {
        S.monitor = 'green';
      }
    } catch (_) { /* private mode */ }
    const button = typeof document !== 'undefined' ? document.getElementById('btn-monitor') : null;
    if (button) button.textContent = S.monitor === 'green' ? 'GREEN' : 'COLOUR';
  }

  function toggleMonitor() {
    S.monitor = S.monitor === 'green' ? 'colour' : 'green';
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('choplifter-monitor', S.monitor);
    } catch (_) { /* ignore */ }
    const button = typeof document !== 'undefined' ? document.getElementById('btn-monitor') : null;
    if (button) button.textContent = S.monitor === 'green' ? 'GREEN' : 'COLOUR';
  }

  function boot() {
    S.rng = 0x31;
    S.monitor = 'colour';
    loadMonitor();
    buildStars();
    showTitle();
    if (typeof location !== 'undefined' && location.search) {
      const q = new URLSearchParams(location.search);
      if (q.get('debug') === '1') S.debug = true;
      const shot = q.get('shot');
      if (shot) debugSetup(shot);
    }
  }

  function integerScale(cssW, cssH) {
    let scale = Math.floor(Math.min(cssW / W, cssH / H));
    if (scale < 1) scale = 1;
    return scale;
  }

  // Largest uniform scale that fits. Portrait (narrower than 280:192) fills the
  // width and leaves room below. Landscape fills the height and leaves side margins.
  function fitFrame(viewW, viewH, safe) {
    const pad = safe || { top: 0, right: 0, bottom: 0, left: 0 };
    const availW = Math.max(1, viewW - (pad.left || 0) - (pad.right || 0));
    const availH = Math.max(1, viewH - (pad.top || 0) - (pad.bottom || 0));
    const gameAspect = W / H;
    const portrait = availW / availH < gameAspect;
    const cssW = portrait ? availW : availH * gameAspect;
    const cssH = portrait ? availW / gameAspect : availH;
    const scale = cssW / W;
    return {
      cssW,
      cssH,
      left: (pad.left || 0) + (availW - cssW) / 2,
      top: (pad.top || 0) + (portrait ? 0 : (availH - cssH) / 2),
      scale,
      sharp: Math.max(1, Math.ceil(scale - 1e-4)),
      portrait,
    };
  }

  function paintFrame() {
    const pix = new Uint32Array(W * H);
    const ctx = {
      fillStyle: '#000000',
      _stack: [],
      save() { this._stack.push(this.fillStyle); },
      restore() { this.fillStyle = this._stack.pop() || '#000000'; },
      font: '',
      textAlign: '',
      textBaseline: '',
      measureText() { return { width: 200 }; },
      fillText() {},
      fillRect(x, y, w, h) {
        const hex = String(this.fillStyle || '#000000');
        const c = hex[0] === '#' ? parseInt(hex.slice(1), 16) : 0;
        let x0 = Math.floor(x);
        let y0 = Math.floor(y);
        let x1 = Math.ceil(x + w);
        let y1 = Math.ceil(y + h);
        if (x0 < 0) x0 = 0;
        if (y0 < 0) y0 = 0;
        if (x1 > W) x1 = W;
        if (y1 > H) y1 = H;
        for (let yy = y0; yy < y1; yy++) {
          const row = yy * W;
          for (let xx = x0; xx < x1; xx++) pix[row + xx] = c;
        }
      },
    };
    draw(ctx);
    return pix;
  }

  function buildStars() {
    S.stars = [];
    let n = 0x1234567;
    for (let i = 0; i < 72; i++) {
      n = (Math.imul(n, 1103515245) + 12345) >>> 0;
      const x = 4 + (n % 272);
      n = (Math.imul(n, 1103515245) + 12345) >>> 0;
      const y = 28 + (n % 130);
      const colors = ['#ffffff', '#ff6a3c', '#14cffd'];
      S.stars.push({ x, y, c: colors[i % 3] });
    }
  }

  function showTitle() {
    S.mode = 'title';
    S.timer = 0;
    S.paused = false;
    S.soundOn = S.soundOn !== false;
    S.fireWas = false;
    S.faceWas = false;
    S.endReason = null;
    resetSortie(true);
    S.view = VIEW_MAX;
  }

  function resetSortie(full) {
    S.heli = {
      x: START_X, alt: 0, vx256: 0, vy: 0, tilt: 0, pose: -4, lastSide: -1,
      landed: true, alive: true, mercy: 0, squish: 0,
    };
    S.turning = false;
    S.turnTarget = 0;
    S.turnReverse = false;
    S.turnOrigin = -4;
    if (full) {
      S.aboard = 0;
      S.killed = 0;
      S.rescued = 0;
      S.trip = false;
      S.level = 0;
      S.lost = 0;
      S.sortie = 1;
      S.frame = 0;
      S.banner = 0;
      S.barracks = BARRACKS_X.map((x, i) => ({ x, open: i === 3, poured: i === 3, inside: 16 }));
      S.hostages = [];
      S.walkers = [];
      S.tanks = [];
      S.jets = [];
      S.drones = [];
      S.shots = [];
      S.booms = [];
      S.pending = null;
      S.pendingT = 0;
      let x = BARRACKS_X[3];
      S.barracks[3].inside = 8;
      for (let i = 0; i < 8; i++) {
        const gap = 32 + ((rnd() % 64) * 2);
        x += gap;
        S.hostages.push({ x, dir: 1, state: 'out', anchor: BARRACKS_X[3], id: i + 1 });
      }
    }
  }

  function beginPlay() {
    S.quiet = false;
    resetSortie(true);
    S.mode = 'play';
    S.endReason = null;
    S.pending = null;
    S.banner = 48;
    S.view = VIEW_MAX;
    S.fireWas = true;
    S.faceWas = false;
    S.paused = false;
    if (typeof Input !== 'undefined' && Input.clearEdges) Input.clearEdges();
    sfx('newGame');
  }

  function onPad(x) {
    const px = x == null ? S.heli.x : x;
    return px >= BASE + 13 && px <= BASE + 63;
  }

  function sticksFrom(raw) {
    const x = raw.x || 0;
    const y = raw.y || 0;
    let sx = clamp(Math.round(x * 5), -5, 5);
    let sy = clamp(Math.round(10 + (y < 0 ? y * 10 : y * 5)), 0, 15);
    if (S.revX) sx = -sx;
    if (S.revY) sy = 15 - sy;
    return { stickX: sx, stickY: sy };
  }

  function readDom() {
    if (typeof Input === 'undefined') {
      return { x: 0, y: 0, face: false, fire: false, start: false, pause: false };
    }
    const m = Input.getMovement();
    const levelKey = Input.consumeLevel();
    if (levelKey != null && S.mode === 'play') {
      const code = levelKey.length === 1 ? levelKey.charCodeAt(0) : 0;
      S.level = code & 3;
    }
    if (Input.consumeSound()) S.soundOn = !S.soundOn;
    if (Input.consumeRevX()) S.revX = !S.revX;
    if (Input.consumeRevY()) S.revY = !S.revY;
    if (Input.consumeMonitor && Input.consumeMonitor()) toggleMonitor();
    return {
      x: m.x, y: m.y, face: !!m.aimDown, fire: !!Input.isShooting(),
      start: !!Input.consumeStart(), pause: !!Input.consumePause(),
    };
  }

  function frame() {
    const raw = readDom();
    const st = sticksFrom(raw);
    update({
      stickX: st.stickX, stickY: st.stickY,
      face: raw.face, fire: raw.fire, start: raw.start, pause: raw.pause,
    });
  }

  function update(inp) {
    inp = inp || {};
    const fireEdge = !!inp.fire && !S.fireWas;
    S.fireWas = !!inp.fire;
    if (S.mode === 'title' || S.mode === 'attract') {
      S.timer += 1;
      if (inp.start || fireEdge) beginPlay();
      else if (S.mode === 'title' && S.timer > 60) {
        S.mode = 'attract';
        S.timer = 0;
      } else if (S.mode === 'attract') {
        stepAttract();
      }
      return;
    }
    if (S.mode === 'end') {
      S.timer += 1;
      if (S.timer > 18 && (inp.start || fireEdge)) showTitle();
      return;
    }
    if (inp.pause) S.paused = !S.paused;
    if (S.paused || S.frozen) return;

    S.frame += 1;
    if (S.banner > 0) S.banner -= 1;
    if (S.pending) {
      S.pendingT -= 1;
      if (S.pendingT <= 0) {
        if (S.pending === 'respawn') {
          const keep = {
            aboard: 0, killed: S.killed, rescued: S.rescued, trip: S.trip,
            level: S.level, lost: S.lost, sortie: S.lost + 1,
          };
          resetSortie(false);
          Object.assign(S, keep);
          S.heli.mercy = 18;
          S.banner = 48;
          S.shots = S.shots.filter((s) => s.enemy);
          S.view = VIEW_MAX;
          S.pending = null;
        } else {
          finish(S.pending);
        }
      }
      return;
    }

    if (S.heli.alive) {
      stepTurn(!!inp.face, inp.stickX || 0);
      stepHeli(inp.stickX || 0, inp.stickY == null ? 10 : inp.stickY);
      if (fireEdge) fireGun();
    }
    stepHostages();
    stepWalkers();
    unload();
    if (S.heli.alive && (S.frame % 32) === 0) spawnEnemy();
    stepTanks();
    stepJets();
    stepDrones();
    stepShots();
    stepBooms();
    scroll();
    checkEnd();
  }

  function stepAttract() {
    const t = S.timer % 200;
    const h = S.heli;
    h.alive = true;
    h.pose = -4;
    if (t < 24) {
      h.landed = t < 4;
      h.alt = t * 1.6;
      h.tilt = 0;
      h.x = START_X;
    } else if (t < 110) {
      h.landed = false;
      h.alt = 38 + Math.sin(t / 8) * 6;
      h.tilt = -4;
      h.x = START_X - (t - 24) * 4;
    } else if (t < 140) {
      h.tilt = 0;
      h.pose = 0;
    } else {
      h.pose = 4;
      h.tilt = 4;
      h.x += 4;
      h.alt = 36;
    }
    S.view = clamp(h.x - 150, VIEW_MIN, VIEW_MAX);
  }

  function stepTurn(faceHeld, stickX) {
    const h = S.heli;
    const pressed = faceHeld && !S.faceWas;
    S.faceWas = faceHeld;
    if (!faceHeld) S.turnReverse = false;
    if (pressed && !S.turning) {
      S.turning = true;
      S.turnOrigin = h.pose;
      if (h.pose === 0) {
        const lean = stickX || h.lastSide || -1;
        S.turnTarget = Math.sign(lean) * 4;
        S.turnReverse = false;
      } else {
        S.turnTarget = 0;
        S.turnReverse = true;
      }
    }
    if (!S.turning) return;
    let diff = S.turnTarget - h.pose;
    if (diff !== 0) {
      const step = Math.abs(diff) > 1 ? 2 : 1;
      h.pose += Math.sign(diff) * step;
      if ((diff > 0 && h.pose > S.turnTarget) || (diff < 0 && h.pose < S.turnTarget)) h.pose = S.turnTarget;
      diff = S.turnTarget - h.pose;
    }
    if (diff === 0) {
      if (S.turnReverse && faceHeld && S.turnTarget === 0) {
        const origin = S.turnOrigin || h.lastSide || -1;
        S.turnTarget = -Math.sign(origin) * 4;
        S.turnReverse = false;
      } else {
        S.turning = false;
        if (h.pose !== 0) h.lastSide = Math.sign(h.pose);
      }
    }
  }

  function stepHeli(stickX, stickY) {
    const h = S.heli;
    if (h.mercy > 0) h.mercy -= 1;
    if (h.landed && stickX === 0) {
      if (h.tilt > 0) h.tilt = Math.max(0, h.tilt - 2);
      else if (h.tilt < 0) h.tilt = Math.min(0, h.tilt + 2);
    } else if (h.tilt < stickX) h.tilt += 1;
    else if (h.tilt > stickX) h.tilt -= 1;

    const wasLanded = h.landed;
    const climb = CLIMB[clamp(stickY, 0, 15)];
    if (h.landed && climb < 0) h.landed = false;

    h.vx256 -= Math.trunc(h.vx256 / 16);
    h.vx256 += THRUST[Math.abs(h.tilt)] * Math.sign(h.tilt);
    const max = 21 * 256;
    if (h.vx256 > max) h.vx256 = max;
    if (h.vx256 < -max) h.vx256 = -max;

    if (!h.landed) {
      h.vy = (h.vy + climb) / 2;
      h.alt -= h.vy;
    }
    h.x += h.vx256 / 256;
    h.x = clamp(h.x, HELI_MIN, HELI_MAX);
    if (h.alt > 112) {
      h.alt = 112;
      if (h.vy < 0) h.vy = 0;
    }
    if (h.alt <= 0) {
      if (!wasLanded) {
        if (Math.abs(h.vx256) >= max) {
          h.alt = 0;
          destroyHeli();
          return;
        }
        if (h.vy > 4.4) {
          h.vy = -h.vy * 0.5;
          h.alt = 0.6;
          h.landed = false;
        } else {
          h.alt = 0;
          h.vy = 0;
          h.landed = true;
          h.squish = 2;
        }
      } else {
        h.alt = 0;
        h.landed = true;
        h.vy = 0;
      }
    }
    if (h.squish > 0) h.squish -= 1;
  }

  function doorOpen() {
    return S.heli.alive && S.heli.landed && S.heli.tilt === 0;
  }

  function heliBody() {
    const h = S.heli;
    const sprite = chopperSprite(h);
    const w = sprite[0].length;
    const height = sprite.length;
    const foot = GROUND - Math.round(h.alt);
    return { x: h.x - Math.floor(w / 2), y: foot - height, w, h: height };
  }

  function muzzle(h) {
    const body = heliBody();
    if (Math.abs(h.pose) < 2) {
      const dir = h.lastSide || 1;
      return { x: h.x, y: body.y + body.h + 1, dir, front: true };
    }
    const dir = Math.sign(h.pose) || h.lastSide || 1;
    return { x: h.x + dir * (body.w / 2 + 3), y: body.y + Math.round(body.h * 0.42), dir, front: false };
  }

  function fireGun() {
    const h = S.heli;
    if (!h.alive || h.mercy > 12) return;
    reapShots();
    const flying = S.shots.filter((s) => !s.enemy && s.alive).length;
    if (flying >= 5) return;
    const m = muzzle(h);
    const low = h.landed || h.alt < 18;
    const hvx = h.vx256 / 256;
    const hvy = h.landed ? 0 : h.vy;
    const muzzleSpeed = 24;
    let vx = hvx + m.dir * muzzleSpeed;
    let vy = hvy;
    let x = m.x;
    let y = m.y;
    if (m.front && !low) {
      vx = hvx;
      vy = hvy + muzzleSpeed;
      x = h.x;
      y = heliBody().y + heliBody().h + 1;
    } else if (!low) {
      vy = hvy + 10;
    } else if (m.front) {
      x = h.x + m.dir * (heliBody().w / 2 + 3);
      y = heliBody().y + Math.round(heliBody().h * 0.42);
    }
    S.shots.push({
      x, y, vx, vy,
      kind: 'bullet', enemy: false, down: vy > 2 && Math.abs(vx - hvx) < 1,
      alive: true, age: 0,
    });
    sfx('shot');
  }

  function stepHostages() {
    const h = S.heli;
    const hx = Math.round(h.x);
    if ((S.frame % 4) === 0) releaseOne();
    S.hostages.forEach((man) => {
      const dx = man.x - hx;
      const near = Math.abs(dx) < 200 && h.alt < 70;
      if (S.aboard >= 16 && h.landed && Math.abs(dx) < 64) {
        man.state = 'wave';
        man.x += dx >= 0 ? 1 : -1;
      } else if (h.alive && h.landed && !onPad() && S.aboard < 16 && Math.abs(dx) < 200) {
        man.state = 'run';
        const target = dx >= 0 ? hx + 8 : hx - 11;
        if (man.x < target) man.x += 1;
        else if (man.x > target) man.x -= 1;
      } else if (!h.landed && near && h.alive) {
        man.state = 'wave';
      } else {
        man.state = 'out';
        if (((S.frame + man.id) % 36) === 0) man.dir = (rnd() & 1) ? 1 : -1;
        man.x += man.dir;
        if (man.x < man.anchor - 70) man.dir = 1;
        if (man.x > man.anchor + 180) man.dir = -1;
      }
      man.x = clamp(man.x, HELI_MIN, FENCE - 20);
    });
    if (doorOpen() && !onPad()) {
      S.hostages.forEach((man) => {
        const dx = man.x - hx;
        if (dx >= -9 && dx <= 7) crush(man);
        else if ((dx >= 8 && dx <= 9) || (dx >= -11 && dx <= -10)) {
          if (S.aboard < 16) board(man);
        }
      });
      S.hostages = S.hostages.filter((man) => !man.dead);
    }
  }

  function spawnMan(b, n) {
    S.hostages.push({
      x: b.x - 6 + (n % 5) * 6,
      dir: n & 1 ? 1 : -1,
      state: 'run',
      anchor: b.x,
      id: (S.frame + n + b.x) & 1023,
    });
  }

  function pourOut(b) {
    if (!b) return;
    b.open = true;
    if (b.poured) return;
    b.poured = true;
    const burst = Math.min(8, b.inside);
    for (let n = 0; n < burst; n++) {
      b.inside -= 1;
      spawnMan(b, n);
    }
    boom(b.x + 8, GROUND - 8);
    sfx('boom');
  }

  function releaseOne() {
    const hx = S.heli.x >> 8;
    let pick = -1;
    for (let i = 0; i < 4; i++) {
      if ((BARRACKS_X[i] >> 8) === hx && S.barracks[i].open && S.barracks[i].inside > 0) pick = i;
    }
    if (pick < 0) {
      const open = [];
      S.barracks.forEach((b, i) => { if (b.open && b.inside > 0) open.push(i); });
      if (!open.length) return;
      pick = open[rnd() % open.length];
    }
    const b = S.barracks[pick];
    const near = S.hostages.filter((man) => !man.dead && man.anchor === b.x).length;
    if (near >= 8 || b.inside <= 0) return;
    b.inside -= 1;
    spawnMan(b, near);
  }

  function board(man) {
    man.dead = true;
    S.aboard += 1;
    S.trip = true;
    sfx('board');
  }

  function crush(man) {
    if (man.dead || man.state === 'squash') return;
    man.dead = true;
    S.killed += 1;
    boom(man.x, GROUND - 4);
    sfx('killed');
  }

  function squashMan(man) {
    if (man.dead || man.state === 'squash') return;
    man.state = 'squash';
    man.squashT = 8;
  }

  function tickSquash() {
    S.hostages.forEach((man) => {
      if (man.state !== 'squash') return;
      man.squashT -= 1;
      if (man.squashT <= 0) crush(man);
    });
  }

  function hqGeom() {
    const botW = 108;
    const topW = 62;
    const botLeft = BASE - 6;
    const farLeft = botLeft + (botW - topW) / 2;
    const bw = 40;
    const bx = Math.round(farLeft + topW - bw - 1);
    return { bx, bw, bh: 8, doorX: bx + 18 };
  }

  function stepWalkers() {
    const door = hqGeom().doorX;
    S.walkers.forEach((w) => {
      if (w.x < door) w.x += 1;
      else if (w.x > door) w.x -= 1;
    });
    S.walkers = S.walkers.filter((w) => Math.abs(w.x - door) > 0.5);
  }

  function unload() {
    if (!doorOpen() || !onPad() || S.aboard <= 0) return;
    if ((S.frame % 8) !== 0) return;
    S.aboard -= 1;
    S.rescued += 1;
    if (S.trip) {
      S.level = Math.min(3, S.level + 1);
      S.trip = false;
    }
    S.walkers.push({ x: Math.round(S.heli.x) + 4 });
    sfx('home');
    if (S.rescued >= 64) finish('win');
  }

  function spawnEnemy() {
    const lv = S.level;
    const r = rnd() & 255;
    let kind = 'tank';
    if (lv === 1) kind = (r & 1) ? 'jet' : 'tank';
    else if (lv >= 2) {
      if ((r & 3) === 0) kind = 'drone';
      else if (r & 1) kind = 'jet';
    }
    const zone = S.heli.x <= FENCE - 512;
    if (kind === 'tank') {
      if (!zone || S.tanks.length >= MAX_TANKS[lv]) return;
      const x = Math.max(HELI_MIN + 8, S.heli.x - (220 + (rnd() % 180)));
      S.tanks.push({ x, dir: 1, think: 8 + (rnd() % 12), alive: true });
    } else if (kind === 'jet') {
      if (S.jets.length >= MAX_JETS[lv] || (S.heli.x >> 8) >= 0x11) return;
      const left = (rnd() & 1) === 0;
      S.jets.push({
        x: left ? S.heli.x - 300 : S.heli.x + 280,
        alt: 46 + (rnd() % 36),
        dir: left ? 1 : -1,
        phase: 0,
        timer: 0,
        bold: lv >= 2 && (rnd() % (lv === 2 ? 8 : 4)) === 0,
        alive: true,
      });
    } else if (zone && S.drones.length < MAX_DRONES[lv]) {
      S.drones.push({
        x: S.heli.x - 160, alt: 36 + (rnd() % 24), vx: 2, alive: true, cool: 20,
      });
    }
  }

  function stepTanks() {
    S.tanks.forEach((t) => {
      if (!t.alive) return;
      const dx = S.heli.x - t.x;
      if (Math.abs(dx) > 128) {
        t.dir = dx >= 0 ? 1 : -1;
        t.x += t.dir * 1.5;
      } else {
        t.think -= 1;
        if (t.think <= 0) {
          t.think = 8 + (rnd() % 16);
          const roll = rnd() % 3;
          t.dir = roll === 0 ? 0 : roll === 1 ? Math.sign(dx || 1) : -Math.sign(dx || 1);
          if (S.heli.alive && S.heli.alt < 40) {
            const tvx = t.dir * 1.5;
            S.shots.push({
              x: t.x, y: GROUND - 8, vx: Math.sign(dx || 1) * 6 + tvx, vy: -4,
              kind: 'shell', enemy: true, alive: true, age: 0,
            });
            sfx('noise');
          }
        }
        t.x += t.dir * 0.7;
      }
      if (t.x > FENCE - 36) {
        t.x = FENCE - 36;
        t.dir = -1;
      }
      if (t.x < HELI_MIN) t.x = HELI_MIN;
      S.hostages.forEach((man) => {
        if (man.dead || man.state === 'squash') return;
        if (overlap(tankBox(t), manBox(man))) squashMan(man);
      });
    });
    S.tanks = S.tanks.filter((t) => t.alive);
  }

  function stepJets() {
    S.jets.forEach((j) => {
      if (!j.alive) return;
      if ((S.heli.x >> 8) >= 0x11) { j.alive = false; return; }
      j.timer += 1;
      j.x += j.dir * (j.phase === 0 ? 3.2 : 4.6);
      if (j.phase === 0 && (Math.abs(j.x - S.heli.x) < (j.bold ? 140 : 70) || j.timer > (j.bold ? 18 : 36))) {
        j.phase = 1;
        j.timer = 0;
      }
      if (j.phase === 1) {
        const want = S.heli.alt + 8;
        j.alt += clamp(want - j.alt, -2, 2);
        if (j.timer === 10 && S.heli.alive) {
          const sy = GROUND - j.alt;
          const jvx = j.dir * (j.phase === 0 ? 3.2 : 4.6);
          if (S.heli.landed) {
            S.shots.push({ x: j.x, y: sy, vx: jvx, vy: 4, kind: 'bomb', enemy: true, alive: true, age: 0 });
          } else {
            const body = heliBody();
            const dx = (body.x + body.w / 2) - j.x;
            const dy = (body.y + body.h / 2) - sy;
            const len = Math.hypot(dx, dy) || 1;
            S.shots.push({
              x: j.x, y: sy, vx: (dx / len) * 8 + jvx, vy: (dy / len) * 8,
              kind: 'missile', enemy: true, alive: true, age: 0,
            });
          }
          sfx('noise');
        }
        if (j.timer > 36) j.alive = false;
      }
      if (j.x < 300 || j.x > 5300) j.alive = false;
      if (j.alive && S.heli.alive && overlap(jetBox(j), heliBody())) destroyHeli();
    });
    S.jets = S.jets.filter((j) => j.alive);
  }

  function stepDrones() {
    S.drones.forEach((d) => {
      if (!d.alive) return;
      const dx = S.heli.x - d.x;
      d.vx = clamp(d.vx + Math.sign(dx || 1), -5, 5);
      d.x += d.vx;
      const want = S.heli.alt + 6;
      d.alt += Math.sign(want - d.alt);
      d.cool -= 1;
      if (S.level >= 3 && d.cool <= 0) {
        d.cool = 28;
        S.shots.push({
          x: d.x, y: GROUND - d.alt, vx: 0, vy: 2.4, kind: 'shell', enemy: true, alive: true, age: 0,
        });
      }
      if (S.heli.alive && S.heli.mercy <= 0 && overlap(droneBox(d), heliBody())) {
        d.alive = false;
        destroyHeli();
      }
      if ((S.frame % 6) === 0) sfx('drone');
    });
    S.drones = S.drones.filter((d) => d.alive);
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function tankBox(t) {
    const w = TANK_SPRITE[0].length;
    return { x: t.x - Math.floor(w / 2), y: GROUND - TANK_SPRITE.length, w, h: TANK_SPRITE.length };
  }

  function jetBox(j) {
    return { x: j.x - 11, y: GROUND - j.alt - 5, w: JET_SPRITE[0].length, h: JET_SPRITE.length };
  }

  function manSprite(man) {
    const tick = (S.frame >> 3) & 1;
    if (man.state === 'wave') return MAN_WAVE[tick];
    if (man.state === 'run') return MAN_RUN[(S.frame + (man.id || 0)) & 1];
    return MAN_IDLE[tick];
  }

  function manBox(man) {
    const sprite = manSprite(man);
    return { x: man.x - 2, y: GROUND - sprite.length, w: sprite[0].length, h: sprite.length };
  }

  function shotBox(s) {
    return { x: s.x - 1, y: s.y - 1, w: 4, h: 3 };
  }

  function droneBox(d) {
    return { x: d.x - 7, y: GROUND - d.alt - 7, w: 14, h: 14 };
  }

  function shotOffscreen(s) {
    const left = S.view - 32;
    const right = S.view + W + 32;
    if (s.x < left || s.x > right) return true;
    if (s.y >= GROUND + 2 || s.y < 4) return true;
    if ((s.age || 0) > 40) return true;
    return false;
  }

  function reapShots() {
    S.shots.forEach((s) => {
      if (s.alive && shotOffscreen(s)) s.alive = false;
    });
    S.shots = S.shots.filter((s) => s.alive);
  }

  function alongShot(prevX, prevY, s, box) {
    const steps = Math.max(1, Math.ceil(Math.hypot(s.x - prevX, s.y - prevY)));
    for (let i = 0; i <= steps; i++) {
      const x = prevX + ((s.x - prevX) * i) / steps;
      const y = prevY + ((s.y - prevY) * i) / steps;
      if (overlap({ x: x - 1, y: y - 1, w: 4, h: 3 }, box)) return true;
    }
    return false;
  }

  function stepShots() {
    tickSquash();
    S.shots.forEach((s) => {
      if (!s.alive) return;
      const prevX = s.x;
      const prevY = s.y;
      s.age = (s.age || 0) + 1;
      s.x += s.vx;
      s.y += s.vy;
      if (s.kind === 'shell' || s.kind === 'bomb') s.vy += 0.38;
      const opened = !s.enemy && hitBarracks(prevX, prevY, s);
      if (shotOffscreen(s) || s.y >= GROUND - 1) {
        s.alive = false;
        if (s.y >= GROUND - 1) {
          if (s.enemy) groundBlast(s.x, true);
          else groundBlast(s.x, false);
        }
        return;
      }
      if (!s.enemy) {
        if (hitManShot(prevX, prevY, s) || hitAir(prevX, prevY, s)) { s.alive = false; return; }
        if (opened) { s.alive = false; return; }
      } else if (hitsHeliBody(prevX, prevY, s)) {
        s.alive = false;
        destroyHeli();
      } else {
        hitManShot(prevX, prevY, s);
      }
    });
    reapShots();
    S.hostages = S.hostages.filter((man) => !man.dead);
    S.tanks = S.tanks.filter((t) => t.alive);
    S.jets = S.jets.filter((j) => j.alive);
    S.drones = S.drones.filter((d) => d.alive);
  }

  function barracksBox(b) {
    return { x: b.x - 20, y: GROUND - 24, w: 44, h: 24 };
  }

  function hitBarracks(prevX, prevY, s) {
    for (let i = 0; i < S.barracks.length; i++) {
      const b = S.barracks[i];
      if (b.open) continue;
      if (alongShot(prevX, prevY, s, barracksBox(b))) {
        killMenNear(b.x + 8, 10);
        pourOut(b);
        return true;
      }
    }
    return false;
  }

  function hitManShot(prevX, prevY, s) {
    for (let i = 0; i < S.hostages.length; i++) {
      const man = S.hostages[i];
      if (man.dead || man.state === 'squash') continue;
      if (alongShot(prevX, prevY, s, manBox(man))) {
        if (s.enemy) squashMan(man);
        else crush(man);
        return true;
      }
    }
    return false;
  }

  function hitAir(prevX, prevY, s) {
    for (let i = 0; i < S.jets.length; i++) {
      const j = S.jets[i];
      if (j.alive && alongShot(prevX, prevY, s, jetBox(j))) {
        j.alive = false;
        boom(j.x, GROUND - j.alt);
        sfx('boom');
        return true;
      }
    }
    for (let i = 0; i < S.drones.length; i++) {
      const d = S.drones[i];
      if (d.alive && alongShot(prevX, prevY, s, droneBox(d))) {
        d.alive = false;
        boom(d.x, GROUND - d.alt);
        sfx('boom');
        return true;
      }
    }
    for (let i = 0; i < S.tanks.length; i++) {
      const t = S.tanks[i];
      if (t.alive && alongShot(prevX, prevY, s, tankBox(t))) {
        t.alive = false;
        boom(t.x, GROUND - 4);
        sfx('boom');
        return true;
      }
    }
    return false;
  }

  function hitsHeliBody(prevX, prevY, s) {
    if (!S.heli.alive || S.heli.mercy > 0) return false;
    return alongShot(prevX, prevY, s, heliBody());
  }

  function groundBlast(x, enemy) {
    boom(x, GROUND - 2);
    if (enemy) {
      killMenNear(x, 12);
      S.barracks.forEach((b) => {
        if (!b.open && Math.abs((b.x + 8) - x) < 22) {
          killMenNear(b.x + 8, 10);
          pourOut(b);
        }
      });
      if (S.heli.alt < 18 && overlap({ x: x - 4, y: GROUND - 8, w: 8, h: 8 }, heliBody())) destroyHeli();
    } else {
      S.tanks.forEach((t) => {
        if (t.alive && Math.abs(t.x - x) < 14) {
          t.alive = false;
          boom(t.x, GROUND - 4);
          sfx('boom');
        }
      });
      killMenNear(x, 8);
    }
  }

  function killMenNear(x, r) {
    S.hostages.forEach((man) => {
      if (!man.dead && Math.abs(man.x - x) <= r) crush(man);
    });
  }

  function destroyHeli() {
    if (!S.heli.alive || S.heli.mercy > 0 || S.pending) return;
    if (S.aboard > 0) {
      S.killed += S.aboard;
      S.aboard = 0;
      sfx('dirge');
    } else sfx('boom');
    boom(S.heli.x, GROUND - S.heli.alt - 6);
    S.heli.alive = false;
    S.heli.vx256 = 0;
    S.lost += 1;
    if (S.lost >= 3 || S.rescued + S.killed >= 64) {
      S.pending = 'lose';
      S.pendingT = 28;
    } else {
      S.pending = 'respawn';
      S.pendingT = 28;
    }
  }

  function checkEnd() {
    if (S.mode !== 'play' || S.pending || S.endReason) return;
    if (S.rescued >= 64) finish('win');
    else if (S.rescued + S.killed >= 64) {
      S.pending = 'lose';
      S.pendingT = 20;
    }
  }

  function finish(reason) {
    S.mode = 'end';
    S.endReason = reason;
    S.timer = 0;
    S.paused = false;
    S.pending = null;
  }

  function stepBooms() {
    S.booms.forEach((b) => { b.t += 1; });
    S.booms = S.booms.filter((b) => b.t < 10);
  }

  function boom(x, y) { S.booms.push({ x, y, t: 0 }); }

  function scroll() {
    const spd = S.heli.vx256 / 256;
    const future = S.heli.x + spd * 8;
    let desired;
    if (spd < -0.4) desired = future - 70;
    else if (spd > 0.4) desired = future - 210;
    else desired = future - 140;
    desired = clamp(desired, VIEW_MIN, VIEW_MAX);
    const step = Math.abs(spd) + 4;
    S.view += clamp(desired - S.view, -step, step);
    if (S.heli.landed && onPad()) S.view += clamp(VIEW_MAX - S.view, -4, 4);
    S.view = Math.round(clamp(S.view, VIEW_MIN, VIEW_MAX));
  }

  function scene() {
    if (S.mode === 'end') return 'end';
    if (S.mode === 'play') return 'play';
    return 'title';
  }

  function sxOf(x) { return Math.round(x - S.view); }

  function draw(raw) {
    const ctx = greenWrap(raw);
    ctx.fillStyle = INK.K;
    ctx.fillRect(0, 0, W, H);
    drawStars(ctx);
    drawPlanet(ctx);
    ctx.fillStyle = inkColor(INK.V);
    ctx.fillRect(0, GROUND, W, H - GROUND);
    if (S.mode !== 'title') {
      drawRubble(ctx);
      drawFence(ctx);
      drawBase(ctx);
      S.barracks.forEach((b) => drawBarracks(ctx, b));
      S.tanks.forEach((t) => {
        if (!t.alive) return;
        const box = tankBox(t);
        blit(ctx, TANK_SPRITE, sxOf(box.x), box.y, {});
      });
      S.hostages.forEach((man) => drawMan(ctx, man));
      S.walkers.forEach((w) => {
        const sprite = MAN_RUN[(S.frame || 0) & 1];
        blit(ctx, sprite, sxOf(w.x), GROUND - sprite.length, {});
      });
      S.jets.forEach((j) => {
        if (!j.alive) return;
        blit(ctx, JET_SPRITE, sxOf(j.x) - 11, GROUND - j.alt - 5, { flip: j.dir < 0 });
      });
      S.drones.forEach((d) => { if (d.alive) drawDrone(ctx, d); });
      if (S.heli.alive || S.pending) drawHeli(ctx, S.heli);
      S.shots.forEach((s) => {
        if (!s.alive) return;
        ctx.fillStyle = inkColor(PROJECTILE);
        ctx.fillRect(sxOf(s.x), Math.round(s.y), s.kind === 'missile' ? 3 : 2, 2);
      });
      S.booms.forEach((b) => drawBoom(ctx, b));
    }
    drawHud(ctx);
    drawMessages(ctx);
    text(ctx, BUILD.toUpperCase(), 2, 28, INK.W, 1);
    if (S.debug) drawDebug(ctx);
  }

  const PROJECTILE = '#ffffff';

  function inkColor(hex) { return hex; }

  function greenWrap(ctx) {
    if (S.monitor !== 'green') return ctx;
    return new Proxy(ctx, {
      get(target, prop) {
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, prop, value) {
        if (prop === 'fillStyle' && typeof value === 'string') {
          const n = value.toLowerCase();
          if (n !== '#000000' && n !== '#000') {
            value = (n === '#ffffff' || n === '#fff') ? '#d6ff8a' : '#3dcc3d';
          }
        }
        target[prop] = value;
        return true;
      },
    });
  }

  function drawStars(ctx) {
    S.stars.forEach((star) => {
      if (((star.x * 3 + star.y + (S.frame || S.timer)) & 3) === 0) return;
      ctx.fillStyle = inkColor(star.c);
      ctx.fillRect(star.x, star.y, 1, 1);
    });
  }

  function drawPlanet(ctx) {
    // Title logo ends near x=222. Keep the moon clear of that R.
    const cx = S.mode === 'title' ? 252 : 222;
    const cy = S.mode === 'title' ? 76 : 80;
    const r = 11;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r - 2) continue;
        const n = (Math.imul(x + 9, 13) + Math.imul(y + 4, 7)) & 7;
        let color = INK.W;
        if (n < 2) color = INK.B;
        else if (n < 4) color = INK.O;
        ctx.fillStyle = color;
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }

  function drawRubble(ctx) {
    const step = 80;
    const left = Math.floor((S.view - step) / step) * step;
    for (let wx = left; wx < S.view + W + step; wx += step) {
      const n = (Math.imul(wx | 0, 0x45d9f3b) >>> 0);
      if ((n % 3) !== 0) continue;
      const sx = Math.round(wx - S.view);
      const h = 3 + (n % 3);
      ctx.fillStyle = (n & 16) ? RUBBLE : INK.B;
      ctx.fillRect(sx, GROUND - h, 3, h);
      ctx.fillRect(sx + 3, GROUND - 2, 4, 2);
      ctx.fillRect(sx - 4, GROUND - 2 - (n & 1), 3, 2 + (n & 1));
      if (n & 4) ctx.fillRect(sx + 7, GROUND - 4, 2, 4);
    }
  }

  function drawDebug(ctx) {
    const boxes = [heliBody()];
    S.tanks.forEach((t) => { if (t.alive) boxes.push(tankBox(t)); });
    S.jets.forEach((j) => { if (j.alive) boxes.push(jetBox(j)); });
    S.drones.forEach((d) => { if (d.alive) boxes.push(droneBox(d)); });
    S.hostages.forEach((man) => { if (!man.dead) boxes.push(manBox(man)); });
    S.shots.forEach((s) => { if (s.alive) boxes.push(shotBox(s)); });
    ctx.fillStyle = '#ff44fd';
    boxes.forEach((b) => {
      const x = Math.round(b.x - S.view);
      const y = Math.round(b.y);
      ctx.fillRect(x, y, Math.max(1, Math.round(b.w)), 1);
      ctx.fillRect(x, y + Math.round(b.h) - 1, Math.max(1, Math.round(b.w)), 1);
      ctx.fillRect(x, y, 1, Math.max(1, Math.round(b.h)));
      ctx.fillRect(x + Math.round(b.w) - 1, y, 1, Math.max(1, Math.round(b.h)));
    });
  }

  function drawHorizon(ctx) {
    for (let x = 0; x < W; x += 4) {
      ctx.fillStyle = (x & 8) ? INK.W : INK.G;
      ctx.fillRect(x, GROUND, 1, 1);
    }
  }

  // i = 0 is nearest the camera (lowest on screen, largest). Later posts rise and shrink.
  function fencePosts() {
    const count = 7;
    const posts = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const scale = 1 - t * 0.65;
      const h = Math.max(3, Math.round(10 * scale));
      const w = Math.max(2, Math.round(4 * scale));
      const lift = Math.sin(t * Math.PI * 0.85) * 6;
      const foot = GROUND + Math.round((1 - t) * 10 - lift);
      posts.push({ x: FENCE - 4 + i * 8, foot, w, h });
    }
    return posts;
  }

  function drawFence(ctx) {
    ctx.fillStyle = INK.W;
    fencePosts().forEach((p) => {
      const x = Math.round(sxOf(p.x));
      if (x < -12 || x > W + 8) return;
      const y = p.foot - p.h;
      ctx.fillRect(x, y, p.w, p.h);
      ctx.fillRect(x - 1, y, p.w + 2, 2);
    });
  }

  function fillTrapezoid(ctx, top, rows, botLeft, topW, botW) {
    for (let i = 0; i < rows; i++) {
      const t = rows <= 1 ? 1 : i / (rows - 1);
      const w = topW + (botW - topW) * t;
      const x = botLeft + (botW - w) / 2;
      ctx.fillRect(Math.round(x), top + i, Math.max(1, Math.round(w)), 1);
    }
  }

  function drawBase(ctx) {
    const anchor = sxOf(BASE);
    if (anchor > W + 20 || anchor < -140) return;
    const botW = 108;
    const topW = 62;
    const botLeft = anchor - 6;
    ctx.fillStyle = INK.G;
    fillTrapezoid(ctx, GROUND, 10, botLeft, topW, botW);
    const hq = hqGeom();
    const bw = hq.bw;
    const bh = hq.bh;
    const bx = sxOf(hq.bx);
    const by = GROUND - bh;
    ctx.fillStyle = INK.O;
    ctx.fillRect(bx, by, bw, bh);
    hiresRun(ctx, bx, by - 1, bw);
    ctx.fillStyle = INK.W;
    ctx.fillRect(bx + 3, by + 2, 7, 3);
    ctx.fillRect(bx + 14, by + 2, 7, 3);
    ctx.fillRect(bx + 28, by + 2, 7, 3);
    ctx.fillStyle = INK.K;
    ctx.fillRect(bx + (hq.doorX - hq.bx), by + 3, 6, 5);
    const pole = bx + bw - 3;
    for (let y = by - 11; y < by; y++) {
      ctx.fillStyle = INK.W;
      ctx.fillRect(pole, y, 1, 1);
    }
    const wave = (S.frame & 4) ? 0 : 1;
    ctx.fillStyle = INK.B;
    ctx.fillRect(pole + 1, by - 11 + wave, 3, 3);
    ctx.fillStyle = INK.O;
    ctx.fillRect(pole + 1, by - 8 + wave, 8, 2);
  }

  function drawBarracks(ctx, b) {
    const x = sxOf(b.x) - 20;
    if (x < -50 || x > W + 10) return;
    const baseW = 44;
    const roofH = 10;
    const bodyH = 12;
    const top = GROUND - bodyH - roofH;
    for (let i = 0; i < roofH; i++) {
      const inset = roofH - 1 - i;
      const w = baseW - inset * 2;
      hiresRun(ctx, x + inset, top + i, w);
    }
    ctx.fillStyle = INK.B;
    ctx.fillRect(x, GROUND - bodyH, baseW, bodyH);
    ctx.fillStyle = INK.W;
    ctx.fillRect(x + 3, GROUND - bodyH + 2, baseW - 6, bodyH - 4);
    if (b.open) {
      ctx.fillStyle = INK.K;
      ctx.fillRect(x + 18, GROUND - 10, 8, 10);
      ctx.fillStyle = (S.frame & 2) ? INK.O : INK.W;
      ctx.fillRect(x + 8, top - 3, 4, 4);
      ctx.fillRect(x + 30, top - 2, 3, 4);
    } else {
      ctx.fillStyle = INK.B;
      ctx.fillRect(x + 8, GROUND - 8, 6, 4);
      ctx.fillRect(x + 30, GROUND - 8, 6, 4);
    }
  }

  function drawMan(ctx, man) {
    const sprite = manSprite(man);
    blit(ctx, sprite, sxOf(man.x) - 2, GROUND - sprite.length, {});
  }

  function drawDrone(ctx, d) {
    const cx = sxOf(d.x);
    const cy = Math.round(GROUND - d.alt);
    for (let y = -6; y <= 6; y++) {
      for (let x = -6; x <= 6; x++) {
        if (x * x + y * y > 30) continue;
        const band = (y + S.frame + d.x) & 3;
        ctx.fillStyle = band === 0 ? INK.B : band === 1 ? INK.O : INK.W;
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }

  function chopperSprite(h) {
    return Math.abs(h.pose) === 0 ? HELI_FRONT : HELI_SIDE;
  }

  function drawHeli(ctx, h) {
    const sprite = chopperSprite(h);
    const foot = GROUND - Math.round(h.alt);
    const top = foot - sprite.length;
    blit(ctx, sprite, sxOf(h.x) - Math.floor(sprite[0].length / 2), top, { flip: h.pose < 0 });
  }

  function plotWhite(ctx, x, y) {
    ctx.fillStyle = INK.W;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function hiresRun(ctx, x, y, w) {
    x = Math.round(x);
    y = Math.round(y);
    if (w <= 0) return;
    ctx.fillStyle = INK.W;
    ctx.fillRect(x, y, w, 1);
  }

  function blit(ctx, sprite, x, y, opt) {
    const flip = !!(opt && opt.flip);
    const h = sprite.length;
    const w = sprite[0].length;
    const ox = Math.round(x);
    const oy = Math.round(y);
    for (let row = 0; row < h; row++) {
      const src = sprite[row];
      for (let col = 0; col < w; col++) {
        const ch = src[flip ? w - 1 - col : col];
        if (!ch || ch === '.' || ch === ' ') continue;
        ctx.fillStyle = INK[ch] || INK.W;
        ctx.fillRect(ox + col, oy + row, 1, 1);
      }
    }
  }

  function drawBoom(ctx, b) {
    const r = 2 + b.t;
    ctx.fillStyle = (b.t & 1) ? INK.O : INK.W;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + b.t;
      ctx.fillRect(sxOf(b.x) + Math.round(Math.cos(a) * r), Math.round(b.y + Math.sin(a) * r * 0.6), 2, 2);
    }
  }

  function drawHud(ctx) {
    const killed = S.mode === 'play' || S.mode === 'end' ? S.killed : 0;
    const aboard = S.mode === 'play' || S.mode === 'end' ? S.aboard : 0;
    const home = S.mode === 'play' || S.mode === 'end' ? S.rescued : 0;
    drawRainbowHud(ctx);
    lemon(ctx, 70, INK.O, killed);
    lemon(ctx, 140, INK.B, aboard);
    lemon(ctx, 210, INK.G, home);
  }

  function drawRainbowHud(ctx) {
    for (let y = 0; y < 8; y++) {
      const inset = 7 - y;
      ctx.fillStyle = INK.B;
      ctx.fillRect(inset, y, W - inset * 2, 1);
    }
    ctx.fillStyle = INK.G;
    ctx.fillRect(1, 8, W - 2, 3);
    ctx.fillStyle = INK.O;
    ctx.fillRect(1, 11, W - 2, 11);
    ctx.fillStyle = INK.G;
    ctx.fillRect(1, 22, W - 2, 3);
  }

  const CREDIT = 'A tribute to Choplifter by Dan Gorlin, Broderbund 1982';

  function roundBox(ctx, x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x + 2, y, w - 4, h);
    ctx.fillRect(x, y + 2, w, h - 4);
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }

  function lemon(ctx, cx, color, value) {
    const w = 58;
    const h = 11;
    const x = cx - 29;
    const y = 11;
    ctx.fillStyle = INK.K;
    for (let row = 0; row < h; row++) {
      const taper = row < 3 ? (3 - row) : row > h - 4 ? (row - (h - 4)) : 0;
      ctx.fillRect(x + taper * 2, y + row, w - taper * 4, 1);
    }
    ctx.fillStyle = inkColor(color);
    const dx = x + 8;
    const dy = y + 2;
    ctx.fillRect(dx + 3, dy, 1, 1);
    ctx.fillRect(dx + 2, dy + 1, 3, 1);
    ctx.fillRect(dx + 1, dy + 2, 5, 1);
    ctx.fillRect(dx, dy + 3, 7, 1);
    ctx.fillRect(dx + 1, dy + 4, 5, 1);
    ctx.fillRect(dx + 2, dy + 5, 3, 1);
    ctx.fillRect(dx + 3, dy + 6, 1, 1);
    const text = String(clamp(value, 0, 99)).padStart(2, '0');
    drawDigits(ctx, text, x + 20, y + 2);
  }

  function drawDigits(ctx, text, x, y) {
    let cx = x;
    for (let i = 0; i < text.length; i++) {
      const rows = DIGIT[text[i]] || DIGIT[0];
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] === '1') plotWhite(ctx, cx + rx, y + ry);
        }
      });
      cx += rows[0].length + 1;
    }
  }

  function creditLine(ctx, y) {
    ctx.save();
    ctx.fillStyle = INK.W;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '7px "Courier New", Courier, monospace';
    if (ctx.measureText(CREDIT).width > 272) ctx.font = '6px "Courier New", Courier, monospace';
    ctx.fillText(CREDIT, W / 2, y);
    ctx.restore();
  }

  function drawMessages(ctx) {
    if (S.mode === 'title') {
      logo(ctx, 48);
      creditLine(ctx, 96);
      textCenter(ctx, 'ARROWS  Z TURN  SPACE FIRE  M MONITOR', 150, INK.O, 1);
      return;
    }
    if (S.mode === 'attract') {
      creditLine(ctx, 34);
      textCenter(ctx, 'YOUR MISSION:', 58, INK.W, 1);
      barText(ctx, 'RESCUE HOSTAGES', 78);
      return;
    }
    if (S.paused) {
      barText(ctx, 'PAUSED', 78);
      return;
    }
    if (S.mode === 'play' && S.banner > 0 && (S.frame & 8) < 6) {
      const names = ['FIRST SORTIE', 'SECOND SORTIE', 'THIRD SORTIE'];
      barText(ctx, names[Math.min(2, S.sortie - 1)] || 'FIRST SORTIE', 70);
    }
    if (S.mode === 'end') {
      if (S.endReason === 'win') drawCrowns(ctx);
      else barText(ctx, 'THE END', 78);
      if (S.timer > 18 && (S.timer & 8)) textCenter(ctx, 'PRESS A KEY', 108, INK.W, 1);
    }
  }

  function barText(ctx, str, y) {
    const scale = 2;
    const width = str.length * 6 * scale - scale;
    const x = Math.round((W - width) / 2);
    text(ctx, str, x, y, INK.W, scale);
  }

  function logo(ctx, y) {
    const word = 'CHOPLIFTER';
    const scale = 3;
    const width = word.length * 6 * scale;
    const x = Math.round((W - width) / 2) - 6;
    text(ctx, word, x + 1, y - 1, INK.O, scale);
    text(ctx, word, x - 1, y + 2, INK.B, scale);
    text(ctx, word, x, y, INK.W, scale);
  }

  function textCenter(ctx, str, y, color, scale) {
    const width = str.length * 6 * scale - scale;
    text(ctx, str, Math.round((W - width) / 2), y, color, scale);
  }

  function text(ctx, str, x, y, color, scale) {
    ctx.fillStyle = color;
    let cx = x;
    for (let i = 0; i < str.length; i++) {
      const rows = FONT[str[i]] || FONT[' '];
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < 5; rx++) {
          if (row[rx] === '1') ctx.fillRect(cx + rx * scale, y + ry * scale, scale, scale);
        }
      });
      cx += 6 * scale;
    }
  }

  function drawCrowns(ctx) {
    for (let i = 0; i < 3; i++) {
      const x = 96 + i * 36;
      ctx.fillStyle = INK.O;
      ctx.fillRect(x, 86, 22, 4);
      ctx.fillRect(x, 74, 4, 12);
      ctx.fillRect(x + 9, 70, 4, 16);
      ctx.fillRect(x + 18, 74, 4, 12);
      ctx.fillStyle = INK.W;
      ctx.fillRect(x + 1, 87, 20, 2);
    }
  }

  function selfTest() {
    const failures = [];
    function expect(cond, msg) { if (!cond) failures.push(msg); }
    buildStars();
    S.quiet = true;
    S.soundOn = false;
    beginPlay();
    expect(S.barracks.map((b) => b.open).join() === 'false,false,false,true', 'fourth barracks starts open');
    expect(S.hostages.length === 8, 'eight hostages already out');
    expect(S.barracks.reduce((n, b) => n + b.inside, 0) === 56, '56 still inside');
    expect(S.aboard === 0 && S.killed === 0 && S.rescued === 0, 'counters start at zero');

    S.heli.alt = 80;
    S.heli.landed = false;
    S.heli.vx256 = 0;
    S.heli.tilt = 0;
    for (let i = 0; i < 180; i++) update({ stickX: 5, stickY: 10 });
    expect(S.heli.vx256 === 21 * 256, 'top speed clamps at 21 dots/frame');

    const alt = S.heli.alt;
    S.heli.vy = 0;
    for (let i = 0; i < 20; i++) update({ stickX: 0, stickY: 10 });
    expect(Math.abs(S.heli.alt - alt) < 1, 'stick index 10 hovers');

    S.heli.landed = true;
    S.heli.alt = 0;
    S.heli.vy = 0;
    S.heli.vx256 = 0;
    S.heli.tilt = 0;
    update({ stickX: 0, stickY: 10 });
    expect(S.heli.landed && S.heli.alt === 0, 'neutral stick stays on the pad');
    update({ stickX: 0, stickY: 0 });
    expect(!S.heli.landed && S.heli.alt > 0, 'full up leaves the ground');

    S.heli.alt = 6;
    S.heli.vy = 6;
    S.heli.vx256 = 0;
    S.heli.landed = false;
    S.heli.alive = true;
    update({ stickX: 0, stickY: 15 });
    expect(S.heli.alive && !S.heli.landed && S.heli.alt > 0, 'hard drop bounces');

    S.heli.alt = 1;
    S.heli.vy = 1;
    S.heli.tilt = 5;
    S.heli.vx256 = 21 * 256;
    S.heli.landed = false;
    S.heli.alive = true;
    S.pending = null;
    update({ stickX: 5, stickY: 12 });
    expect(!S.heli.alive && S.pending === 'respawn', 'full horizontal speed crashes');

    beginPlay();
    S.banner = 0;
    S.heli.x = BARRACKS_X[0] + 40;
    S.heli.landed = true;
    S.heli.tilt = 0;
    S.heli.alt = 0;
    S.heli.vx256 = 0;
    S.hostages = [{ x: Math.round(S.heli.x) + 8, dir: 1, state: 'out', anchor: BARRACKS_X[0], id: 3 }];
    update({ stickX: 0, stickY: 10 });
    expect(S.aboard === 1 && S.trip === true, 'hostage at +8 boards');

    S.aboard = 0;
    S.trip = false;
    S.heli.tilt = 3;
    S.heli.landed = true;
    S.hostages = [{ x: Math.round(S.heli.x) + 8, dir: 1, state: 'out', anchor: BARRACKS_X[0], id: 4 }];
    update({ stickX: 3, stickY: 10 });
    expect(S.aboard === 0 && S.hostages.length === 1, 'tilted landing does not board');

    S.heli.tilt = 0;
    S.hostages = [{ x: Math.round(S.heli.x), dir: 1, state: 'out', anchor: BARRACKS_X[0], id: 5 }];
    const killedBefore = S.killed;
    update({ stickX: 0, stickY: 10 });
    expect(S.killed === killedBefore + 1 && S.aboard === 0, 'hostage under the skids is crushed');

    S.aboard = 16;
    S.killed = 0;
    S.heli.tilt = 0;
    S.heli.landed = true;
    S.hostages = [{ x: Math.round(S.heli.x) + 8, dir: 1, state: 'out', anchor: BARRACKS_X[0], id: 6 }];
    update({ stickX: 0, stickY: 10 });
    expect(S.aboard === 16, 'sixteenth passenger is the limit');

    S.aboard = 1;
    S.trip = true;
    S.level = 0;
    S.rescued = 0;
    S.heli.x = BASE + 30;
    S.heli.landed = true;
    S.heli.tilt = 0;
    S.heli.alt = 0;
    S.heli.vx256 = 0;
    S.frame = 7;
    update({ stickX: 0, stickY: 10 });
    expect(S.rescued === 1 && S.level === 1 && S.trip === false, 'first unload after a pickup raises the level');
    S.aboard = 1;
    S.trip = false;
    S.frame = 15;
    update({ stickX: 0, stickY: 10 });
    expect(S.level === 1 && S.rescued === 2, 'unload without a new pickup does not raise the level');

    S.rescued = 64;
    S.pending = null;
    update({ stickX: 0, stickY: 10 });
    expect(S.mode === 'end' && S.endReason === 'win', '64 home wins');

    beginPlay();
    S.rescued = 63;
    S.killed = 1;
    S.pending = null;
    update({ stickX: 0, stickY: 10 });
    expect(S.pending === 'lose', '63 home and 1 killed is the end');

    beginPlay();
    S.lost = 2;
    S.heli.landed = true;
    S.heli.alt = 0;
    S.heli.mercy = 0;
    S.heli.alive = true;
    S.pending = null;
    S.shots = [{ x: S.heli.x, y: GROUND - 2, vx: 0, vy: 2, kind: 'shell', enemy: true, alive: true }];
    update({ stickX: 0, stickY: 10 });
    expect(S.pending === 'lose' && S.lost === 3, 'third helicopter ends the game');

    beginPlay();
    S.tanks = [{ x: FENCE - 10, dir: 1, think: 30, alive: true }];
    for (let i = 0; i < 40; i++) stepTanks();
    expect(S.tanks[0].x <= FENCE - 36, 'tanks stop short of the fence');

    beginPlay();
    S.tanks = [{ x: BARRACKS_X[1], dir: 0, think: 40, alive: true }];
    S.shots = [{
      x: BARRACKS_X[1], y: GROUND - 40, vx: 8, vy: 0, kind: 'bullet', enemy: false, down: false, alive: true, age: 0,
    }];
    stepShots();
    expect(S.tanks.length === 1 && S.tanks[0].alive, 'a shot above a tank does not destroy it');
    S.shots = [{
      x: BARRACKS_X[1], y: GROUND - 2, vx: 0, vy: 3, kind: 'bullet', enemy: false, down: true, alive: true,
    }];
    stepShots();
    expect(S.tanks.length === 0, 'a shot fired facing the viewer destroys a tank');

    S.heli.pose = -4;
    S.turning = false;
    S.faceWas = false;
    update({ stickX: 0, stickY: 10, face: true });
    update({ stickX: 0, stickY: 10, face: false });
    update({ stickX: 0, stickY: 10, face: false });
    expect(S.heli.pose === 0, 'a short press faces the viewer');

    beginPlay();
    S.quiet = true;
    S.soundOn = false;
    S.heli.alive = true;
    S.heli.mercy = 0;
    S.heli.alt = 40;
    S.heli.landed = false;
    S.heli.pose = 4;
    S.view = Math.round(S.heli.x - 40);
    S.shots = [];
    fireGun();
    const right = S.shots.find((s) => !s.enemy);
    const rightBody = heliBody();
    expect(right && right.x >= rightBody.x + rightBody.w - 1, 'right facing shot spawns at the nose');
    expect(right && right.vx > 0 && right.vy > 0, 'flying shot goes diagonal down');

    S.heli.pose = -4;
    S.shots = [];
    fireGun();
    const left = S.shots.find((s) => !s.enemy);
    const leftBody = heliBody();
    expect(left && left.x <= leftBody.x + 1, 'left facing shot spawns at the nose');

    S.heli.pose = 0;
    S.heli.lastSide = 1;
    S.shots = [];
    fireGun();
    const front = S.shots.find((s) => !s.enemy);
    expect(front && Math.abs(front.x - S.heli.x) < 4 && front.vy > 0, 'front shot leaves the belly');

    S.heli.landed = true;
    S.heli.alt = 0;
    S.heli.pose = 4;
    S.shots = [];
    fireGun();
    const low = S.shots.find((s) => !s.enemy);
    expect(low && low.vy === 0 && low.vx > 0 && low.x > S.heli.x, 'landed shot is horizontal from the nose');

    beginPlay();
    S.quiet = true;
    S.heli.alive = true;
    S.heli.mercy = 0;
    S.heli.landed = false;
    S.heli.alt = 40;
    S.heli.pose = 4;
    S.heli.vy = 0;
    S.heli.vx256 = 21 * 256;
    S.shots = [];
    fireGun();
    const fast = S.shots.find((s) => !s.enemy);
    expect(fast && fast.vx > 21 && fast.vx >= 21 + 16, 'a shot adds muzzle speed on top of the chopper');
    S.heli.vx256 = -21 * 256;
    S.shots = [];
    fireGun();
    const lead = S.shots.find((s) => !s.enemy);
    expect(lead && lead.vx > 0, 'muzzle speed still carries a shot ahead of a reversing chopper');

    beginPlay();
    S.quiet = true;
    S.heli.x = BARRACKS_X[0] + 30;
    const closed = S.barracks[0];
    const popBefore = S.hostages.length;
    const insideBefore = closed.inside;
    const bb = barracksBox(closed);
    S.shots = [{
      x: bb.x + 8, y: bb.y + 8, vx: 6, vy: 0, kind: 'bullet', enemy: false, down: false, alive: true, age: 0,
    }];
    stepShots();
    expect(closed.open && closed.inside < insideBefore, 'a shot opens a barracks');
    expect(S.hostages.length > popBefore, 'hostages pour out when a barracks is shot');
    beginPlay();
    S.quiet = true;
    const untouched = S.barracks[0];
    S.shots = [{
      x: untouched.x, y: 30, vx: 8, vy: 0, kind: 'bullet', enemy: false, down: false, alive: true, age: 0,
    }];
    stepShots();
    expect(!untouched.open, 'a bullet that misses the barracks does not open it');

    beginPlay();
    S.quiet = true;
    S.heli.x = BARRACKS_X[0] + 40;
    S.heli.landed = true;
    S.heli.tilt = 0;
    S.heli.alt = 0;
    S.heli.vx256 = 0;
    S.heli.alive = true;
    S.aboard = 0;
    S.hostages = [{ x: S.heli.x + 36, dir: 1, state: 'out', anchor: BARRACKS_X[0], id: 11 }];
    for (let i = 0; i < 40; i++) update({ stickX: 0, stickY: 10 });
    expect(S.aboard === 1, 'landing near a hostage boards them');

    const door = hqGeom().doorX;
    S.walkers = [{ x: door - 4 }];
    for (let i = 0; i < 6; i++) stepWalkers();
    expect(S.walkers.length === 0, 'rescued hostages disappear into the HQ door');
    expect(Math.abs(door - hqGeom().bx) < 30, 'the despawn point is the drawn door');

    beginPlay();
    S.quiet = true;
    S.heli.x = 2200;
    S.heli.alt = 40;
    S.heli.landed = false;
    S.heli.pose = 4;
    S.view = Math.round(S.heli.x - 40);
    const jb = jetBox({ x: S.heli.x + 40, alt: 40 });
    S.jets = [{ x: S.heli.x + 40, alt: 40, dir: -1, phase: 1, timer: 0, alive: true, bold: false }];
    S.shots = [{
      x: jb.x + 4, y: jb.y + 2, vx: 6, vy: 0, kind: 'bullet', enemy: false, down: false, alive: true, age: 0,
    }];
    stepShots();
    expect(S.jets.length === 0, 'bullet hits a jet');

    beginPlay();
    S.quiet = true;
    S.heli.landed = true;
    S.heli.alt = 0;
    S.heli.pose = 4;
    S.heli.alive = true;
    S.heli.mercy = 0;
    S.pending = null;
    S.lost = 0;
    S.view = Math.round(S.heli.x - 40);
    const hb = heliBody();
    S.shots = [{
      x: hb.x + hb.w + 8, y: hb.y - 3, vx: 0, vy: 0, kind: 'shell', enemy: true, alive: true, age: 0,
    }];
    stepShots();
    expect(S.heli.alive, 'rotor tip does not count as a hit');

    S.heli.x = BARRACKS_X[0] + 40;
    S.heli.tilt = 0;
    S.heli.landed = true;
    S.heli.alt = 0;
    S.view = Math.round(S.heli.x - 40);
    S.hostages = [{ x: Math.round(S.heli.x), dir: 1, state: 'out', anchor: S.heli.x, id: 9 }];
    const crushed = S.killed;
    update({ stickX: 0, stickY: 10 });
    expect(S.killed === crushed + 1, 'hostage-crush event');

    const phoneP = fitFrame(390, 844);
    expect(phoneP.portrait, 'portrait layout');
    expect(Math.abs(phoneP.cssW - 390) < 0.5, 'portrait fills the width');
    expect(Math.abs(phoneP.cssW / phoneP.cssH - W / H) < 0.001, 'portrait keeps the aspect');
    expect(phoneP.sharp === Math.ceil(phoneP.scale - 1e-4), 'sharp step is the next integer');
    const phoneL = fitFrame(844, 390);
    expect(!phoneL.portrait, 'landscape layout');
    expect(Math.abs(phoneL.cssH - 390) < 0.5, 'landscape fills the height');
    expect(Math.abs(phoneL.cssW / phoneL.cssH - W / H) < 0.001, 'landscape keeps the aspect');
    const desk = fitFrame(1280, 800);
    expect(desk.cssW <= 1280 + 0.1 && desk.cssH <= 800 + 0.1, 'desktop fits the viewport');
    expect(Math.abs(desk.cssW / desk.cssH - W / H) < 0.001, 'desktop keeps the aspect');
    const inset = fitFrame(844, 390, { top: 20, right: 30, bottom: 10, left: 40 });
    expect(inset.cssH <= 360.1 && inset.left >= 39.9, 'safe area insets the frame');

    beginPlay();
    S.quiet = true;
    S.mode = 'play';
    S.banner = 0;
    S.debug = false;
    S.heli.alt = 30;
    S.heli.landed = false;
    S.view = 1400;
    const frameA = paintFrame();
    S.view = 1401;
    const frameB = paintFrame();
    const violet = 0xff44fd;
    let flicker = 0;
    for (let x = 0; x < W; x++) {
      const ca = frameA[(GROUND + 8) * W + x];
      const cb = frameB[(GROUND + 8) * W + x];
      if (ca !== violet || cb !== violet) flicker += 1;
    }
    expect(flicker === 0, 'scroll does not flicker ground columns');

    beginPlay();
    S.quiet = true;
    S.soundOn = false;
    S.heli.alive = true;
    S.heli.mercy = 0;
    S.heli.pose = 4;
    S.view = Math.round(S.heli.x - 40);
    let stuck = 0;
    for (let i = 0; i < 240; i++) {
      if (i === 80) { S.heli.landed = true; S.heli.alt = 0; }
      if (i === 140) { S.heli.landed = false; S.heli.alt = 28; S.heli.pose = -4; }
      if (i === 190) {
        S.lost = 0;
        S.pending = null;
        S.heli.alive = true;
        S.heli.mercy = 0;
        destroyHeli();
        S.pendingT = 1;
        update({ stickX: 0, stickY: 10 });
        S.heli.mercy = 0;
        S.heli.alive = true;
        S.pending = null;
        S.mode = 'play';
        S.shots = [];
      }
      S.shots.forEach((s) => { if (!s.enemy) s.x = S.view + W + 100; });
      reapShots();
      const before = S.shots.filter((s) => !s.enemy && s.alive).length;
      fireGun();
      const after = S.shots.filter((s) => !s.enemy && s.alive).length;
      if (before < 5 && after <= before) stuck += 1;
    }
    expect(stuck === 0, 'firing still works across landing, sortie and death');

    function inkBox(sprite) {
      let minX = 99;
      let minY = 99;
      let maxX = -1;
      let maxY = -1;
      sprite.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] && row[x] !== '.' && row[x] !== ' ') {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      });
      return { w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    function drawnBox(sprite, flip) {
      const gw = sprite[0].length + 4;
      const gh = sprite.length + 4;
      const pix = new Uint8Array(gw * gh);
      const ctx = {
        fillStyle: '#ffffff',
        fillRect(x, y, w, h) {
          if (this.fillStyle === INK.K || this.fillStyle === '#000000') return;
          for (let yy = Math.floor(y); yy < y + h; yy++) {
            for (let xx = Math.floor(x); xx < x + w; xx++) {
              if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) pix[yy * gw + xx] = 1;
            }
          }
        },
      };
      blit(ctx, sprite, 2, 2, { flip });
      let minX = gw;
      let minY = gh;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          if (!pix[y * gw + x]) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      return { w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    const sideInk = inkBox(HELI_SIDE);
    const frontInk = inkBox(HELI_FRONT);
    expect(sideInk.w / W > 0.10 && sideInk.w / W < 0.16, 'side chopper is about 1/8 of the play width');
    expect(sideInk.w / sideInk.h >= 1.7 && sideInk.w / sideInk.h <= 2.6, 'side chopper is about 2:1');
    expect(Math.abs(frontInk.w / frontInk.h - 1) <= 0.25, 'front chopper is nearly square');

    [-4, -2, 0, 2, 4].forEach((pose) => {
      [-5, 0, 5].forEach((tilt) => {
        const sprite = chopperSprite({ pose, tilt });
        const src = inkBox(sprite);
        const drawn = drawnBox(sprite, pose < 0);
        const srcRatio = src.w / src.h;
        const drawnRatio = drawn.w / drawn.h;
        expect(Math.abs(drawn.w - src.w) <= 1 && Math.abs(drawn.h - src.h) <= 1, 'chopper box matches sprite pose ' + pose + ' tilt ' + tilt);
        expect(Math.abs(drawnRatio - srcRatio) < 0.08, 'chopper ratio matches sprite pose ' + pose + ' tilt ' + tilt);
      });
    });

    beginPlay();
    S.quiet = true;
    S.mode = 'play';
    S.banner = 0;
    S.debug = false;
    S.heli.alive = false;
    S.view = 2320;
    const frame = paintFrame();
    const magenta = 0xff44fd;
    let pinkSky = 0;
    for (let y = 30; y < GROUND; y++) {
      for (let x = 0; x < W; x++) {
        if (frame[y * W + x] === magenta) pinkSky += 1;
      }
    }
    expect(pinkSky === 0, 'the sky has no magenta cliff');
    expect(frame[(GROUND + 4) * W + 40] === magenta, 'the ground band is magenta');
    expect(frame[80 * W + 222] !== magenta, 'the moon is not the ground colour');
    const band = H - GROUND;
    expect(band / H >= 0.10 && band / H <= 0.18, 'the ground is a thin band');
    expect(DIGIT[0].length >= 7 && DIGIT[0][0].length >= 5, 'counter digits are chunky');
    const nearPost = fencePosts()[0];
    const farPost = fencePosts()[fencePosts().length - 1];
    expect(nearPost.h > farPost.h && nearPost.foot > farPost.foot, 'near fence posts are bigger and lower');

    beginPlay();
    S.quiet = true;
    S.mode = 'play';
    S.banner = 0;
    S.debug = false;
    S.monitor = 'colour';
    S.heli.alive = false;
    S.tanks = [];
    S.jets = [];
    S.drones = [];
    S.hostages = [];
    S.walkers = [];
    S.booms = [];
    S.shots = [];
    S.view = VIEW_MAX;
    const baseFrame = paintFrame();
    const green = 0x14f53c;
    const orange = 0xff6a3c;
    function countColor(y, color) {
      let n = 0;
      for (let x = 0; x < W; x++) if (baseFrame[y * W + x] === color) n += 1;
      return n;
    }
    expect(countColor(GROUND + 8, green) > countColor(GROUND + 1, green), 'the pad is wider at the near edge');
    let officeW = 0;
    let officeRows = 0;
    for (let y = GROUND - 24; y < GROUND; y++) {
      let run = 0;
      let maxRun = 0;
      for (let x = 0; x <= W; x++) {
        if (x < W && baseFrame[y * W + x] === orange) {
          run += 1;
          if (run > maxRun) maxRun = run;
        } else run = 0;
      }
      if (maxRun >= 12) {
        officeRows += 1;
        if (maxRun > officeW) officeW = maxRun;
      }
    }
    expect(officeW > 0 && officeW <= 48 && officeRows <= 14, 'the post office is a small building');

    beginPlay();
    S.quiet = true;
    S.mode = 'play';
    S.banner = 0;
    S.debug = false;
    S.monitor = 'colour';
    S.heli.alive = false;
    S.tanks = [];
    S.jets = [];
    S.drones = [];
    S.hostages = [];
    S.walkers = [];
    S.booms = [];
    S.shots = [];
    const bare = paintFrame();
    const spots = [
      { x: S.view + 36, y: 64, kind: 'bullet' },
      { x: S.view + 70, y: GROUND + 6, kind: 'shell' },
      { x: S.view + 110, y: 96, kind: 'missile' },
      { x: S.view + 150, y: GROUND + 8, kind: 'bomb' },
    ];
    S.shots = spots.map((s) => ({
      x: s.x, y: s.y, vx: 0, vy: 0, kind: s.kind, enemy: true, alive: true, age: 0,
    }));
    const painted = paintFrame();
    spots.forEach((s) => {
      const sx = Math.round(s.x - S.view);
      const sy = Math.round(s.y);
      const sw = s.kind === 'missile' ? 3 : 2;
      let changed = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < sw; dx++) {
          const i = (sy + dy) * W + (sx + dx);
          if (painted[i] !== bare[i]) {
            changed += 1;
            expect(painted[i] !== bare[i], s.kind + ' colour differs from the layer behind it');
          }
        }
      }
      expect(changed > 0, s.kind + ' is visible against the layer behind it');
    });
    expect(PROJECTILE !== INK.K && PROJECTILE !== INK.V, 'projectile colour is neither sky nor ground');

    const store = {};
    const prevStore = globalThis.localStorage;
    globalThis.localStorage = {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
    };
    S.monitor = 'colour';
    toggleMonitor();
    expect(store['choplifter-monitor'] === 'green' && S.monitor === 'green', 'green monitor is saved');
    S.monitor = 'colour';
    loadMonitor();
    expect(S.monitor === 'green', 'green monitor is restored');
    const greenFrame = paintFrame();
    let skyIdx = -1;
    let groundIdx = -1;
    for (let i = 32 * W; i < GROUND * W; i++) {
      if (skyIdx < 0 && bare[i] === 0) skyIdx = i;
    }
    for (let x = 0; x < W; x++) {
      const i = (GROUND + 4) * W + x;
      if (bare[i] === magenta) { groundIdx = i; break; }
    }
    expect(skyIdx >= 0 && greenFrame[skyIdx] === 0x000000, 'green monitor keeps the sky black');
    expect(groundIdx >= 0 && greenFrame[groundIdx] !== magenta && greenFrame[groundIdx] !== 0, 'green monitor ground is phosphor, not pink');
    const shellAt = (GROUND + 6) * W + 70;
    expect(greenFrame[shellAt] !== 0 && greenFrame[shellAt] !== greenFrame[groundIdx], 'a shell still contrasts on the green monitor');
    toggleMonitor();
    expect(S.monitor === 'colour' && store['choplifter-monitor'] === 'colour', 'colour monitor is saved');
    if (prevStore === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevStore;

    return { ok: failures.length === 0, failures, passed: failures.length === 0 };
  }

  function debugSetup(name) {
    S.quiet = true;
    S.frozen = true;
    if (name === 'title') { showTitle(); return; }
    beginPlay();
    S.quiet = true;
    S.banner = 0;
    if (name === 'fence') {
      S.heli.x = FENCE + 50;
      S.heli.landed = false;
      S.heli.alt = 36;
      S.heli.pose = -4;
      S.heli.tilt = -2;
      S.view = FENCE - 36;
      S.tanks = [];
      S.hostages = [];
    }
    if (name === 'base') {
      S.heli.x = BASE + 28;
      S.heli.landed = true;
      S.heli.alt = 0;
      S.heli.pose = -4;
      S.heli.tilt = 0;
      S.heli.vx256 = 0;
      S.view = clamp(BASE - 70, VIEW_MIN, VIEW_MAX);
      S.tanks = [];
      S.hostages = [];
    }
    if (name === 'fly') {
      S.heli.landed = false;
      S.heli.alt = 48;
      S.heli.tilt = -4;
      S.heli.pose = -4;
      S.heli.vx256 = -10 * 256;
      S.heli.x = START_X - 180;
      S.heli.tilt = -3;
      S.view = clamp(S.heli.x - 90, VIEW_MIN, VIEW_MAX);
      S.tanks = [{ x: S.heli.x + 80, dir: -1, think: 40, alive: true }];
      S.shots = [
        { x: S.heli.x - 16, y: GROUND - 80, vx: -6, vy: 3, kind: 'bullet', enemy: false, alive: true, age: 0 },
        { x: S.heli.x + 36, y: GROUND - 36, vx: -2, vy: -3, kind: 'shell', enemy: true, alive: true, age: 0 },
      ];
    }
    if (name === 'gameplay') {
      const bx = BARRACKS_X[3];
      S.heli.x = bx - 30;
      S.heli.landed = false;
      S.heli.alt = 42;
      S.heli.tilt = -3;
      S.heli.pose = -4;
      S.heli.vx256 = -8 * 256;
      S.banner = 0;
      S.tanks = [{ x: bx + 90, dir: -1, think: 40, alive: true }];
      S.view = clamp(S.heli.x - 60, VIEW_MIN, VIEW_MAX);
    }
    if (name === 'rescue') {
      const bx = BARRACKS_X[3];
      const hx = bx + 46;
      S.heli.x = hx;
      S.heli.landed = true;
      S.heli.alt = 0;
      S.heli.tilt = 0;
      S.heli.pose = -4;
      S.heli.vx256 = 0;
      S.frame = 2;
      S.hostages = [
        { x: hx - 30, dir: 1, state: 'wave', anchor: bx, id: 1 },
        { x: hx + 18, dir: -1, state: 'run', anchor: bx, id: 2 },
        { x: hx + 36, dir: -1, state: 'run', anchor: bx, id: 3 },
      ];
      S.view = clamp(hx - 100, VIEW_MIN, VIEW_MAX);
    }
  }

  root.GameApp = {
    boot, frame, update, draw, scene, selfTest, debugSetup, integerScale, fitFrame, paintFrame, state: S,
    GROUND, BASE, BARRACKS_X,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
