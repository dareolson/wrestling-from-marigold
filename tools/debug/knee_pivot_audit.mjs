// Knee pivot-vs-art audit (2026-07-15). Answers a specific question Derek/
// Codex raised: do these three coordinates stay coincident, across both
// facings and during motion, not just a static idle screenshot?
//   1. Skeleton's true knee joint      (Skeleton.nearKneeDebug/farKneeDebug)
//   2. Shin's actual rotation origin   (Skeleton.nearShinRenderDebug/far...)
//   3. The artwork's own intended knee point — NOT currently tracked by the
//      rig at all, so this script measures it directly from the committed
//      PNGs (ink x-center at the thigh's bottom edge / shin's top edge) and
//      carries it through the exact same position+rotation transform the
//      renderer uses (Skeleton._endXY, called live in-page — not
//      reimplemented here, to avoid any formula-transcription risk).
//
// Usage: node tools/debug/knee_pivot_audit.mjs [thesz|george]

import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const CHAR = process.argv[2] || 'thesz';

const PNG_PATHS = {
    thigh: path.join(REPO, `src/assets/wrestlers/${CHAR}/thigh.png`),
    shin:  path.join(REPO, `src/assets/wrestlers/${CHAR}/shin.png`),
};

// ── Step 1: measure the art's own knee point from the committed PNGs ──────
async function measureArtKneeOffsets(browser) {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    const out = {};
    for (const [part, file] of Object.entries(PNG_PATHS)) {
        const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
        out[part] = await page.evaluate(async (url) => {
            const img = new Image(); img.src = url; await img.decode();
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
            const T = 10;
            function rowXCenter(y) {
                let mn = -1, mx = -1;
                for (let x = 0; x < width; x++) {
                    if (data[(y * width + x) * 4 + 3] > T) { if (mn === -1) mn = x; mx = x; }
                }
                return mn === -1 ? null : (mn + mx) / 2;
            }
            let minY = -1, maxY = -1;
            for (let y = 0; y < height; y++) { if (rowXCenter(y) !== null) { if (minY === -1) minY = y; maxY = y; } }
            function avg(yStart, yEnd) {
                const vals = [];
                for (let y = yStart; y <= yEnd; y++) { const v = rowXCenter(y); if (v !== null) vals.push(v); }
                return vals.reduce((a, b) => a + b, 0) / vals.length;
            }
            return {
                width, height,
                topXCenter: avg(minY, minY + 2),
                bottomXCenter: avg(maxY - 2, maxY),
                canvasCenterX: width / 2,
            };
        }, dataUrl);
    }
    await page.close();
    // Thigh's knee-side is its BOTTOM edge (pivotEdge top); shin's knee-side
    // is its TOP edge. Offset is signed: + = toward the facing direction
    // (right, in the unflipped source PNG), as a fraction of canvas width.
    return {
        thighKneeOffsetFrac: (out.thigh.bottomXCenter - out.thigh.canvasCenterX) / out.thigh.width,
        shinKneeOffsetFrac:  (out.shin.topXCenter  - out.shin.canvasCenterX)  / out.shin.width,
        raw: out,
    };
}

// ── Step 2: drive the game, sample true joint vs. art-implied knee point ──
async function sampleFacing(browser, url, offsets, label) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.locator('canvas').click();
    await page.waitForTimeout(1200); // clear title card

    // Identify which slot (w1/w2) is the character under test by its thigh
    // texture key prefix (no reliable .character field on Wrestler).
    const slot = await page.evaluate((char) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const key = sc.w1.skeleton.nearThigh.texture?.key || '';
        return key.startsWith(char) ? 'w1' : 'w2';
    }, CHAR);

    await page.evaluate(({ offsets, slot }) => {
        const sc = window.__WFM_GAME.scene.scenes[0];
        const w = sc[slot];
        window.__KNEE_SAMPLES = [];
        function measurePoint(side) {
            const sk = w.skeleton;
            const knee = sk[side === 'near' ? 'nearKneeDebug' : 'farKneeDebug'];
            const thighR = sk[side === 'near' ? 'nearThighRenderDebug' : 'farThighRenderDebug'];
            const shinR = sk[side === 'near' ? 'nearShinRenderDebug' : 'farShinRenderDebug'];
            if (!knee || !thighR || !shinR) return null;
            const thighLx = thighR.facing * offsets.thighKneeOffsetFrac * thighR.texDims.w * thighR.s;
            const thighLy = thighR.texDims.h * thighR.s;
            const artKneeFromThigh = sk._endXY(thighR.x, thighR.y, thighLx, thighLy, thighR.angle);
            const shinLx = shinR.facing * offsets.shinKneeOffsetFrac * shinR.texDims.w * shinR.s;
            const artKneeFromShin = sk._endXY(shinR.x, shinR.y, shinLx, 0, shinR.angle);
            const shinOrigin = { x: shinR.x, y: shinR.y };
            return {
                d_trueVsShinOrigin: Math.hypot(knee.x - shinOrigin.x, knee.y - shinOrigin.y),
                d_trueVsArtThigh: Math.hypot(knee.x - artKneeFromThigh.x, knee.y - artKneeFromThigh.y),
                d_trueVsArtShin: Math.hypot(knee.x - artKneeFromShin.x, knee.y - artKneeFromShin.y),
                d_artThighVsArtShin: Math.hypot(artKneeFromThigh.x - artKneeFromShin.x, artKneeFromThigh.y - artKneeFromShin.y),
                facing: w.facing,
            };
        }
        window.__sampleKnee = (tag) => {
            window.__KNEE_SAMPLES.push({ tag, near: measurePoint('near'), far: measurePoint('far') });
        };
    }, { offsets, slot });

    await page.evaluate(() => window.__sampleKnee('idle'));

    const dir = slot === 'w1' ? 'd' : 'ArrowLeft'; // P1=WASD, P2=arrow keys (Arena.js keys1/keys2)
    await page.keyboard.down(dir);
    for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(40);
        await page.evaluate((n) => window.__sampleKnee(`walk_${n}`), i);
    }
    await page.keyboard.up(dir);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__sampleKnee('post_walk'));

    const samples = await page.evaluate(() => window.__KNEE_SAMPLES);
    await page.close();
    return { label, samples };
}

const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED });
const offsets = await measureArtKneeOffsets(browser);
console.log('=== Art knee offsets (measured from committed PNGs) ===');
console.log(JSON.stringify(offsets, null, 2));

const p1url = `http://localhost:5199?p1=${CHAR}&p2=${CHAR === 'thesz' ? 'george' : 'thesz'}`;
const p2url = `http://localhost:5199?p2=${CHAR}&p1=${CHAR === 'thesz' ? 'george' : 'thesz'}`;

// Spawn one dev server, hit it twice (two independent pages/facings)
const server = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { cwd: REPO, stdio: 'ignore' });
async function waitForServer(url, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try { const r = await fetch(url); if (r.ok) return; } catch {}
        await new Promise(r => setTimeout(r, 250));
    }
    throw new Error('server never came up');
}
await waitForServer(`http://localhost:5199`);

const facingRight = await sampleFacing(browser, p1url, offsets, 'facing_right (P1 slot)');
const facingLeft  = await sampleFacing(browser, p2url, offsets, 'facing_left (P2 slot)');

for (const { label, samples } of [facingRight, facingLeft]) {
    console.log(`\n=== ${label} ===`);
    for (const s of samples) {
        for (const side of ['near', 'far']) {
            const m = s[side];
            if (!m) continue;
            console.log(`${s.tag} [${side}] facing=${m.facing} | trueKnee-vs-shinOrigin=${m.d_trueVsShinOrigin.toFixed(2)}px | trueKnee-vs-artThigh=${m.d_trueVsArtThigh.toFixed(2)}px | trueKnee-vs-artShin=${m.d_trueVsArtShin.toFixed(2)}px | artThigh-vs-artShin=${m.d_artThighVsArtShin.toFixed(2)}px`);
        }
    }
}

await browser.close();
server.kill();
