import * as THREE from 'three';
import Input from './input.js';
import AudioFX from './audio.js';
import Settings from './settings.js';
import { voidcat, starfork } from './ships/catalog.js';
import { starfield } from './render/vector.js';
import createPlay from './scenes/play.js';

const canvas = document.getElementById('game');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
} catch (e) {
  document.getElementById('webgl-fail').classList.remove('hidden');
  throw e;
}
renderer.setClearColor(0x000000, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.012);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);

function resize() {
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round(vv ? vv.width : window.innerWidth));
  const h = Math.max(1, Math.round(vv ? vv.height : window.innerHeight));
  const x = vv ? vv.offsetLeft : 0;
  const y = vv ? vv.offsetTop : 0;
  const app = document.getElementById('app');
  app.style.width = w + 'px';
  app.style.height = h + 'px';
  app.style.transform = `translate(${x}px, ${y}px)`;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
window.visualViewport?.addEventListener('scroll', resize);
resize();

try {
  renderer.getContext();
} catch (e) {
  document.getElementById('webgl-fail').classList.remove('hidden');
}

Input.init();
const play = createPlay({ scene, camera, renderer });

document.getElementById('title-hi').textContent = `HI SCORE ${String(play.hi()).padStart(6, '0')}`;
document.getElementById('hud-hi').textContent = `HI ${String(play.hi()).padStart(6, '0')}`;

let mode = 'title';
let titleShip = null;
let titleStars = null;
let wingmen = [];
let briefStage = 0;
let holdoff = 0;
let titleT = 0;

function clearScene() {
  while (scene.children.length) scene.remove(scene.children[0]);
}

function show(id, on) {
  document.getElementById(id).classList.toggle('hidden', !on);
}

function enterTitle() {
  mode = 'title';
  titleT = 0;
  holdoff = 0.45;
  clearScene();
  document.body.classList.remove('playing');
  show('title', true);
  show('briefing', false);
  show('end', false);
  show('banner', false);
  titleStars = starfield(700);
  scene.add(titleStars);
  titleShip = voidcat();
  titleShip.position.set(0, -1.35, -7.2);
  scene.add(titleShip);
  const w1 = starfork();
  w1.position.set(-3.6, -1.6, -9);
  w1.scale.setScalar(0.62);
  const w2 = starfork();
  w2.position.set(3.8, -1.45, -10);
  w2.scale.setScalar(0.62);
  scene.add(w1, w2);
  wingmen = [w1, w2];
  camera.position.set(0, 0.35, 0);
  camera.lookAt(0, -0.6, -8);
  AudioFX.startMusic();
}

function enterBrief(stageIndex) {
  mode = 'brief';
  briefStage = stageIndex;
  holdoff = 0.4;
  const s = play.STAGES[stageIndex];
  show('title', false);
  show('end', false);
  show('briefing', true);
  document.getElementById('brief-kicker').textContent = s.briefKicker;
  document.getElementById('brief-title').textContent = s.briefTitle;
  document.getElementById('brief-body').textContent = s.briefBody;
}

function enterPlay() {
  if (mode === 'play') return;
  mode = 'play';
  AudioFX.stopMusic();
  AudioFX.init();
  clearScene();
  show('briefing', false);
  show('title', false);
  play.enter();
}

function launchFromTitle() {
  AudioFX.init();
  enterBrief(0);
}
document.getElementById('btn-start').addEventListener('click', launchFromTitle);
document.getElementById('btn-brief').addEventListener('click', () => {
  if (mode === 'brief' && holdoff <= 0) enterPlay();
});
document.getElementById('briefing').addEventListener('click', (e) => {
  if (e.target && e.target.id === 'btn-brief') return;
  if (mode === 'brief' && holdoff <= 0) enterPlay();
});
document.getElementById('btn-again').addEventListener('click', () => {
  enterTitle();
});

function syncSettingsUI() {
  const inv = document.getElementById('opt-invert');
  const hap = document.getElementById('opt-haptics');
  inv.textContent = Settings.invertY ? 'INVERT Y  ON' : 'INVERT Y  OFF';
  inv.classList.toggle('on', Settings.invertY);
  hap.textContent = Settings.haptics ? 'HAPTICS  ON' : 'HAPTICS  OFF';
  hap.classList.toggle('on', Settings.haptics);
  const hint = document.getElementById('fs-hint');
  hint.classList.toggle('hidden', !(Settings.isIOS() && !Settings.isStandalone()));
  if (Settings.isStandalone()) document.body.classList.add('standalone');
  syncFsButtons();
}

function isNativeFs() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function syncFsButtons() {
  const on = isNativeFs() || document.body.classList.contains('immersive');
  document.querySelectorAll('.btn-fs').forEach((b) => {
    b.textContent = b.id === 'btn-fs' ? (on ? 'EXIT' : 'FULL') : (on ? 'EXIT FULL SCREEN' : 'FULL SCREEN');
  });
}

async function toggleFullscreen() {
  AudioFX.init();
  const root = document.documentElement;
  if (isNativeFs()) {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) { /* ignore */ }
    document.body.classList.remove('immersive');
    syncFsButtons();
    resize();
    return;
  }
  let native = false;
  const canFs = document.fullscreenEnabled || document.webkitFullscreenEnabled;
  try {
    if (canFs && root.requestFullscreen) {
      await root.requestFullscreen({ navigationUI: 'hide' });
      native = true;
    } else if (canFs && root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
      native = true;
    }
  } catch (_) {
    native = false;
  }
  document.body.classList.add('immersive');
  window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    window.scrollTo(0, 1);
    setTimeout(() => {
      window.scrollTo(0, 0);
      resize();
    }, 60);
  });
  try { await screen.orientation?.lock?.('landscape'); } catch (_) { /* iOS often blocks */ }
  if (!native && Settings.isIOS() && !Settings.isStandalone()) {
    const hint = document.getElementById('fs-hint');
    hint.classList.remove('hidden');
  }
  syncFsButtons();
  resize();
}

document.querySelectorAll('.btn-fs').forEach((b) => {
  b.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFullscreen();
  });
});
document.getElementById('btn-resume').addEventListener('click', (e) => {
  e.preventDefault();
  play.setPaused(false);
});
document.getElementById('opt-invert').addEventListener('click', (e) => {
  e.preventDefault();
  Settings.setInvertY(!Settings.invertY);
  syncSettingsUI();
});
document.getElementById('opt-haptics').addEventListener('click', (e) => {
  e.preventDefault();
  Settings.setHaptics(!Settings.haptics);
  syncSettingsUI();
  if (Settings.haptics) {
    AudioFX.init();
    Settings.rumble(25);
    AudioFX.shoot();
  }
});
document.addEventListener('fullscreenchange', syncFsButtons);
document.addEventListener('webkitfullscreenchange', syncFsButtons);
syncSettingsUI();

const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const input = Input.sample();
  titleT += dt;

  if (mode === 'title') {
    if (titleShip) {
      titleShip.rotation.y = Math.sin(titleT * 0.4) * 0.5 + 0.4;
      titleShip.rotation.x = Math.sin(titleT * 0.7) * 0.08;
      titleShip.position.y = -1.35 + Math.sin(titleT) * 0.12;
    }
    wingmen.forEach((w, i) => {
      w.rotation.y = titleT * 0.2 * (i ? -1 : 1);
      w.position.y = -1.55 + Math.sin(titleT * 1.3 + i) * 0.15;
    });
    if (titleStars) titleStars.rotation.y += dt * 0.02;
    camera.position.x = Math.sin(titleT * 0.15) * 0.4;
    camera.lookAt(0, -0.6, -8);
    if (holdoff > 0) holdoff = Math.max(0, holdoff - dt);
    else if (input.start && titleT > 0.3) launchFromTitle();
  } else if (mode === 'brief') {
    holdoff = Math.max(0, holdoff - dt);
    if (holdoff <= 0 && (input.fire || input.start)) enterPlay();
  } else if (mode === 'play') {
    const over = play.update(dt, input);
    if (over) {
      mode = 'end';
      holdoff = 0.7;
    }
  } else if (mode === 'end') {
    holdoff = Math.max(0, holdoff - dt);
    if (holdoff <= 0 && input.start) enterTitle();
  }

  renderer.render(scene, camera);
}

const boot = new URLSearchParams(location.search).get('scene');
if (boot === 'play') enterPlay();
else enterTitle();
frame();
