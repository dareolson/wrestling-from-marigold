// Carried-rise handoff probe (PLAN_SUPLEX_RISE T4.5 / D5): where does the near arm end the
// back rise (t = 1, reach weight = peak), and how far is that from the probed standing
// back-hand pose? Exact paused poses through the real Skeleton; the near arm in upright
// channels comes from Skeleton.carriedRiseEndArm (the rise's own IK solve).
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/rise_end_arm.mjs [out.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';
import { RECOVERY_BACK_HAND } from '../../src/animation/backRisePerformance.js';
import { JOINT_LIMITS } from '../../src/rig/articulation.js';

process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
process.env.WFM_QS ??= 'notitle=1&sellart=v1&aftermath=v2';
const out = process.argv[2] ?? 'research/animation/suplex-rise-2026-10/rise-end-arm.json';
const PEAK = 1; // suplex: registry sell { part: 'back', intensity: 1.0 }
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    const idleName = await h.page.evaluate(() => window.__WFM_GAME.scene.scenes[0].w1.idlePose);
    const { lForearm, ...rest } = POSES[idleName];
    const idle = { ...rest, lElbow: 0.7, rElbow: 0.7 }; // live settled pose (film dbg.pose)
    const absHand = { arm: idle.lArm + RECOVERY_BACK_HAND.arm, elbow: idle.lElbow + RECOVERY_BACK_HAND.elbow };
    const res = await h.page.evaluate(({ idle, absHand, PEAK, elbowMax }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const w = sc.w1, sk = w.skeleton, Sk = sk.constructor;
        w.state = 'standing'; w.x = 400; w.y = 430;
        const s = w.s * (w._heightScale ?? 1);
        const flexDeg = () => {
            const p = sk.jointAttachmentPoints, S = p.nearShoulder, E = p.nearElbow, W = p.nearWrist;
            const a = Math.atan2(E.y - S.y, E.x - S.x), b = Math.atan2(W.y - E.y, W.x - E.x);
            return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) * 180 / Math.PI;
        };
        const upright = (facing, arm, elbow, bend) => {
            sk.setPartVariants({ nearForearm: 'grip' });
            const pose = { ...idle, bend, lArm: arm, lElbow: elbow };
            sk.updateUpright(400, 430, s, facing, pose, 0, 0, facing * (pose.lean ?? 0), 0, 0.5, 0);
            return { dist: sk.backContactDistance(), flexDeg: flexDeg() };
        };
        const rows = [];
        for (const facing of [1, -1]) {
            sk.setPartVariants({ nearForearm: 'grip' });
            const end = sk.carriedRiseEndArm(s, facing, PEAK);
            // the rise's own last frame: solved pose drawn grounded
            const K = Sk.GETUP_SUPINE_POSES;
            sk.updateGetUp(400, 430, s, facing, 1, 'supine', { part: 'back', severity: PEAK });
            const base1 = sk.backContactDistance();
            const g = Sk._getUpPose(K, 1, sk._lockLimbJoints, sk.standingHipHeight);
            const solved = sk._solveGroundedReach(400, 430, s, facing, g, { near: { to: 'nearHip', w: PEAK } }, { paintedContacts: true, backContact: true });
            sk._applyGrounded(400, 430, s, facing, solved);
            const groundedDist = sk.backContactDistance();
            const groundedFlex = flexDeg();
            rows.push({
                facing, end,
                groundedContactDist: groundedDist, groundedFlexDeg: groundedFlex, protectOnlyRiseT1Dist: base1,
                riseEndInUpright: { bend0: upright(facing, end.arm, end.elbow, 0), bend012: upright(facing, end.arm, end.elbow, 0.12) },
                recoveryAbs: { arm: absHand.arm, elbow: absHand.elbow, bend0: upright(facing, absHand.arm, absHand.elbow, 0), bend012: upright(facing, absHand.arm, absHand.elbow, 0.12) },
                diff: { arm: end.arm - absHand.arm, elbow: end.elbow - absHand.elbow },
                elbowWithinLimit: end.elbow <= elbowMax && Math.abs(end.rawElbow - end.elbow) < 1e-9,
            });
        }
        return rows;
    }, { idle, absHand, PEAK, elbowMax: JOINT_LIMITS.elbow.max });
    console.log('idle', JSON.stringify(idle), '\nrecovery abs', JSON.stringify(absHand), 'elbow limit', JOINT_LIMITS.elbow);
    for (const r of res) console.log(JSON.stringify(r, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ peak: PEAK, idle, absHand, elbowLimit: JOINT_LIMITS.elbow, rows: res }, null, 1));
} finally { await h.close(); }
