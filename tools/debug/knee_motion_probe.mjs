// Reproducible filter-free motion evidence through the real Skeleton renderer.
// Measures actual transformed PNG alpha, not display rectangles or closest ink.
import { launch } from './harness.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const character = process.argv[2] ?? 'thesz-procreate-v1';
const out = path.resolve(process.argv[3] ?? `tools/debug/shots/knee-motion/${character}`);
await mkdir(out, { recursive: true });
process.env.WFM_P1 = character;
process.env.WFM_P2 = character === 'george' ? 'thesz' : 'george';
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1);
    const result = await h.page.evaluate(async () => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause();
        const w = sc.w1, sk = w.skeleton;
        const { POSES } = await import('/src/Wrestler.js');
        const pose = { ...(POSES[w.idlePose] ?? w.pose) };
        sk.setVisible(true);
        const scale = w.s * (w.heightScale ?? w._heightScale ?? 1);
        const samples = [];
        const canv = document.createElement('canvas');
        canv.width = 640; canv.height = 640;
        const ctx = canv.getContext('2d', { willReadFrequently: true });
        function draw(img, context = ctx) {
            if (!img?.texture || !img.visible) return;
            const m = img.getWorldTransformMatrix(), f = img.frame;
            context.save();
            context.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
            context.translate(-img.displayOriginX, -img.displayOriginY);
            if (img.flipX) { context.translate(f.cutWidth, 0); context.scale(-1, 1); }
            if (img.flipY) { context.translate(0, f.cutHeight); context.scale(1, -1); }
            context.drawImage(img.texture.getSourceImage(), f.cutX, f.cutY,
                f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
            context.restore();
        }
        function jointWorld(img, frac) {
            const f = img.frame;
            const x = (img.flipX ? 1-frac.u : frac.u)*f.cutWidth-img.displayOriginX;
            const y = frac.v*f.cutHeight-img.displayOriginY;
            const m=img.getWorldTransformMatrix();
            return {x:m.a*x+m.c*y+m.tx,y:m.b*x+m.d*y+m.ty};
        }
        function measure(side) {
            ctx.clearRect(0,0,640,640);
            const thigh=sk[`${side}Thigh`], shin=sk[`${side}Shin`];
            draw(thigh); draw(shin);
            const joint=sk.jointAttachmentPoints[`${side}Knee`];
            const d=ctx.getImageData(0,0,640,640).data;
            const ink=(x,y,t=200)=>x>=0&&x<640&&y>=0&&y<640&&d[(y*640+x)*4+3]>=t;
            let holes=0, weak=0, verticalSlitPixels=0;
            const radius=18;
            for(let y=Math.round(joint.y-radius);y<=Math.round(joint.y+radius);y++)
                for(let x=Math.round(joint.x-radius);x<=Math.round(joint.x+radius);x++) {
                    if(ink(x,y)) continue;
                    // Local enclosed/narrow exterior notch: bracketed by leg ink
                    // horizontally AND vertically within 6 world pixels.
                    let l=false,r=false,u=false,b=false;
                    for(let k=1;k<=6;k++){l ||= ink(x-k,y);r ||= ink(x+k,y);u ||= ink(x,y-k);b ||= ink(x,y+k);}
                    if(u&&b) verticalSlitPixels++;
                    if(l&&r&&u&&b) { holes++; if(ink(x,y,16)) weak++; }
                }
            const proximal=jointWorld(shin,{u:.5+(shin._pivotOffsetFrac??0)*(1-(shin._jointPivotFrac??0)),v:shin._jointPivotFrac??0});
            const distal=thigh._distalAnchorFrac ? jointWorld(thigh,thigh._distalAnchorFrac):null;
            return {holesAlpha200:holes,weakAlphaPixels:weak,verticalSlitPixels,
                paintedAnchorSeparation:distal?Math.hypot(distal.x-proximal.x,distal.y-proximal.y):null,
                knee:joint,thighRotation:thigh.rotation,shinRotation:shin.rotation};
        }
        function capture() {
            ctx.clearRect(0,0,640,640);
            for(const img of [...sk._parts].sort((a,b)=>a.depth-b.depth)) draw(img);
            return canv.toDataURL('image/png');
        }
        const modes=[['walk',1,.5,0],['run',1,1,1],['stop',.21,.5,0],['idle',0,.5,0]];
        const sheets=[];
        for(const facing of [1,-1]) for(const [mode,blend,lift,run] of modes) {
            const sheet=document.createElement('canvas');sheet.width=2400;sheet.height=440;
            const c=sheet.getContext('2d');c.fillStyle='#52606c';c.fillRect(0,0,2400,440);
            const kneeSheet=document.createElement('canvas');kneeSheet.width=2400;kneeSheet.height=440;
            const kc=kneeSheet.getContext('2d');kc.fillStyle='#52606c';kc.fillRect(0,0,2400,440);
            let worst=null;
            for(let i=0;i<96;i++) {
                sk.updateUpright(320,400,scale,facing,pose,i*Math.PI*2/96,0,0,blend,lift,run);
                const sample={facing,mode,phase:i,near:measure('near'),far:measure('far')};
                samples.push(sample);
                const score=Math.max(sample.near.verticalSlitPixels,sample.far.verticalSlitPixels);
                if(!worst||score>worst.score) worst={score,sample,png:capture()};
                if(i%8===0) {
                    capture();
                    c.drawImage(canv,270,190,100,210,(i/8)*200,0,200,420);
                    c.fillStyle='white';c.font='12px monospace';c.fillText(String(i),i/8*200+5,435);
                    for(const [row,side] of ['near','far'].entries()) {
                        const p=sample[side].knee;
                        kc.drawImage(canv,p.x-20,p.y-20,40,40,(i/8)*200,row*220,200,200);
                    }
                }
            }
            sheets.push({name:`${mode}-${facing}`,png:sheet.toDataURL('image/png'),knees:kneeSheet.toDataURL('image/png'),worst});
        }
        return {scale,pose,samples,sheets};
    });
    for (const s of result.sheets) {
        await writeFile(path.join(out,`${s.name}.png`),Buffer.from(s.png.split(',')[1],'base64'));
        await writeFile(path.join(out,`${s.name}-knees.png`),Buffer.from(s.knees.split(',')[1],'base64'));
        await writeFile(path.join(out,`${s.name}-worst.png`),Buffer.from(s.worst.png.split(',')[1],'base64'));
        console.log(JSON.stringify({character,condition:s.name,worst:s.worst.sample}));
        delete s.png; delete s.knees; delete s.worst.png;
    }
    await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');
    await h.page.waitForTimeout(9000);
    await h.page.evaluate(() => {
        const sc=window.__WFM_GAME.scene.scenes[0],w=sc.w1;
        w.x=320;w.y=360;w.state='standing';w.moveBlend=1;w.walkPhase=Math.PI/2;
        w.draw();
    });
    await h.screenshot(path.join(out,'game-broadcast.png'));
    await h.page.evaluate(() => {
        const sc=window.__WFM_GAME.scene.scenes[0];
        sc.cameras.main.filters.internal.clear();
        sc.cameras.main.filters.external.clear();
        for(const c of sc.children.list) if(c.texture?.key==='scanlines') c.setVisible(false);
    });
    await h.screenshot(path.join(out,'game-no-scanlines.png'));
    await h.page.evaluate(() => {
        const sc=window.__WFM_GAME.scene.scenes[0];
        for(const g of [...(sc.nearRopeBands??[]),...(sc.sideRopeBands??[])]) g.setVisible(false);
    });
    await h.screenshot(path.join(out,'game-no-front-ropes.png'));
} finally { await h.close(); }
