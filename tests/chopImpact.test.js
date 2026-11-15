import test from 'node:test';
import assert from 'node:assert/strict';
import Wrestler,{STAMINA_DRAIN} from '../src/Wrestler.js';
import {CHOP_STAGGER,stepMs} from '../src/animation/staggers.js';
import {FaceDriver} from '../src/animation/faceTrial.js';
import Skeleton from '../src/Skeleton.js';

test('chop chest clutch survives pose tween normalization and releases on another pose',()=>{
 const w={pose:{},scene:{tweens:{killTweensOf(){}}},_syncSellAppearance(){},_cancelActiveMove(){}};
 Wrestler.prototype.tweenPose.call(w,{chestClutch:1},0);
 assert.equal(w.pose.chestClutch,1);
 Wrestler.prototype.tweenPose.call(w,{bend:0},0);
 assert.equal(w.pose.chestClutch,0);
});

test('chop recoil steps back, holds the chest, then releases within its stagger timer',()=>{
 assert.ok(STAMINA_DRAIN.chop>STAMINA_DRAIN.clubBlow);
 assert.ok(CHOP_STAGGER.steps.reduce((sum,s)=>sum+s.dx,0)>0);
 assert.ok(CHOP_STAGGER.steps.some(s=>s.pose.chestClutch===1&&s.dur>=300));
 assert.equal(CHOP_STAGGER.steps.at(-1).pose.chestClutch,0);
 assert.ok(stepMs(CHOP_STAGGER)<=CHOP_STAGGER.seconds*1000);
 for(const {pose:p}of CHOP_STAGGER.steps)for(const side of ['l','r'])assert.ok(p[side+'Shin']<=p[side+'Leg']+.85*p.crouch);
});

test('chop pain face lasts through the held chest sell',()=>{
 const w={_damageTaken:12,_pain:{source:'chop'},state:'staggered',skeleton:{head:{setTexture(){}}},scene:{textures:{exists:()=>true}}};
 const f=new FaceDriver(w,{prefix:'test',restKeys:['r0','r1','r2']});
 f.tick(100,{});f.tick(1800,{});
 assert.ok(f.key.includes('_pain_'));
});

test('chest clutch uses the lower sternum and keeps both arm segment lengths',()=>{
 const P={nearShoulder:{x:100,y:50},nearElbow:{x:100,y:80},nearWrist:{x:120,y:100},neck:{x:110,y:40},nearHip:{x:110,y:120},farHip:{x:110,y:120}};
 const lu=30,lf=Math.hypot(20,20),sk={jointAttachmentPoints:P,nearUpArm:{},nearForearm:{},_placeLimbPart(){},_placeAttachment(){}};
 Skeleton.prototype._applyChestClutch.call(sk,1,1,1);
 assert.ok(Math.abs(Math.hypot(P.nearElbow.x-100,P.nearElbow.y-50)-lu)<1e-6);
 assert.ok(Math.abs(Math.hypot(P.nearWrist.x-P.nearElbow.x,P.nearWrist.y-P.nearElbow.y)-lf)<1e-6);
 assert.ok(P.nearWrist.y>75,'wrist stays below upper chest so baked fingers do not reach the throat');
});
