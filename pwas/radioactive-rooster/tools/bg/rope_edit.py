# Step 1 of the Pavilion rope-open edit (run from a scratch dir): clone floor texture over the front rope of pavilion.jpg -> open_base.npy.
# Hand-tuned rope curve; no AI edits. Step 2 is rope_paint.py.
from PIL import Image
import numpy as np
from scipy import ndimage as nd
SRC='/workspace/github-pages-plans/rooster-scene-art-v2/pavilion.jpg'
orig=np.array(Image.open(SRC).convert('RGB')).astype(float)
H,W,_=orig.shape
co=np.array([-1.34431616e-06,-1.17550015e-03,8.38025137e-01,5.03383500e+02])
curve=lambda x: np.polyval(co,x)
X0,X1=67,416
band=np.zeros((H,W),bool)
for x in range(X0,X1+1):
    yc=curve(x); band[int(yc-9):int(yc+10),x]=True
band=nd.binary_dilation(band,iterations=1)
band[:, :X0]=False; band[:, X1+1:]=False
def solve(CH=8,OV=4):
    acc=np.zeros_like(orig); wsum=np.zeros((H,W))
    cands=[(dx,dy) for dy in list(range(-40,-15,1))+list(range(16,41,1)) for dx in range(-16,17,2)]
    for cx in range(X0-OV,X1+1,CH):
        c0,c1=max(X0,cx),min(X1+1,cx+CH+OV)
        sb=np.zeros((H,W),bool); sb[:,c0:c1]=band[:,c0:c1]
        rg=nd.binary_dilation(sb,iterations=3)&~band
        by,bx=np.nonzero(sb); ry,rx=np.nonzero(rg)
        best=None
        for dx,dy in cands:
            sy,sx=by+dy,bx+dx
            if sx.min()<0 or sx.max()>=W or sy.max()>=H: continue
            if band[sy,sx].any(): continue
            if ((sx>=28)&(sx<=67)).any() or ((sx>=415)&(sx<=452)).any(): continue
            src=orig[ry+dy,rx+dx]; tgt=orig[ry,rx]
            g=np.clip((tgt.mean(0)+1)/(src.mean(0)+1),0.75,1.35)
            e=((src*g-tgt)**2).sum()
            if best is None or e<best[0]: best=(e,dx,dy,g)
        _,dx,dy,g=best
        w=np.ones(len(bx))
        # feather weights across overlap
        w=np.minimum(1,np.minimum((bx-c0+1)/OV,(c1-bx)/OV)) if c1-c0>2*OV else w
        w=np.maximum(w,0.05)
        acc[by,bx]+=orig[by+dy,bx+dx]*g*w[:,None]; wsum[by,bx]+=w
    img=orig.copy(); m=band
    img[m]=acc[m]/wsum[m][:,None]
    return img
img=solve()
# membrane (seamless) correction: diffuse boundary mismatch into the band
ring=nd.binary_dilation(band)&~band
err=np.zeros_like(orig); err[ring]=orig[ring]-nd.uniform_filter(img,size=(1,1,1))[ring]
# boundary error measured as difference between orig ring and band-adjacent result -> use neighbor average approach
cor=np.zeros_like(orig)
fixed=~band
cor[fixed]=0
# Dirichlet: on ring, correction = orig - local mean of img in band nearby; approximate by 0 on ring and solve for smooth field matching edges
edge_in=band&nd.binary_dilation(~band)
target=np.zeros_like(orig)
nb=nd.uniform_filter(np.where(band[...,None],0,orig),size=(3,3,1))/np.maximum(nd.uniform_filter((~band).astype(float),size=3)[...,None],1e-6)
target[edge_in]=nb[edge_in]-img[edge_in]
for it in range(400):
    avg=(np.roll(cor,1,0)+np.roll(cor,-1,0)+np.roll(cor,1,1)+np.roll(cor,-1,1))/4
    cor=np.where(band[...,None],avg,0)
    cor[edge_in]=0.5*target[edge_in]+0.5*cor[edge_in]
img[band]+=cor[band]
np.save('open_base.npy',img)
out=np.clip(img,0,255).astype(np.uint8)
Image.fromarray(out).save('open_erased.png')
Image.fromarray(out).crop((0,470,480,700)).resize((1440,690),Image.NEAREST).save('erase-zoom.png')
