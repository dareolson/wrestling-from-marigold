// Visual evidence for the george-ai-pilot-v8 art-layer corrections
// (2026-07-26, per Codex's live review): shoulder-seam stroke removed,
// double-neck geometry recut into a single collar, torso/pelvisOverlay
// registration shared, trunks/backfill rounded and extended. Uses the
// rig-tuner (no match-intro sequence to wait out) rather than the full
// Arena harness.
//
//   node tools/debug/v8_comparison_shots.mjs
//
// Writes numbered PNGs to tools/debug/shots/v8-comparison/.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = process.env.WFM_URL || 'http://localhost:5173';
const dir = fileURLToPath(new URL('./shots/v8-comparison', import.meta.url));
fs.mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 620 } });
await page.goto(`${url}/tools/rig-tuner/`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__RIG_TOOL && window.__RIG_TOOL.skeleton(), null, { timeout: 15000 });

const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

await page.evaluate(() => window.__RIG_TOOL.setCharacter('george-ai-pilot-v8'));

// Shoulder-seam + neck-collar evidence: idle and two arm-stress poses
// (slamHold = arms straight overhead, lockup = arms forward/crossed) --
// the poses most likely to expose a bad near-shoulder/torso overlap or a
// neck seam.
for (const pose of ['powerIdle', 'slamHold', 'lockup', 'sleeperHold']) {
    await page.evaluate(p => window.__RIG_TOOL.setPoseName(p), pose);
    await settle();
    fs.writeFileSync(`${dir}/pose_${pose}.png`, await page.locator('#stage canvas').screenshot());
}

// Trunks/backfill evidence: kneeLiftImpact is the largest leg-raise value
// used anywhere in POSES (Wrestler.js) -- the worst case for exposing a
// gap behind the near thigh.
await page.evaluate(() => window.__RIG_TOOL.setPoseName('kneeLiftImpact'));
await settle();
fs.writeFileSync(`${dir}/trunks_kneeliftimpact.png`, await page.locator('#stage canvas').screenshot());

await page.evaluate(() => window.__RIG_TOOL.setPoseName('powerIdle'));
await settle();

console.log(`wrote shots to ${dir}`);
await browser.close();
