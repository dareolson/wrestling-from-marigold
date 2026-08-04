// Lou (thesz) head-seating render for the final-correction pass. Boots the game
// once, strips the broadcast filter, freezes Lou standing idle, and screenshots
// a head+neck+shoulders crop in BOTH facings for a set of head candidates
// (headScale + neck socket {u,v}). Mutates the live rig fields the renderer
// reads (_headScale, _torsoSockets.neck) so every pixel comes from the real
// draw(). Overlays the recorded neck anchor (red) so a floating head / neck
// spike is visible.
//
//   node tools/debug/lou_head_render.mjs
//
// Output: evidence/final-correction/head_<name>_<facing>.png

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const OUT = path.join(REPO, 'Sprite sheets/AI Pilot/Lou/v2-layer-standardization/runtime-conformed/evidence/final-correction');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5196;

// Candidates: name -> { headScale, neck:{u,v} }. Same config used for BOTH
// facings (the rig mirrors the socket u about 0.5 via facing*(u-0.5)).
const CANDS = [
    { name: 'current_R-only', headScale: 0.63, neck: { u: 0.54878, v: 0.080357 } },
    { name: 'mirror_s063_u0549', headScale: 0.63, neck: { u: 0.54878, v: 0.080357 } },
    { name: 'mirror_s063_u0530', headScale: 0.63, neck: { u: 0.530, v: 0.095 } },
    { name: 'mirror_s065_u0530', headScale: 0.65, neck: { u: 0.530, v: 0.095 } },
    { name: 'mirror_s065_u0520', headScale: 0.65, neck: { u: 0.520, v: 0.105 } },
];

async function up(url, ms = 20000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(r => setTimeout(r, 250)); }
    throw new Error('no server');
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: REPO, stdio: 'ignore' });
const base = `http://localhost:${PORT}`;
await up(base);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

async function renderFacing(facing) {
    const url = facing >= 0 ? `${base}?p1=thesz&p2=george` : `${base}?p1=george&p2=thesz`;
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.locator('canvas').click();
    await page.waitForTimeout(8000);

    const slot = facing >= 0 ? 'w1' : 'w2';
    await page.evaluate(({ slot }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = sc[slot];
        window.__ov = { headScale: 0.63, neck: { u: 0.54878, v: 0.080357 }, facing: 1 };
        const g = sc.add.graphics().setDepth(9999);
        window.__applyHead = () => {
            const o = window.__ov;
            const sk = w.skeleton;
            sk._headScale = o.headScale;
            if (sk._torsoSockets?.neck) { sk._torsoSockets.neck.u = o.neck.u; sk._torsoSockets.neck.v = o.neck.v; }
            w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.facing = o.facing;
            w.draw();
            g.clear();
            const p = sk.jointAttachmentPoints?.neck;
            if (p) { g.fillStyle(0xff0000, 1); g.fillCircle(p.x, p.y, 2.0); }
            g.setDepth(9999);
        };
        try {
            const cam = sc.cameras.main;
            if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); }
        } catch (e) { console.log('filter strip', e.message); }
        for (const key of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[key]?.setVisible(false);
        for (const o of sc.children.list) { if (o.texture && o.texture.key === 'scanlines') o.setVisible(false); }
        w.update = () => {};
        const other = sc[slot === 'w1' ? 'w2' : 'w1'];
        if (other) { other.update = () => {}; other.x = w.x + 600; other.draw?.(); }
        window.__louScreen = () => {
            const cam = sc.cameras.main; const wv = cam.worldView;
            return { sx: (w.x - wv.x) * cam.zoom, sy: (w.y - wv.y) * cam.zoom, zoom: cam.zoom };
        };
    }, { slot });

    for (const cand of CANDS) {
        const box = await page.evaluate(({ cand, facing }) => {
            window.__ov = { headScale: cand.headScale, neck: { ...cand.neck }, facing };
            window.__applyHead();
            const sc = window.__WFM_GAME.scene.scenes[0];
            for (const key of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[key]?.setVisible(false);
            return window.__louScreen();
        }, { cand, facing });
        await page.waitForTimeout(50);
        // Empirical: Lou's visual center sits ~55px (world) right of box.sx in
        // this camera; shift the crop center so the head is framed.
        const cx = Math.round(box.sx + 55 * box.zoom), cy = Math.round(box.sy);
        const half = Math.round(80 * box.zoom);
        // Head+neck+shoulders crop: from above the crown down to mid-torso.
        const clip = { x: Math.max(0, cx - half), y: Math.max(0, cy - Math.round(170 * box.zoom)), width: half * 2, height: Math.round(150 * box.zoom) };
        const name = `head_${cand.name}_${facing >= 0 ? 'R' : 'L'}.png`;
        await page.screenshot({ path: path.join(OUT, name), clip });
        console.log('wrote', name);
    }
    await page.close();
}

await renderFacing(1);
await renderFacing(-1);
await browser.close();
server.kill();
console.log('DONE ->', OUT);
