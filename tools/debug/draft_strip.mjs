// Filmstrip of a move-editor library draft: one screenshot per keyframe time,
// with the reference sprites shown (ref_N.png) and hidden (rig_N.png).
//   node tools/debug/draft_strip.mjs <outDir> [draftId=piledriver]
// Expects the dev server on 127.0.0.1:5173.
import { chromium } from 'playwright-core';
const outDir = process.argv[2], draftId = process.argv[3] ?? 'piledriver';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:5173/tools/move-editor/');
await page.waitForFunction(() => window.__MOVE_EDITOR?.actors?.attacker?.skeleton);
await page.waitForTimeout(500);
await page.evaluate(() => localStorage.clear());
await page.evaluate(id => window.__MOVE_EDITOR.loadLibraryDraft(id), draftId);
await page.waitForTimeout(1500);
const times = await page.evaluate(() => [...new Set(window.__MOVE_EDITOR.draft.tracks.attacker.keyframes.map(k => k.at))]);
for (const [i, t] of times.entries()) for (const show of [true, false]) {
  await page.evaluate(([t, show]) => { document.getElementById('refShow').checked = show; document.getElementById('refShow').dispatchEvent(new Event('change')); window.__MOVE_EDITOR.setPlayhead(t); }, [t, show]);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outDir}/${show ? 'ref' : 'rig'}_${i}.png`, clip: { x: 60, y: 60, width: 820, height: 630 } });
}
console.log('times', times.join(','), 'errors:', errs.join(' | ') || 'none');
await browser.close();
