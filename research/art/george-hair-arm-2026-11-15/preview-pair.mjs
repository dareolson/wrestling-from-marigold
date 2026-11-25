// Browser-only art fitting. Does not register production variants or alter runtime files.
import {chromium} from 'playwright-core';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
const out=new URL('./',import.meta.url).pathname;
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1100,height:700},deviceScaleFactor:2});
await p.goto('http://127.0.0.1:5201/?arena=1&notitle=1&light=v1&faces=0&p1=george-roster-v1&p2=thesz-procreate-v1');
await p.waitForFunction(()=>window.__WFM_GAME?.scene.scenes[0]?.w2);
await p.evaluate(async()=>{
 const g=window.__WFM_GAME,sc=g.scene.scenes[0];g.loop.sleep();sc._p1AI=sc._p2AI=null;
 for(const [key,file]of [['trialUpper','upperArm-hairReach-v1.png'],['trialFore','forearm-hairFix-v1.png']]){
  const im=new Image();im.src='/research/art/george-hair-arm-2026-11-15/'+file;await im.decode();sc.textures.addImage(key,im);
 }
 const A=sc.w1;A.x=480;A.y=380;A.facing=1;A.state='taunting';A._choreoUntil=sc.time.now+1e9;
 g.step(sc.time.now+16.667,16.667);
 window.drawTrial=(facing,pose)=>{
  const sk=A.skeleton;A.facing=facing;
  sk.nearUpArm.setTexture('trialUpper');sk.nearUpArm._binding=null;sk.nearUpArm._distalAnchorFrac={u:148.4/296,v:246/410};
  sk.nearForearm.setTexture('trialFore');sk.nearForearm._semanticAnchors={hairContact:{u:250/426,v:359/439}};
  sk.updateUpright(A.x,A.y,A.s*A._heightScale,facing,{...A.pose,...pose},0,0,facing*-.06,0,.5,0);
  const hb=sk.head.getBounds(),q=sk.constructor.imageAnchorPoint(sk.nearForearm,sk.nearForearm._semanticAnchors.hairContact);
  const target={x:facing>0?hb.x+hb.width*.48:hb.right-hb.width*.48,y:hb.y+hb.height*.12};
  const src=sk.nearForearm.texture.getSourceImage(),cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;const cx=cv.getContext('2d');cx.drawImage(src,0,0);
  const covered=(u,v)=>{const w={x:facing>0?hb.x+hb.width*u:hb.right-hb.width*u,y:hb.y+hb.height*v};const local=sk.nearForearm.getWorldTransformMatrix().applyInverse(w.x,w.y);let x=local.x+sk.nearForearm.displayOriginX;const y=local.y+sk.nearForearm.displayOriginY;if(sk.nearForearm.flipX)x=src.width-x;return x>=0&&y>=0&&x<src.width&&y<src.height&&cx.getImageData(Math.floor(x),Math.floor(y),1,1).data[3]>128;};
  const eyeCovered=covered(.77,.43),mouthCovered=covered(.80,.72);
  return {pose,point:q,target,d:Math.hypot(q.x-target.x,q.y-target.y),eyeCovered,mouthCovered,elbow:sk.jointAttachmentPoints.nearElbow,head:{x:hb.x,y:hb.y,w:hb.width,h:hb.height}};
 };
});
const cached=existsSync(out+'preview-fit.json')?JSON.parse(readFileSync(out+'preview-fit.json')):null;
const results={},jointSamples=[];
for(const facing of [1,-1]){
 const best=cached?.[facing]??await p.evaluate(f=>{
  let best=null;
  for(let a=.8;a<3.4;a+=.04)for(let e=.2;e<3;e+=.04){
   const r=window.drawTrial(f,{lArm:a,lElbow:e,rArm:.15,rElbow:.8,lean:-.06,bend:0});
   const score=r.d+(r.eyeCovered?100:0)+(r.mouthCovered?100:0);
   if(!best||score<best.score)best={...r,score};
  }return best;
 },facing);
 await p.evaluate(({f,pose})=>{const g=window.__WFM_GAME,sc=g.scene.scenes[0],A=sc.w1;Object.assign(A.pose,pose);sc.events.once('postupdate',()=>window.drawTrial(f,pose));g.step(sc.time.now+16.667,16.667);},{f:facing,pose:best.pose});
 const clip=await p.evaluate(()=>{const sc=window.__WFM_GAME.scene.scenes[0],A=sc.w1,c=sc.game.canvas.getBoundingClientRect(),k=c.width/sc.scale.width;return{x:c.left+(A.x-90)*k,y:c.top+(A.y-225)*k,width:180*k,height:155*k};});
 await p.screenshot({path:out+'references/pair-'+(facing>0?'R':'L')+'.png',clip});results[facing]=best;
 jointSamples.push(...await p.evaluate(({f,pose})=>{
  const rows=[];for(let i=0;i<=20;i++){
   const t=i/20,pp={...pose,lArm:pose.lArm+t*.12,lElbow:pose.lElbow+t*.10};
   const r=window.drawTrial(f,pp),sk=window.__WFM_GAME.scene.scenes[0].w1.skeleton,pt=sk.jointAttachmentPoints.nearElbow;
   const alpha=img=>{const src=img.texture.getSourceImage(),cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;const ctx=cv.getContext('2d');ctx.drawImage(src,0,0);const q=img.getWorldTransformMatrix().applyInverse(pt.x,pt.y);let x=q.x+img.displayOriginX;const y=q.y+img.displayOriginY;if(img.flipX)x=src.width-x;return x>=0&&y>=0&&x<src.width&&y<src.height?ctx.getImageData(Math.floor(x),Math.floor(y),1,1).data[3]:0;};
   rows.push({facing:f,t,upperAlphaAtElbow:alpha(sk.nearUpArm),forearmAlphaAtElbow:alpha(sk.nearForearm),eyeCovered:r.eyeCovered,mouthCovered:r.mouthCovered});
  }return rows;
 },{f:facing,pose:best.pose}));
}
writeFileSync(out+'preview-fit.json',JSON.stringify(results,null,2));writeFileSync(out+'joint-samples.json',JSON.stringify(jointSamples,null,2));console.log(JSON.stringify({results,jointSamples:jointSamples.length,minUpperAlpha:Math.min(...jointSamples.map(r=>r.upperAlphaAtElbow)),minForearmAlpha:Math.min(...jointSamples.map(r=>r.forearmAlphaAtElbow)),eyeCovered:jointSamples.filter(r=>r.eyeCovered).length,mouthCovered:jointSamples.filter(r=>r.mouthCovered).length}));await b.close();
