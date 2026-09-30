import * as THREE from 'three';
import { COL, lineMat, starfield, shatterBurst, updateShatter, moonWire, trenchFrame, flakTower } from '../render/vector.js';
import { BUILDERS } from '../ships/catalog.js';
import AudioFX from '../audio.js';

const HI_KEY = 'moon-axis-hiscore';

const STAGES = [
  {
    name: 'STAGE 1  CISLUNAR',
    briefKicker: 'SORTIE 1 OF 3',
    briefTitle: 'CISLUNAR SCRAMBLE',
    briefBody: 'Nachtschwalbe flight inbound from the dark side. Clear a path to Selene.',
    length: 42,
    bg: 'space',
  },
  {
    name: 'STAGE 2  SCHRÖDINGER',
    briefKicker: 'SORTIE 2 OF 3',
    briefTitle: 'SCHRÖDINGER SURFACE',
    briefBody: 'Flak towers ring the crater. Stuka-Selene dive on the rail. Stay low, stay mean.',
    length: 40,
    bg: 'surface',
  },
  {
    name: 'STAGE 3  FESTUNG SELENE',
    briefKicker: 'SORTIE 3 OF 3',
    briefTitle: 'TRENCH RUN',
    briefBody: 'The Mondsichel guards the core. Thread the trench. Kill the rod.',
    length: 48,
    bg: 'trench',
  },
];

function pad(n) {
  return String(Math.max(0, n | 0)).padStart(6, '0');
}

export default function createPlay(ctx) {
  const { scene, camera, renderer } = ctx;

  const state = {
    running: false,
    paused: false,
    t: 0,
    stage: 0,
    stageT: 0,
    score: 0,
    lives: 3,
    shields: 3,
    invuln: 0,
    rollT: 0,
    fireCd: 0,
    spawnFlags: new Set(),
    px: 0,
    py: 0,
    roll: 0,
    boost: 0,
    look: new THREE.Vector3(),
    enemies: [],
    bullets: [],
    ebullets: [],
    fx: [],
    env: new THREE.Group(),
    stars: null,
    guns: new THREE.Group(),
    noHit: true,
    boss: null,
    over: null,
  };

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function hi() {
    return Number(localStorage.getItem(HI_KEY) || 0);
  }
  function saveHi() {
    const h = Math.max(hi(), state.score);
    localStorage.setItem(HI_KEY, String(h));
    return h;
  }

  function hud() {
    document.getElementById('hud-score').textContent = `SCORE ${pad(state.score)}`;
    document.getElementById('hud-hi').textContent = `HI ${pad(hi())}`;
    document.getElementById('hud-stage').textContent = STAGES[state.stage].name;
    document.getElementById('hud-shields').textContent = `SHIELDS ${'█'.repeat(state.shields)}${'░'.repeat(3 - state.shields)}`;
    document.getElementById('hud-lives').textContent = `VOIDCAT × ${state.lives}`;
  }

  function banner(text, ms = 1600) {
    const el = document.getElementById('banner');
    document.getElementById('banner-text').textContent = text;
    el.classList.remove('hidden');
    AudioFX.banner();
    clearTimeout(banner._t);
    banner._t = setTimeout(() => el.classList.add('hidden'), ms);
  }

  function clearGroup(g) {
    while (g.children.length) {
      const c = g.children.pop();
      if (c.geometry) c.geometry.dispose();
    }
  }

  function buildEnv(kind) {
    scene.remove(state.env);
    state.env = new THREE.Group();
    if (state.stars) scene.remove(state.stars);
    state.stars = starfield(kind === 'trench' ? 400 : 900);
    scene.add(state.stars);

    if (kind === 'surface') {
      state.env.add(moonWire());
      for (let i = 0; i < 18; i++) {
        const cr = trenchFrame(6 + Math.random() * 10, 0.2, 6);
        cr.rotation.x = Math.PI / 2;
        cr.position.set((Math.random() - 0.5) * 80, -18 - Math.random() * 6, -40 - i * 22);
        state.env.add(cr);
      }
    }
    if (kind === 'trench') {
      for (let i = 0; i < 28; i++) {
        const f = trenchFrame(16, 10, 10);
        f.position.z = -i * 14;
        state.env.add(f);
      }
    }
    scene.add(state.env);
  }

  function addGuns() {
    if (state.guns && state.guns.parent) state.guns.parent.remove(state.guns);
    state.guns = new THREE.Group();
    const mat = lineMat(COL.ally, 0.85);
    const mk = (x) => {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -0.9, -0.4),
        new THREE.Vector3(x * 0.4, -0.35, -1.6),
      ]);
      return new THREE.Line(g, mat);
    };
    state.guns.add(mk(-1.1), mk(1.1));
    const rail = lineMat(COL.ally, 0.28);
    const dash = (pts) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
      return new THREE.Line(g, rail);
    };
    state.guns.add(
      dash([[-1.6, -1.05, -1.35], [-0.35, -0.82, -1.75], [0.35, -0.82, -1.75], [1.6, -1.05, -1.35]]),
      dash([[-1.7, 0.85, -1.4], [-0.45, 1.0, -1.8]]),
      dash([[1.7, 0.85, -1.4], [0.45, 1.0, -1.8]]),
    );
    camera.add(state.guns);
  }

  function spawnEnemy(kind, x, y, z, extra = {}) {
    const mesh = kind === 'tower'
      ? flakTower()
      : (BUILDERS[kind] || BUILDERS.nachtschwalbe)();
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(extra.scale || 1);
    scene.add(mesh);
    const e = {
      kind,
      mesh,
      hp: extra.hp ?? (kind === 'wuerger' || kind === 'silbergeist' ? 3 : kind === 'stuka' ? 2 : kind === 'tower' ? 4 : kind === 'mondsichel' ? 42 : 1),
      r: extra.r ?? (kind === 'mondsichel' ? 3.4 : kind === 'tower' ? 2.2 : 1.3),
      score: extra.score ?? (kind === 'mondsichel' ? 5000 : kind === 'tower' ? 400 : kind === 'stuka' ? 350 : kind === 'silbergeist' ? 500 : 200),
      vx: extra.vx || 0,
      vy: extra.vy || 0,
      vz: extra.vz ?? 28,
      phase: Math.random() * 6,
      shootCd: 0.6 + Math.random(),
      dive: extra.dive || false,
      turret: extra.turret || false,
      boss: extra.boss || false,
      ...extra,
    };
    state.enemies.push(e);
    if (e.boss) state.boss = e;
    return e;
  }

  function scriptSpawns() {
    if (state.awaitingExit) return;
    const t = state.stageT;
    const s = state.stage;
    const beat = (id, at) => {
      if (state.spawnFlags.has(id) || t < at) return false;
      state.spawnFlags.add(id);
      return true;
    };

    if (s === 0) {
      if (beat('sf', 0.35)) {
        spawnEnemy('starfork', -5.5, -1.4, -20, { vz: 3.2, ally: true, hp: 8, score: 0, r: 1.4 });
        spawnEnemy('starfork', 5.8, -1.1, -24, { vz: 3.2, ally: true, hp: 8, score: 0, r: 1.4 });
      }
      if (beat('n1', 1.2)) {
        spawnEnemy('nachtschwalbe', -6, 3, -90);
        spawnEnemy('nachtschwalbe', 7, -2, -100);
      }
      if (beat('w1', 4.5)) spawnEnemy('wuerger', 0, 2, -110, { vz: 22 });
      if (beat('n2', 7)) {
        spawnEnemy('nachtschwalbe', -10, 4, -95);
        spawnEnemy('nachtschwalbe', 10, 4, -95);
        spawnEnemy('nachtschwalbe', 0, -3, -105);
      }
      if (beat('w2', 12)) spawnEnemy('wuerger', -8, 0, -100, { vz: 20 });
      if (beat('w3', 12.4)) spawnEnemy('wuerger', 8, 1, -108, { vz: 20 });
      if (beat('n3', 18)) {
        for (let i = 0; i < 5; i++) spawnEnemy('nachtschwalbe', (i - 2) * 5, Math.sin(i) * 3, -90 - i * 6);
      }
      if (beat('sg1', 26)) spawnEnemy('silbergeist', 4, 5, -120, { vz: 32, hp: 4, score: 600 });
      if (beat('n4', 32)) {
        spawnEnemy('wuerger', -6, -2, -100);
        spawnEnemy('nachtschwalbe', 8, 3, -90);
        spawnEnemy('nachtschwalbe', -2, 4, -95);
      }
    }
    if (s === 1) {
      for (const at of [1.5, 8, 16, 24, 32]) {
        if (beat('tw' + at, at)) {
          const x = (Math.random() - 0.5) * 22;
          spawnEnemy('tower', x, -8, -70, { turret: true, hp: 4, r: 2.4 });
        }
      }
      for (const at of [5, 14, 22, 30]) {
        if (beat('st' + at, at)) {
          spawnEnemy('stuka', (Math.random() - 0.5) * 16, 10, -80, { dive: true, vz: 16, vy: -6 });
          AudioFX.siren();
        }
      }
      for (const at of [10, 20, 28]) {
        if (beat('n' + at, at)) spawnEnemy('nachtschwalbe', (Math.random() - 0.5) * 14, 3, -90);
      }
      if (beat('sg2', 18)) spawnEnemy('silbergeist', -5, 2, -110, { vz: 30, hp: 4 });
    }
    if (s === 2) {
      for (const at of [2, 7, 12, 18]) {
        if (beat('tt' + at, at)) {
          spawnEnemy('tower', -8.2, -1.5, -60, { turret: true, hp: 3, r: 1.6 });
          spawnEnemy('tower', 8.2, -1.5, -66, { turret: true, hp: 3, r: 1.6 });
        }
      }
      if (beat('tn1', 5)) spawnEnemy('nachtschwalbe', 0, 2, -80, { vz: 34 });
      if (beat('tn2', 14)) spawnEnemy('nachtschwalbe', 0, 2, -80, { vz: 34 });
      if (beat('boss', 22) && !state.boss) {
        banner('MONDSICHEL');
        spawnEnemy('mondsichel', 0, 1, -70, { boss: true, vz: 8, hp: 42, r: 3.6, scale: 1.35, score: 5000 });
      }
    }
  }

  function lookDir() {
    camera.getWorldDirection(state.look);
    return state.look;
  }

  function fire() {
    const dir = lookDir().clone();
    const origin = camera.position.clone().add(dir.clone().multiplyScalar(1.2));
    origin.x += state.px * 0.02;
    const mat = lineMat(COL.ally, 1);
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      dir.clone().multiplyScalar(2.2),
    ]);
    const mesh = new THREE.Line(geo, mat);
    mesh.position.copy(origin);
    scene.add(mesh);
    state.bullets.push({ mesh, vel: dir.multiplyScalar(160), life: 1.1 });
    AudioFX.shoot();
  }

  function enemyShoot(e) {
    const origin = e.mesh.position.clone();
    tmp.copy(camera.position).sub(origin).normalize();
    const mat = lineMat(COL.axis, 1);
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      tmp.clone().multiplyScalar(1.4),
    ]);
    const mesh = new THREE.Line(geo, mat);
    mesh.position.copy(origin);
    scene.add(mesh);
    const speed = e.boss ? 48 : 38;
    state.ebullets.push({ mesh, vel: tmp.multiplyScalar(speed), life: 2.4 });
  }

  function killEnemy(e) {
    const burst = shatterBurst(e.kind === 'tower' ? COL.magenta : COL.axis);
    burst.position.copy(e.mesh.position);
    scene.add(burst);
    state.fx.push(burst);
    scene.remove(e.mesh);
    e.dead = true;
    state.score += e.score;
    if (e.boss) {
      state.boss = null;
      state.bossKilled = true;
    }
    AudioFX.explosion();
    hud();
  }

  function playerHit() {
    if (state.invuln > 0 || state.rollT > 0) return;
    state.noHit = false;
    state.shields -= 1;
    state.invuln = 1.4;
    AudioFX.damage();
    renderer.domElement.style.filter = 'brightness(2.2) saturate(0.4)';
    setTimeout(() => { renderer.domElement.style.filter = ''; }, 80);
    if (state.shields <= 0) {
      state.lives -= 1;
      state.shields = 3;
      if (state.lives <= 0) {
        finish(false);
        return;
      }
      banner('VOIDCAT DOWN');
    }
    hud();
  }

  function finish(won) {
    state.running = false;
    state.over = { won };
    const h = saveHi();
    document.body.classList.remove('playing');
    const end = document.getElementById('end');
    end.classList.remove('hidden');
    document.getElementById('end-kicker').textContent = won ? 'MISSION REPORT' : 'VOIDCAT LOST';
    document.getElementById('end-title').textContent = won ? 'FESTUNG SELENE FALLS' : 'THE ROD STILL LIVES';
    document.getElementById('end-body').textContent = won
      ? 'Pacific Void Command confirms core kill. The Pacific stays blue. Come home, Hellcat.'
      : 'Schrödinger still burns. Pacific Void Command will re-arm the next catapult.';
    document.getElementById('end-score').textContent = `SCORE ${pad(state.score)}   HI ${pad(h)}`;
    if (won) AudioFX.fanfare();
    else AudioFX.gameOver();
  }

  function nextStage() {
    if (state.noHit) state.score += 1500;
    if (state.stage >= 2) {
      finish(true);
      return;
    }
    state.stage += 1;
    state.stageT = 0;
    state.noHit = true;
    state.boss = null;
    state.bossKilled = false;
    state.awaitingExit = false;
    state.spawnFlags = new Set();
    for (const e of state.enemies) scene.remove(e.mesh);
    for (const b of state.bullets) scene.remove(b.mesh);
    for (const b of state.ebullets) scene.remove(b.mesh);
    state.enemies = [];
    state.bullets = [];
    state.ebullets = [];
    buildEnv(STAGES[state.stage].bg);
    banner(STAGES[state.stage].name, 2000);
    hud();
  }

  function enter() {
    for (const e of state.enemies) scene.remove(e.mesh);
    for (const b of state.bullets) scene.remove(b.mesh);
    for (const b of state.ebullets) scene.remove(b.mesh);
    for (const f of state.fx) scene.remove(f);
    Object.assign(state, {
      running: true,
      paused: false,
      t: 0,
      stage: 0,
      stageT: 0,
      score: 0,
      lives: 3,
      shields: 3,
      invuln: 0,
      rollT: 0,
      fireCd: 0,
      px: 0,
      py: 0,
      roll: 0,
      boost: 0,
      enemies: [],
      bullets: [],
      ebullets: [],
      fx: [],
      boss: null,
      bossKilled: false,
      awaitingExit: false,
      spawnFlags: new Set(),
      over: null,
      noHit: true,
      boostHeld: false,
    });
    document.body.classList.add('playing');
    document.getElementById('end').classList.add('hidden');
    document.getElementById('briefing').classList.add('hidden');
    document.getElementById('title').classList.add('hidden');
    buildEnv('space');
    addGuns();
    if (!scene.children.includes(camera)) scene.add(camera);
    camera.fov = 62;
    camera.updateProjectionMatrix();
    hud();
    banner('CISLUNAR SCRAMBLE');
  }

  function update(dt, input) {
    if (!state.running) return state.over;
    if (input.pause) {
      state.paused = !state.paused;
      banner(state.paused ? 'PAUSED' : 'FIGHT', 700);
    }
    if (state.paused) return null;

    const speed = 22 + (input.boost ? 18 : 0);
    state.boost = input.boost ? Math.min(1, state.boost + dt * 3) : Math.max(0, state.boost - dt * 2);
    if (input.boost && !state.boostHeld) AudioFX.boost();
    state.boostHeld = !!input.boost;

    state.t += dt;
    state.stageT += dt;
    state.invuln = Math.max(0, state.invuln - dt);
    state.fireCd = Math.max(0, state.fireCd - dt);
    if (state.rollT > 0) state.rollT -= dt;
    if (input.roll && state.rollT <= 0) {
      state.rollT = 0.55;
      AudioFX.roll();
    }

    state.px = THREE.MathUtils.clamp(state.px + input.aimX * 22 * dt, -12, 12);
    state.py = THREE.MathUtils.clamp(state.py + input.aimY * 16 * dt, -8, 8);
    const targetRoll = -input.aimX * 0.45 + (state.rollT > 0 ? Math.sin((1 - state.rollT / 0.55) * Math.PI * 2) * Math.PI * 2 : 0);
    state.roll += (targetRoll - state.roll) * Math.min(1, dt * 6);

    camera.position.set(state.px * 0.15, state.py * 0.15 + 0.4, 0);
    const lookX = state.px + input.aimX * 10;
    const lookY = state.py + input.aimY * 8;
    camera.lookAt(lookX, lookY, -40);
    camera.rotation.z = state.roll * (state.rollT > 0 ? 1 : 1);
    camera.fov = 62 + state.boost * 8;
    camera.updateProjectionMatrix();

    if (state.stars) {
      state.stars.position.z += speed * dt * 1.6;
      if (state.stars.position.z > 40) state.stars.position.z = 0;
    }
    if (STAGES[state.stage].bg === 'trench' || STAGES[state.stage].bg === 'surface') {
      state.env.position.z += speed * dt;
      if (state.env.position.z > 28) state.env.position.z = 0;
    }

    scriptSpawns();

    if (input.fire && state.fireCd <= 0) {
      fire();
      state.fireCd = input.boost ? 0.08 : 0.12;
    }

    // enemies
    for (const e of state.enemies) {
      e.phase += dt;
      if (e.turret) {
        e.mesh.position.z += speed * dt;
        e.mesh.rotation.y += dt * 0.8;
      } else if (e.boss) {
        e.mesh.position.x = Math.sin(state.t * 0.6) * 6;
        e.mesh.position.y = 1 + Math.sin(state.t * 0.9) * 2;
        e.mesh.position.z += ( -55 - e.mesh.position.z) * dt * 0.4;
        e.mesh.rotation.y = Math.sin(state.t) * 0.2;
      } else if (e.ally) {
        e.mesh.position.z += e.vz * dt;
        e.mesh.rotation.y = Math.PI;
        e.mesh.rotation.z = Math.sin(state.t * 2 + e.phase) * 0.12;
      } else {
        e.mesh.position.z += e.vz * dt;
        e.mesh.position.x += Math.sin(e.phase * 2.2) * (e.dive ? 1 : 6) * dt + e.vx * dt;
        e.mesh.position.y += e.vy * dt + Math.cos(e.phase * 1.4) * 2 * dt;
        if (e.dive && e.mesh.position.y < -6) e.vy = 4;
        e.mesh.lookAt(camera.position);
        e.mesh.rotateY(Math.PI);
      }
      e.shootCd -= dt;
      if (!e.ally && e.shootCd <= 0 && e.mesh.position.z > -70 && e.mesh.position.z < -8) {
        enemyShoot(e);
        e.shootCd = e.boss ? 0.35 : e.turret ? 1.1 : 1.4 + Math.random();
      }
    }

    // player bullets
    for (const b of state.bullets) {
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      for (const e of state.enemies) {
        if (e.dead || e.ally) continue;
        if (b.mesh.position.distanceTo(e.mesh.position) < e.r + 0.6) {
          b.life = 0;
          e.hp -= 1;
          AudioFX.hit();
          if (e.hp <= 0) killEnemy(e);
        }
      }
    }

    // enemy bullets
    for (const b of state.ebullets) {
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      tmp.copy(b.mesh.position);
      tmp2.set(state.px * 0.15, state.py * 0.15 + 0.4, 0);
      if (tmp.distanceTo(tmp2) < 1.15) {
        b.life = 0;
        playerHit();
      }
    }

    // ramming
    for (const e of state.enemies) {
      if (e.dead || e.turret || e.ally) continue;
      tmp2.set(state.px * 0.15, state.py * 0.15 + 0.4, 0);
      if (e.mesh.position.distanceTo(tmp2) < e.r * 0.7) {
        killEnemy(e);
        playerHit();
      }
    }

    state.bullets = state.bullets.filter((b) => {
      if (b.life <= 0 || b.mesh.position.z < -220) {
        scene.remove(b.mesh);
        return false;
      }
      return true;
    });
    state.ebullets = state.ebullets.filter((b) => {
      if (b.life <= 0) {
        scene.remove(b.mesh);
        return false;
      }
      return true;
    });
    state.enemies = state.enemies.filter((e) => {
      if (e.dead) return false;
      if (e.mesh.position.z > 8) {
        scene.remove(e.mesh);
        return false;
      }
      return true;
    });
    state.fx = state.fx.filter((f) => {
      const alive = updateShatter(f, dt);
      if (!alive) scene.remove(f);
      return alive;
    });

    const stage = STAGES[state.stage];
    if (state.bossKilled) {
      state.bossKilled = false;
      state.awaitingExit = true;
      banner('CORE DESTROYED', 1800);
      setTimeout(() => { if (state.running) nextStage(); }, 1600);
    } else if (!state.awaitingExit && state.stageT > stage.length && state.enemies.length === 0 && !state.boss) {
      nextStage();
    }

    const wep = document.getElementById('hud-weapon');
    if (wep) wep.textContent = input.boost ? 'BOOST' : 'HISPANO-X';
    hud();
    return state.over;
  }

  function dispose() {
    document.body.classList.remove('playing');
  }

  return { enter, update, dispose, hi, STAGES };
}
