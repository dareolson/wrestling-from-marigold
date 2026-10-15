// Isolated proof: WFM_URL=http://127.0.0.1:5217 node tools/debug/move_participation_proof.mjs <output.json>
import { launch } from './harness.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
const output = process.argv[2] ?? '/tmp/marigold-participation-proof.json';
const reports = [];
for (const character of ['george','thesz','thesz-procreate-v1']) {
    process.env.WFM_P1 = character; process.env.WFM_P2 = character === 'george' ? 'thesz' : 'george';
    const h = await launch();
    try {
        await h.page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w1);
        reports.push(await h.page.evaluate(async character => {
            const { measureJoints } = await import('/tools/debug/jointInk.js');
            const { REGISTERED_MOVE_CLIPS } = await import('/src/animation/clips/index.js');
            const { POSES } = await import('/src/Wrestler.js');
            const sc = window.__WFM_GAME.scene.scenes[0]; sc.scene.pause();
            const reset = () => {
                sc.moveRuntime.shutdown(); sc.tweens.killAll();
                for (const clip of REGISTERED_MOVE_CLIPS) sc.moveRuntime.register(clip);
                for (const [i,w] of [sc.w1,sc.w2].entries()) {
                    Object.assign(w, { state: 'standing', pose: { ...POSES[w.idlePose] }, x: 450+i*75,y:400,
                        facing: i ? -1:1, moveBlend:0, combatBlend:0,walkPhase:0,stamina:100,_fixedHold:false,
                        _choreoUntil:0,_activeMove:null, vx:0,vy:0 });
                    w.skeleton.setPartVariants({});
                }
            };
            const summarize = (w, worst, time, role) => {
                w.draw();
                for (const [joint,m] of Object.entries(measureJoints(w.skeleton))) for (const metric of ['childError','parentError','inkGap','uncoveredCorePixels']) {
                    if (m[metric] === null) continue;
                    const key = role+'.'+joint+'.'+metric;
                    if (!worst[key] || m[metric] > worst[key].value) worst[key] = { value:m[metric],time };
                }
            };
            const clips = [];
            for (const clip of REGISTERED_MOVE_CLIPS) for (const facing of [-1,1]) {
                reset();sc.w1.facing=facing;sc.w2.facing=-facing;
                const actors = { attacker:sc.w1,defender:sc.w2 };
                const handle = sc.moveRuntime.play(clip.id,actors);sc.w1._activeMove=handle;
                if (clip.tracks.defender) sc.w2._activeMove=handle;
                const worst={};let frames=0;
                const times=new Set([0,clip.duration]);
                for(let t=0;t<clip.duration;t+=1/60)times.add(t);
                for(const tr of Object.values(clip.tracks))for(let i=0;i<tr.keyframes.length;i++){
                    times.add(tr.keyframes[i].at);if(i)times.add((tr.keyframes[i-1].at+tr.keyframes[i].at)/2);
                }
                for(const t of [...times].sort((a,b)=>a-b)){
                    sc.moveRuntime.seek(handle,t);
                    for(const role of Object.keys(clip.tracks))summarize(actors[role],worst,t,role);
                    frames++;
                }
                clips.push({id:clip.id,facing,frames,worst});
            }
            const participation=[];
            for(const method of ['_doHammerlock','_doSuplex','_doDropkick','_doJab'])for(const slot of [0,1])for(const facing of [-1,1]){
                reset();const a=slot?sc.w2:sc.w1,b=slot?sc.w1:sc.w2;
                a.facing=facing;b.facing=-facing;
                for(const w of [a,b]){w.moveBlend=1;w.walkPhase=1.3;w.combatBlend=1;w.tweenPose('block',1500);}
                // Receiver was still performing its own jab when the grapple began.
                if(method==='_doHammerlock'||method==='_doSuplex')b._doJab(a);
                a[method](b);
                const primary=a._activeMove;const worst={};let duplicateOwners=0;
                const originalDelta=sc.tweens.getDelta;sc.tweens.getDelta=()=>1000/60;
                try{
                    for(let i=0;i<190;i++){
                        sc.tweens.step(true);sc.moveRuntime.update(1/60);
                        for(const [role,w]of [['attacker',a],['defender',b]]){
                            const owners=[...sc.moveRuntime._active.values()].filter(h=>Object.values(h.bindings).includes(w));
                            duplicateOwners=Math.max(duplicateOwners,owners.length);
                            summarize(w,worst,i/60,role);
                        }
                        if(i>2&&!sc.moveRuntime._active.has(primary?.id))break;
                    }
                }finally{sc.tweens.getDelta=originalDelta;}
                participation.push({method,slot,facing,duplicateOwners,worst,states:[a.state,b.state]});
            }
            const postures=[];
            for(const facing of [-1,1])for(const mode of ['supine','prone','getup-supine','getup-prone','fall-flip','fall-backward']){
                reset();const w=sc.w1;w.facing=facing;const worst={};
                for(let i=0;i<=48;i++){
                    const t=i/48;
                    if(mode.startsWith('getup-')){w.state='gettingUp';w.lying=mode.slice(6);w.riseT=t;}
                    else if(mode.startsWith('fall-')){w.state='falling';w._fallVariant=mode.slice(5);w.fallProgress=t;}
                    else{w.state='down';w.lying=mode;}
                    summarize(w,worst,t,'actor');
                }
                postures.push({mode,facing,worst});
            }
            return {character,clips,participation,postures};
        }, character));
        console.log(character,'complete');
    } finally { await h.close(); }
}
await writeFile(output,JSON.stringify({method:'60Hz clip sample sweep + real four-pilot executors from moving/recovering state; independent final image transforms and alpha',reports},null,2));
const errors=[];
for(const r of reports){
    let maxChild=0,maxParent=0,maxGap=0,maxUncoveredCore=0;
    for(const row of [...r.clips,...r.participation,...r.postures])for(const [key,m]of Object.entries(row.worst)){
        if(key.endsWith('childError'))maxChild=Math.max(maxChild,m.value);
        if(key.endsWith('parentError'))maxParent=Math.max(maxParent,m.value);
        if(key.endsWith('inkGap'))maxGap=Math.max(maxGap,m.value);
        if(key.endsWith('uncoveredCorePixels'))maxUncoveredCore=Math.max(maxUncoveredCore,m.value);
    }
    for(const row of r.participation)if(row.duplicateOwners>1)errors.push(`${r.character}/${row.method}: competing clips`);
    if(maxChild>0.1||maxParent>0.1||maxGap>0||maxUncoveredCore>0)errors.push(`${r.character}: child=${maxChild} parent=${maxParent} ink=${maxGap}`);
    console.log(JSON.stringify({character:r.character,maxChild,maxParent,maxGap,maxUncoveredCore}));
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
