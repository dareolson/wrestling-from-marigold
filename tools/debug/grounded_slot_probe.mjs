// Measures which grounded slot ('near' | 'far') carries each anatomical limb,
// for the T4.2 truth table (PLAN_MOVE_PERFORMANCE.md D3). Nothing is derived:
//   upright   raise lLeg / rLeg in the upright pose and see which ankle moves
//   grounded  hand that upright render to groundedPoseFrom (the fall handoff)
//             and see which slot's thigh angle differs from the lying pose
//   roll      draw supine P facing f and prone -P facing -f (the roll's turnover):
//             the sprite in each slot must land in the same place, so a roll
//             moves no art and the injured limb changes SLOT instead
//   draw      raise nearThigh / farThigh on the grounded rig and see which
//             sprite's ankle moves, and which one draws nearer the camera
//   WFM_P1=<rig> WFM_P2=<rig> node tools/debug/grounded_slot_probe.mjs
import { launch } from './harness.mjs';
const h = await launch();
await h.page.waitForFunction(() => { const sc = window.__WFM_GAME?.scene?.scenes?.[0]; return !!(sc?.w1?.skeleton && sc?.w2?.skeleton); }, { timeout: 20000 });
await h.page.waitForTimeout(800);
const out = await h.page.evaluate(async () => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    sc.scene.pause();
    const res = [];
    const SK = sc.w1.skeleton.constructor;
    for (const [seat, w] of [['p1', sc.w1], ['p2', sc.w2]]) {
        const sk = w.skeleton;
        const moved = (a, b) => ['near', 'far'].filter(sd => Math.hypot(a[sd + 'Ankle'].x - b[sd + 'Ankle'].x, a[sd + 'Ankle'].y - b[sd + 'Ankle'].y) > 2);
        const snap = () => JSON.parse(JSON.stringify(sk.jointAttachmentPoints));
        const row = { seat, rig: (seat === 'p1' ? sc._preset1 : sc._preset2)?.name, rows: [] };
        for (const facing of [1, -1]) {
            const base = { ...w.pose };
            const up = (p) => { sk.updateUpright(500, 380, w.s, facing, p, 0, 0, 0, 0, 1, 0); return snap(); };
            const u0 = up(base);
            const upL = moved(u0, up({ ...base, lLeg: base.lLeg + 0.7 }));
            const upR = moved(u0, up({ ...base, rLeg: base.rLeg + 0.7 }));
            // chBr: the rig's own claim
            const claim = sk.lChannelSide(facing);
            const raisedL = up({ ...base, lLeg: base.lLeg + 0.7 });
            const raisedR = up({ ...base, rLeg: base.rLeg + 0.7 });
            for (const lying of ['supine', 'prone']) {
                const target = SK.GROUNDED_POSES[lying];
                const g0 = SK.groundedPoseFrom(u0, 500, 380, w.s, facing, target);
                const diff = (pts) => {
                    const g = SK.groundedPoseFrom(pts, 500, 380, w.s, facing, target);
                    return ['near', 'far'].filter(sd => Math.abs(g[sd + 'Thigh'] - g0[sd + 'Thigh']) > 0.05 || Math.abs(g[sd + 'Shin'] - g0[sd + 'Shin']) > 0.05);
                };
                // draw: nudge each slot's thigh in the grounded rig
                sk.updateGrounded?.call; 
                const gd = (g) => { sk._applyGrounded(500, 380, w.s, facing, g); return snap(); };
                const b = gd(target);
                const nt = moved(b, gd({ ...target, nearThigh: target.nearThigh + (lying === 'supine' ? 0.8 : -0.8) }));
                const ft = moved(b, gd({ ...target, farThigh: target.farThigh + (lying === 'supine' ? 0.8 : -0.8) }));
                // roll identity: supine(P, f) vs prone(-P, -f), each slot's ankle
                const P = { ...target, nearThigh: target.nearThigh + 0.6, farShin: target.farShin + 0.4 };
                const neg = { ...P };
                const other = SK.GROUNDED_POSES[lying === 'supine' ? 'prone' : 'supine'];
                const base2 = { hip: P.hip };
                for (const k of Object.keys(P)) if (k !== 't' && k !== 'hip') base2[k] = -P[k];
                const A = gd(P);
                sk._applyGrounded(500, 380, w.s, -facing, base2); const B = snap();
                const rollDelta = ['near', 'far'].map(sd => Math.hypot(A[sd + 'Ankle'].x - B[sd + 'Ankle'].x, A[sd + 'Ankle'].y - B[sd + 'Ankle'].y).toFixed(1)).join('/');
                const dn = sk.nearThigh.depth, df = sk.farThigh.depth;
                row.rows.push({ facing, lying, claim, uprightLLeg: upL.join('+'), uprightRLeg: upR.join('+'), handoffLLeg: diff(raisedL).join('+'), handoffRLeg: diff(raisedR).join('+'), nearThighMoves: nt.join('+'), farThighMoves: ft.join('+'), nearDepthAboveFar: dn > df, rollAnkleDelta: lying === 'supine' ? rollDelta : '-' });
            }
        }
        res.push(row);
    }
    return res;
});
console.log(JSON.stringify(out, null, 1));
await h.close();
process.exit(0);
