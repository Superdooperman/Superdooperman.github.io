"""Paint NED'S FEED & SEED neon into each room plate (unlit glass, backing, mounts = permanent scenery)
and cut one glow frame per letter (+ the hawk) into an overlay sheet the engine lights per temptation level.

Reads the unbaked plates in tools/neon/src/, writes:
  art/pixel/bg/<room>.png (+ art/pixel-4x/bg/<room>.png)   pixel rooms: hq, fence, midway (320x180, 1 px = 1 px)
  art/placeholders/bg-<room>.jpg                          illustrated rooms: store, wkuk, gate (1280x720)
  art/pixel/fx/neon-<room>.png   vertical sheet, one frame per key in FRAMES order (frame = sign bbox)
  tools/neon/signs.json          rect (logical 320x180 units), frames, scale  -> data/script.js room.sign
                                 + art/manifest.json fx/neon-<room> (size = rect w,h; grid [1, frames]; scale)
No system fonts: hand-bent tube script (Catmull-Rom paths, jittered bends and widths) rendered at Kx and
box-downsampled like the red hawk neon in the Midway plate; the store keeps its plank + capitals.
Run: python3 tools/neon/paint_neon.py
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "tools/neon/src")
TEXT = "NED'S FEED & SEED"  # data/script.js FEEDSEED.text; key = index into this

# ---------- illustrated rooms: tube strokes in a 4x6 unit box ----------
STROKES = {
    "N": [[(0, 6), (0, 0), (4, 6), (4, 0)]],
    "E": [[(4, 0), (0, 0), (0, 6), (4, 6)], [(0, 3), (3, 3)]],
    "D": [[(0, 0), (0, 6), (2.4, 6), (4, 4.4), (4, 1.6), (2.4, 0), (0, 0)]],
    "S": [[(4, 0.9), (3.1, 0), (0.9, 0), (0, 0.9), (0, 2.1), (0.9, 3), (3.1, 3), (4, 3.9), (4, 5.1), (3.1, 6), (0.9, 6), (0, 5.1)]],
    "F": [[(4, 0), (0, 0), (0, 6)], [(0, 3), (3, 3)]],
    "'": [[(0.7, 0), (0.4, 1.8)]],
    "&": [[(4, 6), (1, 2.3), (1, 0.9), (1.9, 0), (2.8, 0.9), (2.8, 1.8), (0, 4.1), (0, 5.2), (0.9, 6), (2.3, 6), (4, 3.8)]],
    "hawk": [[(0.2, 6), (1.6, 3.9), (1.1, 2.3), (2.1, 0.7), (3.1, 0.3), (2.9, 1.3), (5, 2.5), (3.1, 3.1), (3.8, 5.2), (2.5, 4.4), (1.6, 3.9)]],
}
ADV = {"'": 1.2, "hawk": 5.2}


def adv(k):
    return 2.2 if k is None else ADV.get("hawk" if k == "hawk" else TEXT[k], 4)


def stroke_line(keys, x, y, u, width, masks, size, gap=0.9):
    """Draw tube strokes (u px per unit, top-left x,y) into per-key L masks of `size`."""
    for k in keys:
        if k is not None:
            m = masks.setdefault(k, Image.new("L", size, 0))
            d = ImageDraw.Draw(m)
            for poly in STROKES["hawk" if k == "hawk" else TEXT[k]]:
                pts = [(x + px * u, y + py * u) for px, py in poly]
                d.line(pts, fill=255, width=int(round(width)), joint="curve")
                for p in (pts[0], pts[-1]):
                    r = width / 2
                    d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)
        x += (adv(k) + gap) * u
    return x


def stroke_width(keys, u, gap=0.9):
    return sum((adv(k) + gap) * u for k in keys) - gap * u


def perspective_coeffs(dst, src):
    """Coefficients mapping output (dst quad) -> input (src quad) for Image.transform PERSPECTIVE."""
    a = []
    for (x, y), (X, Y) in zip(dst, src):
        a.append([x, y, 1, 0, 0, 0, -X * x, -X * y])
        a.append([0, 0, 0, x, y, 1, -Y * x, -Y * y])
    b = np.array(src).reshape(8)
    return np.linalg.solve(np.array(a, dtype=float), b).tolist()


def warp(img, quad, out_size, resample=Image.BICUBIC):
    w, h = img.size
    c = perspective_coeffs(quad, [(0, 0), (w, 0), (w, h), (0, h)])
    return img.transform(out_size, Image.PERSPECTIVE, c, resample)


# ---------- glow frames ----------
def glow_frame(mask_l, core, glow, spill, r1, r2, a1, a2, pixel):
    """RGBA lit-tube frame: wall spill + tube halo + hot core. mask_l: L image (full size)."""
    m = np.asarray(mask_l, dtype=float) / 255
    def blur(r):
        return np.asarray(mask_l.filter(ImageFilter.GaussianBlur(r)), dtype=float) / 255
    layers = []
    s = np.clip(blur(r2) * a2 * 3.0, 0, a2)
    if pixel:  # 1 px magenta halo hugging the tube, stepped spill (no smooth gradients)
        g = (np.asarray(mask_l.filter(ImageFilter.MaxFilter(3)), dtype=float) / 255) * a1
        s = np.select([s > a2 * 0.66, s > a2 * 0.33, s > 0.05], [a2, a2 * 0.62, a2 * 0.3], 0)
    else:
        g = np.clip(blur(r1) * a1 * 2.2, 0, a1)
    out = np.zeros(m.shape + (4,))
    for col, a in ((spill, s), (glow, g), (core, m)):
        col = np.array(col, dtype=float) / 255
        out[..., :3] = out[..., :3] * (1 - a[..., None]) + col * a[..., None]
        out[..., 3] = out[..., 3] * (1 - a) + a
    out[..., :3] = np.where(out[..., 3:4] > 0, out[..., :3], 0)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA")


def sheet(frames, keys, scale, room, pad=0):
    union = None
    for f in frames:
        bb = f.getchannel("A").point(lambda v: 255 if v > 6 else 0).getbbox()
        if bb:
            union = bb if union is None else (min(union[0], bb[0]), min(union[1], bb[1]), max(union[2], bb[2]), max(union[3], bb[3]))
    # snap to the logical grid so the overlay lines up with 320x180 pixels exactly
    x0 = (union[0] // scale) * scale; y0 = (union[1] // scale) * scale
    x1 = -(-union[2] // scale) * scale; y1 = -(-union[3] // scale) * scale
    w, h = x1 - x0, y1 - y0
    out = Image.new("RGBA", (w, h * len(frames)))
    for i, f in enumerate(frames):
        out.paste(f.crop((x0, y0, x1, y1)), (0, i * h))
    os.makedirs(os.path.join(ROOT, "art/pixel/fx"), exist_ok=True)
    out.save(os.path.join(ROOT, f"art/pixel/fx/neon-{room}.png"), optimize=True)
    return {"art": f"fx/neon-{room}", "rect": [x0 // scale, y0 // scale, w // scale, h // scale], "frames": keys, "scale": scale}


def ordered(masks):
    keys = sorted(k for k in masks if k != "hawk")
    return keys + (["hawk"] if "hawk" in masks else [])


CORE, GLOW, SPILL = (255, 212, 236), (255, 70, 172), (236, 40, 140)
SIGNS = {}


# ---------- illustrated rooms (1280x720, painted at 4x the logical grid) ----------
SS = 4  # supersample for local drawing


def illus(room, src, lines, quad, local_size, backing, unlit, hi, ink, tube_px):
    """lines: [(keys, x, y, u)] in local px. backing(draw, w, h) paints mounts/board in local px (supersampled)."""
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    W, H = im.size
    lw, lh = local_size
    L = (lw * SS, lh * SS)
    back = Image.new("RGBA", L, (0, 0, 0, 0))
    backing(ImageDraw.Draw(back), L[0], L[1])
    masks = {}
    for keys, x, y, u in lines:
        stroke_line(keys, x * SS, y * SS, u * SS, tube_px * SS, masks, L)
    q = [(x, y) for x, y in quad]
    # shadow of the whole sign (backing + tubes) cast down-right onto the wall
    sil = back.getchannel("A")
    for m in masks.values():
        sil = Image.fromarray(np.maximum(np.asarray(sil), np.asarray(m)))
    sh = warp(sil.resize((lw, lh), Image.LANCZOS), [(x + 3, y + 4) for x, y in q], (W, H)).filter(ImageFilter.GaussianBlur(2.2))
    base = np.asarray(im, dtype=float)
    a = np.asarray(sh, dtype=float)[..., None] / 255 * 0.42
    base = base * (1 - a) + np.array((30, 20, 36)) * a
    im = Image.fromarray(base.astype(np.uint8)).convert("RGBA")
    im.alpha_composite(warp(back.resize((lw, lh), Image.LANCZOS), q, (W, H)))
    full = {}
    for k, m in masks.items():
        full[k] = warp(m.resize((lw, lh), Image.LANCZOS), q, (W, H))
    union = np.zeros((H, W))
    for m in full.values():
        union = np.maximum(union, np.asarray(m, dtype=float) / 255)
    ul = Image.fromarray((union * 255).astype(np.uint8))
    outline = np.asarray(ul.filter(ImageFilter.MaxFilter(3)), dtype=float) / 255
    hl = np.clip(union - np.asarray(ul.transform(ul.size, Image.AFFINE, (1, 0, 0, 0, 1, -1.4), Image.BILINEAR), dtype=float) / 255, 0, 1)
    px = np.asarray(im.convert("RGB"), dtype=float)
    for col, al in ((ink, outline * 0.9), (unlit, union), (hi, hl * 0.85)):
        px = px * (1 - al[..., None]) + np.array(col) * al[..., None]
    out = Image.fromarray(px.astype(np.uint8))
    keys = ordered(full)
    frames = []
    for k in keys:
        if k == "hawk":
            frames.append(glow_frame(full[k], (255, 214, 196), (255, 66, 50), (230, 40, 40), 3, 12, 0.9, 0.45, False))
        else:
            frames.append(glow_frame(full[k], CORE, GLOW, SPILL, 3, 12, 0.9, 0.45, False))
    return out, sheet(frames, keys, 4, room)


def room_store():
    """Ned's own neon on a painted plank, screwed to the back wall between the poster and the bell."""
    u1, u2 = 2.5, 1.95
    l1, l2 = ["hawk", None, 0, 1, 2, 3, 4], [6, 7, 8, 9, None, 11, None, 13, 14, 15, 16]
    w1, w2 = stroke_width(l1, u1), stroke_width(l2, u2)
    lw = int(max(w1, w2) + 16); lh = int(6 * u1 + 6 * u2 + 20)
    def backing(d, W, H):
        r = 7 * SS
        d.rounded_rectangle([0, 0, W - 1, H - 1], r, fill=(32, 20, 14, 255))
        d.rounded_rectangle([2 * SS, 2 * SS, W - 1 - 2 * SS, H - 1 - 2 * SS], r - 2 * SS, fill=(116, 70, 38, 255))
        d.rounded_rectangle([2 * SS, 2 * SS, W - 1 - 2 * SS, H // 2], r - 2 * SS, fill=(132, 82, 44, 255))
        d.line([(9 * SS, 3 * SS), (W - 9 * SS, 3 * SS)], fill=(176, 120, 70, 255), width=SS)  # lamp light from the left on the top edge
        for sx in (5 * SS, W - 5 * SS):
            d.ellipse([sx - 1.6 * SS, H // 2 - 1.6 * SS, sx + 1.6 * SS, H // 2 + 1.6 * SS], fill=(48, 34, 26, 255))
    lines = [(l1, (lw - w1) / 2, 5, u1), (l2, (lw - w2) / 2, 6 + 6 * u1 + 4, u2)]
    x0, y0 = 1003, 95
    quad = [(x0, y0), (x0 + lw, y0 - 2), (x0 + lw, y0 - 2 + lh), (x0, y0 + lh)]  # beam line rises slightly to the right
    return illus("store", "bg-store.jpg", lines, quad, (lw, lh), backing, (104, 84, 98), (214, 196, 206), (26, 16, 14), 2.1)


# ---------- bent-glass script neon (coop, fence, midway, wkuk, gate) ----------
# Drawn like the red hawk already in the Midway plate: free-standing tubes, no plate behind, smooth anti-aliased
# bends (rendered at K x and box-downsampled to the plate), slightly irregular hand bends and tube widths.
# Units: cap height 0..6, baseline 6, x-height ~3.2. One path list per letter; lead-ins belong to the letter.
SCRIPT = {
    "N": [[(0.2, 6.0), (0.7, 3.4), (1.1, 0.5), (1.7, 2.6), (2.6, 5.7), (3.2, 3.2), (3.5, 0.6), (4.4, 0.1)]],
    "e": [[(0.0, 5.7), (1.1, 5.1), (2.1, 4.2), (2.0, 3.3), (1.3, 3.3), (0.7, 4.4), (1.0, 5.7), (2.0, 6.05), (3.0, 5.5)]],
    "d": [[(0.0, 5.6), (1.0, 4.6), (2.5, 3.5), (1.5, 3.2), (0.6, 3.9), (0.5, 5.3), (1.3, 6.0), (2.3, 5.5), (2.8, 4.1)],
          [(3.4, 0.2), (2.9, 3.2), (2.7, 5.3), (3.2, 6.0), (3.9, 5.5)]],
    "'": [[(0.6, 0.0), (0.5, 0.9), (0.2, 1.7)]],
    "s": [[(0.0, 5.6), (1.0, 4.4), (1.6, 3.2), (2.0, 4.4), (2.3, 5.4), (1.7, 6.0), (0.8, 5.8)]],
    "F": [[(0.4, 1.4), (1.3, 0.4), (2.8, 0.3), (4.4, 0.0)],
          [(2.7, 0.4), (2.3, 3.0), (1.7, 5.3), (0.8, 6.0), (0.1, 5.4)],
          [(1.1, 3.1), (2.1, 2.7), (3.1, 2.9)]],
    "&": [[(3.5, 6.0), (1.3, 3.3), (1.0, 1.5), (1.8, 0.6), (2.6, 1.2), (2.4, 2.4), (0.6, 4.0), (0.4, 5.4), (1.4, 6.1), (2.7, 5.6), (3.7, 4.2)]],
    "S": [[(3.8, 0.9), (3.0, 0.1), (1.7, 0.3), (1.1, 1.4), (1.8, 2.6), (3.0, 3.6), (3.2, 5.0), (2.2, 6.0), (0.9, 5.9), (0.0, 5.0)]],
    "hawk": [[(0.3, 6.2), (1.5, 4.2), (1.2, 2.5), (2.0, 0.9), (2.9, 0.4), (3.5, 0.9), (3.1, 1.4), (2.8, 2.4), (3.6, 3.6), (4.6, 4.4), (3.4, 4.3), (3.7, 6.0), (2.6, 5.0), (1.5, 4.2)]],
}
GLYPH_OF = {0: "N", 1: "e", 2: "d", 3: "'", 4: "s", 6: "F", 7: "e", 8: "e", 9: "d", 11: "&", 13: "S", 14: "e", 15: "e", 16: "d"}
ADV2 = {"N": 4.4, "e": 2.75, "d": 3.7, "'": 1.0, "s": 2.4, "F": 4.0, "&": 4.0, "S": 3.6, "hawk": 5.4}


def glyph_of(k):
    return "hawk" if k == "hawk" else GLYPH_OF[k]


def catmull(pts, n=10):
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = (np.array(v, float) for v in p[i - 1:i + 3])
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)))
    out.append(tuple(pts[-1]))
    return out


def script_width(keys, space=1.6):
    return sum(space if k is None else ADV2[glyph_of(k)] for k in keys)


def script_masks(keys, u, tube, seed, space=1.6, pad=1.0):
    """Per-key L masks of hand-bent tube script in a local box (px = u per unit). Returns masks, (w, h)."""
    rng = np.random.default_rng(seed)
    w = int(np.ceil((script_width(keys, space) + 2 * pad) * u)); h = int(np.ceil((6.6 + 2 * pad) * u))
    masks = {}
    x = pad
    for k in keys:
        if k is None:
            x += space
            continue
        g = glyph_of(k)
        m = masks.setdefault(k, Image.new("L", (w, h), 0))
        d = ImageDraw.Draw(m)
        for path in SCRIPT[g]:
            jit = [(px + rng.uniform(-0.1, 0.1), py + rng.uniform(-0.1, 0.1)) for px, py in path]
            pts = [((x + px) * u, (pad + py) * u) for px, py in catmull(jit)]
            tw = tube * rng.uniform(0.85, 1.15)
            d.line(pts, fill=255, width=max(1, int(round(tw))), joint="curve")
            for q in (pts[0], pts[-1]):
                d.ellipse([q[0] - tw / 2, q[1] - tw / 2, q[0] + tw / 2, q[1] + tw / 2], fill=255)
        x += ADV2[g]
    return masks, (w, h)


def script_room(room, src, keys, quad, letter_h, tube, K, unlit, hi, glow_r, mounts=(), seed=7, scale=1, dim=0.5):
    """quad: plate px (TL, TR, BR, BL) of the lettering box. letter_h: cap height in plate px.
    Render at K x, downsample to the plate; mounts: [(x0, y0, x1, y1, rgb, width)] thin brackets in plate px."""
    im = Image.open(os.path.join(SRC, src)).convert("RGB")
    W, H = im.size
    u = letter_h / 6.0 * K
    local, (lw, lh) = script_masks(keys, u, tube * K, seed)
    qk = [(x * K, y * K) for x, y in quad]
    full = {}
    for k, m in local.items():
        big = warp(m, qk, (W * K, H * K), Image.BILINEAR)
        full[k] = big.resize((W, H), Image.BOX)
    # mounts (brackets / standoffs), anti-aliased the same way
    base = np.asarray(im, dtype=float)
    if mounts:
        ov = Image.new("RGBA", (W * K, H * K), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        for x0, y0, x1, y1, col, wd in mounts:
            d.line([(x0 * K, y0 * K), (x1 * K, y1 * K)], fill=tuple(col) + (255,), width=max(1, int(wd * K)))
        ov = np.asarray(ov.resize((W, H), Image.BOX), dtype=float)
        a = ov[..., 3:4] / 255
        base = base * (1 - a) + ov[..., :3] * a
    union = np.zeros((H, W))
    for m in full.values():
        union = np.maximum(union, np.asarray(m, dtype=float) / 255)
    ul = Image.fromarray((union * 255).astype(np.uint8))
    up = np.asarray(ul.transform(ul.size, Image.AFFINE, (1, 0, 0, 0, 1, -max(1.0, K / 8)), Image.BILINEAR), dtype=float) / 255
    hl = np.clip(union - up, 0, 1)
    # dim glass: barely there over the wall, a faint top-lit sheen
    for col, al in ((unlit, union * dim), (hi, hl * dim * 0.6)):
        base = base * (1 - al[..., None]) + np.array(col) * al[..., None]
    out = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    keys_o = ordered(full)
    r1, r2, a1 = (tuple(glow_r) + (0.9,))[:3]
    frames = []
    for k in keys_o:
        if k == "hawk":
            frames.append(glow_frame(full[k], (255, 214, 170), (255, 84, 40), (230, 50, 30), r1, r2, a1, 0.5, False))
        else:
            frames.append(glow_frame(full[k], CORE, GLOW, SPILL, r1, r2, a1, 0.5, False))
    return out, sheet(frames, keys_o, scale, room)


ALL = ["hawk", None, 0, 1, 2, 3, 4, None, 6, 7, 8, 9, None, 11, None, 13, 14, 15, 16]


def room_hq():
    """Rooftop script 'Feed' + hawk on two thin legs, on the distant house at the right edge (a glowing shape at this range)."""
    keys = ["hawk", 6, 7, 8, 9]
    legs = [(301.5, 66.5, 301.5, 71, (24, 18, 30), 0.8), (315.5, 66, 315.5, 70.5, (24, 18, 30), 0.8), (300, 66.6, 317, 66.0, (34, 26, 40), 0.6)]
    return script_room("hq", "hq.png", keys, [(297, 57.5), (319, 56.8), (319, 67.2), (297, 67.8)], 6.4, 0.95, 8,
                       (96, 70, 104), (150, 128, 160), (0.6, 3.2, 0.5), legs, seed=3, dim=0.38)


def room_fence():
    """Script 'Feed' + hawk on a thin rooftop frame over the distant Main Street roofline."""
    keys = ["hawk", 6, 7, 8, 9]
    legs = [(273.5, 62.5, 273.5, 66, (16, 22, 32), 0.8), (288.5, 62.5, 288.5, 66, (16, 22, 32), 0.8), (272, 62.6, 290, 62.6, (26, 32, 46), 0.6)]
    return script_room("fence", "fence.png", keys, [(268, 53), (291, 53), (291, 63), (268, 63)], 6.0, 0.9, 8,
                       (80, 74, 104), (130, 130, 160), (0.6, 3.2, 0.5), legs, seed=5, dim=0.38)


def room_midway():
    """Script 'Feed & Seed' (+ a little hawk) bent straight onto the right-hand facade, over the awning."""
    keys = ["hawk", None, 6, 7, 8, 9, None, 11, None, 13, 14, 15, 16]
    clips = [(x, 62.2, x, 63.4, (40, 28, 30), 0.7) for x in (276, 290, 304)]
    return script_room("midway", "midway.png", keys, [(270, 53.6), (316, 52.6), (316, 63.0), (270, 63.8)], 6.6, 0.95, 8,
                       (92, 66, 104), (150, 120, 150), (0.6, 3.4, 0.5), clips, seed=11, dim=0.38)


def room_wkuk():
    """Sponsor neon in bent-glass script, standoff-mounted straight onto the hall wall above the studio door."""
    q = [(286, 128), (460, 115), (460, 138), (286, 158)]
    stand = [(x, y, x, y + 4, (14, 12, 20), 1.6) for x, y in ((300, 154), (372, 146), (444, 136))]
    return script_room("wkuk", "bg-wkuk.jpg", ALL, q, 19, 2.6, 2, (98, 80, 112), (170, 150, 196), (2.4, 10), stand, seed=13, scale=4, dim=0.55)


def room_gate():
    """Bent-glass script clipped onto the riveted canopy panel (no raceway bar)."""
    q = [(170, 280), (424, 283), (424, 318), (170, 316)]
    clips = [(x, 309, x, 316, (34, 36, 42), 2.2) for x in range(190, 420, 34)]
    return script_room("gate", "bg-gate.jpg", ALL, q, 26, 3.2, 2, (112, 104, 120), (210, 204, 220), (3, 12), clips, seed=17, scale=4, dim=0.55)


def main():
    out = {}
    for room, fn, dst in (
        ("hq", room_hq, "art/pixel/bg/hq.png"),
        ("fence", room_fence, "art/pixel/bg/fence.png"),
        ("midway", room_midway, "art/pixel/bg/midway.png"),
        ("store", room_store, "art/placeholders/bg-store.jpg"),
        ("wkuk", room_wkuk, "art/placeholders/bg-wkuk.jpg"),
        ("gate", room_gate, "art/placeholders/bg-gate.jpg"),
    ):
        img, spec = fn()
        path = os.path.join(ROOT, dst)
        if dst.endswith(".jpg"):
            img.save(path, quality=93, subsampling=0)
        else:
            img.save(path, optimize=True)
            img.resize((img.width * 4, img.height * 4), Image.NEAREST).save(os.path.join(ROOT, dst.replace("art/pixel/", "art/pixel-4x/")), optimize=True)
        out[room] = spec
        print(room, spec["rect"], len(spec["frames"]), "frames")
    with open(os.path.join(ROOT, "tools/neon/signs.json"), "w") as f:
        json.dump(out, f, indent=1)
    sync(out)


def sync(signs):
    """Write each room's sign rect/frames into data/script.js and the sheet entries into art/manifest.json."""
    import re
    p = os.path.join(ROOT, "data/script.js")
    s = open(p).read()
    for sp in signs.values():
        new = 'sign: { art: "%s", rect: %s, frames: [%s] }' % (sp["art"], json.dumps(sp["rect"]).replace(",", ", "), ", ".join(json.dumps(k) for k in sp["frames"]))
        s, n = re.subn(r'sign: \{ art: "%s", rect: \[[^\]]*\], frames: \[[^\]]*\] \}' % sp["art"], new, s)
        assert n == 1, sp["art"]
    open(p, "w").write(s)
    p = os.path.join(ROOT, "art/manifest.json")
    m = json.load(open(p))
    for sp in signs.values():
        a = m["assets"].setdefault(sp["art"], {"kind": "fx", "anchor": [0, 0]})
        a.update(size=sp["rect"][2:], frames=len(sp["frames"]), grid=[1, len(sp["frames"])], scale=sp["scale"])
        a["source"] = "tools/neon/paint_neon.py (glow frames, one per lit tube; unlit bent-glass sign painted into the plate)"
    with open(p, "w") as f:
        json.dump(m, f, indent=1, ensure_ascii=False)
        f.write("\n")


if __name__ == "__main__":
    main()
