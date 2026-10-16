import assert from "node:assert/strict";
import test from "node:test";
import { act, newGame } from "../js/logic.js";

const V = (verb) => ({ t: "verb", verb });
const H = (id) => ({ t: "hotspot", id });
const G = (id) => ({ t: "go", id });
const I = (id) => ({ t: "item", id });
const C = (id) => ({ t: "choice", id });

function run(steps, state = newGame()) {
  const texts = [];
  for (const step of steps) {
    const result = act(state, step);
    state = result.state;
    for (const entry of result.lines) texts.push(entry.text);
  }
  return { state, texts };
}

function has(state, id) {
  return state.inv.includes(id);
}

test("the bucket has to be read before the fire escape", () => {
  const skipped = run([G("escape")]);
  assert.equal(skipped.state.room, "hq");
  assert.equal(skipped.state.flags.read_note, undefined);
  const read = run([V("look"), H("bucket")]);
  assert.equal(read.state.flags.read_note, true);
  assert.ok(read.texts.some((text) => text.includes("PAH-KAW") || text.includes("*pah.*")));
});

test("talking during the squat blows the disguise", () => {
  const blown = run([
    V("look"), H("bucket"),
    V("take"), H("bulb"),
    G("escape"),
    V("use"), H("rail"),
    V("talk"), H("henny"),
    G("door"),
  ]);
  assert.equal(blown.state.flags.blew_cover, true);
  assert.equal(blown.state.flags.henny_fooled, undefined);
  assert.equal(blown.state.room, "fence");
  assert.equal(blown.state.pose, null);
  const quiet = run([
    V("look"), H("bucket"),
    G("escape"),
    V("use"), H("rail"),
    G("door"),
  ]);
  assert.equal(quiet.state.room, "henhouse");
  assert.equal(quiet.state.flags.henny_fooled, true);
  assert.equal(quiet.state.pose, null);
});

function reachStore() {
  return [
    V("look"), H("bucket"),
    V("take"), H("bulb"),
    V("take"), H("crate"),
    V("take"), H("photos"),
    G("escape"),
    V("use"), H("rail"),
    G("door"),
    V("take"), H("spoon"),
    V("take"), H("stub"),
    V("use"), I("photo"), H("hen"),
    V("take"), H("grub"),
    G("back"),
    G("to-barn"),
    V("use"), I("grub"), H("goat"),
    G("to-town"),
  ];
}

test("the photo frees the grub and the grub frees the ribbon", () => {
  const early = run([
    V("look"), H("bucket"),
    V("take"), H("photos"),
    G("escape"),
    V("use"), H("rail"),
    G("door"),
    V("take"), H("grub"),
  ]);
  assert.equal(early.state.room, "henhouse");
  assert.equal(has(early.state, "grub"), false);
  const got = run([
    ...reachStore().slice(0, reachStore().length - 1),
  ]);
  assert.equal(got.state.room, "barn");
  assert.equal(has(got.state, "photo"), false);
  assert.equal(has(got.state, "grub"), false);
  assert.equal(has(got.state, "ribbon"), true);
  assert.equal(has(got.state, "spoon"), true);
});

function toFight(doorItem) {
  return [
    ...reachStore(),
    V("use"), I("spoon"), H("clerk"),
    G("to-wkuk"),
    V("use"), I("bulb"), I("geiger"),
    V("use"), I("geiger"), H("slot"),
    G("to-gate"),
    V("use"), I("mirror"), H("guard"),
    V("use"), H("cutout"),
    G("turnstile"),
    V("look"), H("stage"),
    V("talk"), H("stage"),
    V("use"), I("speaker"), H("bottles"),
    V("use"), I(doorItem), H("rope"),
    V("talk"), H("gobbler"),
  ];
}

function finish(doorItem, jogTarget) {
  const jogItem = jogTarget === "fryer" ? "sauce" : "mirror";
  return [
    ...toFight(doorItem),
    C("mean"),
    C("standard"),
    C("home"),
    C("warn"),
    V("use"), I(jogItem), H(jogTarget),
    V("use"), I("basket"), H("cage"),
  ];
}

test("mirror and ribbon save the egg and leave the hot sauce", () => {
  const done = run(finish("ribbon", "lamp"));
  assert.equal(done.state.mode, "end");
  assert.equal(done.state.flags.egg_saved, true);
  assert.equal(done.state.flags.crowd_won, true);
  assert.equal(has(done.state, "sauce"), true);
  assert.equal(has(done.state, "mirror"), true);
  assert.equal(has(done.state, "bulb"), false);
  assert.equal(has(done.state, "photo"), false);
  assert.equal(has(done.state, "spoon"), false);
  assert.equal(has(done.state, "basket"), false);
  assert.equal(has(done.state, "geiger"), true);
  assert.equal(has(done.state, "speaker"), true);
  assert.ok(done.texts.some((text) => text === "PAH-KAW!!!"));
  assert.equal(done.state.mood, "crow");
  assert.equal(done.state.pose, "squat");
  assert.ok(done.texts.some((text) => text.includes("best-looking trouble")));
});

test("the bill and the hot sauce are the other door and the other jog", () => {
  const done = run(finish("bill", "fryer"));
  assert.equal(done.state.flags.egg_saved, true);
  assert.equal(has(done.state, "sauce"), false);
  assert.equal(has(done.state, "bill"), true);
  assert.equal(has(done.state, "mirror"), true);
  assert.equal(has(done.state, "ribbon"), true);
});

test("a mean answer does not advance the crow-down", () => {
  const fight = run(toFight("ribbon"));
  assert.equal(fight.state.mode, "choice");
  assert.equal(fight.state.crowRound, 0);
  const mean = run([C("mean")], fight.state);
  assert.equal(mean.state.mode, "choice");
  assert.equal(mean.state.crowRound, 0);
  assert.equal(mean.state.flags.crowd_won, undefined);
});

test("the cage stays up until something jogs it", () => {
  const ready = run([
    ...toFight("ribbon"),
    C("standard"),
    C("home"),
    C("warn"),
    V("use"), I("basket"), H("cage"),
  ]);
  assert.equal(ready.state.flags.egg_saved, undefined);
  assert.equal(ready.state.flags.cage_jogged, undefined);
  assert.equal(has(ready.state, "basket"), true);
  assert.ok(ready.texts.at(-1).includes("Too high"));
});

test("the bulb can snap onto the counter in either order", () => {
  const forward = run([
    V("take"), H("bulb"),
    V("take"), H("crate"),
    V("use"), I("bulb"), I("geiger"),
  ]);
  assert.equal(forward.state.flags.geiger_rigged, true);
  assert.equal(has(forward.state, "bulb"), false);
  assert.equal(has(forward.state, "geiger"), true);
  const backward = run([
    V("take"), H("bulb"),
    V("take"), H("crate"),
    V("use"), I("geiger"), I("bulb"),
  ]);
  assert.equal(backward.state.flags.geiger_rigged, true);
  assert.equal(has(backward.state, "bulb"), false);
});
