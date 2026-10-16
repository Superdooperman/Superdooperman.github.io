// Bump VERSION (only place) to roll the cache.
// Prefix deliberately NOT 'moon-axis-': the live moon-axis sw deletes every 'moon-axis-*' cache.
const VERSION = 19;
const PREFIX = 'mxbeta-';
const CACHE = `${PREFIX}v${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/main.js',
  './js/audio.js',
  './js/vox.js',
  './js/input.js',
  './js/settings.js',
  './js/scores.js',
  './js/render/vector.js',
  './js/ships/catalog.js',
  './js/scenes/play.js',
  './music/sortie1-cislunar.mp3',
  './music/sortie2-schrodinger.mp3',
  './music/sortie3-trench.mp3',
  './music/sortie3-boss.mp3',
  './music/sortie3-eject.mp3',
  './music/sortie3-sichel-down.mp3',
  './music/sortie3-sichel-gone.mp3',
  './music/sortie4-fork.mp3',
  './music/sortie4-rescue.mp3',
  './music/sortie4-fork-live.mp3',
  './music/sortie4-fork-dead.mp3',
  './vendor/three.module.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const RUNTIME = /\/(img|vox)\//;
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never cache cross-origin
  const put = (res) => {
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };
  if (RUNTIME.test(url.pathname)) {
    // Cache-first for big immutable media (img/vox), filled at runtime.
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put)));
    return;
  }
  // Network-first for code/HTML so updates land; cache fallback offline.
  e.respondWith(fetch(req).then(put).catch(() => caches.match(req)));
});
