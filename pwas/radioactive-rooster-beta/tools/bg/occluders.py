"""Foreground cutouts for walk-behind depth (Arlong, 2026-10-18).

Each occluder is a hand-traced polygon (logical 320x180 px) over a background plate. We rasterize it at 4x,
box-average to 320x180 coverage, cut hard at 0.5 (crisp pixels, no halo) and copy the plate's own pixels into a
full-frame RGBA PNG: art/pixel/fg/<plate>--<id>.png. The game draws it above any actor whose feet are behind
`base` (feet y < base), so the cutout is pixel-identical to the plate it sits on. Re-run after any plate edit:
    python3 tools/bg/occluders.py
The `base` values and ids are mirrored in data/script.js (room.occluders); test/depth.test.js checks both.
"""
import json, os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BG = os.path.join(ROOT, 'art/pixel/bg')
FG = os.path.join(ROOT, 'art/pixel/fg')

POST_FRONT = [(105, 129), (111.5, 129), (111.5, 170), (105, 170)]
PADLOCK = [(98.5, 130), (105, 130), (105, 144.5), (98.5, 144.5)]
OCC = {
    # plate: {id: (base_y, [polygons])}
    'pavilion': {
        'post-left': (170, [[(7.5, 126.5), (20.5, 126.5), (20.5, 171), (7.5, 171)]]),
        'post-front': (169, [POST_FRONT, PADLOCK]),
        'post-mid': (146, [[(145.5, 111), (151, 111), (151, 147), (145.5, 147)]]),
        'cart': (146, [[(254, 70), (262, 64), (276, 61), (296, 61), (312, 64), (320, 66), (320, 148), (298, 148),
                        (290, 148.5), (282, 146), (279, 138.5), (258, 138.5), (256, 115), (252.5, 114), (252.5, 107),
                        (256, 106), (256, 89), (253.5, 88), (253.5, 76)]]),
    },
    # midway booth: hand-cut (see HANDCUT; the counter window is open so the Jingle Kids show through)
    'hq': {
        'bucket': (173, [[(260, 141), (263, 136), (272, 134), (284, 134), (285, 127), (288.5, 127), (288.5, 134),
                          (296, 136), (299, 141), (296, 150), (293, 166), (290.5, 173), (280, 175.5), (270, 174.5),
                          (266, 170), (263, 150)]]),
    },
    'fence': {
        # Henny's checkpoint crate (he can slip behind it, between the crate and the fence)
        'crate': (117, [[(102, 106), (107, 103), (108, 98), (116, 98), (118, 103), (121.5, 104), (121.5, 117.5), (102, 117.5)]]),
        # last fence post: covers him as he walks up the Main Street road past the fence end
        'post-end': (102, [[(292, 87), (296, 87), (296, 102), (292, 102)]]),
    },
    'wkuk': {
        # DeeJay's booth (he sits behind it, feet y110): the wall under the window and the sill, the desk, the console,
        # the window mullion, and the hanging mic head (dark pixels only)
        'booth': (128, [[(120, 98), (268, 98), (268, 128), (120, 128)], [(130, 79), (262, 79), (262, 98.5), (130, 98.5)],
                        [(145, 62.5), (185, 62.5), (185, 79.5), (145, 79.5)], [(189.5, 18), (196.5, 18), (196.5, 98.5), (189.5, 98.5)],
                        {'box': (152, 48, 167, 64), 'dark': 70}]),
    },
    'store': {
        # Ned's counter (top y91, front down to the floor line) with the service bell and the bin at its right end;
        # Ned stands behind it (feet y122), Rooster's floor starts in front of it (y131)
        'counter': (128, [[(72, 90.5), (224, 90.5), (224, 129), (72, 129)], [(142, 85.5), (157, 85.5), (157, 91), (142, 91)],
                          [(203, 111), (217, 111), (217, 130.5), (203, 130.5)]]),
    },
}
OCC['pavilion-open'] = OCC['pavilion']  # same posts and cart; cut from the open plate's own pixels


# Hand-cut layers (alpha-traced, not polygons): kept as files in art/pixel/fg and only registered here.
# id -> (base, how it was made)
HANDCUT = {
    'pavilion--rope-front': (170, 'alpha trace of the rope swags, tools/bg/handcut/rope_layer.py'),
    'pavilion--rope-side': (146, 'alpha trace of the rope swags, tools/bg/handcut/rope_layer.py'),
    'pavilion--rope-back': (130, 'alpha trace of the rope swags and back posts, tools/bg/handcut/rope_layer.py'),
    'pavilion-open--rope-front': (172, 'alpha trace of the rope swags, tools/bg/handcut/rope_layer.py'),
    'pavilion-open--rope-side': (146, 'alpha trace of the rope swags, tools/bg/handcut/rope_layer.py'),
    'pavilion-open--rope-back': (130, 'alpha trace of the rope swags and back posts, tools/bg/handcut/rope_layer.py'),
    'midway--booth': (147, 'tools/bg/occluders.py booth polygon with the counter window x25-72 y59-99 cut open (tools/bg/handcut/README.md)'),
    'gate--front': (135, 'alpha cut, tools/bg/handcut/gate_front.py'),  # sill + booth front + window posts in front of the guard
}


def mask_for(polys, k=4, rgb=None):
    """Polygons, plus {'box': (x0, y0, x1, y1), 'dark': lum} entries that keep only the plate's dark pixels inside a box
    (thin dark props on a lit wall, e.g. a hanging mic head: a polygon would paste wall pixels over the actor)."""
    m = Image.new('L', (320 * k, 180 * k), 0)
    d = ImageDraw.Draw(m)
    for poly in polys:
        if isinstance(poly, dict):
            continue
        d.polygon([(x * k, y * k) for x, y in poly], fill=255)
    cov = np.asarray(m.resize((320, 180), Image.BOX), dtype=float) / 255
    out = cov >= 0.5
    for poly in polys:
        if isinstance(poly, dict):
            x0, y0, x1, y1 = poly['box']
            lum = rgb[..., :3].astype(float) @ [0.299, 0.587, 0.114]
            sel = np.zeros_like(out)
            sel[y0:y1, x0:x1] = lum[y0:y1, x0:x1] < poly['dark']
            out |= sel
    return out


def main():
    os.makedirs(FG, exist_ok=True)
    man_path = os.path.join(ROOT, 'art/manifest.json')
    man = json.load(open(man_path))
    out = {}
    for plate, occs in OCC.items():
        rgb = np.asarray(Image.open(os.path.join(BG, plate + '.png')).convert('RGB'))
        for oid, (base, polys) in occs.items():
            m = mask_for(polys, rgb=rgb)
            rgba = np.zeros((180, 320, 4), np.uint8)
            rgba[..., :3] = rgb
            rgba[..., 3] = np.where(m, 255, 0)
            rgba[~m, :3] = 0
            name = f'{plate}--{oid}'
            Image.fromarray(rgba, 'RGBA').save(os.path.join(FG, name + '.png'), optimize=True)
            man['assets'][f'fg/{name}'] = {'kind': 'fg', 'size': [320, 180], 'anchor': [0, 0], 'base': base,
                                           'source': 'tools/bg/occluders.py (cut from bg/' + plate + ')'}
            out[name] = (base, int(m.sum()))
    for name, (base, how) in HANDCUT.items():
        plate = name.split('--')[0]
        man['assets'][f'fg/{name}'] = {'kind': 'fg', 'size': [320, 180], 'anchor': [0, 0], 'base': base,
                                       'source': f'{how} (cut from bg/{plate})'}
    with open(man_path, 'w') as f:
        json.dump(man, f, indent=1, ensure_ascii=False)
        f.write('\n')
    for k, v in out.items():
        print(k, 'base', v[0], 'px', v[1])


if __name__ == '__main__':
    main()
