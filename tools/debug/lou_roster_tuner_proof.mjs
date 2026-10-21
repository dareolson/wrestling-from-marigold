import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir=process.argv[2] ?? 'Sprite sheets/RosterNew/2026-10-18/LouNew/extracted-v1/cleaned-v1/comparison-v1';
mkdirSync(dir+'/proof',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1500,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/tools/rig-tuner/');await page.waitForFunction(()=>window.__RIG_TOOL?.skeleton());
const data=[];
for(const id of (process.argv[3]??'thesz-procreate-v1,thesz-roster-v1').split(',')){
 await page.evaluate(id=>window.__RIG_TOOL.setCharacter(id),id);await page.waitForTimeout(200);
 for(const facing of [1,-1])for(const phase of [-1,...Array.from({length:24},(_,i)=>i*Math.PI/12)]){
  await page.evaluate(({facing,phase})=>{const t=window.__RIG_TOOL;t.state.facing=facing;t.state.walkPhase=Math.max(0,phase);t.state.moveBlend=phase<0?0:1;t.state.showHandles=false;t.state.showBones=false;t.state.zoom=1.4}, {facing,phase});await page.waitForTimeout(60);
  const result=await page.evaluate(async()=>{const t=window.__RIG_TOOL,s=t.skeleton();const{outline}=await import('/tools/move-critic/page-outline.js');const points=s._parts.filter(p=>p.visible&&p.alpha>0).flatMap(p=>outline(p));return {height:Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])),bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))],joints:s.jointAttachmentPoints,soles:['near','far'].map(side=>Math.max(...outline(s[side+'Shin']).map(p=>p[1]))),gap:(await import('/tools/debug/jointInk.js')).measureJoints(s)}});
  data.push({id,facing,phase,...result});if(phase<0 || Math.abs(phase%(Math.PI/2))<.001)await page.screenshot({path:`${dir}/proof/${id}-${facing}-${phase.toFixed(2)}.png`});
 }
}
writeFileSync(dir+'/proof/tuner.json',JSON.stringify({errors,data},null,2));console.log(JSON.stringify({errors,idles:data.filter(r=>r.phase<0).map(({joints,...r})=>r)}));await browser.close();
