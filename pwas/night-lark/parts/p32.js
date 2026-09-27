                    ),
                  ),
                  M("button", {
                    type: "button",
                    className:
                      "mt-2 min-h-11 bg-primary px-4 py-3 text-xs text-fg",
                    onClick: () => f.current?.closeHow(),
                    children: "BACK",
                  }),
                ],
              }),
            }),
          y === "pause" &&
            M("div", {
              className:
                "absolute inset-0 grid place-items-center bg-bg/80 p-4",
              children: ee("div", {
                className:
                  "flex w-full max-w-sm flex-col gap-3 border-2 border-border bg-surface p-4",
                children: [
                  M("p", {
                    className: "text-center text-xs text-fg",
                    children: "PAUSED",
                  }),
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
                    ),
                  ),
                  M("button", {
                    type: "button",
                    className:
                      "mt-2 min-h-11 bg-primary px-4 py-3 text-xs text-fg",
                    onClick: () => f.current?.resume(),
                    children: "RESUME",
                  }),
                ],
              }),
            }),
          y === "win" &&
            L &&
            M("div", {
              className:
                "absolute inset-0 grid place-items-center bg-bg/80 p-4",
              children: ee("div", {
                className:
                  "flex w-full max-w-sm flex-col items-center gap-4 border-2 border-border bg-surface p-6",
                children: [
                  M("p", {
                    className: "text-lg text-accent",
                    children: L.rank,
                  }),
                  M("p", {
                    className: "text-xs text-fg",
                    children: jt(L.time),
                  }),
                  ee("p", {
                    className: "text-xs text-muted",
                    children: [
                      "ALERTS ",
                      L.alerts,
                      " / MOTES ",
                      L.motes,
                      "/",
                      L.motesMax,
                    ],
                  }),
                  w
                    ? M("p", { className: "text-xs text-accent", children: w })
                    : null,
                  M("button", {
                    type: "button",
                    className: "min-h-11 bg-primary px-6 py-3 text-xs text-fg",
                    onClick: () => {
                      (f.current?.unlock(), f.current?.again());
                    },
                    children: "AGAIN",
                  }),
                ],
              }),
            }),
        ],
      }),
      y === "play" || y === "pause"
        ? ee("div", {
            className: "touchbar",
            children: [
              M("button", { type: "button", ...H("KeyA"), children: "LEFT" }),
              M("button", { type: "button", ...H("KeyD"), children: "RIGHT" }),
              M("button", { type: "button", ...H("Space"), children: "JUMP" }),
              M("button", { type: "button", ...H("KeyJ"), children: "LINE" }),
              M("button", { type: "button", ...H("KeyS"), children: "DOWN" }),
              M("button", { type: "button", ...H("KeyE"), children: "USE" }),
            ],
          })
        : null,
    ],
  });
}
function jt(t) {
  let f = Math.max(0, Math.floor(t));
  return `${Math.floor(f / 60)}:${(f % 60).toString().padStart(2, "0")}`;
}
import { jsx as zt } from "react/jsx-runtime";
var ht = document.getElementById("root");
ht && qt(ht).render(zt(pt, {}));
