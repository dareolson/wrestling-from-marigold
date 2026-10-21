"""Measured opt-in LouNew preparation; source PSD/full-canvas exports unchanged."""
from pathlib import Path
from PIL import Image
import numpy as np
import math,json
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'Sprite sheets/RosterNew/2026-10-18/LouNew/extracted-v1/cleaned-v1/layers-full-canvas'
OUT=ROOT/'src/assets/wrestlers/thesz-roster-v1';OUT.mkdir(parents=True,exist_ok=True)
EVIDENCE=SOURCE.parent/'comparison-v1';EVIDENCE.mkdir(exist_ok=True)
images={p.name.split('-',1)[1][:-4]:Image.open(p).convert('RGBA') for p in SOURCE.glob('*.png')}
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
 im.save(OUT/f'{name}.png');w,h=im.size
 rec=dict(source=source,source_crop=list(box),rotation_degrees=math.degrees(angle),canvas=[w,h])
 entry={'key':f'thesz_rv1_{name}'}
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
head=Image.open(OUT/'head.png');neww=math.ceil(head.height*.8);pad=max(0,(neww-head.width)//2)
if pad:
 expanded=Image.new('RGBA',(neww,head.height));expanded.paste(head,(pad,0));expanded.save(OUT/'head.png');head=expanded
headanchor=th(neck);headanchor[0]+=pad
textures=dict(lockLimbJoints=True,heightScale=1.085260,nearShinScale=1,farShinScale=1,farThighScale=1,
 torsoH=(sum(p[1] for p in [hip,farhip])/2-neck[1])*k,upperArmH=math.dist(shoulder,elbow)*k,forearmH=math.dist(elbow,wrist)*k,thighH=math.dist(hip,knee)*k,shinH=math.dist(knee,ankle)*k,
 neckInTorso=True,head=f'thesz_rv1_head',headScale=head.height*k/85,headAnchorFrac={'u':headanchor[0]/head.width,'v':headanchor[1]/head.height},headOffsetX=0,headOffsetY=0,armOffsetX=0,armOffsetY=0,
 nearShinOffsetX=0,nearShinOffsetY=0,farShinOffsetX=0,farShinOffsetY=0,shinUnderThigh=True,forearmOverUpperArm=True,handInForearm=True,rigProfile={'sockets':sockets})
textures.update(torso=parts['torso'],upperArm=parts['upper_arm'],forearm=parts['forearm'],thigh=parts['thigh'],shin=parts['shin'],farThigh=parts['far_thigh'],farShin=parts['far_shin'])
report={'height_scale_note':'Measured rig-tuner ink heights at zoom 1.4: current Procreate Lou 347.7911, candidate at scale 1 318.3254; uniform ratio 1.092563; re-matched to 1.085260 after the back leg was added (350.14 vs 347.79 at 1.092563). No per-part proportion adjustment.', 'source':'LouNew.psd','units_per_source_pixel':k,'anchorsCanvasPx':anchors,'measurement_methods':{'paired_overlap':'alpha >=128 intersection centroid, recomputed from this PSD','shoulders':'manual deltoid/socket landmark, not long overlap centroid','wrist_ankle_sole':'manual anatomical landmarks; tuner review pending'},'parts':records,'textures':textures}
(EVIDENCE/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')
config="""// Opt-in LouNew PSD comparison. Generated by prepare-lou-roster.py.
// Source authority and measurements: Sprite sheets/RosterNew/2026-10-18/LouNew/
// extracted-v1/cleaned-v1/comparison-v1/measurements.json.
// Current Lou remains unchanged. Manual source landmarks require visual review.
import { thesz } from './thesz.js';
export const theszRosterV1 = {
    id: 'thesz-roster-v1', skinCol: thesz.skinCol, trunksCol: thesz.trunksCol,
    idlePose: 'theszProcreateIdle', tauntPose: thesz.tauntPose, moveSet: thesz.moveSet,
    textures: %s,
};
export const thesz_roster_v1 = theszRosterV1;
"""%json.dumps(textures,indent=4)
(ROOT/'src/characters/thesz_roster_v1.js').write_text(config)
print(json.dumps({n:round(textures[n],2) for n in ['torsoH','upperArmH','forearmH','thighH','shinH','headScale']}))
