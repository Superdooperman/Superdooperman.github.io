// The v2 save (BUILD-PLAN M4): one JSON value under SAVE_KEY ('nightlark.v2.save'). v2 never
// reads, writes or removes v1's 'nightlark.save.v1', and never calls storage.clear().
// storage is injectable ({ getItem, setItem }) so tests run without a browser; every access is
// wrapped, so a blocked or full localStorage only means the night is not remembered.
import { SAVE_KEY } from './config.js';
import { stashable } from './powerups.js';

export const SAVE_VERSION = 2;
const RANKS = ['S', 'A', 'B', 'C'];
/** Most entries kept in bestRankBySeed and returned (the most recently added win): a save is
 *  rewritten on every write, so an unbounded list is only bloat. */
export const SAVE_LIST_CAP = 200;

export function defaultSave() {
  return { version: SAVE_VERSION, stash: null, bestRankBySeed: {}, returned: [], revealSeen: false, unmasked: false,
    nights: 0, clears: 0, nextSeed: null, settings: { mute: false, volume: 0.5, motion: 'auto' } };
}

/** Make any parsed value a valid save (unknown or broken fields fall back to the defaults). */
export function sanitize(v) {
  const d = defaultSave();
  if (!v || typeof v !== 'object' || v.version !== SAVE_VERSION) return d;
  const out = { ...d };
  out.stash = typeof v.stash === 'string' && stashable(v.stash) ? v.stash : null;
  if (v.bestRankBySeed && typeof v.bestRankBySeed === 'object')
    for (const [k, r] of Object.entries(v.bestRankBySeed).filter(([, r]) => RANKS.includes(r)).slice(-SAVE_LIST_CAP)) out.bestRankBySeed[k] = r;
  out.returned = Array.isArray(v.returned) ? [...new Set(v.returned.filter((x) => typeof x === 'string'))].slice(-SAVE_LIST_CAP) : [];
  out.revealSeen = !!v.revealSeen;
  out.unmasked = !!v.unmasked;
  out.nights = Number.isFinite(v.nights) ? v.nights : 0;
  out.clears = Number.isFinite(v.clears) ? v.clears : 0;
  out.nextSeed = Number.isInteger(v.nextSeed) && v.nextSeed > 0 ? v.nextSeed : null;
  const s = v.settings || {};
  out.settings = { mute: !!s.mute, volume: Number.isFinite(s.volume) ? Math.max(0, Math.min(1, s.volume)) : d.settings.volume,
    motion: ['auto', 'full', 'reduced'].includes(s.motion) ? s.motion : 'auto' }; // M5: 'auto' follows prefers-reduced-motion
  return out;
}

export function loadSave(storage) {
  try {
    const raw = storage && storage.getItem(SAVE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : defaultSave();
  } catch { return defaultSave(); }
}

export function writeSave(storage, save) {
  try { if (storage) storage.setItem(SAVE_KEY, JSON.stringify(sanitize(save))); return true; } catch { return false; }
}

/** Is rank a better than rank b (S best)? A missing b loses to anything. */
export const betterRank = (a, b) => !b || RANKS.indexOf(a) < RANKS.indexOf(b);

/** A memory-backed storage (tests, and the fallback when localStorage is blocked). */
export function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => { throw new Error('v2 must never clear storage'); },
    keys: () => [...m.keys()],
    map: m,
  };
}
