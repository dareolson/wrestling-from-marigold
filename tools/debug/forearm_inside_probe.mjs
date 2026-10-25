// D11 (PLAN_GEORGE_TRANSFER T8.4): how many forearm pixels are visibly drawn INSIDE the torso's painted silhouette while the
// hand is behind the body, and what the torso-alpha mask costs per frame. Rendered, not computed: for each state the real
// Wrestler.draw puts the hand under, then the canvas is screenshotted with the near forearm visible (twice, to find the
// canvas's own per-frame speckle) and hidden; the pixels that change when the forearm is hidden (minus the speckle) are the
// forearm's visible pixels, each mapped through the camera back to world space and looked up in the torso's alpha
// (rig/silhouette.js, alpha >= 128, and the painted interior alpha >= 250: the edge pixels of any torso are partly transparent). Reported per state and mode: 'mask' (the Rev 3 D11 torso mask, forearm at its own depth) and
// 'depth' (the Rev 2 order, forearm behind the torso), plus the elbow's distance outside the art.
//   WFM_URL=http://127.0.0.1:5173 WFM_P1=george-roster-v1 node tools/debug/forearm_inside_probe.mjs [out.json] [outDir for the shots]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';

process.env.WFM_P1 ??= 'george-roster-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const out = process.argv[2] ?? null, shotDir = process.argv[3] ?? null;
if (shotDir) mkdirSync(shotDir, { recursive: true });
const ZOOM = 3;
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton?.torso, null, { timeout: 30000 });
    await h.page.evaluate(async () => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        window.__sil = await import('/src/rig/silhouette.js');
        window.__POSES = (await import('/src/Wrestler.js')).POSES;
    });
    const STATES = [
        ['hold', f => ({ state: 'down', lying: 'supine', hold: { t: 1, lying: 'supine' }, reach: 0.7 })],
        ['clutch u.5', f => ({ state: 'down', lying: 'supine', sell: { u: 0.5, dur: 1.38 } })],
        ['rise .4', f => ({ state: 'gettingUp', lying: 'supine', riseT: 0.4, reach: 0.9 })],
        ['standing hw 1', f => ({ state: 'standing', hw: 1 })],
        ['standing hw .6', f => ({ state: 'standing', hw: 0.6 })],
        ['standing hw .5', f => ({ state: 'standing', hw: 0.5 })],
    ];
    const res = {};
    for (const mode of ['mask', 'depth']) for (const facing of [1, -1]) for (const [name, spec] of STATES) {
        const key = `${mode} ${name} facing ${facing}`;
        const info = await h.page.evaluate(({ spec, facing, mode, ZOOM }) => {
            const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1, sk = w.skeleton;
            if (sc.w2) { sc.w2.setVisible?.(false); sc.w2.x = -500; }
            sk._forearmOverUpperArm = mode === 'mask';
            sc.__marks?.destroy(); sc.__marks = null;
            w.x = 400; w.y = 430; w.facing = facing; w._sell = null; w._pain = null; w._hold = null; w._gripLatch = null; w._activeMove = null;
            w.combatBlend = 0.65; w._handUnderNow = true; w._handPending = false;
            w.state = spec.state; w.lying = spec.lying ?? null;
            if (spec.hold) w._hold = spec.hold;
            if (spec.sell) w._sell = { plan: [{ name: 'clutch', part: 'back', lying: 'supine', limb: null, rolls: 0, duration: spec.sell.dur, amp: 1.3 }], i: 0, t: spec.sell.u * spec.sell.dur, facing0: facing };
            if (spec.state === 'gettingUp') {
                w.riseT = spec.riseT; w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'rise', since: 1000, until: 9000, planned: true, carry: true };
                w._riseFrom = 0.7;
            }
            if (spec.state === 'standing') {
                const since = 20000, until = since + 2500;
                // pick the time at which the recovery hand weight is spec.hw (hw = ramp * (1 - (1 - left)^2); ramp 1 after 200 ms)
                const left = 1 - Math.sqrt(1 - Math.min(0.9999, spec.hw)); const now = until - left * (until - since);
                w._pain = { source: 'suplex', part: 'back', limb: null, severity: 1, phase: 'recover', since, until, planned: true, carried: 1, riseEnd: { arm: 0.3, elbow: 1.1 } };
                sc.time.now = spec.hw >= 0.9999 ? since + 400 : now;
                const idle = window.__POSES[w.idlePose] ?? window.__POSES.idle;
                w.tweenPose?.('idle', 0, 'Linear');
                for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) w.pose[k] = idle[k] ?? 0;
            }
            for (let i = 0; i < 3; i++) { if (spec.reach !== undefined) sk._backReachW = spec.reach; w._gripLatch = { on: true, since: 0 }; w.draw(); }
            const cam = sc.cameras.main; cam.setZoom(ZOOM);
            const wp = sk.backWaistPoint(); cam.centerOn(wp.x - facing * 10, wp.y - 5);
            return { under: sk.nearForearm.depth < sk.torso.depth, masked: !!sk.nearForearm._torsoMask?.active, forearmDepth: sk.nearForearm.depth, torsoDepth: sk.torso.depth,
                elbowClr: +window.__sil.silhouetteDistance(sk.torso, sk.jointAttachmentPoints.nearElbow, window.__sil.silhouetteOf(sk.torso)).toFixed(2), handUnder: sk._handUnder };
        }, { spec: spec(facing), facing, mode, ZOOM });
        const clip = { x: 100, y: 100, width: 900, height: 500 };
        const shot = async () => { await h.page.waitForTimeout(120); return (await h.page.screenshot({ clip })).toString('base64'); };
        const s1 = await shot(), s2 = await shot();
        await h.page.evaluate(() => window.__WFM_GAME.scene.scenes[0].w1.skeleton.nearForearm.setVisible(false));
        const s3 = await shot();
        await h.page.evaluate(() => window.__WFM_GAME.scene.scenes[0].w1.skeleton.nearForearm.setVisible(true));
        if (shotDir) { const { writeFileSync: wf } = await import('node:fs'); wf(join(shotDir, `${key.replace(/[ .]/g, '_')}.png`), Buffer.from(s1, 'base64')); }
        const count = await h.page.evaluate(async ({ s1, s2, s3, clip }) => {
            const sc = window.__WFM_GAME.scene.scenes[0], sk = sc.w1.skeleton, cam = sc.cameras.main, g = window.__WFM_GAME.scale.gameSize;
            const box = document.querySelector('canvas').getBoundingClientRect();
            const load = async b64 => { const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const x = c.getContext('2d'); x.drawImage(bmp, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
            const [A, B, C] = await Promise.all([load(s1), load(s2), load(s3)]);
            const sil = window.__sil.silhouetteOf(sk.torso), deepSil = window.__sil.silhouetteOf(sk.torso, 250);
            // how deep inside the painted art a leaked pixel is: the distance to the nearest NOT painted pixel (the inverted alpha's field)
            if (!window.__inv) {
                const src = sk.torso.texture.getSourceImage(), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
                const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(src, 0, 0); const d = cx.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
                for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] >= 128 ? 0 : 255;
                window.__inv = window.__sil.buildSilhouette(c.width, c.height, a, { threshold: 128, pad: 8 });
            }
            const toWorld = (px, py) => { const gx = (clip.x + px - box.x) * g.width / box.width, gy = (clip.y + py - box.y) * g.height / box.height; return cam.getWorldPoint(gx, gy); };
            let forearm = 0, inside = 0, deep = 0, noisy = 0, maxDepth = 0; const leaks = [];
            const lum = (d, i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
            for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
                const i = (y * A.width + x) * 4;
                if (Math.abs(lum(A.data, i) - lum(B.data, i)) > 25) { noisy++; continue; }
                if (Math.abs(lum(A.data, i) - lum(C.data, i)) <= 25) continue;
                forearm++;
                const p = toWorld(x + 0.5, y + 0.5);
                if (window.__sil.silhouetteDistance(sk.torso, p, sil) === 0) { leaks.push(x, y); inside++; maxDepth = Math.max(maxDepth, window.__sil.silhouetteDistance(sk.torso, p, window.__inv)); }
                if (window.__sil.silhouetteDistance(sk.torso, p, deepSil) === 0) deep++;
            }
            return { forearmPx: forearm, insideTorsoPx: inside, insidePaintedInteriorPx: deep, leaks, maxDepthInsideGamePx: +maxDepth.toFixed(2), speckle: noisy };
        }, { s1, s2, s3, clip });
        if (shotDir && count.leaks.length) {
            const { execFileSync } = await import('node:child_process');
            const f = join(shotDir, `${key.replace(/[ .]/g, '_')}.png`);
            execFileSync('python3', ['-c', `import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGB')\nL=list(map(int,sys.argv[2].split(',')))\nfor i in range(0,len(L),2): im.putpixel((L[i],L[i+1]),(255,0,0))\nim.save(sys.argv[1].replace('.png','-leaks.png'))`, f, count.leaks.join(',')]);
        }
        delete count.leaks;
        res[key] = { ...info, ...count };
    }
    // the cost: whole frames with two George wrestlers behind-the-body, masks on vs off
    const cost = await h.page.evaluate(async () => {
        const g = window.__WFM_GAME, sc = g.scene.scenes[0];
        const cam = sc.cameras.main; cam.setZoom(1); cam.centerOn(400, 380);
        const ws = [sc.w1, sc.w2];
        ws[1].setVisible?.(true); ws[1].x = 560;
        for (const w of ws) {
            w.x = w === sc.w1 ? 400 : 560; w.y = 430; w.facing = 1; w.lying = 'supine'; w.state = 'down'; w._sell = null; w._pain = null; w._hold = { t: 1, lying: 'supine' }; w._handUnderNow = true;
            w.skeleton._forearmOverUpperArm = true; w.skeleton._backReachW = 0.7; w.draw();
        }
        const run = n => { const t0 = performance.now(); let T = 5e6 + (window.__T = (window.__T ?? 0) + 1e6); for (let i = 0; i < n; i++) { T += 16.7; for (const w of ws) { w.skeleton._backReachW = 0.7; w._handUnderNow = true; w._hold = { t: 1, lying: 'supine' }; w.draw(); } g.step(T, 16.7); } return (performance.now() - t0) / n; };
        const modes = { mask: () => ws.forEach(w => { w.skeleton._forearmOverUpperArm = true; }), depth: () => ws.forEach(w => { w.skeleton._forearmOverUpperArm = false; }) };
        const samples = { mask: [], depth: [] };
        run(60);
        for (let round = 0; round < 4; round++) for (const m of ['mask', 'depth']) { modes[m](); await new Promise(r => setTimeout(r, 50)); samples[m].push(run(200)); }
        const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
        return { msPerFrameMask: +mean(samples.mask).toFixed(2), msPerFrameDepth: +mean(samples.depth).toFixed(2), roundsMask: samples.mask.map(v => +v.toFixed(2)), roundsDepth: samples.depth.map(v => +v.toFixed(2)),
            note: 'headless Chrome (software GL), whole game.step incl. both Wrestler.draw, 2 George wrestlers each with the hand behind the body' };
    });
    res.cost = cost;
    for (const [k, v] of Object.entries(res)) {
        if (k === 'cost') { console.log('cost', JSON.stringify(v)); continue; }
        console.log(`${k.padEnd(28)} behind-by-depth ${v.under ? 1 : 0} masked ${v.masked ? 1 : 0} elbow ${v.elbowClr} px out | forearm px ${v.forearmPx} inside torso art (alpha>=128) ${v.insideTorsoPx}, painted interior (alpha>=250) ${v.insidePaintedInteriorPx} max depth inside the art ${v.maxDepthInsideGamePx} game px (speckle excluded ${v.speckle})`);
    }
    if (out) writeFileSync(out, JSON.stringify(res, null, 1));
} finally { await h.close(); }
