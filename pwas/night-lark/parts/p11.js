      (R = 0),
      (v = 0),
      (te = 1),
      (S = !0),
      (oe = 0.08),
      (ne = 0),
      (we = 0),
      (G = 14),
      (ye = !1),
      (O = null),
      (ie = 0));
  }
  function De() {
    return Le.size + Ee.size;
  }
  function Rt() {
    se && (Ce = !0);
    for (let e of Ee) Le.add(e);
    Ee.clear();
  }
  function Mt(e) {
    (e.t === "k"
      ? ((le = !0), _(880, 0.07), Be(e.x, e.y, Y))
      : e.t === "*"
        ? ((se = !0), _(740, 0.08), Be(e.x, e.y, D))
        : e.t === "m" && (Ee.add(e.id), _(980, 0.06), Be(e.x, e.y, ce)),
      (b = b.filter((n) => n !== e)));
  }
  function Ze() {
    if (O) {
      O = null;
      return;
    }
    let e = null,
      n = 28;
    for (let a of b) {
      if (a.t !== "n" && a.t !== "E") continue;
      let r = Q(c, J(), a.x, a.y);
      r < n && ((e = a), (n = r));
    }
    if (e) {
      if (e.t === "n") {
        ((O = (e.text ?? "...").split(`
`)),
          _(420, 0.05));
        return;
      }
      St();
    }
  }
  function St() {
    (Rt(), _(520, 0.08), K >= Ke.length - 1 ? Et() : (ie = 0.65));
  }
  function Et() {
    let e = {
      time: ge,
      alerts: de,
      motes: De(),
      motesMax: Xe,
      rank: Vt(de, De()),
    };
    ((k = e), (f = "win"));
    let n = ["S", "A", "B", "C"];
    ((y.bestRank == null ||
      n.indexOf(e.rank) < n.indexOf(y.bestRank) ||
      (e.rank === y.bestRank && (y.bestTime == null || e.time < y.bestTime))) &&
      ((y = {
        version: 1,
        bestTime: e.time,
        bestRank: e.rank,
        bestAlerts: e.alerts,
      }),
      Jt(y)),
      _(523, 0.1),
      setTimeout(() => _(784, 0.14), 90),
      fe());
  }
  function wt() {
    ((Ce = !1),
      Le.clear(),
      (se = !1),
      (de = 0),
      (ge = 0),
      (Ge = !1),
      (Ae = 0),
      (k = null),
      Pe(0));
  }
  function et(e, n) {
    let a = Math.floor((c - ue) / 16),
      r = Math.floor((c + ue - 0.01) / 16),
      s = null;
    for (let o = a; o <= r; o++)
      for (let i = 0; i < 14; i++) {
        if (!qe(o, i)) continue;
        let u = i * 16;
        e <= u + 1 &&
          p >= u - 0.01 &&
          p < u + 16 &&
          (s === null || u < s) &&
          (s = u);
      }
    if (s === null) return !1;
    let l = !S;
    return ((p = s - 0.02), (v = 0), (S = !0), l && V && n > 60 && be(), !0);
  }
  function vt(e) {
    if (!A) {
      V = !1;
      return;
    }
    V = !1;
    for (let I = 0; I < 4; I++) {
      let C = p - G * 0.5,
        P = c - A.x,
        j = C - A.y,
        q = Math.hypot(P, j) || 1e-4;
      if (q <= re) break;
      V = !0;
      let pe = P / q,
