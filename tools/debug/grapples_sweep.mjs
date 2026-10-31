// PLAN_GRAPPLES T1.7: the D12 sweep. Held poses (even/even, attacker/defender, and the steal's swap) at gap x lean x lead-foot pullback,
// every grip at weight 1, both facings, Lou attacker and George attacker. Each cell: silhouette overlap, ankle daylight, worst hand error.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_sweep.mjs out.json [gaps=52,60,68,76] [leans=0,.1,.2] [pulls=0,.15,.3] [defLean=.25] [p1,p2 rig overrides]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL_MASKS } from './grapples_masks.mjs';
import { INSTALL_LEGS, TRUNKS_V } from './grapples_legs.mjs';

const nums = (a, d) => (a ?? d).split(',').map(Number);
const [out = 'sweep.json', g, l, p, dl, rigs] = process.argv.slice(2);
const gaps = nums(g, '52,60,68,76'), leans = nums(l, '0,.1,.2'), pulls = nums(p, '0,.15,.3'), defLean = Number(dl ?? 0);
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const pairs = rigs ? [rigs.split(',')] : [[LOU, GEORGE], [GEORGE, LOU]];

const CELL = async ({ gap, lean, pull, defLean, facing, poses, tv }) => {
    const { lockupPoseChannels, lockupGrips, gripTarget } = await import('/src/animation/lockup.js');
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2, s = a.s;
    game.loop.sleep(); sc._p1AI = null; sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60;
    const mid = 520, X = () => { a.x = mid - facing * gap * s / 2; d.x = mid + facing * gap * s / 2; };
    for (const w of [a, d]) { w.scene.tweens.killTweensOf(w.pose); w.stamina = 100; w.vx = 0; w.state = 'lockup'; w.y = 400; }
    a.facing = facing; d.facing = -facing; X();
    const grips = { attacker: { collar: 1, elbow: 1 }, defender: { collar: 1, elbow: 1 } };
    sc.lockupState = { attacker: a, defender: d, timer: 0, grapple: { seed: 1, t: 0, stealAt: null, breakAt: null, grips } };
    sc._tickLockup = X;
    const set = (w, key) => {
        const lSide = w.skeleton.lChannelSide(w.facing), nearCh = lSide === 'far' ? 'r' : 'l';
        const ch = lockupPoseChannels({ even: 0, attacker: 0, defender: 0, [key]: 1 }, lSide);
        // `lean` is not drawn on these rigs; `bend` is the torso pitch (Wrestler.js ~119). The axis keeps the name `lean` in the plan.
        ch.bend = lean + (key === 'defender' ? defLean : 0);
        ch[`${nearCh}Leg`] -= pull;
        Object.assign(w.pose, { tilt: 0, lift: 0 }, ch);
    };
    let T = sc.time.now;
    for (let i = 0; i < 3; i++) { sc.lockupState.timer = 0; set(a, poses[0]); set(d, poses[1]); T += 1000 / 60; game.step(T, 1000 / 60); }
    const m = window.__maskOverlap(a, d, false);
    const lg = [window.__legs(a, tv.a), window.__legs(d, tv.d)];   // D13 (T1.11): worst of the two men
    const lists = lockupGrips(a, d, grips), dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    let err = 0, worstGrip = null;
    for (const [role, actor] of [['attacker', a], ['defender', d]]) {
        const pts = actor.skeleton.jointAttachmentPoints, lSide = actor.skeleton.lChannelSide(actor.facing);
        for (const it of lists[role]) {
            const hs = it.arm === 'l' ? lSide : (lSide === 'near' ? 'far' : 'near');
            const e = dist(pts[`${hs}Wrist`], gripTarget(it, hs));
            if (e > err) { err = e; worstGrip = `${role}.${it.joint}`; }
        }
    }
    const f = facing, reach = (w, dir) => Math.max(...['nearAnkle', 'farAnkle'].map(k => (w.skeleton.jointAttachmentPoints[k].x - w.x) * dir));
    const hc = (w) => w.skeleton.head ?? w.skeleton.jointAttachmentPoints.neck;
    return { below: m.below, torso: m.torso, above: m.above, daylight: (Math.abs(d.x - a.x) - reach(a, f) - reach(d, -f)) / s, err: +err.toFixed(2), worstGrip, headGap: +(dist(hc(a), hc(d)) / s).toFixed(1),
        kneeLine: Math.min(...lg.flatMap(x => [x.near.kneeLine, x.far.kneeLine])), ankleStagger: Math.min(...lg.map(x => Math.abs(x.stagger.ankle))), kneeStagger: Math.min(...lg.map(x => Math.abs(x.stagger.knee))) };
};

const rows = [];
for (const [ra, rd] of pairs) {
    process.env.WFM_P1 = ra; process.env.WFM_P2 = rd; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    await h.page.waitForTimeout(2500);
    await h.page.evaluate(INSTALL_MASKS); await h.page.evaluate(INSTALL_LEGS);
    const tv = { a: TRUNKS_V[ra], d: TRUNKS_V[rd] };
    for (const gap of gaps) for (const lean of leans) for (const pull of pulls) {
        const cell = { att: ra, gap, lean, pull, below: 0, torso: 0, daylight: 1e9, err: 0, worstGrip: null, headGap: 0 };
        for (const facing of [1, -1]) for (const poses of [['even', 'even'], ['attacker', 'defender'], ['defender', 'attacker']]) {
            const r = await h.page.evaluate(CELL, { gap, lean, pull, defLean, facing, poses, tv });
            cell.below = Math.max(cell.below, r.below); cell.torso = Math.max(cell.torso, r.torso); cell.daylight = Math.min(cell.daylight, r.daylight);
            if (r.err > cell.err) { cell.err = r.err; cell.worstGrip = `${r.worstGrip} ${poses.join('/')}`; }
            cell.headGap = Math.max(cell.headGap, r.headGap);
            cell.kneeLine = Math.min(cell.kneeLine ?? 1e9, r.kneeLine); cell.ankleStagger = Math.min(cell.ankleStagger ?? 1e9, r.ankleStagger); cell.kneeStagger = Math.min(cell.kneeStagger ?? 1e9, r.kneeStagger);
        }
        cell.daylight = +cell.daylight.toFixed(1);
        cell.pass = cell.below === 0 && cell.torso === 0 && cell.daylight >= 8 && cell.err <= 3;
        rows.push(cell);
        console.log(`${ra.slice(0, 5)} gap ${gap} lean +${lean} pull ${pull}: below ${cell.below} torso ${cell.torso} daylight ${cell.daylight} err ${cell.err} (${cell.worstGrip}) head ${cell.headGap} legs: knee ${cell.kneeLine.toFixed(1)} ankle ${cell.ankleStagger.toFixed(1)} kneeSt ${cell.kneeStagger.toFixed(1)}${cell.pass ? ' PASS' : ''}`);
    }
    await h.close();
}
writeFileSync(out, JSON.stringify(rows, null, 1));
