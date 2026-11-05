// PLAN_FALLS T1.1: stills of the missile (GROUNDED_*) and the rest pose (REST_POSES), both lying poses, both facings, on the rig the run launches with (WFM_P1).
// One PNG per pose x facing; prints the joints that decide the look (px at scale 1): the hand and sole heights above the mat, the shoulder/hip/neck joints' difference.
//   WFM_URL=http://localhost:5180 WFM_P1=thesz-procreate-v1 node tools/debug/rest_pose_strip.mjs <outDir>
import { mkdirSync } from 'node:fs';
import { launch } from './harness.mjs';
const outDir = process.argv[2] ?? 'rest-pose-strip';
mkdirSync(outDir, { recursive: true });
const h = await launch();
await h.page.waitForFunction(() => !!window.__WFM_GAME?.scene?.scenes?.[0]?.w1?.skeleton, { timeout: 20000 });
await h.page.waitForTimeout(800);
await h.page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.scene.pause(); for (const o of sc.children.list) if (o.depth >= 100) o.setVisible(false); });
const out = {};
await h.page.evaluate(() => { const cam = window.__WFM_GAME.scene.scenes[0].cameras.main; cam.setZoom(2.4); cam.centerOn(520, 400); });
for (const lying of ['supine', 'prone']) for (const facing of [1, -1]) for (const falls of [false, true]) {
    const m = await h.page.evaluate(([lying, facing, falls]) => {
        const sc = window.__WFM_GAME.scene.scenes[0], w = sc.w1, sk = w.skeleton;
        sc.w2.skeleton.setVisible(false); sc.w2.gfx.clear();
        w.gfx.clear(); sk.setVisible(true); sk.setFalls(falls);
        const x = 520, y = 400, s = w.s;
        sk.updateGrounded(x, y, s, facing, lying);
        w.gfx.lineStyle(1, 0xff0000, 1); w.gfx.lineBetween(x - 150, y, x + 150, y);
        const P = sk.jointAttachmentPoints, r = (v) => +(v / s).toFixed(1), rel = (p) => ({ x: r((p.x - x) * facing), y: r(y - p.y) });
        return Object.fromEntries(['neck', 'nearHip', 'farHip', 'nearShoulder', 'farShoulder', 'nearElbow', 'farElbow', 'nearWrist', 'farWrist', 'nearKnee', 'farKnee', 'nearAnkle', 'farAnkle'].map(k => [k, rel(P[k])]));
    }, [lying, facing, falls]);
    out[`${lying}-${facing > 0 ? 'r' : 'l'}-${falls ? 'rest' : 'missile'}`] = m;
    await h.page.waitForTimeout(80);
    await h.page.screenshot({ path: `${outDir}/${lying}_${facing > 0 ? 'r' : 'l'}_${falls ? 'rest' : 'missile'}.png`, clip: { x: 150, y: 210, width: 800, height: 300 } });
}
console.log(JSON.stringify(out));
process.exit(0);
