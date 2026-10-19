// Radioactive Rooster (live) service worker. Own prefix "radioactive-rooster-" (the old live SW used
// radioactive-rooster-v2), so it never touches the beta's caches or other games.
const VERSION = "3";
const CORE_CACHE = `radioactive-rooster-core-v${VERSION}`;
const PIXEL_CACHE = `radioactive-rooster-pixel-v${VERSION}`;
const FANCY_CACHE = `radioactive-rooster-fancy-v${VERSION}`;
const KEEP = [CORE_CACHE, PIXEL_CACHE, FANCY_CACHE];
const CORE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./js/logic.js",
  "./js/art.js",
  "./js/audio.js",
  "./js/walk.js",
  "./data/script.js",
  "./art/manifest.json",
];

async function precachePixel() {
  const cache = await caches.open(PIXEL_CACHE);
  try {
    const manifest = await (await fetch("./art/manifest.json", { cache: "no-cache" })).json();
    await Promise.all(Object.keys(manifest.assets).map(async (id) => {
      const url = `./art/pixel/${id}.png`;
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (res.ok) await cache.put(url, res);
      } catch {}
    }));
  } catch {}
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE.map((u) => new Request(u, { cache: "no-cache" }))))
      .then(precachePixel)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("radioactive-rooster-") && !KEEP.includes(k)).map((k) => caches.delete(k))))
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
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(name).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.open(name).then((cache) => cache.match(req)).then((hit) => hit || new Response("", { status: 504 }))),
    );
    return;
  }
  // Art: stale-while-revalidate. Only successful responses are cached, never 404s.
  event.respondWith(
    caches.open(name).then((cache) => cache.match(req).then((hit) => {
      const fresh = fetch(req).then((res) => {
        if (res.ok && res.type === "basic") cache.put(req, res.clone());
        return res;
      }).catch(() => hit || new Response("", { status: 504 }));
      return hit || fresh;
    })),
  );
});
