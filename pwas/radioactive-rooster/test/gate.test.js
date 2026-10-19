// Gate booth (Arlong, 2026-10-18): the guard reads as inside the booth. Every frame he can show sits inside the
// window opening (cap under the header), and the roof/header pixels are on the front occluder drawn over him.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOMS } from "../data/script.js";
import { castSprites, behind } from "../js/walk.js";
import { png } from "./png-helper.js";

const OPENING = { x0: 126, x1: 196, top: 62 }; // window opening in bg/gate (inside the posts, under the header beam)
const load = (id) => png(`art/pixel/${id}.png`);

test("the gate guard's cap and face stay inside the booth window; the roof and header occlude him", () => {
  const room = ROOMS.gate;
  const g = room.cast.find((c) => c.spot === "guard");
  const occ = load("fg/gate--front");
  assert.ok(behind(g.at[1], room.occluders[0].base), "front occluder is drawn over the guard");
  for (const name of castSprites(g)) {
    const img = load(`sprite/${name}-h${g.height}`);
    const left = g.at[0] - Math.floor(img.w / 2), topY = g.at[1] - img.h;
    let top = Infinity, shown = 0;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      if (img.px(x, y)[3] === 0) continue;
      const X = left + x, Y = topY + y;
      top = Math.min(top, Y);
      const covered = occ.px(X, Y)[3] > 0;
      if (!covered) {
        shown++;
        assert.ok(Y >= OPENING.top && X >= OPENING.x0 && X < OPENING.x1, `${name}: visible pixel (${X},${Y}) outside the window`);
      }
    }
    assert.ok(top >= OPENING.top - 1, `${name}: cap top y${top} under the header (y${OPENING.top})`);
    assert.ok(shown > 600, `${name}: still clearly visible (${shown} px)`);
  }
  // the header and roof are on the occluder, the opening is not
  const a = (x, y) => occ.px(x, y)[3];
  assert.ok(a(150, 60) > 0 && a(150, 40) > 0, "header beam and roof cut");
  assert.equal(a(150, 70), 0, "window opening stays clear");
});
