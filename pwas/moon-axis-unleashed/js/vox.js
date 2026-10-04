const LINES = {
  cat_launch_01: "Voidcat's up. Tailhook's still on. Don't ask.",
  cat_launch_02: "Deck looks smaller from up here.",
  cat_launch_03: "One moon. Three problems. Let's go.",
  cat_launch_04: "If I die, tell the fusion ring it was pretty.",
  cat_launch_05: "Tell the deck I'm still ugly enough to launch.",
  cat_kill_01: "Splash. Send the next one.",
  cat_kill_02: "That's a wing you don't get back.",
  cat_kill_03: "Too slow for a dart.",
  cat_kill_04: "Painted him. Next.",
  cat_kill_05: "Fork would've liked that one.",
  cat_hurt_01: "She holds. She always holds.",
  cat_hurt_02: "Shields are a suggestion.",
  cat_hurt_03: "Don't you quit on me, you fat beautiful boat.",
  cat_hurt_04: "Okay. Now I'm insulted.",
  cat_hurt_05: "Hook, I'm leaking pretty.",
  cat_boss_01: "Wide wing. Bad manners.",
  cat_boss_02: "Train doesn't get a vote.",
  cat_boss_03: "Geist. Heard you were rare.",
  cat_boss_04: "You ejected. Rude.",
  cat_boss_05: "Core's a bell. I'm the clapper.",
  cat_win_01: "Pacific stays blue. That's the order.",
  cat_win_02: "Out of the well. Somebody catch me.",
  cat_win_03: "Tell Hale I still got the hook.",
  cat_lose_01: "Rod's still up. Then so am I.",
  cat_radio_01: "She peeled off. That's the job.",
  cat_radio_02: "Save the speech. I'm coming in on the hook anyway.",
  cat_radio_03: "Hook. I'm not done being a problem.",
  hale_bark_01: "Do not let them finish the rod.",
  hale_bark_02: "Three sorties. One moon. Launch.",
  hale_bark_03: "Fork's off the board.",
  hale_bark_04: "That was the gun. Not the hand.",
  hale_bark_05: "Come home on the hook.",
  hale_bark_06: "Cat. Turn around.",
  hale_bark_07: "The Pacific's still blue.",
  hale_bark_08: "Cut him off.",
  hale_bark_09: "Sichel burned over Selene. If something wide comes up the throat, it isn't him. Shoot it anyway.",
  hale_brief_01: "Cat. Selene's dark. That was the gun, not the hand. Far side is lighting up a second crater. Kesselgrube.",
  hale_brief_02: "Fork's off the board. Don't sit on that channel. She peeled a pair so the hogs could line up. Stabzug is on the rail. Match speed. Kill the cradle.",
  hale_brief_03: "The yard is slag. The rod didn't leave. The Staff. Mouth looks like a crater. It isn't. Launch.",
  fork_01: "Starfork, on your left. Try not to hog it.",
  fork_02: "Starfork's fueled. I got your left.",
  fork_03: "Pair on me. I'm peeling.",
  fork_04: "Cat, yard doors are shut. Open them.",
  fork_05: "Tell Hale I—",
  mond_01: "Selene sees you.",
  mond_02: "The rod is already falling.",
  mond_03: "Vacuum does not take prisoners.",
  mond_04: "Turn around. The dark side is ours.",
  mond_05: "Your hook has nothing to catch.",
  mond_06: "Staff does not miss.",
  mond_07: "Little boat. Big grave.",
  nacht_01: "Head-on. Then we turn.",
  wurger_01: "Pair. Now.",
  wurger_02: "He is mine. You take the wingman.",
  stuka_01: "Dive. Dive. The deck is already dead.",
  geist_01: "Rare enough for you?",
  geist_02: "I only come down for the cradle.",
  sichel_01: "You cracked my wing. I kept the name.",
  sichel_02: "Leading edge. Don't blink.",
  sichel_03: "See you in the throat.",
  sichel_04: "The Staff kept a seat for you.",
  sichel_05: "Wide wing. You still can't read it.",
  sichel_alt_01: "Ejected. Rude of me. Still flying.",
  sichel_alt_02: "Second wing. Same pilot. Try to finish it.",
  sichel_alt_03: "If the well closes, I go with it. So do you.",
  rabe_01: "The fortress was a courtesy.",
  rabe_02: "We chose the Moon over the ruins.",
  rabe_03: "That was the match.",
  rabe_04: "Burn with it, or fly.",
  rabe_radio_01: "Pacific Void Command. You broke a battery and a yard. The Staff thanks you for the map.",
  rabe_radio_02: "You are already in the mouth, Captain. We simply haven't closed it.",
  rabe_radio_03: "That was the match. The Staff is the weapon. Burn with it, or fly.",
  card_01: "Sortie one. Dark side.",
  card_02: "Sortie two. Stay low.",
  card_03: "Sortie three. Kill the rod.",
  card_04: "Kesselgrube. The yard is awake.",
  card_05: "Stabzug. Match speed.",
  card_06: "Inside the Staff.",
  card_07: "Out of the well.",
};

const IDS = Object.keys(LINES);

function speakerOf(id) {
  if (id.startsWith('cat_')) return 'CAT';
  if (id.startsWith('hale_')) return 'HALE';
  if (id.startsWith('fork_')) return 'FORK';
  if (id.startsWith('rabe_')) return 'RABE';
  if (id.startsWith('sichel_')) return 'SICHEL';
  if (id.startsWith('geist_')) return 'GEIST';
  if (id.startsWith('card_')) return 'PVC';
  if (id.startsWith('nacht_') || id.startsWith('wurger_') || id.startsWith('stuka_') || id.startsWith('mond_')) return 'MONDSTAB';
  return 'RADIO';
}

const PORT_KEY = {
  CAT: 'cat', HALE: 'hale', FORK: 'fork', RABE: 'rabe', SICHEL: 'sichel', GEIST: 'geist', MONDSTAB: 'mond',
};

function isCloseCue(id) {
  return /^(cat_hurt_|cat_kill_|fork_03|fork_05|sichel_|geist_|mond_|nacht_|wurger_|stuka_)/.test(id);
}

function portraitFor(id) {
  const key = PORT_KEY[speakerOf(id)];
  if (!key) return null;
  return isCloseCue(id)
    ? `../moon-axis/img/portraits/port_${key}_close.png`
    : `../moon-axis/img/portraits/port_${key}.png`;
}

const Vox = (() => {
  let ctx = null;
  let master = null;
  const buffers = new Map();
  let flags = { forkDead: false, sichelAlive: true };
  let barkUntil = 0;
  let radioSrc = null;
  let radioQueue = [];
  let radioBusy = false;
  let combatSrc = null;
  let combatQueue = [];
  let subtitleTimer = 0;
  let preloadPromise = null;
  let radioCueCb = null;
  let radioIdleCb = null;
  let muted = false;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (!master) {
      master = ctx.createGain();
      master.gain.value = 0.88;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function subtitle(id, durMs) {
    const el = document.getElementById('radio');
    if (!el) return;
    const who = document.getElementById('radio-who');
    const line = document.getElementById('radio-line');
    const port = document.getElementById('radio-port');
    if (who) who.textContent = speakerOf(id);
    if (line) line.textContent = LINES[id] || id;
    const src = portraitFor(id);
    el.classList.toggle('no-port', !src);
    el.classList.toggle('close', isCloseCue(id));
    if (port) {
      if (src) {
        port.src = src;
        port.alt = speakerOf(id);
      } else {
        port.removeAttribute('src');
        port.alt = '';
      }
    }
    el.classList.remove('hidden');
    clearTimeout(subtitleTimer);
    const hold = durMs || (id.startsWith('hale_brief') ? 22000 : id.startsWith('rabe_radio') ? 10000 : 3200);
    subtitleTimer = setTimeout(() => el.classList.add('hidden'), hold);
  }

  function allowed(id) {
    if (!id) return false;
    if (id.startsWith('sichel_alt') && !flags.sichelAlive) return false;
    if (id === 'cat_kill_05' && !flags.forkDead) return false;
    if (id.startsWith('fork_') && id !== 'fork_05' && flags.forkDead) return false;
    if (id === 'hale_brief_02' && !flags.forkDead) return false;
    if (id === 'cat_radio_01' && !flags.forkDead) return false;
    if (id === 'hale_bark_09' && flags.sichelAlive) return false;
    if (id === 'hale_brief_03' && !flags.sichelAlive) return false;
    return true;
  }

  function playBuffer(id, { radio = false, combat = false } = {}) {
    const buf = buffers.get(id);
    if (!buf) {
      subtitle(id);
      return null;
    }
    const ac = ensure();
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start();
    subtitle(id, buf.duration * 1000 + 400);
    if (radio) {
      radioSrc = src;
      if (radioCueCb) radioCueCb(id);
      src.onended = () => {
        if (radioSrc === src) radioSrc = null;
        pumpRadio();
      };
    } else if (combat) {
      combatSrc = src;
      src.onended = () => {
        if (combatSrc === src) combatSrc = null;
        pumpCombat();
      };
    }
    return src;
  }

  function pumpRadio() {
    if (radioSrc) return;
    const next = radioQueue.shift();
    if (!next) {
      radioBusy = false;
      if (radioIdleCb) radioIdleCb();
      pumpCombat();
      return;
    }
    radioBusy = true;
    const src = playBuffer(next, { radio: true });
    if (!src) setTimeout(pumpRadio, 700);
  }

  function pumpCombat() {
    if (radioBusy || combatSrc) return;
    const next = combatQueue.shift();
    if (!next) return;
    const src = playBuffer(next, { combat: true });
    if (!src) pumpCombat();
  }

  function enqueueCombat(id, priority) {
    if (priority) combatQueue.unshift(id);
    else if (combatQueue.length < 2) combatQueue.push(id);
    if (combatQueue.length > 2) combatQueue.length = 2;
  }

  const api = {
    lines: LINES,
    speakerOf,
    portraitFor,
    setFlags(next) {
      flags = { ...flags, ...next };
    },
    flags() {
      return flags;
    },
    duration(id) {
      const buf = buffers.get(id);
      return buf ? buf.duration : 0;
    },
    onRadioCue(fn) { radioCueCb = fn; },
    onRadioIdle(fn) { radioIdleCb = fn; },
    preload() {
      ensure();
      if (preloadPromise) return preloadPromise;
      const ports = ['cat', 'hale', 'fork', 'rabe', 'sichel', 'geist', 'mond']
        .flatMap((k) => [`../moon-axis/img/portraits/port_${k}.png`, `../moon-axis/img/portraits/port_${k}_close.png`]);
      preloadPromise = Promise.all([
        ...IDS.map(async (id) => {
          try {
            const res = await fetch(`../moon-axis/vox/${id}.mp3`);
            if (!res.ok) return;
            const raw = await res.arrayBuffer();
            const buf = await ensure().decodeAudioData(raw.slice(0));
            buffers.set(id, buf);
          } catch (_) { /* missing cue stays silent */ }
        }),
        ...ports.map((src) => new Promise((resolve) => {
          const im = new Image();
          im.onload = im.onerror = resolve;
          im.src = src;
        })),
      ]);
      return preloadPromise;
    },
    play(id, opts = {}) {
      if (muted) return;
      if (!allowed(id)) return;
      if (combatSrc || radioBusy) {
        enqueueCombat(id, !!opts.priority);
        return;
      }
      playBuffer(id, { combat: true });
    },
    bark(bank) {
      const ac = ensure();
      if (ac.currentTime < barkUntil) return;
      let ids;
      if (bank === 'cat_kill') {
        ids = ['cat_kill_01', 'cat_kill_02', 'cat_kill_03', 'cat_kill_04'];
        if (flags.forkDead) ids.push('cat_kill_05');
      } else if (bank === 'cat_hurt') {
        ids = ['cat_hurt_01', 'cat_hurt_02', 'cat_hurt_03', 'cat_hurt_04', 'cat_hurt_05'];
      } else if (bank === 'cat_launch') {
        ids = ['cat_launch_01', 'cat_launch_02', 'cat_launch_03', 'cat_launch_04', 'cat_launch_05'];
      } else if (bank === 'mond') {
        ids = ['mond_01', 'mond_02', 'mond_03', 'mond_04', 'mond_05', 'mond_06', 'mond_07'];
      } else if (Array.isArray(bank)) {
        ids = bank;
      } else {
        ids = [bank];
      }
      if (!ids.length) return;
      const id = ids[(Math.random() * ids.length) | 0];
      barkUntil = ac.currentTime + 2.2;
      this.play(id);
    },
    radio(ids) {
      if (muted) return;
      const list = (Array.isArray(ids) ? ids : [ids]).filter(allowed);
      radioQueue.push(...list);
      pumpRadio();
    },
    stopRadio() {
      radioQueue = [];
      radioBusy = false;
      if (radioSrc) {
        try { radioSrc.stop(); } catch (_) { /* already ended */ }
        radioSrc = null;
      }
    },
    flushCombat() {
      combatQueue = [];
      if (combatSrc) {
        try { combatSrc.stop(); } catch (_) { /* already ended */ }
        combatSrc = null;
      }
    },
    live() {
      muted = false;
    },
    silence() {
      muted = true;
      barkUntil = 0;
      this.stopRadio();
      this.flushCombat();
      clearTimeout(subtitleTimer);
      const el = document.getElementById('radio');
      if (el) el.classList.add('hidden');
    },
    busy() {
      return radioBusy;
    },
  };
  return api;
})();

export default Vox;
