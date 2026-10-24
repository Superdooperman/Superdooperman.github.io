"""Rewrite the availability fields in art/manifest.json (2026-10-21): "pixel": false when art/pixel/<id>.png is
missing, "fancy": "<ext>" when art/fancy/<id>.<ext> exists. js/art.js resolves urls from these and never probes the
server, so run this after adding or removing art files:
    python3 tools/art_files.py
"""
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
mp = os.path.join(ROOT, 'art/manifest.json'); m = json.load(open(mp))
for i, a in m['assets'].items():
    a.pop('pixel', None); a.pop('fancy', None)
    if not os.path.exists(os.path.join(ROOT, f'art/pixel/{i}.png')): a['pixel'] = False
    for e in m['ext']:
        if os.path.exists(os.path.join(ROOT, f'art/fancy/{i}.{e}')): a['fancy'] = e; break
open(mp, 'w').write(json.dumps(m, indent=1, ensure_ascii=False) + '\n')
