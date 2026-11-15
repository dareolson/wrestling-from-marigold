import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.argv[2]??'research/animation/chop-2026-11-15';mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1000,height:700}});
await p.goto((process.env.WFM_URL??'http://127.0.0.1:5201')+'/?arena=1&notitle=1&light=v1&faces=0&p1=thesz-procreate-v1&p2=george-roster-v1');
await p.waitForFunction(()=>window.__WFM_GAME?.scene.scenes[0]?.w2);
const res=await p.evaluate(()=>{
 const g=window.__WFM_GAME,sc=g.scene.scenes[0];g.loop.sleep();sc._p1AI=sc._p2AI=null;
 const A=sc.w1,D=sc.w2;A.x=450;A.y=D.y=350;A.facing=1;D.facing=-1;D.x=450+80*A.s;A.state=D.state='slamming';
 const idle={...A.pose};A.draw();D.draw();
 const Q=D.skeleton.jointAttachmentPoints,hip={x:(Q.nearHip.x+Q.farHip.x)/2,y:(Q.nearHip.y+Q.farHip.y)/2};
 const target={x:Q.neck.x+(hip.x-Q.neck.x)*.35,y:Q.neck.y+(hip.y-Q.neck.y)*.35};
 const sk=A.skeleton,channel=sk.lChannelSide(1)==='far'?'l':'r',guard=channel==='l'?'r':'l';
 const draw=(arm,elbow,phase)=>{sk.setPartVariants({farUpperArm:'chop'+phase,farForearm:'chop'+phase});
  const pose={...idle,lLeg:.25,rLeg:-.12,lShin:.01,rShin:-.36,[channel+'Arm']:arm,[channel+'Elbow']:elbow,[guard+'Arm']:.1,[guard+'Elbow']:.8,lean:.12,bend:.06,crouch:.1};
  sk.updateUpright(A.x,A.y,A.s*A._heightScale,1,pose,0,0,.12,0,.5,0);
  const img=sk.farForearm,pt=sk.constructor.imageAnchorPoint(img,{u:.30,v:.86}),P=sk.jointAttachmentPoints,e=P.farElbow,w=P.farWrist;
  return {pose,pt,angle:Math.atan2(w.y-e.y,w.x-e.x),arm,elbow};
 };
 let best=null;
 for(let arm=.65;arm<2.7;arm+=.015)for(let elbow=0;elbow<1.9;elbow+=.025){
  const r=draw(arm,elbow,'Contact'),lunge=(target.x-r.pt.x)/A.s;
  if(lunge<0||lunge>32)continue;
  const score=Math.abs(target.y-r.pt.y)+Math.abs(r.angle)*25+lunge*.1;
  if(!best||score<best.score)best={...r,lunge,score};
 }
 const phases={hit:best};
 for(const [name,art,back]of [['cock','Windup',25],['follow','Follow',12]]){
  let selected=null;const want={x:best.pt.x-back*A.s,y:best.pt.y};
  for(let arm=.4;arm<2.8;arm+=.02)for(let elbow=0;elbow<2.5;elbow+=.025){
   const r=draw(arm,elbow,art),score=Math.abs(r.pt.y-want.y)*2+Math.abs(r.pt.x-want.x)+Math.max(0,Math.abs(r.angle)-.5)*8;
   if(!selected||score<selected.score)selected={...r,score};
  }phases[name]=selected;
 }
 return {target,channel,phases};
});
writeFileSync(out+'/solve.json',JSON.stringify(res,null,2));console.log(JSON.stringify(res));await b.close();
