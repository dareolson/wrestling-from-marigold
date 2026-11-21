import test from 'node:test';
import assert from 'node:assert/strict';
import Skeleton from '../src/Skeleton.js';
import {theszProcreateV1} from '../src/characters/thesz_procreate_v1.js';

function image(w,h,art){return {
 frame:{realWidth:w,realHeight:h},_projectedArm:art,visible:true,
 setOrigin(x,y){this.displayOriginX=x*w;this.displayOriginY=y*h;return this;},
 setFlipX(f){this.flipX=f;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},
 setDisplaySize(x,y){this.sx=x/w;this.sy=y/h;return this;},setRotation(a){this.angle=a;return this;},
 getWorldTransformMatrix(){const c=Math.cos(this.angle),s=Math.sin(this.angle);return {a:this.sx*c,b:this.sx*s,c:-this.sy*s,d:this.sy*c,tx:this.x,ty:this.y};},
};}

test('projected arm preserves its drawn shoulder and mirrors the complete perspective drawing',()=>{
 const art=theszProcreateV1.textures.variants.upperArm.chopSweepCamera.projectedArm;
 const points=[];
 for(const facing of [1,-1]){
  const img=image(1312,1199,art),child={visible:true,setVisible(v){this.visible=v;}};
  const sk={farUpArm:img,farForearm:child,jointAttachmentPoints:{farShoulder:{x:100,y:200}}};
  Skeleton.prototype._applyProjectedArms.call(sk,1,facing);
  const shoulder=Skeleton.imageAnchorPoint(img,art.shoulder);
  assert.deepEqual(shoulder,{x:100,y:200});
  assert.equal(child.visible,false,'no ordinary forearm over the full arm drawing');
  points.push(sk.jointAttachmentPoints.farWrist);
 }
 assert.ok(Math.abs(points[0].x-100+points[1].x-100)<1e-8);
 assert.ok(Math.abs(points[0].y-points[1].y)<1e-8);
});

test('projected-arm rendering leaves ordinary arms untouched',()=>{
 const img={_projectedArm:null},child={visible:true};
 Skeleton.prototype._applyProjectedArms.call({farUpArm:img,farForearm:child},1,1);
 assert.equal(child.visible,true);
});

test('clearing a projected variant restores the ordinary forearm immediately',()=>{
 const upper=image(1312,1199,theszProcreateV1.textures.variants.upperArm.chopSweepCamera.projectedArm);
 upper.setTexture=()=>upper;
 const child={visible:false,setVisible(v){this.visible=v;}};
 const sk={farUpArm:upper,farForearm:child,_textureConfig:theszProcreateV1.textures,
  _partImages:{farUpperArm:upper},_partBaseDims:{farUpperArm:{w:143,h:330}},
  _partVariantState:{farUpperArm:'chopSweepCamera'}};
 Skeleton.prototype.setPartVariants.call(sk,{});
 assert.equal(upper._projectedArm,null);
 assert.equal(child.visible,true);
});


test('headlock wrap rotates with the torso while its shoulder stays attached in both facings',()=>{
 const art=theszProcreateV1.textures.variants.upperArm.headlockWrap.projectedArm;
 for(const facing of [1,-1]){
  const img=image(1312,1199,art),child={setVisible(){}},sk={nearUpArm:img,nearForearm:child,torso:{rotation:facing*1.2},jointAttachmentPoints:{nearShoulder:{x:100,y:200}}};
  Skeleton.prototype._applyProjectedArms.call(sk,1,facing);
  assert.equal(img.angle,facing*1.2);assert.deepEqual(Skeleton.imageAnchorPoint(img,art.shoulder),{x:100,y:200});
 }
});
