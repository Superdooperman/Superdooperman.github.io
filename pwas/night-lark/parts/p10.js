      s = e + ue - 0.01,
      l = n - a,
      o = n - 0.01;
    if (l < 0 && !le) {
      let C = Math.floor(r / 16),
        P = Math.floor(s / 16);
      for (let j = C; j <= P; j++) if (Me(j, 0) === "D") return !0;
    }
    let i = Math.floor(r / 16),
      u = Math.floor(s / 16),
      g = Math.floor(l / 16),
      I = Math.floor(o / 16);
    for (let C = g; C <= I; C++)
      for (let P = i; P <= u; P++) if (yt(P, C)) return !0;
    return !1;
  }
  function Ye(e, n, a, r) {
    let s = Math.hypot(a - e, r - n),
      l = Math.max(1, Math.ceil(s / 4));
    for (let o = 1; o < l; o++) {
      let i = e + ((a - e) * o) / l,
        u = n + ((r - n) * o) / l,
        g = Me(Math.floor(i / 16), Math.floor(u / 16));
      if (g === "#" || g === "b" || g === "s" || (g === "D" && !le)) return !1;
    }
    return !0;
  }
  function J() {
    return p - G * 0.5;
  }
  function gt() {
    if (!ye) return !1;
    let e = Math.floor(c / 16),
      n = Math.floor((p + 1) / 16);
    if (Me(e, n) !== "s") return !1;
    for (let a of H) if (Q(c, J(), a.x, a.y) < 54) return !1;
    return !0;
  }
  function Be(e, n, a) {
    for (let r = 0; r < 6; r++) {
      let s = (r / 6) * Math.PI * 2;
      xe.push({
        x: e,
        y: n,
        vx: Math.cos(s) * 30,
        vy: Math.sin(s) * 30 - 10,
        life: 0.35,
        color: a,
      });
    }
  }
  function be() {
    A && ((A = null), (V = !1), _(180, 0.04, 0.03));
  }
  function ze(e, n) {
    let a = Q(c, J(), e.x, e.y);
    a > Re() + 6 ||
      (Ye(c, J(), e.x, e.y) &&
        ((A = e),
        (re = n ? Math.min(Re(), Math.max(at, a)) : Re()),
        (Ge = !0),
        (V = n),
        _(640, 0.05)));
  }
  function Qe() {
    let e = null,
      n = Re() + 0.01;
    for (let a of F) {
      let r = Q(c, J(), a.x, a.y);
      r < n && Ye(c, J(), a.x, a.y) && ((e = a), (n = r));
    }
    return e;
  }
  function Pe(e) {
    K = e;
    let n = Ke[e];
    ((me = n.name), ($ = n.rows.map((r) => r)), (F = []), (H = []), (b = []));
    let a = 0;
    for (let r = 0; r < 14; r++)
      for (let s = 0; s < 40; s++) {
        let l = $[r][s],
          o = s * 16 + 16 / 2,
          i = r * 16 + 16 / 2;
        if (l === "a") F.push({ x: o, y: i });
        else if (l === "L") H.push({ x: o, y: i });
        else if (l === "P") E = { x: o, y: (r + 1) * 16 - 0.02 };
        else if (
          l === "n" ||
          l === "k" ||
          l === "m" ||
          l === "*" ||
          l === "E"
        ) {
          let u = `${e}:${l}:${s}:${r}`;
          if ((l === "m" && Le.has(u)) || (l === "*" && Ce)) continue;
          b.push({
            t: l,
            x: o,
            y: i,
            id: u,
            text: l === "n" ? n.notes[a++] : void 0,
          });
        }
      }
    ((x = n.guards.map((r) => ({
      x: r.c * 16 + 16 / 2,
      dir: r.dir,
      c0: r.c0,
      c1: r.c1,
      speed: r.speed,
      floorY: r.floor * 16,
      sees: !1,
    }))),
      (le = !1),
      (se = Ce),
      Ee.clear(),
      (A = null),
      (V = !1),
      (c = E.x),
      (p = E.y),
