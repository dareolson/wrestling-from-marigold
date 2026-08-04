// Visual evidence for the thigh-tail-at-the-knee fix (2026-07-28, task 3).
// Renders Lou walking + a backward leg sweep + a knee-lift and saves screenshots
// cropped tight around the near knee so the thigh tail / shin overlap can be
// eyeballed. Uses the same freeze-the-wrestler + strip-filters + world->page
// crop technique as lou_final_evidence.mjs (the wrestler is a cached RT beneath
// scene graphics; neuter w.update so the AI can't overwrite the forced pose).
//
//   node tools/debug/lou_thigh_evidence.mjs [thesz]
// Output: tools/debug/shots/thigh_evidence/*.png

import { launch } from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CHAR = process.argv[2] || 'thesz';
const OUT = fileURLToPath(new URL('./shots/thigh_evidence/', import.meta.url));
mkdirSync(OUT, { recursive: true });

process.env.WFM_P1 = CHAR;
process.env.WFM_P2 = CHAR === 'george' ? 'thesz' : 'george';
const h = await launch();
const page = h.page;
await page.waitForTimeout(8000); // clear the intro title card

await page.evaluate(() => {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc.w1, other = sc.w2;
    window.__w = w;
    if (other) { other.update = () => {}; other.x = w.x + 900; other.draw?.(); }
    w.update = () => {};
    // strip film-grain / vignette / scanline overlays for a clean read
    try { const cam = sc.cameras.main; if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); } } catch {}
    for (const k of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[k]?.setVisible(false);
    for (const o of sc.children.list) if (o.texture && o.texture.key === 'scanlines') o.setVisible(false);
});

async function shot(name, cfg) {
    const clip = await page.evaluate((cfg) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = window.__w;
        w.facing = cfg.facing; w.state = 'standing'; w.vy = 0;
        if (cfg.gait) { w.moveBlend = 1; w.vx = cfg.facing * 120; w.walkPhase = cfg.phase; w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 }; }
        else { w.moveBlend = 0; w.vx = 0; w.walkPhase = 0; w.pose = cfg.pose; }
        w.draw();
        const sk = w.skeleton, cam = sc.cameras.main, wv = cam.worldView;
        const cv = sc.game.canvas, r = cv.getBoundingClientRect();
        const sxr = r.width / wv.width, syr = r.height / wv.height;
        const k = sk.nearKneeDebug;
        const half = 78; // world px around the knee
        const x = r.left + (k.x - half - wv.x) * sxr, y = r.top + (k.y - half - wv.y) * syr;
        const cx = Math.max(0, x), cy = Math.max(0, y);
        return { x: cx, y: cy, width: 2 * half * sxr, height: 2 * half * syr };
    }, cfg);
    await page.waitForTimeout(30);
    await page.screenshot({ path: `${OUT}${name}.png`, clip });
    console.log('saved', name);
}

for (let i = 0; i < 8; i++) await shot(`gait_f1_${i}`, { gait: true, facing: 1, phase: (i / 8) * Math.PI * 2 });
for (const a of [-0.3, -0.5, -0.7, -0.9]) await shot(`sweep_f1_${String(a)}`, { gait: false, facing: 1, pose: { lLeg: a, rLeg: -a, lArm: 0, rArm: 0, lean: 0, crouch: 0 } });
await shot('kneelift_f1', { gait: false, facing: 1, pose: { lLeg: 1.72, rLeg: -0.06, lArm: 0.9, rArm: 0.24, lean: 0.34, crouch: 0.10 } });
// facing -1 walk (mirror)
for (let i = 0; i < 4; i++) await shot(`gait_fN_${i}`, { gait: true, facing: -1, phase: (i / 4) * Math.PI * 2 });

await h.close();
console.log(`\nEvidence in ${OUT}`);
