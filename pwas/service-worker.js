// Shared service worker for the /pwas/ shelf + tools.
// Games with their own sw.js (moon-axis/, phish-desk/, ...) register a narrower
// scope, so they are controlled by their own worker, not this one.
// VERSION is set by scripts/bump-sw.sh (content hash of shared files); run it before every push.
const VERSION = '20261013-b0d280d45e';
const PREFIX = 'pwas-shared-';
const CACHE = PREFIX + VERSION;
const CORE_CACHE = 'pwas-ffmpeg-core-0.12.10';
const PRECACHE = [
  './', './index.html', './inkblob.css', './sw-register.js', './manifest.webmanifest',
  './fonts/LilitaOne-Regular.woff2', './boxart/moon-axis-cover.webp', './boxart/moon-axis-unleashed-cover.webp', './fonts/OFL.txt',
  './games/shelf.css', './brand/superdoop-arcade.svg',
  './TimeTracker.html', './time-manifest.json', './time/app.js', './time/egg.js', './time/rooster.js', './time/time.css',
  './time/icon-192.png', './time/icon-512.png', './time/rooster-sprites.png',
  './video-toolbox.html', './Video-downloader.html', './x-pulse.html', './games/video-downloader.html', './games/x-pulse.html', './video-toolbox-manifest.json', './video-toolbox/app.js', './video-toolbox/vt.css',
  './video-toolbox/icon-192.png', './video-toolbox/icon-512.png', './video-toolbox/LilitaOne-Regular.ttf',
  './video-toolbox/vendor/ffmpeg/index.js', './video-toolbox/vendor/ffmpeg/classes.js', './video-toolbox/vendor/ffmpeg/const.js',
  './video-toolbox/vendor/ffmpeg/errors.js', './video-toolbox/vendor/ffmpeg/types.js', './video-toolbox/vendor/ffmpeg/utils.js', './video-toolbox/vendor/ffmpeg/worker.js',
  './AppLog.html',
  './games/applog.html', './games/choplifter.html', './games/dazed-map.html', './games/moon-axis-unleashed.html', './games/moon-axis.html', './games/night-lark.html', './games/radioactive-rooster.html', './boxart/radioactive-rooster.svg', './games/phish-desk.html', './games/stick-shift.html', './games/time-tracker.html', './games/video-toolbox.html', './archive/', './archive/archive.json', './archive/archive.css', './archive/thumbs/x-pulse.webp', './archive/thumbs/video-downloader.webp', './boxart/rooster-timer.svg', './boxart/video-toolbox.svg'
];
// Folders that own their own service worker: never touch their requests.
const OWN_SW = ['/moon-axis/', '/moon-axis-beta/', '/phish-desk-beta/', '/moon-axis-unleashed/', '/phish-desk/', '/choplifter/', '/night-lark/', '/stick-shift/', '/dazed-map/', '/radioactive-rooster/'];

self.addEventListener('install', (e) => {
  // Precache individually so one missing file doesn't abort the install.
  e.waitUntil(caches.open(CACHE).then((c) =>
    Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
  ));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      // Only our own old versions (+ the legacy fixed 'pwas-v1'); never other games' caches.
      if ((k.startsWith(PREFIX) && k !== CACHE) || k === 'pwas-v1' || (k.startsWith('pwas-ffmpeg-core-') && k !== CORE_CACHE)) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

// Page asks the waiting worker to take over (see sw-register.js).
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/@ffmpeg/core@')) {
    // Video Toolbox engine (~32 MB, version pinned in the URL): cache-first in its own cache,
    // which survives shared-cache version bumps.
    e.respondWith(caches.open(CORE_CACHE).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  if (url.origin !== self.location.origin) return;           // other CDNs: browser default
  const scopePath = new URL(self.registration.scope).pathname;
  const rel = url.pathname.slice(scopePath.length - 1);
  if (OWN_SW.some((p) => rel.startsWith(p))) return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    // Network-first so new deploys show up immediately; cache is the offline fallback.
    e.respondWith(fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return r;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('./index.html')));
    return;
  }
  // Assets: stale-while-revalidate.
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((r) => {
      if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
