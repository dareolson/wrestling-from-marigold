// Renders thesz (idle + mid-gait) and george (idle) full-body with a magenta
// reference line at world y = w.y (the intended mat line: the shadow ellipse is
// drawn there, and w.y is the ring-floor clamp). Lets us SEE whether the boot
// soles rest on that line or sink below it — the ground truth for the sole
// grounding question.
//
//   node tools/debug/lou_mat_check.mjs
// Output: <WFM_OUTDIR>/{thesz_idle,thesz_gait,george_idle}.png

import { launch } from './harness.mjs';
import { mkdirSync } from 'node:fs';

const OUTDIR = process.env.WFM_OUTDIR || './tools/debug/shots/matcheck';
mkdirSync(OUTDIR, { recursive: true });

async function run(p1, tag, moveBlend, phase) {
    process.env.WFM_P1 = p1;
    process.env.WFM_P2 = p1 === 'george' ? 'thesz' : 'george';
    const h = await launch();
    const page = h.page;
    await page.waitForTimeout(8000);
    const clip = await page.evaluate(({ moveBlend, phase }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = sc.w1, other = sc.w2;
        if (other) { other.update = () => {}; other.x = w.x + 900; other.draw?.(); }
        w.update = () => {};
        try { const cam = sc.cameras.main; if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); } } catch {}
        for (const k of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[k]?.setVisible(false);
        for (const o of sc.children.list) if (o.texture && o.texture.key === 'scanlines') o.setVisible(false);
        w.facing = 1; w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = moveBlend; w.walkPhase = phase;
        w.pose = { lLeg: 0, rLeg: 0, lArm: 0, rArm: 0, lean: 0, crouch: 0 };
        w.draw();
        // magenta mat line at world y = w.y, plus a cyan line 2px below (threshold)
        const g = sc.add.graphics().setDepth(99999);
        g.lineStyle(1, 0xff00ff, 1); g.beginPath(); g.moveTo(w.x - 120, w.y); g.lineTo(w.x + 120, w.y); g.strokePath();
        const cam = sc.cameras.main, wv = cam.worldView, cv = sc.game.canvas, r = cv.getBoundingClientRect();
        const sxr = r.width / wv.width, syr = r.height / wv.height;
        const cx = r.left + (w.x - wv.x) * sxr;
        const top = r.top + (w.y - 210 - wv.y) * syr;
        return { x: Math.max(0, cx - 110 * sxr), y: Math.max(0, top), width: 220 * sxr, height: 250 * syr };
    }, { moveBlend, phase });
    await page.waitForTimeout(40);
    await page.screenshot({ path: `${OUTDIR}/${tag}.png`, clip });
    await h.close();
    console.log('saved', tag);
}

await run('thesz', 'thesz_idle', 0, 0);
await run('thesz', 'thesz_gait', 1, 2.356);
await run('george', 'george_idle', 0, 0);
console.log('DONE', OUTDIR);
