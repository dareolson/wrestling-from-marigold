// PLAN_GRAPPLES T1.12: grid the leg channels of one pose key on both rigs and keep what passes the D13 measures. Numbers only, no screenshots.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_legs_solve.mjs <even|attacker|defender> [out.json]
// Channels (absolute shin, one owner): near leg `lLeg`, far leg `rLeg` (facing 1: l = near), `Shin = leg + shinRel`. Crouch and bend stay as G1b has them
// so the hip height, and with it the hands, do not move; `hipDy` is the change in hip y against G1b's pose, `soleGap` the near-minus-far sole y minus idle's.
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL } from './grapples_film.mjs';
import { INSTALL_LEGS } from './grapples_legs.mjs';

const GRID = async ({ role, near, far, shinN, shinF }) => {
    const { LOCKUP_POSES, lockupPoseChannels } = await import('/src/animation/lockup.js');
    const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1; w.facing = 1; w.y = 400;
    const P = LOCKUP_POSES[role], idle = { ...window.__idle }; delete idle.lKnee; delete idle.rKnee;
    const draw = (pose) => { w.skeleton.updateUpright(w.x, w.y, w.s, 1, pose, 0, 0, (pose.lean ?? 0), 0, 0.5, 0); return window.__legs(w, null); };
    const idleR = draw({ ...idle, tilt: 0, lift: 0 });
    const g1b = draw({ ...idle, tilt: 0, lift: 0, ...lockupPoseChannels({ even: 0, attacker: 0, defender: 0, [role]: 1 }, 'near') });
    const out = [];
    for (const ln of near) for (const lf of far) for (const sn of shinN) for (const sf of shinF) {
        const r = draw({ ...idle, tilt: 0, lift: 0, bend: P.bend, crouch: P.crouch, lLeg: ln, rLeg: lf, lShin: ln + sn, rShin: lf + sf });
        out.push([ln, lf, sn, sf, r.near.kneeLine, r.far.kneeLine, r.stagger.ankle, r.stagger.knee, r.far.ankle[0] - r.far.hip[0], r.near.ankle[0] - r.near.hip[0],
            (r.sole.near.y - r.sole.far.y) - (idleR.sole.near.y - idleR.sole.far.y), r.near.hip[1] - g1b.near.hip[1], r.near.flex, r.far.flex].map(v => (v === null ? 99 : +(+v).toFixed(3))));
    }
    return { rows: out, idleSoles: idleR.sole, g1bHipY: g1b.near.hip[1] };
};
const range = (a, b, st) => Array.from({ length: Math.round((b - a) / st) + 1 }, (_, i) => +(a + i * st).toFixed(3));
const role = process.argv[2] ?? 'attacker', out = process.argv[3];
const spec = { role, near: range(-0.7, 0.1, 0.05), far: range(-0.3, 0.5, 0.05), shinN: range(-0.9, -0.1, 0.1), shinF: range(-0.9, -0.1, 0.1) };
const per = {};
for (const [id, p] of [['lou', 'thesz-procreate-v1'], ['george', 'george-roster-v1']]) {
    process.env.WFM_P1 = p; process.env.WFM_P2 = p; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try { await h.page.waitForTimeout(2500); await h.page.evaluate(INSTALL); await h.page.evaluate(INSTALL_LEGS); per[id] = await h.page.evaluate(GRID, spec); } finally { await h.close(); }
}
// join on the grid point; every rig must pass
const COLS = ['near', 'far', 'shinN', 'shinF', 'kneeN', 'kneeF', 'ankle', 'knee', 'leadRel', 'rearRel', 'soleGap', 'hipDy', 'flexN', 'flexF'];
const pass = (r) => r[4] >= 1 && r[5] >= 1 && r[6] <= -28 && r[7] <= -20 && r[8] >= 0 && r[8] <= 8 && r[9] <= -10 && Math.abs(r[10]) <= 1.5 && Math.abs(r[11]) <= 3;
const keep = [];
for (let i = 0; i < per.lou.rows.length; i++) { const a = per.lou.rows[i], b = per.george.rows[i]; if (pass(a) && pass(b)) keep.push({ lou: a, george: b }); }
console.log(`${role}: ${per.lou.rows.length} grid points, ${keep.length} pass on both rigs`);
const show = keep.sort((x, y) => Math.abs(x.lou[6] + 34) - Math.abs(y.lou[6] + 34)).slice(0, 12);
for (const k of show) console.log(JSON.stringify(Object.fromEntries(COLS.map((c, j) => [c, k.lou[j]]))), '| george', k.george.slice(4).join(' '));
if (out) writeFileSync(out, JSON.stringify({ cols: COLS, per, keep }));
