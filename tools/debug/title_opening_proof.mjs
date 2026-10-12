// node tools/debug/title_opening_proof.mjs
// Title-specific walkthrough: the match harness deliberately forces ?arena=1.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const shots = fileURLToPath(new URL('./shots/title-opening/', import.meta.url));
await mkdir(shots, { recursive: true });
const server = await createServer({ root, server: { port: 5207, strictPort: true } });
await server.listen();
let browser;
try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Use the installed identical Phaser version, avoiding CDN dependencies
    // during verification. Production index.html remains unchanged.
    await page.route('https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.min.js', route =>
        route.fulfill({ path: `${root}/node_modules/phaser/dist/phaser.min.js`, contentType: 'text/javascript' }));
    const waitTitle = () => page.waitForFunction(() =>
        window.__WFM_GAME?.scene.getScene('FrontDoor')?.street &&
        window.__WFM_GAME.scene.isActive('FrontDoor'));
    await page.goto('http://localhost:5207');
    await waitTitle();
    assert.equal(await page.evaluate(() => {
        const car = [...window.__WFM_GAME.scene.getScene('FrontDoor').street.actors][0];
        return car.list[0].frame.name;
    }), '__BASE', 'Car body must use the full sedan rather than a hubcap frame');
    await page.screenshot({ path: `${shots}title.png` });
    const before = await page.evaluate(() => {
        const scene = window.__WFM_GAME.scene.getScene('FrontDoor');
        scene.street.passCar();
        scene.street.enterPatron();
        return [...scene.street.actors].map(actor => ({ x: actor.x, frame: actor.frame?.name }));
    });
    await page.waitForTimeout(2500);
    const after = await page.evaluate(() => [...window.__WFM_GAME.scene.getScene('FrontDoor').street.actors]
        .map(actor => ({ x: actor.x, frame: actor.frame?.name })));
    assert(after.some((actor, i) => actor.x !== before[i]?.x), 'Street actors must advance');
    assert(after.some(actor => actor.frame?.startsWith('walk-')), 'Walker must use authored frames');
    await page.screenshot({ path: `${shots}street-motion.png` });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4200);
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').state), 'arrival');
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').background.scaleX), 1.04);
    await page.screenshot({ path: `${shots}arrival.png` });
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__WFM_GAME.scene.isActive('Arena'));
    const cleanup = await page.evaluate(() => {
        const street = window.__WFM_GAME.scene.getScene('FrontDoor').street;
        return { disposed: street.disposed, timers: street.timers.size, actors: street.actors.size };
    });
    assert.deepEqual(cleanup, { disposed: true, timers: 0, actors: 0 });
    await page.evaluate(() => {
        window.__WFM_GAME.scene.stop('Arena');
        window.__WFM_GAME.scene.start('FrontDoor');
    });
    await waitTitle();
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').street.disposed), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await waitTitle();
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').street.motion), false);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').background.scaleX), 1);
    assert.deepEqual(errors, []);
    console.log(`PASS: street movement, arrival camera, scene cleanup/re-entry, reduced motion; screenshots: ${shots}`);
} finally {
    if (browser) await browser.close();
    await server.close();
}
