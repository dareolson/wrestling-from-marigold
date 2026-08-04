// Renders the CURRENTLY-INSTALLED Lou thigh across gait / knee-lift / crouch /
// get-up / leg-extreme poses in BOTH facings, tight on the knee, into a single
// labeled montage. Driver script swaps thigh.png + box.h per candidate and runs
// this once per candidate so the knee shape can be compared in real motion (the
// task requires a visual compare, not gap/protrusion numbers alone).
//
//   WFM_CAND=<label> node tools/debug/lou_thigh_cand_render.mjs
// Output: <scratch>/thigh_cand/render_<label>.png  (path via WFM_OUT)

import { launch } from './harness.mjs';
import { POSES } from '../../src/Wrestler.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const LABEL = process.env.WFM_CAND || 'cand';
const OUTDIR = process.env.WFM_OUTDIR || `./tools/debug/shots/cand_${LABEL}`;
mkdirSync(OUTDIR, { recursive: true });

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

// Which knee to center each shot on (near unless the pose shows the far leg).
async function shot(cfg) {
    const clip = await page.evaluate((cfg) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = window.__w;
        w.facing = cfg.facing; w.vy = 0;
        if (cfg.getup !== undefined) { w.state = 'gettingUp'; w.riseT = cfg.getup; }
        else if (cfg.gait) { w.state = 'standing'; w.moveBlend = 1; w.vx = cfg.facing * 120; w.walkPhase = cfg.phase; w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 }; }
        else { w.state = 'standing'; w.moveBlend = 0; w.vx = 0; w.walkPhase = 0; w.pose = cfg.pose; }
        w.draw();
        const sk = w.skeleton, cam = sc.cameras.main, wv = cam.worldView;
        const cv = sc.game.canvas, r = cv.getBoundingClientRect();
        const sxr = r.width / wv.width, syr = r.height / wv.height;
        const k = cfg.far ? sk.farKneeDebug : sk.nearKneeDebug;
        const half = 70;
        const x = r.left + (k.x - half - wv.x) * sxr, y = r.top + (k.y - half - wv.y) * syr;
        return { x: Math.max(0, x), y: Math.max(0, y), width: 2 * half * sxr, height: 2 * half * syr };
    }, cfg);
    await page.waitForTimeout(25);
    await page.screenshot({ path: `${OUTDIR}/${cfg.label}.png`, clip });
}

const KNEE_LIFT = { lLeg: 1.72, rLeg: -0.06, lArm: 0.9, rArm: 0.24, lean: 0.34, crouch: 0.10 };
const CROUCH = { lLeg: 0.2, rLeg: -0.2, lArm: 0.2, rArm: -0.2, lean: 0.1, crouch: 0.6 };
const EXT_BACK = { lLeg: -0.9, rLeg: 0.9, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
const EXT_FWD = { lLeg: 0.9, rLeg: -0.9, lArm: 0, rArm: 0, lean: 0, crouch: 0 };

const jobs = [];
for (const facing of [1, -1]) {
    const F = facing > 0 ? 'R' : 'L';
    jobs.push({ label: `gait0_${F}`, facing, gait: true, phase: 0 });
    jobs.push({ label: `gait2_${F}`, facing, gait: true, phase: Math.PI * 0.5 });
    jobs.push({ label: `gait4_${F}`, facing, gait: true, phase: Math.PI });
    jobs.push({ label: `kneeLift_${F}`, facing, pose: KNEE_LIFT });
    jobs.push({ label: `crouch_${F}`, facing, pose: CROUCH });
    jobs.push({ label: `getup03_${F}`, facing, getup: 0.34 });
    jobs.push({ label: `getup07_${F}`, facing, getup: 0.72 });
    jobs.push({ label: `extBack_${F}`, facing, pose: EXT_BACK });
    jobs.push({ label: `extFwd_${F}`, facing, pose: EXT_FWD });
    jobs.push({ label: `extBackFar_${F}`, facing, pose: EXT_BACK, far: true });
    jobs.push({ label: `kneeDropTuck_${F}`, facing, pose: { ...POSES.kneeDropTuck }, far: true });
}

for (const j of jobs) await shot(j);
await h.close();
console.log('wrote frames to', OUTDIR);
