// Review packet for the half crab: a normal-speed webm per pairing and facing, a contact sheet per case, the numbers.
//   WFM_URL=http://127.0.0.1:5197 node tools/move-preview/crab_review.mjs <outDir> [measure.json]   (measure.json from crab_measure.mjs; measured here when omitted)
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
const [outDir, measureFile] = process.argv.slice(2);
const URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5197';
const CASES = [['lou-george', 'right', 'Lou on George, facing right'], ['lou-george', 'left', 'Lou on George, facing left'], ['george-lou', 'right', 'George on Lou, facing right'], ['george-lou', 'left', 'George on Lou, facing left']];
mkdirSync(`${outDir}/video`, { recursive: true });
const here = new URL('.', import.meta.url).pathname;
if (!measureFile) execFileSync('node', [`${here}crab_measure.mjs`, `${outDir}/measure.json`], { stdio: 'inherit', env: process.env });
const report = execFileSync('node', [`${here}crab_report.mjs`, measureFile ?? `${outDir}/measure.json`]).toString().trim().split('\n');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const entries = [];
try {
  for (const [pair, fc, title] of CASES) {
    const tag = `${pair}-${fc}`;
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${outDir}/video/_raw`, size: { width: 800, height: 512 } } });
    const t0 = Date.now(), page = await ctx.newPage();
    await page.goto(`${URL0}/tools/move-preview/`);
    await page.waitForFunction(() => window.__MOVE_PREVIEW?.ready && window.__MOVE_PREVIEW.handle, { timeout: 30000 });
    if (pair !== 'lou-george') { await page.locator('#pair').selectOption(pair); await page.waitForFunction(() => window.__MOVE_PREVIEW.ready && window.__MOVE_PREVIEW.handle); }
    if (fc === 'left') { await page.locator('#mirror').click(); await page.waitForFunction(() => document.querySelector('#mirror').textContent === 'Face right' && window.__MOVE_PREVIEW.handle); }
    await page.waitForTimeout(300);
    await page.addStyleTag({ content: 'header,footer{display:none!important}main{margin:0}#game{visibility:hidden;position:fixed;inset:0;width:100vw;height:100vh;border:0}' });
    const dur = await page.evaluate(() => { window.__MOVE_PREVIEW.seek(0); return window.__MOVE_PREVIEW.handle.clip.duration; });
    await page.evaluate(() => { const b = document.querySelector('#play'); if (b.textContent === 'Play') b.click(); });
    await page.evaluate(() => { document.querySelector('#game').style.visibility = 'visible'; });
    const tStart = (Date.now() - t0) / 1000;
    await page.waitForTimeout(dur * 2 * 1000 + 300);
    const tEnd = (Date.now() - t0) / 1000;
    await ctx.close(); await page.video().saveAs(`${outDir}/video/${tag}.webm`);
    entries.push({ tag, title, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2), dur, bytes: statSync(`${outDir}/video/${tag}.webm`).size });
    execFileSync('node', [`${here}crab_shots.mjs`, `${outDir}/${tag}.png`, pair, fc, '0.6,0.74,0.9,1.2,1.6,2.5'], { env: process.env });
  }
} finally { await browser.close(); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!doctype html><meta charset=utf-8><title>Half crab B1</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1100px}video,img{width:100%;max-width:800px;display:block;margin:6px 0}pre{white-space:pre-wrap;background:#222;padding:10px;font-size:12px}h2{margin-top:28px}</style>
<h1>Half Boston crab, B1: Opus's four misses (draft, no approval)</h1>
<p>Normal speed, looping. Numbers below each case come from <code>tools/move-preview/crab_measure.mjs</code> + <code>crab_report.mjs</code>; misses first on the plan line.</p>
${entries.map((e, i) => `<section><h2>${e.title}</h2><video src="video/${e.tag}.webm#t=${e.tStart}" data-start="${e.tStart}" data-end="${e.tStart + e.dur}" autoplay loop muted playsinline controls></video><img src="${e.tag}.png" alt="stills 0.6 0.74 0.9 1.2 1.6 2.5 s"><pre>${esc(report[i])}</pre></section>`).join('\n')}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`;
writeFileSync(`${outDir}/index.html`, html);
console.log('wrote', `${outDir}/index.html`);
