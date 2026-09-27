        T = j / q,
        st = q - re;
      ((c -= pe * st), (p -= T * st));
      let Fe = R * pe + v * T;
      Fe > 0 && ((R -= Fe * pe), (v -= Fe * T));
    }
    if (!V || !A) return;
    let n = p - G * 0.5,
      a = c - A.x,
      r = n - A.y,
      s = Math.hypot(a, r) || 1,
      l = -r / s,
      o = a / s,
      i = d.has("KeyD") || d.has("ArrowRight"),
      u = d.has("KeyA") || d.has("ArrowLeft"),
      g = (i ? 1 : 0) - (u ? 1 : 0);
    if (g !== 0 && Math.abs(l) > 0.08) {
      let I = g * Math.sign(l);
      ((R += l * I * 980 * e), (v += o * I * 980 * e));
    }
  }
  function At(e) {
    let n = d.has("KeyA") || d.has("ArrowLeft"),
      a = d.has("KeyD") || d.has("ArrowRight"),
      r = d.has("KeyW") || d.has("ArrowUp"),
      s = d.has("KeyS") || d.has("ArrowDown"),
      o = d.has("Space") && !w.has("Space"),
      i =
        (d.has("KeyE") || d.has("Enter")) && !w.has("KeyE") && !w.has("Enter"),
      u = d.has("KeyJ") && !w.has("KeyJ");
    if (O) {
      i && (O = null);
      return;
    }
    if (
      (n && !a && (te = -1),
      a && !n && (te = 1),
      (ye = s || d.has("KeyC")),
      (G = ye ? 8 : 14),
      i && Ze(),
      u)
    )
      if (A) be();
      else {
        let T = Qe();
        T && ze(T, !S);
      }
    if (
      (A && r && (re = Math.max(at, re - ft * e)),
      A && s && (re = Math.min(Re(), re + ft * e)),
      o ? (he = 0.1) : (he = Math.max(0, he - e)),
      A && o)
    ) {
      let T = v > -40 ? -210 : v - 30;
      (be(), (v = T), (S = !1), (oe = 0), (he = 0), _(300, 0.04));
    } else
      he > 0 &&
        (S || oe > 0) &&
        !A &&
        ((v = Yt), (S = !1), (oe = 0), (he = 0), _(340, 0.04));
    let g = S;
    (S || (oe = Math.max(0, oe - e)), (v += Ut * e), v > 460 && (v = 460));
    let I = ye ? _t : Gt,
      C = (a ? 1 : 0) - (n ? 1 : 0);
    if (!V || S)
      if (C !== 0)
        if (S && !V) R = C * I;
        else {
          R += C * 640 * e;
          let T = I + 30;
          (R > T && (R = T), R < -T && (R = -T));
        }
      else S && !V && (R *= 0.2);
    let P = c;
    ((c += R * e),
      c < ue + 1 && ((c = ue + 1), (R = 0)),
      c > Ue - ue - 1 && ((c = Ue - ue - 1), (R = 0)),
      Ie(c, p, G) && ((c = P), (R = 0)));
    let j = p,
      q = v;
    ((p += v * e),
      (S = !1),
      Ie(c, p, G) &&
        (q >= 0
          ? ((p = Math.floor(p / 16) * 16 - 0.02),
            (v = 0),
            (S = !0),
            !g && V && q > 60 && be())
          : ((p = Math.floor((p - G) / 16) * 16 + 16 + G + 0.02), (v = 0))),
      Ie(c, p, G) || et(j, q));
    let pe = p;
    (vt(e),
      Ie(c, p, G) && ((c = P), (p = pe), (R = 0)),
      p >= pe && et(pe, q),
      ((g && S) || S) && (oe = 0.08));
    for (let T of [...b])
      T.t === "n" || T.t === "E" || (Q(c, J(), T.x, T.y) < 20 && Mt(T));
    p > (A ? 520 : 270) &&
      (be(),
      (c = E.x),
      (p = E.y),
      (R = 0),
      (v = 0),
      (S = !0),
      (ae = t ? 0 : 4),
      _(70, 0.12, 0.05));
  }
