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
const server = await createServer({ root, server: { port: 0, watch: null } });
await server.listen();
let browser;
try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
    const press = async key => { await page.keyboard.press(key); await page.waitForTimeout(100); };
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Use the installed identical Phaser version, avoiding CDN dependencies
    // during verification. Production index.html remains unchanged.
    await page.route('https://cdn.jsdelivr.net/npm/phaser@4.1.0/dist/phaser.min.js', route =>
        route.fulfill({ path: `${root}/node_modules/phaser/dist/phaser.min.js`, contentType: 'text/javascript' }));
    const waitTitle = () => page.waitForFunction(() =>
        window.__WFM_GAME?.scene.getScene('FrontDoor')?.street &&
        window.__WFM_GAME.scene.isActive('FrontDoor'));
    await page.goto(server.resolvedUrls.local[0]);
    await waitTitle();
    const before = await page.evaluate(() => {
        const street = window.__WFM_GAME.scene.getScene('FrontDoor').street;
        return street.queue.map(patron => ({ x: patron.x, frame: patron.frame.name }));
    });
    assert.equal(before.length, 6, 'Queue starts with six patrons');
    assert(before.every(patron => patron.frame === 'pose-0'), 'Waiting patrons stand still');
    await page.screenshot({ path: `${shots}title.png` });
    await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').street.enterPatron());
    await page.waitForTimeout(2500);
    const advancing = await page.evaluate(() => {
        const street = window.__WFM_GAME.scene.getScene('FrontDoor').street;
        return { admitted: street.admittedCount,
            queue: street.queue.map(patron => ({ x: patron.x, frame: patron.frame.name })) };
    });
    assert.equal(advancing.admitted, 1, 'Front patron enters arena');
    assert.equal(advancing.queue.length, 5, 'Admitted patron leaves the line');
    assert(advancing.queue[0].x > before[1].x, 'Next patron advances toward door');
    assert(advancing.queue.some(patron => patron.frame !== 'pose-0'), 'Moving queue uses walk frames');
    await page.screenshot({ path: `${shots}queue-advancing.png` });
    await page.waitForTimeout(4500);
    const settled = await page.evaluate(() => {
        const street = window.__WFM_GAME.scene.getScene('FrontDoor').street;
        return { busy: street.queueBusy, count: street.queue.length,
            frames: street.queue.map(patron => patron.frame.name), cars: street.cars.length };
    });
    assert.equal(settled.busy, false);
    assert.equal(settled.count, 6, 'Newcomer replenishes queue');
    assert(settled.frames.every(frame => frame === 'pose-0'), 'Settled queue returns to standing poses');
    assert.equal(settled.cars, 0, 'Traffic is on hold');
    await page.screenshot({ path: `${shots}queue-settled.png` });
    await press('Enter');
    await page.waitForTimeout(4200);
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').state), 'arrival');
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').background.scaleX), 1.04);
    await page.screenshot({ path: `${shots}arrival.png` });
    for (const texture of ['arrival-bus', 'arrival-walk', 'arrival-reveal', 'arrival-bustle', 'arrival-closeup', 'arrival-door']) {
        await press('Enter');
        assert.deepEqual(await page.evaluate(() => {
            const scene = window.__WFM_GAME.scene.getScene('FrontDoor');
            return { visible: scene.arrivalPlate.visible, texture: scene.arrivalPlate.texture.key };
        }), { visible: true, texture });
        await page.screenshot({ path: `${shots}${texture}.png` });
    }

    await press('s');
    const booking = await page.evaluate(() => {
        const scene = window.__WFM_GAME.scene.getScene('FrontDoor');
        return { state: scene.state, room: scene.room.visible, trainer: scene.trainer.texture.key };
    });
    assert.deepEqual(booking, { state: 'booking', room: true, trainer: 'story-trainer' });
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').arrivalPlate.visible), false,
        'Arrival plate is hidden on entering dressing room');
    await page.screenshot({ path: `${shots}trainer-booking.png` });
    const roomTextures = new Set();
    for (let i = 0; i < 20; i++) {
        const beat = await page.evaluate(() => {
            const scene = window.__WFM_GAME.scene.getScene('FrontDoor');
            return { state: scene.state, texture: scene.roomShot.visible ? scene.roomShot.texture.key : null,
                texts: scene.panel.list.filter(item => item.type === 'Text').map(item => item.text) };
        });
        if (beat.texture && !roomTextures.has(beat.texture)) {
            roomTextures.add(beat.texture);
            await page.screenshot({ path: `${shots}${beat.texture}.png` });
        }
        if (beat.state === 'ready') break;
        assert.equal(beat.state, 'booking');
        await press('Enter');
    }
    assert.deepEqual([...roomTextures].sort(),
        ['room-two-shot', 'room-tape-start', 'room-reaction', 'room-wrist-offered', 'room-departure'].sort(),
        'Every dressing-room composition appears in the dialogue sequence');
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').state), 'ready',
        'Revised conversation proceeds linearly to preparation');
    await press('Escape');
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').room.visible), false);
    await press('ArrowDown');
    await page.waitForFunction(() => window.__WFM_GAME.scene.getScene('FrontDoor').selection === 1);
    await press('Enter');
    await page.waitForFunction(() => window.__WFM_GAME.scene.getScene('FrontDoor').state === 'ready');
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').room.visible), true,
        'Continue restores dressing-room staging');
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').roomShot.texture.key), 'room-departure');

    await press('Escape');
    await press('ArrowUp');
    await press('Enter');
    await page.waitForFunction(() => window.__WFM_GAME.scene.isActive('Arena'));
    const cleanup = await page.evaluate(() => {
        const street = window.__WFM_GAME.scene.getScene('FrontDoor').street;
        return { disposed: street.disposed, timers: street.timers.size, actors: street.actors.size, queue: street.queue.length };
    });
    assert.deepEqual(cleanup, { disposed: true, timers: 0, actors: 0, queue: 0 });
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
    await press('Enter');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').background.scaleX), 1);
    await press('s');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__WFM_GAME.scene.getScene('FrontDoor').room.scaleX), 1,
        'Reduced motion also disables dressing-room camera');
    assert.deepEqual(errors, []);
    console.log(`PASS: queue admission, advance, replenishment and idle poses; arrival camera, layered trainer dialogue, linear preparation, Continue, scene cleanup/re-entry, reduced motion; screenshots: ${shots}`);
} finally {
    if (browser) await browser.close();
    await server.close();
}
