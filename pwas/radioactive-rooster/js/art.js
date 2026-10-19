// Dual art mode: "pixel" (default) and "fancy". Same relative ids in art/pixel/ and art/fancy/.
// Resolution per asset: art/<mode>/<id>.(png|webp) -> art/pixel/<id>.png -> art/placeholders/<legacy>.
const MODE_KEY = "rr-art-mode";
const MODES = ["pixel", "fancy"];

const art = {
  manifest: null,
  byLegacy: new Map(),
  found: { pixel: new Map(), fancy: new Map() }, // id -> url | null
  mode: MODES.includes(localStorage.getItem(MODE_KEY)) ? localStorage.getItem(MODE_KEY) : "pixel",
  listeners: new Set(),
};

async function exists(url) {
  try {
    const res = await fetch(url); // GET so the service worker can answer offline
    return res.ok;
  } catch {
    return false;
  }
}

async function probe(set, id) {
  const exts = set === "fancy" ? art.manifest.ext : ["png"];
  for (const ext of exts) {
    const url = `art/${set}/${id}.${ext}`;
    if (await exists(url)) {
      art.found[set].set(id, url);
      return url;
    }
  }
  art.found[set].set(id, null);
  return null;
}

function notify() {
  for (const fn of art.listeners) fn();
}

function preload(urls) {
  for (const url of urls) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

async function probeSet(set) {
  const ids = Object.keys(art.manifest.assets);
  await Promise.all(ids.map((id) => probe(set, id)));
  preload(ids.map((id) => art.found[set].get(id)).filter(Boolean));
}

export async function initArt() {
  try {
    const res = await fetch("art/manifest.json");
    art.manifest = await res.json();
  } catch {
    art.manifest = { logical: { w: 320, h: 180 }, ext: ["png"], assets: {} };
  }
  for (const [id, a] of Object.entries(art.manifest.assets)) {
    if (a.legacy) art.byLegacy.set(a.legacy, id);
  }
  // Current set first, then the other set in the background.
  const first = art.mode;
  const second = first === "pixel" ? "fancy" : "pixel";
  await probeSet(first === "fancy" ? "pixel" : first); // pixel is always the fallback, probe it first
  if (first === "fancy") await probeSet("fancy");
  notify();
  const later = () => probeSet(second).then(notify);
  if ("requestIdleCallback" in window) requestIdleCallback(later);
  else setTimeout(later, 300);
}

export function idFor(fileOrId) {
  if (!fileOrId) return null;
  if (art.manifest && art.manifest.assets[fileOrId]) return fileOrId;
  return art.byLegacy.get(fileOrId) || null;
}

// Best URL for an asset id or legacy filename in the current mode.
export function artUrl(fileOrId) {
  const id = idFor(fileOrId);
  if (!id) return `art/placeholders/${fileOrId}`;
  if (art.mode === "fancy") {
    const f = art.found.fancy.get(id);
    if (f) return f;
  }
  const p = art.found.pixel.get(id);
  if (p) return p;
  const legacy = art.manifest.assets[id].legacy;
  return legacy ? `art/placeholders/${legacy}` : "";
}

export function assetInfo(fileOrId) {
  const id = idFor(fileOrId);
  return id ? art.manifest.assets[id] : null;
}

export function artMode() {
  return art.mode;
}

export function setArtMode(mode) {
  if (!MODES.includes(mode)) return;
  art.mode = mode;
  localStorage.setItem(MODE_KEY, mode);
  notify();
}

export function fancyCount() {
  let n = 0;
  for (const v of art.found.fancy.values()) if (v) n += 1;
  return n;
}

export function onArtChange(fn) {
  art.listeners.add(fn);
}

export function logicalSize() {
  return art.manifest ? art.manifest.logical : { w: 320, h: 180 };
}
