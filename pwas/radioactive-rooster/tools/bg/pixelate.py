"""Pixel treatment for the painted/illustrated room plates (henhouse, barn, store, wkuk, gate, title).

Same convention as the other pixel rooms: 320x180 logical plate (box-downscaled from the 1280x720 source) plus a
4x nearest copy in art/pixel-4x/bg/. To read as early-90s VGA instead of a shrunk illustration: light unsharp mask
to keep the ink lines, a 4x4 Bayer ordered dither at low strength, then a per-room adaptive palette (48 colours).
Geometry is untouched (exact /4), so hotspot rects in data/script.js stay valid.

Clean sources: tools/bg/src/bg-<room>.jpg (henhouse, barn, title) and tools/neon/src/bg-<room>.jpg (store, wkuk,
gate). Rooms with a Feed & Seed sign get their clean pixel plate in tools/neon/src/<room>.png; run
tools/neon/paint_neon.py afterwards to bake the sign into art/pixel/bg/<room>.png.
Run: python3 tools/bg/pixelate.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
COLORS = 48
DITHER = 10.0
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - 0.47
ROOMS = {  # room: (source, destination of the pixel plate)
    "henhouse": ("tools/bg/src/bg-henhouse.jpg", "art/pixel/bg/henhouse.png"),
    "barn": ("tools/bg/src/bg-barn.jpg", "art/pixel/bg/barn.png"),
    "title": ("tools/bg/src/bg-title.jpg", "art/pixel/bg/title.png"),
    "store": ("tools/neon/src/bg-store.jpg", "tools/neon/src/store.png"),
    "wkuk": ("tools/neon/src/bg-wkuk.jpg", "tools/neon/src/wkuk.png"),
    "gate": ("tools/neon/src/bg-gate.jpg", "tools/neon/src/gate.png"),
}


def pixelate(path):
    im = Image.open(path).convert("RGB")
    assert im.size == (1280, 720), (path, im.size)
    small = im.reduce(4).filter(ImageFilter.UnsharpMask(radius=1.0, percent=80, threshold=2))
    a = np.asarray(small, dtype=float) + np.tile(BAYER, (45, 80))[..., None] * DITHER
    a = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return a.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")


def main():
    for room, (src, dst) in ROOMS.items():
        px = pixelate(os.path.join(ROOT, src))
        px.save(os.path.join(ROOT, dst), optimize=True)
        if dst.startswith("art/pixel/"):
            px.resize((1280, 720), Image.NEAREST).save(os.path.join(ROOT, dst.replace("art/pixel/", "art/pixel-4x/")), optimize=True)
        print(room, "->", dst)


if __name__ == "__main__":
    main()
