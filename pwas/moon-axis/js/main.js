import * as THREE from 'three';
import Input from './input.js';
import AudioFX from './audio.js';
import Vox from './vox.js';
import Settings from './settings.js';
import Scores from './scores.js';
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

function paintHi() {
  document.getElementById('title-hi').textContent = `HI SCORE ${Scores.pad(Scores.best())}`;
  document.getElementById('hud-hi').textContent = `HI ${Scores.pad(Scores.best())}`;
}
paintHi();

let mode = 'title';
let titleShip = null;
let titleStars = null;
let wingmen = [];
let briefStage = 0;
let holdoff = 0;
let titleT = 0;
let briefLocked = true;
let attractOn = false;
let attractT = 0;
let attractStep = 0;
let attractSeq = [];
let charRotate = 0;
let stillTimer = 0;

const ATTRACT_IDLE = 14;
const ATTRACT_HOLD = 6;
const ATTRACT_REST = 8;

const ATTRACT_STORY = [
  { img: 'img/attract/attract_01_void.jpg', title: 'THE PACIFIC VOID, 1947.', body: 'THE WAR DID NOT STOP AT THE SEA.\nIT WENT UP.' },
  { img: 'img/attract/attract_02_selene.jpg', title: 'MONDSTAB HOLDS THE FAR SIDE.', body: 'FESTUNG SELENE.\nA GUN CUT FROM THE MOON ITSELF.' },
  { img: 'img/attract/attract_03_rail.jpg', title: 'ONE ROD HAS ALREADY FIRED.', body: 'A SECOND IS ON THE RAIL.\nTHE YARD THAT FEEDS IT IS MOVING.' },
  { img: 'img/attract/attract_04_doors.jpg', title: 'YOU ARE CAT.', body: 'F6F-V VOIDCAT.\nHALE HAS THE DECK. FORK HAS YOUR WING.\nOPEN THE DOORS.\nBE WARY OF A CHANNEL THAT GOES QUIET.' },
];
const ATTRACT_CHARS = [
  { kind: 'char', img: 'img/charcards/charcard_catshadow.jpg', title: 'CAT', body: 'Voidcat. The seat you are in.\nPacific Void Command. No face on the wire, on purpose.\nFlies the F6F-V. Guns, a fusion ring, and a mouth he should use less.\nIf the channel is quiet, he is still up.' },
  { kind: 'char', img: 'img/charcards/charcard_hale.jpg', title: 'HALE', body: 'Captain. Flag bridge, carrier in orbit.\nGives the order and does not decorate it.\nThree things, then launch. He counts you home on the hook.' },
  { kind: 'char', img: 'img/charcards/charcard_fork.jpg', title: 'FORK', body: 'Lieutenant Reyes. Callsign Fork.\nYour wing. Twin-boom fighter, cyan mark on the helmet.\nShe peels targets off you and does not ask you to thank her.\nIf her channel goes quiet, do not sit on it.' },
  { kind: 'char', img: 'img/charcards/charcard_sichel.jpg', title: 'SICHEL', body: 'Mondsichel. Flying wing.\nThe rival. Wide turn, long gun, red crescent.\nHe talks like the fight is a courtesy.\nDo not chase him off the brief.' },
  { kind: 'char', img: 'img/charcards/charcard_geist.jpg', title: 'GEIST', body: 'Silbergeist. Twin nacelle.\nHe does not fly the patrol. He comes down for the rod.\nSilver helmet, two engines, mean on the wire.\nIf the cradle is still alive, he is already in the dark.' },
  { kind: 'char', img: 'img/charcards/charcard_rabe.jpg', title: 'RABE', body: 'Oberst. Festung Selene.\nThe man at the foundry console, not the man in the dart.\nCalm. The gun is his. The moon is the barrel.\nHe will still be talking when the well starts to close.' },
  { kind: 'char', img: 'img/charcards/charcard_mond.jpg', title: 'MONDSTAB', body: 'Dart pilot. The ones in the trench.\nRed crescent, short life, shorter temper.\nThey are the noise on the channel.\nThe aces are the ones who do not yell.' },
];
const BRIEF_STILLS = {
  hale_brief_01: [
    { src: 'img/briefings/brief01_01_kesselgrube.jpg', cap: 'Far side is lighting up a second crater. Kesselgrube.' },
    { src: 'img/briefings/brief01_02_second_rod.jpg', cap: "They're loading another rod." },
    { src: 'img/briefings/brief01_03_doors.jpg', cap: 'Moonhogs will follow once you open the doors.' },
  ],
  hale_brief_02: [
    { src: 'img/briefings/brief02_01_stabzug.jpg', cap: 'Stabzug is on the rail.' },
    { src: 'img/briefings/brief02_02_cradle.jpg', cap: 'Meteor-iron flatcars, a cradle.' },
    { src: 'img/briefings/brief02_03_aa_tail.jpg', cap: 'AA cars on the tail.' },
    { src: 'img/briefings/brief02_04_geist.jpg', cap: "If a twin-engine ghost drops in, that's Geist." },
  ],
  hale_brief_03: [
    { src: 'img/briefings/brief03_01_rod_stayed.jpg', cap: "The yard is slag. The rod didn't leave." },
    { src: 'img/briefings/brief03_02_mouth.jpg', cap: "Mouth looks like a crater. It isn't." },
    { src: 'img/briefings/brief03_03_foundry.jpg', cap: 'You fly in, you kill the foundry, you fly out.' },
    { src: 'img/briefings/brief03_04_sichel.jpg', cap: 'If Sichel is on the channel, do not chase him.' },
  ],
};

function setBriefLocked(on) {
  briefLocked = !!on;
  const btn = document.getElementById('btn-brief');
  if (btn) btn.textContent = briefLocked ? 'SKIP' : 'LAUNCH';
  play.setBriefReady?.(!briefLocked);
}

function hideStills() {
  clearInterval(stillTimer);
  stillTimer = 0;
  const wrap = document.getElementById('brief-stills');
  if (wrap) wrap.classList.add('hidden');
}

function showStill(slide) {
  const wrap = document.getElementById('brief-stills');
  const img = document.getElementById('brief-still');
  const cap = document.getElementById('brief-caption');
  if (!wrap || !img) return;
  wrap.classList.remove('hidden');
  img.src = slide.src;
  if (cap) cap.textContent = slide.cap || '';
}

function startBriefStills(id) {
  const slides = BRIEF_STILLS[id];
  if (!slides || !slides.length) return;
  clearInterval(stillTimer);
  const dur = Math.max(4, (Vox.duration(id) || slides.length * 5) / slides.length);
  let i = 0;
  showStill(slides[0]);
  stillTimer = setInterval(() => {
    i += 1;
    if (i >= slides.length) {
      clearInterval(stillTimer);
      stillTimer = 0;
      return;
    }
    showStill(slides[i]);
  }, dur * 1000);
}

function paintAttractCard(card) {
  const wrap = document.getElementById('attract-card');
  const img = document.getElementById('attract-img');
  const title = document.getElementById('attract-title');
  const body = document.getElementById('attract-body');
  const kicker = document.getElementById('attract-kicker');
  if (wrap) wrap.classList.toggle('char', card.kind === 'char');
  if (img) img.src = card.img;
  if (kicker) kicker.textContent = card.kicker || 'PACIFIC VOID COMMAND';
  if (title) title.textContent = card.title || '';
  if (body) body.textContent = card.body || '';
}

function buildAttractSeq() {
  const chars = [];
  for (let i = 0; i < 3; i++) chars.push(ATTRACT_CHARS[(charRotate + i) % ATTRACT_CHARS.length]);
  charRotate = (charRotate + 3) % ATTRACT_CHARS.length;
  return [
    ...ATTRACT_STORY,
    ...chars,
    { img: 'img/attract/attract_montage.jpg', title: '', body: '', kicker: 'MOON AXIS' },
  ];
}

function startAttract() {
  attractOn = true;
  attractT = 0;
  attractStep = 0;
  attractSeq = buildAttractSeq();
  show('title', false);
  show('attract', true);
  paintAttractCard(attractSeq[0]);
}

function stopAttract() {
  attractOn = false;
  attractT = 0;
  attractStep = 0;
  titleT = ATTRACT_IDLE - ATTRACT_REST;
  show('attract', false);
  if (mode === 'title') show('title', true);
}

Vox.onRadioCue((id) => startBriefStills(id));
Vox.onRadioIdle(() => {
  if (mode === 'brief' || play.isIntermission?.()) setBriefLocked(false);
});

function clearScene() {
  while (scene.children.length) scene.remove(scene.children[0]);
}

function show(id, on) {
  document.getElementById(id).classList.toggle('hidden', !on);
}

function enterTitle(opts = {}) {
  mode = 'title';
  titleT = 0;
  holdoff = opts.quiet ? 1.35 : 0.45;
  attractOn = false;
  hideStills();
  clearScene();
  document.body.classList.remove('playing');
  Vox.live();
  Vox.stopRadio();
  Vox.flushCombat();
  const radioEl = document.getElementById('radio');
  if (radioEl) radioEl.classList.add('hidden');
  show('title', true);
  show('attract', false);
  show('briefing', false);
  show('end', false);
  show('scores', false);
  show('banner', false);
  paintHi();
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
  AudioFX.stopStage();
  AudioFX.startMusic();
}

function enterBrief(stageIndex) {
  mode = 'brief';
  briefStage = stageIndex;
  holdoff = 0.4;
  hideStills();
  stopAttract();
  const s = play.STAGES[stageIndex];
  show('title', false);
  show('attract', false);
  show('end', false);
  show('scores', false);
  show('briefing', true);
  document.getElementById('brief-kicker').textContent = s.briefKicker;
  document.getElementById('brief-title').textContent = s.briefTitle;
  const body = typeof s.briefBody === 'function' ? s.briefBody({ forkDead: false, sichelAlive: true }) : s.briefBody;
  document.getElementById('brief-body').textContent = body;
  setBriefLocked(true);
  Vox.preload();
  Vox.live();
  Vox.stopRadio();
  Vox.radio(s.radio({ forkDead: false, sichelAlive: true }));
}

function enterPlay(stageIndex = 0) {
  if (mode === 'play') return;
  mode = 'play';
  AudioFX.stopMusic();
  AudioFX.init();
  Vox.live();
  Vox.stopRadio();
  Vox.flushCombat();
  hideStills();
  clearScene();
  show('briefing', false);
  show('title', false);
  show('attract', false);
  show('scores', false);
  play.enter(stageIndex);
}

function launchFromTitle() {
  AudioFX.init();
  enterBrief(0);
}
document.getElementById('btn-start').addEventListener('click', launchFromTitle);
document.getElementById('btn-scores').addEventListener('click', (e) => {
  e.preventDefault();
  mode = 'scores';
  holdoff = 0.25;
  show('title', false);
  show('scores', true);
  document.getElementById('scores-best').textContent = `HI ${Scores.pad(Scores.best())}`;
  Scores.render(document.getElementById('scores-table'));
  document.getElementById('ace-reels-title').classList.add('hidden');
});
document.getElementById('btn-scores-back').addEventListener('click', (e) => {
  e.preventDefault();
  enterTitle();
});
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function tagToIdx(tag) {
  const t = (tag || 'ACE').padEnd(3, 'A').slice(0, 3).toUpperCase();
  return [...t].map((ch) => {
    const i = ALPHA.indexOf(ch);
    return i < 0 ? 0 : i;
  });
}

function makeReelState(tag) {
  return {
    idx: tagToIdx(tag),
    slot: 0,
    locked: [false, false, false],
    done: false,
    cycleLatch: 0,
    cycleWait: 0,
    slotLatch: 0,
    slotWait: 0,
    fireLatch: false,
  };
}

let endReel = null;
let titleReel = makeReelState(Scores.tag());
let pendingOver = null;

function neighbor(i, d) {
  return ALPHA[(i + d + ALPHA.length) % ALPHA.length];
}

function paintReelMount(el, st) {
  if (!el) return;
  el.classList.toggle('is-done', !!st.done);
  const cells = st.idx.map((n, i) => {
    const cls = [
      'reel',
      i === st.slot && !st.done ? 'active' : '',
      st.locked[i] ? 'locked' : '',
    ].filter(Boolean).join(' ');
    const up = st.done ? '&nbsp;' : neighbor(n, -1);
    const dn = st.done ? '&nbsp;' : neighbor(n, 1);
    return `<button type="button" class="${cls}" data-slot="${i}" ${st.done ? 'disabled' : ''}>
      <span class="up">${up}</span>
      <span class="ch">${ALPHA[n]}</span>
      <span class="dn">${dn}</span>
    </button>`;
  }).join('');
  const nav = st.done
    ? '<p class="hint">INITIALS LOCKED</p>'
    : `<div class="reel-nav">
      <button type="button" data-act="back">◀ BACK</button>
      <button type="button" data-act="lock">SET LETTER</button>
    </div>
    <p class="hint">W/S ▲▼ LETTER · A/D ◀▶ WHEEL · FIRE SETS</p>`;
  el.innerHTML = `<p class="reel-kicker">${st.done ? 'ACE LOCKED' : 'ACE'}</p><div class="reel-row">${cells}</div>${nav}`;
}

function reelTag(st) {
  return st.idx.map((n) => ALPHA[n]).join('');
}

function cycleReel(st, dir) {
  if (st.done || st.locked[st.slot]) return;
  st.idx[st.slot] = (st.idx[st.slot] + dir + ALPHA.length) % ALPHA.length;
}

function lockReel(st) {
  if (st.done) return false;
  st.locked[st.slot] = true;
  if (st.slot < 2) st.slot += 1;
  else return true;
  return false;
}

function backReel(st) {
  if (st.done) return;
  st.locked[st.slot] = false;
  if (st.slot > 0) {
    st.slot -= 1;
    st.locked[st.slot] = false;
  }
}

function shiftReelSlot(st, dir) {
  if (st.done || !dir) return false;
  const next = Math.max(0, Math.min(2, st.slot + dir));
  if (next === st.slot) return false;
  st.slot = next;
  st.locked[st.slot] = false;
  return true;
}

function bindReelMount(el, getSt, onPaint, onComplete) {
  el.addEventListener('click', (e) => {
    const st = getSt();
    if (!st || st.done) return;
    const slotBtn = e.target.closest('[data-slot]');
    const act = e.target.closest('[data-act]');
    if (slotBtn) {
      const i = Number(slotBtn.getAttribute('data-slot'));
      if (i <= st.slot || st.locked[i] === false) {
        for (let k = i; k < 3; k++) st.locked[k] = false;
        st.slot = i;
      }
      if (e.target.classList.contains('up')) cycleReel(st, -1);
      if (e.target.classList.contains('dn')) cycleReel(st, 1);
      onPaint();
      return;
    }
    if (!act) return;
    const a = act.getAttribute('data-act');
    if (a === 'back') backReel(st);
    if (a === 'lock') {
      if (lockReel(st) && onComplete) onComplete(st);
    }
    onPaint();
  });
}

function paintEndReels() {
  paintReelMount(document.getElementById('ace-reels-end'), endReel);
  const conf = document.getElementById('reel-confirm');
  const again = document.getElementById('btn-again');
  if (!endReel) return;
  const ready = endReel.locked[0] && endReel.locked[1] && endReel.locked[2] && !endReel.done;
  conf.classList.toggle('hidden', !ready);
  again.classList.add('hidden');
}

function paintTitleReels() {
  paintReelMount(document.getElementById('ace-reels-title'), titleReel);
}

function confirmEndReels() {
  if (!endReel || endReel.done || !pendingOver) return;
  endReel.done = true;
  const tag = Scores.setTag(reelTag(endReel));
  const posted = Scores.submit({
    score: pendingOver.score,
    stage: pendingOver.stage,
    won: pendingOver.won,
  });
  const rank = posted.rank && posted.rank <= 10 ? `   RANK ${posted.rank}` : '';
  document.getElementById('end-score').textContent = `SCORE ${Scores.pad(pendingOver.score)}   HI ${Scores.pad(posted.best)}${rank}`;
  Scores.render(document.getElementById('end-table'), posted.row.t);
  paintHi();
  paintEndReels();
  holdoff = 6;
}

bindReelMount(document.getElementById('ace-reels-end'), () => endReel, paintEndReels, () => {
  confirmEndReels();
});
bindReelMount(document.getElementById('ace-reels-title'), () => titleReel, () => {
  Scores.setTag(reelTag(titleReel));
  paintTitleReels();
}, () => {
  Scores.setTag(reelTag(titleReel));
});
document.getElementById('reel-confirm').addEventListener('click', (e) => {
  e.preventDefault();
  confirmEndReels();
});

function stepReels(st, input, paint, onAllLocked, dt = 1 / 60) {
  if (!st || st.done) return;
  let dir = 0;
  if (input.reelUp) dir = -1;
  else if (input.reelDown) dir = 1;
  else if (Math.abs(input.reelY || 0) > 0.4) dir = input.reelY > 0 ? -1 : 1;
  st.cycleWait = (st.cycleWait || 0) - dt;
  if (dir) {
    if (st.cycleLatch !== dir) {
      cycleReel(st, dir);
      st.cycleLatch = dir;
      st.cycleWait = 0.28;
      paint();
    } else if (st.cycleWait <= 0) {
      cycleReel(st, dir);
      st.cycleWait = 0.11;
      paint();
    }
  } else {
    st.cycleLatch = 0;
    st.cycleWait = 0;
  }
  let slotDir = 0;
  if (input.reelLeft) slotDir = -1;
  else if (input.reelRight) slotDir = 1;
  else if (Math.abs(input.reelX || 0) > 0.45) slotDir = Math.sign(input.reelX);
  st.slotWait = (st.slotWait || 0) - dt;
  if (slotDir) {
    if (st.slotLatch !== slotDir) {
      if (shiftReelSlot(st, slotDir)) paint();
      st.slotLatch = slotDir;
      st.slotWait = 0.28;
    } else if (st.slotWait <= 0) {
      if (shiftReelSlot(st, slotDir)) paint();
      st.slotWait = 0.16;
    }
  } else {
    st.slotLatch = 0;
    st.slotWait = 0;
  }
  if (input.roll) {
    backReel(st);
    paint();
  }
  if ((input.fire || input.start) && !st.fireLatch) {
    st.fireLatch = true;
    const all = lockReel(st);
    if (all && onAllLocked) onAllLocked();
    else paint();
  }
  if (!input.fire && !input.start) st.fireLatch = false;
}
document.getElementById('btn-brief').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (mode === 'brief' && holdoff <= 0) enterPlay();
  else if (mode === 'play') play.continueBrief(true);
});
document.getElementById('attract').addEventListener('click', (e) => {
  e.preventDefault();
  if (attractOn) stopAttract();
});
document.getElementById('btn-again').addEventListener('click', () => {
  enterTitle();
});

function syncSettingsUI() {
  const inv = document.getElementById('opt-invert');
  const hap = document.getElementById('opt-haptics');
  inv.textContent = Settings.invertY ? 'INVERT Y  ON' : 'INVERT Y  OFF';
  inv.classList.toggle('on', Settings.invertY);
  hap.textContent = Settings.hapticLabel();
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
    if (attractOn) {
      attractT += dt;
      if (input.fire || input.start || input.pause) {
        stopAttract();
      } else if (attractT >= ATTRACT_HOLD) {
        attractT = 0;
        attractStep += 1;
        if (attractStep >= attractSeq.length) stopAttract();
        else paintAttractCard(attractSeq[attractStep]);
      }
    } else if (holdoff <= 0 && (input.start || input.fire) && titleT > 0.3) {
      launchFromTitle();
    } else if (titleT > ATTRACT_IDLE) {
      startAttract();
    }
  } else if (mode === 'brief') {
    holdoff = Math.max(0, holdoff - dt);
    if (!briefLocked && holdoff <= 0 && (input.fire || input.start)) enterPlay();
  } else if (mode === 'play') {
    const over = play.update(dt, input);
    if (over) {
      mode = 'end';
      pendingOver = over;
      document.getElementById('btn-again').classList.add('hidden');
      document.getElementById('reel-confirm').classList.add('hidden');
      const earned = Scores.qualifies(over.score);
      const reelsEl = document.getElementById('ace-reels-end');
      if (earned) {
        holdoff = 0.35;
        endReel = makeReelState(Scores.tag());
        reelsEl.classList.remove('hidden');
        paintEndReels();
      } else {
        holdoff = 6;
        endReel = null;
        reelsEl.classList.add('hidden');
        reelsEl.innerHTML = '';
        Scores.render(document.getElementById('end-table'));
      }
      paintHi();
    }
  } else if (mode === 'scores') {
    holdoff = Math.max(0, holdoff - dt);
  } else if (mode === 'end') {
    holdoff = Math.max(0, holdoff - dt);
    if (endReel && !endReel.done) {
      stepReels(endReel, input, paintEndReels, () => {
        confirmEndReels();
      }, dt);
    } else if (holdoff <= 0 && (!endReel || endReel.done)) {
      enterTitle({ quiet: true });
    }
  }

  renderer.render(scene, camera);
}

const params = new URLSearchParams(location.search);
const boot = params.get('scene');
const bootStage = Number.parseInt(params.get('stage') || '0', 10);
if (boot === 'play') enterPlay(Number.isFinite(bootStage) ? bootStage : 0);
else enterTitle();
frame();
