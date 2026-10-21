import {chromium} from '/Users/home/Documents/wrestling-from-marigold/node_modules/playwright-core/index.mjs';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
await page.goto('http://127.0.0.1:5221/?arena=1&notitle=1&p1=thesz&p2=george');
await page.waitForFunction(()=>window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton?.jointAttachmentPoints?.neck);
await page.evaluate(()=>{window.__EDGE_CLIPS=[...window.__WFM_GAME.scene.scenes[0].moveRuntime._clips.values()]});
const out=await page.evaluate(()=>{
 const sc=window.__WFM_GAME.scene.scenes[0],a=sc.w1,b=sc.w2;const results=[];
 for(const move of ['bodySlam','hipToss'])for(const [x,facing] of [[550,1],[160,1],[800,1],[160,-1],[800,-1]]){
 sc.moveRuntime.shutdown();sc.moveRuntime._clips.clear();
 // Reuse the compiled clips saved on the first pass.
 if(!window.__EDGE_CLIPS)throw new Error('clips not provided');
 for(const c of window.__EDGE_CLIPS)sc.moveRuntime.register(c);
 sc.tweens.killAll();sc.lockupState=null; a._activeMove=b._activeMove=null;a._fixedHold=b._fixedHold=false;
 a.x=x;a.y=410;b.x=x+facing*65;b.y=410;a.facing=facing;b.facing=-facing;a.state=b.state='standing';a.stamina=b.stamina=100;
 a.draw();b.draw();a[{piledriver:'_doPiledriver',bodySlam:'_doBodySlam',hipToss:'_doHipToss'}[move]](b);
 let maxGap=0,worstAt=0;const duration={piledriver:2,bodySlam:1.5,hipToss:1}[move];const frames=[];
 for(let t=0;t<=duration;t+=1/60){sc._tickGame(1/60);const aj=a.skeleton.jointAttachmentPoints,bj=b.skeleton.jointAttachmentPoints;
 const inWindow=move==='piledriver'?t>=.62&&t<=1.27:move==='bodySlam'?t>=.24&&t<=.98:t>=.14&&t<=.52;
 const side=facing===1?'near':'far';const target=move==='hipToss'?(facing===1?'farHip':'nearHip'):(facing===1?'nearHip':'farHip');
 const gap=Math.hypot(aj[side+'Wrist'].x-bj[target].x,aj[side+'Wrist'].y-bj[target].y)/a.s;
 if(inWindow&&gap>maxGap){maxGap=gap;worstAt=t}frames.push({t,x:[a.x,b.x]});
 }
 results.push({move,x,facing,maxGap,worstAt,end:[a.x,b.x],frames});
 }return results;
});
writeFileSync('/tmp/marigold-edge-results.json',JSON.stringify(out));console.log(JSON.stringify(out.map(({frames,...r})=>r)));await browser.close();
