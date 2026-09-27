const CACHE = "night-lark-v2";
const CORE = [
  "./",
  "./index.html",
  "./game.css",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./parts/part0.js",
  "./parts/p10.js",
  "./parts/p11.js",
  "./parts/p12.js",
  "./parts/p20.js",
  "./parts/p21.js",
  "./parts/p22.js",
  "./parts/p30.js",
  "./parts/p31.js",
  "./parts/p32.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok && (res.type === "basic" || res.type === "cors")) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
