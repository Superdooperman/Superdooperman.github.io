"""Rooftop with the coop lamp's bulb gone (Arlong, 2026-10-18: "when he takes the bulb there should be another background
of the place no longer lit by the bulb"). Writes art/pixel/bg/hq-dark.png (+ the 4x copy) from art/pixel/bg/hq.png.

Not a global filter. Per pixel, the lamp's warm light is divided back out with a falloff field centred on the bulb
(stronger on the coop front, the doorstep and the floor pool, shadowed above the shade), so what it lit drops to the
cool moonlit ambient while what it never reached barely moves. The other light sources are masked and kept as they
are: the coop window (lit from inside), the distant town and fair lights, the neon sign, the moon and stars. The
window then gets a small warm spill of its own on the door around it, the lamp itself is repainted as a dark shade
with an empty socket, and the result is snapped to a palette built from the plate's own colours so it stays crisp
pixel art. Re-run after any edit of bg/hq:
    python3 tools/bg/relight_hq.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'art/pixel/bg/hq.png')
OUT = os.path.join(ROOT, 'art/pixel/bg/hq-dark.png')
OUT4 = os.path.join(ROOT, 'art/pixel-4x/bg/hq-dark.png')

BULB = (85.0, 39.0)
WINDOW = (60, 61, 89, 98)          # coop door window panes, lit from inside (x0, y0, x1, y1)
SIGN = (290, 50, 320, 72)          # NED'S neon on the distant house (kept exactly: the glow sheet sits on it)
LAMP = (73, 32, 98, 44)            # shade + glowing bulb


def field(h, w):
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    dx, dy = (xx - BULB[0]) / 1.0, (yy - BULB[1]) / 1.25
    d = np.hypot(dx, dy)
    f = 1.0 / (1.0 + (d / 38.0) ** 2)  # inverse-square-ish falloff
    f *= np.clip((yy - 30) / 10.0, 0.15, 1.0)  # the shade throws light down, not up into the gable
    return f


def main():
    src = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    h, w, _ = src.shape
    lum = src @ [0.299, 0.587, 0.114]
    warm = np.clip((src[..., 0] - src[..., 2]) / 120.0, 0, 1)
    f = field(h, w)
    yy, xx = np.mgrid[0:h, 0:w]

    # Emissive mask: things that make their own light keep it.
    emit = np.zeros((h, w), bool)
    x0, y0, x1, y1 = WINDOW
    emit[y0:y1, x0:x1] = lum[y0:y1, x0:x1] > 70
    x0, y0, x1, y1 = SIGN
    emit[y0:y1, x0:x1] = True
    far = (xx > 150) & (yy < 118) | (yy < 30) & (xx > 100)   # sky, moon, stars, distant town and fair beyond the parapet
    emit |= far & ((lum > 95) | (src[..., 0] > 150))

    # Lamp light divided back out: orig = albedo * (ambient + S * f * warmth * lampColour).
    lamp_col = np.array([1.0, 0.72, 0.42])
    S = 3.2 * f * (0.35 + 0.65 * warm)
    out = src / (1.0 + S[..., None] * lamp_col)

    # Cool moonlit ambient over everything the lamp no longer lights; the far background only a touch.
    cool = np.array([0.80, 0.86, 1.06])
    k = np.where(far, 0.35, 1.0)[..., None]
    out = out * (1 - k + k * cool) + k * np.array([2.0, 3.0, 9.0]) * (1 - lum[..., None] / 255)  # blue lift in the darks

    # The coop window still glows: a small warm spill on the door boards round it (cast from inside).
    wx, wy = (WINDOW[0] + WINDOW[2]) / 2, (WINDOW[1] + WINDOW[3]) / 2
    sp = 1.0 / (1.0 + (np.hypot((xx - wx) / 1.2, yy - wy) / 16.0) ** 2) * (yy > WINDOW[1] - 6)
    sp *= (xx > 44) & (xx < 104) & (yy < 152)
    out = out * (1 + 0.55 * sp[..., None] * np.array([1.0, 0.72, 0.40]))

    out[emit] = src[emit]

    # The lamp: glowing bulb + lit shade rim repainted as an unlit metal shade with an empty socket.
    x0, y0, x1, y1 = LAMP
    shade_dark = np.array([18.0, 14.0, 18.0])
    shade_mid = np.array([36.0, 30.0, 34.0])
    rim = np.array([58.0, 56.0, 70.0])
    for y in range(y0, y1):
        for x in range(x0, x1):
            if lum[y, x] > 60 or (src[y, x, 0] > 110):
                t = (y - y0) / max(1, (y1 - y0 - 1))
                c = shade_mid * (1 - t) + shade_dark * t
                out[y, x] = c
    # shade underside rim catches a little moonlight; socket = darker nub under the shade centre
    for x in range(77, 94):
        if lum[41, x] > 60:
            out[41, x] = rim * 0.8
    for x in range(83, 88):
        out[40, x] = (18, 14, 18)
    out[39, 84:87] = (24, 20, 24)

    # Moonlight from the upper right now sets the shadows: soft cast shadows fall down-left of the board, the hatch
    # and the bucket, and the edges that face the moon (hatch lid's back-right rim, bucket rim) catch a cool line.
    from PIL import ImageDraw
    sh = Image.new('L', (w * 4, h * 4), 0)
    d = ImageDraw.Draw(sh)
    for poly in ([(100, 147), (142, 147), (128, 156), (88, 156)],                       # board, onto the floor
                 [(149.5, 158), (205, 176.5), (211, 178), (206, 180), (198, 180), (142, 162)],  # hatch, front-left
                 [(262, 170), (268, 175), (262, 178), (252, 177), (250, 173)]):           # bucket, to its left
        d.polygon([(x * 4, y * 4) for x, y in poly], fill=255)
    shm = np.asarray(sh.resize((w, h), Image.BOX), dtype=float) / 255
    out = out * (1 - 0.32 * shm[..., None])
    for (ax, ay), (bx, by) in (((205, 132), (253, 146.5)), ((254, 147), (254.5, 152))):
        n = int(max(abs(bx - ax), abs(by - ay))) + 1
        for i in range(n):
            x, y = int(round(ax + (bx - ax) * i / n)), int(round(ay + (by - ay) * i / n))
            out[y, x] = out[y, x] * 0.7 + np.array([70.0, 76.0, 104.0]) * 0.3
    for x in range(282, 299):  # bucket rim, right half
        y = 136 if x < 296 else 137
        out[y, x] = out[y, x] * 0.6 + np.array([120.0, 128.0, 150.0]) * 0.4

    out = np.clip(out, 0, 255)
    # Snap to a palette built from the result (crisp pixels, no smooth gradients); emissive pixels stay exact.
    img = Image.fromarray(out.astype(np.uint8))
    pal = img.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    q = np.asarray(pal).copy()
    q[far] = out[far].astype(np.uint8)       # the far background is only lightly graded: keep it continuous
    q[emit] = src[emit].astype(np.uint8)
    res = Image.fromarray(q)
    res.save(OUT, optimize=True)
    os.makedirs(os.path.dirname(OUT4), exist_ok=True)
    res.resize((1280, 720), Image.NEAREST).save(OUT4, optimize=True)
    print('hq-dark: mean lum', round(float(lum.mean()), 1), '->', round(float((np.asarray(res).astype(float) @ [0.299, 0.587, 0.114]).mean()), 1))


if __name__ == '__main__':
    main()
