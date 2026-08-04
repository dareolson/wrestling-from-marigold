// Renders Lou (thesz) leg-tune candidates for visual comparison. Boots the
// game once, then for each candidate applies the measured pivots + that
// candidate's offsets to the LIVE rig, freezes Lou standing idle (or a posed
// leg splay), and screenshots a Lou-cropped region in both facings. Also draws
// debug overlays: the true bone knee/hip (red), the shin render origin (cyan),
// and a magenta checkerboard behind so any transparent hip/knee opening shows.
//
//   node tools/debug/lou_leg_candidate_render.mjs
//
// Output: evidence/final-leg-tune/cand_<name>_<facing>[_<pose>].png

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const OUT = path.join(REPO, 'Sprite sheets/AI Pilot/Lou/v2-layer-standardization/runtime-conformed/evidence/final-leg-tune');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5198;

const PIVOTS = {
    thighPivotOffsetFrac: -0.0767,
    thighDistalAnchorFrac: { u: 0.5444, v: 1.0 },
    shinPivotOffsetFrac: -0.1167,
};
const SHIPPED = {
    legOffsetX: -15, legOffsetY: -15, nearLegOffsetY: 0,
    nearShinOffsetX: -22, nearShinOffsetY: 9,
    farShinOffsetX: 6, farShinOffsetY: -3, farLegOffsetX: 6, farLegOffsetY: -2,
};

// Candidates to render (name -> {pivots, offsets, noThighDistal})
// final-correction pass: compare shipped (no pivots) vs V2 (pivotOffsetFrac
// only — shin knee lands on bone knee, thigh centered, NO distalAnchorFrac so
// the shin attaches at the bone knee not the overlap tail) vs V1 (full pivots
// incl. distalAnchorFrac{v:1.0}, which routes the shin onto the thigh overlap
// tail and detaches the near knee at leg extremes).
// V2 = thigh+shin pivotOffsetFrac only (no distalAnchorFrac). Shin offsets stay
// 0 so the shin rides the true knee (no orbit); tune far-leg depth stagger via
// farLegOffsetX only (whole-leg root move). legOffsetX small near-leg centering.
const V2 = (o) => ({ legOffsetX: 0, nearLegOffsetY: 4, nearShinOffsetX: 0, nearShinOffsetY: 0, farLegOffsetX: 0, farLegOffsetY: 2, farShinOffsetX: 0, farShinOffsetY: 0, ...o });
const CANDS = [
    { name: 'baseline_shipped', pivots: false, offsets: {} },
    { name: 'V2_far0', pivots: true, noThighDistal: true, offsets: V2({ farLegOffsetX: 0 }) },
    { name: 'V2_far8', pivots: true, noThighDistal: true, offsets: V2({ farLegOffsetX: 8 }) },
    { name: 'V2_far16', pivots: true, noThighDistal: true, offsets: V2({ farLegOffsetX: 16 }) },
    { name: 'V2_far16_nearX-4', pivots: true, noThighDistal: true, offsets: V2({ farLegOffsetX: 16, legOffsetX: -4 }) },
];

const POSE_SETS = [
    { tag: 'idle', pose: null },
    { tag: 'splay', pose: { lLeg: 0.35, rLeg: -0.15, lArm: 0.1, rArm: -0.1, lean: 0, crouch: 0.1 } },
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
    // facing right => thesz P1; facing left => thesz P2 (game flips whole body)
    const url = facing >= 0 ? `${base}?p1=thesz&p2=george` : `${base}?p1=george&p2=thesz`;
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.locator('canvas').click();
    await page.waitForTimeout(8000); // clear broadcast intro title card

    const slot = facing >= 0 ? 'w1' : 'w2';
    // Install a per-frame override + overlay drawer.
    await page.evaluate(({ PIVOTS, SHIPPED, slot }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = sc[slot];
        window.__ov = { pivots: false, offsets: {}, pose: null, facing: 1 };
        // Overlay graphics on top
        const g = sc.add.graphics().setDepth(9999);
        window.__applyAndDraw = () => {
            const o = window.__ov;
            const sk = w.skeleton;
            if (o.pivots) {
                sk.nearThigh._pivotOffsetFrac = PIVOTS.thighPivotOffsetFrac;
                sk.farThigh._pivotOffsetFrac = PIVOTS.thighPivotOffsetFrac;
                sk.nearThigh._distalAnchorFrac = o.noThighDistal ? null : PIVOTS.thighDistalAnchorFrac;
                sk.farThigh._distalAnchorFrac = o.noThighDistal ? null : PIVOTS.thighDistalAnchorFrac;
                sk.nearShin._pivotOffsetFrac = PIVOTS.shinPivotOffsetFrac;
                sk.farShin._pivotOffsetFrac = PIVOTS.shinPivotOffsetFrac;
            } else {
                for (const im of [sk.nearThigh, sk.farThigh, sk.nearShin, sk.farShin]) { im._pivotOffsetFrac = 0; im._distalAnchorFrac = null; }
            }
            const off = { ...SHIPPED, ...o.offsets };
            sk._legOffsetX = off.legOffsetX; sk._legOffsetY = off.legOffsetY; sk._nearLegOffsetY = off.nearLegOffsetY;
            sk._nearShinOffsetX = off.nearShinOffsetX; sk._nearShinOffsetY = off.nearShinOffsetY;
            sk._farShinOffsetX = off.farShinOffsetX; sk._farShinOffsetY = off.farShinOffsetY;
            sk._farLegOffsetX = off.farLegOffsetX; sk._farLegOffsetY = off.farLegOffsetY;
            w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0;
            w.facing = o.facing;
            if (o.pose) w.pose = { ...o.pose };
            w.draw();
            // overlay: bone knees/hips (red), shin origins (cyan)
            g.clear();
            const pts = sk.jointAttachmentPoints || {};
            g.fillStyle(0xff0000, 1);
            for (const n of ['nearKnee', 'farKnee', 'nearHip', 'farHip']) { const p = pts[n]; if (p) g.fillCircle(p.x, p.y, 2.2); }
            g.fillStyle(0x00ffff, 1);
            for (const r of [sk.nearShinRenderDebug, sk.farShinRenderDebug]) { if (r) g.fillCircle(r.x, r.y, 1.6); }
            g.setDepth(9999);
        };
        // Strip the broadcast filter + overlays for a clean art read.
        try {
            const cam = sc.cameras.main;
            if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); }
        } catch (e) { console.log('filter strip', e.message); }
        for (const key of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[key]?.setVisible(false);
        for (const o of sc.children.list) { if (o.texture && o.texture.key === 'scanlines') o.setVisible(false); }
        // Freeze the game update so our override isn't stomped: monkeypatch w.update
        w.update = () => {};
        const other = sc[slot === 'w1' ? 'w2' : 'w1'];
        if (other) { other.update = () => {}; other.x = w.x + 600; other.draw?.(); }
        // Report Lou's SCREEN position via the main camera transform.
        window.__louScreen = () => {
            const cam = sc.cameras.main;
            const wv = cam.worldView;
            return { sx: (w.x - wv.x) * cam.zoom, sy: (w.y - wv.y) * cam.zoom, zoom: cam.zoom };
        };
    }, { PIVOTS, SHIPPED, slot });

    async function shoot(cand, poseSet) {
        await page.evaluate(({ cand, poseSet, facing }) => {
            window.__ov = { pivots: cand.pivots, offsets: cand.offsets, pose: poseSet.pose, facing };
            window.__applyAndDraw();
        }, { cand, poseSet, facing });
        await page.waitForTimeout(60);
        // re-apply + re-hide overlays in case a stray frame redrew them
        const box = await page.evaluate(() => {
            window.__applyAndDraw();
            const sc = window.__WFM_GAME.scene.scenes[0];
            for (const key of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[key]?.setVisible(false);
            for (const o of sc.children.list) { if (o.texture && o.texture.key === 'scanlines') o.setVisible(false); }
            return window.__louScreen();
        });
        const cx = Math.round(box.sx), cy = Math.round(box.sy);
        const half = Math.round(120 * box.zoom);
        // Legs-focused crop: from just above the hip down past the feet.
        const clip = { x: Math.max(0, cx - half), y: Math.max(0, cy - Math.round(70 * box.zoom)), width: half * 2, height: Math.round(210 * box.zoom) };
        const name = `cand_${cand.name}_${facing >= 0 ? 'R' : 'L'}_${poseSet.tag}.png`;
        await page.screenshot({ path: path.join(OUT, name), clip });
        console.log('wrote', name);
    }
    for (const cand of CANDS) for (const ps of POSE_SETS) await shoot(cand, ps);
    await page.close();
}

await renderFacing(1);
await renderFacing(-1);
await browser.close();
server.kill();
console.log('DONE ->', OUT);
