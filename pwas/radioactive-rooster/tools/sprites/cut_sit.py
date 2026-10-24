"""Rooster sitting on the fence rail, cut from Arlong's painted sheet rooster-sit-sprites-v2-arlong.jpg (2026-10-23, NOTES
item 37: the fat, puffed-up rooster; replaces v1 of 2026-10-18) with the
cut_cast.py pipeline (magenta key with tolerance, ink ring, pupil fix, shared palette, moonlight rim):
  pose 1  sitting, facing right       -> rooster-sit-r / rooster-sit-l (mirrored)
  pose 2  side sit, boots tucked      -> rooster-sittuck-r / rooster-sittuck-l (the clock shimmy's push frame)
  pose 3  sit-down hop, facing right  -> rooster-sithop-r / rooster-sithop-l (mirrored): the sit-down / stand-up beat
  pose 4  sitting, facing front       -> rooster-sit-front
Scale: the sheet draws all four poses at one size, so one sheet scale is used, set so the side sit's comb-to-belt span
matches rooster-side-r's at every size he has: head and body are the same size as when he stands. Sizes: the base (h64), -half
and every -hN depth bucket. The seat row (the rail line under his butt: the painted shadow line on the sheet, y405) is
written into the manifest as `seat`, in output px from the sprite top. The v2 sheet has no rail line, so each pose's
seat sits as far below the belt (scaled by body size) as the matching v1 pose's did (V1 below).
    python3 tools/sprites/cut_sit.py
"""
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, 'cut_cast.py')).read()
exec(_src[:_src.index('CHARS=[')])  # load / frames_from / pupils / render / need_w / finish / rimlight, D, OUT

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SHEET = 'rooster-sit-sprites-v2-arlong.jpg'
V1 = 'rooster-sit-sprites-v1.jpg'
MAIN = 'rooster-sprites-approved.jpg'
HEIGHTS = [('', 64), ('-half', 32)] + [(f'-h{x}', x) for x in sorted(set([96, 104] + list(range(28, 124, 4))))]
SEAT_Y = 405        # painted rail-shadow line on the sheet (full-res px), under poses 1, 2 and 4
HOP_LIFT = 0.05     # the hop frame is mid-air: its butt rides this share of its height above the rail


def belt_row(a, fr):
    ys, xs, m = fr
    c = a[ys, xs]; mm = m[ys, xs]
    lum = c.mean(2); sat = np.ptp(c, 2)
    rows = (mm & (lum > 150) & (lum < 235) & (sat < 35)).sum(1)
    h = len(rows)
    return int(np.argmax(rows[int(h * .3):int(h * .75)]) + int(h * .3))


def main():
    a, rgb, alpha, lab, n, fg = load(SHEET)
    frs = frames_from(lab, n, fg, (0, 1500), (0, 844))
    assert len(frs) == 4, len(frs)
    a1, _, _, lab1, n1, fg1 = load(V1)
    v1 = frames_from(lab1, n1, fg1, (0, 1280), (0, 720))
    def seat_row(fi, v1i, v1_seat):  # sheet row of the seat for v2 frame fi, from v1 frame v1i's belt-to-seat share
        f1 = v1[v1i]
        k = (frs[0][0].stop - frs[0][0].start) / (v1[0][0].stop - v1[0][0].start)  # sheet-to-sheet body scale
        f = frs[fi]; return f[0].start + belt_row(a, f) + (v1_seat - f1[0].start - belt_row(a1, f1)) * k
    pm = pupils(a)
    am, _, _, labm, nm, fgm = load(MAIN)
    main_frs = frames_from(labm, nm, fgm, (0, 1806), (0, 590))
    hmax_main = max(f[0].stop - f[0].start for f in main_frs)
    span_main = {'side': belt_row(am, main_frs[1]), 'front': belt_row(am, main_frs[0])}
    poses = [  # (frame index, name, faces, matched against, seat row on the sheet)
        (0, 'rooster-sit', 'r', 'side', seat_row(0, 0, SEAT_Y)),
        (1, 'rooster-sittuck', 'r', 'side', frs[1][0].start + seat_row(0, 0, SEAT_Y) - frs[0][0].start),  # head level with the sit's
        (2, 'rooster-sithop', 'r', 'side', None),
        (3, 'rooster-sit-front', None, 'side', seat_row(3, 0, SEAT_Y)),
    ]
    man_path = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_path))
    for k in [k for k in man['assets'] if k.startswith(('sprite/rooster-sit', 'sprite/rooster-sitdown', 'sprite/rooster-sithop', 'sprite/rooster-sittuck'))]:
        del man['assets'][k]
    band = (.45, .62)  # centre on the torso/seat rows
    for tag, HH in HEIGHTS:
        rend = []
        for fi, name, face, ref, seat_y in poses:
            fr = frs[fi]
            h = fr[0].stop - fr[0].start
            scale = (HH - 1) / hmax_main * span_main['side'] / belt_row(a, frs[0])   # sheet px -> output px
            Hs = int(round(h * scale)) + 1
            if name == 'rooster-sit-front' and Hs < HH - 3:
                # the v2 sheet paints the front sit squatter than the side sit (~0.83 of his height): bring it up to
                # within 3 px of his standing height so it reads as the same bird, not a smaller one
                Hs = HH - 3
            sc = (Hs - 1) / h
            cw = int(np.ceil(need_w(fr, sc, band) / 2) * 2)
            col, A, P = render(rgb, alpha, pm, fr, sc, band, cw, Hs)
            if seat_y is not None:
                seat = 1 + (seat_y - fr[0].start) * sc
            else:  # the hop: same belt-to-seat drop as the sit, lifted off the rail
                seat = 1 + (belt_row(a, fr) + (seat_row(0, 0, SEAT_Y) - frs[0][0].start - belt_row(a, frs[0]))) * sc + HOP_LIFT * Hs
            if name == 'rooster-sit-front':
                seat = min(seat, 0.80 * Hs)  # v2 front squat: thighs on the rail, boots hanging below it (the v1 share sat him too low)
            rend.append((name, face, col, A, P, int(round(seat))))
        strip = np.concatenate([np.pad(r[2], ((0, max(x[2].shape[0] for x in rend) - r[2].shape[0]), (0, 0), (0, 0))) for r in rend], 1).astype(np.uint8)
        pal = Image.fromarray(strip).quantize(colors=40 if HH >= 90 else 32 if HH >= 40 else 24, method=Image.MEDIANCUT, dither=Image.NONE)
        for name, face, col, A, P, seat in rend:
            img = Image.fromarray(finish(col, A, P, 0, pal), 'RGBA')
            outs = {name: img} if face is None else {f'{name}-r': img, f'{name}-l': img.transpose(Image.FLIP_LEFT_RIGHT)}
            for k, im in outs.items():
                im = rimlight(im)
                im.save(f'{OUT}/{k}{tag}.png')
                w, hh = im.size
                man['assets'][f'sprite/{k}{tag}'] = {'kind': 'sprite', 'size': [w, hh], 'anchor': [w // 2, hh], 'seat': seat,
                                                     'source': f'tools/sprites/cut_sit.py ({SHEET})'}
    with open(man_path, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False); f.write('\n')
    for k in ['rooster-sit-r-h32', 'rooster-sithop-r-h32', 'rooster-sit-front-h32', 'rooster-sit-r-h96']:
        print(k, man['assets'][f'sprite/{k}'])


if __name__ == '__main__':
    main()
