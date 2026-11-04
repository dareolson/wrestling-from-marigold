// T4c.4h: proves a knee fold written through foldShin (rig/articulation.js) actually draws. Folds 0 / 0.6 / 1.2 / 1.8, both rigs, both facings, the
// drawn ankle positions; fails unless each step moves a near-leg ankle at least MIN_STEP px and the drawn flex (the audit's reading) is within FLEX_TOL of
// the request. Also prints the old local-flex lKnee fold for the same steps (it should move 0 px: the clamp eats it). Raw numbers.
//   node tools/debug/knee_fold_sweep.mjs [--json out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';

const MIN_STEP = 8, FLEX_TOL = 0.15, FOLDS = [0, 0.6, 1.2, 1.8];
process.env.WFM_P1 = 'thesz-procreate-v1'; process.env.WFM_P2 = 'george-roster-v1'; process.env.WFM_QS = 'notitle=1&grapples=v1&waistlock=v1';
const h = await launch();
let result;
try {
    const page = h.page;
    await page.waitForFunction(() => { const sc = window.__WFM_GAME?.scene?.scenes?.[0]; return !!(sc?.w1?.skeleton && sc?.w2?.skeleton); }, { timeout: 20000 });
    await page.waitForTimeout(800);
    result = await page.evaluate(async ({ FOLDS }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.scene.pause();
        const { foldShin } = await import('/src/rig/articulation.js');
        // the audit's reading (clip_knee_audit.mjs flexes): knee flex off the drawn hip/knee/ankle, front taken from the torso; > 0 = bent the normal way
        const kneeFlex = (sk, facing, sd) => {
            const p = sk.jointAttachmentPoints, hip = { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 };
            const t = { x: p.neck.x - hip.x, y: p.neck.y - hip.y }, n = facing >= 0 ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x };
            const dot = (a, b) => a.x * b.x + a.y * b.y, sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
            const u = sub(p[`${sd}Knee`], p[`${sd}Hip`]), l = sub(p[`${sd}Ankle`], p[`${sd}Knee`]);
            let q = { x: -u.y, y: u.x }; if (dot(q, n) < 0) q = { x: -q.x, y: -q.y };
            return -Math.atan2(dot(l, q), dot(l, u));
        };
        const rows = [];
        for (const [rig, w] of [['Lou', sc.w1], ['George', sc.w2]]) {
            const old = JSON.parse(JSON.stringify(w.pose)), oldState = w.state;
            w._choreoOwnsPose = () => true; w.state = 'standing'; w.x = 500; w.y = 380; w.moveBlend = 0; w.combatBlend = 0;
            for (const facing of [1, -1]) for (const mode of ['shin', 'knee']) {
                let prev = null;
                for (const fold of FOLDS) {
                    const base = { lArm: 0.3, rArm: 0.3, lElbow: 0.5, rElbow: 0.5, crouch: 0.3, bend: 0, tilt: 0, lift: 0, lean: 0, lLeg: 0.2, rLeg: 0.1 };
                    const pose = { ...base };
                    if (mode === 'shin') { pose.lShin = foldShin(pose.lLeg, pose.crouch, fold); pose.rShin = foldShin(pose.rLeg, pose.crouch, fold); }
                    else { pose.lKnee = -fold; pose.rKnee = -fold; }
                    w.pose = pose; w.facing = facing; w.draw();
                    const p = w.skeleton.jointAttachmentPoints;
                    const ank = { near: { ...p.nearAnkle }, far: { ...p.farAnkle } };
                    const flex = { near: kneeFlex(w.skeleton, facing, 'near'), far: kneeFlex(w.skeleton, facing, 'far') };
                    const step = prev ? Math.max(...['near', 'far'].map(s => Math.hypot(ank[s].x - prev[s].x, ank[s].y - prev[s].y))) : null;
                    rows.push({ rig, facing, mode, fold, step, flexNear: flex.near, flexFar: flex.far, ankleNear: ank.near, ankleFar: ank.far });
                    prev = ank;
                }
            }
            delete w._choreoOwnsPose; w.pose = old; w.state = oldState;
        }
        return rows;
    }, { FOLDS });
} finally { await h.close(); }

let fail = 0;
for (const r of result) {
    // the shin owner is the one under test; the knee owner is printed to show the clamp (expect ~0 px)
    const flexBad = r.mode === 'shin' && Math.max(Math.abs(r.flexNear - r.fold), Math.abs(r.flexFar - r.fold)) > FLEX_TOL;
    const stepBad = r.mode === 'shin' && r.step !== null && r.step < MIN_STEP;
    if (flexBad || stepBad) fail++;
    console.log(`${r.mode === 'shin' ? (flexBad || stepBad ? 'FAIL' : 'ok  ') : 'info'} ${r.rig.padEnd(6)} facing ${String(r.facing).padStart(2)} ${r.mode.padEnd(4)} fold ${r.fold.toFixed(1)}  ankle step ${r.step === null ? '   -  ' : r.step.toFixed(1).padStart(6)} px  drawn flex near ${r.flexNear.toFixed(3)} far ${r.flexFar.toFixed(3)}`);
}
const i = process.argv.indexOf('--json');
if (i > 0) writeFileSync(process.argv[i + 1], JSON.stringify(result, null, 2) + '\n');
console.log(fail ? `${fail} FAILED` : 'sweep passes');
process.exit(fail ? 1 : 0);
