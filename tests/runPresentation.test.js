import test from 'node:test';
import assert from 'node:assert/strict';
import {footGait} from '../src/Skeleton.js';
import Wrestler,{gaitV2Config} from '../src/Wrestler.js';
import {runPresentation,runArmFlex} from '../src/animation/runPresentation.js';
const tau=Math.PI*2;
const config=search=>{globalThis.location={search};try{return gaitV2Config();}finally{delete globalThis.location;}};

test('run trial preserves the reviewed walk and authored-clip gait parameters',()=>{
 for(const rigId of ['george-roster-v1','thesz-procreate-v1','kowalski-roster-v1','guido-roster-v1']){
  const actor=g=>Object.assign(Object.create(Wrestler.prototype),{_gaitV2:g,rigId,_heightScale:.9,state:'standing'});
  const a=actor(config('?walk=v1&run=v1')),b=actor(config('?walk=v1'));
  assert.deepEqual(a._gaitParamsAt(0),b._gaitParamsAt(0));
  a.state=b.state='holding';a._activeMove=b._activeMove={};
  assert.deepEqual(a._gaitParamsAt(0),b._gaitParamsAt(0));
 }
});

test('run trial keeps stance soles fixed, retains flight and preserves rope-turn mirroring',()=>{
 const a=Object.assign(Object.create(Wrestler.prototype),{_gaitV2:config('?run=v1'),_heightScale:.8,state:'running',rigId:'george-roster-v1'}),g=a._gaitParamsAt(1);
 let air=0;
 for(let i=0;i<400;i++){
  const phase=i/400*tau,mirror=g.STANCE*tau-phase;
  const f=footGait(phase,g),m=footGait(mirror,g);
  assert.ok(Math.abs(f.fx+m.fx)<1e-8);assert.ok(Math.abs(f.lift-m.lift)<1e-8);
  if(f.lift>0&&footGait(phase+Math.PI,g).lift>0)air++;
  if(phase<g.STANCE*tau){
   const body=phase/g.freq;
   assert.ok(Math.abs(body+f.fx-g.STRIDE*.5)<1e-8);
  }
 }
 assert.ok(air>0&&air<160);
 const h=1e-6,p=g.STANCE*tau,left=footGait(p-h,g),at=footGait(p,g),right=footGait(p+h,g);
 assert.ok(Math.abs((at.fx-left.fx)/h-(right.fx-at.fx)/h)<.001);
 assert.ok(Math.abs((at.lift-left.lift)/h-(right.lift-at.lift)/h)<.001);
});

test('running elbow pumps remain bent through a whole cycle without mutating the pose',()=>{
 const pose={lArm:.2,rArm:.6,crouch:.1};const before=structuredClone(pose);
 for(let i=0;i<80;i++){
  const f=runArmFlex(i/80*tau);
  assert.ok(f.near>1&&f.near<1.4&&f.far>1&&f.far<1.4);
 }
 const result=runPresentation(pose,1);assert.deepEqual(pose,before);assert.notEqual(result,pose);
 assert.equal(runPresentation(pose,0),pose);
});
