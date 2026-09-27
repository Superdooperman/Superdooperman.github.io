  function tt(e) {
    let n = gt(),
      a = !1;
    for (let s of x) {
      s.x += s.dir * s.speed * e;
      let l = s.c0 * 16 + 8,
        o = s.c1 * 16 + 8;
      s.x < l ? ((s.x = l), (s.dir = 1)) : s.x > o && ((s.x = o), (s.dir = -1));
      let i = s.x,
        u = s.floorY - 12,
        g = c - i,
        I = J() - u,
        C = Math.hypot(g, I);
      if (((s.sees = !1), !n && C < 78 && C > 1)) {
        let P = Math.atan2(I, g),
          j = s.dir > 0 ? 0 : Math.PI,
          q = Math.atan2(Math.sin(P - j), Math.cos(P - j));
        Math.abs(q) < 0.62 && Ye(i, u, c, J()) && ((s.sees = !0), (a = !0));
      }
    }
    (a
      ? (ne = Math.min(1, ne + 0.85 * (se ? 0.7 : 1) * e))
      : (ne = Math.max(0, ne - 0.6 * e)),
      ne >= 1 &&
        ((de += 1),
        (ne = 0),
        (we = 0.65),
        (Ae = 0.65),
        be(),
        (c = E.x),
        (p = E.y),
        (R = 0),
        (v = 0),
        (S = !0),
        (ae = t ? 0 : 7),
        _(90, 0.18, 0.06)));
  }
  function xt(e) {
    let n = Math.min(0.05, e);
    ((ve += n), ae > 0 && (ae = Math.max(0, ae - n * 18)), Ae > 0 && (Ae -= n));
    for (let a = xe.length - 1; a >= 0; a--) {
      let r = xe[a];
      ((r.life -= n),
        (r.x += r.vx * n),
        (r.y += r.vy * n),
        r.life <= 0 && xe.splice(a, 1));
    }
    (f === "play" &&
      (ie > 0
        ? ((ie -= n), ie <= 0 && Pe(K + 1))
        : we > 0
          ? ((we -= n), (ge += n), tt(0))
          : O
            ? (d.has("KeyE") || d.has("Enter")) &&
              !w.has("KeyE") &&
              !w.has("Enter") &&
              (O = null)
            : ((ge += n), At(n), tt(n))),
      (w = new Set(d)));
  }
  function Tt() {
    let e = c - B / 2 + te * 24,
      n = p - Z * 0.62;
    ((e = Math.max(0, Math.min(Ue - B, e))),
      (n = Math.max(0, Math.min(Wt - Z, n))),
      !t &&
        ae > 0 &&
        ((e += Math.round(Math.sin(ve * 40) * ae)),
        (n += Math.round(Math.cos(ve * 36) * ae * 0.6))),
      (N = Math.round(e)),
      (W = Math.round(n)));
  }
  function Nt(e, n) {
    return { x: e + N, y: n + W };
  }
  function $e() {
    (typeof AudioContext < "u" && (X || (X = new AudioContext()), X.resume()),
      wt(),
      (f = "play"),
      fe());
  }
  function Ct(e, n) {
    if (f === "title") {
      $e();
      return;
    }
    if (f !== "play" || ie > 0 || we > 0) return;
    if (O) {
      O = null;
      return;
    }
    let a = Nt(e, n);
    for (let l of b)
      if (
        !(l.t !== "n" && l.t !== "E") &&
        Q(a.x, a.y, l.x, l.y) < 14 &&
        Q(c, J(), l.x, l.y) < 30
      ) {
        Ze();
        return;
      }
    let r = null,
      s = 48;
    for (let l of F) {
      let o = Q(a.x, a.y, l.x, l.y);
      o < s && ((r = l), (s = o));
    }
    if (r) {
      ze(r, !S);
      return;
    }
    A && be();
  }
  function Lt(e, n, a, r) {
    let s = n * 16 - N,
      l = a * 16 - W;
