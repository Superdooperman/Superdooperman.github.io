# Hand-edit expressions onto Arlong's 2007 Rooster painting (crop is 1200x1200, flipped).
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance
import numpy as np
D='/workspace/github-pages-plans/rooster-scene-art-v2/'
base=Image.open(D+'rooster-portrait-v2-crop.png').convert('RGB')

def soft(img, draw_fn, blur=6, alpha=1.0):
    layer=Image.new('RGBA',img.size,(0,0,0,0)); draw_fn(ImageDraw.Draw(layer))
    layer=layer.filter(ImageFilter.GaussianBlur(blur))
    if alpha<1:
        a=np.array(layer); a[...,3]=(a[...,3]*alpha).astype('uint8'); layer=Image.fromarray(a)
    return Image.alpha_composite(img.convert('RGBA'),layer).convert('RGB')

def move_pupil(img, to):
    a=np.array(img)
    white=tuple(int(v) for v in np.median(a[555:600,300:330].reshape(-1,3),axis=0))
    img=soft(img, lambda d: d.ellipse((240,550,305,615),fill=white+(255,)), blur=5)
    x,y=to
    img=soft(img, lambda d: d.ellipse((x-19,y-19,x+19,y+19),fill=(15,15,20,255)), blur=1.2)
    img=soft(img, lambda d: d.ellipse((x-9,y-12,x-2,y-5),fill=(235,235,235,255)), blur=1)
    return img

def blush(img, strength):
    return soft(img, lambda d: [d.ellipse((560,720,720,820),fill=(220,40,40,255)),
                                d.ellipse((590,850,700,910),fill=(220,40,40,255))], blur=22, alpha=strength)

def sweat(img):
    img=soft(img, lambda d: d.polygon([(735,830),(718,872),(752,872)],fill=(200,225,240,255)), blur=1.5)
    img=soft(img, lambda d: d.ellipse((716,856,754,892),fill=(200,225,240,255)), blur=1.5)
    return soft(img, lambda d: d.ellipse((725,862,735,874),fill=(255,255,255,255)), blur=1)

def open_mouth(img):
    img=soft(img, lambda d: d.ellipse((555,770,700,905),fill=(45,12,14,255)), blur=3)
    img=soft(img, lambda d: d.ellipse((585,850,680,905),fill=(170,60,70,255)), blur=4)
    img=soft(img, lambda d: d.chord((565,770,690,830),0,180,fill=(240,235,225,255)), blur=1.5)
    return img

out={
 'smitten': blush(move_pupil(base,(335,470)),0.55),
 'embarrassed': sweat(blush(move_pupil(base,(285,690)),0.8)),
 'crow': open_mouth(move_pupil(base,(380,440))),
 'talk': base,
}
for k,im in out.items():
    im.save(D+f'rooster-portrait-{k}-hires.png')
    s=ImageEnhance.Sharpness(ImageEnhance.Contrast(im.resize((64,64),Image.LANCZOS)).enhance(1.12)).enhance(1.6)
    s.quantize(colors=48,method=Image.MEDIANCUT,dither=Image.NONE).convert('RGB').save(f'/tmp/rp-{k}.png')
# contact sheet: hires row + 4x pixel row
sheet=Image.new('RGB',(4*300,600),(20,20,20))
for i,k in enumerate(['talk','smitten','embarrassed','crow']):
    sheet.paste(out[k].resize((300,300)),(i*300,0))
    sheet.paste(Image.open(f'/tmp/rp-{k}.png').resize((256,256),Image.NEAREST),(i*300+22,322))
sheet.save('/workspace/github-pages-plans/shots/rooster-sprites/portrait-expressions-v1.png')
