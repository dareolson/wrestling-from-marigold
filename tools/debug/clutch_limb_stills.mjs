// Stills of the limb-aware clutch (T4.2, G3): the figure four's trapped leg
// (rLeg) clutched on the rendered rigs, both facings, at the clutch's hold,
// plus the same pose after a roll. Drives the game's own Wrestler._sellPose.
//   WFM_P1=george WFM_P2=thesz-procreate-v1 node tools/debug/clutch_limb_stills.mjs <outDir>
import { mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';
const outDir = process.argv[2];
mkdirSync(outDir, { recursive: true });
const h = await launch();
await h.page.waitForFunction(() => { const sc = window.__WFM_GAME?.scene?.scenes?.[0]; return !!(sc?.w1?.skeleton && sc?.w2?.skeleton); }, { timeout: 20000 });
await h.page.waitForTimeout(800);
await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    sc.scene.pause();
    for (const o of sc.children.list) if (o.depth >= 100) o.setVisible(false);
});
const CLIP = { x: 130, y: 290, width: 780, height: 150 };
// [label, lying, facing, rolled]
for (const [lying, facing, rolled] of [['supine', 1, 0], ['supine', -1, 0], ['prone', 1, 0], ['prone', -1, 0], ['supine', 1, 1]]) {
    await h.page.evaluate(([lying, facing, rolled]) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        for (const [w, x] of [[sc.w1, 330], [sc.w2, 700]]) {
            // Down with `facing`; after a roll he lies the other way and faces the other way.
            const rollLying = lying === 'supine' ? 'prone' : 'supine';
            w.lying = rolled ? rollLying : lying;
            w.facing = rolled ? -facing : facing;
            const cur = { name: 'clutch', lying: w.lying, part: 'knee', duration: 1, amp: 1, limb: 'rLeg', rolls: rolled };
            w._sell = { plan: [cur], i: 0, t: 0.45, facing0: facing };
            const sold = w._sellPose();
            w.gfx.clear(); w.skeleton.setVisible(true);
            w.skeleton.updateGroundedReach(x, 380, w.s, w.facing, sold.g, sold.reach);
            w.gfx.lineStyle(1, 0xff0000, 1); w.gfx.lineBetween(x - 160, 380, x + 160, 380);
            w._sell = null;
        }
    }, [lying, facing, rolled]);
    await h.page.waitForTimeout(40);
    await h.page.screenshot({ path: `${outDir}/${lying}_f${facing > 0 ? '+1' : '-1'}${rolled ? '_afterRoll' : ''}.jpg`, type: 'jpeg', quality: 82, clip: CLIP });
}
await h.close();
process.exit(0);
