"""Next-version finale + midway props (Arlong 2026-10-19), cut with the cut_cast.py pipeline (magenta key, ink ring,
shared palette, moonlight rim). Sources in rooster-scene-art-v2/. Rerun after a sheet swap:
    python3 tools/sprites/cut_next.py
  vendor-sprites-v1.jpg   corn-dog vendor (idle, talk), Pavilion cart, h80             -> sprite/vendor-<pose>-r/-l-h80
  rooster-glide-v2.jpg    Rooster's glide (arms out; arms round the Yolk), side view   -> sprite/rooster-glide(-egg)-r/-l-h84
                          (approved side-view head: one stuffed eye on the side, rigid closed beak, chin under it;
                          scale: nose-to-toe 1.1 x his standing height at h84)
  cage-egg-v1.jpg         the prize cage + the Yolk (repainted pitch black with a yolk-green glow, canon), as a cast prop (two glow frames, empty after the catch);
                          the chain runs off the top of the screen                      -> sprite/cage-egg-a/-b, cage-empty (-h150)
                          + the Yolk alone for the catch drop                           -> fx/yolk-egg
  props-cashbox-geigerbulb-v1.jpg #0  Corny's cash box on the booth counter             -> fg/midway--cashbox
  crowd-fg-v1.jpg         foreground crowd heads for the Hattie convo (one row 320 x 66, raised per step) -> fg/pavilion--crowd
  gobbler-portrait-v2.jpg the Cock Gobbler's dialogue portrait (gold hawk-feather mask, hooked beak, red lips,
                          dark wing-cape, black opera glove), 64 x 64                    -> portrait/gobbler
  cover-splash-hero-v1.jpg  Silver Age comic-cover splash: the glide, red webbing out, over the Pavilion -> bg/cover-hero
  cover-panels-hero-v1.jpg  the hero ending's four inset panels (cart taillights, hawk feather on the bucket,
                            the neon hawk across town, Henny at the coop), cropped clear of the sheet's numbers and
                            painted signs                                                  -> bg/cover-hero-1..4
  (procedural) vat steam + red glow over the oil, 4 loop frames                         -> sprite/vat-steam-a..d-h40
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, 'cut_cast.py')).read()
exec(_src[:_src.index('CHARS=[')])
_m = open(os.path.join(HERE, 'cut_matador.py')).read()
exec(_m[_m.index('def cut('):_m.index('# The bell Ned lifts')].replace("SRC", "'tools/sprites/cut_next.py'"))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PX = os.path.join(ROOT, 'art/pixel')
SRCN = 'tools/sprites/cut_next.py'


def reg(man, key, im, kind, anchor=None, note=''):
    w, h = im.size
    man['assets'][key] = {'kind': kind, 'size': [w, h], 'anchor': anchor or [0, 0], 'source': f'{SRCN}{note}'}


def keyed(sheet):
    a, rgb, alpha, lab, n, fg = load(sheet)
    return a, rgb, alpha, fg


def small(rgb, mask, box, size, colors=32):
    """Crop box (y0, y1, x0, x1) of a keyed sheet, scale to size, quantize, ink ring."""
    y0, y1, x0, x1 = box
    c = rgb[y0:y1, x0:x1] * mask[y0:y1, x0:x1, None]
    m = mask[y0:y1, x0:x1].astype(float)
    im = np.array(Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).resize(size, Image.LANCZOS)).astype(float)
    A = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize(size, Image.BOX)).astype(float) / 255
    col = np.where(A[..., None] > 0, im / np.maximum(A[..., None], 1e-6), 0)
    return finish(np.clip(col, 0, 255), A, np.zeros_like(A), colors)


def cage(man):
    a, rgb, alpha, fg = keyed('cage-egg-v1.jpg')
    m = fg & alpha
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    W = 30
    sc = W / (x1 - x0)
    H = int(round((y1 - y0) * sc))
    base = small(rgb, m, (y0, y1, x0, x1), (W + 2, H + 1), 28)  # cage + chain, ~30 x 82
    # the Yolk: yellow-green pixels inside the cage
    r, g, b = [base[..., i].astype(int) for i in range(3)]
    egg = (base[..., 3] > 0) & (g > 120) & (r > 90) & (b < 120) & (g > b + 50)
    egg = nd.binary_closing(egg, iterations=1) & (base[..., 3] > 0)
    # chain off the top of the screen: repeat the top chain link rows
    CH = 150
    link = base[:10]
    full = np.zeros((CH, base.shape[1], 4), np.uint8)
    full[CH - base.shape[0]:] = base
    for y in range(CH - base.shape[0] - 1, -1, -1):
        full[y] = link[(y - (CH - base.shape[0])) % 10]
    off = CH - base.shape[0]
    eggm = np.zeros(full.shape[:2], bool); eggm[off:] = egg
    # canon (rooster-story.md): the Yolk is pitch black and glowing. Black shell, a little moonlit sheen up top,
    # a radioactive yolk-green glow round its edge (brighter in frame b)
    from skimage.morphology import convex_hull_image
    whole = convex_hull_image(eggm)  # the egg's whole outline; the bars in front of it stay bars
    bars = whole & ~eggm
    core = nd.binary_erosion(whole) & ~bars
    rim = whole & ~nd.binary_erosion(whole) & ~bars
    ys, xs = np.nonzero(whole)
    full[core] = (18, 14, 24, 255)
    sheen = core & (np.arange(full.shape[0])[:, None] < ys.min() + 4) & (np.arange(full.shape[1])[None] < xs.mean())
    full[sheen] = (58, 56, 76, 255)
    full[rim] = (150, 210, 70, 255)
    # glow frames: a = steady, b = brighter yolk + a soft halo on the bars round it
    fa = full.copy()
    fb = full.copy().astype(float)
    fb[rim, :3] = (214, 255, 120)
    halo = nd.binary_dilation(whole, iterations=2) & ~whole
    tint = np.array((210, 255, 120), float)
    on = halo & (full[..., 3] > 0)
    fb[on, :3] = fb[on, :3] * 0.55 + tint * 0.45
    fb = fb.astype(np.uint8)
    # empty: the Yolk gone (back bars stay where the egg didn't cover them)
    fe = full.copy()
    fe[whole & ~bars] = 0
    near = nd.binary_dilation(whole, iterations=3) & ~whole
    gi = fe[..., :3].astype(int)
    fe[near & (gi[..., 1] > gi[..., 0] + 25)] = 0  # the sheet's green glow spill on the bars round the egg
    # the back bars behind where the egg sat: carry the cage's own pattern down from the rows above the egg
    eys, exs = np.nonzero(whole & ~bars)
    hgt = eys.max() - eys.min() + 2
    for y, x in sorted(zip(eys, exs)):
        sy = y - hgt
        if sy >= 0 and not whole[sy, x]:
            fe[y, x] = full[sy, x]
    for name, arr in (('cage-egg-a', fa), ('cage-egg-b', fb), ('cage-empty', fe)):
        im = Image.fromarray(arr, 'RGBA')
        k = f'{name}-h{CH}'
        im.save(f'{PX}/sprite/{k}.png')
        reg(man, f'sprite/{k}', im, 'sprite', [im.width // 2, im.height], ' (cage-egg-v1.jpg)')
    # the Yolk on its own (for the drop into the basket): the whole egg, no bars in front
    sl = (slice(ys.min() - 1, ys.max() + 2), slice(xs.min() - 1, xs.max() + 2))
    em = whole[sl]
    e = np.zeros(em.shape + (4,), np.uint8)
    ein = nd.binary_erosion(em)
    e[ein] = (18, 14, 24, 255)
    e[ein & (np.arange(em.shape[0])[:, None] < 5) & (np.arange(em.shape[1])[None] < em.shape[1] / 2)] = (58, 56, 76, 255)
    e[em & ~ein] = (214, 255, 120, 255)
    ring = nd.binary_dilation(em) & ~em
    e[ring] = (40, 52, 18, 255)
    im = Image.fromarray(e, 'RGBA')
    im.save(f'{PX}/fx/yolk-egg.png')
    reg(man, 'fx/yolk-egg', im, 'fx', None, ' (the Yolk from cage-egg-v1.jpg)')
    print('cage', fa.shape, 'egg', im.size)


def cashbox(man):
    a, rgb, alpha, fg = keyed('props-cashbox-geigerbulb-v1.jpg')
    lab, n = nd.label(fg)
    sl = nd.find_objects(lab)
    big = max(range(n), key=lambda i: (sl[i][1].start < 640) * (fg[sl[i]].sum()))
    ys, xs = sl[big]
    m = (lab == big + 1) & alpha
    w = 15
    h = int(round((ys.stop - ys.start) * w / (xs.stop - xs.start)))
    im = Image.fromarray(small(rgb, m, (ys.start, ys.stop, xs.start, xs.stop), (w, h), 20), 'RGBA')
    im.save(f'{PX}/fg/midway--cashbox.png')
    reg(man, 'fg/midway--cashbox', im, 'overlay', None, ' (props-cashbox-geigerbulb-v1.jpg #0)')
    print('cashbox', im.size)


def crowd(man):
    """Three foreground layers of crowd heads along the bottom edge (the plate's front row is open floor)."""
    a, rgb, alpha, fg = keyed('crowd-fg-v1.jpg')
    m = fg & alpha
    # a third bigger than the 320-wide fit (they're nearer the camera than anybody on the boards), centre 320 kept
    W = 320
    sc = 1 / 3
    X0 = int(round((1280 - W / sc) / 2))
    Y1 = 171 + int(round(66 / sc))  # 66 rows: heads and shoulders; the rest of them is below the bottom of the screen
    H = int(round((Y1 - 171) * sc))
    A = np.array(Image.fromarray((m[171:Y1, X0:X0 + int(W / sc)] * 255).astype(np.uint8)).resize((W, H), Image.BOX)) >= 128
    A = np.maximum.accumulate(A, axis=0)  # bodies carry on down off the bottom of the screen: solid below each head
    # flat night silhouettes (the sheet's dark purple keys too close to magenta to trust its colour), with the
    # sheet's neon rim redrawn: red light from the stage-left side, teal from the right
    full = np.zeros((H, W, 4), np.uint8)
    full[A] = (22, 14, 30, 255)
    edge = A & ~nd.binary_erosion(A, border_value=1)
    lit_l = edge & ~np.roll(A, 1, 1)
    lit_r = edge & ~np.roll(A, -1, 1) & ~lit_l
    top = edge & ~np.roll(A, 1, 0) & ~lit_l & ~lit_r
    full[lit_l] = (120, 30, 44, 255)
    full[lit_r] = (36, 92, 104, 255)
    full[top] = (64, 40, 72, 255)
    # one row; the Pavilion places it lower or higher (crowd_1..3: it presses in and rises with each step of the
    # crow-down), so the build has no seams
    im = Image.fromarray(full, 'RGBA')
    im.save(f'{PX}/fg/pavilion--crowd.png')
    reg(man, 'fg/pavilion--crowd', im, 'overlay', None, ' (crowd-fg-v1.jpg)')
    for i in (1, 2, 3):
        man['assets'].pop(f'fg/pavilion--crowd-{i}', None)
        if os.path.exists(f'{PX}/fg/pavilion--crowd-{i}.png'):
            os.remove(f'{PX}/fg/pavilion--crowd-{i}.png')
    print('crowd', full.shape)


def steam(man):
    """Red-lit steam and spatter over the oil, 4 loop frames, 88 x 40 (feet at the vat rim, x 10-98)."""
    W, H = 88, 40
    rng = np.random.default_rng(7)
    puffs = [(rng.uniform(6, W - 6), rng.uniform(0, 1), rng.uniform(4, 8)) for _ in range(9)]
    for f, tag in enumerate('abcd'):
        a = np.zeros((H, W, 4), float)
        yy, xx = np.mgrid[0:H, 0:W]
        for x, ph, r in puffs:
            t = (ph + f / 4) % 1
            cy = H - 4 - t * (H - 8)
            cx = x + np.sin((t + ph) * 6.3) * 3
            rr = r * (0.7 + t * 0.6)
            d = np.hypot(xx - cx, (yy - cy) * 1.2)
            al = np.clip(1 - d / rr, 0, 1) * (1 - t) * 0.55
            a[..., 3] = np.maximum(a[..., 3], al)
        heat = np.clip((yy - H * 0.55) / (H * 0.45), 0, 1)  # red glow low down, grey steam up top
        col = np.stack([150 + 100 * heat, 140 - 60 * heat, 150 - 90 * heat], -1)
        a[..., :3] = col
        al = a[..., 3]
        q = np.round(al * 4) / 4  # 4 alpha steps: pixel steam, not airbrush
        out = np.dstack([a[..., :3], q * 255]).astype(np.uint8)
        # spatter: a few bright oil droplets
        for _ in range(5):
            x, y = int(rng.uniform(4, W - 4)), int(rng.uniform(H - 12, H - 2))
            out[y, x] = (255, 200, 90, 255)
        im = Image.fromarray(out, 'RGBA')
        k = f'vat-steam-{tag}-h{H}'
        im.save(f'{PX}/sprite/{k}.png')
        reg(man, f'sprite/{k}', im, 'sprite', [W // 2, H], ' (procedural steam)')


def portrait(man):
    from PIL import ImageEnhance
    im = Image.open(D + 'gobbler-portrait-v2.jpg').convert('RGB')
    im = ImageEnhance.Contrast(im).enhance(1.15)
    c = im.crop((290, 0, 1010, 720)).resize((64, 64), Image.LANCZOS)
    c = c.quantize(colors=48, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    c.save(f'{PX}/portrait/gobbler.png')
    man['assets']['portrait/gobbler']['source'] = f'{SRCN} (gobbler-portrait-v2.jpg)'


def vendor_canvas(man):
    """Marge's frames share one canvas (cast rule: a frame swap never jumps), centred on her feet."""
    ks = [f'vendor-{n}-{f}-h80' for n in ('idle', 'talk') for f in ('l', 'r')]
    ims = {k: Image.open(f'{OUT}/{k}.png').convert('RGBA') for k in ks}
    W = max(i.width for i in ims.values()); H = max(i.height for i in ims.values())
    W += W % 2
    for k, im in ims.items():
        c = Image.new('RGBA', (W, H)); c.alpha_composite(im, ((W - im.width) // 2, H - im.height)); c.save(f'{OUT}/{k}.png')
        man['assets'][f'sprite/{k}'].update(size=[W, H], anchor=[W // 2, H])


def comic_cover(man):
    """Silver Age cover art (Arlong 2026-10-19: a 1950s-60s comic cover, not a newspaper). Splash 320 x 180 with the
    top band left dark for the CSS series banner; four 144 x 81 inset panels for the hero ending's beats."""
    def px(im, size, colors):
        return im.resize(size, Image.LANCZOS).quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    def save(img, key, note):
        img.save(f'{PX}/bg/{key}.png')
        img.resize((img.width * 4, img.height * 4), Image.NEAREST).save(os.path.join(ROOT, f'art/pixel-4x/bg/{key}.png'))
        reg(man, f'bg/{key}', img, 'ending', None, f' ({note})')
    save(px(Image.open(D + 'cover-splash-hero-v1.jpg').convert('RGB'), (320, 180), 64), 'cover-hero', 'cover-splash-hero-v1.jpg')
    sheet = Image.open(D + 'cover-panels-hero-v1.jpg').convert('RGB')
    cells = [(5, 5), (642, 5), (5, 362), (642, 362)]  # inner corners of the 2 x 2 grid (white gutters at 638-641, 358-361)
    crops = [(10, 50, 515, 335), (105, 50, 610, 335), (60, 50, 565, 335), (150, 0, 570, 237)]  # within each cell
    for i, ((cx, cy), (x0, y0, x1, y1)) in enumerate(zip(cells, crops), 1):
        save(px(sheet.crop((cx + x0, cy + y0, cx + x1, cy + y1)), (144, 81), 40), f'cover-hero-{i}', f'cover-panels-hero-v1.jpg #{i}')
    for k in ('bg/ending-news',):
        man['assets'].pop(k, None)
    for f in (f'{PX}/bg/ending-news.png', os.path.join(ROOT, 'art/pixel-4x/bg/ending-news.png')):
        if os.path.exists(f):
            os.remove(f)


def main():
    man_path = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_path))
    cut('vendor-sprites-v1.jpg', ['idle', 'talk'], 'vendor', [('-h80', 80)],
        lambda a, frs, HH: (HH - 1) / max(f[0].stop - f[0].start for f in frs), None, man)
    vendor_canvas(man)
    # glide: nose-to-toe (sheet width of the frame) = 0.95 x his standing height
    for tag, HH in [('-h84', 84)]:
        cut('rooster-glide-v2.jpg', ['glide', 'glide-egg'], 'rooster', [(tag, HH)],
            lambda a, frs, HH: 1.1 * HH / max(f[1].stop - f[1].start for f in frs), pupils, man)
    cage(man)
    cashbox(man)
    crowd(man)
    steam(man)
    portrait(man)
    comic_cover(man)  # (the newsprint page was dropped: Arlong wants a comic cover)
    with open(man_path, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False); f.write('\n')
    for k in ['vendor-idle-r-h80', 'rooster-glide-r-h84', 'rooster-glide-egg-r-h84']:
        print(k, man['assets'][f'sprite/{k}']['size'])


if __name__ == '__main__':
    main()
