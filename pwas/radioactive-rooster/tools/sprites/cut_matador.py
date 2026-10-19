"""Mortgage grub cutscene frames (Arlong 2026-10-18), cut with the cut_cast.py pipeline (magenta key with tolerance,
ink ring, pupil fix, shared palette, moonlight rim). Rerun after a sheet swap:
    python3 tools/sprites/cut_matador.py
Rooster, rooster-matador-sprites-v3.jpg (v1 rejected: extra eyes / chicken mouth), 4 side poses facing right:
  stance (grub held out), flourish (knee up), hop (sidestep), raise (grub up)  -> rooster-matador-<pose>-r/-l
  scaled like cut_sit.py: comb-to-belt span = rooster-side-r's, every size he has.
Mortgage, mortgage-charge-sprites-v1.jpg, 5 poses facing right:
  paw, charge, bonk (rammed, slumped), dazed (stars), grub (chewing it)        -> mortgage-<pose>-r/-l
  one sheet scale: the standing chew pose is as tall as mortgage-idle-r at her barn size (h44).
"""
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, 'cut_cast.py')).read()
exec(_src[:_src.index('CHARS=[')])
_sit = open(os.path.join(HERE, 'cut_sit.py')).read()
exec(_sit[_sit.index('def belt_row'):_sit.index('def main')])

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ROOSTER = ('rooster-matador-sprites-v3.jpg', ['stance', 'flourish', 'hop', 'raise'])
GOAT = ('mortgage-charge-sprites-v1.jpg', ['paw', 'charge', 'bonk', 'dazed', 'grub'])
R_HEIGHTS = [('', 64), ('-half', 32)] + [(f'-h{x}', x) for x in sorted(set([96, 104] + list(range(28, 124, 4))))]
G_HEIGHTS = [('-h44', 44)]
# Ned, ned-bell-sprites-v1.jpg (Arlong 2026-10-18), 4 poses facing right: pull (screwdriver from the apron), twist
# (bent, unscrewing at counter height), bell (holding bell + screwdriver), pocket -> ned-<pose>-r/-l at his store size
# (the standing bell pose as tall as ned-side-r-h80).
NED = ('ned-bell-sprites-v1.jpg', ['pull', 'twist', 'bell', 'pocket'])
SRC = 'tools/sprites/cut_matador.py'


def cut(sheet, names, prefix, heights, scale_for, pm, man):
    a, rgb, alpha, lab, n, fg = load(sheet)
    frs = frames_from(lab, n, fg, (0, 1280), (0, 720))
    assert len(frs) == len(names), (sheet, len(frs))
    for k in [k for k in man['assets'] if k.startswith(f'sprite/{prefix}-') and any(f'-{p}-' in k for p in names)]:
        del man['assets'][k]
    band = (.45, .65)
    for tag, HH in heights:
        sc = scale_for(a, frs, HH)
        rend = []
        for fr, name in zip(frs, names):
            h = fr[0].stop - fr[0].start
            Hs = int(round(h * sc)) + 1
            cw = int(np.ceil(need_w(fr, (Hs - 1) / h, band) / 2) * 2)
            rend.append((name, *render(rgb, alpha, pm(a) if pm else None, fr, (Hs - 1) / h, band, cw, Hs)))
        Hm = max(r[1].shape[0] for r in rend)
        strip = np.concatenate([np.pad(r[1], ((0, Hm - r[1].shape[0]), (0, 0), (0, 0))) for r in rend], 1).astype(np.uint8)
        pal = Image.fromarray(strip).quantize(colors=40 if HH >= 90 else 32 if HH >= 40 else 24, method=Image.MEDIANCUT, dither=Image.NONE)
        for name, col, A, P in rend:
            img = Image.fromarray(finish(col, A, P, 0, pal), 'RGBA')
            for f, im in (('r', img), ('l', img.transpose(Image.FLIP_LEFT_RIGHT))):
                im = rimlight(im)
                k = f'{prefix}-{name}-{f}{tag}'
                im.save(f'{OUT}/{k}.png')
                w, hh = im.size
                man['assets'][f'sprite/{k}'] = {'kind': 'sprite', 'size': [w, hh], 'anchor': [w // 2, hh], 'source': f'{SRC} ({sheet})'}


# The bell Ned lifts is the counter's own bell: the overlay fg/store--bell is pasted over the painted one in his hand
# (same size and colours, so the overlay -> hand handoff is seamless). BELL_IN_HAND: overlay top-left in the -l frame.
BELL_IN_HAND = (0, 19)


def ned_bell_handoff():
    bell = Image.open(os.path.join(ROOT, 'art/pixel/fg/store--bell.png')).convert('RGBA')
    bx, by = BELL_IN_HAND
    for f in ('l', 'r'):
        p = f'{OUT}/ned-bell-{f}-h80.png'
        im = Image.open(p).convert('RGBA')
        b = bell if f == 'l' else bell.transpose(Image.FLIP_LEFT_RIGHT)
        x = bx if f == 'l' else im.width - bx - b.width
        a = np.array(im)
        a[by:by + b.height - 1, x:x + b.width, 3] = 0  # the painted bell's dome goes; the hand under it stays
        im = Image.fromarray(a, 'RGBA'); im.alpha_composite(b, (x, by))
        im.save(p)


def ned_canvas(man, size=(64, 80)):
    """Ned's frames share one canvas (cast rule): pad each, centred on his feet, to ned-side's 64x80."""
    for name in NED[1]:
        for f in ('l', 'r'):
            k = f'ned-{name}-{f}-h80'
            im = Image.open(f'{OUT}/{k}.png').convert('RGBA')
            c = Image.new('RGBA', size); c.alpha_composite(im, ((size[0] - im.width) // 2, size[1] - im.height))
            c.save(f'{OUT}/{k}.png')
            man['assets'][f'sprite/{k}'].update(size=list(size), anchor=[size[0] // 2, size[1]])


def main():
    man_path = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_path))
    am, _, _, labm, nm, fgm = load('rooster-sprites-approved.jpg')
    main_frs = frames_from(labm, nm, fgm, (0, 1806), (0, 590))
    hmax_main = max(f[0].stop - f[0].start for f in main_frs)
    span = belt_row(am, main_frs[1])
    cut(*ROOSTER, 'rooster-matador', R_HEIGHTS, lambda a, frs, HH: (HH - 1) / hmax_main * span / belt_row(a, frs[0]), pupils, man)
    cut(*GOAT, 'mortgage', G_HEIGHTS, lambda a, frs, HH: (HH - 1) / (frs[4][0].stop - frs[4][0].start), None, man)
    cut(*NED, 'ned', [('-h80', 80)], lambda a, frs, HH: (HH - 1) / (frs[2][0].stop - frs[2][0].start), None, man)
    for k in ['mortgage-walk-l-h44', 'mortgage-side-l-h44', 'mortgage-walk-r-h44', 'mortgage-side-r-h44']:  # her amble back
        if f'sprite/{k}' not in man['assets']:
            w, hh = Image.open(f'{OUT}/{k}.png').size
            man['assets'][f'sprite/{k}'] = {'kind': 'sprite', 'size': [w, hh], 'anchor': [w // 2, hh], 'source': 'tools/sprites/cut_cast.py'}
    ned_bell_handoff()
    ned_canvas(man)
    with open(man_path, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False); f.write('\n')
    for k in ['rooster-matador-stance-r-h84', 'rooster-side-r-h84', 'mortgage-paw-r-h44', 'mortgage-dazed-r-h44', 'mortgage-idle-r-h44']:
        print(k, man['assets'][f'sprite/{k}']['size'])


if __name__ == '__main__':
    main()
