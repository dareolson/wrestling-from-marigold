// PLAN_FALLS T2.0: try rest-pose channel overrides without editing the source. CANDS = JSON [{ lying, set: { farFore: 2.2, ... } }]; prints the far elbow's drawn flex and joints (px at s = 1, x along the facing, y above the mat).
//   CANDS='[{"lying":"prone","set":{"farArm":-1}}]' WFM_URL=http://localhost:5173 WFM_P1=thesz-procreate-v1 node tools/debug/falls_rest_candidates.mjs
import { launch } from './harness.mjs';
const h = await launch();
await h.page.waitForFunction(() => !!window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, { timeout: 20000 });
await h.page.waitForTimeout(800);
const cands = JSON.parse(process.env.CANDS);
const out = await h.page.evaluate((cands) => {
    const sc = window.__WFM_GAME.scene.scenes[0]; sc.scene.pause();
    const w = sc.w1, sk = w.skeleton, Skeleton = sk.constructor, res = [];
    const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y }), dot = (a, b) => a.x * b.x + a.y * b.y;
    const orig = Skeleton.REST_POSES;
    for (const c of cands) {
        Skeleton.REST_POSES = { ...orig, [c.lying]: Object.freeze({ ...orig[c.lying], ...c.set }) };
        sk.setFalls(true); const x = 520, y = 400, facing = 1; sk.updateGrounded(x, y, w.s, facing, c.lying);
        const p = sk.jointAttachmentPoints, s = w.s, r = (q) => ({ x: +((q.x - x) / s).toFixed(1), y: +((y - q.y) / s).toFixed(1) });
        const hip = { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 }, t = sub(p.neck, hip), n = { x: -t.y, y: t.x };
        const flex = (a, b, cc) => { const u = sub(b, a), l = sub(cc, b); let q = { x: -u.y, y: u.x }; if (dot(q, n) < 0) q = { x: -q.x, y: -q.y }; return Math.atan2(dot(l, q), dot(l, u)); };
        res.push({ ...c, farElbowFlex: +flex(p.farShoulder, p.farElbow, p.farWrist).toFixed(2), farShoulder: r(p.farShoulder), farElbow: r(p.farElbow), farWrist: r(p.farWrist), nearElbow: r(p.nearElbow), nearWrist: r(p.nearWrist) });
    }
    Skeleton.REST_POSES = orig;
    return res;
}, cands);
for (const r of out) console.log(JSON.stringify(r));
process.exit(0);
