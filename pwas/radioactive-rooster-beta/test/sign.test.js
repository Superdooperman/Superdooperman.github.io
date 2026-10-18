// NED'S FEED & SEED neon: the ambient temptation meter. Placement is data (room.sign), drawing is main.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ROOMS, FEEDSEED } from "../data/script.js";
import { newGame, signLevel, signLetters, vatState } from "../js/logic.js";

const SIGN_ROOMS = ["hq", "fence", "store", "wkuk", "gate", "midway"];
const inter = (a, b) => Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
// the overlay box includes the glow halo; only a sliver of halo may touch a clickable object
const overlap = (a, b) => inter(a, b) > 0.2 * a[2] * a[3];

test("the meter is placed in every room that has it, and not in the Pavilion", () => {
  assert.deepEqual(Object.values(ROOMS).filter((r) => r.sign).map((r) => r.id).sort(), [...SIGN_ROOMS].sort());
  assert.equal(ROOMS.pavilion.sign, undefined, "Pavilion: you're inside the tent, the vat is the meter there");
  assert.ok(ROOMS.pavilion.vat, "Pavilion keeps the vat meter");
});

const ROOT = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT));
const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
const manifest = JSON.parse(read("art/manifest.json"));
const PLATES = Object.fromEntries(SIGN_ROOMS.map((r) => [r, `art/pixel/bg/${r}.png`]));
const SRCS = Object.fromEntries(SIGN_ROOMS.map((r) => [r, `tools/neon/src/${r}.png`])); // clean pixel plates, no sign

test("each sign is painted into its plate and has a glow sheet with one frame per tube", () => {
  for (const id of SIGN_ROOMS) {
    const sign = ROOMS[id].sign;
    const a = manifest.assets[sign.art];
    assert.ok(a && a.kind === "fx", `${id}: ${sign.art} in the manifest`);
    assert.equal(a.frames, sign.frames.length, `${id}: frame count`);
    const [w, h] = pngSize(read(`art/pixel/${sign.art}.png`));
    assert.equal(w, sign.rect[2] * a.scale, `${id}: sheet width`);
    assert.equal(h, sign.rect[3] * a.scale * sign.frames.length, `${id}: sheet height`);
    assert.notDeepEqual(read(PLATES[id]), read(SRCS[id]), `${id}: unlit sign painted into the plate`);
  }
});

test("sign frames follow FEEDSEED: real letters, the FED tubes, and the hawk", () => {
  for (const id of SIGN_ROOMS) {
    const { frames } = ROOMS[id].sign;
    assert.equal(new Set(frames).size, frames.length, `${id}: no duplicate frames`);
    for (const k of frames) if (k !== "hawk") assert.ok(Number.isInteger(k) && FEEDSEED.text[k] && FEEDSEED.text[k] !== " ", `${id}: frame ${k} is a letter`);
    for (const k of FEEDSEED.lit[3]) assert.ok(frames.includes(k), `${id}: shows ${FEEDSEED.text[k]} of FED`);
    assert.ok(frames.includes("hawk"), `${id}: has the hawk`);
  }
});

test("sign overlays sit inside the 320x180 scene and stay off every object hotspot (a glow sliver is fine; exits are doorways)", () => {
  for (const id of SIGN_ROOMS) {
    const [x, y, w, h] = ROOMS[id].sign.rect;
    assert.ok(x >= 0 && y >= 0 && x + w <= 320 && y + h <= 180, `${id}: inside the scene`);
    for (const s of ROOMS[id].spots) if (s.rect && !s.exit) assert.ok(!overlap(ROOMS[id].sign.rect, s.rect), `${id}: sign overlaps hotspot ${s.id}`);
  }
});

test("main.js lights the painted sign per tube; the code-drawn text sign is gone", () => {
  const main = read("js/main.js").toString();
  assert.match(main, /if \(room\.sign\) world\.append\(neonSign\(room\.sign, state\)\)/);
  assert.doesNotMatch(main, /feedSeed|fs-text/);
  const css = read("css/style.css").toString();
  assert.doesNotMatch(css, /\.feedseed|\.fs-text/);
  assert.match(css, /\.neon-tube \{[^}]*mix-blend-mode: screen/);
});

test("temptation logic is unchanged: letters go dark NED'S FEED & SEED -> FED", () => {
  const shown = (t) => { const s = newGame(); s.temptation = t; return signLetters(s).map((l) => (l.on ? l.ch : "_")).join(""); };
  assert.equal(FEEDSEED.text, "NED'S FEED & SEED");
  assert.equal(shown(0), "NED'S FEED & SEED".replace(/ /g, "_"));
  assert.equal(shown(2), "_ED'S_FE_D_______");
  assert.equal(shown(3), "______F_ED_______");
  assert.equal(shown(9), shown(3));
  const s = newGame(); s.temptation = 2;
  assert.equal(signLevel(s), 2);
  assert.ok(vatState(s));
});
