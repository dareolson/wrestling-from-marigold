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
    // Editor-only authoring metadata must never reach the exported clip data.
    if (exported.includes('contacts') || exported.includes('posture')) {
        throw new Error('export leaked editor-only metadata into gameplay clip data');
    }

    // Production readiness: the whole-clip sweep, not the current-pose badge.
    await page.click('#exportDialog button:last-child');
    const readiness = await page.evaluate(() => {
        const report = window.__MOVE_EDITOR.readiness();
        return { report, text: document.getElementById('readiness').textContent };
    });
    if (readiness.report.sampledTimes <= 1) {
        throw new Error(`readiness swept ${readiness.report.sampledTimes} frames instead of the whole clip`);
    }
    if (!readiness.report.stagedRoles.length) {
        throw new Error('readiness did not report which roles the runtime will stage');
    }
    // The snap-and-bake contact captured above is exact on its own keyframe; the
    // point of the sweep is that it re-measures the pair BETWEEN keyframes.
    const contact = readiness.report.contacts[0];
    if (!contact) throw new Error('captured contact snap was not recorded as a declared contact pair');
    if (!contact.measured) throw new Error('declared contact was never measured against the live rig');
    if (!Number.isFinite(contact.maxGap)) throw new Error(`contact gap is not finite: ${contact.maxGap}`);
    if (!readiness.text.includes('worst gap')) {
        throw new Error(`readiness panel did not report the authored contact gap: ${readiness.text}`);
    }
    // A drifting contact is reported, and reported as a warning — snap-and-bake
    // stays a legal authoring choice in this milestone.
    if (contact.maxGap > 1 && !readiness.report.warnings.some(w => /separates to/.test(w))) {
        throw new Error('a drifting contact was measured but not surfaced to the author');
    }
    // The export dialog was already closed above, before the readiness sweep.
    if (process.env.SCREENSHOT) {
        await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true });
    }
    if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
    console.log(`PASS move editor connected drag, two-role timeline, capture, marker, export, and readiness sweep (${readiness.report.sampledTimes} frames, contact worst gap ${contact.maxGap.toFixed(2)} px at ${contact.worstAt.toFixed(3)}s)`);
} finally {
    await browser.close();
}
