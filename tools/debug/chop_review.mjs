import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.argv[2]??'research/animation/chop-2026-11-15';mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2});
const errors=[];p.on('pageerror',e=>errors.push(e.message));const results=[];
for(const defender of ['george-roster-v1','thesz-procreate-v1','kowalski-roster-v1','guido-roster-v1'])for(const facing of [1,-1]){
 await p.goto((process.env.WFM_URL??'http://127.0.0.1:5201')+'/?arena=1&notitle=1&light=v1&p1=thesz-procreate-v1&p2='+defender);
 await p.waitForFunction(()=>window.__WFM_GAME?.scene.scenes[0]?.w2);
 await p.evaluate(f=>{
  const g=window.__WFM_GAME,sc=g.scene.scenes[0];g.loop.sleep();sc._p1AI=sc._p2AI=null;sc.tweens.getDelta=()=>1000/60;
  const A=sc.w1,D=sc.w2;for(const w of [A,D]){sc.tweens.killTweensOf(w);sc.tweens.killTweensOf(w.pose);w.state='standing';w._cancelActiveMove('review');w.input={justDown:()=>false,isDown:()=>false};w.stamina=100;w.vx=w.vy=0;w.y=350;}
  A.x=450;D.x=450+f*80*A.s;A.facing=f;D.facing=-f;
  let T=sc.time.now;window.step=()=>g.step(T+=1000/60,1000/60);for(let i=0;i<4;i++)window.step();
  const cam=sc.cameras.main;cam.stopFollow?.();cam.removeBounds?.();cam.setZoom(2);cam.centerOn((A.x+D.x)/2,270);
  window.rows=[];window.hits=[];window.frame=0;
  const hurt=D._hurt.bind(D);D._hurt=(...args)=>{const Q=D.skeleton.jointAttachmentPoints,hip={x:(Q.nearHip.x+Q.farHip.x)/2,y:(Q.nearHip.y+Q.farHip.y)/2};window.hits.push({f:window.frame,target:{x:Q.neck.x+(hip.x-Q.neck.x)*.35,y:Q.neck.y+(hip.y-Q.neck.y)*.35}});return hurt(...args);};
  A._doChop(D);window.handle=A._activeMove;
 },facing);
 for(let f=1;f<=150;f++){
  await p.evaluate(()=>{window.frame++;window.step();const A=window.__WFM_GAME.scene.scenes[0].w1,sk=A.skeleton,P=sk.jointAttachmentPoints,pt=sk.partAnchorPoint('farUpArm','chopEdge')??sk.constructor.imageAnchorPoint(sk.farForearm,{u:.30,v:.86});window.rows.push({f:window.frame,state:A.state,x:A.x,hand:pt,angle:Math.atan2(P.farWrist.y-P.farElbow.y,(P.farWrist.x-P.farElbow.x)*A.facing),far:sk.farUpArm.texture.key,forearmVisible:sk.farForearm.visible,near:sk.nearForearm.texture.key,feet:[sk.soleWorld('near'),sk.soleWorld('far')]});});
  await p.evaluate(()=>{const D=window.__WFM_GAME.scene.scenes[0].w2,P=D.skeleton.jointAttachmentPoints,hip={x:(P.nearHip.x+P.farHip.x)/2,y:(P.nearHip.y+P.farHip.y)/2},target={x:P.neck.x+(hip.x-P.neck.x)*.3,y:P.neck.y+(hip.y-P.neck.y)*.3};Object.assign(window.rows.at(-1),{defenderState:D.state,defenderStamina:D.stamina,chestClutch:D.pose.chestClutch??0,chestDistance:Math.hypot(P.nearWrist.x-target.x,P.nearWrist.y-target.y)});});
  if(defender==='george-roster-v1'&&[6,10,15,20,30,40,53,80,110].includes(f))await p.screenshot({path:`${out}/chop-${facing>0?'R':'L'}-${f}.png`});
 }
 const r=await p.evaluate(()=>({rows:window.rows,hits:window.hits,plants:window.handle?.plantLog??[]}));
 r.defender=defender;r.facing=facing;writeFileSync(`${out}/case-${defender}-${facing}.json`,JSON.stringify(r));
 const hit=r.hits[0],row=r.rows.find(x=>x.f===hit?.f),gap=row?Math.hypot(row.hand.x-hit.target.x,row.hand.y-hit.target.y):null;
 const result={defender,facing,hits:r.hits.length,paintedEdgeGap:gap,hitAngle:row?.angle,handHeightRange:r.rows.filter(x=>x.f>=14&&x.f<=31).map(x=>x.hand.y),plantMax:Math.max(0,...r.plants.map(x=>x.err)),final:r.rows.at(-1).state};results.push(result);console.log(JSON.stringify(result));
}
writeFileSync(out+'/summary.json',JSON.stringify({results,errors},null,2));await b.close();
