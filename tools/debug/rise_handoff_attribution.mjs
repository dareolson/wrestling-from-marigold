// Attribute the rise -> standing step to H1..H4 (PLAN_RISE_HANDOFF T1.2).
//
//   WFM_URL=http://127.0.0.1:5173 node tools/debug/rise_handoff_attribution.mjs [out.json] [rig,rig|all] [flags]
//
// For each case it runs the real rise to the swap (rise_handoff_probe.mjs), and on the first standing
// frame re-draws the SAME wrestler at the SAME place through the skeleton, changing one thing at a time:
//   R   last rising frame (recorded)                         F   first standing frame (recorded)
//   V0  updateUpright with everything the game passes (must equal F: the replication check)
//   V1  V0 without the aftermath recovery copy (pose = this.pose)                          -> H4 recovery
//   V2  V1 with guard 0                                                                     -> H4 guard
//   V3  V2 with a fresh idle pose and lean 0 instead of the stale this.pose                 -> H1
//   V3 vs R is what is left: the grounded final key against the upright idle (H2) and the standingHipHeight finish (H3).
//   G   updateGetUp(t = 1) with no pain context, and Graw = _applyGrounded of the raw final key (no hip finish) -> H3
// Distances are per-point (px): backWaist (torso centre on rigs with no painted one), far shoulder, far wrist,
// head centre, and the largest corner-set step over all visible parts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP, RIGS, FLAGS, CASES } from './rise_handoff_probe.mjs';

const ATTR = () => {
    const w = window.__rw, sk = w.skeleton, Sk = sk.constructor;
    const x = w.x, y = w.y, facing = w.facing, s = w.s * (w._heightScale ?? 1);
    const P0 = k => (sk.jointAttachmentPoints ?? {})[k];
    const snap = () => {
        const parts = sk._parts.map((img, i) => {
            const m = img.getWorldTransformMatrix(), fw = img.width, fh = img.height, ox = img.originX * fw, oy = img.originY * fh;
            const c = [[-ox, -oy], [fw - ox, -oy], [fw - ox, fh - oy], [-ox, fh - oy]].map(([a, b]) => [m.a * a + m.c * b + m.tx, m.b * a + m.d * b + m.ty]);
            return { n: window.__names[i], vis: !!img.visible, c };
        });
        const wa = sk.torso?._semanticAnchors?.backWaist;
        const bw = wa ? Sk.imageAnchorPoint(sk.torso, wa) : null;
        const tor = parts.find(p => p.n === 'torso');
        const mid = p => p && { x: p.c.reduce((a, c) => a + c[0], 0) / 4, y: p.c.reduce((a, c) => a + c[1], 0) / 4 };
        const P = sk.jointAttachmentPoints ?? {};
        const hips = [P0('nearHip'), P0('farHip')].filter(Boolean);
        const hip = hips.length ? { x: hips.reduce((a, q) => a + q.x, 0) / hips.length, y: hips.reduce((a, q) => a + q.y, 0) / hips.length } : null;
        const tImg = sk.torso, torsoRot = tImg ? tImg.getWorldTransformMatrix().rotation : null;
        return { hip, torsoRot, backWaist: bw ? { x: bw.x, y: bw.y } : mid(tor), painted: !!bw, farShoulder: P.farShoulder && { ...P.farShoulder }, farWrist: P.farWrist && { ...P.farWrist },
            head: mid(parts.find(p => p.n === 'head')), nearWrist: P.nearWrist && { ...P.nearWrist }, parts };
    };
    const choreo = w._choreoOwnsPose(), gaitBlend = 0;
    const lean0 = facing * (0.07 * gaitBlend + (w.pose.lean ?? 0));
    let guard = choreo ? 0 : w.combatBlend;
    if (w._recoveryHandOnBack()) guard *= 1 - w._recoveryHandWeight();
    const up = (pose, g, lean) => { sk.invalidatePoseChannels(); sk.updateUpright(x, y, s, facing, pose, w.walkPhase, g, lean, gaitBlend, 0.5, 0); return snap(); };
    const out = {};
    out.F = snap();                                  // as drawn by the game on this first standing frame
    out.V0 = up(w._recoveryPose() ?? w.pose, guard, lean0);
    out.V1 = up(w.pose, guard, lean0);
    out.V2 = up(w.pose, 0, lean0);
    const idle = { lLeg: -0.04, rLeg: 0.16, lArm: 0, rArm: 0, lean: 0, crouch: 0, tilt: 0, lift: 0, bend: 0, lElbow: 0.7, rElbow: 0.7, lKnee: 0, rKnee: 0 };
    out.V3 = up(idle, 0, 0);
    // the rise's own end, no pain context, and without the hip finish
    sk.updateGetUp(x, y, s, facing, 1, w.lying, null); out.G = snap();
    const K = w.lying === 'supine' ? Sk.GETUP_SUPINE_POSES : Sk.GETUP_POSES;
    sk._applyGrounded(x, y, s, facing, { ...K.at(-1) }); out.Graw = snap();
    out.facing = w.facing;
    out.ctx = { guard, lean0, lockLimbJoints: !!sk._lockLimbJoints, standingHipHeight: sk.standingHipHeight, finalHip: K.at(-1).hip, s,
        recovering: !!w._recoveryPose(), combatBlend: w.combatBlend };
    return out;
};

const near = (c, set) => Math.min(...set.map(d => Math.hypot(c[0] - d[0], c[1] - d[1])));
const hd = (a, b) => Math.max(...a.c.map(c => near(c, b.c)), ...b.c.map(c => near(c, a.c)));
const dist = (a, b) => a && b ? +Math.hypot(a.x - b.x, a.y - b.y).toFixed(2) : null;
function cmp(a, b) {
    let max = 0, who = null;
    a.parts.forEach((p, i) => { if (!p.vis || !b.parts[i].vis) return; const d = hd(p, b.parts[i]); if (d > max) { max = d; who = p.n; } });
    return { backWaist: dist(a.backWaist, b.backWaist), farShoulder: dist(a.farShoulder, b.farShoulder), farWrist: dist(a.farWrist, b.farWrist),
        head: dist(a.head, b.head), maxPart: +max.toFixed(2), maxPartName: who,
        hipD: a.hip && b.hip ? { dx: +(b.hip.x - a.hip.x).toFixed(2), dy: +(b.hip.y - a.hip.y).toFixed(2) } : null,
        torsoRotDeg: a.torsoRot != null && b.torsoRot != null ? +((b.torsoRot - a.torsoRot) * 180 / Math.PI).toFixed(2) : null,
        top: a.parts.map((p, i) => [p.n, p.vis && b.parts[i].vis ? +hd(p, b.parts[i]).toFixed(1) : 0]).sort((u, v) => v[1] - u[1]).slice(0, 5) };
}

export async function attribute(rig, flagName, facings = [-1, 1]) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george';
    process.env.WFM_QS = ['notitle=1', FLAGS[flagName]].filter(Boolean).join('&');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400);
        await page.evaluate(INSTALL);
        const rows = [];
        for (const c of CASES) for (const facing of facings) for (const opp of ['front', 'behind']) {
            await page.evaluate(BEGIN, { ...c, facing, pose: 'stale', opp });
            let last = null, A = null;
            for (let i = 0; i < 400; i++) {
                const f = await page.evaluate(STEP);
                if (f.state === 'standing') { A = await page.evaluate(ATTR); break; }
                last = f;
            }
            if (!A) { rows.push({ rig, flags: flagName, case: c.id, facing, opp, error: 'no swap' }); continue; }
            // R as the recorded last rising frame, in the same shape
            const hp = ['nearHip', 'farHip'].map(k => last.pts[k]).filter(Boolean);
            const R = { hip: hp.length ? { x: hp.reduce((a, q) => a + q.x, 0) / hp.length, y: hp.reduce((a, q) => a + q.y, 0) / hp.length } : null, torsoRot: last.torsoRot, backWaist: last.backWaist ?? null, farShoulder: last.pts.farShoulder, farWrist: last.pts.farWrist, parts: last.parts.map(p => ({ n: p.n, vis: p.vis, c: p.c })) };
            const painted = A.F.painted;
            const torsoMid = last.parts.find(p => p.n === 'torso').c;
            if (!R.backWaist || !painted) R.backWaist = { x: torsoMid.reduce((a, q) => a + q[0], 0) / 4, y: torsoMid.reduce((a, q) => a + q[1], 0) / 4 };
            const hc = last.parts.find(p => p.n === 'head')?.c;
            R.head = hc && { x: hc.reduce((a, q) => a + q[0], 0) / 4, y: hc.reduce((a, q) => a + q[1], 0) / 4 };
            // H5: when the receiver turns on the first standing frame, R is mirrored about the root x for every
            // other comparison, so the rows below are pose-only.
            const turned = last.facing !== A.facing;
            const mir = q => q && { x: 2 * last.x - q.x, y: q.y };
            const Rm = turned ? { ...R, backWaist: mir(R.backWaist), farShoulder: mir(R.farShoulder), farWrist: mir(R.farWrist), head: mir(R.head), hip: mir(R.hip), torsoRot: R.torsoRot == null ? null : -R.torsoRot,
                parts: R.parts.map(p => ({ ...p, c: p.c.map(q => [2 * last.x - q[0], q[1]]) })) } : R;
            rows.push({ rig, flags: flagName, case: c.id, facing, opp, turned, painted, ctx: A.ctx,
                total: cmp(R, A.F),
                totalPoseOnly: cmp(Rm, A.F),            // R (mirrored when he turns) -> F
                replication: cmp(A.F, A.V0),             // must be ~0
                H4recovery: cmp(A.V0, A.V1), H4guard: cmp(A.V1, A.V2), H1stale: cmp(A.V2, A.V3),
                residual: cmp(Rm, A.V3),                  // R -> idle upright, nothing else on: H2 + H3
                H3hipFinish: cmp(A.G, A.Graw),           // the standingHipHeight finish only
                rise_vs_G: cmp(Rm, A.G),                  // 0 unless a pain context bends the last rising frame
                F_vs_V3: cmp(A.F, A.V3) });
        }
        return rows;
    } finally { await h.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const [out = 'research/animation/rise-handoff-2026-10/baseline/attribution.json', rigArg = 'all', flagArg = 'default'] = process.argv.slice(2);
    const rigs = rigArg === 'all' ? RIGS : rigArg.split(',');
    const all = [];
    for (const rig of rigs) for (const f of flagArg.split(',')) { all.push(...await attribute(rig, f)); console.log('[attr]', rig, f); }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(all, null, 1));
    process.exit(0);
}
