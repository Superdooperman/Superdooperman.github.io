const CACHE = 'choppa-v35';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-box-192.png',
  './icons/icon-box-512.png',
  './assets/boxart.jpg',
  './assets/boxart.webp',
  './js/main.js?v=35',
  './js/audio.js?v=35',
  './js/motion.js?v=35',
  './js/input.js?v=35',
  './js/sprites.js?v=35',
  './js/game.js?v=35',
  './art/chopper.png',
  './art/people.png',
  './art/enemies.png',
  './art/barracks.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => (k.startsWith('choplifter-') || k.startsWith('choppa-')) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

function wantsNetwork(url) {
  return url.pathname.endsWith('.html')
    || url.pathname.endsWith('.js')
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('/');
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.mode === 'navigate' || wantsNetwork(url)) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});
