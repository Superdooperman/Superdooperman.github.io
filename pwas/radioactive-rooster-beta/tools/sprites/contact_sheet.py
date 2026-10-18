import json
from PIL import Image, ImageDraw
meta=json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__),'meta.json')))
S='/workspace/rooster-dev/art/pixel/sprite/'
Z=4; BG=(24,22,32,255)
rows={}
for k in meta:
    n=k.split('/')[1]; ch=n.split('-')[0]; half=n.endswith('-half')
    rows.setdefault((ch,half),[]).append(n)
order=[(c,h) for c in ['rooster','hattie','gizzard','henny'] for h in (False,True)]
W=max(sum(max(meta['sprite/'+n][0]*Z,150)+12 for n in rows[r]) for r in order)+16
Hs=[max(meta['sprite/'+n][1] for n in rows[r])*Z+26 for r in order]
im=Image.new('RGBA',(W,sum(Hs)+10),BG); d=ImageDraw.Draw(im); y=6
for r,h in zip(order,Hs):
    x=8
    for n in rows[r]:
        f=Image.open(S+n+'.png'); w,hh=f.size
        d.rectangle([x-1,y+h-22-hh*Z-1,x+w*Z,y+h-22],outline=(70,66,90))
        im.alpha_composite(f.resize((w*Z,hh*Z),Image.NEAREST),(x,y+h-22-hh*Z))
        d.text((x,y+h-18),f'{n} {w}x{hh}',fill=(200,200,210)); x+=max(w*Z,150)+12
    y+=h
im.save('/workspace/github-pages-plans/shots/rooster-sprites/frames-contact.png')
# lineup at relative scale (full set), 4x nearest, shared baseline
L=['rooster-front','hattie-front','gizzard-front','henny-side-r','rooster-side-r','hattie-side-r','gizzard-piano-r']
fs=[Image.open(S+n+'.png') for n in L]
W=sum(f.size[0]+6 for f in fs)+10; H=70
lu=Image.new('RGBA',(W,H),BG); x=6
for f in fs: lu.alpha_composite(f,(x,H-4-f.size[1])); x+=f.size[0]+6
ImageDraw.Draw(lu).line([0,H-4,W,H-4],fill=(90,80,70))
lu.resize((W*5,H*5),Image.NEAREST).save('/workspace/github-pages-plans/shots/rooster-sprites/cast-lineup.png')
