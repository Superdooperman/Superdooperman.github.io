// Choplifter tribute. Behaviour follows the 1982 Apple II game as measured
// in public notes (thrust, climb, map, boarding, spawns, sorties).
// Every picture here is newly drawn. No original bytes, shapes, or samples.
(function (root) {
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
    0: ['111', '101', '101', '101', '111'],
    1: ['010', '110', '010', '010', '111'],
    2: ['111', '001', '111', '100', '111'],
    3: ['111', '001', '111', '001', '111'],
    4: ['101', '101', '111', '001', '001'],
    5: ['111', '100', '111', '001', '111'],
    6: ['111', '100', '111', '101', '111'],
    7: ['111', '001', '010', '010', '010'],
    8: ['111', '101', '111', '101', '111'],
    9: ['111', '101', '111', '001', '111'],
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

  const HELI_SIDE = [
    '.................WWWWWWWWWWWWW..................',
    '.......................WW.......................',
    '................WWWWWWWWWWWWWWWW................',
    '.............WWWWWWWWWWWWWWWWWWWWW..............',
    '........WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW..........',
    '......WWWWWWW..................WWWWWWWWW........',
    '......WWWWWWW..................WWWW..WWWW.......',
    '......WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW........',
    '.......WWWWWWWWWWWWWWWWWWWWWWWWWWWWW............',
    '..........WWWW......................WWWW........',
    '.........WWWWWW....................WWWWWW.......',
    '........WW....WW................WW....WW........',
  ];
  const HELI_FRONT = [
    '........WWWWWW........',
    '......WWWWWWWWWW......',
    '....WWWWWWWWWWWWWW....',
    '...WWW...WWWW...WWW...',
    '...WWW...WKKW...WWW...',
    '....WWWWWWWWWWWWWW....',
    '.....WWWWWWWWWWWW.....',
    '.......WW....WW.......',
    '......WWW....WWW......',
    '.......WW....WW.......',
  ];
  const MAN_RUN = [
    ['..WW..', '.WWWW.', '..WW..', '..WW..', '.W..W.', '.W..W.', 'W....W'],
    ['..WW..', '.WWWW.', '..WW..', '..WW..', '..WW..', '.W..W.', 'W....W'],
  ];
  const MAN_WAVE = ['W....W', '.W..W.', '..WW..', '.WWWW.', '..WW..', '..WW..', 'W....W'];
  const TANK_SPRITE = [
    '..........WWWW..............',
    '.........WWWWWWW............',
    '...WWWWWWWWWWWWWWWWWWW......',
    '..WWWWWWWWWWWWWWWWWWWWWW....',
    '.GG..GG..GG..GG..GG..GG..GG.',
    'GG..GG..GG..GG..GG..GG..GG..',
  ];
  const JET_SPRITE = [
    '.............WW.............',
    '........WWWWWWWWWWWW........',
    '.....WWWWWWWWWWWWWWWWW......',
    '........WWWWWWWWWWWW........',
    '.............WW.............',
  ];
  // Stepped violet masses in parallax space (half scroll). Each entry is
  // start, width, height in pixels above the floor.
  const MESAS = [
    [360, 150, 100],
    [640, 180, 118],
    [760, 150, 112],
    [1040, 160, 96],
    [1320, 200, 124],
    [1680, 140, 88],
    [1960, 170, 116],
    [2288, 170, 122],
    [2520, 120, 48],
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

  function boot() {
    S.rng = 0x31;
    buildStars();
    showTitle();
    if (typeof location !== 'undefined' && location.search) {
      const shot = new URLSearchParams(location.search).get('shot');
      if (shot) debugSetup(shot);
    }
  }

  function buildStars() {
    S.stars = [];
    let n = 0x1234567;
    for (let i = 0; i < 72; i++) {
      n = (Math.imul(n, 1103515245) + 12345) >>> 0;
      const x = 4 + (n % 272);
      n = (Math.imul(n, 1103515245) + 12345) >>> 0;
      const y = 28 + (n % 130);
      const colors = ['#14f53c', '#ff44fd', '#ff6a3c', '#14cffd', '#ffffff'];
      S.stars.push({ x, y, c: colors[i % 5] });
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
      S.barracks = BARRACKS_X.map((x, i) => ({ x, open: i === 3, inside: 16 }));
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

  function fireGun() {
    const h = S.heli;
    if (!h.alive || h.landed || h.mercy > 12) return;
    const flying = S.shots.filter((s) => !s.enemy && s.alive !== false).length;
    if (flying >= 5) return;
    const y = GROUND - h.alt - 6;
    const down = Math.abs(h.pose) < 3;
    if (down) {
      S.shots.push({
        x: h.x, y: y + 4, vx: Math.sign(h.pose) * 1.2, vy: 4,
        kind: 'bullet', enemy: false, down: true, alive: true,
      });
    } else {
      const dir = Math.sign(h.pose) || h.lastSide || 1;
      S.shots.push({
        x: h.x + dir * 16, y, vx: dir * 8, vy: 0,
        kind: 'bullet', enemy: false, down: false, alive: true,
      });
    }
    sfx('shot');
  }

  function stepHostages() {
    const h = S.heli;
    const hx = Math.round(h.x);
    if ((S.frame % 4) === 0) releaseOne();
    S.hostages.forEach((man) => {
      const dx = man.x - hx;
      const near = Math.abs(dx) < 120 && h.alt < 55;
      if (doorOpen() && !onPad() && S.aboard < 16 && Math.abs(dx) < 150) {
        man.state = 'run';
        const target = dx >= 0 ? hx + 8 : hx - 11;
        if (man.x < target) man.x += 1;
        else if (man.x > target) man.x -= 1;
      } else if (S.aboard >= 16 && h.landed && Math.abs(dx) < 48) {
        man.state = 'wave';
        man.x += dx >= 0 ? 1 : -1;
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

  function releaseOne() {
    const out = S.hostages.length;
    if (out >= 5 || out + S.walkers.length >= 16) return;
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
    b.inside -= 1;
    S.hostages.push({
      x: b.x + 6, dir: 1, state: 'out', anchor: b.x, id: S.frame + pick,
    });
  }

  function board(man) {
    man.dead = true;
    S.aboard += 1;
    S.trip = true;
    sfx('board');
  }

  function crush(man) {
    if (man.dead) return;
    man.dead = true;
    S.killed += 1;
    boom(man.x, GROUND - 4);
    sfx('killed');
  }

  function stepWalkers() {
    S.walkers.forEach((w) => { w.x += 1; });
    S.walkers = S.walkers.filter((w) => w.x < DOOR);
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
            S.shots.push({
              x: t.x, y: GROUND - 8, vx: Math.sign(dx || 1) * 1.7, vy: -3.4,
              kind: 'shell', enemy: true, alive: true,
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
          if (S.heli.landed) {
            S.shots.push({ x: j.x, y: sy, vx: 0, vy: 2.2, kind: 'bomb', enemy: true, alive: true });
          } else {
            const dx = S.heli.x - j.x;
            const dy = (GROUND - S.heli.alt - 6) - sy;
            const len = Math.hypot(dx, dy) || 1;
            S.shots.push({
              x: j.x, y: sy, vx: (dx / len) * 3.4, vy: (dy / len) * 3.4,
              kind: 'missile', enemy: true, alive: true,
            });
          }
          sfx('noise');
        }
        if (j.timer > 36) j.alive = false;
      }
      if (j.x < 300 || j.x > 5300) j.alive = false;
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
          x: d.x, y: GROUND - d.alt, vx: 0, vy: 2.4, kind: 'shell', enemy: true, alive: true,
        });
      }
      if (S.heli.alive && S.heli.mercy <= 0 && Math.abs(d.x - S.heli.x) < 12 && Math.abs(d.alt - S.heli.alt) < 12) {
        d.alive = false;
        destroyHeli();
      }
      if ((S.frame % 6) === 0) sfx('drone');
    });
    S.drones = S.drones.filter((d) => d.alive);
  }

  function stepShots() {
    S.shots.forEach((s) => {
      if (!s.alive) return;
      s.x += s.vx;
      s.y += s.vy;
      if (s.kind === 'shell' || s.kind === 'bomb') s.vy += 0.38;
      if (s.y >= GROUND - 1) {
        s.alive = false;
        if (s.enemy) groundBlast(s.x, true);
        else if (s.down) groundBlast(s.x, false);
        return;
      }
      if (!s.enemy) {
        if (!s.down && hitBarracks(s)) { s.alive = false; return; }
        if (hitMan(s) || hitAir(s)) { s.alive = false; return; }
      } else if (s.kind === 'missile' && hitHeliBox(s.x, s.y, 8)) {
        s.alive = false;
        destroyHeli();
      }
      if (s.x < 200 || s.x > 5400 || s.y < 10) s.alive = false;
    });
    S.shots = S.shots.filter((s) => s.alive);
    S.hostages = S.hostages.filter((man) => !man.dead);
    S.tanks = S.tanks.filter((t) => t.alive);
    S.jets = S.jets.filter((j) => j.alive);
    S.drones = S.drones.filter((d) => d.alive);
  }

  function hitBarracks(s) {
    if (s.y < GROUND - 22) return false;
    for (let i = 0; i < S.barracks.length; i++) {
      const b = S.barracks[i];
      if (b.open) continue;
      if (Math.abs(s.x - (b.x + 8)) < 18) {
        b.open = true;
        killMenNear(b.x + 8, 10);
        boom(b.x + 8, GROUND - 8);
        sfx('boom');
        return true;
      }
    }
    return false;
  }

  function hitMan(s) {
    if (Math.abs(s.y - (GROUND - 5)) > 8) return false;
    for (let i = 0; i < S.hostages.length; i++) {
      const man = S.hostages[i];
      if (!man.dead && Math.abs(man.x - s.x) <= 4) {
        crush(man);
        return true;
      }
    }
    return false;
  }

  function hitAir(s) {
    for (let i = 0; i < S.jets.length; i++) {
      const j = S.jets[i];
      if (j.alive && Math.hypot(j.x - s.x, (GROUND - j.alt) - s.y) < 9) {
        j.alive = false;
        boom(j.x, GROUND - j.alt);
        sfx('boom');
        return true;
      }
    }
    for (let i = 0; i < S.drones.length; i++) {
      const d = S.drones[i];
      if (d.alive && Math.hypot(d.x - s.x, (GROUND - d.alt) - s.y) < 9) {
        d.alive = false;
        boom(d.x, GROUND - d.alt);
        sfx('boom');
        return true;
      }
    }
    return false;
  }

  function groundBlast(x, enemy) {
    boom(x, GROUND - 2);
    if (enemy) {
      killMenNear(x, 12);
      S.barracks.forEach((b) => {
        if (!b.open && Math.abs((b.x + 8) - x) < 22) {
          b.open = true;
          killMenNear(b.x + 8, 10);
        }
      });
      if (hitHeliBox(x, GROUND - 4, 12) && S.heli.alt < 18) destroyHeli();
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

  function hitHeliBox(x, y, r) {
    if (!S.heli.alive || S.heli.mercy > 0) return false;
    const hy = GROUND - S.heli.alt - 6;
    return Math.abs(S.heli.x - x) < r + 8 && Math.abs(hy - y) < r + 4;
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
    S.view = clamp(S.view, VIEW_MIN, VIEW_MAX);
  }

  function scene() {
    if (S.mode === 'end') return 'end';
    if (S.mode === 'play') return 'play';
    return 'title';
  }

  function sxOf(x) { return Math.round(x - S.view); }

  function draw(ctx) {
    ctx.fillStyle = INK.K;
    ctx.fillRect(0, 0, W, H);
    drawStars(ctx);
    drawPlanet(ctx);
    // Hi-res ground bytes are the repeating pair that lights every even column.
    // Unlit columns stay black, which is the stripe in the recomp screenshots.
    for (let y = GROUND; y < H; y++) {
      for (let x = 0; x < W; x += 2) {
        ctx.fillStyle = INK.V;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    if (S.mode !== 'title') {
      drawTerrain(ctx);
      drawFence(ctx);
      drawBase(ctx);
      S.barracks.forEach((b) => drawBarracks(ctx, b));
      S.tanks.forEach((t) => { if (t.alive) blit(ctx, TANK_SPRITE, sxOf(t.x) - 16, GROUND - TANK_SPRITE.length, {}); });
      S.hostages.forEach((man) => drawMan(ctx, man));
      S.walkers.forEach((w) => blit(ctx, MAN_RUN[(S.frame || 0) & 1], sxOf(w.x), GROUND - 6, {}));
      S.jets.forEach((j) => {
        if (!j.alive) return;
        blit(ctx, JET_SPRITE, sxOf(j.x) - 11, GROUND - j.alt - 5, { flip: j.dir < 0 });
      });
      S.drones.forEach((d) => { if (d.alive) drawDrone(ctx, d); });
      if (S.heli.alive || S.pending) drawHeli(ctx, S.heli);
      S.shots.forEach((s) => {
        if (!s.alive) return;
        ctx.fillStyle = s.enemy ? INK.O : INK.W;
        ctx.fillRect(sxOf(s.x), Math.round(s.y), s.kind === 'missile' ? 3 : 2, 2);
      });
      S.booms.forEach((b) => drawBoom(ctx, b));
    }
    drawHud(ctx);
    drawMessages(ctx);
  }

  function drawStars(ctx) {
    S.stars.forEach((star) => {
      if (((star.x * 3 + star.y + (S.frame || S.timer)) & 3) === 0) return;
      ctx.fillStyle = star.c;
      ctx.fillRect(star.x, star.y, 1, 1);
    });
  }

  function drawPlanet(ctx) {
    const cx = 222;
    const cy = 80;
    const r = 11;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r - 2) continue;
        const band = (y + 12) % 4;
        let color = INK.W;
        if (band === 0) color = INK.B;
        else if (band === 1) color = INK.O;
        ctx.fillStyle = color;
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
  }

  function mesaHeight(px) {
    let best = 0;
    for (let i = 0; i < MESAS.length; i++) {
      const start = MESAS[i][0];
      const width = MESAS[i][1];
      const height = MESAS[i][2];
      const end = start + width;
      if (px >= start && px < end) {
        if (height > best) best = height;
        continue;
      }
      const dist = px < start ? start - px : px - end;
      if (dist > 80) continue;
      const steps = Math.ceil(dist / 8);
      const h = height - steps * 12;
      if (h > best) best = h;
    }
    return best;
  }

  function drawTerrain(ctx) {
    const origin = S.view * 0.5;
    for (let x = 0; x < W; x += 2) {
      const hgt = mesaHeight(origin + x);
      if (hgt <= 0) continue;
      ctx.fillStyle = INK.V;
      ctx.fillRect(x, GROUND - hgt, 1, hgt);
    }
  }

  function drawHorizon(ctx) {
    for (let x = 0; x < W; x += 4) {
      ctx.fillStyle = (x & 8) ? INK.W : INK.G;
      ctx.fillRect(x, GROUND, 1, 1);
    }
  }

  function drawFence(ctx) {
    const posts = [
      [0, 16, 22], [18, 12, 16], [34, 9, 12], [48, 7, 9], [60, 5, 7],
    ];
    posts.forEach(([dx, w, hgt], i) => {
      const x = sxOf(FENCE - 10 + dx * 1.6);
      if (x < -20 || x > W + 10) return;
      ctx.fillStyle = INK.W;
      const top = GROUND - Math.floor(hgt * 0.45) + i;
      ctx.fillRect(Math.round(x), top, Math.max(2, Math.round(w / 3)), GROUND - top + 2);
      ctx.fillRect(Math.round(x) - 2, top + 2, Math.max(4, Math.round(w / 2)), 2);
    });
  }

  function drawBase(ctx) {
    const x = sxOf(BASE - 6);
    if (x > W + 30 || x < -160) return;
    ctx.fillStyle = INK.G;
    ctx.fillRect(x, GROUND - 4, 96, 4);
    hiresRun(ctx, x, GROUND - 5, 96);
    const bx = x + 70;
    ctx.fillStyle = INK.O;
    ctx.fillRect(bx, GROUND - 18, 88, 18);
    hiresRun(ctx, bx, GROUND - 20, 88);
    hiresRun(ctx, bx, GROUND - 19, 88);
    ctx.fillStyle = INK.W;
    for (let n = 0; n < 4; n++) ctx.fillRect(bx + 6 + n * 20, GROUND - 12, 12, 4);
    ctx.fillStyle = INK.K;
    ctx.fillRect(bx + 40, GROUND - 12, 8, 12);
    const pole = bx + 80;
    for (let y = GROUND - 36; y < GROUND - 18; y++) {
      ctx.fillStyle = INK.W;
      ctx.fillRect(pole, y, 1, 1);
    }
    const wave = (S.frame & 4) ? 0 : 1;
    ctx.fillStyle = INK.B;
    ctx.fillRect(pole + 1, GROUND - 36 + wave, 4, 4);
    ctx.fillStyle = INK.O;
    ctx.fillRect(pole + 1, GROUND - 32 + wave, 11, 3);
    hiresRun(ctx, pole + 1, GROUND - 29 + wave, 11);
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
    const sprite = man.state === 'wave' ? MAN_WAVE : MAN_RUN[(S.frame + man.id) & 1];
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

  function drawHeli(ctx, h) {
    const mag = Math.abs(h.pose);
    const sprite = mag === 0 ? HELI_FRONT : HELI_SIDE;
    const keep = mag === 0 ? 1 : [0, 0.42, 0.66, 0.86, 1][mag];
    const foot = GROUND - Math.round(h.alt);
    const sh = h.squish ? sprite.length - 1 : sprite.length;
    const top = foot - sh;
    const visualTilt = h.pose < 0 ? -h.tilt : h.tilt;
    blit(ctx, sprite, sxOf(h.x) - Math.round((sprite[0].length * keep) / 2), top, {
      flip: h.pose < 0, tilt: visualTilt, keep, squish: h.squish,
    });
    if (!h.landed) {
      const rw = mag === 0 ? 10 : 22;
      const ry = top - 2;
      for (let i = -rw; i <= rw; i++) {
        if (((i + S.frame) % 3) === 0) continue;
        ctx.fillStyle = INK.W;
        ctx.fillRect(sxOf(h.x) + i, ry, 1, 1);
      }
    }
  }

  function plotWhite(ctx, x, y) {
    ctx.fillStyle = INK.W;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function hiresRun(ctx, x, y, w) {
    x = Math.round(x);
    y = Math.round(y);
    if (w <= 0) return;
    ctx.fillStyle = (x & 1) ? INK.V : INK.G;
    ctx.fillRect(x - 1, y, 1, 1);
    ctx.fillStyle = ((x + w) & 1) ? INK.O : INK.B;
    ctx.fillRect(x + w, y, 1, 1);
    ctx.fillStyle = INK.W;
    ctx.fillRect(x, y, w, 1);
  }

  function blit(ctx, sprite, x, y, opt) {
    const flip = !!opt.flip;
    const tilt = opt.tilt || 0;
    const keep = opt.keep == null ? 1 : opt.keep;
    const h = sprite.length;
    const w = sprite[0].length;
    const dw = Math.max(1, Math.round(w * keep));
    for (let row = 0; row < h; row++) {
      if (opt.squish && row === 4) continue;
      const shear = Math.round((h - 1 - row) * tilt * -0.42);
      const src = sprite[row];
      const dy = y + row - (opt.squish && row > 4 ? 1 : 0);
      for (let col = 0; col < dw; col++) {
        const sample = clamp(Math.round(col / keep), 0, w - 1);
        const si = flip ? w - 1 - sample : sample;
        const ch = src[si];
        if (!ch || ch === '.' || ch === ' ') continue;
        const px = Math.round(x + col + shear);
        if (ch === 'W') {
          const left = si > 0 ? src[si - 1] : '.';
          const right = si < w - 1 ? src[si + 1] : '.';
          if (!left || left === '.' || left === ' ') {
            ctx.fillStyle = (px & 1) ? INK.V : INK.G;
            ctx.fillRect(px - 1, dy, 1, 1);
          }
          if (!right || right === '.' || right === ' ') {
            ctx.fillStyle = (px & 1) ? INK.O : INK.B;
            ctx.fillRect(px + 1, dy, 1, 1);
          }
          ctx.fillStyle = INK.W;
        } else {
          ctx.fillStyle = INK[ch] || INK.W;
        }
        ctx.fillRect(px, dy, 1, 1);
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
    if (S.mode === 'title') drawRainbowHud(ctx);
    else drawVioletHud(ctx);
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

  function drawVioletHud(ctx) {
    for (let y = 2; y <= 24; y++) {
      for (let x = 0; x < W; x += 2) {
        ctx.fillStyle = INK.V;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    for (let y = 2; y <= 7; y++) {
      const n = 8 - y;
      ctx.fillStyle = INK.B;
      for (let i = 0; i < n; i++) {
        ctx.fillRect(2 + i * 2, y, 1, 1);
        ctx.fillRect(W - 4 - i * 2, y, 1, 1);
      }
    }
  }

  function lemon(ctx, cx, color, value) {
    const rows = [2, 4, 6, 8, 8, 6, 4, 2];
    ctx.fillStyle = color;
    for (let i = 0; i < rows.length; i++) {
      ctx.fillRect(cx - rows[i], 12 + i, rows[i] * 2, 1);
    }
    const text = String(clamp(value, 0, 99)).padStart(2, '0');
    drawDigits(ctx, text, cx - 7, 13);
  }

  function drawDigits(ctx, text, x, y) {
    for (let i = 0; i < text.length; i++) {
      const rows = DIGIT[text[i]] || DIGIT[0];
      rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] === '1') plotWhite(ctx, x + i * 8 + rx, y + ry);
        }
      });
    }
  }

  function drawMessages(ctx) {
    if (S.mode === 'title') {
      textCenter(ctx, 'BRODERBUND SOFTWARE PRESENTS...', 36, INK.W, 1);
      logo(ctx, 58);
      textCenter(ctx, 'DAN GORLIN', 112, INK.W, 1);
      textCenter(ctx, 'COPYRIGHT 1982', 122, INK.W, 1);
      textCenter(ctx, 'INDEPENDENT TRIBUTE', 136, INK.G, 1);
      textCenter(ctx, 'ARROWS  Z TURN  SPACE FIRE', 150, INK.O, 1);
      return;
    }
    if (S.mode === 'attract') {
      textCenter(ctx, 'YOUR MISSION:', 58, INK.W, 1);
      barText(ctx, 'RESCUE HOSTAGES', 70);
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
    ctx.fillStyle = INK.O;
    ctx.fillRect(x - 4, y - 3, width + 8, 3);
    ctx.fillRect(x - 4, y + 7 * scale, width + 8, 3);
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
      x: BARRACKS_X[1], y: GROUND - 6, vx: 8, vy: 0, kind: 'bullet', enemy: false, down: false, alive: true,
    }];
    stepShots();
    expect(S.tanks.length === 1 && S.tanks[0].alive, 'a side-on shot does not destroy a tank');
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

    return { ok: failures.length === 0, failures, passed: failures.length === 0 };
  }

  function debugSetup(name) {
    S.quiet = true;
    S.frozen = true;
    if (name === 'title') { showTitle(); return; }
    beginPlay();
    S.quiet = true;
    S.banner = 0;
    if (name === 'fly') {
      S.heli.landed = false;
      S.heli.alt = 48;
      S.heli.tilt = -4;
      S.heli.pose = -4;
      S.heli.vx256 = -10 * 256;
      S.heli.x = START_X - 120;
      S.heli.tilt = -3;
      S.view = clamp(S.heli.x - 36, VIEW_MIN, VIEW_MAX);
      S.tanks = [{ x: S.heli.x + 70, dir: -1, think: 40, alive: true }];
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
    boot, frame, update, draw, scene, selfTest, debugSetup, state: S,
    GROUND, BASE, BARRACKS_X,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
