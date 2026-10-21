import {chromium} from '/Users/home/Documents/wrestling-from-marigold/node_modules/playwright-core/index.mjs';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
for(const p2 of ['thesz','thesz-procreate-v1']){
const page=await browser.newPage({viewport:{width:1100,height:700}});
await page.goto(`http://127.0.0.1:5221/?arena=1&notitle=1&p1=george&p2=${p2}`);
await page.waitForFunction(()=>window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton?.jointAttachmentPoints?.neck);
const out=await page.evaluate(async()=>{const sc=window.__WFM_GAME.scene.scenes[0],a=sc.w1,b=sc.w2;const{outline}=await import('/tools/move-critic/page-outline.js');
a.x=550;a.y=410;b.x=615;b.y=410;a.facing=1;b.facing=-1;a.state=b.state='standing';a.draw();b.draw();
const points=outline(b.skeleton.nearBoot?.visible?b.skeleton.nearBoot:b.skeleton.nearShin);const standingOverhang=Math.max(...points.map(p=>p[1]))-b.y;
a._doPiledriver(b);sc._tickGame=()=>{a.draw();b.draw()};const records=[];
for(const at of [1.24,1.27,1.42,1.62,1.74,2]){sc.moveRuntime.seek(a._activeMove,at);a.draw();b.draw();const head=outline(b.skeleton.head),low=Math.max(...head.map(p=>p[1]));records.push({at,headBottom:low,rootY:b.y,scale:b.s,calibratedGapRig:(b.y+standingOverhang-low)/b.s,rawGapRig:(b.y-low)/b.s});}
sc.moveRuntime.seek(a._activeMove,2);a.draw();b.draw();const before=JSON.parse(JSON.stringify(b.skeleton.jointAttachmentPoints));b._layDown(6.5,'prone');b.draw();const after=b.skeleton.jointAttachmentPoints;const jumps=Object.entries(after).map(([name,p])=>({name,d:Math.hypot(p.x-before[name].x,p.y-before[name].y)/b.s})).sort((a,b)=>b.d-a.d);records.push({handoff:jumps.slice(0,4)});b.state='holding';sc.moveRuntime.seek(a._activeMove,1.24);a.draw();b.draw();return records;});
await page.waitForTimeout(120);await page.screenshot({path:`/tmp/piledriver-impact-${p2}.png`});results.push({p2,records:out});await page.close();}
console.log(JSON.stringify(results));writeFileSync('/tmp/marigold-impact-results.json',JSON.stringify(results));await browser.close();
