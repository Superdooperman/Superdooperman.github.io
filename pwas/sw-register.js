// Registers the shared /pwas/ service worker from any page under /pwas/.
// When a new version is installed it activates it and reloads once.
(function () {
  if (!('serviceWorker' in navigator)) return;
  var s = document.currentScript && document.currentScript.src;
  var base = s ? s.replace(/sw-register\.js.*$/, '') : '/pwas/';
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(base + 'service-worker.js', { scope: base }).then(function (reg) {
      function promote(w) { if (w && navigator.serviceWorker.controller) w.postMessage('SKIP_WAITING'); }
      if (reg.waiting) promote(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        w && w.addEventListener('statechange', function () { if (w.state === 'installed') promote(w); });
      });
    }).catch(function (e) { console.warn('SW registration failed', e); });
    // Reload only when an existing worker was replaced (not on first install).
    var hadController = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded || !hadController) return; reloaded = true; location.reload();
    });
  });
})();
