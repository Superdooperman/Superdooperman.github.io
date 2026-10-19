"""Red underarm webbing on the glide frames (canon: it only shows when he glides; Arlong 2026-10-19).
The head and body stay the approved rooster-glide-v2 cut (side head: one stuffed eye on the side, rigid closed beak,
chin under it). The webbing is lifted from the rooster-glide-v3-webbing-alt.jpg cut (whose head is rejected: a face
showed under the beak) and laid in behind his arms, ink-ringed. Run after cut_next.py:
    python3 tools/sprites/glide_webbing.py
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'art/pixel/sprite')
INK = (22, 14, 26, 255)


def v3_frames():
    """Cut the v3 sheet with cut_next's pipeline into a scratch dir (same scale rule as the v2 glide)."""
    import tempfile
    g = {'__file__': os.path.join(HERE, 'cut_next.py')}
    src = open(os.path.join(HERE, 'cut_next.py')).read()
    exec(src[:src.index('def main():')], g)
    tmp = tempfile.mkdtemp()
    g['OUT'] = tmp
    man = {'assets': {}}
    g['cut']('rooster-glide-v3-webbing-alt.jpg', ['glide', 'glide-egg'], 'rooster', [('-h84', 84)],
             lambda a, frs, HH: 1.1 * HH / max(f[1].stop - f[1].start for f in frs), g['pupils'], man)
    return tmp


def webbing(b, H):
    r, g, bb = [b[..., i].astype(int) for i in range(3)]
    red = (b[..., 3] > 0) & (r > g + 35) & (r > bb + 25) & (r > 70)
    lab, n = nd.label(red, structure=np.ones((3, 3)))
    keep = []
    for i, sl in enumerate(nd.find_objects(lab)):
        z = (lab[sl] == i + 1).sum()
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        if z < 6 or y1 <= 26:  # specks, the comb
            continue
        if y0 >= 48 and x1 <= 34:  # stray red by the boots
            continue
        if z < 10 and x0 > b.shape[1] * 0.8:  # the glove
            continue
        keep.append(i + 1)
    return np.isin(lab, keep)


def lay(v2, v3, dx, dy):
    a = np.array(Image.open(v2).convert('RGBA')); b = np.array(Image.open(v3).convert('RGBA'))
    red = webbing(b, a.shape[0])
    ink = nd.binary_dilation(red) & ~red & (b[..., :3].astype(int).sum(-1) < 150) & (b[..., 3] > 0)
    o = a.copy()
    for y, x in zip(*np.nonzero(red | ink)):
        Y, X = y + dy, x + dx
        if 0 <= Y < a.shape[0] and 0 <= X < a.shape[1] and a[Y, X, 3] == 0:
            o[Y, X] = b[y, x]
    new = (o[..., 3] > 0) & (a[..., 3] == 0)
    al = o[..., 3] > 0
    o[nd.binary_dilation(new) & ~al] = INK  # close the outline round the new feathers
    return o


def main():
    tmp = v3_frames()
    man_path = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_path))
    for pose, (dx, dy) in (('glide', (3, -1)), ('glide-egg', (3, -1))):
        o = lay(f'{OUT}/rooster-{pose}-r-h84.png', f'{tmp}/rooster-{pose}-r-h84.png', dx, dy)
        for f, arr in (('r', o), ('l', o[:, ::-1])):
            Image.fromarray(np.ascontiguousarray(arr), 'RGBA').save(f'{OUT}/rooster-{pose}-{f}-h84.png')
            man['assets'][f'sprite/rooster-{pose}-{f}-h84']['source'] = 'tools/sprites/cut_next.py (rooster-glide-v2.jpg) + tools/sprites/glide_webbing.py (webbing from rooster-glide-v3-webbing-alt.jpg)'
    with open(man_path, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False); f.write('\n')


if __name__ == '__main__':
    main()
