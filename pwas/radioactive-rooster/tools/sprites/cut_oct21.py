"""Oct 21 2026 playthrough batch (NEXT-VERSION-NOTES items 4, 9, 12, 14, 16-19), cut with the cut_cast.py pipeline.
Sources in rooster-scene-art-v2/. Run after any sheet swap (then python3 tools/art_files.py):
    python3 tools/sprites/lunge_headfix.py   # only if rooster-lunge-sprite-v2.jpg changes
    python3 tools/sprites/cut_oct21.py
  rooster-yolk-lunge-sprites-v1.jpg #1  Rooster holding the Yolk (side view, stuffed eye, closed beak) -> sprite/rooster-yolk-r/-l-h84
  rooster-lunge-sprite-v2-headfix.png   the PAH-KAW lunge off the vat rim (closed-beak head pasted from #1 of
                                        the yolk sheet by lunge_headfix.py: the generator keeps opening the beak) -> sprite/rooster-lunge-r/-l-h84
  hattie-chain-sprites-v1.jpg           the Cock Gobbler on the cage chain (hold, flinch-yank), h52 -> sprite/hattie-chain/-flinch-r/-l-h52
  pip-sneak-sprites-v1.jpg              Pip tiptoeing with Corny's keys (keys, after), h56   -> sprite/pip-sneak/-sneak2-r/-l-h56
  henny / deejay / hattie-portrait-subtle-v1.jpg  dialogue portraits 64 x 64          -> portrait/henny, deejay, hattie
  midway-rope-v1.jpg                    the velvet rope + HOT OIL sign, Midway right edge -> fg/midway--rope
  closeup-gloves-v1.jpg                 his white gloves for the inventory Look closeup    -> fx/closeup-gloves
  (procedural)                          hot-oil splash for the showboat lunge                -> fx/oil-splash
  cover-splash-showboat-v2-headfix.png  showboat ending splash (closed beak pasted by splashfix in lunge_headfix.py) -> bg/cover-showboat
  cover-panels-showboat-v2.jpg          its four inset panels                                -> bg/cover-showboat-1..4
Never rerun cut_next.py without glide_webbing.py after it; this script doesn't touch the glide frames.
"""
import json, os
import numpy as np
from PIL import Image, ImageEnhance
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, 'cut_cast.py')).read()
exec(_src[:_src.index('CHARS=[')])
_m = open(os.path.join(HERE, 'cut_matador.py')).read()
exec(_m[_m.index('def cut('):_m.index('# The bell Ned lifts')].replace("SRC", "'tools/sprites/cut_oct21.py'"))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PX = os.path.join(ROOT, 'art/pixel')
SRCN = 'tools/sprites/cut_oct21.py'


def reg(man, key, im, kind, anchor=None, note=''):
    w, h = im.size
    man['assets'][key] = {'kind': kind, 'size': [w, h], 'anchor': anchor or [0, 0], 'source': f'{SRCN}{note}'}


def by_height(i, HH_of=None):
    return lambda a, frs, HH: (HH - 1) / (frs[i][0].stop - frs[i][0].start)


def drop(prefix, name, tag):
    for f in 'rl':
        p = f'{OUT}/{prefix}-{name}-{f}{tag}.png'
        if os.path.exists(p):
            os.remove(p)


def sprites(man):
    # the hold: he stands 84 tall (comb to boots), as the walk frames
    cut('rooster-yolk-lunge-sprites-v1.jpg', ['yolk', 'yolkrun'], 'rooster', [('-h84', 84)], by_height(0), pupils, man)
    for f in 'rl':
        man['assets'].pop(f'sprite/rooster-yolkrun-{f}-h84', None)
    drop('rooster', 'yolkrun', '-h84')
    # the lunge: crouched, one boot pushing off, a touch lower than standing
    cut('rooster-lunge-sprite-v2-headfix.png', ['lunge'], 'rooster', [('-h84', 78)], by_height(0), pupils, man)
    cut('hattie-chain-sprites-v1.jpg', ['chain', 'flinch'], 'hattie', [('-h52', 52)], by_height(1), None, man)
    cut('pip-sneak-sprites-v1.jpg', ['sneak', 'sneak2'], 'pip', [('-h56', 56)], by_height(0), None, man)
    # one canvas per character's frame pair, feet centred (a frame swap never jumps)
    for prefix, names, tag in (('hattie', ('chain', 'flinch'), '-h52'), ('pip', ('sneak', 'sneak2'), '-h56')):
        ks = [f'{prefix}-{n}-{f}{tag}' for n in names for f in 'lr']
        ims = {k: Image.open(f'{OUT}/{k}.png').convert('RGBA') for k in ks}
        W = max(i.width for i in ims.values()); H = max(i.height for i in ims.values()); W += W % 2
        if prefix == 'pip':  # same canvas as her other Pavilion frames (pip-front-h56, 44 x 56): a cue swap never jumps
            W, H = max(W, man['assets']['sprite/pip-front-h56']['size'][0]), max(H, man['assets']['sprite/pip-front-h56']['size'][1])
        for k, im in ims.items():
            c = Image.new('RGBA', (W, H)); c.alpha_composite(im, ((W - im.width) // 2, H - im.height)); c.save(f'{OUT}/{k}.png')
            man['assets'][f'sprite/{k}'].update(size=[W, H], anchor=[W // 2, H])
    hattie_chain(man)
    hattie_exit(man)


def hattie_exit(man):
    """Her exit walk at the finish shares the chain frames' canvas (a cue swap never jumps): the cut_cast.py walk, side and
    back frames, feet centred on the CHAIN_H canvas, as hattie-exit-walk-r / -side-r / -back."""
    W, H = man['assets']['sprite/hattie-chain-l-h52']['size']
    for src, dst in (('hattie-walk-r-h52', 'hattie-exit-walk-r-h52'), ('hattie-side-r-h52', 'hattie-exit-side-r-h52'),
                     ('hattie-back-h52', 'hattie-exit-back-h52')):
        im = Image.open(f'{OUT}/{src}.png').convert('RGBA')
        c = Image.new('RGBA', (W, H)); c.alpha_composite(im, ((W - im.width) // 2, H - im.height)); c.save(f'{OUT}/{dst}.png')
        man['assets'][f'sprite/{dst}'] = {'kind': 'sprite', 'size': [W, H], 'anchor': [W // 2, H],
                                          'source': f'tools/sprites/cut_oct21.py ({src}, re-canvassed)'}


CHAIN_H = 112  # she stands on the stage at y110: the chain runs from her hands to the top of the screen


def hattie_chain(man):
    """The Cock Gobbler holds the cage chain (item 16): the cut frames' chain stops mid-air at h52, so the canvas grows to
    CHAIN_H and a pixel chain runs up from her grip (hold) or her yanking fist (flinch) to the top edge."""
    links = [(70, 66, 74, 255), (128, 124, 130, 255)]
    for f in 'rl':
        for n in ('chain', 'flinch'):
            k = f'hattie-{n}-{f}-h52'
            im = Image.open(f'{OUT}/{k}.png').convert('RGBA')
            W, H = im.size
            c = Image.new('RGBA', (W, CHAIN_H)); c.alpha_composite(im, (0, CHAIN_H - H))
            A = np.array(c)
            al = A[..., 3] > 0
            cols = range(int(W * .65), W) if f == 'r' else range(0, int(W * .35))  # flinch: her yanking fist, out front
            if n == 'chain':
                cols = range(W)
            ys = [(np.argmax(al[:, x]), x) for x in cols if al[:, x].any()]
            y0, x0 = min(ys)
            for y in range(0, y0 + 1):
                A[y, x0] = links[(y // 2) % 2]
                if (y // 2) % 2:
                    A[y, x0 + 1 if x0 + 1 < W else x0 - 1] = links[0]
            Image.fromarray(A, 'RGBA').save(f'{OUT}/{k}.png')
            man['assets'][f'sprite/{k}'].update(size=[W, CHAIN_H], anchor=[W // 2, CHAIN_H])


def portraits(man):
    for key, src, box in (('henny', 'henny-portrait-v1.jpg', (60, 40, 900, 880)),
                          ('deejay', 'deejay-portrait-v1.jpg', (180, 0, 1024, 844)),
                          ('hattie', 'hattie-portrait-subtle-v1.jpg', (200, 0, 1024, 824))):
        im = ImageEnhance.Contrast(Image.open(D + src).convert('RGB')).enhance(1.1)
        c = im.crop(box).resize((64, 64), Image.LANCZOS).quantize(colors=48, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
        c.save(f'{PX}/portrait/{key}.png')
        a = man['assets'].setdefault(f'portrait/{key}', {'kind': 'portrait', 'size': [64, 64], 'anchor': [0, 0], 'legacy': f'portrait-{key}.png'})
        a.pop('pixel', None)
        a['source'] = f'{SRCN} ({src})'


def cutout(src, width, colors=24, whiten=False):
    a, rgb, alpha, lab, n, fg = load(src)
    m = fg & alpha
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    if whiten:  # the sheet painted them cream: his gloves are white
        hsv = np.array(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert('HSV')).astype(float)
        warm = (hsv[..., 1] > 40) & (hsv[..., 2] > 120)
        lum = rgb.mean(-1, keepdims=True)
        rgb = np.where(warm[..., None], np.clip(lum * np.array([1.02, 1.02, 1.06]) + 25, 0, 255), rgb)
    h = int(round((y1 - y0) * width / (x1 - x0)))
    c = rgb[y0:y1, x0:x1] * m[y0:y1, x0:x1, None]
    mm = m[y0:y1, x0:x1].astype(float)
    im = np.array(Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).resize((width, h), Image.LANCZOS)).astype(float)
    A = np.array(Image.fromarray((mm * 255).astype(np.uint8)).resize((width, h), Image.BOX)).astype(float) / 255
    col = np.where(A[..., None] > 0, im / np.maximum(A[..., None], 1e-6), 0)
    return Image.fromarray(finish(np.clip(col, 0, 255), A, np.zeros_like(A), colors), 'RGBA')


def props(man):
    rope = cutout('midway-rope-v1.jpg', 52)
    rope.save(f'{PX}/fg/midway--rope.png'); reg(man, 'fg/midway--rope', rope, 'overlay', None, ' (midway-rope-v1.jpg)')
    gl = cutout('closeup-gloves-v1.jpg', 180, 20, whiten=True)
    gl.save(f'{PX}/fx/closeup-gloves.png'); reg(man, 'fx/closeup-gloves', gl, 'fx', None, ' (closeup-gloves-v1.jpg, whitened)')
    # hot-oil splash: a fan of amber droplets, 3 frames
    rng = np.random.default_rng(11)
    W, H = 96, 56
    drops = [(rng.uniform(-1.3, 1.3), rng.uniform(.5, 1.0), rng.uniform(1, 2.6)) for _ in range(46)]
    for f, tag in enumerate('abc'):
        out = np.zeros((H, W, 4), np.uint8)
        t = .35 + f * .3
        for ang, sp, r in drops:
            x = W / 2 + np.sin(ang) * sp * t * 60
            y = H - 4 - (np.cos(ang) * sp * 70 * t - 50 * t * t)
            rr = r * (1.2 - .3 * f)
            yy, xx = np.ogrid[0:H, 0:W]
            d = (xx - x) ** 2 + (yy - y) ** 2 <= rr * rr
            out[d] = (226, 150, 40, 255)
            if 0 <= int(y) - 1 < H and 0 <= int(x) < W:
                out[int(y) - 1, int(x)] = (255, 222, 120, 255)
        im = Image.fromarray(out, 'RGBA')
        im.save(f'{PX}/fx/oil-splash-{tag}.png'); reg(man, f'fx/oil-splash-{tag}', im, 'fx', None, ' (procedural)')


def cover(man):
    def px(im, size, colors):
        return im.resize(size, Image.LANCZOS).quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    def save(img, key, note):
        img.save(f'{PX}/bg/{key}.png')
        img.resize((img.width * 4, img.height * 4), Image.NEAREST).save(os.path.join(ROOT, f'art/pixel-4x/bg/{key}.png'))
        reg(man, f'bg/{key}', img, 'ending', None, f' ({note})')
    save(px(Image.open(D + 'cover-splash-showboat-v2-headfix.png').convert('RGB'), (320, 180), 64), 'cover-showboat', 'cover-splash-showboat-v2-headfix.png')
    sheet = Image.open(D + 'cover-panels-showboat-v2.jpg').convert('RGB')
    cells = [(3, 3), (642, 3), (3, 362), (642, 362)]
    crops = [(20, 20, 580, 335), (0, 20, 480, 290), (40, 20, 600, 335), (40, 20, 600, 335)]  # #2: clear of the wall signs
    for i, ((cx, cy), (x0, y0, x1, y1)) in enumerate(zip(cells, crops), 1):
        save(px(sheet.crop((cx + x0, cy + y0, cx + x1, cy + y1)), (144, 81), 40), f'cover-showboat-{i}', f'cover-panels-showboat-v2.jpg #{i}')


def main():
    man_path = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_path))
    sprites(man); portraits(man); props(man); cover(man)
    with open(man_path, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False); f.write('\n')
    for k in ['rooster-yolk-r-h84', 'rooster-lunge-r-h84', 'hattie-chain-l-h52', 'hattie-flinch-l-h52', 'pip-sneak-r-h56', 'pip-sneak2-r-h56']:
        print(k, man['assets'][f'sprite/{k}']['size'])
    for k in ['fg/midway--rope', 'fx/closeup-gloves']:
        print(k, man['assets'][k]['size'])


if __name__ == '__main__':
    main()
