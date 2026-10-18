# Step 2: paints the CLOSED (padlock + cart key ring) and OPEN (slack coiled rope, open padlock, no keys) Pavilion states
# into rooster-scene-art-v2/pavilion-rope-{closed,open}.png. Only the edited pixels differ from pavilion.jpg.
from PIL import Image
import numpy as np
from scipy import ndimage as nd
D='/workspace/github-pages-plans/rooster-scene-art-v2/'
orig=np.array(Image.open(D+'pavilion.jpg').convert('RGB')).astype(float)
openb=np.load('open_base.npy')
OUTL=np.array((8,6,6.)); DARK=np.array((35,22,12.)); MID=np.array((75,44,18.)); LIGHT=np.array((120,72,28.)); HI=np.array((150,105,70.))

def rope(img, pts, w=9.0, shade=1.0):
    pts=np.array(pts,float)
    # resample path at 0.5 px
    seg=np.diff(pts,axis=0); L=np.hypot(*seg.T); cum=np.r_[0,np.cumsum(L)]
    ss=np.arange(0,cum[-1],0.5)
    P=np.stack([np.interp(ss,cum,pts[:,0]),np.interp(ss,cum,pts[:,1])],1)
    T=np.gradient(P,axis=0); T/=np.linalg.norm(T,axis=1,keepdims=True)+1e-9
    N=np.stack([-T[:,1],T[:,0]],1)
    N[N[:,1]>0]*=-1  # normal points up (toward light)
    r=w/2
    x0,y0=np.floor(P.min(0)-r-1).astype(int); x1,y1=np.ceil(P.max(0)+r+1).astype(int)
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            d2=((P[:,0]-x)**2+(P[:,1]-y)**2); i=np.argmin(d2); d=np.sqrt(d2[i])
            if d>r: continue
            sd=np.dot(np.array([x,y])-P[i],N[i])  # + toward light
            if d>r-1.2: c=OUTL
            else:
                ph=(ss[i]*0.85+sd*1.1)%6.0
                if ph<1.0: c=DARK
                elif ph<3.6: c=LIGHT if sd>0.5 else MID
                else: c=MID if sd>-1 else DARK
                if sd>r-2.6 and ph>=1.0 and ph<3.0: c=HI
            img[y,x]=c*shade
    return img

def shadow(img, cx, cy, rx, ry, k=0.55):
    yy,xx=np.mgrid[0:img.shape[0],0:img.shape[1]]
    m=((xx-cx)/rx)**2+((yy-cy)/ry)**2<1
    img[m]*=k
    return img

BR_HI=np.array((240,212,122.)); BR_L=np.array((204,160,62.)); BR_M=np.array((150,108,38.)); BR_D=np.array((88,60,20.)); INK=np.array((18,12,6.))
STEEL=np.array((170,164,148.)); STEEL_HI=np.array((214,210,196.)); STEEL_D=np.array((92,86,76.))
def rect(img,x0,y0,x1,y1,c): img[y0:y1,x0:x1]=c
# Sized to read at 320x180 (body ~5x4 game px). Keep both states consistent.
def padlock(img, x, y, open_=False):
    bw,bh=20,16
    rect(img,x-2,y-2,x+bw+2,y+bh+2,INK)
    rect(img,x,y,x+bw,y+bh,BR_M); rect(img,x,y,x+bw,y+5,BR_L); rect(img,x,y,x+bw,y+2,BR_HI); rect(img,x,y+bh-4,x+bw,y+bh,BR_D); rect(img,x,y,x+3,y+bh,BR_L)
    rect(img,x+8,y+6,x+12,y+9,INK); rect(img,x+9,y+9,x+11,y+13,INK)  # keyhole
    lift=7 if open_ else 0
    lx,rx=x+3,x+bw-7; top=y-13-lift
    legs=[(lx,top,lx+4,y-lift if open_ else y),(rx,top,rx+4,y),(lx,top,rx+4,top+4)]
    for a,b,c,d in legs: rect(img,a-2,b-2,c+2,d+2 if d< y else d,INK)
    for a,b,c,d in legs: rect(img,a,b,c,d,STEEL); rect(img,a,b,a+1,d,STEEL_HI)
    rect(img,lx,top,rx+4,top+1,STEEL_HI)
    return img

def keyring(img, cx, cy):
    rect(img,cx-2,cy-10,cx+2,cy,INK); rect(img,cx-1,cy-10,cx+1,cy,STEEL_D)  # hook
    yy,xx=np.mgrid[-14:15,-14:15]; rr=np.hypot(xx,yy)
    ring=(rr<=10.5)&(rr>=7.5); edge=((rr<=12)&(rr>10.5))|((rr<7.5)&(rr>=6))
    sub=img[cy-14+9:cy+15+9, cx-14:cx+15]
    sub[edge]=INK; sub[ring]=STEEL; sub[ring&(yy<-3)]=STEEL_HI
    # three keys fanned from the bottom of the ring: round bow, shaft, teeth
    for kx,col,hi in [(-9,BR_L,BR_HI),(0,STEEL,STEEL_HI),(8,BR_L,BR_HI)]:
        x0=cx+kx; y0=cy+19
        bw=yy[0:9,0:9]; bx=xx[0:9,0:9]; br=np.hypot(bw-4,bx-4)
        bsub=img[y0-4:y0+5, x0-2:x0+7]
        bsub[(br<=4.6)]=INK; bsub[(br<=3.4)]=col; bsub[(br<=1.3)]=INK  # bow with a hole
        rect(img,x0,y0+4,x0+5,y0+22,INK); rect(img,x0+1,y0+4,x0+4,y0+21,col); rect(img,x0+1,y0+4,x0+2,y0+21,hi)
        rect(img,x0+4,y0+14,x0+8,y0+17,INK); rect(img,x0+4,y0+18,x0+8,y0+21,INK); rect(img,x0+4,y0+15,x0+7,y0+16,col); rect(img,x0+4,y0+19,x0+7,y0+20,col)
    return img

# CLOSED: original + padlock at the rope hook on the centre-left post + key ring on the cart
closed=orig.copy()
padlock(closed, 398, 552)
keyring(closed, 1232, 470)
# OPEN: rope erased, slack rope hanging from the left post's knot and coiled at its base, padlock hanging open, no key ring
op=openb.copy()
shadow(op, 112, 693, 40, 10)
hang=[(71,559),(75,575),(78,600),(80,628),(82,655),(86,676),(94,686)]
coil1=[(94,686)]+[(112+30*np.cos(t),690+8*np.sin(t)) for t in np.linspace(np.pi*0.95, np.pi*2.9, 40)]
coil2=[coil1[-1]]+[(114+22*np.cos(t),691+6*np.sin(t)) for t in np.linspace(np.pi*2.9, np.pi*4.6, 34)]
tail=[coil2[-1],(128,697),(146,700),(158,699)]
for path in (hang,coil1,coil2,tail): rope(op,path,w=9.0)
padlock(op, 398, 556, open_=True)
for name,img in (('pavilion-rope-closed.png',closed),('pavilion-rope-open.png',op)):
    Image.fromarray(np.clip(img,0,255).astype(np.uint8)).save(D+name)
o8=orig.astype(np.uint8)
for name in ('pavilion-rope-closed.png','pavilion-rope-open.png'):
    a=np.array(Image.open(D+name).convert('RGB'))
    diff=(a!=np.clip(orig,0,255).astype(np.uint8)).any(2); ys,xs=np.nonzero(diff)
    print(name,'changed px',diff.sum(),'bbox',xs.min(),ys.min(),xs.max(),ys.max())
