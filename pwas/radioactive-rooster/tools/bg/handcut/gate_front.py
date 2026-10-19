# Gate occluders v2 (Arlong 2026-10-18): only solid scenery in front of the guard, alpha-cut, no background boxes.
#   gate--front : sill + booth front (y101-136, x108-214) and the two window-frame posts (x108-125, x199-214)
#   gate--fan   : the desk fan, alpha-cut by colour (grey metal vs the warm booth interior)
# The ticket roll is dropped: it sits behind his resting arm, so the guard simply draws over it.
import numpy as np
from PIL import Image
from scipy import ndimage as nd
P='/workspace/rooster-dev/art/staged/pixel/bg/gate.png'
p=np.asarray(Image.open(P).convert('RGBA')).copy(); rgb=p[...,:3].astype(int)
H,W=p.shape[:2]
front=np.zeros((H,W),bool); front[101:137,108:215]=True; front[56:101,108:125]=True; front[56:101,200:215]=True
# the sill's top edge is ragged: start each column at its first sill-lit row (the 'o/+' band from y101-104)
for x in range(108,215):
    col=rgb[96:106,x].mean(1)
    lit=np.nonzero(col>=45)[0]
    top=96+lit[0] if len(lit) and x in range(125,200) else 101
    front[:,x]&=~(np.arange(H)<max(top,99)) | (np.arange(H)<101)&front[:,x]&((x<125)|(x>=200))
out=np.zeros_like(p); out[front]=p[front]; Image.fromarray(out).save('gate/occ/gate--front.png')
# fan
box=np.zeros((H,W),bool); box[62:104,168:200]=True
mx,mn=rgb.max(2),rgb.min(2); sat=(mx-mn)/np.maximum(mx,1)
fan=box&(sat<0.32)&(mx>38)
fan=nd.binary_closing(fan,iterations=2); fan=nd.binary_fill_holes(fan)
lab,n=nd.label(fan); sizes=nd.sum(fan,lab,range(1,n+1)); fan=lab==(1+int(np.argmax(sizes)))
fan&=box&~front
out=np.zeros_like(p); out[fan]=p[fan]; Image.fromarray(out).save('gate/occ/gate--fan.png')
print('front px',front.sum(),'fan px',fan.sum(), 'fan bbox', np.nonzero(fan.any(0))[0][[0,-1]], np.nonzero(fan.any(1))[0][[0,-1]])
