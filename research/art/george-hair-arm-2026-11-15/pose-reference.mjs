import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const out = new URL('./references/', import.meta.url).pathname;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2});
await p.goto('http://127.0.0.1:5201/?arena=1&notitle=1&light=v1&faces=0&p1=george-roster-v1&p2=thesz-procreate-v1');
await p.waitForFunction(()=>window.__WFM_GAME?.scene.scenes[0]?.w2);
const result = await p.evaluate(()=>{
 const g=window.__WFM_GAME,sc=g.scene.scenes[0];g.loop.sleep();sc._p1AI=sc._p2AI=null;
 const A=sc.w1,D=sc.w2;A.x=480;D.x=900;A.y=D.y=380;A.facing=1;A.state='taunting';A._choreoUntil=sc.time.now+1e9;A.combatBlend=0;
 let T=sc.time.now;let best=null;
 for(let a=.8;a<3.3;a+=.07)for(let e=.2;e<2.8;e+=.07){
  const pose={lArm:a,lElbow:e,rArm:.15,rElbow:.8,lean:-.06,bend:0};
  for(let j=0;j<2;j++){Object.assign(A.pose,pose);A.skeleton.nearUpArm._distalAnchorFrac={u:.5013359317,v:.60};g.step(T+=16.667,16.667);A.skeleton.setPartVariants({nearForearm:'hairSmooth'});}
  const img=A.skeleton.nearForearm,pt=A.skeleton.constructor.imageAnchorPoint(img,img._semanticAnchors?.hairContact),hb=A.skeleton.head.getBounds();
  if(!pt)continue;const target={x:hb.x+hb.width*.48,y:hb.y+hb.height*.12};const elbow=A.skeleton.jointAttachmentPoints.nearElbow;const d=Math.hypot(pt.x-target.x,pt.y-target.y)+Math.max(0,hb.right+5-elbow.x)*2;
  if(!best||d<best.d)best={pose,d,point:pt,target,elbow:A.skeleton.jointAttachmentPoints.nearElbow};
 }
 window.hairPose=best.pose;return best;
});
await p.evaluate(()=>{const g=window.__WFM_GAME,A=g.scene.scenes[0].w1;for(let j=0;j<3;j++){Object.assign(A.pose,window.hairPose);g.step(g.scene.scenes[0].time.now+16.667,16.667);A.skeleton.setPartVariants({nearForearm:'hairSmooth'});}});
await p.screenshot({path:out+'near-arm-shortened-surrogate.png'});
writeFileSync(out+'pose.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));await b.close();
