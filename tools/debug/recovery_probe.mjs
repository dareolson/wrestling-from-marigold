// Standing back-recovery probe (PLAN_SUPLEX_RISE T4.1; rig-agnostic since PLAN_GEORGE_TRANSFER T3.2):
// which near-arm pose offsets (arm, elbow) put the near hand's contact within a few px of backWaist at
// _recoveryPose back weight 1, on BOTH facings, with the elbow inside its joint limit?
// Exact paused poses through the real Skeleton.updateUpright. Nothing here is Lou's:
//   - the settled pose is the rig's LIVE one, built with the game's own calls: the rise swap's tweenPose('idle', 0)
//     (every elbow gets its local .70 owner), then the six stance channels at the rig's idlePose, as a standing
//     wrestler drifts to it; read back, not typed in;
//   - the near hand's channel comes from skeleton.lChannelSide(facing) per facing, exactly as
//     Wrestler._recoveryPose picks it ('near' -> l, 'far' -> r), so a rig whose near hand is the r channel
//     on one facing is probed on that channel;
//   - the contact is Skeleton.backContact(): the painted clutch patch if the active art has one, else the
//     wrist (reported as contact 'wristProxy');
//   - a rig with a backWaist but no backSell gets provisional numbers installed on the page for the run
//     (backsell_probe_support.mjs), reported as such;
//   - a solution must keep the elbow inside JOINT_LIMITS.elbow (settled elbow + offset in [min, max]).
// Prints the smallest-offset solutions and, per solution, the elbow flex in degrees.
//
//   WFM_URL=http://127.0.0.1:5173 WFM_P1=george-roster-v1 node tools/debug/recovery_probe.mjs [out.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';
import { JOINT_LIMITS } from '../../src/rig/articulation.js';
import { INSTALL_PROVISIONAL_BACK_SELL } from './backsell_probe_support.mjs';

process.env.WFM_P1 ??= 'thesz-procreate-v1';
process.env.WFM_P2 ??= process.env.WFM_P1;
const out = process.argv[2] ?? 'research/animation/suplex-rise-2026-10/recovery-probe.json';
const h = await launch();
try {
    await h.page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, null, { timeout: 30000 });
    const install = await h.page.evaluate(INSTALL_PROVISIONAL_BACK_SELL);
    if (!install.ok) throw new Error(`${install.rig}: back sell not measurable: ${install.reason}`);
    // the rig's live settled pose, built by the game's own calls: the rise swap does tweenPose('idle', 0) (every
    // elbow gets its local .70 owner), then a standing wrestler's six stance channels drift to his idlePose
    // (Wrestler.move: lLeg rLeg lArm rArm lean crouch). Elbows are not drifted, they stay as the swap left them.
    const settle = await h.page.evaluate(async () => {
        const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1;
        const { POSES } = await import('/src/Wrestler.js');
        w.state = 'standing';
        w.tweenPose('idle', 0, 'Linear');
        const target = POSES[w.idlePose] ?? POSES.idle;
        for (const k of ['lLeg', 'rLeg', 'lArm', 'rArm', 'lean', 'crouch']) w.pose[k] = target[k] ?? 0;
        return { idleName: w.idlePose, pose: JSON.parse(JSON.stringify(w.pose)) };
    });
    const res = await h.page.evaluate(({ settled, limits }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause(); sc.tweens.pauseAll();
        const w = sc.w1, sk = w.skeleton;
        w.state = 'standing'; w.x = 400; w.y = 430;
        const base = { ...settled };
        const chan = f => (sk.lChannelSide(f) === 'far' ? 'r' : 'l');
        const result = { rig: new URLSearchParams(location.search).get('p1'), basePose: base,
            nearChannel: [1, -1].map(f => [f, sk.lChannelSide(f), chan(f)]), grid: [] };
        const s = w.s * (w._heightScale ?? 1);
        const flexDeg = () => {
            const p = sk.jointAttachmentPoints, S = p.nearShoulder, E = p.nearElbow, W = p.nearWrist;
            const a = Math.atan2(E.y - S.y, E.x - S.x), b = Math.atan2(W.y - E.y, W.x - E.x);
            return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a))) * 180 / Math.PI;
        };
        const hasGrip = Object.keys(sk._textureConfig.variants?.forearm ?? {}).includes('grip');
        const draw = (facing, dArm, dElbow, art) => {
            sk.setPartVariants(art === 'grip' ? { nearForearm: 'grip' } : {});
            const n = chan(facing);
            const pose = { ...base, bend: (base.bend ?? 0) + 0.12, [`${n}Arm`]: (base[`${n}Arm`] ?? 0) + dArm, [`${n}Elbow`]: base[`${n}Elbow`] + dElbow };
            sk.updateUpright(400, 430, s, facing, pose, 0, 0, facing * (pose.lean ?? 0), 0, 0.5, 0);
            const c = sk.backContact();
            return { dist: c?.dist, contact: c?.contact, flex: flexDeg() };
        };
        const art = hasGrip ? 'grip' : 'fist';
        const hits = [];
        const e0 = Math.min(...[1, -1].map(f => base[`${chan(f)}Elbow`]));
        for (let a = -2.4; a <= 1.2001; a += 0.1) for (let b = -2.0; b <= 3.0001; b += 0.1) {
            const e = Math.max(...[1, -1].map(f => base[`${chan(f)}Elbow`])) + b, eLo = e0 + b;
            if (e > limits.max || eLo < limits.min) continue;     // the elbow stays inside its joint limit
            const r1 = draw(1, a, b, art), r2 = draw(-1, a, b, art);
            if (r1.dist <= 6 && r2.dist <= 6) hits.push({ dArm: +a.toFixed(2), dElbow: +b.toFixed(2), d1: +r1.dist.toFixed(2), d2: +r2.dist.toFixed(2), flex1: +r1.flex.toFixed(1), flex2: +r2.flex.toFixed(1), contact: r1.contact });
        }
        hits.sort((p, q) => (Math.hypot(p.dArm, p.dElbow) - Math.hypot(q.dArm, q.dElbow)));
        result.art = art;
        // the pick: the smallest offset that lands both facings within 3 px (Lou's recorded pick, -1.2 / +1.5 at 2.33 px, is exactly this)
        result.pick = hits.find(p => Math.max(p.d1, p.d2) <= 3) ?? null;
        result.hits = hits.slice(0, 15);
        result.hitCount = hits.length;
        result.idleDistances = [1, -1].map(f => ({ facing: f, ...draw(f, 0, 0, art) }));
        return result;
    }, { settled: settle.pose, limits: JOINT_LIMITS.elbow });
    res.idle = settle.idleName; res.install = install; res.elbowLimit = JOINT_LIMITS.elbow;
    res.settled = { nearArmByFacing: [1, -1].map((f, i) => [f, res.basePose[`${res.nearChannel[i][2]}Arm`]]), nearElbowByFacing: [1, -1].map((f, i) => [f, res.basePose[`${res.nearChannel[i][2]}Elbow`]]) };
    console.log('install', JSON.stringify(install));
    console.log('idle pose', res.idle, 'near channel per facing', JSON.stringify(res.nearChannel), 'settled arm', JSON.stringify(res.settled.nearArmByFacing), 'settled elbow', JSON.stringify(res.settled.nearElbowByFacing));
    console.log('art', res.art, 'idle', JSON.stringify(res.idleDistances), 'hits within 6 px on both facings and inside the elbow limit', res.hitCount);
    for (const hit of res.hits.slice(0, 8)) console.log(JSON.stringify(hit));
    console.log('pick (smallest offset, both facings <= 3 px):', JSON.stringify(res.pick));
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(res, null, 1));
} finally { await h.close(); }
