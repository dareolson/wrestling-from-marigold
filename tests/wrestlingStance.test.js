import test from 'node:test';import assert from 'node:assert/strict';
import {readyStancePose,wrestlingStance} from '../src/animation/wrestlingStance.js';
test('ready stance eases without changing authored pose or foot angles',()=>{
 const p={lLeg:.1,rLeg:-.1,crouch:.02,bend:.03};const copy={...p};
 assert.equal(readyStancePose(p,0),p);
 const half=readyStancePose(p,.5),full=readyStancePose(p,1);
 assert.deepEqual(p,copy);assert.ok(Math.abs(full.crouch-.34)<1e-12);assert.ok(Math.abs(full.bend-.12)<1e-12);
 assert.ok(Math.abs(half.crouch-(p.crouch+full.crouch)/2)<1e-12);assert.equal(full.lLeg,p.lLeg);assert.equal(full.rLeg,p.rLeg);
 assert.equal(readyStancePose({crouch:.4},1).crouch,.4);
});
test('all ready guards keep elbows bent within anatomical limits',()=>{
 for(const rig of ['george-roster-v1','thesz-procreate-v1','kowalski-roster-v1','guido-roster-v1']){
  for(const arm of Object.values(wrestlingStance(rig))){const flex=arm.forearm-arm.upper;assert.ok(flex>0&&flex<2.5);}
 }
});

test('probing guard keeps elbow limits and hand reach bounded over time',async()=>{
 const {probingGuard}=await import('../src/animation/wrestlingStance.js');
 for(const rig of ['george-roster-v1','thesz-procreate-v1','kowalski-roster-v1','guido-roster-v1'])for(const lower of [false,true]){
  const base=wrestlingStance(rig,lower);let travel=0;
  for(let n=0;n<=1800;n++){
   const arms=probingGuard(rig,n/60,lower);
   for(const side of ['near','far']){
    const arm=arms[side],flex=arm.forearm-arm.upper;
    assert.ok(flex>0&&flex<2.5);
    const x=38*Math.sin(arm.upper)+26*Math.sin(arm.forearm),y=38*Math.cos(arm.upper)+26*Math.cos(arm.forearm);
    const bx=38*Math.sin(base[side].upper)+26*Math.sin(base[side].forearm),by=38*Math.cos(base[side].upper)+26*Math.cos(base[side].forearm);
    const displacement=Math.hypot(x-bx,y-by);assert.ok(displacement<18);travel=Math.max(travel,displacement);
   }
  }assert.ok(travel>2);
 }
});

test('lower guard probes from the wrist while the far elbow stays tucked',async()=>{
 const {probingGuard}=await import('../src/animation/wrestlingStance.js');
 const base=wrestlingStance('george-roster-v1',true);let lo=Infinity,hi=-Infinity;
 for(let n=0;n<600;n++){
  const arm=probingGuard('george-roster-v1',n/60,true).far;
  assert.equal(arm.upper,base.far.upper);assert.equal(arm.forearm,base.far.forearm);
  lo=Math.min(lo,arm.wrist);hi=Math.max(hi,arm.wrist);
 }assert.ok(hi-lo>.25);assert.ok(base.far.upper<.3);
});
