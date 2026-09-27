        i = A.y,
        u = c + te * 3,
        g = p - G * 0.45,
        I = Math.ceil(Q(o, i, u, g));
      e.fillStyle = D;
      for (let C = 0; C <= I; C += 2) {
        let P = I ? C / I : 0;
        e.fillRect(
          Math.round(o + (u - o) * P - N),
          Math.round(i + (g - i) * P - W),
          1,
          1,
        );
      }
    }
    for (let o of b) {
      let i = Math.round(o.x - N),
        u = Math.round(o.y - W);
      o.t === "m"
        ? ((e.fillStyle = ce),
          e.fillRect(i - 1, u, 3, 1),
          e.fillRect(i, u - 2, 1, 5))
        : o.t === "k"
          ? ((e.fillStyle = Y),
            e.fillRect(i - 3, u, 6, 2),
            e.fillRect(i + 2, u - 2, 2, 2))
          : o.t === "*"
            ? ((e.fillStyle = D),
              e.fillRect(i - 2, u - 2, 5, 1),
              e.fillRect(i - 2, u + 2, 5, 1),
              e.fillRect(i - 2, u - 1, 1, 3),
              e.fillRect(i + 2, u - 1, 1, 3))
            : o.t === "n"
              ? ((e.fillStyle = D),
                e.fillRect(i - 3, u - 3, 6, 7),
                (e.fillStyle = He),
                e.fillRect(i - 2, u - 1, 4, 1),
                e.fillRect(i - 2, u + 1, 3, 1))
              : o.t === "E" &&
                ((e.fillStyle = ce),
                e.fillRect(i - 4, u - 6, 8, 2),
                e.fillRect(i - 4, u - 4, 2, 8),
                e.fillRect(i + 2, u - 4, 2, 8));
    }
    for (let o of x) {
      let i = o.x - N,
        u = o.floorY - 12 - W;
      ((e.fillStyle = o.sees ? Y : Te),
        (e.globalAlpha = 0.28),
        e.beginPath(),
        e.moveTo(i, u));
      let g = o.dir > 0 ? 0 : Math.PI;
      (e.lineTo(i + Math.cos(g - 0.62) * 78, u + Math.sin(g - 0.62) * 78),
        e.lineTo(i + Math.cos(g + 0.62) * 78, u + Math.sin(g + 0.62) * 78),
        e.closePath(),
        e.fill(),
        (e.globalAlpha = 1),
        nt(e, o.x, o.floorY, o.dir, !1, "guard"));
    }
    nt(e, c, p, te, ye && S, "player");
    for (let o of xe)
      ((e.globalAlpha = Math.max(0, o.life * 3)),
        (e.fillStyle = o.color),
        e.fillRect(Math.round(o.x - N), Math.round(o.y - W), 2, 2));
    if (((e.globalAlpha = 1), f === "play" || f === "pause")) {
      ((e.fillStyle = Se),
        e.fillRect(8, 8, 42, 5),
        (e.fillStyle = ne > 0.66 ? Y : ce),
        e.fillRect(9, 9, Math.round(40 * ne), 3),
        z(e, Je(ge), B - 8 - Je(ge).length * 4, 8, D, 1),
        z(e, `SEE ${de}`, 8, 16, de ? Y : Te, 1));
      for (let i = 0; i < Xe; i++)
        ((e.fillStyle = i < De() ? ce : Se), e.fillRect(56 + i * 6, 8, 3, 3));
      (O || z(e, me, 8, Z - 12, Te, 1), se && z(e, "CHARM", B - 28, 18, D, 1));
      let o = !1;
      for (let i of b)
        (i.t === "n" || i.t === "E") && Q(c, J(), i.x, i.y) < 26 && (o = !0);
      (o &&
        !O &&
        z(e, "E", Math.round(c - N) - 2, Math.round(p - G - W) - 10, D, 1),
        K === 0 &&
          !Ge &&
          !O &&
          (z(e, "CLICK THE RING", 104, 24, D, 1),
          z(e, "A D   SPACE   J", 100, 34, Te, 1)),
        O &&
          ((e.fillStyle = He),
          e.fillRect(16, Z - 52, B - 32, 40),
          (e.fillStyle = D),
          e.fillRect(16, Z - 52, B - 32, 1),
          O.forEach((i, u) => z(e, i, 22, Z - 46 + u * 8, D, 1))),
        ie > 0 && z(e, "THROUGH", 124, 80, D, 2),
        Ae > 0.25 && z(e, "SEEN", 140, 78, Y, 2));
    }
  }
  function ot(e) {
    (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    ) && e.preventDefault(),
      !e.repeat &&
        (d.add(e.code),
        e.code === "Escape"
          ? (f === "play"
              ? (f = "pause")
              : f === "pause"
                ? (f = "play")
                : f === "how"
                  ? (f = "title")
                  : f === "title" && (f = "how"),
            fe())
          : e.code === "KeyM"
            ? (_e = !_e)
            : e.code === "KeyR" && (f === "play" || f === "pause")
              ? (Pe(K), (f = "play"), fe())
              : e.code === "KeyH" && f === "title" && ((f = "how"), fe())));
