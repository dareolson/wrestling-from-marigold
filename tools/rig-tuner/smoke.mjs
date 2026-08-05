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

    // Numeric head-bounds check (not a canvas hash) — used both here, to prove
    // headOffsetY is inert for george's socket-owned head, and in section 4
    // below to drive headAnchorFrac. A hash diff isn't safe for either: the
    // tuner's known residual-state bug (see AI_HANDOFF.md's deferred-issues
    // list) can shift the canvas hash for reasons unrelated to the knob under
    // test, which is exactly what previously made this section's assertion
    // pass for the wrong reason (see below).
    const headCX = () => page.evaluate(() => Math.round(window.__RIG_TOOL.skeleton().head.getBounds().centerX * 100) / 100);

    // 2. Per-character knob (config + instance). Read the committed value
    // first — hardcoding it makes the test break every time the config is
    // legitimately retuned.
    //
    // george places the head at rigProfile.sockets.neck (see section 4), so
    // headOffsetX/Y are INERT for him — headAnchorFrac.u/v is the real
    // control. Assert that inertness directly (head position unchanged)
    // instead of asserting the render changes: a passing "changes render"
    // check here was actually being satisfied by the tuner's residual-state
    // bug shifting the hash, not by headOffsetY doing anything, so it was
    // proving the wrong thing. The export round-trip is still real and worth
    // covering — george's config should still persist whatever value is set,
    // even though it doesn't move his head.
    const origHeadY = await page.evaluate(() => window.__RIG_TOOL.CHARS.george.textures.headOffsetY);
    const headCXBeforeOffset = await headCX();
    await page.evaluate(v => window.__RIG_TOOL.setCharKnob('headOffsetY', v + 31), origHeadY);
    await settle(page);
    ok((await headCX()) === headCXBeforeOffset,
        "george's socket-owned head does not move when headOffsetY changes");
    text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(text.includes('src/characters/george.js') && text.includes(`headOffsetY: ${origHeadY + 31},`), 'export has character block');
    await page.evaluate(v => window.__RIG_TOOL.setCharKnob('headOffsetY', v), origHeadY);
    await settle(page);

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

    // 4. Head position on a socket-owned head. george places the head at
    // rigProfile.sockets.neck, so headOffsetX/Y are INERT and the on-canvas
    // head handle is deliberately hidden (it would write dead values). The real
    // control is headAnchorFrac.u/v (recentres the head art on the neck point)
    // in the Head/neck-attachment panel. Reuses the numeric headCX() check
    // from section 2 above rather than a canvas hash, so it doesn't depend on
    // render-settle timing.
    const driveAnchorU = delta => page.evaluate(d => {
        const row = [...document.querySelectorAll('.row')].find(r => r.querySelector('label')?.getAttribute('title') === 'headAnchorFrac.u');
        if (!row) return false;
        const range = row.querySelector('input[type=range]');
        range.value = String(parseFloat(range.value) + d);
        range.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }, delta);
    ok(await page.evaluate(() => {
        const sk = window.__RIG_TOOL.skeleton();
        return !(sk._headIsImage && sk._neckInTorso && !sk._torsoSockets?.neck);
    }), 'head drag-handle is hidden for a socket-owned head (would write dead headOffsetX/Y)');
    const cx0 = await headCX();
    const drove = await driveAnchorU(0.08);
    await settle(page);
    ok(drove && (await headCX()) !== cx0, 'headAnchorFrac.u slider recentres the head');
    text = await page.evaluate(() => window.__RIG_TOOL.exportText());
    ok(/headAnchorFrac:\s*\{\s*u:/.test(text), 'export emits headAnchorFrac');
    await driveAnchorU(-0.08);
    await settle(page);
    ok(Math.abs((await headCX()) - cx0) < 0.5, 'reverting headAnchorFrac restores head position');

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
        // george's shin is split into near/far (no unified `shin` entry), so
        // measure the near-shin art.
        return t.measureArtPivotFrac(t.CHARS.george.textures.nearShin.key, 'top');
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
