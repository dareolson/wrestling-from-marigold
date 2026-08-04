// GENUINE Lou-over-checkerboard joint evidence via a DIFFERENCE MATTE.
//
// Depth-ordering a scene Graphics behind the wrestler proved unreliable, so
// this instead captures each crop twice — once with Lou's skeleton parts
// visible, once with them hidden (nothing else touched) — and a companion
// python step (lou_checker_composite.py) paints a checkerboard into every
// pixel that is identical between the two frames (i.e. background / a
// transparent joint gap) while keeping Lou's actual pixels. A real seam gap
// therefore shows up as checker showing through between two parts.
//
//   node tools/debug/lou_checker_evidence.mjs      # captures *_present/_absent
//   python3 tools/debug/lou_checker_composite.py   # builds checker_*.png
//
// Also emits filter-free full-body + enlarged head/shoulder + gait/knee/getup/
// leg-extreme/overhead-elbow closeups (single frame, no matte needed).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { POSES } from '../../src/Wrestler.js';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const OUT = path.join(REPO, 'Sprite sheets/AI Pilot/Lou/v2-layer-standardization/runtime-conformed/evidence/checker-final');
const RAW = path.join(OUT, 'raw');
fs.mkdirSync(RAW, { recursive: true });
const PORT = 5203;
const DSF = 3; // device scale factor for crisp closeups

async function up(url, ms = 25000) { const e = Date.now() + ms; while (Date.now() < e) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(r => setTimeout(r, 250)); } throw new Error('no server'); }

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: REPO, stdio: 'ignore' });
const base = `http://localhost:${PORT}`;
await up(base);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

function pagePrep(slot) {
    const sc = window.__WFM_GAME.scene.scenes[0];
    const w = sc[slot];
    window.__w = w;
    const other = sc[slot === 'w1' ? 'w2' : 'w1'];
    if (other) { other.update = () => {}; other.x = w.x + 1400; other.draw?.(); other.draw = () => {}; other.skeleton?.setVisible(false); }
    w.update = () => {};
    // Arena's scene update calls w.draw() every frame (Arena.js ~3139), which
    // would re-show parts right after __hideLou. Stub w.draw globally; __setPose/
    // __gait restore it only for the moment they need a real re-pose. The
    // renderer still presents setVisible() changes every frame on its own.
    w._realDraw = w.draw.bind(w);
    const repose = (fn) => { w.draw = w._realDraw; fn(); w.draw = () => {}; };
    window.__repose = repose;
    w.draw = () => {};
    window.__PARTS = ['head', 'torso', 'trunks', 'pelvisOverlay', 'nearUpArm', 'farUpArm', 'nearForearm', 'farForearm', 'nearThigh', 'farThigh', 'nearShin', 'farShin', 'nearBoot', 'farBoot'];
    window.__stripFilter = () => {
        try { const cam = sc.cameras.main; if (cam.filters) { cam.filters.enabled = false; cam.filters.internal?.clear?.(); cam.filters.external?.clear?.(); } } catch {}
        for (const k of ['grainGfx', 'flickerOverlay', 'vignetteGfx']) sc[k]?.setVisible(false);
        for (const o of sc.children.list) if (o.texture && o.texture.key === 'scanlines') o.setVisible(false);
    };
    window.__louBBox = () => {
        const sk = w.skeleton; let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, any = false;
        for (const p of window.__PARTS) { const im = sk[p]; if (!im || !im.getBounds || im.visible === false) continue; const b = im.getBounds(); if (!isFinite(b.x)) continue; any = true; minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.right); maxY = Math.max(maxY, b.bottom); }
        return any ? { minX, minY, maxX, maxY } : null;
    };
    window.__hideLou = () => { const sk = w.skeleton; for (const p of window.__PARTS) sk[p]?.setVisible(false); w.gfx?.setVisible(false); };
    window.__showLou = () => { const sk = w.skeleton; for (const p of window.__PARTS) sk[p]?.setVisible(true); w.gfx?.setVisible(true); };
    window.__setPose = (pose, facing) => repose(() => { w.state = 'standing'; w.vx = 0; w.vy = 0; w.moveBlend = 0; w.facing = facing; if (pose) w.pose = { ...pose }; w._realDraw(); });
    window.__gait = (ph, facing) => repose(() => { w.state = 'standing'; w.facing = facing; w.moveBlend = 1; w.walkPhase = ph; w.vx = 0; w._realDraw(); });
    window.__joint = (name) => { const p = (w.skeleton.jointAttachmentPoints || {})[name]; return p ? { x: p.x, y: p.y } : null; };
}

async function clipFor(page, worldRect) {
    return await page.evaluate((wr) => {
        const sc = window.__WFM_GAME.scene.scenes[0]; const cam = sc.cameras.main; const wv = cam.worldView;
        const cv = sc.game.canvas; const r = cv.getBoundingClientRect();
        const sx = r.width / wv.width, sy = r.height / wv.height;
        const x = r.left + (wr.x - wv.x) * sx, y = r.top + (wr.y - wv.y) * sy;
        const cx = Math.max(0, x), cy = Math.max(0, y);
        const width = Math.max(1, Math.min(window.innerWidth - cx, wr.w * sx));
        const height = Math.max(1, Math.min(window.innerHeight - cy, wr.h * sy));
        return { x: cx, y: cy, width, height };
    }, worldRect);
}

// Single-frame filter-free capture (no matte).
async function shot(page, name, worldRect) {
    if (!worldRect || worldRect.w < 4 || worldRect.h < 4) { console.log('  REJECT', name); return; }
    const clip = await clipFor(page, worldRect);
    if (clip.width < 4 || clip.height < 4) { console.log('  REJECT', name, 'clip'); return; }
    try { await page.screenshot({ path: path.join(OUT, name), clip }); console.log('  ok', name); }
    catch (e) { console.log('  REJECT', name, '(offscreen)'); }
}

// Present/absent pair for the difference matte.
async function mattePair(page, name, worldRect) {
    if (!worldRect || worldRect.w < 4) { console.log('  REJECT', name); return; }
    const clip = await clipFor(page, worldRect);
    if (clip.width < 4 || clip.height < 4) { console.log('  REJECT', name, 'clip'); return; }
    try {
        await page.evaluate(() => window.__showLou());
        await page.waitForTimeout(20);
        await page.screenshot({ path: path.join(RAW, `${name}_present.png`), clip });
        await page.evaluate(() => window.__hideLou());
        await page.waitForTimeout(20);
        await page.screenshot({ path: path.join(RAW, `${name}_absent.png`), clip });
        await page.evaluate(() => window.__showLou());
        console.log('  matte', name);
    } catch (e) { await page.evaluate(() => window.__showLou()); console.log('  REJECT', name, '(offscreen)'); }
}

async function louRect(page, pad = 22) {
    return await page.evaluate((pad) => { const bb = window.__louBBox(); if (!bb) return null; return { x: bb.minX - pad, y: bb.minY - pad, w: (bb.maxX - bb.minX) + pad * 2, h: (bb.maxY - bb.minY) + pad * 2 }; }, pad);
}
async function jointRect(page, jn, half) {
    return await page.evaluate(({ jn, half }) => { const p = window.__joint(jn); return p ? { x: p.x - half, y: p.y - half, w: half * 2, h: half * 2 } : null; }, { jn, half });
}

async function openFacing(facing) {
    const url = facing >= 0 ? `${base}?p1=thesz&p2=george` : `${base}?p1=george&p2=thesz`;
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: DSF });
    page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.locator('canvas').click();
    await page.waitForTimeout(8000);
    await page.evaluate(pagePrep, facing >= 0 ? 'w1' : 'w2');
    await page.evaluate(() => window.__stripFilter());
    return page;
}

const F = { 1: 'R', '-1': 'L' };
const JOINTS = ['neck', 'nearShoulder', 'farShoulder', 'nearElbow', 'farElbow', 'nearHip', 'farHip', 'nearKnee', 'farKnee'];
for (const facing of [1, -1]) {
    const tag = F[facing];
    console.log(`facing ${tag}`);
    const page = await openFacing(facing);

    await page.evaluate((f) => window.__setPose(undefined, f), facing);
    await page.waitForTimeout(40);
    await shot(page, `neutral_${tag}.png`, await louRect(page));
    await shot(page, `head_${tag}.png`, await jointRect(page, 'neck', 70));
    await shot(page, `shoulder_${tag}.png`, await jointRect(page, 'nearShoulder', 48));

    // Genuine checker joint closeups (idle pose) via matte pairs.
    for (const joint of JOINTS) {
        const rect = await jointRect(page, joint, 34);
        if (rect) await mattePair(page, `checker_${joint}_${tag}`, rect);
    }

    // Overhead + deep-bend elbow closeups. Skip if the elbow is off-screen.
    let n = 0;
    for (const pose of ['axeHandleUp', 'ropeOneTaunt', 'tauntArmsWide', 'armBarLock', 'hammerlockCrank']) {
        await page.evaluate(({ p, f }) => window.__setPose(p, f), { p: POSES[pose], f: facing });
        await page.waitForTimeout(30);
        await mattePair(page, `elbow_${tag}_${n}_${pose}`, await jointRect(page, 'nearElbow', 40));
        n++;
    }
    await page.evaluate((f) => window.__setPose(undefined, f), facing);

    n = 0;
    for (const ph of [0, 1.05, 2.1, 3.14, 4.2, 5.24]) {
        await page.evaluate(({ ph, f }) => window.__gait(ph, f), { ph, f: facing });
        await page.waitForTimeout(30);
        await shot(page, `gait_${tag}_${n}.png`, await louRect(page)); n++;
    }

    n = 0;
    for (const a of [0.5, 0.9, 1.3]) {
        await page.evaluate(({ a, f }) => window.__setPose({ lLeg: a, rLeg: -0.1, lArm: 0.1, rArm: -0.1, crouch: 0.1 }, f), { a, f: facing });
        await page.waitForTimeout(30);
        await mattePair(page, `kneelift_${tag}_${n}`, await jointRect(page, 'nearKnee', 40));
        await shot(page, `kneelift_full_${tag}_${n}.png`, await louRect(page)); n++;
    }
    await page.evaluate((f) => window.__setPose(undefined, f), facing);

    for (const t of [0, 0.34, 0.72, 1]) {
        await page.evaluate(({ t, f }) => window.__repose(() => { const w = window.__w; w.facing = f; w.state = 'gettingUp'; w.riseT = t; w.moveBlend = 0; w._realDraw(); }), { t, f: facing });
        await page.waitForTimeout(30);
        await shot(page, `getup_${tag}_${String(t).replace('.', '')}.png`, await louRect(page, 40));
    }

    n = 0;
    for (const a of [-0.9, -0.5, 0.5, 0.9]) {
        await page.evaluate(({ a, f }) => window.__setPose({ lLeg: a, rLeg: -a, lArm: 0.1, rArm: -0.1, crouch: 0.08 }, f), { a, f: facing });
        await page.waitForTimeout(30);
        await shot(page, `legext_${tag}_${n}.png`, await louRect(page)); n++;
    }

    await page.close();
}

await browser.close();
server.kill();
console.log('\nRAW ->', RAW, '\nNow run: python3 tools/debug/lou_checker_composite.py');
