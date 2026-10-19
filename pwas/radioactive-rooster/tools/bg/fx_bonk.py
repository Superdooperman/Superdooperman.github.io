"""Painted-pixel "BONK!" pop for Mortgage hitting the barn post (fx/bonk), hand-set 5x7 letters in the same style as
the bell's DING! (tools/bg/store_bell.py). Idempotent: python3 tools/bg/fx_bonk.py"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
_s = open(os.path.join(os.path.dirname(__file__), 'store_bell.py')).read()
exec(_s[_s.index('GLYPHS = {'):_s.index('def ding')])
GLYPHS.update({
    'B': ["1111.", "1...1", "1...1", "1111.", "1...1", "1...1", "1111."],
    'O': [".111.", "1...1", "1...1", "1...1", "1...1", "1...1", ".111."],
    'K': ["1...1", "1..1.", "1.1..", "11...", "1.1..", "1..1.", "1...1"],
})
src = _s[_s.index('def ding'):_s.index('def main')].replace('def ding():\n    word = "DING!"', 'def word_img(word):')
exec(src)
img = word_img("BONK!")
img.save(os.path.join(ROOT, 'art/pixel/fx/bonk.png'), optimize=True)
p = os.path.join(ROOT, 'art/manifest.json'); man = json.load(open(p))
man['assets']['fx/bonk'] = {'kind': 'fx', 'size': list(img.size), 'anchor': [0, 0], 'source': 'tools/bg/fx_bonk.py (hand-set pixel letters)'}
with open(p, 'w') as f:
    json.dump(man, f, indent=1, ensure_ascii=False); f.write('\n')
print(img.size)
