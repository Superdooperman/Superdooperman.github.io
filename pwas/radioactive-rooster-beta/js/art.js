// Dual art mode: "pixel" (default) and "fancy". Same relative ids in art/pixel/ and art/fancy/.
// Resolution per asset: art/<mode>/<id>.(png|webp) -> art/pixel/<id>.png -> art/placeholders/<legacy>, from the manifest.
const MODE_KEY = "rr-art-mode";
const MODES = ["pixel", "fancy"];

const art = {
  manifest: null,
  byLegacy: new Map(),
  found: { pixel: new Map(), fancy: new Map() }, // id -> url | null
  mode: MODES.includes(localStorage.getItem(MODE_KEY)) ? localStorage.getItem(MODE_KEY) : "pixel",
  listeners: new Set(),
};

function notify() {
  for (const fn of art.listeners) fn();
}

// Every asset url comes from the manifest ("pixel": false / "fancy": "<ext>"), so a load never asks the server for a
// file that isn't there (2026-10-21: the old per-asset probes + preloads were ~2,800 requests per visit and tripped
// GitHub Pages' rate limit). Images load when a room shows them; the service worker caches them as they arrive.
export async function initArt() {
  try {
    const res = await fetch("art/manifest.json");
    art.manifest = await res.json();
  } catch {
    art.manifest = { logical: { w: 320, h: 180 }, ext: ["png"], assets: {} };
  }
  for (const [id, a] of Object.entries(art.manifest.assets)) {
    if (a.legacy) art.byLegacy.set(a.legacy, id);
    art.found.pixel.set(id, a.pixel === false ? null : `art/pixel/${id}.png`);
    art.found.fancy.set(id, a.fancy ? `art/fancy/${id}.${a.fancy}` : null);
  }
  notify();
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
