// T2.4 (PLAN_GETUPS): how much of the near forearm each frame actually shows, backKneeHurtBack, forearmOver off | on.
//   node tools/debug/getups_forearm_vis.mjs [outRoot] [rig=thesz-procreate-v1]
// The forearm's drawn box is the same size all the way (tools/debug/getups_forearm.mjs). What changed is how much the upper
// arm covers: per frame the page is shot with the forearm shown and hidden (alpha 0, one redraw with the tween clock held),
// and the pixels that differ are the forearm's visible area. This tool writes the shot pairs (sNNNN.png / hNNNN.png) and
// the per-frame state; tools/debug/getups_forearm_vis.py counts the differing pixels (3x3 opening to drop film grain).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './harness.mjs';
import { INSTALL, BEGIN, STEP } from './rise_handoff_probe.mjs';

const [outRoot = 'research/animation/getups-2026-10/g1-rev', rig = 'thesz-procreate-v1', name = 'lou'] = process.argv.slice(2);
const COLUMNS = { before: 'getups=v1&forearmOver=off', after: 'getups=v1' };
const res = [];
for (const [column, qs] of Object.entries(COLUMNS)) {
    process.env.WFM_P1 = rig; process.env.WFM_P2 = 'george'; process.env.WFM_QS = ['notitle=1', qs].join('&');
    const h = await launch();
    try {
        const page = h.page;
        await page.waitForTimeout(400); await page.evaluate(INSTALL);
        const box = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); const g = window.__WFM_GAME.scale.gameSize; return { x: r.x, y: r.y, w: r.width, h: r.height, gw: g.width, gh: g.height }; });
        const clip = { width: 340, height: 330, x: Math.round(box.x + 520 * box.w / box.gw - 170), y: Math.round(box.y + (355 + 30) * box.h / box.gh - 330) };
        for (const facing of [-1, 1]) {
            const dir = join(outRoot, 'frames', column, `${name}-${facing < 0 ? 'l' : 'r'}`);
            mkdirSync(dir, { recursive: true });
            await page.evaluate(BEGIN, { kind: 'gettingUp', lying: 'supine', pain: true, facing, pose: 'stale', opp: 'behind' });
            const rows = []; let standAt = null;
            for (let i = 0; i < 160; i++) {
                const f = await page.evaluate(STEP);
                const shown = await page.screenshot({ type: 'png', clip });
                await page.evaluate(() => { const sk = window.__rw.skeleton, sc = window.__WFM_GAME.scene.scenes[0], gd = sc.tweens.getDelta;
                    sk.nearForearm.alpha = 0; if (sk.nearHand) sk.nearHand.alpha = 0; sc.tweens.getDelta = () => 0; window.__WFM_GAME.step(window.__T, 0); sc.tweens.getDelta = gd; });
                const hidden = await page.screenshot({ type: 'png', clip });
                await page.evaluate(() => { const sk = window.__rw.skeleton; sk.nearForearm.alpha = 1; if (sk.nearHand) sk.nearHand.alpha = 1; });
                writeFileSync(join(dir, `s${String(i).padStart(4, '0')}.png`), shown);
                writeFileSync(join(dir, `h${String(i).padStart(4, '0')}.png`), hidden);
                rows.push({ i, now: f.now, state: f.state, facing: f.facing, riseT: f.riseT, });
                if (standAt === null && f.state === 'standing') standAt = f.now;
                if (standAt !== null && f.now - standAt >= 300) break;
            }
            res.push({ column, facing, rows });
            console.log(`[vis] ${column} ${facing}: ${rows.length} frames`);
        }
    } finally { await h.close(); }
}
writeFileSync(join(outRoot, `forearm-vis-${name}.json`), JSON.stringify(res));
process.exit(0);
