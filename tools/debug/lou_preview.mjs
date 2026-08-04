// Fresh full-body Lou previews (filter-free) for the art-correction pass:
// neutral, gait, knee-lift, get-up, shoulder-motion (taunt/overhead), and a
// gameplay pose — both facings. Confirms the corrected art (restored knee,
// de-belled neck + shoulder) and restored arms-low theszIdle read correctly on
// the whole body, not just in joint close-ups.
//
//   node tools/debug/lou_preview.mjs
// Output: <WFM_OUTDIR>/<label>.png (default tools/debug/shots/preview)

import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';
import { mkdirSync } from 'node:fs';

const OUTDIR = process.env.WFM_OUTDIR || './tools/debug/shots/preview';
mkdirSync(OUTDIR, { recursive: true });

process.env.WFM_P1 = 'thesz';
process.env.WFM_P2 = 'george';
const h = await launch();
const page = h.page;
await page.waitForTimeout(8000);

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

async function shot(label, facing, cfg) {
    const clip = await page.evaluate(({ facing, cfg }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = window.__w;
        w.facing = facing; w.vy = 0;
        if (cfg.getup !== undefined) { w.state = 'gettingUp'; w.riseT = cfg.getup; }
        else if (cfg.gait) { w.state = 'standing'; w.moveBlend = 1; w.vx = facing * 120; w.walkPhase = cfg.phase; w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 }; }
        else { w.state = 'standing'; w.moveBlend = cfg.idlePose ? 1 : 0; w.vx = 0; w.walkPhase = 0; w.pose = cfg.pose || { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 }; }
        w.draw();
        const cam = sc.cameras.main, wv = cam.worldView, cv = sc.game.canvas, r = cv.getBoundingClientRect();
        const sxr = r.width / wv.width, syr = r.height / wv.height;
        const cx = r.left + (w.x - wv.x) * sxr;
        const top = r.top + (w.y - 250 - wv.y) * syr;
        return { x: Math.max(0, cx - 120 * sxr), y: Math.max(0, top), width: 240 * sxr, height: 290 * syr };
    }, { facing, cfg });
    await page.waitForTimeout(30);
    await page.screenshot({ path: `${OUTDIR}/${label}.png`, clip });
    console.log('saved', label);
}

const SHOULDER_TAUNT = { ...POSES.tauntArmsWide };       // arms wide/up — shoulder motion
const GAMEPLAY = { ...POSES.hammerlockCrank };            // a grapple gameplay pose
const KNEE_LIFT = { lLeg: 1.72, rLeg: -0.06, lArm: 0.9, rArm: 0.24, lean: 0.34, crouch: 0.10 };

for (const facing of [1, -1]) {
    const F = facing > 0 ? 'R' : 'L';
    await shot(`neutral_${F}`, facing, { idlePose: true, pose: { ...POSES.theszIdle } });
    await shot(`gait0_${F}`, facing, { gait: true, phase: 0 });
    await shot(`gait2_${F}`, facing, { gait: true, phase: Math.PI * 0.6 });
    await shot(`kneeLift_${F}`, facing, { pose: KNEE_LIFT });
    await shot(`getup_${F}`, facing, { getup: 0.5 });
    await shot(`shoulderTaunt_${F}`, facing, { pose: SHOULDER_TAUNT });
    await shot(`gameplay_${F}`, facing, { pose: GAMEPLAY });
}
await h.close();
console.log('DONE', OUTDIR);
