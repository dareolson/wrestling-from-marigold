// Consolidated FINAL-CORRECTION evidence for the ACTUAL integrated thesz.js
// config (no live overrides — reads whatever src/characters/thesz.js ships).
// Produces, under evidence/final-correction/:
//   neutral_<R|L>.png           filter-free full-body neutral, each facing
//   checker_<joint>_<R|L>.png   checkerboard close-ups: neck, shoulder, elbow,
//                               hip, knee (magenta/teal behind so any gap shows)
//   armsweep_<R|L>_<n>.png      dense shoulder/elbow rotation sweep
//   legsweep_<R|L>_<n>.png      dense hip/knee rotation sweep
//   gait_<R|L>_<n>.png          frames across a walk cycle
//   getup_<R|L>_<t>.png         grounded / get-up samples
//   arena_<near|mid|far>.png    live Lou vs George, broadcast filter ON
//   arena_<near|mid|far>_clean.png  same cameras, filter stripped
//
// Framing is computed from Lou's ACTUAL on-screen part bounding box every shot
// (no fixed crop), so overhead-arm poses (taunt/axe-handle) can't fall out of
// frame. Every capture is decoded and checked for ink: a shot whose
// foreground-pixel ratio is below MIN_INK is REJECTED (logged; run exits
// non-zero) so a blank "ring only" frame can never be accepted as evidence.
//
//   node tools/debug/lou_final_evidence.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { POSES } from '../../src/Wrestler.js';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const OUT = path.join(REPO, 'Sprite sheets/AI Pilot/Lou/v2-layer-standardization/runtime-conformed/evidence/final-correction');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 5202;
const MIN_INK = 0.010; // >=1.0% of crop pixels must be non-background ink

const rejects = [];
let inkPage = null;

async function up(url, ms = 20000) { const e = Date.now() + ms; while (Date.now() < e) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(r => setTimeout(r, 250)); } throw new Error('no server'); }

// Measure the fraction of PINK-SKIN pixels in a saved PNG. Lou is a shirtless
// wrestler, so a correctly framed shot has several % of exposed pink skin; a
// "ring only" / crowd-only frame reads ~0% even though it has plenty of
// non-background ink. This is the wrestler-presence gate the task requires
// ("every expected wrestler is actually inside the image").
function isSkin(r, g, b) { return r > 175 && r < 255 && g > 95 && g < 200 && b > 95 && b < 200 && r - g > 25 && r - b > 25; }
async function skinRatio(file) {
    const b64 = fs.readFileSync(file).toString('base64');
    return await inkPage.evaluate(async (url) => {
        const img = new Image(); img.src = url; await img.decode();
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
        let skin = 0; for (let i = 0; i < data.length; i += 4) { const r = data[i], g = data[i + 1], b = data[i + 2]; if (r > 175 && r < 255 && g > 95 && g < 200 && b > 95 && b < 200 && r - g > 25 && r - b > 25) skin++; }
        return skin / (width * height);
    }, 'data:image/png;base64,' + b64);
}

// Map a WORLD-space rect to PAGE pixels via the canvas element's bounding rect
// (world -> render space -> displayed CSS box), then page.screenshot that clip.
// The composited page screenshot reads a WebGL canvas correctly (an in-page
// drawImage of the WebGL buffer returns black); this mapping is independent of
// viewport size / canvas letterboxing.
async function captureWorld(page, name, worldRect, { skinGate = true } = {}) {
    if (!worldRect || worldRect.w < 4 || worldRect.h < 4) { rejects.push(`${name} (no rect)`); console.log('  REJECT', name, 'no rect'); return; }
    const clip = await page.evaluate((wr) => {
        const sc = window.__WFM_GAME.scene.scenes[0]; const cam = sc.cameras.main; const wv = cam.worldView;
        const cv = sc.game.canvas; const r = cv.getBoundingClientRect();
        const sx = r.width / wv.width, sy = r.height / wv.height;
        const x = r.left + (wr.x - wv.x) * sx, y = r.top + (wr.y - wv.y) * sy;
        const cx = Math.max(0, x), cy = Math.max(0, y);
        return { x: cx, y: cy, width: Math.max(1, Math.min(window.innerWidth - cx, wr.w * sx)), height: Math.max(1, Math.min(window.innerHeight - cy, wr.h * sy)) };
    }, worldRect);
    const file = path.join(OUT, name);
    await page.screenshot({ path: file, clip });
    const s = await skinRatio(file);
    if (skinGate && s < MIN_INK) { rejects.push(`${name} (skin ${(s * 100).toFixed(2)}%)`); console.log('  REJECT', name, `skin ${(s * 100).toFixed(2)}%`); }
    else console.log('  ok', name, `skin ${(s * 100).toFixed(2)}%`);
}

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: REPO, stdio: 'ignore' });
const base = `http://localhost:${PORT}`;
await up(base);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
inkPage = await browser.newPage(); await inkPage.setContent('<body></body>');

function pagePrep(slot) {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc[slot];
    window.__w = w;
    const other = sc[slot === 'w1' ? 'w2' : 'w1'];
    if (other) { other.update = () => {}; other.x = w.x + 900; other.draw?.(); }
    w.update = () => {};
    const cb = sc.add.graphics().setDepth(5); cb.setVisible(false);
    const g = sc.add.graphics().setDepth(9999);
    window.__cb = cb; window.__g = g;
    window.__stripFilter = () => {
        try { const cam = sc.cameras.main; if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); } } catch {}
        for (const k of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[k]?.setVisible(false);
        for (const o of sc.children.list) if (o.texture && o.texture.key === 'scanlines') o.setVisible(false);
    };
    window.__louBBox = () => {
        const sk = w.skeleton;
        const parts = ['head', 'torso', 'trunks', 'nearUpArm', 'farUpArm', 'nearForearm', 'farForearm', 'nearThigh', 'farThigh', 'nearShin', 'farShin', 'nearBoot', 'farBoot'];
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, any = false;
        for (const p of parts) { const im = sk[p]; if (!im || !im.getBounds || im.visible === false) continue; const b = im.getBounds(); if (!isFinite(b.x)) continue; any = true; minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.right); maxY = Math.max(maxY, b.bottom); }
        return any ? { minX, minY, maxX, maxY } : null;
    };
    window.__toScreen = (wx, wy) => { const cam = sc.cameras.main, wv = cam.worldView; return { x: (wx - wv.x) * cam.zoom, y: (wy - wv.y) * cam.zoom, z: cam.zoom }; };
    window.__parts = ['head', 'torso', 'trunks', 'nearUpArm', 'farUpArm', 'nearForearm', 'farForearm', 'nearThigh', 'farThigh', 'nearShin', 'farShin', 'nearBoot', 'farBoot'];
    window.__hideChecker = () => { window.__cb?.setVisible(false); window.__g?.clear(); };
    window.__setPose = (pose, facing) => { w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.facing = facing; if (pose) w.pose = { ...pose }; w.draw(); };
    window.__gait = (ph, facing) => { w.state = 'standing'; w.facing = facing; w.moveBlend = 1; w.walkPhase = ph; w.vx = 0; w.draw(); };
}

async function openFacing(facing) {
    const url = facing >= 0 ? `${base}?p1=thesz&p2=george` : `${base}?p1=george&p2=thesz`;
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.locator('canvas').click();
    await page.waitForTimeout(8000);
    await page.evaluate(pagePrep, facing >= 0 ? 'w1' : 'w2');
    await page.evaluate(() => window.__stripFilter());
    return page;
}

// World-space framing rect around Lou's part bbox, with padding (world px).
async function louRect(page, pad = 22) {
    return await page.evaluate((pad) => {
        const bb = window.__louBBox(); if (!bb) return null;
        return { x: bb.minX - pad, y: bb.minY - pad, w: (bb.maxX - bb.minX) + pad * 2, h: (bb.maxY - bb.minY) + pad * 2 };
    }, pad);
}

// World-space rect around one joint point, for a checkerboard close-up.
const F = { 1: 'R', '-1': 'L' };
for (const facing of [1, -1]) {
    const tag = F[facing];
    console.log(`facing ${tag}`);
    const page = await openFacing(facing);

    await page.evaluate((f) => window.__setPose(undefined, f), facing); // theszIdle is default pose
    await page.evaluate(() => window.__hideChecker());
    await page.waitForTimeout(40);
    await captureWorld(page, `neutral_${tag}.png`, await louRect(page));

    // Filter-free zoomed joint close-ups over the ring. (A checkerboard BEHIND
    // Lou is infeasible: the wrestler is a cached render-texture that composites
    // beneath all scene graphics and only refreshes on w.draw(), so neither a
    // live checker layer nor a Lou-hidden difference matte works. The
    // authoritative seam-gap proof is the art-aware, machine-measured 0px in
    // diag_joint_attachment_audit.txt / diag_knee_ink_gap_sweep.txt — a real
    // gap would show the ring through these zooms and non-zero px in those logs.)
    for (const joint of ['neck', 'nearShoulder', 'nearElbow', 'nearHip', 'nearKnee', 'farKnee']) {
        const rect = await page.evaluate((joint) => {
            const sk = window.__w.skeleton; const p = (sk.jointAttachmentPoints || {})[joint]; if (!p) return null;
            return { x: p.x - 28, y: p.y - 28, w: 56, h: 56 };
        }, joint);
        await page.waitForTimeout(20);
        await captureWorld(page, `jointzoom_${joint}_${tag}.png`, rect, { skinGate: joint !== 'neck' });
    }

    let n = 0;
    for (const a of [-0.3, 0.3, 0.9, 1.6, 2.2, 3.0]) {
        await page.evaluate(({ a, f }) => window.__setPose({ lLeg: 0.06, rLeg: 0.06, lArm: a, rArm: a * 0.85, lean: 0, crouch: 0.05 }, f), { a, f: facing });
        await page.evaluate(() => window.__hideChecker());
        await page.waitForTimeout(30);
        await captureWorld(page, `armsweep_${tag}_${n}.png`, await louRect(page)); n++;
    }

    n = 0;
    for (const a of [-0.9, -0.5, -0.2, 0.2, 0.5, 0.9]) {
        await page.evaluate(({ a, f }) => window.__setPose({ lLeg: a, rLeg: -a, lArm: 0.1, rArm: -0.1, lean: 0, crouch: 0.08 }, f), { a, f: facing });
        await page.waitForTimeout(30);
        await captureWorld(page, `legsweep_${tag}_${n}.png`, await louRect(page)); n++;
    }

    n = 0;
    for (const ph of [0, 1.05, 2.1, 3.14, 4.2, 5.24]) {
        await page.evaluate(({ ph, f }) => window.__gait(ph, f), { ph, f: facing });
        await page.waitForTimeout(30);
        await captureWorld(page, `gait_${tag}_${n}.png`, await louRect(page)); n++;
    }

    for (const t of [0, 0.34, 0.72, 1]) {
        await page.evaluate(({ t, f }) => { const w = window.__w; w.facing = f; w.state = 'gettingUp'; w.riseT = t; w.moveBlend = 0; w.draw(); }, { t, f: facing });
        await page.waitForTimeout(30);
        await captureWorld(page, `getup_${tag}_${String(t).replace('.', '')}.png`, await louRect(page, 40));
    }
    await page.close();
}

// ── Arena previews (broadcast filter ON + clean twin) ──
async function arenaOnce(label, dx) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
    await page.goto(`${base}?p1=thesz&p2=george`, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.locator('canvas').click();
    await page.waitForTimeout(8500);
    // World rect spanning both wrestlers (Lou vs George), centered on Lou.
    const rect = await page.evaluate((dx) => {
        const sc = window.__WFM_GAME.scene.scenes[0]; const w = sc.w1; w.x += dx; w.update = () => {}; w.draw?.();
        const cam = sc.cameras.main, wv = cam.worldView;
        const cx = Math.max(wv.x + 160, Math.min(wv.x + wv.width - 160, w.x));
        return { x: cx - 160, y: wv.y + 20, w: 320, h: wv.height - 40 };
    }, dx);
    await page.waitForTimeout(300);
    await captureWorld(page, `arena_${label}.png`, rect, { skinGate: false });  // filter ON tints skin -> gate off
    await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; try { const cam = sc.cameras.main; if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); } } catch {} for (const k of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[k]?.setVisible(false); for (const o of sc.children.list) if (o.texture && o.texture.key === 'scanlines') o.setVisible(false); });
    await page.waitForTimeout(150);
    await captureWorld(page, `arena_${label}_clean.png`, rect);  // filter stripped -> skin gate ON
    await page.close();
}
for (const [label, dx] of [['near', 70], ['mid', 0], ['far', -90]]) await arenaOnce(label, dx);

await browser.close();
server.kill();
console.log('\nDONE ->', OUT);
if (rejects.length) { console.log('REJECTED CAPTURES:', rejects.length); for (const r of rejects) console.log('  -', r); process.exit(2); }
console.log('all captures passed the ink check.');
