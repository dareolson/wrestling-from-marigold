// T2.6 (PLAN_GETUPS): George's hand out from the back along a path in space, solved by IK each frame, never below the hem.
// Columns: B (today: via below the hip, channel blend) | R (aroundVia.path: waist -> a point outboard and ABOVE the hem) | RU (R with
// the hand mask and clearance on torso U thighs, T2.7) | BU (today's route with the union, the control for what the mask hides). B and R run with &handUnion=off.
// The data is a runtime patch of the live rig; nothing under src/ names it until Derek picks at G1-rev2.
//
//   node tools/debug/getups_route.mjs [outRoot=research/animation/getups-2026-10/g1-rev2] [cols=B,R]
// Per frame: the hand's lowest sampled point vs the trunks' lower edge (the torso art's last opaque row), the IK error of the
// route (Wrestler._routeErr), the wrist and hand-end step, the hand's distance outside torso / thighs, the depth state.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP } from './rise_handoff_probe.mjs';
import { JOINT_LIMITS } from '../../src/rig/articulation.js';
import { AROUND } from '../../src/rig/backSell.js';

const [outArg = 'research/animation/getups-2026-10/g1-rev2', colArg = 'B,R,RU'] = process.argv.slice(2);
const outRoot = outArg; mkdirSync(outRoot, { recursive: true });
const RIG = 'george-roster-v1', MARGIN_PX = 3;

// the via pose for the channel blend below standW: the smallest swing that puts the wrist within reach of the via, both facings
async function solvePath(extraQs = '') {
    process.env.WFM_P1 = RIG; process.env.WFM_P2 = RIG; process.env.WFM_QS = ['notitle=1', 'getups=v1', extraQs].filter(Boolean).join('&');
    const h = await launch();
    try {
        await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton?.torso, null, { timeout: 30000 });
        const settle = await h.page.evaluate(async () => {
            const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1;
            const { POSES } = await import('/src/Wrestler.js');
            w.state = 'standing'; w.tweenPose('idle', 0, 'Linear');
            const target = POSES[w.idlePose] ?? POSES.idle;
            for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) w.pose[k] = target[k] ?? 0;
            return JSON.parse(JSON.stringify(w.pose));
        });
        return await h.page.evaluate(({ settled, limits, standW, margin }) => {
            const sc = window.__WFM_GAME.scene.scenes[0]; sc.scene.pause(); sc.tweens.pauseAll();
            const w = sc.w1, sk = w.skeleton; w.state = 'standing'; w.x = 400; w.y = 430;
            const base = { ...settled }, s = w.s * (w._heightScale ?? 1), chan = f => (sk.lChannelSide(f) === 'far' ? 'r' : 'l');
            const bs = sk._textureConfig.backSell, today = JSON.parse(JSON.stringify(bs.aroundVia)), anchor = sk.torso._semanticAnchors.backWaist;
            const drawStand = (facing, a, b) => { const n = chan(facing);
                const pose = { ...base, bend: (base.bend ?? 0) + 0.12 * standW, [`${n}Arm`]: (base[`${n}Arm`] ?? 0) + a, [`${n}Elbow`]: base[`${n}Elbow`] + b };
                sk.updateUpright(400, 430, s, facing, pose, 0, 0, facing * (pose.lean ?? 0), 0, 0.5, 0); };
            drawStand(1, 0, 0);
            const smp = sk.nearHandSamples(), fist = Math.hypot(smp.handEnd.x - smp.wrist.x, smp.handEnd.y - smp.wrist.y), th = sk.torso.displayHeight, tw = sk.torso.displayWidth;
            // the hem: the torso art's last opaque row
            const src = sk.torso.texture.getSourceImage(), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
            const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
            let row = -1; for (let y = c.height - 1; y >= 0 && row < 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 128) { row = y; break; }
            const hemV = (row + 1) / c.height;
            // path point: 1.5 hand lengths outboard of the waist, the wrist high enough that the hand's END (a hand length below
            // the wrist at worst) stays `margin` px above the hem
            const via = { u: +(anchor.u - 1.5 * fist / tw).toFixed(4), v: +(hemV - (fist + margin + 2) / th).toFixed(4) };
            bs.aroundVia = { ...today, ...via, path: [via] };
            const e0 = Math.min(...[1, -1].map(f => base[`${chan(f)}Elbow`])), e1 = Math.max(...[1, -1].map(f => base[`${chan(f)}Elbow`]));
            let best = null;
            for (let a = -1.4; a <= 0.3001; a += 0.05) for (let b = -2.0; b <= 3.0001; b += 0.05) {
                if (e1 + b > limits.max || e0 + b < limits.min) continue;
                const dd = [1, -1].map(f => { drawStand(f, a, b); const V = sk.aroundViaPoint(), W = sk.jointAttachmentPoints.nearWrist; return Math.hypot(W.x - V.x, W.y - V.y); });
                const worst = Math.max(...dd);
                if (!best || worst < best.worst - 0.01 || (Math.abs(worst - best.worst) <= 0.01 && Math.hypot(a, b) < Math.hypot(best.a, best.b))) best = { a, b, worst };
            }
            bs.aroundVia = today;
            return { fistPx: +fist.toFixed(2), torsoH: +th.toFixed(2), hemV: +hemV.toFixed(4), via, viaPose: { recoveryArm: +best.a.toFixed(2), recoveryElbow: +best.b.toFixed(2), wristErrPx: +best.worst.toFixed(2) }, today };
        }, { settled: settle, limits: JOINT_LIMITS.elbow, standW: AROUND.standW, margin: MARGIN_PX });
    } finally { await h.close(); }
}

const MEASURE = async () => {
    const w = window.__rw, sk = w.skeleton, Sk = sk.constructor, { handClearance, silhouetteOf } = await import('/src/rig/silhouette.js');
    const smp = sk.nearHandSamples(), p = sk.jointAttachmentPoints, hipMid = p.nearHip && p.farHip ? { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 } : p.nearHip;
    if (!smp || !hipMid || !p.neck) return null;
    let ax = p.neck.x - hipMid.x, ay = p.neck.y - hipMid.y; const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
    const along = (q) => -((q.x - hipMid.x) * ax + (q.y - hipMid.y) * ay), t = sk.torso;
    if (!window.__hem) {
        const src = t.texture.getSourceImage(), c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; let row = -1, x0 = c.width, x1 = 0;
        for (let y = c.height - 1; y >= 0 && row < 0; y--) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] >= 128) { row = y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
        window.__hem = { v: (row + 1) / c.height, u0: x0 / c.width, u1: (x1 + 1) / c.width };
    }
    const hem = Math.max(...[window.__hem.u0, (window.__hem.u0 + window.__hem.u1) / 2, window.__hem.u1].map(u => along(Sk.imageAnchorPoint(t, { u, v: window.__hem.v }))));
    const low = Object.entries(smp).filter(([, q]) => q).map(([k, q]) => [k, along(q)]).sort((a, b) => b[1] - a[1])[0];
    const dist = (part) => { const sil = silhouetteOf(part); return sil ? handClearance(part, smp, sil, 1).min : null; };
    const parts = [dist(t), dist(sk.nearThigh), dist(sk.farThigh)], ok = parts.filter(v => v !== null);
    const wr = p.nearWrist, he = smp.handEnd;
    return { nearThighClear: parts[1] === null ? null : +parts[1].toFixed(2), farThighClear: parts[2] === null ? null : +parts[2].toFixed(2), torsoClear: parts[0] === null ? null : +parts[0].toFixed(2), lowest: +(low[1] - hem).toFixed(2), lowestPart: low[0], outsideUnion: ok.length ? +Math.min(...ok).toFixed(2) : null, handUnder: !!sk._handUnder,
        hw: +(w._recoveryHandWeight?.() ?? 0).toFixed(3), routeErr: w._routeErr == null ? null : +w._routeErr.toFixed(2), wrist: { x: wr.x, y: wr.y }, tip: { x: he.x, y: he.y }, x: w.x };
};

const sol = await solvePath();
writeFileSync(join(outRoot, 'route.json'), JSON.stringify(sol, null, 1));
console.log('route', JSON.stringify(sol));
const results = [];
// B and R share a launch (handUnion=off: the torso-only mask and clearance of today); RU is R with the union on
for (const [cols, qs] of [[colArg.split(',').filter(c => !c.endsWith('U')), 'handUnion=off'], [colArg.split(',').filter(c => c.endsWith('U')), '']]) {
    if (!cols.length) continue;
    process.env.WFM_P1 = RIG; process.env.WFM_P2 = 'george'; process.env.WFM_QS = ['notitle=1', 'getups=v1', qs].filter(Boolean).join('&');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400); await page.evaluate(INSTALL);
        const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
        for (const col of cols) {
            const data = col[0] === 'B' ? null : { ...sol.today, ...sol.via, ...sol.viaPose, path: [sol.via] };
        await page.evaluate((c) => { const bs = window.__rw.skeleton._textureConfig.backSell; window.__todayVia ??= JSON.parse(JSON.stringify(bs.aroundVia)); bs.aroundVia = c ? { ...c } : JSON.parse(JSON.stringify(window.__todayVia)); }, data);
        for (const facing of [-1, 1]) {
            const id = `${facing < 0 ? 'l' : 'r'}-behind`, dir = join(outRoot, 'frames', col, id);
            rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
            await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: true, facing, pose: 'stale', opp: 'behind' });
            const fr = []; let standAt = null, prev = null;
            for (let i = 0; i < 400; i++) {
                const f = await page.evaluate(STEP), m = await page.evaluate(MEASURE);
                const swap = m && prev && m.handUnder !== prev.handUnder;
                const mv = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null);
                // steps are taken in the body's own frame: the wrestler's x can move (the flip's pivot hold), so subtract it
                fr.push({ i, now: f.now, state: f.state, riseT: f.riseT, facing: f.facing, ...m, swap: !!swap,
                    wristStep: m && prev && m.x === prev.x ? +mv(m.wrist, prev.wrist).toFixed(2) : null, tipStep: m && prev && m.x === prev.x ? +mv(m.tip, prev.tip).toFixed(2) : null });
                prev = m;
                await page.screenshot({ path: join(dir, `s${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 85, clip });
                if (standAt === null && f.state === 'standing') standAt = f.now;
                if (standAt !== null && f.now - standAt >= 2500) break;
            }
            const ms = fr.filter(x => x.lowest !== undefined && x.lowest !== null), under = ms.filter(x => x.handUnder), stand = ms.filter(x => x.state === 'standing');
            const routeF = stand.filter(x => x.hw > AROUND.standW && x.hw < 1), steps = routeF.map(x => x.wristStep).filter(v => v !== null), swaps = ms.filter(x => x.swap);
            const row = { col, facing, frames: fr.length, underFrames: under.length,
                lowestWhileUnder: under.length ? +Math.max(...under.map(x => x.lowest)).toFixed(2) : null,
                lowestWhileUnderAt: under.length ? (({ i, state, hw, lowestPart }) => ({ i, state, hw, lowestPart }))(under.reduce((a, b) => (b.lowest > a.lowest ? b : a))) : null,
                routeFrames: routeF.length, routeErrMax: routeF.length ? +Math.max(...routeF.map(x => x.routeErr ?? 0)).toFixed(2) : null,
                routeWristStepMax: steps.length ? +Math.max(...steps).toFixed(2) : null, routeTipStepMax: routeF.length ? +Math.max(...routeF.map(x => x.tipStep ?? 0)).toFixed(2) : null,
                swaps: swaps.map(x => ({ i: x.i, state: x.state, hw: x.hw, handUnder: x.handUnder, outsideUnion: x.outsideUnion })), series: fr };
            results.push(row);
            console.log(`[route] ${col}/${id}: under ${under.length} fr, lowest while under ${row.lowestWhileUnder} (${JSON.stringify(row.lowestWhileUnderAt)}), route err max ${row.routeErrMax}, wrist step max ${row.routeWristStepMax}, swaps ${JSON.stringify(row.swaps.map(s => [s.i, s.handUnder, s.outsideUnion]))}`);
        }
    }
} finally { await h.close(); }
}
writeFileSync(join(outRoot, 'measure.json'), JSON.stringify(results));
process.exit(0);
