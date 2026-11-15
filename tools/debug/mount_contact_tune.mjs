import {chromium} from 'playwright-core';
import {writeFileSync} from 'node:fs';
const rigs=['thesz-procreate-v1','george-roster-v1','kowalski-roster-v1','guido-roster-v1'];const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage();const out={};
for(const rig of rigs){await p.goto(`http://127.0.0.1:5197/?arena=1&notitle=1&light=v1&faces=0&p1=${rig}&p2=${rig===rigs[0]?rigs[1]:rigs[0]}`);await p.waitForFunction(()=>window.__WFM_GAME?.scene.scenes[0]?.w2);
 out[rig]=await p.evaluate(async()=>{
 const {MOUNTED_PUNCHES_SPEC:S}=await import('/src/animation/clips/groundStrikes.js');const {specFor}=await import('/src/animation/clips/rigOverrides.js');const {shinsFromFolds}=await import('/src/rig/articulation.js');
 const sc=window.__WFM_GAME.scene.scenes[0];sc.game.loop.sleep();sc._p1AI=sc._p2AI=null;const A=sc.w1,D=sc.w2,s=specFor(S,{attackerRigId:A.rigId});A.state='slamming';D.state='down';D.lying='supine';D.facing=-1;A.facing=1;D.x=550;D.y=350;D.draw();
 const hb=D.skeleton.head.getBounds(),target={x:(hb.left+hb.right)/2-(hb.right-hb.left)*.2,y:(hb.top+hb.bottom)/2};A.y=D.y+s.depth*A.s;A.x=target.x-s.reach*A.s;
 const side=A.skeleton.lChannelSide(1),near=side==='near'?'l':'r',far=near==='l'?'r':'l';
 const base=shinsFromFolds({[near+'Leg']:s.kneel.down.leg,[far+'Leg']:s.kneel.up.leg,[near+'Fold']:s.kneel.down.fold,[far+'Fold']:s.kneel.up.fold,crouch:s.kneel.crouch,lean:s.hit.lean,bend:s.hit.bend,lArm:.6,rArm:.6,lElbow:1.4,rElbow:1.4});
 const result={};
 for(const hand of ['l','r']){const keys=[hand+'Arm',hand+'Elbow'];let vals=hand==='l'?[s.hit.lArm,s.hit.lElbow]:[s.hitR.arm,s.hitR.elbow];
 const sample=v=>{A.pose={...base,[keys[0]]:v[0],[keys[1]]:v[1]};A.draw();const P=A.skeleton.jointAttachmentPoints,side=hand==='l'?A.skeleton.lChannelSide(1):(A.skeleton.lChannelSide(1)==='near'?'far':'near'),w=P[side+'Wrist'],e=P[side+'Elbow'];return {x:w.x+(w.x-e.x)*.35,y:w.y+(w.y-e.y)*.35};};
 let best=Infinity;for(let a=.3;a<=2.3;a+=.2)for(let e=.02;e<=1.6;e+=.2){const q=sample([a,e]),d=Math.hypot(q.x-target.x,q.y-target.y);if(d<best){best=d;vals=[a,e];}}
 for(let i=0;i<20;i++){const q=sample(vals),err=Math.hypot(target.x-q.x,target.y-q.y);if(err<.5)break;const qa=sample([vals[0]+.01,vals[1]]),qb=sample([vals[0],vals[1]+.01]);const a=(qa.x-q.x)/.01,b=(qb.x-q.x)/.01,c=(qa.y-q.y)/.01,d=(qb.y-q.y)/.01,det=a*d-b*c;if(Math.abs(det)<1e-5)break;const ex=target.x-q.x,ey=target.y-q.y;const da=(d*ex-b*ey)/det,db=(-c*ex+a*ey)/det;let accepted=false;for(const k of [1,.5,.25,.1]){const v=[Math.max(.2,Math.min(2.4,vals[0]+Math.max(-.3,Math.min(.3,da))*k)),Math.max(.02,Math.min(1.6,vals[1]+Math.max(-.3,Math.min(.3,db))*k))],r=sample(v);if(Math.hypot(r.x-target.x,r.y-target.y)<err){vals=v;accepted=true;break}}if(!accepted)break;}
 const q=sample(vals);result[hand]={arm:+vals[0].toFixed(3),elbow:+vals[1].toFixed(3),miss:+Math.hypot(q.x-target.x,q.y-target.y).toFixed(2)};}
 return result;
 });console.log(rig,out[rig]);}
writeFileSync('/private/tmp/mount-tuned.json',JSON.stringify(out,null,2));await b.close();
