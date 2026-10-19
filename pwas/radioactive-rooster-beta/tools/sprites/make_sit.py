"""Rooster sitting on the fence rail (Arlong, 2026-10-18: "a new sprite of him sitting on the rail to match the main
sprites style"). Built from his own cut frame sprite/rooster-front-h32 (the size he is at the fence rail), so the
palette, rim light, ink ring and proportions are his main cast sprite's exactly:
  rooster-sit-front-h32      head, torso, belt and arms unchanged; thighs foreshortened toward the viewer (2 rows) with
                             the seat line on their underside; shins and clawed boots dangling below the rail
  rooster-sitdown-front-h32  the in-between: knees bent and spread, half a seat lower (sit-down / stand-up beat)
Seat row (the rail top, logical px from the sprite top) is written into the manifest as `seat`.
    python3 tools/sprites/make_sit.py
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SP = os.path.join(ROOT, 'art/pixel/sprite')
INK = (22, 14, 26, 255)


def ring(a):
    """1 px ink ring round the figure, only where the edge isn't inked already (the cut frames carry their own)."""
    al = a[..., 3] > 0
    core = al & ~np.all(a == np.array(INK, np.uint8), axis=-1)
    r = nd.binary_dilation(core) & ~al
    a[r] = INK
    return a


def main():
    src = np.array(Image.open(os.path.join(SP, 'rooster-front-h32.png')).convert('RGBA'))
    H, W = src.shape[:2]  # 32 x 28
    suit = src[20, 13].copy()      # suit black below the belt
    hi = src[15, 9].copy()         # suit sheen (rim-lit)
    # --- sitting: head/torso/belt rows 0-20 as is; thighs foreshortened toward the viewer (rows 21-23, knees wider than
    # the hips, sheen on the knee tops); the seat line is under row 23; boots (rows 25-31) hang from row 24, a px apart
    sit = np.zeros((31, W, 4), np.uint8)
    sit[0:21] = src[0:21]
    for y in range(18, 21):  # forearms bend forward to the knees: drop the hanging gloves
        for x in list(range(0, 9)) + list(range(19, W)):
            if sit[y, x][3] and sit[y, x][:3].mean() > 150:
                sit[y, x] = suit
    gl = [(src[y, x][:3].astype(int).sum(), y, x) for y in range(17, 24) for x in range(W) if src[y, x][3]]
    _, gy, gx = max(gl)
    glove = src[gy, gx].copy()       # his own glove white
    for y, x0, x1 in ((21, 7, 21), (22, 6, 22), (23, 6, 22)):
        for x in range(x0, x1):
            sit[y, x] = suit
    for x in (8, 9, 10, 17, 18, 19):
        sit[22, x] = hi                  # knee tops catch the light
    sit[23, 13:15] = INK                 # gap between the knees
    for x, y in ((7, 21), (8, 21), (19, 21), (20, 21), (7, 22), (20, 22)):
        sit[y, x] = glove                # gloved hands resting on the knees
    for y in range(21, 24):
        sit[y, 5] = INK if sit[y, 6][3] else sit[y, 5]
        sit[y, 22] = INK if sit[y, 21][3] else sit[y, 22]
    boots = src[25:32]
    sit[24:31, 0:13] = boots[:, 1:14]
    sit[24:31, 15:28] = boots[:, 14:27]
    sit = ring(sit)
    # --- the in-between: knees bent and spread (drop two leg rows, boots one px apart each side)
    mid = np.zeros((31, W, 4), np.uint8)
    mid[0:22] = src[0:22]
    legs = src[22:32].copy()
    legs = np.concatenate([legs[0:1], legs[3:]], 0)    # 8 rows: hips + shortened bent legs
    left, right = legs[:, :14].copy(), legs[:, 14:].copy()
    spread = np.zeros_like(legs)
    spread[:, 0:13] = left[:, 1:14]
    spread[:, 15:28] = right[:, 0:13]
    spread[0] = legs[0]
    mid[22:30] = spread
    mid[23, 13:15] = suit  # crotch fill between the spread knees
    mid = ring(mid)

    man_p = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_p))
    for name, a, seat in (('rooster-sit-front-h32', sit, 24), ('rooster-sitdown-front-h32', mid, 25)):
        ys = np.nonzero(a[..., 3].any(1))[0]
        a = a[: ys.max() + 1]
        Image.fromarray(a, 'RGBA').save(os.path.join(SP, name + '.png'), optimize=True)
        h, w = a.shape[:2]
        man['assets'][f'sprite/{name}'] = {'kind': 'sprite', 'size': [w, h], 'anchor': [w // 2, h], 'seat': seat,
                                           'source': 'tools/sprites/make_sit.py (from sprite/rooster-front-h32)'}
        print(name, (w, h), 'seat row', seat)
    with open(man_p, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False)
        f.write('\n')


if __name__ == '__main__':
    main()
