// G1c-a: 3x hip crops. Idle and the held pose (even phase, frame 40) of each man, both rigs, facing right, same root and scale.
//   WFM_URL=http://localhost:5173 node tools/debug/grapples_g1c_a_crops.mjs [outDir=research/animation/grapples-2026-10/g1c-a/crops]
// The shot is 150 x 170 px of the canvas (hip at 40 px from the top, so hip, knees and boots are in); the page shows it at 3x.
import { mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INSTALL, SETUP, STEP } from './grapples_film.mjs';
import { idleOf } from './grapples_legs_run.mjs';
import { INSTALL_LEGS } from './grapples_legs.mjs';

const out = process.argv[2] ?? 'research/animation/grapples-2026-10/g1c-a/crops';
mkdirSync(out, { recursive: true });
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
for (const [pid, att, def] of [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]]) {
    process.env.WFM_P1 = att; process.env.WFM_P2 = def; process.env.WFM_QS = 'notitle=1&grapples=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(2500);
        const info = await page.evaluate(INSTALL); await page.evaluate(INSTALL_LEGS);
        const shot = async (side, name) => {
            const hip = await page.evaluate((side) => { const sc = window.__WFM_GAME.scene.scenes[0], w = side === 'a' ? sc.w1 : sc.w2, p = w.skeleton.jointAttachmentPoints; return { x: (p.nearHip.x + p.farHip.x) / 2, y: (p.nearHip.y + p.farHip.y) / 2 }; }, side);
            const bx = info.box, k = bx.w / bx.gw;
            await page.screenshot({ path: `${out}/${pid}-${side}-${name}.png`, clip: { x: Math.round(bx.x + (hip.x - 75) * k), y: Math.round(bx.y + (hip.y - 40) * (bx.h / bx.gh)), width: 150, height: 170 } });
        };
        // held: lockup case a, frame 40 (even phase)
        await page.evaluate(SETUP, { facing: 1, midX: 520, startGap: 90, defRope: null, flag: true, seed: 11 });
        for (let i = 0; i < 41; i++) await page.evaluate(STEP, {});
        await shot('a', 'held'); await shot('d', 'held');
        // idle: both men standing where they stand now, pose reset
        await idleOf(page, 1, { a: null, d: null });
        await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1.x = 480; sc.w2.x = 560; });
        await page.evaluate(STEP, {});
        await shot('a', 'idle'); await shot('d', 'idle');
    } finally { await h.close(); }
}
console.log('wrote crops to', out);
