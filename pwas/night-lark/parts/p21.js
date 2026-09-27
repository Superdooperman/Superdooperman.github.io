    if (r === "s" || r === "#") {
      let o = qe(n, a);
      ((e.fillStyle = o
        ? r === "s"
          ? "#16343c"
          : He
        : r === "s"
          ? "#12262c"
          : "#161c2c"),
        e.fillRect(s, l, 16, 16),
        o &&
          ((e.fillStyle = r === "s" ? ce : Se),
          e.fillRect(s, l, 16, 2),
          (e.fillStyle = r === "s" ? "#1e4550" : "#243044"),
          e.fillRect(s, l + 6, 16, 1),
          e.fillRect(s, l + 12, 16, 1)));
      return;
    }
    if (r === "b") {
      ((e.fillStyle = "#3a2a22"),
        e.fillRect(s + 1, l + 2, 14, 14),
        (e.fillStyle = Y),
        e.fillRect(s + 1, l + 2, 14, 2),
        (e.fillStyle = D),
        e.fillRect(s + 6, l + 7, 3, 3));
      return;
    }
    if (r === "D" && !le) {
      ((e.fillStyle = "#2a221c"),
        e.fillRect(s + 2, l, 12, 16),
        (e.fillStyle = Y),
        e.fillRect(s + 2, l, 12, 2),
        e.fillRect(s + 10, l + 8, 2, 2));
      return;
    }
    r === "L" &&
      ((e.fillStyle = Se),
      e.fillRect(s + 7, l + 4, 2, 12),
      (e.fillStyle = Y),
      e.fillRect(s + 4, l, 8, 5),
      (e.fillStyle = D),
      e.fillRect(s + 6, l + 1, 2, 2));
  }
  function It(e, n, a, r) {
    let s = Math.round(n - N),
      l = Math.round(a - W);
    ((e.fillStyle = r ? ce : D),
      e.fillRect(s - 3, l - 2, 7, 1),
      e.fillRect(s - 3, l + 2, 7, 1),
      e.fillRect(s - 3, l - 1, 1, 3),
      e.fillRect(s + 3, l - 1, 1, 3),
      (e.fillStyle = r ? D : Y),
      e.fillRect(s - 1, l - 1, 3, 3));
  }
  function nt(e, n, a, r, s, l) {
    let o =
        l === "player" && S && Math.abs(R) > 8
          ? (Math.floor(ve * 2) % 2) * r
          : 0,
      i = s ? 8 : 14,
      u = Math.round(n - N) - 4,
      g = Math.round(a - W) - i;
    ((e.fillStyle = l === "guard" ? Te : He),
      e.fillRect(u, g + 3, 8, i - 3),
      (e.fillStyle = l === "guard" ? Se : "#10141f"),
      e.fillRect(u + 1, g, 6, 4),
      (e.fillStyle = l === "guard" ? Y : ce),
      e.fillRect(u + (r > 0 ? 4 : 2), g + 1, 2, 2),
      l === "player" &&
        ((e.fillStyle = Y), e.fillRect(u + (r > 0 ? 6 : 0), g + 5, 2, 2)),
      (e.fillStyle = l === "guard" ? Se : D),
      e.fillRect(u + 2 + o, g + i - 2, 2, 2),
      e.fillRect(u + 5 - o, g + i - 2, 2, 2));
  }
  function Pt(e) {
    (Tt(),
      (e.imageSmoothingEnabled = !1),
      (e.fillStyle = ut),
      e.fillRect(0, 0, B, Z),
      (e.fillStyle = "#1a2030"),
      e.beginPath(),
      e.arc(Math.round(500 - N * 0.2), 28, 10, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = ut),
      e.beginPath(),
      e.arc(Math.round(504 - N * 0.2), 26, 8, 0, Math.PI * 2),
      e.fill(),
      (e.fillStyle = D));
    for (let o of $t) {
      let i = Math.round(o.x - N * 0.25) % (B + 8),
        u = i < 0 ? i + B : i;
      (Math.floor(ve * 2) + o.n) % 7 !== 0 && e.fillRect(u, o.y, 1, 1);
    }
    e.fillStyle = "#1a2233";
    for (let o = 0; o < 8; o++) {
      let i = o * 90 - Math.round(N * 0.45);
      (e.fillRect(i, 96, 48, 40), e.fillRect(i + 10, 88, 8, 8));
    }
    let n = Math.max(0, Math.floor(N / 16) - 1),
      a = Math.min(39, Math.floor((N + B) / 16) + 1),
      r = Math.max(0, Math.floor(W / 16) - 1),
      s = Math.min(13, Math.floor((W + Z) / 16) + 1);
    for (let o = r; o <= s; o++)
      for (let i = n; i <= a; i++) Lt(e, i, o, $[o][i]);
    for (let o of H) {
      let i = o.x - N,
        u = o.y - W;
      ((e.fillStyle = Y),
        (e.globalAlpha = 0.18),
        e.fillRect(i - 24, u - 16, 48, 40),
        (e.globalAlpha = 1));
    }
    let l = Qe();
    for (let o of F) It(e, o.x, o.y, o === l && Q(c, J(), o.x, o.y) <= Re());
    if (A) {
      let o = A.x,
