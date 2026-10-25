// Standing recovery's way round (PLAN_GEORGE_TRANSFER T8.3, D9): which near-arm pose offsets (arm, elbow) put the
// near wrist at the rig's aroundVia point on BOTH facings, with the elbow inside its joint limit, and what the hand
// clears there? Same method as recovery_probe.mjs (the rig's live settled pose, the real Skeleton.updateUpright,
// the near channel per facing from lChannelSide), but the target is Skeleton.aroundViaPoint() instead of the back waist.
// The via point may be out of the arm's reach: the pick is then the smallest offset within 1.5 px of the best distance
// reached. The pose is drawn as the game draws it AT the via pose: the aftermath bend at the recovery weight standW
// (AROUND.standW), no combat guard (Wrestler.draw gives it up until the hand has passed the via pose). Prints the pick and the hand clearance at it (Skeleton.handClearance). Proposes only.
//
//   WFM_URL=http://127.0.0.1:5173 WFM_P1=george-roster-v1 node tools/debug/around_recovery_probe.mjs [out.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';
import { JOINT_LIMITS } from '../../src/rig/articulation.js';

process.env.WFM_P1 ??= 'george-roster-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const out = process.argv[2] ?? 'research/animation/george-transfer-2026-10/around/recovery-via-probe.json';
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    const settle = await h.page.evaluate(async () => {
        const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1;
        const { POSES } = await import('/src/Wrestler.js');
        w.state = 'standing';
        w.tweenPose('idle', 0, 'Linear');
        const target = POSES[w.idlePose] ?? POSES.idle;
        for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) w.pose[k] = target[k] ?? 0;
        return { idleName: w.idlePose, pose: JSON.parse(JSON.stringify(w.pose)) };
    });
    const { AROUND } = await import('../../src/rig/backSell.js');
    const res = await h.page.evaluate(({ settled, limits, standW }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const w = sc.w1, sk = w.skeleton;
        w.state = 'standing'; w.x = 400; w.y = 430;
        const base = { ...settled }, s = w.s * (w._heightScale ?? 1);
        const chan = f => (sk.lChannelSide(f) === 'far' ? 'r' : 'l');
        const via = () => sk.aroundViaPoint();
        if (!via()) return { error: 'no aroundVia on this rig' };
        const draw = (facing, dArm, dElbow) => {
            const n = chan(facing);
            const pose = { ...base, bend: (base.bend ?? 0) + 0.12 * standW, [`${n}Arm`]: (base[`${n}Arm`] ?? 0) + dArm, [`${n}Elbow`]: base[`${n}Elbow`] + dElbow };
            sk.updateUpright(400, 430, s, facing, pose, 0, 0, facing * (pose.lean ?? 0), 0, 0.5, 0);
            const V = via(), W = sk.jointAttachmentPoints.nearWrist, c = sk.handClearance(1);
            return { dist: Math.hypot(W.x - V.x, W.y - V.y), clear: c?.clear, min: c?.min, d: c?.distances, waist: sk.backContactDistance?.() };
        };
        const hits = [];
        const e0 = Math.min(...[1, -1].map(f => base[`${chan(f)}Elbow`])), e1 = Math.max(...[1, -1].map(f => base[`${chan(f)}Elbow`]));
        for (let a = -2.4; a <= 2.4001; a += 0.1) for (let b = -2.0; b <= 3.0001; b += 0.1) {
            if (e1 + b > limits.max || e0 + b < limits.min) continue;
            const r1 = draw(1, a, b), r2 = draw(-1, a, b);
            hits.push({ dArm: +a.toFixed(2), dElbow: +b.toFixed(2), d1: r1.dist, d2: r2.dist, worst: Math.max(r1.dist, r2.dist), r1, r2 });
        }
        const best = Math.min(...hits.map(h => h.worst));
        const near = hits.filter(h => h.worst <= best + 1.5).sort((p, q) => Math.hypot(p.dArm, p.dElbow) - Math.hypot(q.dArm, q.dElbow));
        const pick = near[0];
        const r = o => ({ dist: +o.dist.toFixed(2), clear: o.clear, min: +o.min?.toFixed(2), d: Object.fromEntries(Object.entries(o.d ?? {}).map(([k, v]) => [k, +v.toFixed(2)])), waist: +o.waist?.toFixed(2) });
        return { basePose: base, nearChannel: [1, -1].map(f => [f, chan(f)]), bestWorstDist: +best.toFixed(2), tried: hits.length,
            pick: { dArm: pick.dArm, dElbow: pick.dElbow, facing1: r(pick.r1), facingM1: r(pick.r2) },
            candidates: near.slice(0, 8).map(h => ({ dArm: h.dArm, dElbow: h.dElbow, d1: +h.d1.toFixed(2), d2: +h.d2.toFixed(2) })) };
    }, { settled: settle.pose, limits: JOINT_LIMITS.elbow, standW: AROUND.standW });
    if (res.error) throw new Error(res.error);
    res.idle = settle.idleName;
    console.log('idle', res.idle, 'near channel', JSON.stringify(res.nearChannel), 'tried', res.tried, 'best worst-case wrist-to-via distance', res.bestWorstDist);
    console.log('pick', JSON.stringify(res.pick));
    for (const c of res.candidates) console.log(JSON.stringify(c));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(res, null, 1));
} finally { await h.close(); }
