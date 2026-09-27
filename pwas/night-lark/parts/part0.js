import { createRoot as qt } from "react-dom/client";
import { useEffect as Xt, useRef as dt, useState as je } from "react";
var Dt = {
  A: "111101111101101",
  B: "110101110101110",
  C: "111100100100111",
  D: "110101101101110",
  E: "111100110100111",
  F: "111100110100100",
  G: "111100101101111",
  H: "101101111101101",
  I: "111010010010111",
  J: "001001001101111",
  K: "101101110101101",
  L: "100100100100111",
  M: "101111111101101",
  N: "111101101101101",
  O: "111101101101111",
  P: "111101111100100",
  Q: "111101101111001",
  R: "111101111110101",
  S: "111100111001111",
  T: "111010010010010",
  U: "101101101101111",
  V: "101101101101010",
  W: "101101111111101",
  X: "101101010101101",
  Y: "101101111010010",
  Z: "111001010100111",
  0: "111101101101111",
  1: "010110010010111",
  2: "111001111100111",
  3: "111001111001111",
  4: "101101111001001",
  5: "111100111001111",
  6: "111100111101111",
  7: "111001001001001",
  8: "111101111101111",
  9: "111101111001111",
  ".": : "000000000000010",
  "-": "000000111000000",
  "!": : "010010010000010",
  "?" : "111001011000010",
  "'" : "010010000000000",
  ":" : "000010000010000",
  "/" : "001001010100100",
  "+" : "000010111010000",
  "<" : "001010100010001",
  ">" : "100010001010100",
};
function z(t, f, y, k, L, d = 1) {
  t.fillStyle = L;
  let w = Math.round(y),
    K = Math.round(k);
  for (let $ of f) {
    let F = $.toUpperCase();
    if (F === " ") {
      w += 4 * d;
      continue;
    }
    let H = Dt[F];
    if (!H) {
      w += 4 * d;
      continue;
    }
    for (let b = 0; b < 15; b++)
      H[b] === "1" &&
        t.fillRect(w + (b % 3) * d, K + Math.floor(b / 3) * d, d, d);
    w += 4 * d;
  }
}
function Oe() {
  return Array.from({ length: 14 }, () => ".".repeat(40));
}
function U(t, f, y, k, L, d) {
  for (let w = f; w <= y; w++) {
    let K = t[w].split("");
    for (let $ = k; $ <= L; $++) K[$] = d;
    t[w] = K.join("");
  }
}
function h(t, f, y, k) {
  let L = t[f].split("");
  ((L[y] = k), (t[f] = L.join("")));
}
function ke(t) {
  if (t.rows.length !== 14) throw new Error(`${t.name} rows`);
  for (let f of t.rows)
    if (f.length !== 40) throw new Error(`${t.name} len ${f.length}`);
  return t;
}
function Ot() {
  let t = Oe();
  return (
    U(t, 8, 13, 0, 7, "s"),
    U(t, 8, 13, 14, 39, "#"),
    h(t, 2, 10, "a"),
    h(t, 2, 20, "a"),
    h(t, 7, 3, "P"),
    h(t, 7, 5, "n"),
    h(t, 7, 16, "m"),
    h(t, 7, 22, "E"),
    ke({
      name: "FIRST RING",
      rows: t,
      guards: [],
      notes: [
        `CLICK A RING
W REELS IN
S PAYS THE LINE
RUN OFF AND SWING`,
      ],
    })
  );
}
function kt() {
  let t = Oe();
  return (
    U(t, 12, 13, 0, 6, "s"),
    U(t, 12, 13, 7, 25, "#"),
    U(t, 12, 13, 26, 32, "s"),
    U(t, 12, 13, 33, 39, "#"),
    U(t, 8, 8, 27, 32, "#"),
    U(t, 0, 11, 34, 35, "D"),
    h(t, 3, 8, "a"),
    h(t, 3, 18, "a"),
    h(t, 3, 29, "a"),
    h(t, 11, 3, "P"),
    h(t, 11, 6, "n"),
    h(t, 11, 12, "b"),
    h(t, 11, 16, "L"),
    h(t, 11, 30, "n"),
    h(t, 7, 28, "k"),
    h(t, 7, 30, "*"),
    h(t, 7, 32, "m"),
    h(t, 11, 38, "E"),
    ke({
      name: "LAMP COURT",
      rows: t,
      guards: [{ c0: 14, c1: 24, c: 16, dir: 1, speed: 26, floor: 12 }],
      notes: [
        `BLUE STONE HIDES A CROUCH
A LAMP UNDOES IT
REEL UP TO THE KEY`,
        `S PAYS THE LINE OUT
JUMP TO LAND ON IT`,
      ],
    })
  );
}
function Kt() {
  let t = Oe();
  return (
    U(t, 9, 13, 0, 7, "s"),
    U(t, 9, 13, 32, 36, "s"),
    U(t, 9, 13, 37, 39, "#"),
    h(t, 4, 4, "a"),
    h(t, 4, 12, "a"),
    h(t, 4, 20, "a"),
    h(t, 4, 28, "a"),
    h(t, 8, 3, "P"),
    h(t, 8, 1, "n"),
    h(t, 6, 20, "m"),
    h(t, 8, 34, "E"),
    ke({
      name: "THE GAP",
      rows: t,
      guards: [{ c0: 37, c1: 38, c: 38, dir: -1, speed: 10, floor: 9 }],
      notes: [
        `PAY THE LINE OUT
TAKE THE NEXT RING
WHILE YOU ARE IN THE AIR`,
      ],
    })
  );
}
function Ht() {
  let t = Oe();
  return (
    U(t, 12, 13, 0, 14, "s"),
    U(t, 12, 13, 15, 24, "#"),
    U(t, 12, 13, 25, 39, "s"),
    h(t, 5, 12, "a"),
    h(t, 5, 22, "a"),
    h(t, 11, 3, "P"),
    h(t, 11, 6, "n"),
    h(t, 11, 20, "L"),
    h(t, 11, 32, "m"),
    h(t, 11, 37, "E"),
    ke({
      name: "EAST EAVES",
      rows: t,
      guards: [{ c0: 16, c1: 23, c: 18, dir: 1, speed: 28, floor: 12 }],
      notes: [
        `THE FAR SHADOW KEEPS A SPARK
THEN THE DOORLESS EXIT`,
      ],
    })
  );
}
var Ke = [Ot(), kt(), Kt(), Ht()],
  Ve = "nightlark.save.v1";
var B = 320,
  Z = 180,
  Ue = 640,
  Wt = 224,
  ue = 5,
  Ut = 820,
  Gt = 100,
  _t = 52,
  Yt = -270,
  it = 176,
  Bt = 224,
  at = 28,
  ft = 110,
  ut = "#12141c",
  He = "#1c2438",
  D = "#f3e6c1",
  Te = "#8b93ad",
  Y = "#c4542c",
  ce = "#3ecfb2",
  Se = "#3d4663",
  $t = Array.from({ length: 42 }, (t, f) => ({
    x: (f * 137) % Ue,
    y: (f * 53) % 88,
    n: (f % 3) + 1,
  }));
function Ft() {
  let t = 0;
  for (let f of Ke) for (let y of f.rows) for (let k of y) k === "m" && t++;
  return t;
}
var Xe = Ft();
function Q(t, f, y, k) {
  return Math.hypot(t - y, f - k);
}
function Je(t) {
  let f = Math.max(0, Math.floor(t));
  return `${Math.floor(f / 60)}:${(f % 60).toString().padStart(2, "0")}`;
}
function Vt(t, f) {
  return t === 0 && f >= Xe ? "S" : t === 0 ? "A" : t <= 2 ? "B" : "C";
}
function ct() {
  let t = { version: 1, bestTime: null, bestRank: null, bestAlerts: null };
  try {
    let f = localStorage.getItem(Ve);
    if (!f) return t;
    let y = JSON.parse(f);
    return y.version !== 1 ? t : y;
  } catch {
    return t;
  }
}
function Jt(t) {
  try {
    localStorage.setItem(Ve, JSON.stringify(t));
  } catch {}
}
function mt() {
  let t =
      typeof matchMedia < "u" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    f = "title",
    y = ct(),
    k = null,
    L = new Set(),
    d = new Set(),
    w = new Set(),
    K = 0,
    $ = [],
    F = [],
    H = [],
    b = [],
    x = [],
    E = { x: 48, y: 128 },
    me = "",
    c = 48,
    p = 128,
    R = 0,
    v = 0,
    te = 1,
    S = !0,
    oe = 0.08,
    he = 0,
    ye = !1,
    G = 14,
    A = null,
    re = it,
    V = !1,
    Ge = !1,
    le = !1,
    se = !1,
    Ce = !1,
    Le = new Set(),
    Ee = new Set(),
    ne = 0,
    de = 0,
    we = 0,
    ge = 0,
    ie = 0,
    O = null,
    ve = 0,
    ae = 0,
    N = 0,
    W = 0,
    Ae = 0,
    xe = [],
    X = null,
    _e = !1;
  function fe() {
    for (let e of L) e();
  }
  function Re() {
    return se ? Bt : it;
  }
  function _(e, n, a = 0.045) {
    if (_e || !X) return;
    let r = X.createOscillator(),
      s = X.createGain();
    ((r.type = "square"),
      (r.frequency.value = e),
      (s.gain.value = a),
      r.connect(s),
      s.connect(X.destination));
    let l = X.currentTime;
    (s.gain.setValueAtTime(a, l),
      s.gain.exponentialRampToValueAtTime(1e-4, l + n),
      r.start(l),
      r.stop(l + n));
  }
  function Me(e, n) {
    return n < 0 || n >= 14 ? "." : e < 0 || e >= 40 ? "#" : ($[n][e] ?? ".");
  }
  function yt(e, n) {
    let a = Me(e, n);
    return a === "b" || (a === "D" && !le);
  }
  function qe(e, n) {
    let a = Me(e, n);
    if (a !== "#" && a !== "s") return !1;
    if (n === 0) return !0;
    let r = Me(e, n - 1);
    return !(r === "#" || r === "s" || r === "b" || (r === "D" && !le));
  }
  function Ie(e, n, a) {
    let r = e - ue,
