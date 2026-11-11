// Night Lark v2 beta service worker (BUILD-PLAN M5, risk 4). Its caches are all named
// "nlbeta-<version>", and activate only ever deletes older "nlbeta-" caches, plus the LEGACY
// prefixes the build names: none for the beta and test builds; the main build (v2-main, Nov 9
// 2026, served where v1 was) names v1's "night-lark-" so an installed v1 drops its old cache.
// Classic's "nlclassic-*" and every other azzato.live cache are left alone.
// Navigations are network-first (a new deploy shows up on the next online load) with the cached
// page as the offline fallback; everything else is cache-first from the precache.
// tools/build-beta.mjs fills in VERSION, PRECACHE and LEGACY; the dev page never registers this file.
const VERSION = '8451db52d7';
const PRECACHE = ["./","./art/in/bg-b3d-sky.png","./art/in/bg-core-car.png","./art/in/bg-core-far.png","./art/in/bg-core-near.png","./art/in/bg-core-searchlight.png","./art/in/bg-core-side.png","./art/in/bg-far-district-glow.png","./art/in/bg-far-moontowers-v3.png","./art/in/bg-harbor-far-v32.png","./art/in/bg-harbor-mid-v32.png","./art/in/bg-harbor-moon.png","./art/in/bg-hoods-back.png","./art/in/bg-hoods-front-v2.png","./art/in/bg-hub-glow.png","./art/in/bg-spoke-glow.png","./art/in/bg-spoke-link-node.png","./art/in/bg-spoke-tower.png","./art/in/char_lark_turnaround.png","./art/in/door-locked.png","./art/in/exit-hatch.png","./art/in/feather.png","./art/in/font-3x5.png","./art/in/grapple-marker.png","./art/in/grate-long.png","./art/in/grate-medium.png","./art/in/grate-short.png","./art/in/guard-watchman-v2.png","./art/in/guard-watchman.png","./art/in/hook-head.png","./art/in/hud-band.png","./art/in/kit-harbor-facade-v2.json","./art/in/kit-harbor-facade-v2.png","./art/in/kit-harbor-front.json","./art/in/kit-harbor-front.png","./art/in/kit-harbor-grates.json","./art/in/kit-harbor-grates.png","./art/in/kit-harbor-platforms.json","./art/in/kit-harbor-platforms.png","./art/in/kit-harbor-props.json","./art/in/kit-harbor-props.png","./art/in/lamp-company-pool.png","./art/in/lamp-company.png","./art/in/lamp.png","./art/in/lark-air.png","./art/in/lark-cloak-open.png","./art/in/lark-freefall.png","./art/in/lark-gun-out.png","./art/in/lark-idle-bell.png","./art/in/lark-idle.png","./art/in/lark-ledge.png","./art/in/lark-roll.png","./art/in/lark-run.png","./art/in/lark-swing.png","./art/in/lark-yank.png","./art/in/mini-tower-camera.png","./art/in/mini-tower-crown-glow.png","./art/in/mini-tower-crown.png","./art/in/mini-tower-mast.png","./art/in/mini-tower-neck.png","./art/in/mini-tower-platform.png","./art/in/mini-tower-pole.png","./art/in/mini-tower-pool.png","./art/in/mini-tower-rubble-settle.png","./art/in/mini-tower-rubble.png","./art/in/mini-tower-shell-battlement.png","./art/in/mini-tower-shell-crumble.png","./art/in/mini-tower-shell-particles.png","./art/in/mini-tower-shell.png","./art/in/mini-tower-stack-tall.png","./art/in/mini-tower-stack.png","./art/in/mini-tower-transition.png","./art/in/mini-tower.json","./art/in/moon-crown-camera.png","./art/in/moon-crown-halo.png","./art/in/moon-crown.png","./art/in/moon-guard-battlement-crumble.png","./art/in/moon-guard-battlement.png","./art/in/moon-guard-crumble.png","./art/in/moon-guard-shell.png","./art/in/moon-mast-base.png","./art/in/moon-mast-collar.png","./art/in/moon-mast-landing.png","./art/in/moon-mast-pole.png","./art/in/moon-mast-transition.png","./art/in/moon-mast.png","./art/in/moon-rubble-big-settle.png","./art/in/moon-rubble-big.png","./art/in/pickups-glimmer.png","./art/in/pickups.png","./art/in/powerups-16.png","./art/in/powerups-32.png","./art/in/reticle.png","./art/in/searchlight-head.png","./art/in/searchlight-prop-32.png","./art/in/skyline-levels.json","./art/in/tiles-harbor-b1.png","./art/in/tiles-harbor.png","./art/in/title-key-art.png","./art/in/title-logo.png","./art/in/wren-hide-hold-full.png","./art/in/wren-hide-hold.png","./art/in/wren-hide-in.png","./art/in/wren-hide-out.png","./art/in/wren-hide.png","./art/in/wren-portrait.png","./art/manifest.json","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-480.png","./index.html","./js/anchors.js","./js/art.js","./js/audio.js","./js/canvas.js","./js/chain.js","./js/config.js","./js/draw-sprites.js","./js/feel.js","./js/font.js","./js/fx.js","./js/game.js","./js/gen/generator.js","./js/gen/moves.js","./js/gen/rng.js","./js/gen/template.js","./js/gen/templates.js","./js/gen/validator.js","./js/geom.js","./js/input.js","./js/ios-zoom.js","./js/kit/assemble.js","./js/kit/draw.js","./js/kit/dress.js","./js/kit/facade.js","./js/kit/pieces.js","./js/kit/props.js","./js/kit/route.js","./js/level.js","./js/levels/big-2x2.js","./js/levels/first-ring.js","./js/levels/moon-mast.js","./js/levels/tall-shaft.js","./js/levels/training.js","./js/levels/vertical.js","./js/levels/watch-room.js","./js/levels/wide-kit.js","./js/levels/wide-shaft.js","./js/loop.js","./js/los.js","./js/main.js","./js/mini-tower.js","./js/physics.js","./js/powerups.js","./js/prompts.js","./js/pwa.js","./js/render.js","./js/rope.js","./js/run.js","./js/save.js","./js/screens.js","./js/setpiece.js","./js/shaft-intro.js","./js/shell.js","./js/sim.js","./js/skyline.js","./js/stealth.js","./js/targeting.js","./js/touch.js","./js/wren.js","./js/zoom.js","./manifest.webmanifest"];
const PREFIX = 'nlbeta-';
const LEGACY = [];
const CACHE = PREFIX + VERSION;
const stale = (k) => (k.startsWith(PREFIX) && k !== CACHE) || LEGACY.some((p) => k.startsWith(p));

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter(stale).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); }
      return res;
    }).catch(() => caches.open(CACHE).then((c) => c.match('./index.html')).then((r) => r || caches.match(req, { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) c.put(req, res.clone());
    return res;
  }))));
});
