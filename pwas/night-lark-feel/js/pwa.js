// M5 PWA: the service worker is registered only by a built copy (tools/build-beta.mjs marks
// <html data-build="beta"> or, with --test, data-build="test"), never by the dev page or a
// --local-art build, so dev reloads never serve stale files. ?nosw skips it. sw.js sits next to
// index.html, so its scope is the folder the build is served from.
export function registerServiceWorker(doc = globalThis.document, nav = globalThis.navigator, loc = globalThis.location) {
  if (!doc || !nav || !('serviceWorker' in nav)) return false;
  if (!['beta', 'test'].includes(doc.documentElement.dataset.build)) return false;
  if (loc && new URLSearchParams(loc.search).has('nosw')) return false;
  nav.serviceWorker.register('./sw.js', { scope: './' }).catch(() => { /* offline play just isn't cached */ });
  return true;
}
