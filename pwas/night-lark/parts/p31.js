    let b = t.current;
    if (!b) return;
    let x = b.getContext("2d");
    if (!x) return;
    let E = mt();
    ((f.current = E), K(E.bestLabel()));
    let me = E.subscribe(() => {
        (k(E.getPhase()), d(E.getWin()), K(E.bestLabel()));
      }),
      c = 0,
      p = performance.now(),
      R = 0,
      v = (te) => {
        let S = Math.min(0.1, (te - p) / 1e3);
        for (p = te, R += S; R >= 1 / 60;) (E.step(1 / 60), (R -= 1 / 60));
        (E.draw(x), (c = requestAnimationFrame(v)));
      };
    return (
      (c = requestAnimationFrame(v)),
      () => {
        (cancelAnimationFrame(c), me(), E.dispose(), (f.current = null));
      }
    );
  }, []);
  function $() {
    let b = f.current;
    b && (b.unlock(), b.start());
  }
  function F(b, x) {
    return (E) => {
      (E.preventDefault(),
        x && E.currentTarget.setPointerCapture(E.pointerId),
        f.current?.setKey(b, x));
    };
  }
  function H(b) {
    return {
      onPointerDown: F(b, !0),
      onPointerUp: F(b, !1),
      onPointerCancel: F(b, !1),
    };
  }
  return ee("div", {
    className: "stage",
    children: [
      ee("div", {
        className: "frame",
        children: [
          M("canvas", {
            ref: t,
            width: B,
            height: Z,
            className: "pixel",
            "aria-label": "Night Lark",
            onPointerDown: (b) => {
              let x = b.currentTarget.getBoundingClientRect(),
                E = ((b.clientX - x.left) / x.width) * B,
                me = ((b.clientY - x.top) / x.height) * Z;
              f.current?.click(E, me);
            },
          }),
          y === "title" &&
            ee("div", {
              className: "title-ui",
              children: [
                M("h1", {
                  className: "text-lg text-fg",
                  children: "NIGHT LARK",
                }),
                ee("div", {
                  className: "title-actions",
                  children: [
                    M("button", {
                      id: "begin",
                      type: "button",
                      className:
                        "min-h-11 bg-primary px-6 py-3 text-xs text-fg",
                      onClick: $,
                      children: "BEGIN",
                    }),
                    M("button", {
                      type: "button",
                      className: "min-h-11 px-4 py-3 text-xs text-muted",
                      onClick: () => f.current?.openHow(),
                      children: "HOW",
                    }),
                    w
                      ? M("p", {
                          className: "text-xs text-accent",
                          children: w,
                        })
                      : null,
                  ],
                }),
              ],
            }),
          y === "how" &&
            M("div", {
              className:
                "absolute inset-0 grid place-items-center bg-bg/80 p-4",
              children: ee("div", {
                className:
                  "flex w-full max-w-sm flex-col gap-3 border-2 border-border bg-surface p-4",
                children: [
                  bt.map(([b, x]) =>
                    ee(
                      "div",
                      {
                        className:
                          "flex items-center justify-between gap-4 text-xs",
                        children: [
                          M("span", { className: "text-muted", children: b }),
                          M("span", { className: "text-fg", children: x }),
                        ],
                      },
                      b,
