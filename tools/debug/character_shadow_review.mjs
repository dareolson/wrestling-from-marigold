// Focused browser regression: per-actor cast survives a real falling elbow;
// final rendered body pixels are unchanged when the mat shadow is toggled.
// WFM_URL=... WFM_QS='shadows=v1&shadowAngle=reference' node tools/debug/character_shadow_review.mjs
import { launch } from './harness.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.argv[2] ?? 'research/animation/character-shadows-2026-11-25/review';
await mkdir(out, { recursive:true });
process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= 'george-roster-v1';
process.env.WFM_QS ??= 'notitle=1&shadows=v1&shadowAngle=reference&shadowRes=1';   // the review reads the layer at 960x600
const facing = Number(process.env.WFM_SHADOW_FACING ?? 1);
const mode = process.env.WFM_SHADOW_MOVE ?? 'elbow';
const h = await launch();
const errors=[], composites=[];
h.page.on('pageerror',e=>errors.push(e.message));
try {
    await h.page.waitForFunction(()=>window.__WFM_GAME?.scene.scenes[0]?._characterShadowReview);
    // Observe completed render passes, not the previous frame's texture.
    await h.page.evaluate(({facing,mode})=>{
        const scene=window.__WFM_GAME.scene.scenes[0];
        const count=canvas=>{
            const data=canvas.getContext('2d').getImageData(0,0,960,600).data;
            let ink=0; for(let i=3;i<data.length;i+=4)if(data[i]>8)ink++;
            return ink;
        };
        window.__shadowReviewRows=[];
        scene.events.on('prerender',()=>{
            if(!window.__shadowReviewActive)return;
            const layer=scene._characterShadowReview;
            const body=layer.body.getContext('2d').getImageData(0,0,960,600).data;
            const shown=layer.output.getContext('2d').getImageData(0,0,960,600).data;
            let overlap=0;
            for(let i=3;i<body.length;i+=4)if(body[i]===255&&shown[i]>1)overlap++;
            const actors=[scene.w1,scene.w2].map(w=>{
                const cast=layer.actorCast(w), raw=count(cast);
                const ctx=cast.getContext('2d');
                ctx.globalCompositeOperation='destination-out'; ctx.drawImage(layer.body,0,0);
                return {state:w.state,cast:raw,exposed:count(cast),
                    minDepth:Math.min(...w.skeleton._parts.filter(p=>p.visible).map(p=>p.depth))};
            });
            window.__shadowReviewRows.push({actors,overlap,shown:count(layer.output),depth:layer.image.depth});
        });
        const a=scene.w1,b=scene.w2;
        a.x=facing===1?440:520;b.x=facing===1?490:470;a.y=b.y=370;a.facing=facing;b.facing=-facing;
        b._layOnBack(30); scene.timeScale=.4;
        window.__shadowReviewActive=true;
        if(mode==='fall')a.startFall(1);else a._doElbowDrop(b);
    },{facing,mode});
    const captured=new Set();
    for(let n=0;n<70;n++){
        await h.page.waitForTimeout(60);
        const {state,stage}=await h.page.evaluate(()=>{
            const w=window.__WFM_GAME.scene.scenes[0].w1,ga=w._groundAttack;
            let stage=w.state;
            if(w.state==='down')stage=ga?(ga.t<ga.def.timing.fall?'descent':ga.contacted?'contact-rolloff':'ground-approach'):'grounded';
            return {state:w.state,stage};
        });
        if(!captured.has(stage)){
            captured.add(stage);
            await h.page.evaluate(()=>{const s=window.__WFM_GAME.scene.scenes[0];s.scene.pause();s.cameras.main.resetFX();});
            // Allow camera matrices to settle after cancelling impact shake.
            await h.page.waitForTimeout(100);
            const on=await h.page.locator('canvas').screenshot();
            await writeFile(`${out}/${stage}.png`,on);
            const mask=await h.page.evaluate(()=>{
                const l=window.__WFM_GAME.scene.scenes[0]._characterShadowReview;
                l.image.setVisible(false);return l.body.toDataURL();
            });
            await h.page.waitForTimeout(40);
            const off=await h.page.locator('canvas').screenshot();
            composites.push(await h.page.evaluate(async ({on,off,mask,stage})=>{
                const read=async src=>{const image=new Image();image.src=src;await image.decode();
                    const c=document.createElement('canvas');c.width=960;c.height=600;
                    const ctx=c.getContext('2d');ctx.drawImage(image,0,0,960,600);return ctx.getImageData(0,0,960,600).data;};
                const [a,b,m]=await Promise.all([read(on),read(off),read(mask)]);
                let tested=0,changed=0,maxDifference=0;
                // Compare deep interiors; Canvas masks and WebGL rotated quads
                // rasterize edge pixels differently after screenshot scaling.
                const margin=4;
                for(let y=margin;y<600-margin;y++)for(let x=margin;x<960-margin;x++){
                    const i=(y*960+x)*4;if(m[i+3]!==255)continue;
                    let interior=true;
                    for(let dy=-margin;dy<=margin&&interior;dy++)for(let dx=-margin;dx<=margin;dx++)
                        if(m[((y+dy)*960+x+dx)*4+3]!==255){interior=false;break;}
                    if(!interior)continue;
                    tested++;const d=Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])));
                    maxDifference=Math.max(maxDifference,d);if(d>1)changed++;
                }
                return {stage,tested,changed,maxDifference};
            },{on:'data:image/png;base64,'+on.toString('base64'),off:'data:image/png;base64,'+off.toString('base64'),mask,stage}));
            await h.page.evaluate(()=>{const s=window.__WFM_GAME.scene.scenes[0];s._characterShadowReview.image.setVisible(true);s.scene.resume();});
        }
        if(state==='gettingUp')break;
    }
    const rows=await h.page.evaluate(()=>{window.__shadowReviewActive=false;return window.__shadowReviewRows;});
    const summary={mode,facing,frames:rows.length,states:[...new Set(rows.map(r=>r.actors[0].state))],
        minCast:[0,1].map(i=>Math.min(...rows.map(r=>r.actors[i].cast))),
        minExposed:[0,1].map(i=>Math.min(...rows.map(r=>r.actors[i].exposed))),
        maxShadowPixelsUnderBody:Math.max(...rows.map(r=>r.overlap)),
        renderedBodyChecks:composites,
        depthFailures:rows.filter(r=>r.actors.some(a=>a.minDepth<=r.depth)).length,errors};
    await writeFile(`${out}/results.json`,JSON.stringify({summary,rows},null,2));
    console.log(JSON.stringify(summary));
    if(errors.length||summary.minCast.some(n=>n===0)||composites.some(c=>!c.tested||c.changed)||summary.depthFailures
        ||summary.minExposed.some(n=>n===0)
        ||!summary.states.includes(mode==='fall'?'falling':'elbowDropping')||!summary.states.includes('down'))process.exitCode=1;
} finally {await h.close();}
