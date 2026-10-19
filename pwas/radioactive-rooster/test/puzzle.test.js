import assert from "node:assert/strict";
import test from "node:test";
import { act, choicesFor, computeEnding, newGame, signLetters, vatState } from "../js/logic.js";
import { ENDINGS, ROOMS, SPEAKER } from "../data/script.js";
import { readFileSync } from "node:fs";

const V = (verb) => ({ t: "verb", verb });
const H = (id) => ({ t: "hotspot", id });
const G = (id) => ({ t: "go", id });
const I = (id) => ({ t: "item", id });
const C = (id) => ({ t: "choice", id });
const R = { t: "rewind" };

function run(steps, state = newGame()) {
  const lines = [];
  for (const step of steps) {
    const result = act(state, step);
    state = result.state;
    lines.push(...result.lines);
  }
  return { state, lines, texts: lines.map((l) => l.text) };
}
const has = (s, id) => s.inv.includes(id);

// Choices: phone/vip/ring = "follow" | "pull". kind = extra kindnesses.
function toPavilion({ phone = "pull", vip = "pull", ring = "pull", kind = false, join = true, door = "ribbon" } = {}) {
  const steps = [
    V("look"), H("bucket"),
    V("take"), H("lamp"),
    V("take"), H("crate"),
    V("use"), H("door"), // signed photo
    G("hatch"),
    V("use"), H("rail"),
    G("door"),
    V("take"), H("spoon"),
    V("take"), H("stub"),
    V("use"), I("photo"), H("hen"),
    V("take"), H("grub"),
    G("back"),
  ];
  if (kind) steps.push(G("to-hq"), V("use"), H("door"), G("hatch"), V("use"), I("photo"), H("henny"));
  steps.push(
    G("to-barn"),
    V("use"), I("grub"), H("goat"),
  );
  if (kind) steps.push(V("talk"), H("goat"));
  steps.push(
    G("to-town"),
    V("use"), I("spoon"), H("clerk"),
    G("to-wkuk"),
    V("use"), I("bulb"), I("geiger"),
    V("use"), I("geiger"), H("slot"),
    C(phone),
  );
  if (kind) steps.push(V("talk"), H("deejay"));
  steps.push(G("to-gate"));
  if (vip === "follow") steps.push(G("turnstile"), C("follow"));
  else steps.push(G("turnstile"), C("pull"), V("use"), I("mirror"), H("guard"), V("use"), H("cutout"), G("turnstile"));
  steps.push(V("talk"), H("kids"), V("talk"), H("kids"));
  if (join) steps.push(V("take"), H("cashbox"), V("use"), I("half"), I("stub"));
  steps.push(V("talk"), H("club"), C(ring));
  if (ring === "pull") steps.push(V("use"), I("speaker"), H("booth"));
  if (ring === "follow" && kind) steps.push(V("use"), I("tickets"), H("kids"));
  steps.push(V("use"), I(door), H("rope"));
  return steps;
}

const winRest = (r2 = "ticket", r3 = "warn") => [
  V("talk"), H("pip"), // rope puzzle: Pip lifts Corny's keys (needs pip_trust)
  V("talk"), H("gobbler"), C("henny"), C(r2), C(r3),
  V("use"), I("mirror"), H("lamp"),
  V("use"), I("basket"), H("cage"),
];

test("the bucket has to be read before the hatch", () => {
  const skipped = run([G("hatch")]);
  assert.equal(skipped.state.room, "hq");
  const read = run([V("look"), H("bucket"), G("hatch")]);
  assert.equal(read.state.room, "fence");
});

test("Henny never speaks out loud during play: every Henny line is a thought", () => {
  const r = run(toPavilion({ kind: true }));
  const hen = r.lines.filter((l) => l.speaker === SPEAKER.henny);
  assert.ok(hen.length >= 3);
  for (const l of hen) assert.equal(l.thought, true, l.text);
  assert.equal(r.state.flags.learned_henny, true);
  // No "Bawk" anywhere in game data or logic.
  for (const f of ["../data/script.js", "../js/logic.js"]) assert.ok(!/Bawk/.test(readFileSync(new URL(f, import.meta.url), "utf8")));
});

test("Henny's spoken line only appears on covers where Rooster has the Yolk", () => {
  for (const [id, e] of Object.entries(ENDINGS)) {
    const spoken = e.panels.filter((p) => typeof p === "object" && p.say === "Henny");
    if (["hero", "allies", "smitten", "showboat"].includes(id)) assert.equal(spoken.length, 1, id);
    else assert.equal(spoken.length, 0, id);
  }
});

test("Hero: no temptations, ticket answer, few kindnesses", () => {
  const r = run([...toPavilion(), ...winRest()]);
  assert.equal(r.state.temptation, 0);
  assert.equal(r.state.mode, "end");
  assert.equal(r.state.ending, "hero");
  assert.ok(r.texts.includes("PAH-KAW!!!"));
  assert.ok(r.texts.some((t) => t.includes("lets him hear chickens")));
});

test("Hero + Allies: temptation 0 and 3+ kindnesses", () => {
  const r = run([...toPavilion({ kind: true }), ...winRest("bill")]);
  assert.equal(r.state.temptation, 0);
  assert.ok(["kind_henny", "kind_goat", "kind_deejay"].every((k) => r.state.flags[k]));
  assert.equal(r.state.ending, "allies");
});

test("Smitten: temptation 1-2, joined ticket shown", () => {
  const r = run([...toPavilion({ phone: "follow", vip: "follow" }), ...winRest("ticket")]);
  assert.equal(r.state.temptation, 2);
  assert.equal(r.state.flags.ticket_shown, true);
  assert.equal(r.state.ending, "smitten");
});

test("Showboat: crowing instead of warning", () => {
  const r = run([...toPavilion(), ...winRest("ticket", "hero")]);
  assert.equal(r.state.ending, "showboat");
});

test("Dark Side needs temptation 3 and rewinds to the Pavilion at 2", () => {
  const low = run([...toPavilion({ phone: "follow", vip: "follow" }), V("talk"), H("gobbler"), C("henny")]);
  assert.ok(!choicesFor(low.state).some((o) => o.id === "bite"), "no One bite below 3");
  const high = run([...toPavilion({ phone: "follow", vip: "follow", ring: "follow" }), V("talk"), H("gobbler"), C("henny")]);
  assert.equal(high.state.temptation, 3);
  assert.equal(vatState(high.state), "rolling");
  assert.ok(choicesFor(high.state).some((o) => o.id === "bite"));
  const dark = run([C("bite")], high.state);
  assert.equal(dark.state.ending, "darkside");
  const back = run([R], dark.state);
  assert.equal(back.state.room, "pavilion");
  assert.equal(back.state.mode, "play");
  assert.equal(back.state.temptation, 2);
  // Robbed Pip, so she won't help with the rope until he gives her tickets back (no soft-lock: he can still go do it).
  const refused = run(winRest("ticket"), back.state);
  assert.notEqual(refused.state.flags.rope_open, true);
  const repaid = run([G("out"), V("use"), I("tickets"), H("kids"), G("rope")], back.state);
  assert.equal(repaid.state.room, "pavilion");
  const won = run(winRest("ticket"), repaid.state);
  assert.equal(won.state.ending, "smitten");
});

test("Refusing at a rolling boil settles the vat", () => {
  const high = run([...toPavilion({ phone: "follow", vip: "follow", ring: "follow" }), V("talk"), H("gobbler"), C("henny"), C("ticket")]);
  assert.equal(high.state.temptation, 2);
  assert.ok(high.texts.some((t) => t.includes("rolling boil settles")));
});

test("Returning the VIP card and repaying Pip pull temptation back", () => {
  const r = run(toPavilion({ phone: "follow", vip: "follow", ring: "follow", kind: true }));
  assert.equal(r.state.temptation, 2); // 3 - Pip repaid
  const t = run([V("talk"), H("gobbler"), C("henny"), C("vip")], r.state);
  assert.equal(t.state.temptation, 1);
  assert.equal(t.state.mode, "choice");
  assert.equal(t.state.crowRound, 1);
});

test("Egg fried after too many wrong answers, retry rewinds with comebacks kept", () => {
  const r = run([...toPavilion(), V("talk"), H("gobbler"), C("mean"), C("flex"), C("mean")]);
  assert.equal(r.state.ending, "eggfried");
  const back = run([R], r.state);
  assert.equal(back.state.room, "pavilion");
  assert.equal(back.state.heat, 0);
  const won = run(winRest(), back.state);
  assert.equal(won.state.flags.egg_saved, true);
});

test("Fixing the clock buys one more wrong answer", () => {
  const steps = toPavilion();
  const at = steps.findIndex((s) => s.t === "hotspot" && s.id === "rope");
  steps.splice(at - 2, 0, V("look"), H("clock"), V("push"), H("clock"));
  const r = run([...steps, V("talk"), H("gobbler"), C("mean"), C("flex"), C("mean")]);
  assert.equal(r.state.flags.clock_fixed, true);
  assert.equal(r.state.mode, "choice");
});

test("unlearned comebacks are locked (???)", () => {
  const s = newGame();
  s.room = "pavilion"; s.flags.pavilion_in = true;
  const r = run([V("talk"), H("gobbler")], s);
  const opt = choicesFor(r.state).find((o) => o.id === "henny");
  assert.equal(opt.locked, true);
  const tried = run([C("henny")], r.state);
  assert.equal(tried.state.crowRound, 0);
});

test("feed-store sign burns letters per temptation level", () => {
  const read = (t) => signLetters({ temptation: t }).filter((x) => x.on).map((x) => x.ch).join("");
  assert.equal(read(0), "NED'SFEED&SEED");
  assert.equal(read(2), "ED'SFED");
  assert.equal(read(3), "FED");
  assert.equal(read(4), "FED");
});

test("computeEnding priorities", () => {
  assert.equal(computeEnding({ flags: { showboat: true }, temptation: 0 }), "showboat");
  assert.equal(computeEnding({ flags: { ticket_shown: true }, temptation: 0 }), "hero");
  assert.equal(computeEnding({ flags: { ticket_shown: true }, temptation: 1 }), "smitten");
});

test("every room hotspot is reachable data (ids unique per room)", () => {
  for (const room of Object.values(ROOMS)) {
    const ids = room.spots.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, room.id);
  }
});

/* ---------- Pavilion rope puzzle ---------- */
test("rope puzzle: trust path. Refusing Corny's rig earns Pip's trust and she opens the padlocked rope", () => {
  const r = run(toPavilion()); // ring = "pull" (refused the rig)
  assert.equal(r.state.flags.refused_ring, true);
  assert.equal(r.state.flags.pip_trust, true);
  assert.notEqual(r.state.flags.rope_open, true, "rope starts padlocked");
  const blocked = run([V("talk"), H("gobbler"), C("henny"), C("ticket"), C("warn"), V("use"), I("mirror"), H("lamp"), V("use"), I("basket"), H("cage")], r.state);
  assert.notEqual(blocked.state.flags.egg_saved, true, "vat out of reach while the rope is locked");
  assert.ok(blocked.texts.some((t) => t.includes("padlocked rope")));
  const open = run([V("talk"), H("pip")], blocked.state);
  assert.equal(open.state.flags.rope_open, true);
  assert.ok(open.texts.some((t) => t.includes("You caught me last time")));
  const done = run([V("use"), I("basket"), H("cage")], open.state);
  assert.equal(done.state.flags.egg_saved, true);
  assert.equal(done.state.ending, "hero");
});

test("rope puzzle: an honest ring-toss win, or using the key ring with Pip's trust, also works", () => {
  // ring = "pull" path wins honestly with the speaker too; trust is already set. Using the key ring hands it to Pip.
  const r = run([...toPavilion(), V("use"), H("keyring")]);
  assert.equal(r.state.flags.rope_open, true);
  assert.equal(r.state.flags.pip_helped, true);
});

test("rope puzzle: refusal path. Rigging the ring-toss without repaying Pip keeps the rope locked with a hint", () => {
  const r = run(toPavilion({ ring: "follow" }));
  assert.equal(r.state.flags.pip_robbed, true);
  assert.notEqual(r.state.flags.pip_trust, true);
  const asked = run([V("talk"), H("pip"), V("use"), H("keyring")], r.state);
  assert.notEqual(asked.state.flags.rope_open, true);
  assert.ok(asked.texts.some((t) => t.includes("my tickets")));
  assert.ok(asked.texts.some((t) => t.includes("prize tickets is still in his belt")));
  const fresh = newGame();
  fresh.room = "pavilion"; fresh.flags.pavilion_in = true;
  const stranger = run([V("talk"), H("pip")], fresh);
  assert.ok(stranger.texts.some((t) => t.includes("ring-toss")), "unrobbed refusal points back to the ring-toss");
});

test("rope puzzle: no soft-lock. After winning the crowd without trust he can leave, repay Pip, and finish", () => {
  let st = run(toPavilion({ ring: "follow" })).state;
  st = run([V("talk"), H("gobbler"), C("henny"), C("ticket"), C("warn"), V("use"), I("mirror"), H("lamp")], st).state;
  assert.equal(st.flags.crowd_won, true);
  assert.equal(st.mode, "play");
  assert.ok(st.inv.includes("tickets"), "the tickets can't be lost, so trust is always earnable");
  const stuck = run([V("use"), I("basket"), H("cage")], st);
  assert.notEqual(stuck.state.flags.egg_saved, true);
  const out = run([G("out")], stuck.state);
  assert.equal(out.state.room, "midway", "exit stays open after the crow-down");
  const back = run([V("use"), I("tickets"), H("kids"), G("rope"), V("talk"), H("pip"), V("use"), I("basket"), H("cage")], out.state);
  assert.equal(back.state.flags.rope_open, true);
  assert.equal(back.state.flags.egg_saved, true);
  assert.equal(back.state.mode, "end");
});

test("rope puzzle: an opened rope survives an Egg Fried rewind", () => {
  const r = run([...toPavilion(), V("talk"), H("pip"), V("talk"), H("gobbler"), C("mean"), C("flex"), C("mean")]);
  assert.equal(r.state.ending, "eggfried");
  const back = run([R], r.state);
  assert.equal(back.state.flags.rope_open, true);
});
