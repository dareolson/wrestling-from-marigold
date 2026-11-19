// PLAN_SCALE T1.4 (3): the x-only separation push at a side rope, flag off vs ?scale=v1. One man stands with x at the ring bound (the one _clamp() allows), the other
// at DX px inward of him and DY px of depth away, both standing, real update loop in deterministic 1/60 s steps. Per case, over 1 s: body overlap left at the end
// (px short of the 80*s separation distance), largest one-frame x step and x direction reversals (jitter) of either man, and the largest one-frame y step (the old push's y write).
//   WFM_URL=http://localhost:5173 node tools/debug/scale_rope_probe.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1', DXS = [0, 10, 20, 30, 40], DYS = [0, 13, -13, 25, -25], N = 60;
const RUN = ({ side, dx, dy, n }) => {
    const game = window.__WFM_GAME, sc = game.scene.scenes[0], a = sc.w1, d = sc.w2;
    for (const w of [a, d]) {
        w.scene.tweens.killTweensOf(w); w._activeMove = null; w._sell = null; w._hold = null; w.state = 'standing'; w.vx = 0; w.vy = 0; w.lying = null;
        Object.assign(w.pose, window.__idle);
    }
    sc.lockupState = null;
    a.input = { justDown: () => false, isDown: () => false }; d.input = a.input;
    a.y = 380; a.x = side < 0 ? -1e4 : 1e4; a._clamp();   // against the rope: x at the bound _clamp() allows
    d.y = a.y + dy; d.x = a.x - side * dx; a.facing = -side; d.facing = side;
    d._clamp();   // the shallower man's bound is narrower: start him inside the ring or frame 1 measures _clamp, not the push
    const start = { ax: a.x, ay: a.y, dx: d.x, dy: d.y };   // read before the loop: frame 1's step (setup -> first update) counts
    const fr = [];
    for (let i = 0; i < n; i++) { window.__T += 1000 / 60; game.step(window.__T, 1000 / 60); fr.push({ ax: a.x, ay: a.y, dx: d.x, dy: d.y, s: a.s * a._heightScale, ss: a.s }); }
    return { start, fr };
};
const out = [];
for (const flag of [0, 1]) {
    process.env.WFM_QS = 'notitle=1&light=v1' + (flag ? '&scale=v1' : ''); process.env.WFM_P1 = LOU; process.env.WFM_P2 = GEORGE;
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 }); await page.waitForTimeout(1500);
        await page.evaluate(() => { const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; window.__T = sc.time.now; window.__idle = { ...sc.w1.pose }; });
        for (const side of [-1, 1]) for (const dx of DXS) for (const dy of DYS) {
            const r = await page.evaluate(RUN, { side, dx, dy, n: N });
            const f = [r.start, ...r.fr];
            let stepX = 0, stepY = 0, rev = 0; const sg = { a: 0, d: 0 };
            for (let i = 1; i < f.length; i++) for (const w of ['a', 'd']) {
                const ex = f[i][w + 'x'] - f[i - 1][w + 'x'], ey = f[i][w + 'y'] - f[i - 1][w + 'y'];
                stepX = Math.max(stepX, Math.abs(ex)); stepY = Math.max(stepY, Math.abs(ey));
                if (Math.abs(ex) > 0.05) { if (sg[w] && Math.sign(ex) !== sg[w]) rev++; sg[w] = Math.sign(ex); }
            }
            const L = f.at(-1), need = 80 * r.fr.at(-1).ss, depth = Math.abs(L.ay - L.dy), dist = Math.hypot(L.ax - L.dx, L.ay - L.dy);
            out.push({ flag, side, dx, dy, overlapPx: depth < 26 ? +Math.max(0, need - dist).toFixed(1) : 0, maxStepX: +stepX.toFixed(2), maxStepY: +stepY.toFixed(2), reversals: rev, endGapX: +Math.abs(L.ax - L.dx).toFixed(1), endDy: +(L.dy - L.ay).toFixed(1) });
        }
    } finally { await h.close(); }
}
writeFileSync(process.argv[2] ?? 'research/scale-2026-11/s1/rope-probe.json', JSON.stringify(out, null, 1));
const worst = (flag, k) => Math.max(...out.filter(r => r.flag === flag).map(r => r[k]));
console.log('flag off: worst overlap', worst(0, 'overlapPx'), 'stepX', worst(0, 'maxStepX'), 'stepY', worst(0, 'maxStepY'), 'reversals', worst(0, 'reversals'));
console.log('flag on : worst overlap', worst(1, 'overlapPx'), 'stepX', worst(1, 'maxStepX'), 'stepY', worst(1, 'maxStepY'), 'reversals', worst(1, 'reversals'));
console.table(out.filter(r => r.flag === 1 && (r.overlapPx > 0 || r.reversals > 0)));
