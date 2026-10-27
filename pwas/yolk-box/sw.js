// Network-first service worker: always fresh when online, works offline after the first visit.
// Scoped to its own folder: it only caches and serves URLs under its own scope, and on
// activate it only deletes its own old 'yolkbox-' caches (other apps on the same origin keep theirs).
const PREFIX = 'yolkbox-';
const CACHE = PREFIX + 'v7';
const SCOPE = new URL('./', self.location).pathname;
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/engine.js', 'js/dsp.js', 'js/patterns.js', 'js/encode.js', 'js/kk.js', 'js/bricks.js', 'js/studio.js', 'js/dancer.js', 'js/dancers-data.js', 'js/sanitize.js', 'js/names.js', 'img/dancers.png', 'js/mp3-worker.js',
  'worklets/bass-processor.js', 'worklets/rec-processor.js', 'worklets/kk-processor.js', 'vendor/lame.min.js', 'manifest.webmanifest', 'icons/icon-64.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && r.type === 'basic' && r.status === 200) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
