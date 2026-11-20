// PLAN_SCALE T2.2: the draw-scale refactor is byte-identical flag off. Records a clip run per frame (both men's x, y, inline draw scale `s * _heightScale`, drawScale() when it exists,
// every skeleton part's world matrix and depth) for a few moves, both facings, plus a rope-state case. Run it once on the old code and once on the new, then compare:
//   WFM_URL=http://localhost:5173 node tools/debug/scale_drawscale_proof.mjs out.json   ;   node tools/debug/scale_drawscale_proof.mjs --compare before.json after.json
import { readFileSync, writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
if (process.argv[2] === '--compare') {
    const [A, B] = process.argv.slice(3).map(f => JSON.parse(readFileSync(f)));
    let n = 0, bad = 0, ds = 0;
    for (const k of Object.keys(A)) for (let i = 0; i < A[k].length; i++) { n++; const a = A[k][i], b = B[k]?.[i]; if (JSON.stringify({ ...a, ds: 0 }) !== JSON.stringify({ ...b, ds: 0 })) { bad++; if (bad < 4) console.log('DIFF', k, i); } if (b.ds != null && b.ds !== b.inl) ds++; }
    console.log(`${n} frames compared, ${bad} differ (x, y, inline scale, every part matrix + depth), drawScale() != inline on ${ds}`);
    process.exit(bad || ds ? 1 : 0);
}
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE; process.env.WFM_QS = 'notitle=1&light=v1' + (process.env.SCALE ? '&scale=v1' : '&scale=off');
const CASES = [['wristlockHammerlock', '_doWristlockHammerlock', 'lockup'], ['bodySlam', '_doBodySlam', 'lockup'], ['ropes', null, 'standing']];
const RUN = ({ c, facing, n }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    let s0 = 0x5eed1234; Math.random = () => { s0 = (s0 + 0x6D2B79F5) | 0; let t = Math.imul(s0 ^ (s0 >>> 15), 1 | s0); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    sc.lockupState = null;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w._activeMove = null; w._sell = null; w._hold = null; w.state = 'standing'; w.vx = 0; w.vy = 0; w.lying = null; w.stamina = 100; w._corner = null;
        for (const k of Object.keys(w.pose)) if (!(k in window.__idle)) delete w.pose[k];
        Object.assign(w.pose, window.__idle);
    }
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    a.facing = facing; d.facing = -facing; a.y = 380; d.y = 395; a.x = 520; d.x = 520 + facing * 70 * a.s;
    a.state = c[2]; d.state = c[2];
    if (c[2] === 'lockup') { a.tweenPose('lockup', 1, 'Linear'); d.tweenPose('lockup', 1, 'Linear'); sc.lockupState = { attacker: a, defender: d, timer: 0 }; }
    if (c[1]) a[c[1]](d); else { a._corner = { matY: 330 }; a.state = 'onTurnbuckle'; a.y = 300; }
    const inline = (w) => { const on = (w.state === 'climbing' || w.state === 'onTurnbuckle' || (w.state === 'taunting' && w._ropeLevel > 0)) && w._corner; const y = w.y; if (on) w.y = w._corner.matY; const s = w.s * w._heightScale; w.y = y; return s; };
    const parts = (w) => { const o = []; for (const k of Object.keys(w.skeleton)) { const im = w.skeleton[k]; if (im && typeof im.getWorldTransformMatrix === 'function' && im.frame) { const m = im.getWorldTransformMatrix(); o.push([k, m.a, m.b, m.c, m.d, m.tx, m.ty, im.depth, im.visible, im.flipX]); } } return o; };
    const fr = [];
    for (let i = 0; i < n; i++) {
        window.__T += 1000 / 60; game.step(window.__T, 1000 / 60);
        fr.push([a, d].map(w => ({ x: w.x, y: w.y, inl: inline(w), ds: w.drawScale ? w.drawScale() : null, parts: c[1] ? parts(w) : [] })));   // the fake-corner rope case is not frame-deterministic in part matrices on the old code either, so it compares x, y and scale only
    }
    return fr;
};
const out = {};
const h = await launch();
try {
    const page = h.page;
    await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 }); await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now; window.__idle = { ...sc.w1.pose }; });
    for (const c of CASES) for (const facing of [1, -1]) out[`${c[0]}|${facing}`] = (await page.evaluate(RUN, { c, facing, n: 240 })).flat();
} finally { await h.close(); }
writeFileSync(process.argv[2], JSON.stringify(out));
console.log('recorded', Object.values(out).reduce((s, v) => s + v.length, 0), 'man-frames');
