"""Lou's BASE geometry from Derek's current Lou PSD (Lou2.psd, 2026-11-22: joint/trunk edit of LouNew).

    python3 tools/wrestler-cutter/prepare-lou-base.py

Writes ONLY measured base data (ART_REVISION.md):
  src/assets/wrestlers/thesz-procreate-v1/{torso,upper_arm,forearm,thigh,shin,far_thigh,far_shin}.png
  src/characters/generated/thesz_procreate_v1.base.js
Everything authored (head + expressions, variants, backSell, anchors, idle, kit) lives in
src/characters/thesz_procreate_v1.js and is never touched here. Re-fit variants afterwards with
tools/art/rebase_variants.py. Draw order (shin/thigh, far leg/torso, forearm/upper arm) is read from
the PSD layer order in LAYER_INVENTORY.md, so re-stacking layers in the PSD carries through.
Source PSD/full-canvas exports unchanged."""
from pathlib import Path
from PIL import Image
import numpy as np
import math,json
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'Sprite sheets/RosterNew/2026-11-22/Lou2/extracted-v1/cleaned-v1/layers-full-canvas'
OUT=ROOT/'src/assets/wrestlers/thesz-procreate-v1';OUT.mkdir(parents=True,exist_ok=True)
PREFIX='thesz_pv1_'
EVIDENCE=SOURCE.parent/'comparison-v1';EVIDENCE.mkdir(exist_ok=True)
images={p.name.split('-',1)[1][:-4]:Image.open(p).convert('RGBA') for p in SOURCE.glob('*.png')}
# Derek 2026-11-22: thighs stack over shins, and each thigh's bottom ink rim read as a hard line across the calf.
# Repaint only the BOTTOM rim, only where it lies inside the shin's silhouette (7px inset, so the outer leg contour
# stays), in the skin just above it in the same column. Side lines of the thigh tab are kept.
from scipy import ndimage
def soften_bottom_rim(thigh,shin,depth=18,inset=7):
 a=np.array(thigh);al=a[...,3];lum=a[...,:3].astype(int).mean(-1)
 inside=ndimage.binary_erosion(np.array(shin.getchannel('A'))>128,iterations=inset)
 for x in np.where((al>15).any(0))[0]:
  ys=np.where(al[:,x]>15)[0];bot=ys.max()
  if not inside[bot,x]:continue
  skin=[y for y in range(bot-depth,ys.min(),-1) if lum[y,x]>=150 and al[y,x]>=200]
  if not skin:continue
  c=a[skin[0],x,:3];cl=c.astype(int).mean()
  for y in range(skin[0]+1,bot+1):
   if inside[y,x] and lum[y,x]<cl-20:a[y,x,:3]=c
 return Image.fromarray(a)
# PSD stacking, bottom to top, from the export inventory's ID column (ID = PSD layer index).
import re
ORDER={m.group(2):int(m.group(1)) for m in re.finditer(r'^\| (\d+) \| [^|]+ \| (\w+) \| True',(SOURCE.parents[1]/'LAYER_INVENTORY.md').read_text(),re.M)}
above=lambda a,b:ORDER[a]>ORDER[b]
SHIN_UNDER_THIGH=above('right_thigh','right_shin')
# The rim repaint only matters when the thigh's bottom edge draws over the calf.
if SHIN_UNDER_THIGH:
 for t,sh in [('right_thigh','right_shin'),('left_thigh','left_shin')]:images[t]=soften_bottom_rim(images[t],images[sh])
def overlap(a,b):
 y,x=np.where((np.array(images[a].getchannel('A'))>=128)&(np.array(images[b].getchannel('A'))>=128));return [float(x.mean()),float(y.mean())]
neck=overlap('head','torso');elbow=overlap('right_upper_arm','right_forearm_hand');hip=overlap('right_thigh','torso');farhip=overlap('left_thigh','torso');knee=overlap('right_thigh','right_shin');farknee=overlap('left_thigh','left_shin')
# Shoulder joints lie in the deltoid cap, not the centroid of the long torso overlap.
# Ankle is the anatomical heel/ankle region, not the cuff or projected toe mass.
# These visible-landmark placements are initial measurement judgments for tuner review.
shoulder=[1945.,423.];farshoulder=[2130.,427.];wrist=[1919.,909.];ankle=[1945.,1470.];sole=[1980.,1558.]
# Back leg (left_*): right_thigh paints on top of left_thigh in the PSD composite, so right is the front/near leg
# and left the back/far leg. Derek edited the back legs, so they are used (farThigh/farShin). MANUAL landmarks.
farankle=[2128.,1417.];farsole=[2165.,1505.]
anchors=dict(neck=neck,nearShoulder=shoulder,farShoulder=farshoulder,elbow=elbow,wrist=wrist,nearHip=hip,farHip=farhip,knee=knee,ankle=ankle,sole=sole,farKnee=farknee,farAnkle=farankle,farSole=farsole)
k=.16;parts={};records={}
def prepare(name,source,prox=None,dist=None):
 im=images[source];bbox=im.getchannel('A').getbbox();box=(bbox[0]-12,bbox[1]-12,bbox[2]+12,bbox[3]+12);im=im.crop(box)
 local=lambda p:[p[0]-box[0],p[1]-box[1]]
 angle=0;offset=[0,0]
 if prox is not None and dist is not None:
  p=local(prox);q=local(dist);angle=math.atan2(q[0]-p[0],q[1]-p[1]);c,s=math.cos(angle),math.sin(angle)
  corners=[(c*x-s*y,s*x+c*y) for x,y in [(0,0),(im.width,0),(0,im.height),(im.width,im.height)]]
  lo=[math.floor(min(t[i] for t in corners))-8 for i in [0,1]];hi=[math.ceil(max(t[i] for t in corners))+8 for i in [0,1]]
  im=im.transform((hi[0]-lo[0],hi[1]-lo[1]),Image.Transform.AFFINE,(c,s,c*lo[0]+s*lo[1],-s,c,-s*lo[0]+c*lo[1]),Image.Resampling.BICUBIC)
  def transport(v):
   x,y=local(v);return [c*x-s*y-lo[0],s*x+c*y-lo[1]]
 else:
  transport=local
 if prox is not None:
  px=transport(prox)[0];half=math.ceil(max(px,im.width-px));shift=half-px
  # Integer canvas shift preserves decoded pixels; half-pixel residual is
  # represented by the explicit two-anchor binding, not a pose-only offset.
  left=round(shift);expanded=Image.new('RGBA',(2*half,im.height));expanded.paste(im,(left,0));im=expanded
  before=transport
  transport=lambda v,fn=before,dx=left:[fn(v)[0]+dx,fn(v)[1]]
 im.save((EVIDENCE if name=='head' else OUT)/f'{name}.png');w,h=im.size  # Lou keeps the Procreate head (expressions are drawn on its canvas)
 rec=dict(source=source,source_crop=list(box),rotation_degrees=math.degrees(angle),canvas=[w,h])
 entry={'key':PREFIX+name}
 if prox is not None:
  p=transport(prox);q=transport(dist);j=p[1]/h;scale=math.dist(prox,dist)*k/math.dist(p,q)
  entry.update(box={'w':w*scale*(1-j),'h':h*scale*(1-j)},jointPivotFrac=j,pivotOffsetFrac=p[0]/w-.5,distalAnchorFrac={'u':q[0]/w,'v':q[1]/h})
  entry['binding']={'proximal':{'u':p[0]/w,'v':p[1]/h},'distal':{'u':q[0]/w,'v':q[1]/h}}
  rec.update(proximal=p,distal=q,bone_length=math.dist(prox,dist)*k)
  if name.endswith('shin'):
   t=transport(farsole if name=='far_shin' else sole);entry['soleAnchorFrac']={'u':t[0]/w,'v':t[1]/h};rec['sole']=t
 else:entry['box']={'w':w*k,'h':h*k}
 parts[name]=entry;records[name]=rec
 return transport,im.size
th,headsize=prepare('head','head');tt,ts=prepare('torso','torso');prepare('upper_arm','right_upper_arm',shoulder,elbow);prepare('forearm','right_forearm_hand',elbow,wrist);prepare('thigh','right_thigh',hip,knee);prepare('shin','right_shin',knee,ankle);prepare('far_thigh','left_thigh',farhip,farknee);prepare('far_shin','left_shin',farknee,farankle)
sockets={n:{'u':tt(anchors[n])[0]/ts[0],'v':tt(anchors[n])[1]/ts[1]} for n in ['neck','nearShoulder','farShoulder','nearHip','farHip']}
# The head renderer uses a 68:85 display aspect; pad source to that ratio rather
# than stretching the painted head. Anchor is transported through padding.
head=Image.open(EVIDENCE/'head.png');neww=math.ceil(head.height*.8);pad=max(0,(neww-head.width)//2)
if pad:
 expanded=Image.new('RGBA',(neww,head.height));expanded.paste(head,(pad,0));expanded.save(EVIDENCE/'head.png');head=expanded
headanchor=th(neck);headanchor[0]+=pad
textures=dict(lockLimbJoints=True,heightScale=1.085260,nearShinScale=1,farShinScale=1,farThighScale=1,
 torsoH=(sum(p[1] for p in [hip,farhip])/2-neck[1])*k,upperArmH=math.dist(shoulder,elbow)*k,forearmH=math.dist(elbow,wrist)*k,thighH=math.dist(hip,knee)*k,shinH=math.dist(knee,ankle)*k,
 neckInTorso=True,headOffsetX=0,headOffsetY=0,armOffsetX=0,armOffsetY=0,
 nearShinOffsetX=0,nearShinOffsetY=0,farShinOffsetX=0,farShinOffsetY=0,
 shinUnderThigh=SHIN_UNDER_THIGH,farLegOverTorso=above('left_thigh','torso'),forearmOverUpperArm=above('right_forearm_hand','right_upper_arm'),
 handInForearm=True,sockets=sockets)
# For the authored head (a different canvas): this PSD head's size and neck anchor, so the rig file can convert.
HEAD_MEASURE={'canvas':list(head.size),'headScale':head.height*k/85,'anchor':{'u':headanchor[0]/head.width,'v':headanchor[1]/head.height}}
textures.update(torso=parts['torso'],upperArm=parts['upper_arm'],forearm=parts['forearm'],thigh=parts['thigh'],shin=parts['shin'],farThigh=parts['far_thigh'],farShin=parts['far_shin'])
# Derek 2026-10-20: the far shin art is wider/shorter than the near one and gets fitted to the same bone, so it read swollen. Narrow its drawn box to 75% (binding fractions are canvas-relative, so the fit stays exact).
textures['farShin']['box']['w']*=0.75
report={'height_scale_note':'Measured rig-tuner ink heights at zoom 1.4: current Procreate Lou 347.7911, candidate at scale 1 318.3254; uniform ratio 1.092563; re-matched to 1.085260 after the back leg was added (350.14 vs 347.79 at 1.092563). No per-part proportion adjustment.', 'source':'Lou2.psd','units_per_source_pixel':k,'anchorsCanvasPx':anchors,'measurement_methods':{'paired_overlap':'alpha >=128 intersection centroid, recomputed from this PSD','shoulders':'manual deltoid/socket landmark, not long overlap centroid','wrist_ankle_sole':'manual anatomical landmarks; tuner review pending'},'parts':records,'textures':textures}
(EVIDENCE/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')
config="""// GENERATED by tools/wrestler-cutter/prepare-lou-base.py from Lou2.psd. Do not edit: re-run the generator.
// Measured base geometry only; src/characters/thesz_procreate_v1.js adds everything authored (ART_REVISION.md).
// Measurements: Sprite sheets/RosterNew/2026-11-22/Lou2/extracted-v1/cleaned-v1/comparison-v1/measurements.json
export const THESZ_PROCREATE_V1_BASE = %s;
// The PSD's own head, measured: the rig keeps the Procreate head canvas and converts from this.
export const THESZ_PROCREATE_V1_PSD_HEAD = %s;
"""%(json.dumps(textures,indent=4),json.dumps(HEAD_MEASURE,indent=4))
(ROOT/'src/characters/generated').mkdir(exist_ok=True)
(ROOT/'src/characters/generated/thesz_procreate_v1.base.js').write_text(config)
print(json.dumps({n:round(textures[n],2) for n in ['torsoH','upperArmH','forearmH','thighH','shinH']}),'shinUnderThigh',textures['shinUnderThigh'],'farLegOverTorso',textures['farLegOverTorso'],'forearmOverUpperArm',textures['forearmOverUpperArm'])
