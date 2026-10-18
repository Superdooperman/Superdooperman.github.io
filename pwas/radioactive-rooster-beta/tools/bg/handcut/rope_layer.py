# Pavilion rope/post foreground layer (Arlong 2026-10-18): every rope swag is cut from the plate's own pixels
# (auto-traced: the rope's lit top strand + its dark underside, following a hand-placed guide curve), so any
# actor standing behind a rope gets overlapped by it. Split by depth because the engine sorts one base per layer:
#   rope-front : front swag post-left -> padlock (closed) / hanging rope + floor coil (open)   base 170
#   rope-side  : swag from the centre-left post back to post-mid                               base 146
#   rope-back  : back swag + back posts along the stage front (crowd side)                     base 130
# The posts themselves stay the existing alpha-cut occluders (post-left 170, post-front 169, post-mid 146).
import sys, numpy as np
from PIL import Image
D='/workspace/rooster-dev/art/'
def guide(pts,x):
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]; return np.interp(x,xs,ys)
def trace_cols(l,mask,pts,win=3,below=1,above=1,mode='bright'):
    # per column: the brightest (lit strand) or darkest (silhouette against the fire glow) pixel near the guide,
    # then a 5-column median so single noisy picks can't make ticks; the strand is drawn `above`/`below` px thick
    xs=list(range(int(pts[0][0]),int(pts[-1][0])+1)); found=[]
    for x in xs:
        g=int(round(guide(pts,x))); ys=range(g-win,g+win+1)
        found.append((max if mode=='bright' else min)(ys,key=lambda yy:l[yy,x]))
    f=np.array(found); sm=[int(np.median(f[max(0,i-2):i+3])) for i in range(len(f))]
    for x,y in zip(xs,sm): mask[y-above:y+below+1,x]=True
def fit_swag(l,mask,pts,win=3,thick=(1,1),deg=2):
    # a rope swag is a smooth sag: pick the lit strand per column, robust-fit a parabola (drop picks >1.5 px
    # off, refit), then cut a constant-thickness strand along the fitted curve. No jogs, no ticks.
    xs=np.arange(int(pts[0][0]),int(pts[-1][0])+1)
    ys=np.array([max(range(int(round(guide(pts,x)))-win,int(round(guide(pts,x)))+win+1),key=lambda yy:l[yy,x]) for x in xs],float)
    keep=np.ones(len(xs),bool)
    for _ in range(4):
        c=np.polyfit(xs[keep],ys[keep],deg); r=np.abs(np.polyval(c,xs)-ys); keep=r<=max(1.5,np.percentile(r,60))
    yc=np.polyval(c,xs)
    for x,y in zip(xs,yc):
        y=int(round(y)); mask[y-thick[0]:y+thick[1]+1,x]=True
    return c
def trace_rows(l,mask,pts,win=2,side=1):
    # steep runs: pts are (y,x) guide pairs
    for y in range(int(pts[0][0]),int(pts[-1][0])+1):
        g=int(round(guide(pts,y))); xs=range(g-win,g+win+1)
        x=max(xs,key=lambda xx:l[y,xx]); mask[y,x-side:x+side+1]=True
def rect(mask,x0,y0,x1,y1): mask[y0:y1,x0:x1]=True
def build(plate):
    p=np.asarray(Image.open(D+f'pixel/bg/{plate}.png').convert('RGBA')); l=p[...,:3].astype(int).mean(2)
    H,W=l.shape; layers={k:np.zeros((H,W),bool) for k in ('rope-front','rope-side','rope-back')}
    if plate=='pavilion':
        fit_swag(l,layers['rope-front'],[(18,137),(30,146),(45,151),(60,153),(75,151),(88,146),(98,140)],win=3,deg=3)
    else:
        trace_rows(l,layers['rope-front'],[(136,17),(150,19),(164,20)],win=2)
        cm=np.zeros((H,W),bool); cm[160:176,16:42]=True; layers['rope-front']|=cm&(l>42)
    trace_cols(l,layers['rope-side'],[(112,135),(120,137),(126,136),(131,135),(136,131),(140,128),(143,125),(145,123)],win=2)
    trace_rows(l,layers['rope-side'],[(112,148),(118,147),(123,145)],win=2)
    fit_swag(l,layers['rope-back'],[(101,91),(107,95),(113,99)],win=2,deg=1,thick=(0,1))
    fit_swag(l,layers['rope-back'],[(117,101),(125,105),(132,106),(140,103),(146,99)],win=2,thick=(0,1))
    fit_swag(l,layers['rope-back'],[(152,98),(160,101),(168,98)],win=2,thick=(0,1))
    for x0,y0,x1,y1 in ((113,98,116,125),(148,96,151,112),(169,93,172,104)):  # thin back posts on the stage-front line
        rect(layers['rope-back'],x0,y0,x1,y1)
    out={}
    for k,m in layers.items():
        o=np.zeros_like(p); o[m]=p[m]; out[k]=Image.fromarray(o)
        o_=out[k]; o_.save(f'{plate}--{k}.png'); print(plate,k,int(m.sum()))
    return out
for pl in ('pavilion','pavilion-open'): build(pl)
