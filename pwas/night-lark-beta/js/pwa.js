// M5 PWA: the service worker is registered only by the beta build (tools/build-beta.mjs marks
// <html data-build="beta">), never by the dev page, so dev reloads never serve stale files.
// ?nosw skips it. sw.js sits next to index.html, so its scope is the beta folder only.
export function registerServiceWorker(doc = globalThis.document, nav = globalThis.navigator, loc = globalThis.location) {
  if (!doc || !nav || !('serviceWorker' in nav)) return false;
  if (doc.documentElement.dataset.build !== 'beta') return false;
  if (loc && new URLSearchParams(loc.search).has('nosw')) return false;
  nav.serviceWorker.register('./sw.js', { scope: './' }).catch(() => { /* offline play just isn't cached */ });
  return true;
}
