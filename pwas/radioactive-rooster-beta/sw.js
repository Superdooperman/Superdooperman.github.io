// Radioactive Rooster BETA service worker. Own prefix "rr-beta-" so it never touches other games.
const VERSION = "13";
const CORE_CACHE = `rr-beta-core-v${VERSION}`;
const PIXEL_CACHE = `rr-beta-pixel-v${VERSION}`;
const FANCY_CACHE = `rr-beta-fancy-v${VERSION}`;
const KEEP = [CORE_CACHE, PIXEL_CACHE, FANCY_CACHE];
const CORE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./js/logic.js",
  "./js/art.js",
  "./js/audio.js",
  "./js/beats.js",
  "./js/walk.js",
  "./data/script.js",
  "./art/manifest.json",
  "./audio/in/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE.map((u) => new Request(u, { cache: "no-cache" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("rr-beta-") && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function cacheFor(url) {
  // The art manifest is data, not art: network-first with the code, so new code never runs against an old manifest
  // (v11: fresh main.js + a stale-while-revalidate v10 manifest had no sit frames, and Rooster vanished on the rail).
  if (url.pathname.endsWith("/art/manifest.json")) return CORE_CACHE;
  if (url.pathname.includes("/art/fancy/")) return FANCY_CACHE;
  if (url.pathname.includes("/art/")) return PIXEL_CACHE;
  return CORE_CACHE;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const name = cacheFor(url);
  // Code, data and pages: network first (no-cache), cache as offline fallback, so story updates show on the next load.
  if (name === CORE_CACHE) {
    event.respondWith(
      fetch(req, { cache: "no-cache" }).then((res) => {
        if (res.status === 200 && res.type === "basic") { // not 206: <audio> range requests can't be cached
          const copy = res.clone();
          caches.open(name).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.open(name).then((cache) => cache.match(req)).then((hit) => hit || new Response("", { status: 504 }))),
    );
    return;
  }
  // Art: cache-first. Fetched once, the first time a room shows it (no bulk precache: 2026-10-21 rate limit); art
  // files are versioned by the cache name, so a new SW version refetches them lazily. Only 200s are cached.
  event.respondWith(
    caches.open(name).then((cache) => cache.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    }))),
  );
});
