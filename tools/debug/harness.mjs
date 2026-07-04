// Playwright debugging harness — drives the game in Chrome and reads live
// game state through the window.__WFM_GAME handle set in src/main.js.
//
// Uses playwright-core + the system Chrome install: no browser downloads.
//
// Env:
//   WFM_URL  — attach to an already-running dev server (e.g. http://localhost:5176)
//              instead of spawning one
//   HEADED=1 — show the browser window instead of running headless

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DEFAULT_PORT = 5199;

async function waitForServer(url, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url);
            if (res.ok) return;
        } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 250));
    }
    throw new Error(`Dev server never came up at ${url}`);
}

export async function launch() {
    let server = null;
    let url = process.env.WFM_URL;
    if (!url) {
        url = `http://localhost:${DEFAULT_PORT}`;
        server = spawn('npx', ['vite', '--port', String(DEFAULT_PORT), '--strictPort'], {
            cwd: PROJECT_ROOT,
            stdio: 'ignore',
        });
        await waitForServer(url);
    }

    const browser = await chromium.launch({
        channel: 'chrome',
        headless: !process.env.HEADED,
        args: ['--autoplay-policy=no-user-gesture-required'],
    });
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    page.on('pageerror', e => console.log(`[PAGEERROR] ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') console.log(`[CONSOLE ERR] ${m.text()}`); });

    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.locator('canvas').click(); // focus for keyboard input + audio unlock

    return {
        page,

        // One-line snapshot of both wrestlers, clock, and heat
        async snap() {
            return page.evaluate(() => {
                const sc = window.__WFM_GAME?.scene?.scenes?.[0];
                if (!sc?.w1) return null;
                const f = w => ({ x: Math.round(w.x), y: Math.round(w.y), st: w.state, stam: Math.round(w.stamina) });
                return {
                    t: Math.round(sc._matchTime * 10) / 10,
                    clock: sc.clockLbl.text,
                    heat: Math.round(sc.heat),
                    over: sc.matchOver,
                    w1: f(sc.w1),
                    w2: f(sc.w2),
                    eventCount: sc.matchEvents.length,
                };
            });
        },

        // matchEvents entries from index `since` onward
        async events(since = 0) {
            return page.evaluate(n => {
                const sc = window.__WFM_GAME?.scene?.scenes?.[0];
                return sc ? sc.matchEvents.slice(n) : [];
            }, since);
        },

        async screenshot(path) {
            await page.screenshot({ path });
            return path;
        },

        async close() {
            await browser.close();
            server?.kill();
        },
    };
}
