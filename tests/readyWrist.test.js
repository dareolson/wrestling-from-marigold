import test from 'node:test';import assert from 'node:assert/strict';
import {readyWristPoint} from '../src/animation/readyWrist.js';
test('wrist deformation pins the proximal arm and joins continuously',()=>{
 const w=426,h=439;
 for(const angle of [-.18,0,.18]){
  for(const x of [150,213,270]){
   for(const y of [0,68,h*.5])assert.deepEqual(readyWristPoint(x,y,w,h,angle),{x,y});
   for(const boundary of [.5,.68]){
    const a=readyWristPoint(x,h*boundary-1e-5,w,h,angle),b=readyWristPoint(x,h*boundary+1e-5,w,h,angle);
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1e-3);
   }
  }
  const pivot=readyWristPoint(w*.5,h*.585,w,h,angle);
  assert.deepEqual(pivot,{x:w*.5,y:h*.585});
 }
});
