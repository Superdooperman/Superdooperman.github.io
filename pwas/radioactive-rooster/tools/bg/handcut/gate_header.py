# Gate booth roof + window header (Arlong 2026-10-18): the guard's cap rose past the window's top frame, so the booth
# roof, the wall strip and the header beam over the window opening join gate--front (alpha cut, booth pixels only, sky
# dropped by colour). The opening itself (x~127-194 from y62 down to the sill) stays clear; the posts and sill were
# already in gate--front (tools/bg/handcut/gate_front.py). Idempotent: re-adds the same pixels from the live plate.
import numpy as np
from PIL import Image, ImageDraw
ROOT = '/workspace/rooster-dev/art/pixel'
plate = np.asarray(Image.open(f'{ROOT}/bg/gate.png').convert('RGBA'))
occ = np.asarray(Image.open(f'{ROOT}/fg/gate--front.png').convert('RGBA')).copy()
m = Image.new('L', (320, 180), 0)
d = ImageDraw.Draw(m)
d.polygon([(112, 28), (212, 28), (219, 52), (102, 52)], fill=255)  # the shingled roof and its eave
d.rectangle([108, 52, 214, 61], fill=255)                          # wall above the window + the header beam (lit edge y61)
sel = np.asarray(m) > 0
r, g, b = (plate[..., i].astype(int) for i in range(3))
sky = (b > r + 12) & (b > g + 6)  # the night sky between the string lights
sel &= ~sky
occ[sel] = plate[sel]
Image.fromarray(occ).save(f'{ROOT}/fg/gate--front.png')
print('header px', int(sel.sum()))
