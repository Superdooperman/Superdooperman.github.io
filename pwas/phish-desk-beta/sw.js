// Lamprey: In Too Deep service worker. Scope = its own folder. Cache name is content-hashed per build.
const CACHE = 'lamprey-itd-beta-v2.0.0-af6a6adf32';
const FILES = ["./","./assets/index-Cwp3cex1.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-192.png","./icons/maskable-512.png","./index.html","./manifest.json"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('lamprey-itd-beta-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Navigations: network-first AND revalidate past the browser HTTP cache (GitHub Pages sends max-age=600),
  // otherwise a fresh deploy can be hidden for up to 10 minutes.
  if (req.mode === 'navigate') { // network-first for the page so new versions are found
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./', cp)); return r; })
      .catch(() => caches.match('./', { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
