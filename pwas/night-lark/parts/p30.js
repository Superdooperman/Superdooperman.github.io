  }
  function rt(e) {
    d.delete(e.code);
  }
  function lt() {
    d.clear();
  }
  return (
    typeof window < "u" &&
      (window.addEventListener("keydown", ot),
      window.addEventListener("keyup", rt),
      window.addEventListener("blur", lt),
      (window.__controlsTest = {
        getX: () => c,
        getSpeed: () => Math.abs(R),
        getYaw: () => te,
        setKeys: (e) => {
          d.clear();
          for (let n of e) d.add(n);
        },
      }),
      (window.__lark = () => ({
        phase: f,
        room: K,
        name: me,
        x: c,
        y: p,
        vx: R,
        vy: v,
        alerts: de,
        hooked: !!A,
        grounded: S,
        heat: ne,
        motes: De(),
        hasKey: le,
        hasCharm: se,
        ropeLen: re,
        hold: ie,
        lines: O?.length ?? 0,
        gx: x[0]?.x ?? -1,
        gdir: x[0]?.dir ?? 0,
        camX: N,
        camY: W,
      }))),
    Pe(0),
    {
      start() {
        $e();
      },
      again() {
        $e();
      },
      openHow() {
        ((f = "how"), fe());
      },
      closeHow() {
        ((f = "title"), fe());
      },
      resume() {
        f === "pause" && ((f = "play"), fe());
      },
      step: xt,
      draw: Pt,
      click: Ct,
      setKey(e, n) {
        n ? d.add(e) : d.delete(e);
      },
      setKeys(e) {
        d.clear();
        for (let n of e) d.add(n);
      },
      unlock() {
        typeof AudioContext > "u" ||
          (X || (X = new AudioContext()), X.resume());
      },
      getPhase: () => f,
      getWin: () => k,
      bestLabel() {
        return (
          (y = ct()),
          y.bestRank == null || y.bestTime == null
            ? ""
            : `BEST ${y.bestRank} ${Je(y.bestTime)}`
        );
      },
      subscribe(e) {
        return (L.add(e), () => L.delete(e));
      },
      dispose() {
        typeof window > "u" ||
          (window.removeEventListener("keydown", ot),
          window.removeEventListener("keyup", rt),
          window.removeEventListener("blur", lt));
      },
    }
  );
}
import { jsx as M, jsxs as ee } from "react/jsx-runtime";
var bt = [
  ["MOVE", "A D"],
  ["JUMP", "SPACE"],
  ["RING", "CLICK / J"],
  ["REEL", "W"],
  ["CROUCH", "S"],
  ["PAY LINE", "S"],
  ["USE", "E"],
  ["ROOM", "R"],
  ["MUTE", "M"],
];
function pt() {
  let t = dt(null),
    f = dt(null),
    [y, k] = je("title"),
    [L, d] = je(null),
    [w, K] = je("");
  Xt(() => {
