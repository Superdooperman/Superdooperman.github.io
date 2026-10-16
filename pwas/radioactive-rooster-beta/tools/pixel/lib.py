"""Tiny pixel-art toolkit. Everything is drawn at 1x logical size with a fixed noir palette,
so the output is reproducible: `python3 tools/pixel/build.py` regenerates art/pixel/."""
from PIL import Image, ImageDraw
import random

PAL = {
    "k": "#0b0710", "n1": "#160d26", "n2": "#24163f", "n3": "#382660", "n4": "#563c86", "n5": "#7a5aa8",
    "b1": "#14203a", "b2": "#24385c", "b3": "#3a5680",
    "moon": "#f2d98a", "moon2": "#c9a85a", "moon3": "#8a7040",
    "r1": "#5a0c1c", "r2": "#a81c28", "r3": "#ff3c46", "pk": "#ff9aa8",
    "g1": "#0e3420", "g2": "#1d6e36", "g3": "#47a844", "g4": "#8ad460",
    "y1": "#9a6810", "y2": "#e8b432", "y3": "#ffe490",
    "w1": "#ece4d4", "w2": "#a69aa4", "w3": "#5c5264",
    "br1": "#26150d", "br2": "#4e2c1a", "br3": "#7e4e2a", "br4": "#b88048", "br5": "#e0b070",
    "sk": "#d89874", "sk2": "#a8684c", "or": "#e07020",
}
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def rgb(c):
    c = PAL.get(c, c)
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


class Canvas:
    def __init__(self, w, h, bg=None):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w, h), rgb(bg) if bg else (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.im.putpixel((int(x), int(y)), rgb(c))

    def rect(self, x, y, w, h, c):
        if w > 0 and h > 0:
            self.d.rectangle([x, y, x + w - 1, y + h - 1], fill=rgb(c))

    def frame(self, x, y, w, h, c):
        self.d.rectangle([x, y, x + w - 1, y + h - 1], outline=rgb(c))

    def poly(self, pts, c, outline=None):
        self.d.polygon(pts, fill=rgb(c), outline=rgb(outline) if outline else None)

    def oval(self, x, y, w, h, c, outline=None):
        self.d.ellipse([x, y, x + w - 1, y + h - 1], fill=rgb(c) if c else None, outline=rgb(outline) if outline else None)

    def line(self, pts, c, width=1):
        self.d.line(pts, fill=rgb(c), width=width)

    def vgrad(self, x, y, w, h, c1, c2):
        """Ordered-dither vertical blend between two palette colors."""
        for j in range(h):
            t = j / max(1, h - 1)
            for i in range(w):
                th = (BAYER[(y + j) % 4][(x + i) % 4] + 0.5) / 16
                self.px(x + i, y + j, c2 if t > th else c1)

    def dither(self, x, y, w, h, c, level=8):
        """Checker-ish ordered dither of a color over an area (level 0..16)."""
        for j in range(h):
            for i in range(w):
                if BAYER[(y + j) % 4][(x + i) % 4] < level:
                    self.px(x + i, y + j, c)

    def stars(self, x, y, w, h, n, seed=1):
        r = random.Random(seed)
        for _ in range(n):
            self.px(x + r.randrange(w), y + r.randrange(h), r.choice(["w2", "w3", "moon", "w1"]))

    def paste(self, other, x, y):
        self.im.alpha_composite(other.im, (int(x), int(y)))

    def text(self, x, y, s, c):
        draw_text(self, x, y, s, c)

    def save(self, path):
        self.im.save(path, optimize=True)


# 3x5 pixel font for signs (uppercase only).
FONT = {
    "A": "010101111101101", "B": "110101110101110", "C": "011100100100011", "D": "110101101101110",
    "E": "111100110100111", "F": "111100110100100", "G": "011100101101011", "H": "101101111101101",
    "I": "111010010010111", "J": "001001001101010", "K": "101101110101101", "L": "100100100100111",
    "M": "101111111101101", "N": "110101101101101", "O": "010101101101010", "P": "110101110100100",
    "Q": "010101101111011", "R": "110101110101101", "S": "011100010001110", "T": "111010010010010",
    "U": "101101101101111", "V": "101101101101010", "W": "101101111111101", "X": "101101010101101",
    "Y": "101101010010010", "Z": "111001010100111", " ": "000000000000000", "!": "010010010000010",
    "-": "000000111000000", ".": "000000000000010", "'": "010010000000000", "1": "010110010010111",
    "9": "111101111001111", "5": "111100111001111", "3": "111001011001111", "#": "101111101111101",
}


def draw_text(cv, x, y, s, c):
    cx = x
    for ch in s.upper():
        g = FONT.get(ch, FONT[" "])
        for j in range(5):
            for i in range(3):
                if g[j * 3 + i] == "1":
                    cv.px(cx + i, y + j, c)
        cx += 4


def text_width(s):
    return len(s) * 4 - 1
