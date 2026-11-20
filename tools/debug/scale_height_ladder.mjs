// PLAN_SCALE T3.3: the height ladder. Each roster rig's painted-ink standing height (alpha >= 128, scale_rope_body.mjs's INK) at the front row, idle, ?scale=v1, written with the
// fingerprint of what sets it (heightScale, bone numbers, body-art hashes) to research/scale-2026-11/height-ladder.json. tests/heightLadder.test.js fails when a rig's fingerprint moves
// or the ratios to Lou (inkPerDs * heightScale) drift past 1% of the recorded ones: re-run this, look at the ratios, update the file.
//   WFM_URL=http://localhost:5173 node tools/debug/scale_height_ladder.mjs [out.json]
import { writeFileSync } from 'node:fs';
import { launch } from './harness.mjs';
import { INK } from './scale_rope_body.mjs';
import { LADDER_RIGS, rigFingerprint } from './height_ladder_lib.mjs';
const ROW = 438;
const rigs = [];
for (const rig of LADDER_RIGS) {
    process.env.WFM_P1 = rig.id; process.env.WFM_P2 = rig.id; process.env.WFM_QS = 'notitle=1&light=v1&scale=v1';
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForFunction(() => window.__WFM_GAME?.scene?.scenes?.[0]?.w2, null, { timeout: 60000 }); await page.waitForTimeout(1500);
        await page.evaluate(() => {
            const g = window.__WFM_GAME, sc = g.scene.scenes[0]; g.loop.sleep(); sc.tweens.getDelta = () => 1000 / 60; sc._p1AI = null; sc._p2AI = null; let T = sc.time.now;
            window.__RING = { nearLeft: { x: 40, y: 445 }, nearRight: { x: 920, y: 445 }, farLeft: { x: 210, y: 258 }, farRight: { x: 750, y: 258 }, ropes: [{ nearY: 380, farY: 218 }, { nearY: 316, farY: 181 }, { nearY: 251, farY: 142 }] };
            const a = sc.w1; a.input = { justDown: () => false, isDown: () => false }; sc.w2.input = a.input; a.facing = 1; sc.w2.facing = -1; a.y = 438; sc.w2.y = 438; a.x = 415; sc.w2.x = 545;
            for (let i = 0; i < 90; i++) { T += 1000 / 60; g.step(T, 1000 / 60); }
        });
        const [m] = await page.evaluate(INK);
        rigs.push({ id: rig.id, ...rigFingerprint(rig), row: ROW, drawScale: +m.drawScale.toFixed(4), inkPx: +m.ink.toFixed(1), inkPerDs: +(m.ink / m.drawScale).toFixed(2) });
    } finally { await h.close(); }
}
const lou = rigs[0], rel = r => (r.inkPerDs * r.numbers.heightScale) / (lou.inkPerDs * lou.numbers.heightScale);
for (const r of rigs) { r.ratioToLou = +rel(r).toFixed(4); r.measuredRatioToLou = +(r.inkPx / lou.inkPx).toFixed(4); }
writeFileSync(process.argv[2] ?? 'research/scale-2026-11/height-ladder.json', JSON.stringify({ row: ROW, note: 'ink = painted pixels, alpha >= 128, idle, ?scale=v1; inkPerDs = ink / drawScale; ratioToLou = (inkPerDs * heightScale) / Lou\'s', rigs }, null, 1));
console.table(rigs.map(r => ({ rig: r.id, heightScale: r.numbers.heightScale, drawScale: r.drawScale, inkPx: r.inkPx, inkPerDs: r.inkPerDs, ratioToLou: r.ratioToLou, measured: r.measuredRatioToLou })));
process.exit(0);
