// Filmstrip of startStagger() at each stamina tier, stepped at a fixed 60 Hz through the
// game's own tweens, so poses, steps and travel are the real thing.
//   WFM_URL=http://127.0.0.1:5217 WFM_P1=thesz-roster-v1 WFM_P2=george-roster-v1 node tools/debug/stagger_strip.mjs <outDir> [hp,hp,...] [frames] [stepFrames]
// Writes <outDir>/hp<N>_<frame>.png, one per sampled frame.
import { mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';

const outDir = process.argv[2];
const tiers = (process.argv[3] ?? '80,50,25,8').split(',').map(Number);
const total = Number(process.argv[4] ?? 160);
const every = Number(process.argv[5] ?? 12);
mkdirSync(outDir, { recursive: true });
const h = await launch();
await h.page.waitForFunction(() => { const sc = window.__WFM_GAME?.scene?.scenes?.[0]; return !!(sc?.w1?.skeleton && sc?.w2?.skeleton); }, { timeout: 20000 });
await h.page.waitForTimeout(800);
await h.page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    sc.scene.pause();
    for (const o of sc.children.list) if (o.depth >= 100) o.setVisible(false);
    const c = sc.cameras.main; c.setZoom(2); c.centerOn(sc.w1.x - 10, sc.w1.y - 95);
});
for (const hp of tiers) {
    await h.page.evaluate(async hp => {
        const { POSES } = await import('/src/Wrestler.js');
        const sc = window.__WFM_GAME.scene.scenes[0];
        sc.tweens.killAll();
        const w = sc.w1, o = sc.w2;
        Object.assign(w, { state: 'standing', pose: { ...POSES[w.idlePose] }, x: 380, y: 400, facing: 1, moveBlend: 0, combatBlend: 0,
            walkPhase: 0, vx: 0, vy: 0, _choreoUntil: 0, _activeMove: null, stamina: hp, _staggerType: null });
        Object.assign(o, { state: 'standing', pose: { ...POSES[o.idlePose] }, x: 520, y: 400, facing: -1, moveBlend: 0, combatBlend: 0, _choreoUntil: 0, _activeMove: null });
        w.startStagger();
    }, hp);
    for (let f = 0; f <= total; f++) {
        await h.page.evaluate(() => {
            const sc = window.__WFM_GAME.scene.scenes[0];
            const orig = sc.tweens.getDelta; sc.tweens.getDelta = () => 1000 / 60;
            sc.tweens.step(true); sc.tweens.getDelta = orig;
            sc.w1.draw?.(); sc.w2.draw?.();
        });
        if (f % every === 0) await h.page.screenshot({ path: `${outDir}/hp${hp}_${String(f).padStart(3, '0')}.png`, clip: { x: 150, y: 50, width: 800, height: 520 } });
    }
}
process.exit(0);
