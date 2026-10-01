import * as THREE from 'three';
import { COL, lineMat, starfield, shatterBurst, updateShatter, moonWire, trenchFrame, flakTower, diamondPylon, craterFloor, tracerBolt, tracerTrail, updateTrail, laserBolt, updateLaser } from '../render/vector.js';
import { BUILDERS } from '../ships/catalog.js';
import AudioFX from '../audio.js';
import Scores from '../scores.js';

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
    kick: 0,
  };

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();

  function hi() {
    return Scores.best();
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
      for (let i = 0; i < 10; i++) {
        const floor = craterFloor();
        floor.position.set(0, -9, -i * 48);
        state.env.add(floor);
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

  function liveFighters() {
    return state.enemies.filter((e) => !e.dead && !e.turret && !e.ally && !e.boss).length;
  }

  function worldPos(e, out) {
    e.mesh.getWorldPosition(out);
    return out;
  }

  function spawnEnemy(kind, x, y, z, extra = {}) {
    const isFighter = kind !== 'tower' && kind !== 'diamond' && !extra.turret && !extra.ally && !extra.boss;
    if (isFighter && liveFighters() >= 16) return null;
    const mesh = kind === 'tower'
      ? flakTower()
      : kind === 'diamond'
        ? diamondPylon()
        : (BUILDERS[kind] || BUILDERS.nachtschwalbe)();
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(extra.scale || 1);
    const parent = extra.parent || scene;
    parent.add(mesh);
    const e = {
      kind,
      mesh,
      hp: extra.hp ?? (kind === 'wuerger' || kind === 'silbergeist' ? 3 : kind === 'stuka' ? 2 : kind === 'tower' || kind === 'diamond' ? 4 : kind === 'mondsichel' ? 42 : 1),
      r: extra.r ?? (kind === 'mondsichel' ? 3.4 : kind === 'tower' || kind === 'diamond' ? 2.2 : 1.3),
      score: extra.score ?? (kind === 'mondsichel' ? 5000 : kind === 'tower' || kind === 'diamond' ? 400 : kind === 'stuka' ? 350 : kind === 'silbergeist' ? 500 : 200),
      vx: extra.vx || 0,
      vy: extra.vy || 0,
      vz: extra.vz ?? 28,
      phase: Math.random() * 6,
      shootCd: 0.35 + Math.random() * 0.4,
      dive: extra.dive || false,
      turret: extra.turret || false,
      anchored: extra.anchored || false,
      dual: extra.dual || kind === 'diamond',
      mode: extra.mode || (extra.ally ? 'ally' : extra.turret ? 'turret' : extra.boss ? 'boss' : extra.dive ? 'dive' : 'inbound'),
      passes: extra.passes ?? (kind === 'wuerger' || kind === 'silbergeist' ? 2 : 1),
      breakT: 0,
      breakSign: Math.sign(x) || (Math.random() < 0.5 ? 1 : -1),
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
      if (beat('n1', 1.0)) {
        spawnEnemy('nachtschwalbe', -6, 3, -90);
        spawnEnemy('nachtschwalbe', 7, -2, -100);
        spawnEnemy('nachtschwalbe', 0, 5, -108);
      }
      if (beat('w1', 3.8)) spawnEnemy('wuerger', 0, 2, -110, { vz: 22 });
      if (beat('n2', 6.2)) {
        spawnEnemy('nachtschwalbe', -10, 4, -95);
        spawnEnemy('nachtschwalbe', 10, 4, -95);
        spawnEnemy('nachtschwalbe', 0, -3, -105);
        spawnEnemy('nachtschwalbe', -4, 1, -112);
      }
      if (beat('w2', 9.5)) spawnEnemy('wuerger', -8, 0, -100, { vz: 20 });
      if (beat('w3', 10.2)) spawnEnemy('wuerger', 8, 1, -108, { vz: 20 });
      if (beat('n2b', 13.5)) {
        spawnEnemy('nachtschwalbe', -7, -2, -90);
        spawnEnemy('nachtschwalbe', 6, 3, -98);
      }
      if (beat('n3', 17)) {
        for (let i = 0; i < 5; i++) spawnEnemy('nachtschwalbe', (i - 2) * 5, Math.sin(i) * 3, -90 - i * 6);
      }
      if (beat('w4', 21)) {
        spawnEnemy('wuerger', -5, 2, -100, { vz: 24 });
        spawnEnemy('nachtschwalbe', 9, -1, -92);
      }
      if (beat('sg1', 25)) spawnEnemy('silbergeist', 4, 5, -120, { vz: 32, hp: 4, score: 600 });
      if (beat('n4', 29)) {
        spawnEnemy('wuerger', -6, -2, -100);
        spawnEnemy('nachtschwalbe', 8, 3, -90);
        spawnEnemy('nachtschwalbe', -2, 4, -95);
        spawnEnemy('nachtschwalbe', 3, -3, -102);
      }
      if (beat('n5', 35)) {
        spawnEnemy('nachtschwalbe', -8, 2, -90);
        spawnEnemy('wuerger', 5, 0, -105);
      }
    }
    if (s === 1) {
      if (beat('battery', 0.15)) {
        const deck = [
          [-12, -9, -48],
          [12, -9, -52],
          [-6, -9, -88],
          [6, -9, -92],
          [0, -9, -128],
          [-14, -9, -162],
          [14, -9, -166],
          [0, -9, -200],
        ];
        for (const [x, y, z] of deck) {
          spawnEnemy('tower', x, y, z, { turret: true, hp: 4, r: 2.4 });
        }
      }
      for (const at of [4.5, 12, 20, 28]) {
        if (beat('st' + at, at)) {
          spawnEnemy('stuka', at % 10 < 6 ? -8 : 8, 10, -80, { dive: true, vz: 16, vy: -6 });
          AudioFX.siren();
        }
      }
      for (const at of [7, 11, 16, 23, 31]) {
        if (beat('n' + at, at)) {
          spawnEnemy('nachtschwalbe', at % 3 === 0 ? -9 : 8, 3, -90);
          spawnEnemy('nachtschwalbe', at % 3 === 0 ? 6 : -5, -1, -102);
        }
      }
      if (beat('sg2', 18)) spawnEnemy('silbergeist', -5, 2, -110, { vz: 30, hp: 4 });
      if (beat('w5', 26)) spawnEnemy('wuerger', 4, 1, -100);
    }
    if (s === 2) {
      if (beat('walls', 0.2)) {
        const zs = [-40, -80, -120, -160, -210];
        for (const z of zs) {
          spawnEnemy('tower', -8.0, -2.2, z, { turret: true, hp: 3, r: 1.6 });
          spawnEnemy('tower', 8.0, -2.2, z - 6, { turret: true, hp: 3, r: 1.6 });
        }
        spawnEnemy('diamond', 0, 0, -70, { turret: true, dual: true, hp: 5, r: 2.4 });
        spawnEnemy('diamond', 0, 0, -150, { turret: true, dual: true, hp: 5, r: 2.4 });
      }
      if (beat('tn1', 4)) {
        spawnEnemy('nachtschwalbe', -3, 2, -80, { vz: 32 });
        spawnEnemy('nachtschwalbe', 4, -1, -88, { vz: 32 });
      }
      if (beat('tn2', 10)) spawnEnemy('wuerger', 0, 2, -90, { vz: 28 });
      if (beat('tn3', 16)) {
        spawnEnemy('nachtschwalbe', -5, 1, -80, { vz: 34 });
        spawnEnemy('nachtschwalbe', 6, 3, -86, { vz: 34 });
      }
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
    const origin = camera.position.clone().add(dir.clone().multiplyScalar(1.35));
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
    origin.addScaledVector(down, 0.28);
    const mesh = tracerBolt(dir, { ally: true, twin: true });
    mesh.position.copy(origin);
    scene.add(mesh);
    const trail = tracerTrail(COL.ally);
    scene.add(trail);
    state.bullets.push({
      mesh,
      trail,
      hist: [origin.clone()],
      vel: dir.multiplyScalar(170),
      life: 1.15,
    });
    state.kick = 0.14;
    AudioFX.shoot();
  }

  function enemyShoot(e, offset) {
    worldPos(e, tmp2);
    if (offset) tmp2.add(offset);
    tmp.copy(camera.position).sub(tmp2).normalize();
    const mesh = laserBolt(tmp, { heavy: !!(e.turret || e.boss) });
    mesh.position.copy(tmp2);
    scene.add(mesh);
    const speed = e.boss ? 50 : e.turret ? 36 : 44;
    state.ebullets.push({
      mesh,
      laser: true,
      vel: tmp.multiplyScalar(speed),
      life: 2.6,
    });
  }

  function dropBolt(b) {
    scene.remove(b.mesh);
    if (b.trail) scene.remove(b.trail);
  }

  function setPaused(on) {
    state.paused = !!on;
    const el = document.getElementById('pause');
    if (el) el.classList.toggle('hidden', !state.paused);
    if (state.paused) {
      const bannerEl = document.getElementById('banner');
      if (bannerEl) bannerEl.classList.add('hidden');
    }
  }

  function killEnemy(e) {
    const burst = shatterBurst(e.kind === 'tower' || e.kind === 'diamond' ? COL.magenta : COL.axis);
    worldPos(e, tmp);
    burst.position.copy(tmp);
    scene.add(burst);
    state.fx.push(burst);
    if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
    else scene.remove(e.mesh);
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
    const posted = Scores.submit({ score: state.score, stage: state.stage, won });
    document.body.classList.remove('playing');
    setPaused(false);
    const end = document.getElementById('end');
    end.classList.remove('hidden');
    document.getElementById('end-kicker').textContent = won ? 'MISSION REPORT' : 'VOIDCAT LOST';
    document.getElementById('end-title').textContent = won ? 'FESTUNG SELENE FALLS' : 'THE ROD STILL LIVES';
    document.getElementById('end-body').textContent = won
      ? 'Pacific Void Command confirms core kill. The Pacific stays blue. Come home, Hellcat.'
      : 'Schrödinger still burns. Pacific Void Command will re-arm the next catapult.';
    const rank = posted.rank && posted.rank <= 10 ? `   RANK ${posted.rank}` : '';
    document.getElementById('end-score').textContent = `SCORE ${pad(state.score)}   HI ${pad(posted.best)}${rank}`;
    Scores.render(document.getElementById('end-table'), posted.row.t);
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
    for (const e of state.enemies) {
      if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
      else scene.remove(e.mesh);
    }
    for (const b of state.bullets) dropBolt(b);
    for (const b of state.ebullets) dropBolt(b);
    state.enemies = [];
    state.bullets = [];
    state.ebullets = [];
    buildEnv(STAGES[state.stage].bg);
    banner(STAGES[state.stage].name, 2000);
    hud();
  }

  function enter() {
    for (const e of state.enemies) {
      if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
      else scene.remove(e.mesh);
    }
    for (const b of state.bullets) dropBolt(b);
    for (const b of state.ebullets) dropBolt(b);
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
      kick: 0,
    });
    setPaused(false);
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
    if (input.pause) setPaused(!state.paused);
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

    state.px = THREE.MathUtils.clamp(state.px + input.aimX * 36 * dt, -16, 16);
    state.py = THREE.MathUtils.clamp(state.py + input.aimY * 28 * dt, -10, 10);
    const targetRoll = -input.aimX * 0.45 + (state.rollT > 0 ? Math.sin((1 - state.rollT / 0.55) * Math.PI * 2) * Math.PI * 2 : 0);
    state.roll += (targetRoll - state.roll) * Math.min(1, dt * 6);

    state.kick = Math.max(0, state.kick - dt * 2.6);
    camera.position.set(state.px * 0.15, state.py * 0.15 + 0.4, state.kick * 0.45);
    const lookX = state.px + input.aimX * 18;
    const lookY = state.py + input.aimY * 14;
    camera.lookAt(lookX, lookY, -40);
    camera.rotation.z = state.roll * (state.rollT > 0 ? 1 : 1);
    camera.fov = 62 + state.boost * 8;
    camera.updateProjectionMatrix();

    if (state.stars) {
      state.stars.position.z += speed * dt * 1.6;
      if (state.stars.position.z > 40) state.stars.position.z = 0;
    }
    if (STAGES[state.stage].bg === 'trench') {
      state.env.position.z += speed * dt;
      if (state.env.position.z > 28) state.env.position.z = 0;
    } else if (STAGES[state.stage].bg === 'surface') {
      state.env.position.z += speed * dt;
      if (state.env.position.z > 48) state.env.position.z = 0;
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
        if (!e.anchored) e.mesh.position.z += speed * dt;
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
      } else if (e.mode === 'break') {
        e.breakT += dt;
        const u = Math.min(1, e.breakT / 0.85);
        e.mesh.position.x += e.breakSign * 11 * dt;
        e.mesh.position.y += (1 - u) * 9 * dt;
        e.mesh.position.z += THREE.MathUtils.lerp(Math.abs(e.vz), -Math.abs(e.vz), u) * dt;
        e.mesh.rotation.z = e.breakSign * u * Math.PI;
        e.mesh.rotation.x = u * 0.5;
        e.mesh.rotation.y = u * Math.PI;
        if (u >= 1) {
          e.mode = 'reattack';
          e.vz = -Math.abs(e.vz);
          e.passes -= 1;
        }
      } else if (e.mode === 'egress') {
        e.mesh.position.z += Math.abs(e.vz) * 1.2 * dt;
        e.mesh.position.x += e.breakSign * 8 * dt;
        e.mesh.rotation.z = e.breakSign * 0.5;
      } else {
        e.mesh.position.z += e.vz * dt;
        e.mesh.position.x += Math.sin(e.phase * 2.2) * (e.dive ? 1 : 6) * dt + e.vx * dt;
        e.mesh.position.y += e.vy * dt + Math.cos(e.phase * 1.4) * 2 * dt;
        if (e.dive && e.mesh.position.y < -6) e.vy = 4;
        if (e.mode === 'reattack') {
          e.mesh.lookAt(camera.position);
          e.mesh.rotateY(Math.PI);
          if (e.mesh.position.z < -58) {
            e.mode = 'inbound';
            e.vz = Math.abs(e.vz);
          }
        } else {
          e.mesh.lookAt(camera.position);
          e.mesh.rotateY(Math.PI);
          if (!e.dive && e.mesh.position.z > -5) {
            if (e.passes > 0) {
              e.mode = 'break';
              e.breakT = 0;
            } else {
              e.mode = 'egress';
            }
          }
        }
      }
      e.shootCd -= dt;
      worldPos(e, tmp);
      const z = tmp.z;
      const canShoot = !e.ally && e.mode !== 'break' && e.mode !== 'egress' && z > -95 && z < 4;
      if (canShoot && e.shootCd <= 0) {
        if (e.dual) {
          enemyShoot(e, new THREE.Vector3(0, 3.8, 0));
          enemyShoot(e, new THREE.Vector3(0, -3.8, 0));
        } else {
          enemyShoot(e);
        }
        const base = e.boss ? 0.32 : e.turret ? 0.8 : (e.kind === 'wuerger' || e.kind === 'silbergeist' ? 0.48 : 0.68);
        e.shootCd = base + Math.random() * 0.22;
      }
    }

    function stepBolt(b, maxHist) {
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.laser) {
        updateLaser(b.mesh, b.mesh.position.distanceTo(camera.position));
      } else if (b.hist) {
        b.hist.push(b.mesh.position.clone());
        if (b.hist.length > maxHist) b.hist.shift();
        if (b.trail) updateTrail(b.trail, b.hist);
      }
    }

    // player bullets
    for (const b of state.bullets) {
      stepBolt(b, 10);
      for (const e of state.enemies) {
        if (e.dead || e.ally) continue;
        worldPos(e, tmp);
        if (b.mesh.position.distanceTo(tmp) < e.r + 0.75) {
          b.life = 0;
          e.hp -= 1;
          AudioFX.hit();
          if (e.hp <= 0) killEnemy(e);
        }
      }
    }

    // enemy bullets
    for (const b of state.ebullets) {
      stepBolt(b, 8);
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
      worldPos(e, tmp);
      if (tmp.distanceTo(tmp2) < e.r * 0.7) {
        killEnemy(e);
        playerHit();
      }
    }

    state.bullets = state.bullets.filter((b) => {
      if (b.life <= 0 || b.mesh.position.z < -220) {
        dropBolt(b);
        return false;
      }
      return true;
    });
    state.ebullets = state.ebullets.filter((b) => {
      if (b.life <= 0) {
        dropBolt(b);
        return false;
      }
      return true;
    });
    state.enemies = state.enemies.filter((e) => {
      if (e.dead) return false;
      worldPos(e, tmp);
      const gone = e.anchored ? tmp.z > 14 : (e.mode === 'reattack' ? tmp.z > 20 : tmp.z > 10);
      if (gone || tmp.z < -220) {
        if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
        else scene.remove(e.mesh);
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

  return { enter, update, dispose, hi, STAGES, setPaused };
}
