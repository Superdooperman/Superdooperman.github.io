"""Push A art (2026-10-24), all from rooster-scene-art-v2/ with the cut_cast.py pipeline:
  stogie-guy-sprites-v1.jpg  -> stogie-r / stogie-front / stogie-arms-r (+ -l mirrors) and the flashback-crowd
                                silhouettes stogie-sil-front / stogie-sil-arms-r, h64 (NOTES item 45; unnamed in game)
  getaway-car-v1.jpg         -> getaway-car-r-h16 (his charcoal sedan, parked in the Pavilion's back flap; mirrored to
                                face the way it drives off)
  pavilion-aged-v2.jpg       -> bg/pavilion-aged (+ pixel-4x copy): the Pavilion years ago, for the flashback (item 41);
                                the cart sign is patched back in from the live plate
  item-sauce + matador-raise -> rooster-sauce-raise-r/-l at every hero size (item 40: the bottle where the grub was)
  pip-walk-r / pip-side-r / pip-reach-l -> mirrored -l / -r frames so Pip can walk both ways (item 38)
  rooster-sit-r / rooster-sittuck-r (cut_sit.py, v2 sheet) -> rooster-shimmy-a-r / -b-r h88 with the clock post painted
                                over the forearm and the glove back on top: the arm wraps the post (items 33/42)
  rope-hot-oil-arlong.png    -> fg/midway--rope: Arlong's painted rope, scaled and placed as a full-frame walk-behind
                                cutout with a sloped edge (item 46)
Run after cut_sit.py:  python3 tools/sprites/cut_push_a.py && python3 tools/art_files.py
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, 'cut_cast.py')).read()
exec(_src[:_src.index('CHARS=[')])  # load / frames_from / render / need_w / finish / rimlight, D, OUT
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PIX = os.path.join(ROOT, 'art/pixel')
MAN = os.path.join(ROOT, 'art/manifest.json')
man = json.load(open(MAN)); A = man['assets']
HEIGHTS = [('', 64), ('-half', 32)] + [(f'-h{x}', x) for x in sorted(set([96, 104] + list(range(28, 124, 4))))]


def reg(id_, img, kind='sprite', src='', **kw):
    os.makedirs(os.path.dirname(f'{PIX}/{id_}.png'), exist_ok=True)
    img.save(f'{PIX}/{id_}.png')
    w, h = img.size
    A[id_] = {'kind': kind, 'size': [w, h], 'anchor': [w // 2, h] if kind == 'sprite' else [0, 0], **kw,
              'source': f'tools/sprites/cut_push_a.py ({src})'}


def load_key(src, bg, xmin=0, glass=None):
    """Like load(), but keyed by distance to the sheet's own (not quite magenta) background colour. xmin drops columns
    left of it (the car's headlight beam); glass fills enclosed holes (the car's windows) with that colour."""
    a = np.array(Image.open(D + src).convert('RGB')).astype(float)
    d = np.sqrt(((a - np.array(bg, float)) ** 2).sum(2))
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    fg = ~((d < 70) | ((np.minimum(R, B) - G > 110) & (B > 60)))
    fg = nd.binary_opening(fg, iterations=1)
    fg[:, :xmin] = False
    if glass is not None:
        holes = nd.binary_fill_holes(fg) & ~fg
        a[holes] = glass; fg |= holes; d[holes] = 999
    clean = fg & ~(d < 110)
    _, (iy, ix) = nd.distance_transform_edt(~clean, return_indices=True)
    rgb = np.where(clean[..., None], a, a[iy, ix])
    alpha = nd.binary_erosion(fg, iterations=1)
    lab, n = nd.label(fg)
    return a, rgb, alpha, lab, n, fg


def cut(src, bg, xr, yr, H, colors, minsz=3000, band=(.6, 1.0), **kw):
    a, rgb, alpha, lab, n, fg = load_key(src, bg, **kw)
    frs = frames_from(lab, n, fg, xr, yr, minsz)
    out = []
    hmax = max(f[0].stop - f[0].start for f in frs)
    for fr in frs:
        h = fr[0].stop - fr[0].start
        Hs = int(round((H - 1) * h / hmax)) + 1
        sc = (Hs - 1) / h
        cw = int(np.ceil(need_w(fr, sc, band) / 2) * 2)
        col, Al, P = render(rgb, alpha, None, fr, sc, band, cw, Hs)
        out.append(Image.fromarray(finish(col, Al, np.zeros_like(Al), colors), 'RGBA'))
    return out


def silhouette(img, ink=(26, 18, 24), ember=None):
    a = np.array(img).copy(); al = a[..., 3] > 0
    a[al, :3] = ink
    if ember:  # the cigar's lit end still glows
        x, y = ember; a[y, x, :3] = (255, 140, 40); a[y, x, 3] = 255
    return Image.fromarray(a, 'RGBA')


def stogie():
    fr = cut('stogie-guy-sprites-v1.jpg', (188, 19, 98), (0, 1280), (0, 720), 64, 28)
    assert len(fr) == 3, len(fr)
    names = ['stogie-r', 'stogie-front', 'stogie-arms-r']
    for name, im in zip(names, fr):
        im = rimlight(im)
        reg(f'sprite/{name}-h64', im, src='stogie-guy-sprites-v1.jpg; Arlong item 45, design per reports/gooner-character-legal-check')
        if name.endswith('-r'):
            reg(f'sprite/{name[:-2]}-l-h64', rimlight(fr[names.index(name)].transpose(Image.FLIP_LEFT_RIGHT)), src='mirror of ' + name)
    # flashback silhouettes: find the cigar's bright tip to keep it glowing
    for name, im in zip(names, fr):
        if name == 'stogie-r': continue
        a = np.array(im).astype(int)
        hot = (a[..., 0] > 200) & (a[..., 1] < 150) & (a[..., 3] > 0)
        hot[int(a.shape[0] * .35):] = False
        ys, xs = np.nonzero(hot)
        ember = (int(xs.max()), int(ys[xs.argmax()])) if len(xs) else None
        sil = silhouette(im, ember=ember)
        reg(f'sprite/{name.replace("stogie-", "stogie-sil-")}-h64', sil, src=f'silhouette of {name}')
        if name.endswith('-r'):
            reg(f'sprite/{name.replace("stogie-", "stogie-sil-")[:-2]}-l-h64', sil.transpose(Image.FLIP_LEFT_RIGHT), src=f'mirror')


def car():
    fr = cut('getaway-car-v1.jpg', (184, 17, 94), (0, 1280), (0, 720), 16, 24, minsz=20000, band=(.4, 1.0), xmin=110, glass=(34, 36, 48))
    im = max(fr, key=lambda i: i.size[0] * i.size[1])
    reg('sprite/getaway-car-r-h16', im.transpose(Image.FLIP_LEFT_RIGHT), src='getaway-car-v1.jpg, mirrored; item 45')


def pavilion_aged():
    aged = Image.open(D + 'pavilion-aged-v2.jpg').convert('RGB').resize((1280, 720), Image.LANCZOS)
    live = Image.open(os.path.join(ROOT, 'art/pixel-4x/bg/pavilion.png')).convert('RGB')
    box = (1060, 290, 1172, 340)  # the corn-dog cart's sign came out garbled: patch the live plate's back in
    aged.paste(live.crop(box), box[:2])
    small = aged.resize((320, 180), Image.BOX).quantize(colors=64, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    reg('bg/pavilion-aged', small, kind='bg', src='pavilion-aged-v2.jpg: the Pavilion years ago (item 41)')
    small.resize((1280, 720), Image.NEAREST).save(os.path.join(ROOT, 'art/pixel-4x/bg/pavilion-aged.png'))


def sauce_raise():
    icon = Image.open(f'{PIX}/item/item-sauce.png').convert('RGBA')
    bb = icon.getbbox(); bottle = icon.crop(bb)
    for tag, H in HEIGHTS:
        for face in 'rl':
            base = Image.open(f'{OUT}/rooster-matador-raise-{face}{tag}.png').convert('RGBA')
            a = np.array(base); al = a[..., 3] > 0; h, w = al.shape
            region = np.zeros_like(al)
            if face == 'r': region[:, int(w * .7):] = True
            else: region[:, :int(w * .3)] = True
            glove = (a[..., :3].mean(2) > 165) & al & region
            glove[int(h * .3):] = False  # the raised glove, not the one on his hip
            ys, xs = np.nonzero(glove)
            fx, fy = int(round(xs.mean())), int(ys.min())
            bh = max(5, int(round(H * .2))); bw = max(2, int(round(bottle.width * bh / bottle.height)))
            b = bottle.resize((bw, bh), Image.NEAREST if bh < bottle.height else Image.LANCZOS)
            ba = np.array(b); ba[..., 3] = np.where(ba[..., 3] > 100, 255, 0); b = Image.fromarray(ba)
            # the bottle stands in his fist: its lower third hidden behind the glove
            pad = max(0, bh - int(bh * .35) - fy)
            can = Image.new('RGBA', (w, h + pad)); can.alpha_composite(base, (0, pad))
            neck = Image.new('RGBA', can.size); neck.alpha_composite(b, (fx - bw // 2, fy + pad - bh + int(bh * .35)))
            fist = np.array(can); glove = (fist[..., :3].mean(2) > 165) & (fist[..., 3] > 0) & np.pad(region, ((pad, 0), (0, 0)))
            glove[int(h * .3) + pad:] = False
            out = Image.alpha_composite(can, neck); oa = np.array(out); oa[glove] = fist[glove]
            reg(f'sprite/rooster-sauce-raise-{face}{tag}', Image.fromarray(oa), src=f'matador-raise-{face} + item-sauce (item 40)')


def pip_flips():
    for src, dst in [('pip-walk-r', 'pip-walk-l'), ('pip-side-r', 'pip-side-l'), ('pip-reach-l', 'pip-reach-r')]:
        im = Image.open(f'{OUT}/{src}-h56.png').convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT)
        reg(f'sprite/{dst}-h56', im, src=f'mirror of {src} (item 38)')


def shimmy():
    plate = np.array(Image.open(f'{PIX}/bg/midway.png').convert('RGB'))
    post = plate[70:120, 121:131].reshape(-1, 3)
    pcol = np.median(post, 0).astype(np.uint8); dark = (pcol * .6).astype(np.uint8)
    for src, dst in [('rooster-sit-r', 'rooster-shimmy-a-r'), ('rooster-sittuck-r', 'rooster-shimmy-b-r')]:
        im = Image.open(f'{OUT}/{src}-h88.png').convert('RGBA'); a = np.array(im); h, w = a.shape[:2]
        al = a[..., 3] > 0
        glove = (a[..., :3].min(2) > 185) & al
        glove[:int(h * .45)] = False; glove[int(h * .9):] = False  # the glove at his seat, not the eye
        lab, n = nd.label(glove)
        sz = nd.sum(glove, lab, range(1, n + 1)); glove = lab == (int(np.argmax(sz)) + 1)
        soft = (a[..., :3].mean(2) > 110) & (np.ptp(a[..., :3].astype(int), 2) < 70) & al  # the glove's shaded side too
        glove = nd.binary_dilation(glove, iterations=3) & soft
        ys, xs = np.nonzero(glove)
        gx, gy = int(round(xs.mean())), int(round(ys.mean()))
        x0, x1 = gx - 5, gx + 6
        y0, y1 = max(0, gy - 13), min(h, gy + 6)
        a2 = a.copy()
        band = np.zeros(al.shape, bool); band[y0:y1, max(0, x0):x1] = True
        band &= al
        a2[band, :3] = pcol
        a2[band & (np.arange(w)[None, :] >= x1 - 2), :3] = dark
        a2[band & (np.arange(w)[None, :] < x0 + 1), :3] = dark
        a2[nd.binary_dilation(glove) & al & ~glove, :3] = INK
        a2[glove] = a[glove]
        reg(f'sprite/{dst}-h88', Image.fromarray(a2), src=f'{src} gripping the clock post: post over the forearm, glove on top (items 33/42)',
            post=[gx, gy])


def bottle_prop():
    """fx/sauce-bottle: the thrown bottle for the sauce toss (item 40), the same bottle at the size it has in his fist."""
    icon = Image.open(f'{PIX}/item/item-sauce.png').convert('RGBA')
    b = icon.crop(icon.getbbox()); bh = 17; bw = max(2, int(round(b.width * bh / b.height)))
    b = b.resize((bw, bh), Image.LANCZOS); ba = np.array(b); ba[..., 3] = np.where(ba[..., 3] > 100, 255, 0)
    reg('fx/sauce-bottle', Image.fromarray(ba), kind='fx', src='item-sauce at 17 px (item 40)')


def clock_cutout():
    """Items 33/42: the clock housing cut from the midway plate (housing polygon, hard alpha), drawn over him only during
    the shimmy cutscene so he climbs up BEHIND the clock, head and comb over its roof. Overlay at (108, 10)."""
    from PIL import ImageDraw
    bg = Image.open(os.path.join(ROOT, 'art/pixel/bg/midway.png')).convert('RGBA').crop((108, 10, 150, 56))
    m = Image.new('L', bg.size, 0)
    ImageDraw.Draw(m).polygon([(p[0] - 108, p[1] - 10) for p in [(111, 28), (133, 14), (146, 28), (146, 53), (111, 53)]], fill=255)
    bg.putalpha(m)
    reg('fg/midway--clock', bg, kind='overlay', src='cut from bg/midway: the clock housing, for the shimmy')


def rope():
    r = Image.open(D + 'rope-hot-oil-arlong.png').convert('RGBA')
    s = 0.08
    small = r.resize((int(round(r.width * s)), int(round(r.height * s))), Image.LANCZOS)
    sa = np.array(small); sa[..., 3] = np.where(sa[..., 3] > 110, 255, 0); small = Image.fromarray(sa)
    rgb = small.convert('RGB').quantize(colors=24, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGBA')
    q = np.array(rgb); q[..., 3] = sa[..., 3]; small = Image.fromarray(q)
    back = (137 * s, 685 * s)  # back post's foot in the painting
    left, top = int(round(256 - back[0])), int(round(146 - back[1]))
    can = Image.new('RGBA', (320, 180)); can.alpha_composite(small, (left, top))
    reg('fg/midway--rope', can, kind='fg', src='rope-hot-oil-arlong.png (Arlong, item 46), scale 0.08, back post foot at (256,146), front post foot at (303,179)',
        base=179)
    # like every occluder, the cutout is also part of the plate (pixel + its 4x nearest copy): idempotent (hard alpha)
    plate = os.path.join(ROOT, 'art/pixel/bg/midway.png')
    bg = Image.open(plate).convert('RGBA'); bg.alpha_composite(can); bg = bg.convert('RGB')
    bg.save(plate, optimize=True)
    bg.resize((1280, 720), Image.NEAREST).save(plate.replace('art/pixel/', 'art/pixel-4x/'), optimize=True)
    return left, top, small.size


if __name__ == '__main__':
    stogie(); car(); pavilion_aged(); sauce_raise(); bottle_prop(); pip_flips()
    if os.path.exists(f'{OUT}/rooster-sittuck-r-h88.png'): shimmy()
    clock_cutout()
    print('rope', rope())
    with open(MAN, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False); f.write('\n')
