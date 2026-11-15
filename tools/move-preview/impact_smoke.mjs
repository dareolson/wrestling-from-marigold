// Run the six real executors through impact and sell. MATRIX=1 checks both pairs/facings.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'chrome' });
const out = [], errors = [];
try {
    const page = await browser.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${process.env.WFM_URL ?? 'http://localhost:5197'}/tools/move-preview/`);
    await page.waitForFunction(() => window.__MOVE_PREVIEW?.handle);
    for (const pair of process.env.MATRIX ? ['lou-george', 'george-lou'] : ['lou-george']) {
        await page.locator('#pair').selectOption(pair);
        await page.waitForFunction(() => window.__MOVE_PREVIEW?.ready && window.__MOVE_PREVIEW.handle);
        for (let mirror = 0; mirror < (process.env.MATRIX ? 2 : 1); mirror++) {
            for (const id of ['runner-back-drop', 'runner-hip-toss', 'runner-arm-drag', 'snapmare-live', 'clothesline-live', 'body-slam-live']) {
                await page.locator('#move').selectOption(id);
                const result = await page.evaluate(() => {
                    window.__MOVE_PREVIEW.seek(0);
                    let bounce = 0, compression = 0, sells = false, pain = null;
                    for (let i = 1; i <= 180; i++) {
                        window.__MOVE_PREVIEW.seek(i / 60);
                        const d = document.querySelector('#game').contentWindow.__WFM_GAME.scene.scenes[0].w2;
                        const offsets = d._landingOffsets();
                        bounce = Math.max(bounce, offsets?.hip ?? 0);
                        compression = Math.min(compression, offsets?.hip ?? 0);
                        sells ||= !!d._sell; pain = d._pain?.part ?? pain;
                    }
                    return { bounce, compression, sells, pain };
                });
                out.push({ pair, mirror, id, ...result });
                writeFileSync(process.argv[2] ?? '/tmp/wfm-impact-cases.json', JSON.stringify(out, null, 2));
                assert.ok(result.bounce > 1, `${id}: no rebound`);
                assert.ok(result.sells, `${pair} ${id}: no aftermath sell`);
                console.log(pair, mirror ? 'left' : 'right', id, 'bounce', result.bounce.toFixed(1), 'sell', result.pain);
            }
            if (process.env.MATRIX) { await page.locator('#mirror').click(); await page.waitForTimeout(100); }
        }
    }
    assert.deepEqual(errors, []);
    console.log(`${out.length} cases passed; no browser errors`);
} finally { await browser.close(); }
