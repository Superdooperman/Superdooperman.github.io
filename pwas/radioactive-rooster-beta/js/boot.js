// Radioactive Rooster BETA boot: a classic script loaded in <head>, before the first paint. It lives in its own
// same-origin file because the page's CSP (script-src 'self', as in Yolk Box) blocks inline scripts.
//
// 1. Storage keys. The beta shares its origin with live Rooster (/pwas/radioactive-rooster/), so every beta key is
//    "rr-beta-*" (Zoro 2026-10-31: a beta save in the shared rr-yolk-saves could be loaded by live). Once per device,
//    an rr-beta-* key that is missing takes a copy of the old shared rr-* value, so testers keep their saves and
//    settings. The old key is never deleted or changed: it belongs to live Rooster too.
// 2. Controls side on short landscape phones. CONTROLS_DEFAULT is the side the controls take until the player picks
//    one in the Menu ("Controls on: Left / Right", saved as rr-beta-controls). Set here, before the first paint, so a
//    reload never flashes the other layout.
// 3. Service worker registration (./sw.js, scope = the beta folder).
var CONTROLS_DEFAULT = "left";
(function () {
  var MIGRATED = "rr-beta-migrated";
  var OLD_KEYS = ["rr-yolk-saves", "rr-audio", "rr-art-mode", "rr-hints", "rr-coldopen", "rr-nightshift", "rr-controls"];
  var store = null;
  try { store = window.localStorage; } catch (e) { /* private mode / storage blocked */ }
  if (store) {
    try {
      if (store.getItem(MIGRATED) !== "1") {
        for (var i = 0; i < OLD_KEYS.length; i++) {
          var next = "rr-beta-" + OLD_KEYS[i].slice(3);
          if (store.getItem(next) !== null) continue;
          var old = store.getItem(OLD_KEYS[i]);
          if (old !== null) store.setItem(next, old);
        }
        store.setItem(MIGRATED, "1");
      }
    } catch (e) { /* quota: run again next visit */ }
  }

  var side = CONTROLS_DEFAULT;
  try { side = (store && store.getItem("rr-beta-controls")) || side; } catch (e) { /* private mode */ }
  document.documentElement.dataset.controls = side === "right" ? "right" : "left";

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
})();
