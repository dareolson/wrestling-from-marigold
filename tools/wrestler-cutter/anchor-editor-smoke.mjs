import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const port = 5198;
const url = `http://localhost:${port}`;
const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore' });
try {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        try { if ((await fetch(url)).ok) break; } catch { /* retry */ }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${url}/tools/wrestler-cutter/anchor-editor.html`);
    await page.waitForFunction(() => window.__ANCHOR_EDITOR?.manifest());
    const result = await page.evaluate(() => {
        const tool = window.__ANCHOR_EDITOR;
        tool.setPart('forearm');
        tool.setAnchor('elbow', 52, 27);
        return {
            canvas: { w: tool.canvas().width, h: tool.canvas().height },
            elbow: tool.manifest().parts.forearm.anchors.elbow,
            exportedIntoArt: tool.manifest().markerLayer.exportedIntoArt,
        };
    });
    await browser.close();
    if (errors.length) throw new Error(errors.join('\n'));
    if (result.canvas.w !== 110 || result.canvas.h !== 180) throw new Error('part canvas did not load');
    if (result.elbow.x !== 52 || result.elbow.y !== 27) throw new Error('anchor edit did not persist');
    if (result.exportedIntoArt !== false) throw new Error('marker export contract changed');
    console.log('anchor editor smoke passed: import, part canvas, exact anchor edit, separate marker contract');
} finally {
    server.kill('SIGTERM');
}
