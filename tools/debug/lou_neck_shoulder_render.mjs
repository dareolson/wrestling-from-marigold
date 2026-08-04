// Clean, filter-free, zoomed close-ups of Lou's neck seam and near/far shoulder
// seam in both facings, for the neck-bezel + shoulder-bezel corrections.
// Freezes Lou idle, strips the broadcast filter, and crops tight around the
// neck and shoulder joint-attachment points at high zoom so a painted internal
// outline (dark collar ring / circular deltoid stroke) is visible.
//
//   node tools/debug/lou_neck_shoulder_render.mjs
// Output: <WFM_OUTDIR>/{neck,nearSh,farSh}_{R,L}.png  (default tools/debug/shots/necksh)

import { launch } from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUTDIR = process.env.WFM_OUTDIR || './tools/debug/shots/necksh';
mkdirSync(OUTDIR, { recursive: true });
const POSE = process.env.WFM_POSE || 'idle';

process.env.WFM_P1 = 'thesz';
process.env.WFM_P2 = 'george';
const h = await launch();
const page = h.page;
await page.waitForTimeout(8000); // clear intro card

await page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1, other = sc.w2;
    window.__w = w;
    if (other) { other.update = () => {}; other.x = w.x + 900; other.draw?.(); }
    w.update = () => {};
    try { const cam = sc.cameras.main; if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); } } catch {}
    for (const k of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[k]?.setVisible(false);
    for (const o of sc.children.list) if (o.texture && o.texture.key === 'scanlines') o.setVisible(false);
});

async function shot(name, facing, joint, half, pose) {
    const clip = await page.evaluate(({ facing, joint, half, pose }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = window.__w;
        w.facing = facing; w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.walkPhase = 0;
        w.pose = pose || { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
        w.draw();
        const sk = w.skeleton, cam = sc.cameras.main, wv = cam.worldView;
        const cv = sc.game.canvas, r = cv.getBoundingClientRect();
        const sxr = r.width / wv.width, syr = r.height / wv.height;
        const p = sk.jointAttachmentPoints[joint];
        const x = r.left + (p.x - half - wv.x) * sxr, y = r.top + (p.y - half - wv.y) * syr;
        return { x: Math.max(0, x), y: Math.max(0, y), width: 2 * half * sxr, height: 2 * half * syr };
    }, { facing, joint, half, pose });
    await page.waitForTimeout(25);
    await page.screenshot({ path: `${OUTDIR}/${name}.png`, clip });
    console.log('saved', name);
}

const POSES = {
    idle: null,
    lowered: { lArm: 0, rArm: 0 },
    forward: { lArm: 0.9, rArm: 0.9 },
    horizontal: { lArm: 1.4, rArm: 1.4 },
    overhead: { lArm: 2.2, rArm: 2.2 },
    lockup: { lArm: 1.1, rArm: 1.1, lean: 0.1 },
};
const p = POSES[POSE];

for (const facing of [1, -1]) {
    const F = facing > 0 ? 'R' : 'L';
    await shot(`neck_${F}`, facing, 'neck', 34, p);
    await shot(`nearSh_${F}`, facing, 'nearShoulder', 40, p);
    await shot(`farSh_${F}`, facing, 'farShoulder', 40, p);
}
await h.close();
console.log('DONE', OUTDIR);
