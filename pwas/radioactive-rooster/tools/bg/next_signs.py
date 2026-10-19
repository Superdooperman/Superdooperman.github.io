"""Next-version sign + plate edits (Arlong 2026-10-19). Hand-set pixel letters only (no code fonts):
  midway   The Cock Gobbler club neon, painted into the club gable (no board): free-standing red tubes, a hawk head
           (traced from gobbler-neon-v1.jpg, after gobbler-club-neon-ref.jpg) against the sky over little script
           "The", caps COCK / GOBBLER on thin raceways, leaned with the gable, glow spilling onto roof and awning.
           Painted into tools/neon/src/midway.png; paint_neon.py then rebuilds art/pixel/bg/midway.png.
  wkuk     The studio's red panel (it never read ON AIR) is painted out of the window; a lit ON AIR box goes
           on the wall above the studio door (the Feed & Seed neon moves down the side hall, paint_neon.py).
  pavilion The cage and its chain are painted out of both plates (closed + rope open): the cage is a cast prop
           now (sprite/cage-egg-*), so it can swing out over the oil and jog down (data/script.js pavilion.cast).
Originals come from git (PRISTINE commit) so a rerun is exact. It runs tools/neon/paint_neon.py itself (that rebuilds
the midway/wkuk plates from tools/neon/src), then re-samples the walk-behind cutouts (fg/<plate>--*) from the
final plates so they still match them pixel for pixel (the WKUK mullion crosses the old panel):
    python3 tools/bg/next_signs.py
"""
import os, subprocess, io
import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PRISTINE = '909d937'
ART = '/workspace/github-pages-plans/rooster-scene-art-v2/'

G = {  # 5x7 hand-set capitals
    'C': [".111.", "1...1", "1....", "1....", "1....", "1...1", ".111."],
    'O': [".111.", "1...1", "1...1", "1...1", "1...1", "1...1", ".111."],
    'K': ["1...1", "1..1.", "1.1..", "11...", "1.1..", "1..1.", "1...1"],
    'G': [".111.", "1...1", "1....", "1.111", "1...1", "1...1", ".111."],
    'B': ["1111.", "1...1", "1...1", "1111.", "1...1", "1...1", "1111."],
    'L': ["1....", "1....", "1....", "1....", "1....", "1....", "11111"],
    'E': ["11111", "1....", "1....", "1111.", "1....", "1....", "11111"],
    'R': ["1111.", "1...1", "1...1", "1111.", "1.1..", "1..1.", "1...1"],
    'N': ["1...1", "11..1", "11..1", "1.1.1", "1..11", "1..11", "1...1"],
    'A': [".111.", "1...1", "1...1", "11111", "1...1", "1...1", "1...1"],
    'I': ["111", ".1.", ".1.", ".1.", ".1.", ".1.", "111"],
    ' ': ["..", "..", "..", "..", "..", "..", ".."],
}
SCRIPT_THE = [  # little lowercase "The" (T, h, e), 11 x 7, sits on the COCK baseline
    "...........",
    "...........",
    "111.1......",
    ".1..1...1..",
    ".1..11.1.1.",
    ".1..1.1.11.",
    ".1..1.1..11",
]


def git_png(path):
    data = subprocess.run(['git', 'show', f'{PRISTINE}:{path}'], cwd=ROOT, capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(data)).convert('RGB')


def word(text):
    cols = [np.array([[c == '1' for c in row] for row in G[ch]], bool) for ch in text]
    W = sum(c.shape[1] for c in cols) + len(cols) - 1
    out = np.zeros((7, W), bool)
    x = 0
    for c in cols:
        out[:, x:x + c.shape[1]] = c
        x += c.shape[1] + 1
    return out


def glyph_rows(rows):
    w = max(len(r) for r in rows)
    return np.array([[c == '1' for c in r.ljust(w, '.')] for r in rows], bool)


def hawk_mask(w=30, h=22):
    """The neon hawk head from gobbler-neon-v1.jpg: tube centre lines, box-reduced to w x h, thinned to 1 px,
    stray specks dropped."""
    from skimage.morphology import skeletonize
    a = np.asarray(Image.open(ART + 'gobbler-neon-v1.jpg').convert('RGB'), float)[25:322, 440:840]
    tube = nd.binary_opening(a[..., 0] > 150, iterations=1)
    sk = nd.binary_dilation(skeletonize(tube), iterations=2)
    small = np.asarray(Image.fromarray((sk * 255).astype(np.uint8)).resize((w, h), Image.BOX), float) / 255
    m = skeletonize(small > 0.18)
    lab, n = nd.label(m, structure=np.ones((3, 3)))
    sizes = nd.sum(m, lab, range(1, n + 1))
    return np.isin(lab, [i + 1 for i, z in enumerate(sizes) if z >= 3])


GLOW_K = 0.3  # a light spill keeps the 1 px letter gaps open (ON AIR)


def neon(base, mask, x0, y0, core=(255, 212, 176), tube=(255, 80, 44), glow=(200, 30, 30), clip=None):
    """Lit tubes: hot core, red tube edge, a 1-2 px red glow spill on the surface (inside `clip` when given)."""
    H, W = mask.shape
    full = np.zeros(base.shape[:2], bool)
    full[y0:y0 + H, x0:x0 + W] = mask
    g1 = nd.binary_dilation(full) & ~full
    g2 = nd.binary_dilation(full, iterations=2) & ~full & ~g1
    if clip is not None:
        g1 &= clip; g2 &= clip
    out = base.astype(float)
    out[g2] = out[g2] * 0.72 + np.array(glow) * 0.28
    k = GLOW_K
    out[g1] = out[g1] * (1 - k) + np.array(tube) * k
    out[full] = core
    # tube ends and the outline of each stroke read red, the middle white-hot
    edge = full & ~nd.binary_erosion(full, structure=np.ones((3, 1)), border_value=0) & ~nd.binary_erosion(full, structure=np.ones((1, 3)), border_value=0)
    out[edge] = out[edge] * 0.3 + np.array(tube) * 0.7
    return out.astype(np.uint8)


def tube_layer(items, size, K=8, w=0.9):
    """items: [(bool mask, x0, y0)] in plate px. Each lit pixel is a tube centre; 8-neighbours are joined
    (a diagonal only where no orthogonal pair already joins them) so the hand-set glyph bends like glass."""
    W, H = size
    im = Image.new('L', (W * K, H * K), 0); d = ImageDraw.Draw(im)
    tw = max(1, int(round(w * K)))
    for m, x0, y0 in items:
        ys, xs = np.nonzero(m); on = set(zip(ys.tolist(), xs.tolist()))
        c = lambda y, x: ((x0 + x + 0.5) * K, (y0 + y + 0.5) * K)
        for y, x in on:
            d.ellipse([c(y, x)[0] - tw / 2, c(y, x)[1] - tw / 2, c(y, x)[0] + tw / 2, c(y, x)[1] + tw / 2], fill=255)
            for dy, dx in ((0, 1), (1, 0)):
                if (y + dy, x + dx) in on: d.line([c(y, x), c(y + dy, x + dx)], fill=255, width=tw)
            for dy, dx in ((1, 1), (1, -1)):
                if (y + dy, x + dx) in on and (y + dy, x) not in on and (y, x + dx) not in on:
                    d.line([c(y, x), c(y + dy, x + dx)], fill=255, width=tw)
    return im

def warp(im, src, dst):
    Hm = cv2.getPerspectiveTransform(np.float32(src), np.float32(dst))
    return Image.fromarray(cv2.warpPerspective(np.asarray(im), Hm, im.size, flags=cv2.INTER_LINEAR))

def club(img, K=8):
    """The Cock Gobbler neon, painted into the club gable (Arlong 2026-10-19: no pasted board): the old hawk is
    inpainted out, free-standing tubes are rendered at K x, leaned with the gable, box-downsampled, and their red
    glow is screened onto the sky, roof, wall and awning. Returns the plate."""
    a = np.asarray(img).copy(); H, W = a.shape[:2]
    # 1. paint the old free-standing hawk (tubes + glow, x 220-252 y 28-75) out of the plate
    f = a.astype(int); r, g, b = f[..., 0], f[..., 1], f[..., 2]
    m = np.zeros((H, W), bool); m[26:76, 218:254] = True
    red = m & (r > b + 18) & (r > 70)
    red = nd.binary_dilation(red, iterations=2) & m
    a = cv2.inpaint(a, red.astype(np.uint8), 5, cv2.INPAINT_TELEA)
    # 2. tube layout: hawk head over the gable against the sky, little script "The" + COCK, GOBBLER below
    hk = hawk_mask(); the = glyph_rows(SCRIPT_THE); cock = word('COCK'); gob = word('GOBBLER')
    cx = 236.5
    top = 27
    lw = the.shape[1] + 2 + cock.shape[1]
    items = [(hk, int(cx - hk.shape[1] / 2), top),
             (the, int(cx - lw / 2), top + 24), (cock, int(cx - lw / 2) + the.shape[1] + 2, top + 24),
             (gob, int(cx - gob.shape[1] / 2), top + 33)]
    big = tube_layer(items, (W, H), K)
    # the gable faces us a touch from the right: right side a hair shorter, everything leans with the roof
    x0, x1, y0, y1 = 214, 259, 26, 69
    src = [(x0 * K, y0 * K), (x1 * K, y0 * K), (x1 * K, y1 * K), (x0 * K, y1 * K)]
    dst = [(x0 * K, (y0 + 0.4) * K), (x1 * K, (y0 + 1.4) * K), (x1 * K, (y1 - 0.8) * K), (x0 * K, (y1 + 0.2) * K)]
    big = warp(big, src, dst)
    I = np.asarray(big.resize((W, H), Image.BOX), float) / 255
    base = a.astype(float) / 255
    # 3. thin dark raceways behind the two text lines + two standoff legs from the hawk down to the roof
    mt = Image.new('L', (W * K, H * K), 0); d = ImageDraw.Draw(mt)
    for yy, xa, xb in ((top + 27.6, cx - lw / 2 - 0.5, cx + lw / 2 + 0.5), (top + 36.6, cx - gob.shape[1] / 2 - 0.5, cx + gob.shape[1] / 2 + 0.5)):
        d.line([(xa * K, yy * K), (xb * K, (yy + 0.3) * K)], fill=255, width=int(1.1 * K))
    for xx in (cx - 9, cx + 8):
        d.line([(xx * K, (top + 18) * K), (xx * K, (top + 25) * K)], fill=255, width=int(0.7 * K))
    mt = np.asarray(warp(mt, src, dst).resize((W, H), Image.BOX), float)[..., None] / 255
    base = base * (1 - mt * 0.75) + np.array((26, 16, 26)) / 255 * mt * 0.75
    # 4. glow: a tight red halo on the glass and a wide soft spill that screens onto the sky, roof, wall and awning
    halo = np.clip(nd.gaussian_filter(I, 1.0) * 1.6, 0, 1)
    spill = np.clip(nd.gaussian_filter(I, 5.0) * 4.0, 0, 1)
    wide = np.clip(nd.gaussian_filter(I, 11.0) * 6.0, 0, 1)
    for amt, col in ((halo * 0.6, (1.0, 0.24, 0.16)), (spill * 0.5, (0.95, 0.16, 0.14)), (wide * 0.20, (0.8, 0.12, 0.16))):
        base = 1 - (1 - base) * (1 - amt[..., None] * np.array(col))
    # 5. tubes: red glass edge, white-hot core
    edge = np.clip(I * 1.6, 0, 1)[..., None]
    base = base * (1 - edge) + np.array((1.0, 0.33, 0.20)) * edge
    core = np.clip((I - 0.3) / 0.35, 0, 1)[..., None]
    base = base * (1 - core) + np.array((1.0, 0.86, 0.72)) * core
    out = np.round(np.clip(base, 0, 1) * 255).astype(np.uint8)
    keep = (wide < 0.004) & ~red  # outside the sign's reach the plate stays bit-identical
    out[keep] = a[keep]
    return Image.fromarray(out)


def onair(img):
    """WKUK: paint the red panel out of the studio window; a lit ON AIR box above the studio door (door top y 31)."""
    a = np.asarray(img).copy()
    # the panel and its frame (x 166-206, y 33-56): each column filled top-to-bottom from the window wall just
    # above and below it, so the mullion and the wall's light falloff carry straight through
    y0p, y1p, x0p, x1p = 32, 58, 165, 208
    top = a[y0p - 1, x0p:x1p].astype(float); bot = a[y1p, x0p:x1p].astype(float)
    t = np.linspace(0, 1, y1p - y0p)[:, None, None]
    a[y0p:y1p, x0p:x1p] = (top[None] * (1 - t) + bot[None] * t).astype(np.uint8)
    # ON AIR box: dark red housing, lit letters
    txt = word('ON AIR')
    bw, bh = txt.shape[1] + 6, 11
    x0, y0 = 89 - bw // 2, 15
    a[y0:y0 + bh, x0:x0 + bw] = (70, 14, 16)
    a[y0, x0:x0 + bw] = (120, 40, 36)
    a[y0 + bh - 1, x0:x0 + bw] = (34, 8, 10)
    a[y0:y0 + bh, x0] = (40, 10, 12); a[y0:y0 + bh, x0 + bw - 1] = (40, 10, 12)
    a[y0 + 1:y0 + bh - 1, x0 + 1:x0 + bw - 1] = (150, 22, 24)  # lit red face
    box = np.zeros(a.shape[:2], bool); box[y0 + 1:y0 + bh - 1, x0 + 1:x0 + bw - 1] = True
    a = neon(a, txt, x0 + 3, y0 + 2, core=(255, 236, 214), tube=(255, 150, 120), glow=(200, 40, 40), clip=box)
    # warm spill on the wall under it
    out = a.astype(float)
    ys, xs = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    d = np.hypot((xs - (x0 + bw / 2)) / (bw * 0.8), (ys - (y0 + bh / 2)) / 9.0)
    spill = np.clip(1 - d, 0, 1) * 0.22 * ~nd.binary_dilation(box, iterations=1)
    out = out * (1 - spill[..., None]) + np.array((220, 60, 50)) * spill[..., None]
    return Image.fromarray(out.astype(np.uint8)), [x0, y0, bw, bh]


def no_cage(img):
    """Pavilion: the hanging prize cage and its chain out of the plate (cage x 99-129 y 33-78, chain x 107-120 y 0-36)."""
    import cv2
    a = np.asarray(img).copy()
    m = np.zeros(a.shape[:2], np.uint8)
    m[0:38, 106:122] = 1
    m[31:80, 97:132] = 1
    a = cv2.inpaint(a, m, 4, cv2.INPAINT_TELEA)
    return Image.fromarray(a)


def save_plate(rel, im):
    im.save(os.path.join(ROOT, rel), optimize=True)
    if rel.startswith('art/pixel/bg/'):
        im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(ROOT, rel.replace('art/pixel/', 'art/pixel-4x/')), optimize=True)


def resync_occluders(plates=('wkuk', 'pavilion', 'pavilion-open', 'midway')):
    for plate in plates:
        bg = np.asarray(Image.open(os.path.join(ROOT, f'art/pixel/bg/{plate}.png')).convert('RGB'))
        d = os.path.join(ROOT, 'art/pixel/fg')
        for f in sorted(os.listdir(d)):
            if not f.startswith(f'{plate}--'):
                continue
            im = np.asarray(Image.open(os.path.join(d, f)).convert('RGBA')).copy()
            if im.shape[:2] != bg.shape[:2]:
                continue  # story props (cash box, crowd) aren't cutouts
            on = im[..., 3] == 255
            if (im[on, :3] != bg[on]).any():
                im[on, :3] = bg[on]
                Image.fromarray(im, 'RGBA').save(os.path.join(d, f), optimize=True)
                print('resynced', f)


def main():
    save_plate('tools/neon/src/midway.png', club(git_png('tools/neon/src/midway.png')))
    w, rect = onair(git_png('tools/neon/src/wkuk.png'))
    save_plate('tools/neon/src/wkuk.png', w)
    print('ON AIR box', rect)
    for p in ('art/pixel/bg/pavilion.png', 'art/pixel/bg/pavilion-open.png'):
        save_plate(p, no_cage(git_png(p)))
    subprocess.run(['python3', 'tools/neon/paint_neon.py'], cwd=ROOT, check=True)
    resync_occluders()


if __name__ == '__main__':
    main()
