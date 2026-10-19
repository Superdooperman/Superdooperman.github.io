"""Inventory icons from painted magenta sheets (Arlong 2026-10-18): key the magenta with tolerance, crop tight, pad to
a square, scale crisply to the icon size (manifest item size, 24 px logical, shown 2x), quantize, hard alpha. No ink
outline (the painted icons are rim-lit, early-90s LucasArts inventory style).
    python3 tools/items/cut_items.py                 # every icon in ICONS
    python3 tools/items/cut_items.py grub ribbon     # just these
Writes art/pixel/item/item-<name>.png and the manifest entry item/item-<name> (legacy placeholder item-<name>.svg).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = '/workspace/github-pages-plans/rooster-scene-art-v2/'
SIZE = 24
# name -> source sheet in rooster-scene-art-v2/
ICONS = {'grub': 'item-grub-v1.jpg'}
# items that never had their own placeholder fall back to the one they used to share
LEGACY = {'half': 'stub', 'tickets': 'stub', 'ticket': 'pass', 'vip': 'pass'}
EXTRA = os.path.join(os.path.dirname(__file__), 'icons.json')  # more name -> sheet pairs (painted icon set)
if os.path.exists(EXTRA):
    ICONS.update(json.load(open(EXTRA)))


def pick(fg, k):
    """The k-th object (row-major: top row left to right, then the next) on a multi-icon sheet."""
    lab, n = nd.label(nd.binary_closing(fg, iterations=6))
    sz = nd.sum(fg, lab, range(1, n + 1)); ob = nd.find_objects(lab)
    big = [i for i in range(n) if sz[i] > 0.15 * sz.max()]
    H = fg.shape[0]
    order = sorted(big, key=lambda i: (((ob[i][0].start + ob[i][0].stop) / 2) > H / 2, ob[i][1].start))
    return fg & (lab == order[k] + 1)


def key(path):
    path, _, k = path.partition('#')
    a = np.array(Image.open(path).convert('RGB')).astype(float)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mag = (np.minimum(R, B) - G > 60) & (R > 120) & (B > 90)
    fg = ~mag
    fg = nd.binary_opening(fg, iterations=2)
    lab, n = nd.label(fg)
    if n > 1 and not k:  # keep the main object plus pieces close to it (legs, antennae); drop specks
        sz = nd.sum(fg, lab, range(1, n + 1)); main = int(np.argmax(sz)) + 1
        near = nd.binary_dilation(lab == main, iterations=25)
        keep = [i + 1 for i in range(n) if sz[i] >= 30 and (near & (lab == i + 1)).any()]
        fg = np.isin(lab, keep)
    if k:
        fg = pick(fg, int(k))
    fg = nd.binary_fill_holes(fg) & fg | nd.binary_erosion(nd.binary_fill_holes(fg), iterations=3) & ~mag
    # de-fringe: pull edge colours from the interior so no magenta halo survives the downscale
    core = nd.binary_erosion(fg, iterations=2)
    _, (iy, ix) = nd.distance_transform_edt(~core, return_indices=True)
    rgb = np.where(core[..., None], a, a[iy, ix])
    return rgb, fg


def cut(name, sheet, size=SIZE):
    rgb, fg = key(SRC + sheet)
    ys, xs = np.nonzero(fg)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    s = max(y1 - y0, x1 - x0); pad = int(s * 0.04); s += 2 * pad
    cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
    box = (cx - s // 2, cy - s // 2, cx - s // 2 + s, cy - s // 2 + s)
    im = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), fg * 255]).astype(np.uint8), 'RGBA')
    big = Image.new('RGBA', (rgb.shape[1] + 2 * s, rgb.shape[0] + 2 * s)); big.paste(im, (s, s))
    crop = big.crop(tuple(v + s for v in box))
    col = np.array(crop.convert('RGB').resize((size, size), Image.LANCZOS)).astype(float)
    al = np.array(crop.getchannel('A').resize((size, size), Image.BOX)).astype(float) / 255
    # colour from opaque source pixels only (premultiplied box average)
    pm = np.array(Image.fromarray((np.array(crop.convert('RGB')) * (np.array(crop.getchannel('A'))[..., None] / 255)).astype(np.uint8)).resize((size, size), Image.BOX)).astype(float)
    col = np.where(al[..., None] > 0.05, pm / np.maximum(al[..., None], 1e-3), col)
    solid = al >= 0.5
    q = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).quantize(colors=20, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    out = np.dstack([np.array(q), solid * 255]).astype(np.uint8); out[~solid] = 0
    path = os.path.join(ROOT, f'art/pixel/item/item-{name}.png')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(out, 'RGBA').save(path)
    return path


def main(names):
    man_path = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_path))
    for name in names:
        cut(name, ICONS[name])
        man['assets'].pop(f'item/{name}', None)  # the old id (placeholder-only) is replaced by the painted icon's
        man['assets'][f'item/item-{name}'] = {'kind': 'item', 'size': [SIZE, SIZE], 'anchor': [SIZE // 2, SIZE // 2],
                                             'legacy': f'item-{LEGACY.get(name, name)}.svg', 'source': f'tools/items/cut_items.py ({ICONS[name]})'}
        print('item', name)
    with open(man_path, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False); f.write('\n')


if __name__ == '__main__':
    main(sys.argv[1:] or list(ICONS))
