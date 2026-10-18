// Every verb on every hotspot, every inventory verb, every item-on-hotspot and item-on-item combo gets bespoke
// text (Arlong, 2026-10-18). Fails if any combo resolves to an engine fallback line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { act, newGame, GENERIC_LINES, GENERIC_PATTERNS } from "../js/logic.js";
import { ROOMS, ITEMS } from "../data/script.js";

const VERBS = ["look", "talk", "take", "use", "push"];
const ITEM_VERBS = ["look", "talk", "take", "push"];

function stateFor(room, spot, inv = []) {
  const s = newGame();
  s.room = room.id;
  if (spot && spot.when) s.flags[spot.when] = true;
  s.inv = [...inv];
  return s;
}
function run(s, steps) {
  const texts = [];
  for (const step of steps) {
    const r = act(s, step);
    s = r.state;
    texts.push(...r.lines.map((l) => l.text));
  }
  return texts;
}
function generic(texts) {
  return texts.find((t) => GENERIC_LINES.includes(t) || GENERIC_PATTERNS.some((re) => re.test(t)) || /\{(item|other)\}/.test(t));
}
const combos = { spot: 0, item: 0, itemOnSpot: 0, itemOnItem: 0 };
const longest = { n: 0, t: "" };
function check(texts, what) {
  assert.ok(texts.length > 0, `${what}: says something`);
  const g = generic(texts);
  assert.equal(g, undefined, `${what}: generic line "${g}"`);
  for (const t of texts) if (t.length > longest.n) Object.assign(longest, { n: t.length, t });
}

test("every verb on every hotspot has a bespoke line", () => {
  for (const room of Object.values(ROOMS)) {
    for (const spot of room.spots) {
      for (const verb of VERBS) {
        check(run(stateFor(room, spot), [{ t: "verb", verb }, { t: "hotspot", id: spot.id }]), `${room.id}/${spot.id} ${verb}`);
        combos.spot++;
      }
    }
  }
});

test("every inventory item answers every verb", () => {
  for (const id of Object.keys(ITEMS)) {
    for (const verb of ITEM_VERBS) {
      check(run(stateFor(ROOMS.hq, null, [id]), [{ t: "verb", verb }, { t: "item", id }]), `item ${id} ${verb}`);
      combos.item++;
    }
  }
});

test("every item used on every hotspot gets a bespoke answer (recipe or that hotspot's own default)", () => {
  for (const room of Object.values(ROOMS)) {
    for (const spot of room.spots) {
      assert.ok(spot.useAny || (spot.useItem && spot.useItem["*"]), `${room.id}/${spot.id}: has an item default`);
      for (const id of Object.keys(ITEMS)) {
        check(run(stateFor(room, spot, [id]), [{ t: "verb", verb: "use" }, { t: "item", id }, { t: "hotspot", id: spot.id }]), `${id} on ${room.id}/${spot.id}`);
        combos.itemOnSpot++;
      }
    }
  }
});

test("every item used on every other item gets a bespoke answer", () => {
  const ids = Object.keys(ITEMS);
  for (const a of ids) {
    assert.ok(ITEMS[a].combine, `${a}: has a combine default`);
    for (const b of ids) {
      if (a === b) continue;
      check(run(stateFor(ROOMS.hq, null, [a, b]), [{ t: "verb", verb: "use" }, { t: "item", id: a }, { t: "item", id: b }]), `${a} on ${b}`);
      combos.itemOnItem++;
    }
  }
});

test("bespoke lines stay short enough for the caption box", () => {
  const strings = [];
  const walk = (v) => (typeof v === "string" ? strings.push(v) : Array.isArray(v) ? v.forEach(walk) : v && typeof v === "object" ? Object.values(v).forEach(walk) : 0);
  for (const room of Object.values(ROOMS)) for (const spot of room.spots) for (const k of [...VERBS, "useAny"]) walk(spot[k]);
  for (const item of Object.values(ITEMS)) for (const k of ["look", "talk", "take", "push", "combine"]) walk(item[k]);
  for (const t of strings) assert.ok(t.length <= 210, `${t.length} chars: ${t}`);
  console.log(`# combos covered: ${JSON.stringify(combos)}; longest shown line ${longest.n} (legacy story beats in logic.js are exempt)`);
});
