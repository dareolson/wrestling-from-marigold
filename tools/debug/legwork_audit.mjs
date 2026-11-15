// Real-executor leg audit, both roles and facings. Screenshots are evidence, not automatic visual approval.
import {chromium} from 'playwright-core';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {POINTS, PROBES} from './strike_lib.mjs';
const root=process.argv[2]??'research/animation/legwork-2026-11-15/before';mkdirSync(root,{recursive:true});
const url=process.env.WFM_URL??'http://127.0.0.1:5197';
const rigs=['thesz-procreate-v1','george-roster-v1','kowalski-roster-v1','guido-roster-v1'];
const moves=(process.env.MOVES??'clubBlow,runningForearm,shoulderBlock,mountedPunches,chop,uppercut,backElbow,legSweep,axeHandleBack,bodyStomps').split(',');
const pairs=process.env.PAIR? [process.env.PAIR.split(':')] : process.env.ALL?rigs.flatMap(a=>rigs.map(d=>[a,d])):[[rigs[0],rigs[1]],[rigs[1],rigs[0]],[rigs[2],rigs[3]],[rigs[3],rigs[2]]];
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1000,height:700}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let results=process.env.RESUME&&existsSync(`${root}/summary.json`)?JSON.parse(readFileSync(`${root}/summary.json`)).results:[];
for(const [a,d] of pairs.filter(([a])=>!process.env.ATTACKER||a===process.env.ATTACKER))for(const facing of [1,-1])for(const move of moves){
 if(results.some(r=>r.a===a&&r.d===d&&r.facing===facing&&r.move===move))continue;
 await page.goto(`${url}/?arena=1&notitle=1&light=v1&faces=0&p1=${a}&p2=${d}`);await page.waitForFunction(()=>window.__WFM_GAME?.scene.scenes[0]?.w2,{},{timeout:90000});
 await page.evaluate('window.__legContact = '+POINTS.toString());
 await page.evaluate(({move,facing,probe})=>{
 window.__legProbe=probe;
 const g=window.__WFM_GAME,sc=g.scene.scenes[0];g.loop.sleep();sc._p1AI=sc._p2AI=null;sc.tweens.getDelta=()=>1000/60;let T=sc.time.now;
 window.__legStep=()=>{T+=1000/60;g.step(T,1000/60)};
 const A=sc.w1,D=sc.w2;for(const w of [A,D]){w.scene.tweens.killTweensOf(w);w.scene.tweens.killTweensOf(w.pose);w._cancelActiveMove('audit');w.state='standing';w.stateTimer=0;w.y=350;w.vx=w.vy=0;w.stamina=100;w.wear=0;w.lying=null;w.input={justDown:()=>false,isDown:()=>false};}
 A.x=450;D.x=450+facing*80*A.s;A.facing=facing;D.facing=-facing;for(let i=0;i<4;i++)window.__legStep();
 if(move==='mountedPunches'||move==='bodyStomps'){D.state='down';D.lying=move==='mountedPunches'?'supine':'prone';D.facing=move==='mountedPunches'?-facing:facing;D.stateTimer=99;}
 if(move==='backElbow'){D.state='running';D.runPhase='returning';D.runFacing=-facing;D.runTarget=A.x-facing*400;D.x=A.x+facing*110*A.s;}
 if(move==='runningForearm'){A.state='running';A.runPhase='returning';A.runFacing=facing;D.x=A.x+facing*110*A.s;}
 if(move==='axeHandleBack'){D.startStagger();for(let i=0;i<6;i++)window.__legStep();}
 for(let i=0;i<2;i++)window.__legStep();
 window.__legRows=[];window.__legHits=[];window.__legFrame=0;const hurt=D._hurt.bind(D);D._hurt=(...args)=>{window.__legHits.push(window.__legFrame);return hurt(...args)};
 A['_do'+move[0].toUpperCase()+move.slice(1)](D);window.__legHandle=A._activeMove;
 window.__legSample=()=>{
 const row={f:window.__legFrame,t:window.__legFrame/60};
 for(const [name,w] of [['a',A],['d',D]]){const sk=w.skeleton,P=sk.jointAttachmentPoints??{},J=sk._jointState??{};const points={};for(const side of ['near','far'])for(const part of ['Hip','Knee','Ankle']){const p=P[side+part];if(p)points[side+part]=[p.x,p.y];}
 row[name]={state:w.state,lying:w.lying,x:w.x,y:w.y,scale:w.s,pose:{...w.pose},points,feet:[sk.soleWorld('near'),sk.soleWorld('far')],knees:[J.lKnee,J.rKnee]};}
 row.contact=window.__legContact(window.__legProbe).dist;window.__legRows.push(row);
 };
 },{move,facing,probe:move==='mountedPunches'?{probe:'fists',target:'face'}:move==='bodyStomps'?{probe:'ankle',target:'chest'}:PROBES[move]});
 const snaps=[];
 for(let f=0;f<210;f+=3){
 const state=await page.evaluate(()=>{let hit=false;for(let n=0;n<3;n++){window.__legStep();window.__legFrame++;window.__legSample();hit ||= window.__legHits.includes(window.__legFrame)||window.__legHits.includes(window.__legFrame-1);}return {done:!window.__WFM_GAME.scene.scenes[0].w1._activeMove,hit}});
 if(process.env.SHOTS!=='0'&&facing===1&&((a===rigs[0]&&d===rigs[1])||(move==='mountedPunches'&&a===rigs[1]))&&(f===21||state.hit&&snaps.length<5||f===129)){
 const file=`${move}-${a.split('-')[0]}-${f}.png`;await page.screenshot({path:`${root}/${file}`});snaps.push(file);
 }
 if(state.done&&f>150)break;
 }
 const data=await page.evaluate(()=>({rows:window.__legRows,hits:window.__legHits,plants:window.__legHandle?.plantLog??[]}));
 const metrics={};for(const role of ['a','d']){let minK=Infinity,maxK=-Infinity,slide=0,air=0,penetration=0,stretch=0;const lens={};let prev=null;
 for(const row of data.rows){const w=row[role];for(const k of w.knees.filter(Number.isFinite)){minK=Math.min(minK,k);maxK=Math.max(maxK,k)}
 for(let i=0;i<2;i++){const foot=w.feet[i];if(!foot)continue;const gap=foot.y-w.y;if(!w.lying&&w.state!=='falling'){air=Math.max(air,-gap);penetration=Math.max(penetration,gap)}if(prev&&!w.lying&&Math.abs(gap)<3&&prev.feet[i]&&Math.abs(prev.feet[i].y-prev.y)<3)slide=Math.max(slide,Math.hypot(foot.x-prev.feet[i].x,foot.y-prev.feet[i].y));}
 for(const side of ['near','far'])for(const [p,q] of [['Hip','Knee'],['Knee','Ankle']]){const x=w.points[side+p],y=w.points[side+q];if(!x||!y)continue;const l=Math.hypot(x[0]-y[0],x[1]-y[1])/w.scale;const key=side+p;lens[key]??=[];lens[key].push(l);}
 prev=w;}
 for(const l of Object.values(lens)){const sorted=l.filter(v=>v>.1).sort((a,b)=>a-b);if(sorted.length)stretch=Math.max(stretch,sorted.at(-1)/sorted[0]);}
 metrics[role]={kneeRange:[minK,maxK],maxGroundedSoleSlide:slide,maxSoleAboveRoot:air,maxSoleBelowRoot:penetration,segmentMaxMinRatio:stretch};}
 const hitMisses=data.hits.map(f=>Math.min(...data.rows.filter(r=>Math.abs(r.f-f)<=1).map(r=>r.contact)));
 const out={move,a,d,facing,hits:data.hits,hitMisses,metrics,snaps,plantMax:data.plants.length?Math.max(...data.plants.map(p=>p.err)):null};results.push(out);writeFileSync(`${root}/${move}-${a.split('-')[0]}-${d.split('-')[0]}-${facing}.json`,JSON.stringify(data));
 writeFileSync(`${root}/summary.json`,JSON.stringify({results,errors},null,2));console.log(move,a.split('-')[0],d.split('-')[0],facing,'hits',data.hits.length,'knees',JSON.stringify(metrics.a.kneeRange),'slide',metrics.a.maxGroundedSoleSlide.toFixed(1));
}
await browser.close();console.log('done',results.length,'errors',errors.length);
