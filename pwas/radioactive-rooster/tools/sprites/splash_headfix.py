import numpy as np
from PIL import Image
D='/workspace/github-pages-plans/rooster-scene-art-v2/'
src=np.array(Image.open(D+'rooster-yolk-lunge-sprites-v1.jpg').convert('RGB')).astype(int)
dst=np.array(Image.open(D+'cover-splash-showboat-v2.jpg').convert('RGB')).astype(int)
def fgmask(a):
    r,g,b=a[...,0],a[...,1],a[...,2]
    return ~((r>150)&(b>90)&(g<110)&(r-g>80))
x0,y0,x1,y1=262,42,430,232
head=src[y0:y1,x0:x1]; hm=fgmask(head)
gl=(head[...,1]>170)&(head[...,0]>120)&(head[...,2]<120); gl[:, :140]=False
hm[140:,150:]=False; hm&=~gl
S=0.97; ex,ey=352,157; tx,ty=667,280
H=np.array(Image.fromarray(head.astype(np.uint8)).resize((int((x1-x0)*S),int((y1-y0)*S)),Image.NEAREST)).astype(int)
M=np.array(Image.fromarray((hm*255).astype(np.uint8)).resize((H.shape[1],H.shape[0]),Image.NEAREST))>0
px=int(round(tx-(ex-x0)*S)); py=int(round(ty-(ey-y0)*S))
out=dst.copy()
# old open jaw / beak: fill from the burst lines a little to the right
yy,xx=np.mgrid[0:720,0:1280]
jaw=(xx>=680)&(xx<760)&(yy>=255)&(yy<345)
dark_arm=(dst.sum(-1)<120)&(yy>330)
fillm=jaw&~dark_arm

h,w=M.shape
reg=out[py:py+h,px:px+w]; arm=(dst[py:py+h,px:px+w].sum(-1)<120)&(np.arange(h)[:,None]+py>330)
m=M&~arm
reg[m]=H[m]
import cv2
full=np.zeros((720,1280),bool); full[py:py+h,px:px+w]=m
mx=dst.max(-1); mn=dst.min(-1); sat=(mx-mn)/(mx+1)
oldhead=(sat>0.3)&(mx<200)&(dst[...,0]>dst[...,2]+40)&(xx>=640)&(xx<775)&(yy>=180)&(yy<350)&~dark_arm
hole=((fillm|oldhead)&~full).astype(np.uint8)*255
hole=cv2.dilate(hole,np.ones((5,5),np.uint8))
hole[full]=0
o8=cv2.inpaint(out.astype(np.uint8)[...,::-1].copy(),hole,9,cv2.INPAINT_TELEA)[...,::-1]
out=o8.astype(int)
Image.fromarray(out.astype(np.uint8)).save(D+'cover-splash-showboat-v2-headfix.png')
Image.fromarray(out.astype(np.uint8)).crop((540,160,820,420)).resize((560,520),Image.NEAREST).save('/tmp/sp5.png')
Image.fromarray(out.astype(np.uint8)).resize((320,180),Image.LANCZOS).resize((960,540),Image.NEAREST).save('/tmp/sp5s.png')
