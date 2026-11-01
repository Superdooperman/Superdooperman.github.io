// Build channel: "beta" (the dev repo, /pwas/radioactive-rooster-beta/) or "prod" (main Rooster, /pwas/radioactive-rooster/).
// tools/ship/build.mjs sets it in the shipped copy; the same switch sits in js/boot.js and sw.js (each file stands
// alone, so a stale or missing file can never mix one channel's storage with the other's).
// Storage: prod keeps the keys main Rooster has always used ("rr-yolk-saves", "rr-art-mode", ...); the beta shares the
// origin, so its keys are "rr-beta-*" (Zoro 2026-10-31) and prod never reads them.
export const CHANNEL = "prod";
export const PREFIX = CHANNEL === "prod" ? "rr-" : "rr-beta-";
export const storeKey = (name) => PREFIX + name;
