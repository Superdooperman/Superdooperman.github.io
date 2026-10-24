import numpy as np
from PIL import Image
D='/workspace/github-pages-plans/rooster-scene-art-v2/'
src=np.array(Image.open(D+'rooster-yolk-lunge-sprites-v1.jpg').convert('RGB')).astype(int)
dst=np.array(Image.open(D+'rooster-lunge-sprite-v2.jpg').convert('RGB')).astype(int)
def fgmask(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    return ~((r>150)&(b>90)&(g<110)&(r-g>80))
x0,y0,x1,y1=262,42,430,232
head=src[y0:y1,x0:x1]; hm=fgmask(head)
# drop the egg glow at the bottom right of the crop
hm[140:, 150:]=False; gl=(head[...,1]>170)&(head[...,0]>120)&(head[...,2]<120); gl[:, :140]=False; hm &= ~gl
S=1.25; ex,ey=352,157; tx,ty=750,162
H=Image.fromarray(head.astype(np.uint8)).resize((int((x1-x0)*S),int((y1-y0)*S)),Image.NEAREST)
M=Image.fromarray((hm*255).astype(np.uint8)).resize(H.size,Image.NEAREST)
px=int(round(tx-(ex-x0)*S)); py=int(round(ty-(ey-y0)*S))
out=dst.copy()
mag=np.array([226,26,140])
# clear the old open-beaked head: the region of the old head above the shoulder line
yy,xx=np.mgrid[0:720,0:1280]
old=(yy<py+H.size[1]-30)&(xx>=px-10)&(xx<px+H.size[0]+20)&(yy>=py-10)
# keep the egg + its glow and the body: only clear red/yellow/green/white/dark head colours above y 250 and right of x 690
clear=old&(xx>690)&(yy<240)&fgmask(dst)&~((xx>790)&(yy>222))
out[clear]=mag
red=(dst[...,0]>140)&(dst[...,1]<90)&(dst[...,2]<90)
rr=(xx>690)&(xx<790)&(yy>=240)&(yy<285)&red
nb=out[250:285,700:780].reshape(-1,3); gr=nb[(nb[:,1]>120)&(nb[:,0]<120)]
out[rr]=np.median(gr,0) if len(gr) else mag
Ha=np.array(H); Ma=np.array(M)>0
h,w=Ma.shape
reg=out[py:py+h,px:px+w]; reg[Ma]=Ha[Ma]
Image.fromarray(out.astype(np.uint8)).save(D+'rooster-lunge-sprite-v2-headfix.png')
Image.fromarray(out.astype(np.uint8)).crop((560,0,900,360)).resize((680,720),Image.NEAREST).save('/tmp/hf4.png')
print(px,py,H.size)
