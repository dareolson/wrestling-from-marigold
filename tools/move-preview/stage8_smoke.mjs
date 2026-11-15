// Stage 8 live cases in the preview: hand-stomp-live and knee-drop-live, both pairs and facings; the man ends on the mat, the hit lands once, no page errors.
//   WFM_URL=http://localhost:5198 node tools/move-preview/stage8_smoke.mjs [shotsDir]
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const shots = process.argv[2]; if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${process.env.WFM_URL ?? 'http://localhost:5198'}/tools/move-preview/`);
    await page.waitForFunction(() => window.__MOVE_PREVIEW?.ready && window.__MOVE_PREVIEW.handle, { timeout: 30000 });
    for (const pair of ['lou-george', 'george-lou']) {
        await page.locator('#pair').selectOption(pair);
        await page.waitForFunction(() => window.__MOVE_PREVIEW.ready && window.__MOVE_PREVIEW.handle);
        for (let mirror = 0; mirror < 2; mirror++) {
            for (const id of ['hand-stomp-live', 'knee-drop-live']) {
                await page.locator('#move').selectOption(id);
                const r = await page.evaluate(() => {
                    const d = document.querySelector('#game').contentWindow.__WFM_GAME.scene.scenes[0].w2; let hit = 0, prev = d.stamina;
                    for (let i = 1; i <= 150; i++) { window.__MOVE_PREVIEW.seek(i / 60); if (d.stamina < prev) hit++; prev = d.stamina; }
                    return { hits: hit, state: d.state, lying: d.lying };
                });
                assert.equal(r.hits >= 1, true, `${pair} ${id}: the hit never landed`); assert.equal(r.state, 'down');
                if (shots) { await page.evaluate(() => window.__MOVE_PREVIEW.seek(0.8)); await page.screenshot({ path: `${shots}/${pair}-${mirror ? 'left' : 'right'}-${id}.png` }); }
                console.log(pair, mirror ? 'left' : 'right', id, JSON.stringify(r));
            }
            await page.locator('#mirror').click(); await page.waitForTimeout(150);
        }
    }
    assert.deepEqual(errors, []);
} finally { await browser.close(); }
