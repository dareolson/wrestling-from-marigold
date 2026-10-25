// Standing back-recovery probe (PLAN_SUPLEX_RISE T4.1): which near-arm pose offsets
// (lArm, lElbow; Lou's near hand is the l-channel on both facings) put the near
// hand's painted contact within a few px of backWaist at _recoveryPose back weight 1?
// Exact paused poses through the real Skeleton.updateUpright; pose keys are read from
// the wrestler's own idle pose, not guessed. The LIVE pose carries local elbow flex
// (lElbow/rElbow, 0.70 once the idle tween settles; the legacy lForearm in POSES is
// converted away, see Wrestler.tweenPose), so the probe uses that representation: a
// first run offsetting lForearm was ignored in the match because lElbow wins.
// Prints the smallest-offset solutions.
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/recovery_probe.mjs [out.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';

process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const out = process.argv[2] ?? 'research/animation/suplex-rise-2026-10/recovery-probe.json';
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    const idleName = await h.page.evaluate(() => window.__WFM_GAME.scene.scenes[0].w1.idlePose);
    const { lForearm, ...rest } = POSES[idleName];
    const idleBase = { ...rest, lElbow: 0.7, rElbow: 0.7 }; // live settled pose, observed in the film (dbg.pose)
    const res = await h.page.evaluate(idleBase => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
        w.state = 'standing'; w.x = 400; w.y = 430;
        const base = { ...idleBase };
        const result = { idle: undefined, rig: new URLSearchParams(location.search).get('p1'), basePose: base, lSide: [1, -1].map(f => [f, sk.lChannelSide(f)]), grid: [] };
        const s = w.s * (w._heightScale ?? 1);
        const flexDeg = () => {
            const p = sk.jointAttachmentPoints, S = p.nearShoulder, E = p.nearElbow, W = p.nearWrist;
            const a = Math.atan2(E.y - S.y, E.x - S.x), b = Math.atan2(W.y - E.y, W.x - E.x);
            return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) * 180 / Math.PI;
        };
        const draw = (facing, dArm, dElbow, art) => {
            sk.setPartVariants(art === 'grip' ? { nearForearm: 'grip' } : {});
            const pose = { ...base, bend: (base.bend ?? 0) + 0.12, lArm: (base.lArm ?? 0) + dArm, lElbow: base.lElbow + dElbow };
            sk.updateUpright(400, 430, s, facing, pose, 0, 0, facing * (pose.lean ?? 0), 0, 0.5, 0);
            return { dist: sk.backContactDistance(), flex: flexDeg() };
        };
        // coarse grid then keep the ones within 6 px in both facings
        const hits = [];
        for (let a = -2.4; a <= 1.2001; a += 0.1) for (let b = -2.0; b <= 3.0001; b += 0.1) {
            const r1 = draw(1, a, b, 'grip'), r2 = draw(-1, a, b, 'grip');
            if (r1.dist <= 6 && r2.dist <= 6) hits.push({ dArm: +a.toFixed(2), dElbow: +b.toFixed(2), d1: +r1.dist.toFixed(2), d2: +r2.dist.toFixed(2), flex1: +r1.flex.toFixed(1), flex2: +r2.flex.toFixed(1) });
        }
        hits.sort((p, q) => (Math.hypot(p.dArm, p.dElbow) - Math.hypot(q.dArm, q.dElbow)));
        result.hits = hits.slice(0, 15);
        result.hitCount = hits.length;
        result.idleDistances = [1, -1].map(f => ({ facing: f, idleGrip: draw(f, 0, 0, 'grip').dist, idleFist: draw(f, 0, 0, 'fist').dist }));
        return result;
    }, idleBase);
    console.log('idle pose', idleName, 'base pose', JSON.stringify(res.basePose), 'lSide', JSON.stringify(res.lSide));
    console.log('idle', JSON.stringify(res.idleDistances), 'hits', res.hitCount);
    for (const hit of res.hits.slice(0, 8)) console.log(JSON.stringify(hit));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(res, null, 1));
} finally { await h.close(); }
