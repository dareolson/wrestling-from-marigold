// PLAN_GRAPPLES T1.8: one held frame, logged after each pass of Arena._holdLockupGrips: shoulder, elbow, wrist, target, reach and error per
// grip, then again after a redraw (do the solved channels survive?). Fully held grips only.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_passes.mjs <attackerRig> <defenderRig> [gap=78] [bend=.34] [facing=1] [poses=attacker,defender]
import { launch } from './harness.mjs';
const [ra = 'thesz-procreate-v1', rd = 'george-roster-v1', gap = '78', bend = '.34', facing = '1', poses = 'attacker,defender'] = process.argv.slice(2);
process.env.WFM_P1 = ra; process.env.WFM_P2 = rd; process.env.WFM_QS = 'notitle=1&grapples=v1';
const h = await launch();
await h.page.waitForTimeout(2500);
const out = await h.page.evaluate(async ({ gap, bend, facing, poses }) => {
    const { lockupPoseChannels, lockupGrips, gripTarget } = await import('/src/animation/lockup.js');
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2, s = a.s;
    game.loop.sleep(); sc._p1AI = null; sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60;
    const X = () => { a.x = 520 - facing * gap * s / 2; d.x = 520 + facing * gap * s / 2; };
    for (const w of [a, d]) { w.scene.tweens.killTweensOf(w.pose); w.state = 'lockup'; w.y = 400; w.vx = 0; }
    a.facing = facing; d.facing = -facing; X();
    const grips = { attacker: { collar: 1, elbow: 1 }, defender: { collar: 1, elbow: 1 } };
    sc.lockupState = { attacker: a, defender: d, timer: 0, grapple: { seed: 1, t: 0, stealAt: null, breakAt: null, grips } };
    sc._tickLockup = X;
    const set = (w, key) => { const ch = lockupPoseChannels({ even: 0, attacker: 0, defender: 0, [key]: 1 }, w.skeleton.lChannelSide(w.facing)); ch.bend = bend; Object.assign(w.pose, { tilt: 0, lift: 0 }, ch); };
    const log = [], dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y), r = (n) => +n.toFixed(1);
    const read = (label) => {
        const lists = lockupGrips(a, d, grips), row = { label };
        for (const [role, actor] of [['A', a], ['D', d]]) {
            const pts = actor.skeleton.jointAttachmentPoints, lSide = actor.skeleton.lChannelSide(actor.facing);
            for (const it of lists[role === 'A' ? 'attacker' : 'defender']) {
                const hs = it.arm === 'l' ? lSide : (lSide === 'near' ? 'far' : 'near');
                const t = gripTarget(it, hs), S = pts[`${hs}Shoulder`], E = pts[`${hs}Elbow`], W = pts[`${hs}Wrist`];
                row[`${role}.${it.joint}(${it.arm})`] = `err ${r(dist(W, t))} S>T ${r(dist(S, t))} reach ${r(dist(S, E))}+${r(dist(E, W))} ch ${actor.pose[it.arm + 'Arm'].toFixed(2)},${actor.pose[it.arm + 'Elbow'].toFixed(2)}`;
            }
        }
        log.push(row);
    };
    const orig = a.holdGrips, origD = d.holdGrips;
    let n = 0, capture = false;
    a.holdGrips = function (l) { const o = orig.call(this, l); if (capture) read(`pass ${++n} A`); return o; };
    d.holdGrips = function (l) { const o = origD.call(this, l); if (capture) read(`pass ${++n} D`); return o; };
    let T = sc.time.now;
    for (let i = 0; i < 3; i++) { if (i === 2) capture = true; set(a, poses[0]); set(d, poses[1]); T += 1000 / 60; game.step(T, 1000 / 60); }
    capture = false; a.draw(); d.draw(); read('after redraw');
    return log;
}, { gap: +gap, bend: +bend, facing: +facing, poses: poses.split(',') });
await h.close();
for (const r of out) { console.log(r.label); for (const [k, v] of Object.entries(r)) if (k !== 'label') console.log('   ', k, v); }
