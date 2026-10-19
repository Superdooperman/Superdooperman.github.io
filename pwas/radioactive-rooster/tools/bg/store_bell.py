"""Ned's service bell as its own prop (Arlong, 2026-10-18: the bell gag). The red blob painted on the counter is
painted out of the store plate (and its paint_neon source, so a neon re-bake keeps it out), and a brass service bell
is drawn as a hand-placed pixel overlay, fg/store--bell, shown until Ned unscrews it (flag bell_gone). Also draws the
painted-pixel "DING!" pop, fx/ding (hand-set 5x7 pixel letters, no code font). Re-run is idempotent:
    python3 tools/bg/store_bell.py
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BOX = (143, 86, 158, 96)  # x0, y0, x1, y1 of the painted red bell


def paint_out(path):
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    x0, y0, x1, y1 = BOX
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    m = np.zeros(R.shape, bool)
    m[y0:y1, x0:x1] = ((R > 1.6 * G) & (R > 45))[y0:y1, x0:x1]
    # grow by a px so the dark fringe goes too
    g = m.copy(); g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
    g[:y0] = False; g[y1:] = False; g[:, :x0] = False; g[:, x1:] = False
    if not g.any():
        return False  # already clean
    out = a.copy()
    for y, x in zip(*np.nonzero(g)):
        for dx in (-13, 13, -26, 26):  # the counter's plank / shelf pattern repeats every ~13 px
            if 0 <= x + dx < a.shape[1] and not g[y, x + dx]:
                out[y, x] = a[y, x + dx]
                break
    Image.fromarray(out.astype(np.uint8)).save(path, optimize=True)
    return True


BELL = [
    "....kck....",
    "...kkakk...",
    "..kbccdbk..",
    ".kbccddcbk.",
    ".kabcccbak.",
    "kaabbbbbaak",
    "kkkkkkkkkkk",
    "kapppppppak",
    ".kkkkkkkkk.",
]
BELL_COL = {'k': (30, 19, 14), 'a': (98, 66, 30), 'b': (156, 112, 44), 'c': (208, 164, 72), 'd': (244, 218, 136),
            'p': (64, 42, 26)}

GLYPHS = {  # 5x7 hand-set letters
    'D': ["1110.", "1..1.", "1...1", "1...1", "1...1", "1..1.", "1110."],
    'I': ["111", ".1.", ".1.", ".1.", ".1.", ".1.", "111"],
    'N': ["1...1", "11..1", "11..1", "1.1.1", "1..11", "1..11", "1...1"],
    'G': [".111.", "1...1", "1....", "1.111", "1...1", "1...1", ".111."],
    '!': ["1", "1", "1", "1", "1", ".", "1"],
}


def ding():
    word = "DING!"
    cols = []
    for ch in word:
        g = GLYPHS[ch]
        w = len(g[0])
        cols.append(np.array([[c == '1' for c in row] for row in g], bool))
    W = sum(c.shape[1] for c in cols) + (len(cols) - 1) + 2
    H = 7 + 2
    fill = np.zeros((H, W), bool)
    x = 1
    for c in cols:
        fill[1:8, x:x + c.shape[1]] = c
        x += c.shape[1] + 1
    out = np.zeros((H, W), bool)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            out |= np.roll(np.roll(fill, dy, 0), dx, 1)
    img = np.zeros((H, W, 4), np.uint8)
    img[out & ~fill] = (52, 18, 20, 255)          # ink edge
    img[fill] = (255, 222, 88, 255)               # yolk yellow
    lower = np.zeros_like(fill); lower[6:8] = True
    img[fill & lower] = (236, 146, 44, 255)       # orange underside
    hi = np.zeros_like(fill); hi[1] = True
    img[fill & hi] = (255, 248, 196, 255)         # top shine
    return Image.fromarray(img, 'RGBA')


def main():
    changed = [p for p in ('art/pixel/bg/store.png', 'tools/neon/src/store.png') if paint_out(os.path.join(ROOT, p))]
    Image.open(os.path.join(ROOT, 'art/pixel/bg/store.png')).resize((1280, 720), Image.NEAREST).save(
        os.path.join(ROOT, 'art/pixel-4x/bg/store.png'), optimize=True)
    bell = np.zeros((len(BELL), len(BELL[0]), 4), np.uint8)
    for y, row in enumerate(BELL):
        for x, c in enumerate(row):
            if c != '.':
                bell[y, x] = BELL_COL[c] + (255,)
    Image.fromarray(bell, 'RGBA').save(os.path.join(ROOT, 'art/pixel/fg/store--bell.png'), optimize=True)
    d = ding()
    os.makedirs(os.path.join(ROOT, 'art/pixel/fx'), exist_ok=True)
    d.save(os.path.join(ROOT, 'art/pixel/fx/ding.png'), optimize=True)
    man_p = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_p))
    man['assets']['fg/store--bell'] = {'kind': 'overlay', 'size': [bell.shape[1], bell.shape[0]], 'anchor': [0, 0],
                                       'source': 'tools/bg/store_bell.py (hand-placed pixel prop, until bell_gone)'}
    man['assets']['fx/ding'] = {'kind': 'fx', 'size': list(d.size), 'anchor': [0, 0],
                                'source': 'tools/bg/store_bell.py (hand-set pixel letters)'}
    with open(man_p, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('painted out:', changed, 'bell', bell.shape[1::-1], 'ding', d.size)


if __name__ == '__main__':
    main()
