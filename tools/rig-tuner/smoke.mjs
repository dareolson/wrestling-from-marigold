// Rig-tuner smoke test — drives the tool headless and verifies that knob
// changes actually change the render and that the export emits the right
// lines. Same playwright-core + system-Chrome pattern as tools/debug.
//
//   node tools/rig-tuner/smoke.mjs          (Node >= 20.19)
//   WFM_URL=http://localhost:5173 node tools/rig-tuner/smoke.mjs   (attach)

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PORT = 5197;

async function waitForServer(url, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 250));
    }
    throw new Error(`Dev server never came up at ${url}`);
}

let pass = 0, fail = 0;
const ok = (cond, name) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
    cond ? pass++ : fail++;
};

// Screenshot the canvas element (compositor capture — works with WebGL
// regardless of preserveDrawingBuffer) and hash the PNG bytes.
const canvasHash = async page => {
    const buf = await page.locator('#stage canvas').screenshot({ animations: 'disabled' });
    let h = 0;
    for (let i = 0; i < buf.length; i++) h = (h * 31 + buf[i]) >>> 0;
    return h;
};
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

let server = null;
let url = process.env.WFM_URL;
if (!url) {
    url = `http://localhost:${PORT}`;
    server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: PROJECT_ROOT, stdio: 'ignore' });
    await waitForServer(url);
}

const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

try {
    await page.goto(`${url}/tools/rig-tuner/`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__RIG_TOOL && window.__RIG_TOOL.skeleton(), null, { timeout: 15000 });
    await settle(page);
    ok(true, 'tool boots, skeleton constructed');

    const baseline = await canvasHash(page);

    // 1. RIG scalar changes the render and shows up in the export
    await page.evaluate(() => window.__RIG_TOOL.setRig('HIP_OVERLAP', 40));
    await settle(page);
    const afterRig = await canvasHash(page);
    ok(afterRig !== baseline, 'RIG.HIP_OVERLAP edit changes render');
    let text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(text.includes('src/Skeleton.js — RIG') && text.includes('HIP_OVERLAP: 40,'), 'export has RIG block');
    await page.evaluate(() => window.__RIG_TOOL.setRig('HIP_OVERLAP', 14));
    await settle(page);
    ok(await canvasHash(page) === baseline, 'reverting RIG restores baseline render');

    // 2. Per-character knob (config + instance). Read the committed value
    // first — hardcoding it makes the test break every time the config is
    // legitimately retuned.
    const origHeadY = await page.evaluate(() => window.__RIG_TOOL.CHARS.george.textures.headOffsetY);
    await page.evaluate(v => window.__RIG_TOOL.setCharKnob('headOffsetY', v + 31), origHeadY);
    await settle(page);
    ok(await canvasHash(page) !== baseline, 'george headOffsetY edit changes render');
    text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(text.includes('src/characters/george.js') && text.includes(`headOffsetY: ${origHeadY + 31},`), 'export has character block');
    await page.evaluate(v => window.__RIG_TOOL.setCharKnob('headOffsetY', v), origHeadY);
    await settle(page);
    ok(await canvasHash(page) === baseline, 'reverting knob restores baseline render');

    // 3. Pose dial edit + export line
    await page.evaluate(() => { window.__RIG_TOOL.setPoseName('lockup'); window.__RIG_TOOL.setPose('lockup', 'lArm', 2.5); });
    await settle(page);
    text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(text.includes('src/Wrestler.js — POSES') && text.includes('lockup: {') && text.includes('lArm: 2.5'), 'export has POSES block');
    await page.evaluate(() => {
        const t = window.__RIG_TOOL;
        t.setPose('lockup', 'lArm', 1.57);
        // back to the boot pose (the character's runtime idle, not generic 'idle')
        t.setPoseName(t.CHARS.george.idlePose ?? 'idle');
    });
    await settle(page);

    // 4. Real mouse-drag on the head handle drives headOffsetX/Y
    const before = await page.evaluate(() => {
        const t = window.__RIG_TOOL;
        return { x: t.CHARS.george.textures.headOffsetX, y: t.CHARS.george.textures.headOffsetY,
                 hx: t.skeleton().head.x, hy: t.skeleton().head.y };
    });
    const box = await page.locator('#stage canvas').boundingBox();
    const k = box.width / 960; // FIT scale, game px → page px
    const px = box.x + before.hx * k, py = box.y + before.hy * k;
    await page.mouse.move(px, py);
    await page.mouse.down();
    await page.mouse.move(px + 30 * k, py + 20 * k, { steps: 8 });
    await page.mouse.up();
    await settle(page);
    const after = await page.evaluate(() => {
        const t = window.__RIG_TOOL;
        return { x: t.CHARS.george.textures.headOffsetX, y: t.CHARS.george.textures.headOffsetY };
    });
    // facing=1, zoom=1.5 → +30 game px ≈ +20 unscaled on X, +20 ≈ +13 on Y
    ok(after.x > before.x + 10 && after.y > before.y + 5,
        `head handle drag moves headOffset (${before.x},${before.y} → ${after.x},${after.y})`);
    ok(await canvasHash(page) !== baseline, 'drag visibly moved the head');
    await page.evaluate(({ x, y }) => {
        window.__RIG_TOOL.setCharKnob('headOffsetX', x);
        window.__RIG_TOOL.setCharKnob('headOffsetY', y);
    }, before);
    await settle(page);
    ok(await canvasHash(page) === baseline, 'restoring offsets restores baseline render');

    // 5. Depth-order regression guard (2026-07-15): far arm must render
    // behind the far leg — was a same-depth tie broken by insertion order,
    // which put the far hand in front of the far leg (see Skeleton.js
    // setDepth's comment). Asserting depth values directly rather than a
    // canvas hash, since whether the two overlap visually depends on the
    // current pose.
    const depthOrder = await page.evaluate(() => {
        const sk = window.__RIG_TOOL.skeleton();
        return { farUpArm: sk.farUpArm.depth, farThigh: sk.farThigh.depth };
    });
    ok(depthOrder.farUpArm < depthOrder.farThigh,
        `far arm depth (${depthOrder.farUpArm}) behind far leg depth (${depthOrder.farThigh})`);

    // 6. Nullable elbow/knee pose override (2026-07-15) — undefined by
    // default (every pose predating this), settable per-pose, clears back
    // to undefined (not 0) rather than sticking once armed.
    await page.evaluate(() => { window.__RIG_TOOL.setPoseName('lockup'); window.__RIG_TOOL.setPose('lockup', 'lForearm', 1.2); });
    await settle(page);
    ok(await canvasHash(page) !== baseline, 'lForearm pose override changes render');
    text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(text.includes('lockup: {') && text.includes('lForearm: 1.2'), 'export includes lForearm override');
    await page.evaluate(() => window.__RIG_TOOL.setPose('lockup', 'lForearm', null));
    await settle(page);
    text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(!text.includes('lForearm'), 'clearing override drops it from export (not pinned to 0)');
    await page.evaluate(() => window.__RIG_TOOL.setPoseName(window.__RIG_TOOL.CHARS.george.idlePose ?? 'idle'));
    await settle(page);
    ok(await canvasHash(page) === baseline, 'back on idle pose: render matches baseline');

    // 7. New far-arm knob (near/far parity, 2026-07-15)
    await page.evaluate(() => window.__RIG_TOOL.setCharKnob('farArmOffsetX', 25));
    await settle(page);
    ok(await canvasHash(page) !== baseline, 'farArmOffsetX edit changes render');
    text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(text.includes('farArmOffsetX: 25'), 'export includes farArmOffsetX');
    await page.evaluate(() => window.__RIG_TOOL.setCharKnob('farArmOffsetX', 0));
    await settle(page);
    ok(await canvasHash(page) === baseline, 'reverting farArmOffsetX restores baseline');

    // 8. pivotOffsetFrac (2026-07-15) — manual set + the art-measurement
    // helper. george's shin is object-form (has a box), unlike his string-
    // form thigh/upperArm/forearm, so it's a valid target in the current
    // data model (pivotOffsetFrac only attaches to object-form entries).
    await page.evaluate(() => window.__RIG_TOOL.setPivotOffsetFrac('shin', 0.1));
    await settle(page);
    ok(await canvasHash(page) !== baseline, 'shin pivotOffsetFrac edit changes render');
    text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(text.includes('pivotOffsetFrac: 0.1'), 'export includes pivotOffsetFrac');
    await page.evaluate(() => window.__RIG_TOOL.setPivotOffsetFrac('shin', 0));
    await settle(page);
    ok(await canvasHash(page) === baseline, 'reverting pivotOffsetFrac restores baseline');
    const measured = await page.evaluate(() => {
        const t = window.__RIG_TOOL;
        return t.measureArtPivotFrac(t.CHARS.george.textures.shin.key, 'top');
    });
    ok(Number.isFinite(measured) && Math.abs(measured) < 0.5, `measureArtPivotFrac returns a sane fraction (${measured})`);

    // 9. Every character renders (incl. placeholder path) with no page errors
    for (const id of ['thesz', 'placeholder', 'george']) {
        await page.evaluate(c => window.__RIG_TOOL.setCharacter(c), id);
        await settle(page);
        ok(await page.evaluate(() => !!window.__RIG_TOOL.skeleton()), `character switch: ${id}`);
    }
    ok(await canvasHash(page) === baseline, 'back on george: render matches baseline');

    ok(errors.length === 0, `no page/console errors${errors.length ? ` — ${errors[0]}` : ''}`);
} finally {
    await browser.close();
    server?.kill();
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
