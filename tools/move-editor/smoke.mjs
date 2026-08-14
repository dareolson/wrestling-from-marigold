import { chromium } from 'playwright-core';

const url = process.env.WFM_URL ?? 'http://127.0.0.1:5198/tools/move-editor/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
    await page.waitForSelector('#stage canvas');
    await page.waitForTimeout(500);
    const certification = await page.textContent('#certification');
    if (!certification.includes('PASS')) {
        throw new Error(`reference rig did not pass live certification: ${certification}; browser errors: ${errors.join(' | ')}`);
    }

    const initial = await page.evaluate(() => ({
        draft: window.__MOVE_EDITOR.draft,
        wrist: window.__MOVE_EDITOR.actors.attacker.skeleton.jointAttachmentPoints.nearWrist,
        pose: { ...window.__MOVE_EDITOR.actors.attacker.pose },
    }));
    if (Object.keys(initial.draft.tracks).join(',') !== 'attacker,defender') {
        throw new Error('editor did not create synchronized attacker/defender tracks');
    }

    const canvas = await page.locator('#stage canvas').boundingBox();
    const internal = await page.locator('#stage canvas').evaluate(node => ({ width: node.width, height: node.height }));
    const screen = point => ({
        x: canvas.x + point.x / internal.width * canvas.width,
        y: canvas.y + point.y / internal.height * canvas.height,
    });
    const start = screen(initial.wrist);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 55, start.y - 45, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const after = await page.evaluate(() => ({
        wrist: window.__MOVE_EDITOR.actors.attacker.skeleton.jointAttachmentPoints.nearWrist,
        pose: { ...window.__MOVE_EDITOR.actors.attacker.pose },
        joints: window.__MOVE_EDITOR.actors.attacker.skeleton.jointAttachmentPoints,
    }));
    if (Math.hypot(after.wrist.x - initial.wrist.x, after.wrist.y - initial.wrist.y) < 20) {
        throw new Error('dragging the wrist did not move the connected chain');
    }
    if (after.pose.lArm === initial.pose.lArm && after.pose.lElbow === initial.pose.lElbow) {
        throw new Error('wrist drag did not author shoulder/elbow channels');
    }
    for (const name of ['nearShoulder', 'nearElbow', 'nearWrist', 'nearHip', 'nearKnee', 'nearAnkle']) {
        if (!Number.isFinite(after.joints[name]?.x) || !Number.isFinite(after.joints[name]?.y)) {
            throw new Error(`${name} is not finite after connected drag`);
        }
    }

    const variantChoices = await page.evaluate(() => {
        const row = [...document.querySelectorAll('#variantControls .row')]
            .find(node => node.querySelector('label')?.textContent === 'nearHand');
        const select = row?.querySelector('select');
        if (!select) return [];
        select.value = 'grip';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return [...select.options].map(option => option.value);
    });
    if (!variantChoices.includes('fist') || !variantChoices.includes('grip')) {
        throw new Error('reference-rig hand variants did not populate the editor');
    }

    await page.click('#snapContactBtn');
    await page.waitForTimeout(100);
    const contactGap = await page.textContent('#contactGap');
    if (!contactGap.includes('Capture the keyframe')) {
        throw new Error(`contact snap did not report a baked result: ${contactGap}`);
    }
    const measuredGap = Number(contactGap.match(/: ([\d.]+) px gap/)?.[1]);
    if (!Number.isFinite(measuredGap) || measuredGap > 0.1) {
        throw new Error(`contact snap left ${measuredGap}px instead of exact contact`);
    }

    await page.click('#captureBtn');
    await page.fill('#time', '0.4');
    await page.dispatchEvent('#time', 'change');
    await page.click('#captureBtn');
    await page.click('#addEventBtn');
    await page.click('#exportBtn');
    const exported = await page.inputValue('#exportText');
    if (!exported.includes('tracks:') || !exported.includes('events:')) {
        throw new Error('clip export omitted tracks or events');
    }
    if (!exported.includes('nearHand: "grip"')) {
        throw new Error('selected hand variant was not captured into clip export');
    }
    if (process.env.SCREENSHOT) {
        await page.click('#exportDialog button:last-child');
        await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true });
    }
    if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
    console.log('PASS move editor connected drag, two-role timeline, capture, marker, and export');
} finally {
    await browser.close();
}
