"""Oct 24 item 45: re-letter panel 1's caption on the hero ending cover, corn-dog cart -> getaway car (the cart stays
Marge's; the stogie guy drives Hattie off). Repaints the caption box interior and sets the three lines in Comic Neue
Bold, sized to the original lettering. Idempotent: always repaints the whole box. Run from the repo root."""
import random
from PIL import Image, ImageDraw, ImageFont

P = 'art/ending/cover-final-hero.webp'
BOX = (27, 498, 232, 545)  # caption box interior (inside its black border)
LINES = ["THE GETAWAY CAR'S", "TAILLIGHTS, HEADING FOR", "THE COUNTY LINE."]
FONT = '/usr/share/fonts/truetype/sand-box/google/Comic Neue/ComicNeue-Bold.ttf'
S = 4  # supersample

im = Image.open(P).convert('RGB')
x0, y0, x1, y1 = BOX
w, h = x1 - x0, y1 - y0
big = Image.new('RGB', (w * S, h * S))
rnd = random.Random(45)
px = big.load()
for y in range(h * S):  # the box's flat yellow with a little print grain
    for x in range(w * S):
        n = rnd.randint(-4, 4)
        px[x, y] = (254, 223 + n, 70 + 2 * n)
d = ImageDraw.Draw(big)
f = ImageFont.truetype(FONT, 15 * S)
for i, t in enumerate(LINES):
    d.text((7 * S, (3 + 15.5 * i) * S), t, font=f, fill=(20, 16, 12), stroke_width=2, stroke_fill=(20, 16, 12))
im.paste(big.resize((w, h), Image.LANCZOS), (x0, y0))
im.save(P, quality=92, method=6)
print('relettered', P)
