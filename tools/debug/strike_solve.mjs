// Per-rig contact poses for the light strikes (PLAN_LIGHT_MOVES Stage 10/11). For each attacker rig, a seeded coordinate descent on the pose channels that
// puts a probe point on the attacker (fist tip, forearm, elbow, both wrists, shoulder) onto a target point on a standing man (neck, chest, chin, upper back),
// the men 80 units apart (the separation minimum). Prints a spec-ready object per rig. node tools/debug/strike_solve.mjs <move> [defenderRig]
//   moves: clubBlow chop uppercut backElbow axeHandleBack shoulderBlock runningForearm   (WFM_URL, OUT=<json path>)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { SETUP } from './toehold_t30_lib.mjs';
const URL = process.env.WFM_URL ?? 'http://localhost:5197';
import { RIGS, PROBES, POINTS } from './strike_lib.mjs';
import { shinsFromFolds } from '../../src/rig/articulation.js';
// in-page: set one pose (the lunge shifts the body), step two frames, read the points
const EVAL = ({ pose, probe, target, facing, ground }) => {
    const g = window.__WFM_GAME, sc = g.scene.scenes[0], A = sc.w1, D = sc.w2;
    const step = () => { window.__T += 1000 / 60; g.step(window.__T, 1000 / 60); };
    const { lunge = 0, ...ch } = pose;
    if (ground) {
        // a man on the mat (head toward the attacker's way for a prone man, away for a supine one), the attacker beside him on the camera side; `lunge` is where along the mat he stands
        const x0 = window.__ax0, so = A.s;
        A.facing = facing; D.facing = ground.lying === 'supine' ? -facing : facing; D.x = x0 + facing * 100 * so; D.y = 400; A.y = 400 + ground.ay * so;
        D.state = 'down'; D.lying = ground.lying; D.stateTimer = 99;
        A.x = x0 + facing * lunge * so; Object.assign(A.pose, ground.fixed, ch); A.state = 'slamming'; step(); step();
        return { ...POINTS({ probe, target }), ax: x0 };
    }
    A.facing = facing; D.facing = -facing; A.x = window.__ax0; D.x = window.__ax0 + facing * 80 * A.s;   // the men 80 units apart, the lunge a body lean on top
    const x0 = A.x; A.x = x0 + facing * lunge * A.s; Object.assign(A.pose, ch); A.state = 'slamming'; step(); step();
    return { ...POINTS({ probe, target }), ax: x0 };
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const move = process.argv[2] ?? 'clubBlow';
const spec = PROBES[move];
const result = {};
for (const rig of RIGS) {
    const defRig = process.argv[3] ?? (rig === 'thesz-procreate-v1' ? 'george-roster-v1' : 'thesz-procreate-v1');
    await page.goto(`${URL}/?arena=1&notitle=1&light=v1&p1=${rig}&p2=${defRig}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2);
    await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60; window.__idle = { ...sc.w1.pose }; window.__T = sc.time.now; });
    for (const facing of [1]) {
        await page.evaluate(`(${SETUP})(${JSON.stringify({ facing, sep: 80 })})`);
        await page.evaluate((stag) => { const sc = window.__WFM_GAME.scene.scenes[0], D = sc.w2; D.state = 'standing'; D.lying = null; if (stag) Object.assign(D.pose, { lean: 0.5, bend: 0.5, crouch: 0.25 }); D.state = 'slamming'; }, !!spec.defStagger);
        const ev1 = (pose, f) => page.evaluate(`(${EVAL.toString().replaceAll('POINTS(', '(' + POINTS.toString() + ')(')})(${JSON.stringify({ pose: shinsFromFolds(pose), probe: spec.probe, target: spec.target, facing: f, ground: spec.ground ? { ...spec.ground, fixed: shinsFromFolds(spec.ground.fixed) } : null })})`);
        // one pose for both facings: the worse of the two is what the search lowers (the lead arm is a different physical arm when he faces left)
        const ev = async pose => { const a = await ev1(pose, 1), b = await ev1(pose, -1); return { ...a, dist: Math.max(a.dist, b.dist), distR: a.dist, distL: b.dist }; };
        await page.evaluate(() => { window.__ax0 = window.__WFM_GAME.scene.scenes[0].w1.x; });
        const pin = spec.ground?.rangeByRig?.[rig], vars = { ...spec.vars, lunge: spec.ground ? (pin != null ? [pin, pin] : spec.ground.range) : [0, spec.lungeMax ?? 30] }, names = Object.keys(vars);
        let cur = { ...spec.seed, lunge: spec.ground ? (pin ?? spec.ground.start) : 0 };
        const reg = 2, lungeW = 0.3, tol = 3;   // phase 2: stay within `tol` px of the target and stay near the authored seed (reg px per radian, lungeW per px of lunge)
        const sweep = async (cost, iters) => {
            let best = cost((await ev(cur)).dist, cur), step = 0.4;
            for (let it = 0; it < iters && step > 0.004; it++) {
                let moved = false;
                for (const n of names) for (const dir of [1, -1]) {
                    const k = n === 'lunge' ? 20 : 1;
                    const p = { ...cur, [n]: Math.max(vars[n][0], Math.min(vars[n][1], cur[n] + dir * step * k)) };
                    if (p[n] === cur[n]) continue;
                    const c = cost((await ev(p)).dist, p);
                    if (c < best - 1e-6) { cur = p; best = c; moved = true; }
                }
                if (!moved) step *= 0.6;
            }
        };
        await sweep((d) => d, 60);
        await sweep((d, p) => Math.max(0, d - tol) * 10 + reg * names.reduce((s, n) => s + (n === 'lunge' ? 0 : Math.abs(p[n] - spec.seed[n])), 0) + lungeW * (p.lunge ?? 0), 60);
        const fin = await ev(cur);
        const rounded = Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, +v.toFixed(2)]));
        result[rig] = { pose: rounded, miss: +fin.dist.toFixed(1), missR: +fin.distR.toFixed(1), missL: +fin.distL.toFixed(1), reach: +(((fin.pt.x - fin.ax) * facing) / fin.s).toFixed(1), height: +(((fin.pt.y) - 400) / fin.s).toFixed(1), defender: defRig };
        console.log(move, rig, 'vs', defRig, 'miss R', result[rig].missR, 'L', result[rig].missL, 'px', 'reach', result[rig].reach, JSON.stringify(rounded));
    }
}
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(result, null, 1));
console.log('errors', errors);
await browser.close();
