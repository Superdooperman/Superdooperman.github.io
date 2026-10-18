# Cuts Arlong-approved cast sheets (magenta JPEG) into feet-anchored pixel sprites in art/pixel/sprite/.
# Run: python3 tools/sprites/cut_cast.py  (needs numpy, scipy, Pillow). Writes tools/sprites/meta.json.
import json, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
D='/workspace/github-pages-plans/rooster-scene-art-v2/'
INK=(22,14,26)
OUT='/workspace/rooster-dev/art/pixel/sprite'

def load(src):
    a=np.array(Image.open(D+src).convert('RGB')).astype(float)
    R,G,B=a[...,0],a[...,1],a[...,2]
    mag=np.minimum(R,B)-G
    fg=~((mag>45)&(B>70))
    fg=nd.binary_opening(fg,iterations=1)
    clean=fg&~((mag>12)&(B>G+25))
    _,(iy,ix)=nd.distance_transform_edt(~clean,return_indices=True)
    rgb=np.where(clean[...,None],a,a[iy,ix])
    alpha=nd.binary_erosion(fg,iterations=1)
    lab,n=nd.label(fg)
    return a,rgb,alpha,lab,n,fg

def pupils(a):
    lum=a.mean(2); white=(lum>170)&(np.ptp(a,2)<50)
    dl,_=nd.label(lum<75); pm=np.zeros(lum.shape,bool)
    for i,sl in enumerate(nd.find_objects(dl)):
        y0,y1=max(0,sl[0].start-6),sl[0].stop+6; x0,x1=max(0,sl[1].start-6),sl[1].stop+6
        comp=dl[y0:y1,x0:x1]==i+1; area=comp.sum()
        if not (15<=area<=500) or y0>230: continue
        ring=nd.binary_dilation(comp,iterations=4)&~comp
        if white[y0:y1,x0:x1][ring].mean()>0.5: pm[y0:y1,x0:x1]|=comp
    return pm

MOON=np.array((172,170,214),float)
def rimlight(img, frac=0.55, amt=0.4):
    # Subtle moonlight hair/rim light from the upper left: lighten the first pixel inside the dark outline
    # where the edge faces up or up-left, on the upper part of the figure only. Applied after mirroring.
    a=np.array(img).astype(float); al=a[...,3]>0
    out=~al
    ring=al&(nd.binary_dilation(out)|np.pad(np.zeros((a.shape[0]-2,a.shape[1]-2),bool),1,constant_values=True))
    inside=al&~ring
    edge=out|ring
    up=np.zeros_like(al); up[1:]=edge[:-1]; up[0]=True
    ul=np.zeros_like(al); ul[1:,1:]=edge[:-1,:-1]; ul[0]=True; ul[:,0]=True
    lf=np.zeros_like(al); lf[:,1:]=edge[:,:-1]; lf[:,0]=True
    ys=np.nonzero(al.any(1))[0]; top,bot=ys.min(),ys.max()
    rows=np.zeros_like(al); rows[top:int(top+(bot-top)*frac)+1]=True
    rt=np.zeros_like(al); rt[:,:-1]=edge[:,1:]; rt[:,-1]=True
    lit=inside&rows&(up|(ul&lf))&~(rt&~lf)  # skip right-facing edges: light is upper-left only
    lit&=a[...,:3].mean(2)<170  # leave whites/highlights alone
    a[lit,:3]=a[lit,:3]*(1-amt)+MOON*amt
    return Image.fromarray(a.astype(np.uint8),'RGBA')

def frames_from(lab,n,fg,xr,yr,minsz=3000):
    sz=nd.sum(fg,lab,range(1,n+1)); ob=nd.find_objects(lab)
    big=[(ob[i],i+1) for i in range(n) if sz[i]>minsz and ob[i][0].start>=yr[0] and ob[i][0].stop<=yr[1] and ob[i][1].start>=xr[0] and ob[i][1].stop<=xr[1]]
    big.sort(key=lambda c:c[0][1].start)
    out=[]
    for s,l in big:
        ids={l}
        for i in range(n):  # attach small bits (smoke, claws) near this frame
            if i+1==l or sz[i]<20 or sz[i]>minsz: continue
            o=ob[i]; cy=(o[0].start+o[0].stop)/2; cx=(o[1].start+o[1].stop)/2
            if s[0].start-40<=cy<=s[0].stop and s[1].start-25<=cx<=s[1].stop+25: ids.add(i+1)
        m=np.isin(lab,list(ids))
        ys,xs=np.nonzero(m)
        out.append((slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1),m))
    return out

def render(rgb,alpha,pm,fr,scale,band,cellw,H):
    ys,xs,m0=fr
    m=(m0[ys,xs]&alpha[ys,xs]).astype(float); c=rgb[ys,xs]; h,w=m.shape
    b=m[int(h*band[0]):int(h*band[1])]; cx=(b.sum(0)*np.arange(w)).sum()/b.sum()
    HW,HH=int(round(cellw/scale)),int(round((H-1)/scale))
    ox=int(round(HW/2-cx)); oy=HH-h
    assert ox>=0 and ox+w<=HW,(ox,w,HW)
    can=np.zeros((HH,HW,3)); al=np.zeros((HH,HW)); pc=np.zeros((HH,HW))
    can[oy:oy+h,ox:ox+w]=c*m[...,None]; al[oy:oy+h,ox:ox+w]=m
    if pm is not None: pc[oy:oy+h,ox:ox+w]=pm[ys,xs]*m
    cell=(cellw,H-1)
    im=np.array(Image.fromarray(np.clip(can,0,255).astype(np.uint8)).resize(cell,Image.LANCZOS)).astype(float)
    A=np.array(Image.fromarray((al*255).astype(np.uint8)).resize(cell,Image.BOX)).astype(float)/255
    P=np.array(Image.fromarray((pc*255).astype(np.uint8)).resize(cell,Image.BOX)).astype(float)/255
    col=np.where(A[...,None]>0,im/np.maximum(A[...,None],1e-6),0)
    pad=lambda x:np.concatenate([np.zeros((1,)+x.shape[1:]),x],0)  # 1px top row for outline
    return pad(np.clip(col,0,255)),pad(A),pad(P)

def need_w(fr,scale,band):
    ys,xs,m0=fr; m=m0[ys,xs].astype(float); h,w=m.shape
    b=m[int(h*band[0]):int(h*band[1])]; cx=(b.sum(0)*np.arange(w)).sum()/b.sum()
    return 2*max(cx,w-cx)*scale+4

def finish(col,A,P,ncolors,pal_img=None,rim=INK):
    al=A>=0.5
    q=Image.fromarray(col.astype(np.uint8)).quantize(colors=ncolors,method=Image.MEDIANCUT,dither=Image.NONE) if pal_img is None else Image.fromarray(col.astype(np.uint8)).quantize(palette=pal_img,dither=Image.NONE)
    col=np.array(q.convert('RGB')).copy()
    pm=(P>0.12)&al; wh=(col.mean(2)>170)&al
    for (y,x) in np.argwhere(pm):
        nb=[(y+dy,x+dx) for dy in(-1,0,1) for dx in(-1,0,1) if (dy or dx) and 0<=y+dy<col.shape[0] and 0<=x+dx<col.shape[1]]
        if any(not al[p] for p in nb):
            ys_,xs_=np.nonzero(wh[max(0,y-3):y+4,max(0,x-3):x+4])
            if len(ys_):
                cy=ys_.mean()+max(0,y-3); cx=xs_.mean()+max(0,x-3)
                y2=y+int(np.sign(round(cy-y))); x2=x+int(np.sign(round(cx-x)))
                if wh[y2,x2]: col[y2,x2]=INK
    col[pm]=INK
    ring=nd.binary_dilation(al)&~al
    col[ring]=rim; al=al|ring
    rgba=np.dstack([col,al*255]).astype(np.uint8); rgba[~al]=0
    return rgba

CHARS=[
 # name, src, x-range, y-range, frame names, face (r/l/None per frame), groups, H full, band, eyes
 ('rooster','rooster-sprites-approved.jpg',(0,1806),(0,590),['front','side','walk','back'],[None,'r','r',None],[[0,1,2,3]],64,(.62,.72),True),
 ('hattie','hattie-sprites-v1.jpg',(0,1280),(0,400),['front','side','walk','back'],[None,'r','r',None],[[0,1,2,3]],60,(.55,.70),False),
 ('gizzard','gizzard-sprites-v2.jpg',(0,1280),(0,400),['front','side','walk','piano'],[None,'r','r','r'],[[0,1,2],[3]],56,(.62,.72),False),
 ('henny','henny-sprites-v1.jpg',(640,1280),(0,400),['side','peck','front','tilt'],['l','r',None,'r'],[[0,1,2,3]],17,(0,1),False),
]
meta={}
# Per-room scene heights (logical px, incl. comb/outline), measured against the backgrounds; see ART-SPEC.
# Rooster also gets depth buckets every 4 px (28-120; 28-56 for the far Fence crossroads) for per-room depth scaling (js/walk.js depthHeight).
ROOM_HEIGHTS={'rooster':sorted(set([96,104]+list(range(28,124,4)))),'hattie':[52],'henny':[26]}
os.makedirs(OUT,exist_ok=True)
for name,src,xr,yr,names,face,groups,H,band,eyes in CHARS:
    a,rgb,alpha,lab,n,fg=load(src)
    frs=frames_from(lab,n,fg,xr,yr)
    assert len(frs)==4,(name,len(frs))
    pm=pupils(a) if eyes else None
    hmax=max(f[0].stop-f[0].start for i,f in enumerate(frs) if names[i]!='piano')
    for tag,HH in [('',H),('-half',(H+1)//2)]+[(f'-h{x}',x) for x in ROOM_HEIGHTS.get(name,[])]:
        scale=(HH-1)/hmax
        cw={}
        for g in groups:
            w=int(np.ceil(max(need_w(frs[i],scale,band) for i in g)/2)*2)
            for i in g: cw[i]=w
        rend=[render(rgb,alpha,pm,frs[i],scale,band,cw[i],HH) for i in range(4)]
        # shared palette per character+size
        strip=np.concatenate([np.pad(r[0],((0,HH-r[0].shape[0]),(0,0),(0,0))) for r in rend],1).astype(np.uint8)
        pal=Image.fromarray(strip).quantize(colors=40 if HH>=90 else 32 if HH>=40 else 24,method=Image.MEDIANCUT,dither=Image.NONE)
        for i,(col,A,P) in enumerate(rend):
            rgba=finish(col,A,P,0,pal)
            base=f'{name}-{names[i]}'
            # right-facing canonical; mirror for left
            img=Image.fromarray(rgba,'RGBA')
            if face[i] is None:
                outs={base:img}
            else:
                r_img=img if face[i]=='r' else img.transpose(Image.FLIP_LEFT_RIGHT)
                outs={base+'-r':r_img, base+'-l':r_img.transpose(Image.FLIP_LEFT_RIGHT)}
            for k,im in outs.items():
                im=rimlight(im)
                im.save(f'{OUT}/{k}{tag}.png')
                meta[f'sprite/{k}{tag}']=list(im.size)
json.dump(meta,open(os.path.join(os.path.dirname(__file__),'meta.json'),'w'),indent=1)
for k,v in meta.items(): print(k,v)
