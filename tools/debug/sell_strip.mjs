// Filmstrip of every down-state sell (src/animation/sells.js) on the real
// art, both wrestlers, through the game's own Wrestler._sellPose and
// Skeleton.updateGroundedReach. One PNG per sell x progress; a red line marks
// the mat. Compose with tools/move-critic/poses_sheet.py or by eye.
//   WFM_URL=http://127.0.0.1:5173 WFM_P1=thesz-procreate-v1 WFM_P2=george node tools/debug/sell_strip.mjs <outDir> [amp]
import { mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';

const outDir = process.argv[2];
const amp = Number(process.argv[3] ?? 1);
mkdirSync(outDir, { recursive: true });
const h = await launch();
await h.page.waitForFunction(() => { const sc = window.__WFM_GAME?.scene?.scenes?.[0]; return !!(sc?.w1?.skeleton && sc?.w2?.skeleton); }, { timeout: 20000 });
await h.page.waitForTimeout(800);
await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    sc.scene.pause();
    for (const o of sc.children.list) if (o.depth >= 100) o.setVisible(false);
});

const rows = [
    ['supine', 'writhe'], ['supine', 'kick'], ['supine', 'roll'],
    ...['knee', 'head', 'arm', 'back', 'chest'].map(part => ['supine', 'clutch', part]),
    ['prone', 'stir'], ['prone', 'roll'],
    ...['knee', 'head', 'arm', 'back', 'chest'].map(part => ['prone', 'clutch', part]),
];
const CLIP = JSON.parse(process.env.SELL_CLIP ?? '{"x":130,"y":250,"width":780,"height":180}');
const us = [0, 0.15, 0.3, 0.45, 0.55, 0.7, 0.85, 1];
for (const [lying, name, part] of rows) for (const u of us) {
    await h.page.evaluate(([lying, name, part, u, amp]) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        for (const [w, x, f] of [[sc.w1, 330, 1], [sc.w2, 700, -1]]) {
            const cur = { name, lying, part, duration: 1, amp };
            w.lying = lying; w.facing = f;
            if (name === 'roll' && u >= 0.5) { cur.turned = true; w.facing = -f; }
            w._sell = { plan: [cur], i: 0, t: u };
            const sold = w._sellPose();
            w.gfx.clear(); w.skeleton.setVisible(true);
            w.skeleton.updateGroundedReach(x, 380, w.s, w.facing, sold.g, sold.reach);
            w.gfx.lineStyle(1, 0xff0000, 1); w.gfx.lineBetween(x - 160, 380, x + 160, 380);
            w._sell = null;
        }
    }, [lying, name, part ?? null, u, amp]);
    await h.page.waitForTimeout(40);
    await h.page.screenshot({ path: `${outDir}/${lying}_${name}${part ? `_${part}` : ''}_${u}.png`, clip: CLIP });
}
await h.close();
process.exit(0);
