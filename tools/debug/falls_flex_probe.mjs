// PLAN_FALLS T2.0: the rendered elbow and knee flex of a lying pose, read off the drawn joints (the audit's reading: flex > 0 = bent the normal way), against the
// channel difference the unit test reads (forearm - arm, thigh - shin, wrapped). One rig per run (WFM_P1), both lyings, both facings, missile and rest pose.
//   WFM_URL=http://localhost:5173 WFM_P1=thesz-procreate-v1 node tools/debug/falls_flex_probe.mjs
import { launch } from './harness.mjs';
const h = await launch();
await h.page.waitForFunction(() => !!window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, { timeout: 20000 });
await h.page.waitForTimeout(800);
const out = await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0]; sc.scene.pause();
    const w = sc.w1, sk = w.skeleton, res = [];
    const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y }), dot = (a, b) => a.x * b.x + a.y * b.y;
    const flexes = (facing) => {
        const p = sk.jointAttachmentPoints;
        const hip = { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 }, t = sub(p.neck, hip);
        const n = facing >= 0 ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x };
        const flex = (a, b, c) => { const u = sub(b, a), l = sub(c, b); let q = { x: -u.y, y: u.x }; if (dot(q, n) < 0) q = { x: -q.x, y: -q.y }; return Math.atan2(dot(l, q), dot(l, u)); };
        const r = {};
        for (const sd of ['near', 'far']) { r[`${sd}Knee`] = -flex(p[`${sd}Hip`], p[`${sd}Knee`], p[`${sd}Ankle`]); r[`${sd}Elbow`] = flex(p[`${sd}Shoulder`], p[`${sd}Elbow`], p[`${sd}Wrist`]); }
        return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(2)]));
    };
    for (const lying of ['supine', 'prone']) for (const facing of [1, -1]) for (const falls of [false, true]) {
        sk.setFalls(falls); sk.updateGrounded(520, 400, w.s, facing, lying);
        res.push({ lying, facing, falls, ...flexes(facing) });
    }
    return res;
});
for (const r of out) console.log(JSON.stringify(r));
process.exit(0);
