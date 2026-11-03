// The game moved to /pwas/choppa/. This worker replaces the one that used
// to control /pwas/choplifter/, drops the old choplifter-* caches, and leaves.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('choplifter-')).map((key) => caches.delete(key)));
    await self.registration.unregister();
  })());
});
