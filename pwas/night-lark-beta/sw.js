// Night Lark v2 beta service worker (BUILD-PLAN M5, risk 4). Its caches are all named
// "nlbeta-<version>", and activate only ever deletes older "nlbeta-" caches: v1's "night-lark-*",
// Classic's "nlclassic-*" and every other azzato.live cache are left alone.
// Navigations are network-first (a new deploy shows up on the next online load) with the cached
// page as the offline fallback; everything else is cache-first from the precache.
// tools/build-beta.mjs fills in VERSION and PRECACHE; the dev page never registers this file.
const VERSION = 'e26d8eeda9';
const PRECACHE = ["./","./art/in/char_lark_turnaround.png","./art/in/guard-watchman.png","./art/in/lamp.png","./art/in/lark-cloak-open.png","./art/in/lark-gun-out.png","./art/in/lark-idle.png","./art/in/tiles-harbor.png","./art/manifest.json","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-480.png","./index.html","./js/art.js","./js/audio.js","./js/canvas.js","./js/chain.js","./js/config.js","./js/font.js","./js/fx.js","./js/game.js","./js/gen/generator.js","./js/gen/moves.js","./js/gen/rng.js","./js/gen/template.js","./js/gen/templates.js","./js/gen/validator.js","./js/input.js","./js/level.js","./js/levels/first-ring.js","./js/levels/watch-room.js","./js/loop.js","./js/los.js","./js/main.js","./js/physics.js","./js/powerups.js","./js/prompts.js","./js/pwa.js","./js/render.js","./js/rope.js","./js/run.js","./js/save.js","./js/screens.js","./js/shell.js","./js/sim.js","./js/stealth.js","./js/targeting.js","./js/touch.js","./js/wren.js","./manifest.webmanifest"];
const PREFIX = 'nlbeta-';
const CACHE = PREFIX + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.open(CACHE).then((c) => c.match('./index.html')).then((r) => r || caches.match(req, { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) c.put(req, res.clone());
    return res;
  }))));
});
