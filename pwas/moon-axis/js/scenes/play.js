import * as THREE from 'three';
import { COL, lineMat, starfield, shatterBurst, updateShatter, moonWire, trenchFrame, flakTower, diamondPylon, craterFloor, tracerBolt, tracerTrail, updateTrail, laserBolt, updateLaser, railTrack, staffRibs, foundryCore, debrisChunk, fallingPanel, turretOrb } from '../render/vector.js';
import { BUILDERS } from '../ships/catalog.js';
import AudioFX from '../audio.js';
import Vox from '../vox.js';
import Scores from '../scores.js';
import Settings from '../settings.js';

const STAGES = [
  {
    name: 'STAGE 1  CISLUNAR',
    briefKicker: 'SORTIE 1 OF 7',
    briefTitle: 'CISLUNAR SCRAMBLE',
    briefBody: 'Nachtschwalbe flight inbound from the dark side. Clear a path to Selene.',
    length: 42,
    bg: 'space',
    radio: () => ['card_01', 'hale_bark_02', 'cat_launch_03'],
  },
  {
    name: 'STAGE 2  SCHRÖDINGER',
    briefKicker: 'SORTIE 2 OF 7',
    briefTitle: 'SCHRÖDINGER SURFACE',
    briefBody: 'Flak towers ring the crater. Stuka-Selene dive on the rail. Stay low, stay mean.',
    length: 40,
    bg: 'surface',
    radio: () => ['card_02', 'hale_bark_01'],
  },
  {
    name: 'STAGE 3  FESTUNG SELENE',
    briefKicker: 'SORTIE 3 OF 7',
    briefTitle: 'TRENCH RUN',
    briefBody: 'The Mondsichel guards the core. Thread the trench. Kill the rod.',
    length: 48,
    bg: 'trench',
    radio: () => ['card_03', 'hale_bark_01'],
  },
  {
    name: 'STAGE 4  KESSELGRUBE',
    briefKicker: 'SORTIE 4 OF 7',
    briefTitle: 'KESSELGRUBE',
    briefBody: "Selene was the gun, not the hand. Open the yard. Don't answer a channel that goes quiet.",
    length: 50,
    bg: 'yard',
    radio: () => ['card_04', 'hale_bark_04', 'hale_brief_01', 'fork_02', 'cat_launch_05'],
  },
  {
    name: 'STAGE 5  STABZUG',
    briefKicker: 'SORTIE 5 OF 7',
    briefTitle: 'STABZUG',
    briefBody: (s) => (s.forkDead
      ? "Fork's off the board. Stabzug is on the rail. Match speed. Kill the cradle."
      : 'Stabzug is on the rail. Meteor-iron flatcars, a cradle, AA on the tail. Match speed.'),
    length: 52,
    bg: 'rail',
    radio: (s) => (s.forkDead
      ? ['card_05', 'hale_brief_02', 'cat_radio_01']
      : ['card_05', 'hale_bark_05']),
  },
  {
    name: 'STAGE 6  THE STAFF',
    briefKicker: 'SORTIE 6 OF 7',
    briefTitle: 'INSIDE THE STAFF',
    briefBody: (s) => (s.sichelAlive
      ? 'Mouth looks like a crater. It isn\'t. If Sichel is on the channel, do not chase him for sport.'
      : 'Sichel burned over Selene. If something wide comes up the throat, it isn\'t him. Shoot it anyway.'),
    length: 50,
    bg: 'staff',
    radio: (s) => {
      const q = ['card_06', 'rabe_radio_01', 'hale_bark_08', 'rabe_radio_02', 'cat_radio_02'];
      q.push(s.sichelAlive ? 'hale_brief_03' : 'hale_bark_09');
      return q;
    },
  },
  {
    name: 'STAGE 7  THE WELL',
    briefKicker: 'SORTIE 7 OF 7',
    briefTitle: 'OUT OF THE WELL',
    briefBody: 'That was the match. The Staff is the weapon. Burn with it, or fly.',
    length: 56,
    bg: 'escape',
    radio: () => ['card_07', 'hale_bark_06', 'rabe_radio_03', 'cat_radio_03'],
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
    intermission: false,
    interHold: 0,
    t: 0,
    stage: 0,
    stageT: 0,
    score: 0,
    lives: 3,
    shields: 3,
    invuln: 0,
    rollT: 0,
    rollCd: 0,
    boostT: 0,
    boostCd: 0,
    fireCd: 0,
    spawnFlags: new Set(),
    px: 0,
    py: 0,
    roll: 0,
    boost: 0,
    shake: 0,
    hitFlash: 0,
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
    forkDead: false,
    sichelAlive: true,
    sichelEjecting: false,
    ejectAt: 0,
    peelUntil: 0,
    gunLock: 0,
    cinematic: false,
    cineT: 0,
  };

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmp3 = new THREE.Vector3();
  const tmp4 = new THREE.Vector3();
  const tmp5 = new THREE.Vector3();
  const PLAYER_R = 2.35;
  const ROLL_IFRAME = 0.42;
  const ROLL_CD = 0.85;
  const BOOST_BURST = 1.4;
  const BOOST_CD = 3.5;
  const PEEL_WINDOW = 12;

  function segmentHitsSphere(a, b, center, radius) {
    tmp3.copy(b).sub(a);
    const len2 = tmp3.lengthSq();
    if (len2 < 1e-8) return a.distanceToSquared(center) <= radius * radius;
    const t = THREE.MathUtils.clamp(tmp4.copy(center).sub(a).dot(tmp3) / len2, 0, 1);
    tmp4.copy(a).addScaledVector(tmp3, t);
    return tmp4.distanceToSquared(center) <= radius * radius;
  }

  function tintGroup(mesh, hex) {
    mesh.traverse((n) => {
      if (n.material && n.material.color) {
        if (!n.userData._base) n.userData._base = n.material.color.getHex();
        n.material.color.setHex(hex);
      }
    });
  }

  function clearTint(mesh) {
    mesh.traverse((n) => {
      if (n.material && n.material.color && n.userData._base != null) {
        n.material.color.setHex(n.userData._base);
      }
    });
  }

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

  function syncFlags() {
    Vox.setFlags({ forkDead: state.forkDead, sichelAlive: state.sichelAlive });
  }

  function paintBrief(i) {
    const s = STAGES[i];
    document.getElementById('brief-kicker').textContent = s.briefKicker;
    document.getElementById('brief-title').textContent = s.briefTitle;
    const body = typeof s.briefBody === 'function' ? s.briefBody(state) : s.briefBody;
    document.getElementById('brief-body').textContent = body;
    document.getElementById('briefing').classList.remove('hidden');
    document.body.classList.remove('playing');
    syncFlags();
    state.briefReady = false;
    const btn = document.getElementById('btn-brief');
    if (btn) btn.textContent = 'SKIP';
    Vox.live();
    Vox.stopRadio();
    Vox.radio(s.radio(state));
  }

  function openIntermission() {
    if (state.forkDead && state.stage === 4) AudioFX.playCue('fork-dead');
    else AudioFX.stopStage();
    state.intermission = true;
    state.interHold = 0.45;
    state.awaitingExit = false;
    paintBrief(state.stage);
  }

  function fogFor(kind) {
    if (!scene.fog) return;
    if (kind === 'staff') {
      scene.fog.color.setHex(0x1a1204);
      scene.fog.density = 0.018;
    } else if (kind === 'escape') {
      scene.fog.color.setHex(0x2a0c08);
      scene.fog.density = 0.02;
    } else if (kind === 'rail' || kind === 'yard') {
      scene.fog.color.setHex(0x000000);
      scene.fog.density = 0.014;
    } else {
      scene.fog.color.setHex(0x000000);
      scene.fog.density = 0.012;
    }
  }

  function buildEnv(kind) {
    scene.remove(state.env);
    state.env = new THREE.Group();
    if (state.stars) scene.remove(state.stars);
    state.stars = starfield(kind === 'trench' || kind === 'staff' || kind === 'escape' ? 400 : 900);
    scene.add(state.stars);
    fogFor(kind);

    if (kind === 'surface' || kind === 'yard') {
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
    if (kind === 'rail') {
      for (let i = 0; i < 12; i++) {
        const t = railTrack();
        t.position.set(0, -8, -i * 48);
        state.env.add(t);
      }
    }
    if (kind === 'staff' || kind === 'escape') {
      for (let i = 0; i < 24; i++) {
        const f = staffRibs(16, 11, 10);
        f.position.z = -i * 12;
        state.env.add(f);
      }
    }
    if (kind === 'escape') {
      for (let i = 0; i < 28; i++) {
        const d = i % 2 ? fallingPanel() : debrisChunk();
        d.scale.setScalar(1.45 + Math.random() * 0.7);
        d.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 9, -i * 12 - 14);
        state.env.add(d);
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
        new THREE.Vector3(x, -0.28, -0.4),
        new THREE.Vector3(x * 0.4, -0.08, -1.7),
      ]);
      return new THREE.Line(g, mat);
    };
    state.guns.add(mk(-1.05), mk(1.05));
    const rail = lineMat(COL.ally, 0.28);
    const dash = (pts) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
      return new THREE.Line(g, rail);
    };
    state.guns.add(
      dash([[-1.35, -0.42, -1.55], [-0.28, -0.18, -1.85], [0.28, -0.18, -1.85], [1.35, -0.42, -1.55]]),
      dash([[-1.45, 0.42, -1.55], [-0.32, 0.22, -1.85]]),
      dash([[1.45, 0.42, -1.55], [0.32, 0.22, -1.85]]),
    );
    camera.add(state.guns);
  }

  function liveFighters() {
    return state.enemies.filter((e) => !e.dead && !e.turret && !e.ally && !e.boss && !e.debris).length;
  }

  function worldPos(e, out) {
    e.mesh.getWorldPosition(out);
    return out;
  }

  function spawnEnemy(kind, x, y, z, extra = {}) {
    const isFighter = kind !== 'tower' && kind !== 'diamond' && kind !== 'core' && kind !== 'orb' && kind !== 'stabzugCar' && kind !== 'eisenwurm' && !extra.turret && !extra.ally && !extra.boss && !extra.debris;
    if (isFighter && liveFighters() >= 16) return null;
    const mesh = kind === 'tower'
      ? flakTower()
      : kind === 'diamond'
        ? diamondPylon()
        : kind === 'core'
          ? foundryCore()
          : kind === 'orb'
            ? turretOrb()
          : extra.panel
            ? fallingPanel()
          : extra.debris
            ? debrisChunk()
            : (BUILDERS[kind] || BUILDERS.nachtschwalbe)();
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(extra.scale || 1);
    const parent = extra.parent || scene;
    parent.add(mesh);
    const e = {
      kind,
      mesh,
      hp: extra.hp ?? (
        kind === 'eisenwurm' || kind === 'core' ? 36
          : kind === 'orb' ? 4
          : kind === 'wuerger' || kind === 'silbergeist' ? 3
            : kind === 'stuka' || kind === 'stabzugCar' ? 2
              : kind === 'tower' || kind === 'diamond' ? 4
                : kind === 'mondsichel' ? 42
                  : 1
      ),
      r: extra.r ?? (
        kind === 'mondsichel' ? 3.4
          : kind === 'eisenwurm' || kind === 'core' ? 2.8
            : kind === 'orb' ? 1.15
            : kind === 'tower' || kind === 'diamond' || kind === 'stabzugCar' ? 2.2
              : kind === 'moonhog' ? 1.8
                : 1.3
      ),
      score: extra.score ?? (
        kind === 'mondsichel' || kind === 'eisenwurm' || kind === 'core' ? 5000
          : kind === 'tower' || kind === 'diamond' || kind === 'stabzugCar' ? 400
            : kind === 'stuka' ? 350
              : kind === 'silbergeist' ? 500
                : extra.ally ? 0
                  : 200
      ),
      vx: extra.vx || 0,
      vy: extra.vy || 0,
      vz: extra.vz ?? 28,
      phase: Math.random() * 6,
      shootCd: 0.35 + Math.random() * 0.4,
      dive: extra.dive || false,
      turret: extra.turret || false,
      anchored: extra.anchored || false,
      dual: extra.dual || kind === 'diamond' || kind === 'eisenwurm',
      mode: extra.mode || (extra.ally ? 'ally' : extra.turret ? 'turret' : extra.boss ? 'boss' : extra.dive ? 'dive' : extra.debris ? 'debris' : 'inbound'),
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

  function voLen(id, fallback = 2.6) {
    const d = Vox.duration(id);
    return d > 0.25 ? d : fallback;
  }

  function lockGunsFor(sec) {
    state.gunLock = Math.max(state.gunLock || 0, sec);
  }

  function spawnDrones(n, extra = {}) {
    for (let i = 0; i < n; i++) {
      spawnEnemy('orb', 0, 0, -70, {
        drone: true,
        turret: true,
        hp: extra.hp || 2,
        r: 0.95,
        score: 180,
        orbit: i,
        orbitN: n,
        vz: 0,
      });
    }
  }

  function scriptSpawns() {
    if (state.awaitingExit || state.intermission) return;
    const t = state.stageT;
    const s = state.stage;
    const beat = (id, at) => {
      if (state.spawnFlags.has(id) || t < at) return false;
      state.spawnFlags.add(id);
      return true;
    };

    if (s === 0) {
      if (beat('sf', 0.35)) {
        spawnEnemy('starfork', -5.5, -1.4, -20, { vz: 3.2, ally: true, hp: 10, score: 0, r: 1.4 });
        spawnEnemy('starfork', 5.8, -1.1, -24, { vz: 3.2, ally: true, hp: 8, score: 0, r: 1.4 });
        Vox.play('fork_01');
      }
      if (beat('n1', 1.0)) {
        spawnEnemy('nachtschwalbe', -6, 3, -90);
        spawnEnemy('nachtschwalbe', 7, -2, -100);
        spawnEnemy('nachtschwalbe', 0, 5, -108);
        Vox.play('nacht_01');
      }
      if (beat('w1', 3.8)) spawnEnemy('wuerger', 0, 2, -110, { vz: 22 });
      if (beat('n2', 6.2)) {
        spawnEnemy('nachtschwalbe', -10, 4, -95);
        spawnEnemy('nachtschwalbe', 10, 4, -95);
        spawnEnemy('nachtschwalbe', 0, -3, -105);
        spawnEnemy('nachtschwalbe', -4, 1, -112);
      }
      if (beat('w2', 9.5)) spawnEnemy('wuerger', -8, 0, -100, { vz: 20 });
      if (beat('w3', 10.2)) {
        spawnEnemy('wuerger', 8, 1, -108, { vz: 20 });
        Vox.play('wurger_01');
      }
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
        if (state.stageT - (state.mondAt || 0) > 8) {
          Vox.bark('mond');
          state.mondAt = state.stageT;
        }
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
          if (at === 4.5) Vox.play('stuka_01');
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
        spawnEnemy('mondsichel', 0, 1, -70, {
          boss: true, vz: 8, hp: 42, r: 3.6, scale: 1.35, score: 5000, talkArmor: true,
        });
        AudioFX.playCue('sichel-boss');
        Vox.play('cat_boss_01');
        Vox.play('sichel_02');
        lockGunsFor(Math.max(voLen('cat_boss_01'), voLen('sichel_02')) + 0.5);
      }
    }
    if (s === 3) {
      if (beat('fork4', 0.3) && !state.forkDead) {
        spawnEnemy('starfork', -5.4, -1.3, -16, {
          vz: 0, ally: true, named: 'fork', hp: 12, score: 0, r: 1.5, mode: 'wing', holdZ: -16, lane: -5.4,
        });
        Vox.play('fork_04');
      }
      if (beat('hogs', 1.2)) {
        spawnEnemy('moonhog', 6.5, -2.2, -22, {
          vz: 0, ally: true, hp: 14, score: 0, r: 1.9, mode: 'wing', holdZ: -22, lane: 6.5,
        });
        spawnEnemy('moonhog', 8.4, -2.8, -28, {
          vz: 0, ally: true, hp: 14, score: 0, r: 1.9, mode: 'wing', holdZ: -28, lane: 8.4,
        });
      }
      if (beat('doors', 0.2)) {
        const doors = [
          [-11, -9, -44], [11, -9, -48],
          [-7, -9, -90], [7, -9, -96],
          [0, -9, -130],
          [-13, -9, -168], [13, -9, -174],
        ];
        for (const [x, y, z] of doors) spawnEnemy('tower', x, y, z, { turret: true, hp: 5, r: 2.4 });
        spawnEnemy('diamond', 0, 2, -110, { turret: true, dual: true, hp: 5, r: 2.2 });
      }
      for (const at of [5, 14, 24, 34]) {
        if (beat('kst' + at, at)) {
          spawnEnemy('stuka', at % 10 < 6 ? -8 : 8, 10, -80, { dive: true, vz: 16, vy: -6 });
          AudioFX.siren();
        }
      }
      for (const at of [6, 12, 18, 28, 38]) {
        if (beat('kn' + at, at)) {
          spawnEnemy('nachtschwalbe', at % 4 === 0 ? -9 : 8, 3, -90);
          spawnEnemy('wuerger', at % 4 === 0 ? 6 : -5, 0, -102, { vz: 22 });
        }
      }
      if (beat('peel', 22)) {
        AudioFX.playCue('fork-rescue');
        Vox.play('fork_03');
        banner('PEEL THEM OFF HER', 2200);
        const p1 = spawnEnemy('wuerger', -7, 1, -70, { vz: 18, peel: true, hp: 4, passes: 2, r: 1.7 });
        const p2 = spawnEnemy('wuerger', -4, 3, -78, { vz: 18, peel: true, hp: 4, passes: 2, r: 1.7 });
        if (p1) tintGroup(p1.mesh, COL.orange);
        if (p2) tintGroup(p2.mesh, COL.orange);
        Vox.play('wurger_02');
        const fork = state.enemies.find((e) => e.named === 'fork' && !e.dead);
        if (fork) {
          fork.mode = 'peelchase';
          fork.vz = 0;
          fork.invuln = 1.4;
        }
        state.peelUntil = state.stageT + PEEL_WINDOW;
      }
    }
    if (s === 4) {
      if (beat('fork5', 0.3) && !state.forkDead) {
        spawnEnemy('starfork', -5.4, -1.3, -16, {
          vz: 0, ally: true, named: 'fork', hp: 18, score: 0, r: 1.5, mode: 'wing', holdZ: -16, lane: -5.4,
        });
      }
      if (beat('train', 0.25)) {
        for (let i = 0; i < 5; i++) {
          spawnEnemy('stabzugCar', 0, -7.2, -70 - i * 10, {
            turret: true,
            mode: 'rail',
            holdZ: -36 - i * 7,
            lane: (i % 2 === 0 ? -1.2 : 1.2),
            hp: 6,
            r: 2.1,
            score: 350,
            railIndex: i,
            exposed: false,
          });
        }
        spawnEnemy('eisenwurm', 0, -6.6, -130, {
          boss: true,
          mode: 'rail',
          holdZ: -50,
          lane: 0,
          hp: 42,
          r: 3.0,
          dual: true,
          score: 5000,
          exposed: false,
          talkArmor: true,
        });
        for (let i = 0; i < 4; i++) {
          spawnEnemy('orb', 0, 0, -80, {
            trainOrb: true,
            turret: true,
            hp: 5,
            r: 1.25,
            score: 300,
            orbit: i,
            orbitN: 4,
            vz: 0,
          });
        }
        banner('KILL THE SHIELD ORBS');
        Vox.play('cat_boss_02');
        lockGunsFor(voLen('cat_boss_02') + 0.45);
      }
      if (beat('geist', 8)) {
        spawnEnemy('silbergeist', 6, 4, -110, { vz: 26, hp: 6, score: 800, passes: 3 });
        Vox.play('cat_boss_03');
        Vox.play('geist_01');
      }
      if (beat('geist2', 22)) {
        spawnEnemy('silbergeist', -5, 3, -120, { vz: 28, hp: 5, score: 700, passes: 2 });
        Vox.play('geist_02');
      }
      for (const at of [4, 12, 18, 30, 40]) {
        if (beat('rn' + at, at)) {
          spawnEnemy('nachtschwalbe', at % 8 < 4 ? -8 : 7, 2, -90);
          spawnEnemy('wuerger', at % 8 < 4 ? 6 : -6, 0, -100, { vz: 22 });
        }
      }
    }
    if (s === 5) {
      if (beat('rabe2', 1.4)) Vox.play('rabe_02');
      if (beat('ribs', 0.2)) {
        const zs = [-36, -72, -110, -150, -190];
        for (const z of zs) {
          spawnEnemy('tower', -7.4, -2.0, z, { turret: true, hp: 3, r: 1.5 });
          spawnEnemy('tower', 7.4, -2.0, z - 5, { turret: true, hp: 3, r: 1.5 });
        }
        spawnEnemy('diamond', 0, 0, -80, { turret: true, dual: true, hp: 6, r: 2.4 });
        spawnEnemy('diamond', 0, 0, -140, { turret: true, dual: true, hp: 6, r: 2.4 });
      }
      if (beat('throat', 6)) {
        if (state.sichelAlive) {
          spawnEnemy('mondsichel', 0, 2, -88, {
            vz: 0,
            hp: 32,
            r: 3.6,
            scale: 2.0,
            score: 2500,
            sichel: true,
            named: 'staffwing',
            mode: 'holdwing',
            holdZ: -50,
            talkArmor: true,
          });
          spawnDrones(5, { hp: 2 });
          Vox.play('cat_boss_04');
          setTimeout(() => { if (state.running && state.sichelAlive) Vox.play('sichel_03'); }, 1400);
          setTimeout(() => { if (state.running && state.sichelAlive) Vox.play('sichel_alt_01'); }, 3000);
          setTimeout(() => { if (state.running && state.sichelAlive) Vox.play('sichel_alt_02'); }, 5200);
          lockGunsFor(5.2 + voLen('sichel_alt_02', 3.0) + 0.55);
        } else {
          spawnEnemy('mondsichel', 0, 2, -88, {
            vz: 0, hp: 26, r: 3.5, scale: 1.85, score: 1800,
            named: 'staffwing', mode: 'holdwing', holdZ: -50, talkArmor: true,
          });
          spawnDrones(5, { hp: 2 });
          Vox.play('sichel_05');
          lockGunsFor(voLen('sichel_05') + 0.45);
        }
        banner('CLEAR THE DRONES', 1800);
      }
      if (beat('core', 24) && !state.boss) {
        banner('FOUNDRY CORE');
        spawnEnemy('core', 0, 0, -60, {
          boss: true, kind: 'core', hp: 36, r: 2.8, score: 5000, mode: 'core', exposed: false, talkArmor: true,
        });
        for (let i = 0; i < 5; i++) {
          spawnEnemy('orb', 0, 0, -60, {
            turret: true,
            coreOrb: true,
            orbit: i,
            orbitN: 5,
            hp: 4,
            r: 1.2,
            score: 300,
            vz: 0,
          });
        }
        Vox.play('cat_boss_05');
        if (state.sichelAlive) Vox.play('sichel_04');
        else Vox.play('rabe_01');
        lockGunsFor(voLen('cat_boss_05') + (state.sichelAlive ? voLen('sichel_04') : 0) + 0.4);
      }
      for (const at of [10, 16, 32]) {
        if (beat('sn' + at, at)) {
          spawnEnemy('nachtschwalbe', -4, 2, -80, { vz: 30 });
          spawnEnemy('wuerger', 5, 1, -88, { vz: 26 });
        }
      }
    }
    if (s === 6) {
      if (beat('shock', 0.2)) {
        Vox.play('rabe_04');
        banner('THE WELL IS CLOSING', 2200);
        for (let i = 0; i < 8; i++) {
          spawnEnemy('nachtschwalbe', (i - 3.5) * 3.2, (i % 2 ? 3.4 : -2.4), -70 - i * 8, {
            debris: true,
            panel: i % 2 === 0,
            vz: 16,
            hp: 1,
            score: 50,
            r: 2.0,
            scale: 1.35,
            mode: 'debris',
          });
        }
        const zs = [-40, -90, -140, -190];
        for (const z of zs) {
          spawnEnemy('tower', -7.2, -2.0, z, { turret: true, hp: 3, r: 1.5 });
          spawnEnemy('tower', 7.2, -2.0, z - 6, { turret: true, hp: 3, r: 1.5 });
        }
      }
      if (beat('gate1', 6)) {
        spawnEnemy('diamond', -4.2, 0, -55, { turret: true, dual: true, hp: 5, r: 2.2 });
        spawnEnemy('diamond', 4.2, 0, -55, { turret: true, dual: true, hp: 5, r: 2.2 });
      }
      if (beat('blast1', 8)) state.shockAt = state.stageT;
      if (beat('last', 12) && state.sichelAlive) {
        spawnEnemy('mondsichel', 3, 2, -80, {
          vz: 24, hp: 10, r: 2.6, scale: 0.9, score: 1200, passes: 1, sichel: true,
        });
        Vox.play('sichel_alt_03');
      }
      if (beat('shock2', 18)) {
        banner('FALLING PANELS', 1400);
        for (let i = 0; i < 8; i++) {
          spawnEnemy('nachtschwalbe', (i - 3.5) * 3.2, (i % 2 ? 4 : -3), -60 - i * 7, {
            debris: true, panel: true, vz: 20, hp: 1, score: 50, r: 2.1, scale: 1.4, mode: 'debris',
          });
        }
      }
      if (beat('gate2', 24)) {
        spawnEnemy('diamond', 0, 3.2, -50, { turret: true, dual: true, hp: 6, r: 2.3 });
        spawnEnemy('diamond', 0, -3.2, -58, { turret: true, dual: true, hp: 6, r: 2.3 });
      }
      if (beat('blast2', 28)) state.shockAt = state.stageT;
      if (beat('shock3', 34)) {
        banner('MOUTH COLLAPSING', 1400);
        for (let i = 0; i < 6; i++) {
          spawnEnemy('nachtschwalbe', (i - 2.5) * 3.4, (i % 2 ? 5 : -4), -55 - i * 6, {
            debris: true, panel: i % 2 === 0, vz: 24, hp: 1, score: 50, r: 2.2, scale: 1.5, mode: 'debris',
          });
        }
      }
      if (beat('blast3', 40)) state.shockAt = state.stageT;
      for (const at of [4, 14, 22, 32, 44]) {
        if (beat('en' + at, at)) {
          spawnEnemy('nachtschwalbe', at % 8 < 4 ? -6 : 7, 2, -85, { vz: 34 });
          spawnEnemy('wuerger', at % 8 < 4 ? 5 : -5, 0, -92, { vz: 30 });
        }
      }
      if (beat('mouth', 48)) Vox.play('cat_win_02');
    }
  }

  function lookDir() {
    camera.getWorldDirection(state.look);
    return state.look;
  }

  /** Dodgeable cockpit — stick moves this a lot more than the camera. */
  function cockpitPos(out = tmp5) {
    return out.set(state.px * 0.72, state.py * 0.58 + 0.35, 0);
  }

  function fire() {
    if ((state.gunLock || 0) > 0 || state.cinematic) return;
    const dir = lookDir().clone();
    let best = null;
    let bestDot = 0.935;
    for (const e of state.enemies) {
      if (e.dead || e.ally || e.debris) continue;
      worldPos(e, tmp);
      tmp3.copy(tmp).sub(camera.position).normalize();
      const d = dir.dot(tmp3);
      if (d > bestDot) {
        bestDot = d;
        best = tmp3.clone();
      }
    }
    if (best) dir.lerp(best, 0.62).normalize();
    const origin = camera.position.clone().add(dir.clone().multiplyScalar(1.35));
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
    origin.addScaledVector(down, 0.08);
    const mesh = tracerBolt(dir, { ally: true, twin: true });
    mesh.position.copy(origin);
    scene.add(mesh);
    const trail = tracerTrail(COL.ally);
    scene.add(trail);
    state.bullets.push({
      mesh,
      trail,
      hist: [origin.clone()],
      prev: origin.clone(),
      vel: dir.multiplyScalar(170),
      life: 1.15,
    });
    state.kick = 0.14;
    AudioFX.shoot();
  }

  function enemyShoot(e, offset, opts = {}) {
    worldPos(e, tmp2);
    if (offset) tmp2.add(offset);
    const origin = tmp2.clone();
    // Snapshot at the cockpit *now*. Velocity never updates after this, so a
    // bank out of the lane lets the bolt fly through empty space.
    const dir = cockpitPos(new THREE.Vector3()).sub(origin);
    if (opts.fan) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), opts.fan);
    const spread = opts.heavy ? 2.0 : (e.turret || e.boss || e.kind === 'core' ? 3.0 : 4.4);
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread * 0.75;
    dir.normalize();
    const heavy = !!(opts.heavy || e.turret || e.boss || e.kind === 'eisenwurm' || e.kind === 'core');
    const mesh = laserBolt(dir, { heavy });
    mesh.position.copy(origin);
    scene.add(mesh);
    const speed = opts.slow ? 22 : (e.boss || e.kind === 'core' ? 30 : e.turret ? 26 : 28);
    state.ebullets.push({
      mesh,
      laser: true,
      vel: dir.multiplyScalar(speed),
      life: 2.8,
      prev: origin.clone(),
      r: opts.slow ? 2.8 : 2.2,
    });
  }

  function bossVolley(e) {
    const kind = e.kind;
    e.gunT = (e.gunT || 0);
    e.gunPhase = e.gunPhase || 'quiet';
    if (kind === 'stabzugCar') {
      const slot = e.railIndex ?? 0;
      const phase = (state.t + slot * 0.85) % 4.2;
      if (phase < 0.18 && e.shootCd <= 0) {
        enemyShoot(e);
        e.shootCd = 0.16;
      }
      return;
    }
    if (e.gunPhase === 'quiet') {
      clearTint(e.mesh);
      if (e.gunT > (kind === 'eisenwurm' ? 2.05 : 1.75)) {
        e.gunPhase = 'wind';
        e.gunT = 0;
        tintGroup(e.mesh, 0xffee88);
      }
    } else if (e.gunPhase === 'wind') {
      if (e.gunT > 0.4) {
        e.gunPhase = 'volley';
        e.gunT = 0;
        e.gunShots = 0;
        clearTint(e.mesh);
      }
    } else if (e.gunPhase === 'volley') {
      if (e.shootCd <= 0) {
        if (kind === 'eisenwurm') {
          enemyShoot(e, new THREE.Vector3(0, 3.2, 0), { heavy: true, slow: true });
          enemyShoot(e, new THREE.Vector3(0, -3.2, 0), { heavy: true, slow: true });
          e.gunShots = 99;
        } else if (kind === 'core' && e.exposed) {
          enemyShoot(e, null, { fan: -0.18 });
          enemyShoot(e);
          enemyShoot(e, null, { fan: 0.18 });
          e.gunShots = 99;
        } else {
          const fan = (e.gunShots - 1) * 0.14;
          enemyShoot(e, null, { fan });
          e.gunShots += 1;
        }
        e.shootCd = 0.12;
        if (e.gunShots >= 3) {
          e.gunPhase = 'quiet';
          e.gunT = 0;
          if (kind === 'mondsichel' && Math.random() < 0.34) {
            enemyShoot(e, null, { heavy: true, slow: true });
          }
        }
      }
    }
  }

  function dropBolt(b) {
    scene.remove(b.mesh);
    if (b.trail) scene.remove(b.trail);
  }

  function setPaused(on) {
    const next = !!on;
    const toggling = next !== state.paused;
    state.paused = next;
    const el = document.getElementById('pause');
    if (el) el.classList.toggle('hidden', !state.paused);
    if (state.paused) {
      const bannerEl = document.getElementById('banner');
      if (bannerEl) bannerEl.classList.add('hidden');
      if (toggling) AudioFX.pauseStage();
    } else if (toggling && state.running && !state.over) {
      AudioFX.resumeStage();
    }
  }

  function dropEnemyMesh(e) {
    if (e.mesh.parent) e.mesh.parent.remove(e.mesh);
    else scene.remove(e.mesh);
  }

  function killFork(e) {
    if (state.forkDead) {
      if (e && !e.dead) {
        dropEnemyMesh(e);
        e.dead = true;
      }
      return;
    }
    state.forkDead = true;
    syncFlags();
    Vox.play('fork_05', { priority: true });
    setTimeout(() => { if (state.running) Vox.play('hale_bark_03'); }, 900);
    banner('STARFORK DOWN', 2000);
    AudioFX.playCue('fork-dead');
    if (e && !e.dead) {
      const burst = shatterBurst(COL.ally);
      worldPos(e, tmp);
      burst.position.copy(tmp);
      scene.add(burst);
      state.fx.push(burst);
      dropEnemyMesh(e);
      e.dead = true;
      AudioFX.explosion();
    }
  }

  function killEnemy(e) {
    if (e.named === 'fork') {
      killFork(e);
      return;
    }
    const burst = shatterBurst(e.kind === 'tower' || e.kind === 'diamond' || e.kind === 'core' || e.kind === 'stabzugCar' || e.kind === 'eisenwurm' ? COL.magenta : COL.axis);
    worldPos(e, tmp);
    burst.position.copy(tmp);
    scene.add(burst);
    state.fx.push(burst);
    dropEnemyMesh(e);
    e.dead = true;
    state.score += e.score;
    if (e.ejecting) {
      state.sichelAlive = false;
      state.sichelEjecting = false;
      syncFlags();
      state.bossKilled = true;
      AudioFX.playCue('sichel-down');
    } else if (e.boss && e.kind === 'mondsichel' && state.stage === 2) {
      state.boss = null;
      startSichelEject(tmp);
    } else if (e.coreOrb) {
      const left = state.enemies.some((x) => x.coreOrb && !x.dead && x !== e);
      if (!left) {
        const core = state.enemies.find((x) => x.kind === 'core' && !x.dead);
        if (core) {
          core.exposed = true;
          banner('CORE EXPOSED', 1800);
        }
      }
    } else if (e.trainOrb) {
      const left = state.enemies.some((x) => x.trainOrb && !x.dead && x !== e);
      if (!left) {
        for (const x of state.enemies) {
          if ((x.kind === 'eisenwurm' || x.kind === 'stabzugCar') && !x.dead) x.exposed = true;
        }
        banner('CRADLE EXPOSED', 1800);
      }
    } else if (e.mode === 'holdwing' || e.named === 'staffwing') {
      if (e.sichel && state.sichelAlive) {
        state.sichelAlive = false;
        syncFlags();
      }
      for (const d of state.enemies) {
        if (d.drone && !d.dead) {
          d.drone = false;
          d.mode = 'inbound';
          d.vz = 22;
          d.turret = false;
        }
      }
    } else if (e.boss) {
      state.boss = null;
      state.bossKilled = true;
      if (e.kind === 'core') Vox.play('rabe_03');
    } else if (e.sichel && state.sichelAlive) {
      state.sichelAlive = false;
      syncFlags();
    }
    if (e.kind === 'core' || e.kind === 'eisenwurm' || e.kind === 'mondsichel') AudioFX.blast();
    else if (e.kind === 'tower' || e.kind === 'diamond' || e.kind === 'stabzugCar' || e.debris || e.coreOrb || e.trainOrb) AudioFX.boom();
    else AudioFX.explosion();
    if (!e.ally && !e.turret && !e.debris && Math.random() < 0.22) {
      if (e.kind === 'nachtschwalbe') Vox.play('cat_kill_03');
      else Vox.bark('cat_kill');
    }
    hud();
  }

  function startSichelEject(pos) {
    state.sichelEjecting = true;
    state.ejectAt = state.stageT;
    const ej = spawnEnemy('mondsichel', pos.x, pos.y, pos.z, {
      ejecting: true,
      boss: false,
      hp: 5,
      r: 1.6,
      scale: 0.48,
      score: 800,
      vz: -20,
      mode: 'eject',
    });
    if (ej) {
      ej.mesh.position.copy(pos);
    }
    banner('SICHEL EJECTING', 1600);
    AudioFX.playCue('sichel-eject');
    Vox.play('sichel_01');
  }

  function resolveEject() {
    if (!state.sichelEjecting) return;
    const ej = state.enemies.find((e) => e.ejecting && !e.dead);
    if (!ej) return;
    if (state.stageT - state.ejectAt > 2.6) {
      state.sichelAlive = true;
      state.sichelEjecting = false;
      syncFlags();
      dropEnemyMesh(ej);
      ej.dead = true;
      state.bossKilled = true;
      AudioFX.playCue('sichel-gone');
      Vox.play('sichel_03');
    }
  }

  function playerHit() {
    if (state.invuln > 0 || state.rollT > 0) return;
    state.noHit = false;
    state.shields -= 1;
    state.invuln = 0.7;
    state.shake = 1;
    state.hitFlash = 0.22;
    AudioFX.damage();
    Settings.rumble([30, 40, 70]);
    Settings.queueRumble?.([30, 40, 70]);
    const sh = document.getElementById('hud-shields');
    if (sh) {
      sh.classList.add('hit');
      setTimeout(() => sh.classList.remove('hit'), 480);
    }
    const hurt = document.getElementById('hurt');
    if (hurt) {
      hurt.classList.add('on');
      setTimeout(() => hurt.classList.remove('on'), 220);
    }
    if (state.shields <= 0) Vox.play('cat_hurt_05', { priority: true });
    else if (state.shields === 1) Vox.play(Math.random() < 0.5 ? 'cat_hurt_03' : 'cat_hurt_04', { priority: true });
    else if (state.shields === 2) Vox.play('cat_hurt_02', { priority: true });
    else Vox.play('cat_hurt_01', { priority: true });
    renderer.domElement.style.filter = 'brightness(2.4) saturate(0.25) hue-rotate(-20deg)';
    setTimeout(() => { renderer.domElement.style.filter = ''; }, 180);
    if (state.shields <= 0) {
      state.lives -= 1;
      state.shields = 3;
      if (state.lives <= 0) {
        finish(false);
        return;
      }
      banner('VOIDCAT DOWN', 1600);
    } else {
      banner('SHIELD HIT', 700);
    }
    hud();
  }

  function finish(won) {
    state.running = false;
    state.intermission = false;
    state.over = { won, score: state.score, stage: state.stage, pending: true };
    syncFlags();
    document.body.classList.remove('playing');
    AudioFX.stopStage();
    setPaused(false);
    document.getElementById('briefing').classList.add('hidden');
    const end = document.getElementById('end');
    end.classList.remove('hidden');
    document.getElementById('end-kicker').textContent = won ? 'MISSION REPORT' : 'VOIDCAT LOST';
    document.getElementById('end-title').textContent = won ? 'THE PACIFIC STAYS BLUE' : 'THE ROD STILL LIVES';
    document.getElementById('end-body').textContent = won
      ? 'The Staff is dark. Come home on the hook, Hellcat.'
      : 'Schrödinger still burns. Pacific Void Command will re-arm the next catapult.';
    document.getElementById('end-score').textContent = `SCORE ${pad(state.score)}   HI ${pad(Scores.best())}`;
    document.getElementById('end-table').innerHTML = '';
    if (won) {
      Vox.stopRadio();
      Vox.flushCombat();
      Vox.play('cat_win_01');
      setTimeout(() => Vox.play('hale_bark_07'), 1800);
      setTimeout(() => Vox.play('cat_win_03'), 3200);
      AudioFX.fanfare();
    } else {
      Vox.silence();
      AudioFX.gameOver();
    }
  }

  function clearCombat() {
    for (const e of state.enemies) dropEnemyMesh(e);
    for (const b of state.bullets) dropBolt(b);
    for (const b of state.ebullets) dropBolt(b);
    state.enemies = [];
    state.bullets = [];
    state.ebullets = [];
    state.boss = null;
    state.bossKilled = false;
    state.awaitingExit = false;
    state.sichelEjecting = false;
    state.peelUntil = 0;
    state.spawnFlags = new Set();
    if (state.cineShip) {
      scene.remove(state.cineShip);
      state.cineShip = null;
    }
    if (state.cineCrater) {
      scene.remove(state.cineCrater);
      state.cineCrater = null;
    }
    state.cinematic = false;
  }

  function beginCombat() {
    Vox.stopRadio();
    document.getElementById('briefing').classList.add('hidden');
    const stills = document.getElementById('brief-stills');
    if (stills) stills.classList.add('hidden');
    document.body.classList.add('playing');
    state.intermission = false;
    state.stageT = 0;
    state.noHit = true;
    state.px = 0;
    state.py = 0;
    clearCombat();
    buildEnv(STAGES[state.stage].bg);
    addGuns();
    if (!scene.children.includes(camera)) scene.add(camera);
    banner(STAGES[state.stage].name, 2000);
    Vox.live();
    Vox.bark('cat_launch');
    AudioFX.startStage(state.stage);
    hud();
  }

  function nextStage() {
    if (state.noHit) state.score += 1500;
    if (state.stage >= 6) {
      startEscapeCinematic();
      return;
    }
    state.stage += 1;
    openIntermission();
    hud();
  }

  function releaseHogs() {
    for (const e of state.enemies) {
      if (e.kind === 'moonhog' && !e.dead) {
        e.mode = 'egress';
        e.vz = 11;
        e.breakSign = 1;
      }
    }
  }

  function startEscapeCinematic() {
    state.cinematic = true;
    state.cineT = 0;
    state.gunLock = 99;
    state.invuln = 12;
    state.awaitingExit = true;
    banner('BREAKING THE MOUTH', 2200);
    for (const e of state.enemies) {
      if (!e.dead && (e.debris || e.turret) && !e.boss) {
        dropEnemyMesh(e);
        e.dead = true;
      }
    }
    if (state.guns && state.guns.parent) state.guns.parent.remove(state.guns);
    const cat = BUILDERS.voidcat();
    cat.scale.setScalar(1.55);
    cat.position.set(0, -11, -32);
    cat.rotation.x = -0.55;
    scene.add(cat);
    state.cineShip = cat;
    const floor = craterFloor();
    floor.position.set(0, -14, -42);
    scene.add(floor);
    state.cineCrater = floor;
    Vox.play('cat_win_02');
  }

  function tickCinematic(dt) {
    state.cineT += dt;
    const t = state.cineT;
    state.gunLock = 1;
    state.invuln = 2;
    if (state.cineShip) {
      const u = Math.min(1, t / 4.4);
      const rise = -11 + u * 18;
      state.cineShip.position.set(Math.sin(t * 1.15) * 1.4, rise, -34 + u * 14);
      state.cineShip.rotation.x = -0.55 + u * 0.42;
      state.cineShip.rotation.z = Math.sin(t * 2.1) * 0.14;
      state.cineShip.rotation.y = Math.sin(t * 0.7) * 0.2;
      if (t < 3.2 && (state.cineShotCd || 0) <= 0) {
        const nose = state.cineShip.position.clone().add(new THREE.Vector3(0, 0.4, 2.2));
        const out = new THREE.Vector3(0, 0.35, 1).normalize();
        const bolt = tracerBolt(out, { ally: true, twin: true });
        bolt.position.copy(nose);
        scene.add(bolt);
        state.ebullets.push({
          mesh: bolt,
          vel: out.multiplyScalar(48),
          life: 0.7,
          prev: nose.clone(),
          r: 0,
        });
        state.cineShotCd = 0.16;
        AudioFX.shoot();
      }
      state.cineShotCd = Math.max(0, (state.cineShotCd || 0) - dt);
    }
    const camBack = 10 + Math.min(8, t * 1.6);
    camera.position.set(Math.sin(t * 0.35) * 2.4, 1.6 + t * 0.55, camBack);
    const look = state.cineShip
      ? state.cineShip.position.clone().add(new THREE.Vector3(0, 0.4, 0))
      : new THREE.Vector3(0, 0, -20);
    camera.lookAt(look);
    camera.fov = 62 - Math.min(14, t * 2.2);
    camera.updateProjectionMatrix();

    if (t > 2.5 && !state.cineBlast) {
      state.cineBlast = true;
      const burst = shatterBurst(COL.orange);
      burst.position.set(0, -12, -40);
      scene.add(burst);
      state.fx.push(burst);
      state.shake = 1.5;
      AudioFX.blast();
      banner('OUT OF THE WELL', 2000);
    }
    if (t > 2.7 && t < 5.2 && Math.random() < dt * 8) {
      const follow = shatterBurst(Math.random() < 0.5 ? COL.orange : COL.axis);
      const y = state.cineShip ? state.cineShip.position.y - 4 - Math.random() * 3 : -8;
      follow.position.set((Math.random() - 0.5) * 5, y, -40 + Math.random() * 6);
      scene.add(follow);
      state.fx.push(follow);
      if (Math.random() < 0.35) AudioFX.explosion();
    }
    for (const b of state.ebullets) {
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
    }
    state.ebullets = state.ebullets.filter((b) => {
      if (b.life <= 0) {
        dropBolt(b);
        return false;
      }
      return true;
    });
    state.fx = state.fx.filter((f) => {
      const alive = updateShatter(f, dt);
      if (!alive) scene.remove(f);
      return alive;
    });
    if (t > 6.1) {
      if (state.cineShip) scene.remove(state.cineShip);
      if (state.cineCrater) scene.remove(state.cineCrater);
      state.cineShip = null;
      state.cineCrater = null;
      state.cinematic = false;
      finish(true);
    }
    hud();
    return state.over;
  }

  function enter(startStage = 0) {
    for (const e of state.enemies) dropEnemyMesh(e);
    for (const b of state.bullets) dropBolt(b);
    for (const b of state.ebullets) dropBolt(b);
    for (const f of state.fx) scene.remove(f);
    Object.assign(state, {
      running: true,
      paused: false,
      intermission: false,
      interHold: 0,
      t: 0,
      stage: Math.max(0, Math.min(STAGES.length - 1, startStage | 0)),
      stageT: 0,
      score: 0,
      lives: 3,
      shields: 3,
      invuln: 0,
      rollT: 0,
      rollCd: 0,
      boostT: 0,
      boostCd: 0,
      fireCd: 0,
      px: 0,
      py: 0,
      roll: 0,
      boost: 0,
      shake: 0,
      hitFlash: 0,
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
      briefReady: false,
      mondAt: -8,
      forkDead: false,
      sichelAlive: true,
      sichelEjecting: false,
      ejectAt: 0,
      peelUntil: 0,
      shockAt: null,
      gunLock: 0,
      cinematic: false,
      cineT: 0,
      cineShip: null,
      cineCrater: null,
      cineBlast: false,
      cineShotCd: 0,
    });
    syncFlags();
    setPaused(false);
    document.getElementById('end').classList.add('hidden');
    document.getElementById('briefing').classList.add('hidden');
    document.getElementById('title').classList.add('hidden');
    camera.fov = 62;
    camera.updateProjectionMatrix();
    beginCombat();
  }

  function update(dt, input) {
    if (!state.running) return state.over;
    if (input.pause) setPaused(!state.paused);
    if (state.paused) return null;

    if (state.cinematic) return tickCinematic(dt);

    if (state.intermission) {
      state.interHold = Math.max(0, state.interHold - dt);
      if (state.briefReady && state.interHold <= 0 && (input.fire || input.start)) beginCombat();
      return null;
    }

    if (input.boost && !state.boostHeld && state.boostT <= 0 && state.boostCd <= 0) {
      state.boostT = BOOST_BURST;
      AudioFX.boost();
    }
    state.boostHeld = !!input.boost;
    const boosting = state.boostT > 0;
    if (state.boostT > 0) {
      state.boostT -= dt;
      if (state.boostT <= 0) state.boostCd = BOOST_CD;
    } else {
      state.boostCd = Math.max(0, state.boostCd - dt);
    }
    state.boost = boosting ? Math.min(1, state.boost + dt * 4) : Math.max(0, state.boost - dt * 2);
    const speed = 22 + (boosting ? 18 : 0);

    state.t += dt;
    state.stageT += dt;
    state.invuln = Math.max(0, state.invuln - dt);
    state.fireCd = Math.max(0, state.fireCd - dt);
    state.gunLock = Math.max(0, (state.gunLock || 0) - dt);
    if (state.gunLock <= 0) {
      for (const e of state.enemies) {
        if (e.talkArmor) e.talkArmor = false;
      }
    }
    state.shake = Math.max(0, state.shake - dt * 3.2);
    state.hitFlash = Math.max(0, state.hitFlash - dt);
    if (state.rollT > 0) state.rollT -= dt;
    else state.rollCd = Math.max(0, state.rollCd - dt);
    if (input.roll && state.rollT <= 0 && state.rollCd <= 0) {
      state.rollT = ROLL_IFRAME;
      state.rollCd = ROLL_CD;
      const hop = (Math.abs(input.aimX) > 0.12 ? Math.sign(input.aimX) : (Math.random() < 0.5 ? 1 : -1)) * 8.0;
      state.px = THREE.MathUtils.clamp(state.px + hop, -16, 16);
      AudioFX.roll();
    }

    const steer = boosting ? 86 : 68;
    state.px = THREE.MathUtils.clamp(state.px + input.aimX * steer * dt, -16, 16);
    state.py = THREE.MathUtils.clamp(state.py + input.aimY * 50 * dt, -10, 10);
    const targetRoll = -input.aimX * 0.45 + (state.rollT > 0 ? Math.sin((1 - state.rollT / ROLL_IFRAME) * Math.PI * 2) * Math.PI * 2 : 0);
    state.roll += (targetRoll - state.roll) * Math.min(1, dt * 10);

    state.kick = Math.max(0, state.kick - dt * 2.6);
    const sx = (Math.random() - 0.5) * state.shake * 0.55;
    const sy = (Math.random() - 0.5) * state.shake * 0.4;
    camera.position.set(state.px * 0.34 + sx, state.py * 0.3 + 0.4 + sy, state.kick * 0.45);
    const lookX = state.px + input.aimX * 18;
    const lookY = state.py + input.aimY * 14;
    camera.lookAt(lookX, lookY, -40);
    camera.rotation.z = state.roll;
    camera.fov = 62 + state.boost * 8;
    camera.updateProjectionMatrix();

    if (state.stars) {
      state.stars.position.z += speed * dt * 1.6;
      if (state.stars.position.z > 40) state.stars.position.z = 0;
    }
    const bg = STAGES[state.stage].bg;
    if (bg === 'trench' || bg === 'staff') {
      state.env.position.z += speed * dt;
      if (state.env.position.z > 24) state.env.position.z = 0;
    } else if (bg === 'surface' || bg === 'yard' || bg === 'rail') {
      state.env.position.z += speed * dt;
      if (state.env.position.z > 48) state.env.position.z = 0;
      if (bg === 'rail') {
        state.env.children.forEach((c, i) => {
          c.position.x = Math.sin(state.t * 0.62 + i * 0.45) * 8.4;
          c.rotation.y = Math.cos(state.t * 0.62 + i * 0.45) * 0.22;
        });
      }
    } else if (bg === 'escape') {
      state.env.position.z += speed * dt * 1.85;
      state.env.rotation.z = Math.sin(state.t * 1.8) * 0.05;
      if (state.env.position.z > 24) state.env.position.z = 0;
      if (scene.fog) scene.fog.density = 0.02 + Math.min(0.03, state.stageT * 0.0007);
    }

    scriptSpawns();
    resolveEject();

    if (state.peelUntil) {
      const peelAlive = state.enemies.some((e) => e.peel && !e.dead);
      const fork = state.enemies.find((e) => e.named === 'fork' && !e.dead);
      if (state.forkDead || (!peelAlive && !fork)) {
        state.peelUntil = 0;
        releaseHogs();
      } else if (!peelAlive && fork) {
        fork.mode = 'egress';
        fork.vz = 10;
        state.peelUntil = 0;
        releaseHogs();
        AudioFX.playCue('fork-live');
      } else if (state.stageT > state.peelUntil && peelAlive && fork) {
        killFork(fork);
        state.peelUntil = 0;
        releaseHogs();
      }
    }

    if (state.shockAt != null && state.stageT - state.shockAt < 0.05) {
      const burst = shatterBurst(COL.amber);
      burst.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 7, -10);
      scene.add(burst);
      state.fx.push(burst);
      state.shake = 1;
      Settings.rumble([40, 25, 80]);
      renderer.domElement.style.filter = 'brightness(2.8)';
      setTimeout(() => { renderer.domElement.style.filter = ''; }, 90);
      if (!boosting && burst.position.distanceTo(camera.position) < 18) playerHit();
      state.shockAt = null;
    }

    if (input.fire && state.fireCd <= 0) {
      if ((state.gunLock || 0) <= 0) fire();
      state.fireCd = boosting ? 0.08 : 0.12;
    }

    for (const e of state.enemies) {
      e.phase += dt;
      if (e.mode === 'rail') {
        const hold = e.holdZ ?? -48;
        const wind = Math.sin(state.t * 0.62) * 9.0;
        e.mesh.position.z += (hold - e.mesh.position.z) * Math.min(1, dt * 1.5);
        e.mesh.position.x = (e.lane ?? 0) + wind;
        e.mesh.rotation.y += dt * 0.12;
        e.mesh.rotation.z = -Math.cos(state.t * 0.62) * 0.2;
      } else if (e.mode === 'holdwing') {
        const hold = e.holdZ ?? -50;
        e.mesh.position.z += (hold - e.mesh.position.z) * Math.min(1, dt * 0.55);
        e.mesh.position.x = Math.sin(state.t * 0.45) * 4.2;
        e.mesh.position.y = 1.6 + Math.sin(state.t * 0.7) * 1.1;
        e.mesh.lookAt(camera.position);
        e.mesh.rotateY(Math.PI);
        if (e.hp < 14 && !e.droneWave2) {
          e.droneWave2 = true;
          spawnDrones(6, { hp: 2 });
          banner('MORE DRONES', 1400);
        }
      } else if (e.drone) {
        const host = state.enemies.find((x) => x.mode === 'holdwing' && !x.dead);
        const ang = state.t * 1.65 + ((e.orbit || 0) / (e.orbitN || 4)) * Math.PI * 2;
        const rad = 5.4;
        const hx = host ? host.mesh.position.x : 0;
        const hy = host ? host.mesh.position.y : 2;
        const hz = host ? host.mesh.position.z : -50;
        e.mesh.position.set(
          hx + Math.cos(ang) * rad,
          hy + Math.sin(ang) * rad * 0.55,
          hz + Math.sin(ang * 1.4) * 1.5,
        );
        e.mesh.rotation.y += dt * 2.4;
      } else if (e.trainOrb) {
        const host = state.enemies.find((x) => x.kind === 'eisenwurm' && !x.dead);
        const ang = state.t * 0.9 + ((e.orbit || 0) / (e.orbitN || 4)) * Math.PI * 2;
        const rad = 7.6;
        const hx = host ? host.mesh.position.x : 0;
        const hy = host ? host.mesh.position.y + 2.6 : -4;
        const hz = host ? host.mesh.position.z : -50;
        e.mesh.position.set(
          hx + Math.cos(ang) * rad,
          hy + Math.sin(ang) * 2.4,
          hz + Math.sin(ang) * rad * 0.32,
        );
        e.mesh.rotation.y += dt * 2.1;
      } else if (e.mode === 'eject') {
        e.mesh.position.z -= 22 * dt;
        e.mesh.position.x += 11 * dt;
        e.mesh.position.y += 3.5 * dt;
        e.mesh.rotation.z += dt * 2.2;
      } else if (e.coreOrb) {
        const core = state.enemies.find((x) => x.kind === 'core' && !x.dead);
        const ang = state.t * 0.95 + ((e.orbit || 0) / (e.orbitN || 5)) * Math.PI * 2;
        const rad = 6.4;
        const cz = core ? core.mesh.position.z : -42;
        e.mesh.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.62, cz + Math.sin(ang * 2) * 1.1);
        e.mesh.rotation.y += dt * 2.2;
      } else if (e.mode === 'core' || e.kind === 'core') {
        e.mesh.position.z += (-42 - e.mesh.position.z) * dt * 0.35;
        e.mesh.rotation.y += dt * 0.45;
      } else if (e.mode === 'debris' || e.debris) {
        e.mesh.position.z += (e.vz || 20) * dt;
        e.mesh.rotation.x += dt * 1.4;
        e.mesh.rotation.z += dt * 0.8;
        const pulse = 0.92 + Math.sin(state.t * 9 + e.phase) * 0.12;
        e.mesh.scale.setScalar((e.scale || 1) * pulse);
      } else if (e.turret) {
        if (!e.anchored) e.mesh.position.z += speed * dt;
        e.mesh.rotation.y += dt * 0.8;
      } else if (e.boss) {
        e.mesh.position.x = Math.sin(state.t * 0.6) * 6;
        e.mesh.position.y = 1 + Math.sin(state.t * 0.9) * 2;
        e.mesh.position.z += (-55 - e.mesh.position.z) * dt * 0.4;
        e.mesh.rotation.y = Math.sin(state.t) * 0.2;
      } else if (e.mode === 'peelchase') {
        e.mesh.position.x = -3.4 + Math.sin(state.t * 2.1) * 2.4;
        e.mesh.position.y = 0.6 + Math.sin(state.t * 3.1 + e.phase) * 1.1;
        e.mesh.position.z = -26 + Math.sin(state.t * 1.4) * 2;
        e.mesh.rotation.y = Math.PI;
        e.mesh.rotation.z = -0.25 + Math.sin(state.t * 4) * 0.15;
        if (e.invuln) e.invuln = Math.max(0, e.invuln - dt);
      } else if (e.mode === 'wing') {
        e.mesh.position.x = (e.lane ?? -5.4) + Math.sin(state.t * 1.4) * 0.25;
        e.mesh.position.y = -1.3 + Math.sin(state.t * 1.8 + e.phase) * 0.2;
        e.mesh.position.z = e.holdZ ?? -16;
        e.mesh.rotation.y = Math.PI;
        e.mesh.rotation.z = Math.sin(state.t * 2 + e.phase) * 0.1;
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
        e.mesh.position.x += Math.sin(e.phase * 2.2) * (e.dive ? 1 : 3.2) * dt + e.vx * dt;
        e.mesh.position.y += e.vy * dt + Math.cos(e.phase * 1.4) * 1.1 * dt;
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
      e.gunT = (e.gunT || 0) + dt;
      worldPos(e, tmp);
      const z = tmp.z;
      const patterned = e.boss || e.kind === 'eisenwurm' || e.kind === 'stabzugCar' || (e.kind === 'core' && e.exposed) || (e.kind === 'mondsichel' && (e.boss || e.sichel || e.mode === 'holdwing'));
      const canShoot = !e.ally && !e.debris && !e.ejecting && e.mode !== 'break' && e.mode !== 'egress' && e.mode !== 'debris' && z > -68 && z < -6;
      if (canShoot) {
        if (patterned) {
          bossVolley(e);
        } else if (e.shootCd <= 0) {
          if (e.dual && Math.random() < 0.55) {
            enemyShoot(e, new THREE.Vector3(0, 3.8, 0));
            enemyShoot(e, new THREE.Vector3(0, -3.8, 0));
          } else {
            enemyShoot(e);
          }
          const base = e.turret || e.coreOrb ? 1.35 : (e.kind === 'wuerger' || e.kind === 'silbergeist' ? 0.95 : 1.2);
          e.shootCd = base + Math.random() * 0.35;
        }
      }
    }

    function stepBolt(b, maxHist) {
      if (!b.prev) b.prev = b.mesh.position.clone();
      else b.prev.copy(b.mesh.position);
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      if (b.laser) {
        updateLaser(b.mesh, b.mesh.position.distanceTo(camera.position));
        if (b.mesh.userData.face) b.mesh.userData.face.lookAt(camera.position);
      } else if (b.hist) {
        b.hist.push(b.mesh.position.clone());
        if (b.hist.length > maxHist) b.hist.shift();
        if (b.trail) updateTrail(b.trail, b.hist);
      }
    }

    for (const b of state.bullets) {
      stepBolt(b, 10);
      for (const e of state.enemies) {
        if (e.dead || e.ally) continue;
        worldPos(e, tmp);
        const z = Math.abs(tmp.z);
        const pad = z > 50 ? 2.2 : z > 25 ? 1.55 : 0.95;
        if (b.mesh.position.distanceTo(tmp) < e.r + pad) {
          b.life = 0;
          if (e.talkArmor) {
            AudioFX.hit();
            continue;
          }
          if (e.kind === 'core' && !e.exposed) {
            AudioFX.hit();
            continue;
          }
          if ((e.kind === 'eisenwurm' || e.kind === 'stabzugCar') && !e.exposed) {
            AudioFX.hit();
            continue;
          }
          if (e.mode === 'holdwing' && state.enemies.some((d) => d.drone && !d.dead)) {
            e.hp -= 0.35;
            AudioFX.hit();
            if (e.hp <= 0) killEnemy(e);
            continue;
          }
          if (e.kind === 'eisenwurm' && e.gunPhase === 'volley') {
            e.hp -= 0.35;
          } else {
            e.hp -= 1;
          }
          AudioFX.hit();
          if (e.hp <= 0) killEnemy(e);
        }
      }
    }

    for (const b of state.ebullets) {
      stepBolt(b, 8);
      const hitR = b.r || PLAYER_R;
      if (segmentHitsSphere(b.prev, b.mesh.position, cockpitPos(tmp5), hitR)) {
        b.life = 0;
        playerHit();
      }
      for (const e of state.enemies) {
        if (e.dead || e.named !== 'fork') continue;
        if (e.invuln > 0) continue;
        worldPos(e, tmp2);
        if (b.mesh.position.distanceTo(tmp2) < e.r + 0.5) {
          b.life = 0;
          e.hp -= 1;
          if (e.hp <= 0) killFork(e);
        }
      }
    }

    for (const e of state.enemies) {
      if (e.dead || e.turret || e.ally || e.kind === 'core' || e.coreOrb || e.mode === 'holdwing' || e.kind === 'eisenwurm') continue;
      worldPos(e, tmp);
      if (tmp.distanceTo(cockpitPos(tmp5)) < e.r * 0.85 + 1.4) {
        if (e.debris) {
          if (boosting) {
            killEnemy(e);
            continue;
          }
          if (state.rollT > 0) continue;
        }
        if (!e.debris) killEnemy(e);
        else killEnemy(e);
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
      const gone = e.anchored ? tmp.z > 14 : (e.mode === 'reattack' ? tmp.z > 20 : tmp.z > 12);
      if (gone || tmp.z < -240) {
        if (e.named === 'fork' && !state.forkDead && state.stage === 3) {
          // escaped the rail alive
        }
        dropEnemyMesh(e);
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
      banner(state.stage === 5 ? 'CORE DESTROYED' : 'TARGET DOWN', 1800);
      setTimeout(() => { if (state.running && !state.intermission) nextStage(); }, 1600);
    } else if (!state.awaitingExit && !state.sichelEjecting && state.stageT > stage.length && state.enemies.filter((e) => !e.ally && !e.debris).length === 0 && !state.boss) {
      nextStage();
    }

    const wep = document.getElementById('hud-weapon');
    if (wep) {
      if ((state.gunLock || 0) > 0) wep.textContent = 'HOLD FIRE';
      else if (boosting) wep.textContent = 'BOOST';
      else if (state.boostCd > 0) wep.textContent = `BOOST ${state.boostCd.toFixed(1)}`;
      else if (state.rollCd > 0 && state.rollT <= 0) wep.textContent = 'HISPANO-X';
      else wep.textContent = 'HISPANO-X';
    }
    hud();
    return state.over;
  }

  function dispose() {
    document.body.classList.remove('playing');
  }

  function continueBrief(force = false) {
    if (state.intermission && (force || state.briefReady)) beginCombat();
  }

  function isIntermission() {
    return !!state.intermission;
  }

  function setBriefReady(on) {
    state.briefReady = !!on;
  }

  return { enter, update, dispose, hi, STAGES, setPaused, paintBrief, continueBrief, isIntermission, setBriefReady };
}
