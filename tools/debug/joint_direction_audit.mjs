// Rendered-chain diagnostic, not an anatomical certification. Run with Node 22.
// WFM_URL=http://127.0.0.1:5173 node tools/debug/joint_direction_audit.mjs <out.json>
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    const page = await browser.newPage();
    await page.goto(`${process.env.WFM_URL ?? 'http://127.0.0.1:5173'}/tools/move-editor/`);
    await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
    const result = await page.evaluate(async () => {
        const { REGISTERED_MOVE_CLIPS } = await import('/src/animation/clips/index.js');
        const { sampleClip, compileClip } = await import('/src/animation/AnimationClip.js');
        const { SELLS, clutchSell, sampleSell, applyOffsets } = await import('/src/animation/sells.js');
        const { default: Skeleton } = await import('/src/Skeleton.js');
        const { POSES } = await import('/src/Wrestler.js');
        const E = window.__MOVE_EDITOR;
        const rows = [];
        const angle = (a, b) => Math.atan2(b.x - a.x, b.y - a.y);
        const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
        for (const cast of ['thesz-procreate-v1', 'thesz', 'george']) {
            const draft = JSON.parse(JSON.stringify(E.draft));
            draft.preview = { ...draft.preview, characters: { attacker: cast, defender: 'george' } };
            await E.adoptDraft(draft);
            if (E.actors.attacker.character !== cast) throw new Error(`Editor did not load ${cast}`);
            const sk = E.actors.attacker.skeleton;
            const measure = (id, role, t, pose, facing, draw = null) => {
                if (draw) draw();
                else sk.updateUpright(500, 500, 0.8, facing, { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, ...pose }, 0, 0, 0, 0);
                const p = sk.jointAttachmentPoints;
                for (const side of ['near', 'far']) for (const [joint, names] of [['elbow', ['Shoulder','Elbow','Wrist']], ['knee', ['Hip','Knee','Ankle']]]) {
                    const [a,b,c] = names.map(n => p[side+n]);
                    if (!a || !b || !c) continue;
                    const flex = wrap(angle(b,c)-angle(a,b))*facing;
                    rows.push({ cast, id, role, t, facing, side, joint, degrees: flex*180/Math.PI });
                }
            };
            for (const facing of [1,-1]) {
                for (const lying of ['prone','supine']) {
                    for (let i=0;i<=60;i++) measure(`getup:${lying}`,'solo',i/60,{},facing,()=>sk.updateGetUp(500,500,0.8,facing,i/60,lying));
                    const defs = Object.entries(SELLS[lying]).filter(([name])=>name!=='clutch');
                    for (const part of ['head','arm','back','chest','knee']) defs.push([`clutch:${part}`,clutchSell(lying,part,1.2)]);
                    for (const [name,def] of defs) for (let i=0;i<=60;i++) {
                        const u=i/60, turned=def.to && u>=def.swapAt;
                        const ly=turned?def.to:lying, f=turned?-facing:facing;
                        const {d,reach}=sampleSell(turned?def.after:def.keys,u,1.3);
                        const hands=Object.fromEntries(Object.entries(reach).map(([side,w])=>[side,{to:def.hands[side],w}]));
                        const g=applyOffsets(Skeleton.GROUNDED_POSES[ly],d);
                        measure(`sell:${lying}:${name}`,'solo',u,{},f,()=>sk.updateGroundedReach(500,500,0.8,f,g,hands));
                    }
                }
                for (const [id, pose] of Object.entries(POSES)) measure(`pose:${id}`, 'solo', 0, pose, facing);
                for (const source of REGISTERED_MOVE_CLIPS) {
                    const clip = source._compiled ? source : compileClip(source);
                    for (let i=0; i<=Math.ceil(clip.duration*60); i++) {
                        const t = Math.min(clip.duration, i/60);
                        for (const [role,state] of Object.entries(sampleClip(clip,t).tracks)) measure(clip.id,role,t,state.pose,facing*(state.facing??1));
                    }
                }
            }
        }
        const groups = {};
        for (const r of rows) {
            const key = [r.cast,r.id,r.role,r.joint].join('/');
            const g = groups[key] ??= { cast:r.cast,id:r.id,role:r.role,joint:r.joint,min:r,max:r };
            if (r.degrees<g.min.degrees) g.min=r;
            if (r.degrees>g.max.degrees) g.max=r;
        }
        return { scope:'Rendered joint-point sweep: upright clips at 60Hz, get-ups and grounded sells at 61 normalized samples (sell amplitude 1.3). No executor travel, post-draw paired grip IK or visual approval. Signed angles are projection directions, not anatomical verdicts.', samples:rows.length, groups:Object.values(groups) };
    });
    writeFileSync(process.argv[2] ?? '/tmp/joint-direction-audit.json', JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({ samples:result.samples,groups:result.groups.length }));
} finally { await browser.close(); }
