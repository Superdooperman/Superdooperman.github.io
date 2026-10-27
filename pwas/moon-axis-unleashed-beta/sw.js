// BETA (terrain test): own cache prefix 'mau-beta-' so it never touches live Unleashed (moon-axis-unleashed-*), Moon Axis (moon-axis-v*) or mxbeta-* caches.
const CACHE = 'mau-beta-v1';
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
  './js/cheats.js',
  '../moon-axis/music/sortie1-cislunar.mp3',
  '../moon-axis/music/sortie2-schrodinger.mp3',
  '../moon-axis/music/sortie3-trench.mp3',
  '../moon-axis/music/sortie3-boss.mp3',
  '../moon-axis/music/sortie3-eject.mp3',
  '../moon-axis/music/sortie3-sichel-down.mp3',
  '../moon-axis/music/sortie3-sichel-gone.mp3',
  '../moon-axis/music/sortie4-fork.mp3',
  '../moon-axis/music/sortie4-rescue.mp3',
  '../moon-axis/music/sortie4-fork-live.mp3',
  '../moon-axis/music/sortie4-fork-dead.mp3',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('mau-beta-') && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
