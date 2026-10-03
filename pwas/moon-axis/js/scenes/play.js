import * as THREE from 'three';
import { COL, lineMat, starfield, shatterBurst, updateShatter, moonWire, trenchFrame, flakTower, diamondPylon, craterFloor, tracerBolt, tracerTrail, updateTrail, laserBolt, updateLaser, railTrack, staffRibs, foundryCore, debrisChunk } from '../render/vector.js';
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
    length: 42,
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
    forkDead: false,
    sichelAlive: true,
    sichelEjecting: false,
    ejectAt: 0,
    peelUntil: 0,
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
    Vox.stopRadio();
    Vox.radio(s.radio(state));
  }

  function openIntermission() {
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
      for (let i = 0; i < 18; i++) {
        const d = debrisChunk();
        d.position.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 10, -i * 16 - 20);
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
    return state.enemies.filter((e) => !e.dead && !e.turret && !e.ally && !e.boss && !e.debris).length;
  }

  function worldPos(e, out) {
    e.mesh.getWorldPosition(out);
    return out;
  }

  function spawnEnemy(kind, x, y, z, extra = {}) {
    const isFighter = kind !== 'tower' && kind !== 'diamond' && kind !== 'core' && kind !== 'stabzugCar' && kind !== 'eisenwurm' && !extra.turret && !extra.ally && !extra.boss && !extra.debris;
    if (isFighter && liveFighters() >= 16) return null;
    const mesh = kind === 'tower'
      ? flakTower()
      : kind === 'diamond'
        ? diamondPylon()
        : kind === 'core'
          ? foundryCore()
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
          : kind === 'wuerger' || kind === 'silbergeist' ? 3
            : kind === 'stuka' || kind === 'stabzugCar' ? 2
              : kind === 'tower' || kind === 'diamond' ? 4
                : kind === 'mondsichel' ? 42
                  : 1
      ),
      r: extra.r ?? (
        kind === 'mondsichel' ? 3.4
          : kind === 'eisenwurm' || kind === 'core' ? 2.8
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
        spawnEnemy('mondsichel', 0, 1, -70, { boss: true, vz: 8, hp: 42, r: 3.6, scale: 1.35, score: 5000 });
        Vox.play('cat_boss_01');
        Vox.play('sichel_02');
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
        Vox.play('fork_03');
        spawnEnemy('wuerger', -7, 1, -70, { vz: 18, peel: true, hp: 4, passes: 2 });
        spawnEnemy('wuerger', -4, 3, -78, { vz: 18, peel: true, hp: 4, passes: 2 });
        Vox.play('wurger_02');
        const fork = state.enemies.find((e) => e.named === 'fork' && !e.dead);
        if (fork) {
          fork.mode = 'peelchase';
          fork.vz = 8;
        }
        state.peelUntil = state.stageT + 8;
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
            hp: 5,
            r: 2.1,
            score: 350,
          });
        }
        spawnEnemy('eisenwurm', 0, -6.6, -130, {
          boss: true,
          mode: 'rail',
          holdZ: -50,
          lane: 0,
          hp: 38,
          r: 3.0,
          dual: true,
          score: 5000,
        });
        banner('EISENWURM');
        Vox.play('cat_boss_02');
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
          spawnEnemy('mondsichel', 0, 2, -75, {
            vz: 10, hp: 22, r: 3.0, scale: 1.15, score: 2500, passes: 2, sichel: true,
          });
          Vox.play('cat_boss_04');
          setTimeout(() => { if (state.running && state.sichelAlive) Vox.play('sichel_03'); }, 1400);
          setTimeout(() => { if (state.running && state.sichelAlive) Vox.play('sichel_alt_01'); }, 3000);
          setTimeout(() => { if (state.running && state.sichelAlive) Vox.play('sichel_alt_02'); }, 5200);
        } else {
          spawnEnemy('mondsichel', 0, 2, -75, { vz: 10, hp: 18, r: 3.0, scale: 1.1, score: 1800, passes: 1 });
          Vox.play('sichel_05');
        }
      }
      if (beat('core', 24) && !state.boss) {
        banner('FOUNDRY CORE');
        spawnEnemy('core', 0, 0, -60, { boss: true, kind: 'core', hp: 32, r: 2.8, score: 5000, mode: 'core' });
        Vox.play('cat_boss_05');
        if (state.sichelAlive) Vox.play('sichel_04');
        else Vox.play('rabe_01');
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
        for (let i = 0; i < 8; i++) {
          spawnEnemy('nachtschwalbe', (i - 3.5) * 3, (i % 2 ? 3 : -2), -70 - i * 8, {
            debris: true,
            vz: 18,
            hp: 1,
            score: 50,
            r: 1.1,
            mode: 'debris',
          });
        }
      }
      if (beat('last', 10) && state.sichelAlive) {
        spawnEnemy('mondsichel', 3, 2, -80, {
          vz: 24, hp: 10, r: 2.6, scale: 0.9, score: 1200, passes: 1, sichel: true,
        });
        Vox.play('sichel_alt_03');
      }
      if (beat('shock2', 18)) {
        for (let i = 0; i < 6; i++) {
          spawnEnemy('nachtschwalbe', (i - 2.5) * 3.2, (i % 2 ? 4 : -3), -60 - i * 7, {
            debris: true, vz: 22, hp: 1, score: 50, r: 1.1, mode: 'debris',
          });
        }
      }
      for (const at of [4, 14, 22, 32]) {
        if (beat('en' + at, at)) {
          spawnEnemy('nachtschwalbe', at % 8 < 4 ? -6 : 7, 2, -85, { vz: 34 });
          spawnEnemy('wuerger', at % 8 < 4 ? 5 : -5, 0, -92, { vz: 30 });
        }
      }
      if (beat('mouth', 36)) Vox.play('cat_win_02');
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
    const mesh = laserBolt(tmp, { heavy: !!(e.turret || e.boss || e.kind === 'eisenwurm') });
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
    } else if (e.boss && e.kind === 'mondsichel' && state.stage === 2) {
      state.boss = null;
      startSichelEject(tmp);
    } else if (e.boss) {
      state.boss = null;
      state.bossKilled = true;
      if (e.kind === 'core') Vox.play('rabe_03');
    } else if (e.sichel && state.sichelAlive) {
      state.sichelAlive = false;
      syncFlags();
    }
    AudioFX.explosion();
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
      Vox.play('sichel_03');
    }
  }

  function playerHit() {
    if (state.invuln > 0 || state.rollT > 0) return;
    state.noHit = false;
    state.shields -= 1;
    state.invuln = 1.0;
    AudioFX.damage();
    Settings.rumble([22, 30, 45]);
    const sh = document.getElementById('hud-shields');
    if (sh) {
      sh.classList.add('hit');
      setTimeout(() => sh.classList.remove('hit'), 220);
    }
    if (state.shields <= 0) Vox.play('cat_hurt_05', { priority: true });
    else if (state.shields === 1) Vox.play(Math.random() < 0.5 ? 'cat_hurt_03' : 'cat_hurt_04', { priority: true });
    else if (state.shields === 2) Vox.play('cat_hurt_02', { priority: true });
    else Vox.play('cat_hurt_01', { priority: true });
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
    state.intermission = false;
    state.over = { won };
    syncFlags();
    const posted = Scores.submit({ score: state.score, stage: state.stage, won });
    document.body.classList.remove('playing');
    setPaused(false);
    document.getElementById('briefing').classList.add('hidden');
    const end = document.getElementById('end');
    end.classList.remove('hidden');
    document.getElementById('end-kicker').textContent = won ? 'MISSION REPORT' : 'VOIDCAT LOST';
    document.getElementById('end-title').textContent = won ? 'THE PACIFIC STAYS BLUE' : 'THE ROD STILL LIVES';
    document.getElementById('end-body').textContent = won
      ? 'The Staff is dark. Come home on the hook, Hellcat.'
      : 'Schrödinger still burns. Pacific Void Command will re-arm the next catapult.';
    const rank = posted.rank && posted.rank <= 10 ? `   RANK ${posted.rank}` : '';
    document.getElementById('end-score').textContent = `SCORE ${pad(state.score)}   HI ${pad(posted.best)}${rank}`;
    Scores.render(document.getElementById('end-table'), posted.row.t);
    Vox.stopRadio();
    if (won) {
      Vox.play('cat_win_01');
      setTimeout(() => Vox.play('hale_bark_07'), 1800);
      setTimeout(() => Vox.play('cat_win_03'), 3200);
      AudioFX.fanfare();
    } else {
      Vox.play('cat_lose_01');
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
    Vox.bark('cat_launch');
    hud();
  }

  function nextStage() {
    if (state.noHit) state.score += 1500;
    if (state.stage >= 6) {
      finish(true);
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
      briefReady: false,
      mondAt: -8,
      forkDead: false,
      sichelAlive: true,
      sichelEjecting: false,
      ejectAt: 0,
      peelUntil: 0,
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

    if (state.intermission) {
      state.interHold = Math.max(0, state.interHold - dt);
      if (state.briefReady && state.interHold <= 0 && (input.fire || input.start)) beginCombat();
      return null;
    }

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
    } else if (bg === 'escape') {
      state.env.position.z += speed * dt * 1.85;
      state.env.rotation.z = Math.sin(state.t * 1.8) * 0.05;
      if (state.env.position.z > 24) state.env.position.z = 0;
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
      } else if (state.stageT > state.peelUntil && peelAlive && fork) {
        killFork(fork);
        state.peelUntil = 0;
        releaseHogs();
      }
    }

    if (input.fire && state.fireCd <= 0) {
      fire();
      state.fireCd = input.boost ? 0.08 : 0.12;
    }

    for (const e of state.enemies) {
      e.phase += dt;
      if (e.mode === 'rail') {
        const hold = e.holdZ ?? -48;
        e.mesh.position.z += (hold - e.mesh.position.z) * Math.min(1, dt * 1.5);
        e.mesh.position.x = (e.lane ?? 0) + Math.sin(state.t * 0.7 + e.phase) * 0.55;
        e.mesh.rotation.y += dt * 0.12;
      } else if (e.mode === 'eject') {
        e.mesh.position.z -= 22 * dt;
        e.mesh.position.x += 11 * dt;
        e.mesh.position.y += 3.5 * dt;
        e.mesh.rotation.z += dt * 2.2;
      } else if (e.mode === 'core' || e.kind === 'core') {
        e.mesh.position.z += (-42 - e.mesh.position.z) * dt * 0.35;
        e.mesh.rotation.y += dt * 0.45;
      } else if (e.mode === 'debris' || e.debris) {
        e.mesh.position.z += (e.vz || 20) * dt;
        e.mesh.rotation.x += dt * 1.4;
        e.mesh.rotation.z += dt * 0.8;
      } else if (e.turret) {
        if (!e.anchored) e.mesh.position.z += speed * dt;
        e.mesh.rotation.y += dt * 0.8;
      } else if (e.boss) {
        e.mesh.position.x = Math.sin(state.t * 0.6) * 6;
        e.mesh.position.y = 1 + Math.sin(state.t * 0.9) * 2;
        e.mesh.position.z += (-55 - e.mesh.position.z) * dt * 0.4;
        e.mesh.rotation.y = Math.sin(state.t) * 0.2;
      } else if (e.mode === 'peelchase') {
        e.mesh.position.x -= 9 * dt;
        e.mesh.position.z -= 14 * dt;
        e.mesh.position.y += Math.sin(state.t * 3 + e.phase) * dt;
        e.mesh.rotation.y = Math.PI;
        e.mesh.rotation.z = -0.4;
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
      const canShoot = !e.ally && !e.debris && !e.ejecting && e.mode !== 'break' && e.mode !== 'egress' && e.mode !== 'debris' && z > -95 && z < 4;
      if (canShoot && e.shootCd <= 0) {
        if (e.dual) {
          enemyShoot(e, new THREE.Vector3(0, 3.8, 0));
          enemyShoot(e, new THREE.Vector3(0, -3.8, 0));
        } else {
          enemyShoot(e);
        }
        const base = e.boss || e.kind === 'eisenwurm' ? 0.32 : e.turret ? 0.8 : (e.kind === 'wuerger' || e.kind === 'silbergeist' ? 0.48 : 0.68);
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

    for (const b of state.ebullets) {
      stepBolt(b, 8);
      tmp.copy(b.mesh.position);
      if (tmp.distanceTo(camera.position) < 2.6) {
        b.life = 0;
        playerHit();
      }
      for (const e of state.enemies) {
        if (e.dead || e.named !== 'fork') continue;
        worldPos(e, tmp2);
        if (tmp.distanceTo(tmp2) < e.r + 0.5) {
          b.life = 0;
          e.hp -= 1;
          if (e.hp <= 0) killFork(e);
        }
      }
    }

    for (const e of state.enemies) {
      if (e.dead || e.turret || e.ally || e.debris || e.kind === 'core') continue;
      worldPos(e, tmp);
      if (tmp.distanceTo(camera.position) < e.r * 0.85 + 1.2) {
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
    if (wep) wep.textContent = input.boost ? 'BOOST' : 'HISPANO-X';
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
