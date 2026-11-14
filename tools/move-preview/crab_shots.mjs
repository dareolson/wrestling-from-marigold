// Stills from the live preview: node tools/move-preview/crab_shots.mjs <out.png> <pair> <right|left> t1,t2,...  (a contact row of crops)
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const [out, pair = 'lou-george', fc = 'right', ts = '0.6,0.8,0.9,1.2,1.6,2.0'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 950 } });
  await page.goto(`${process.env.WFM_URL ?? 'http://127.0.0.1:5197'}/tools/move-preview/`);
  await page.waitForFunction(() => window.__MOVE_PREVIEW?.ready && window.__MOVE_PREVIEW.handle, { timeout: 30000 });
  if (pair !== 'lou-george') { await page.locator('#pair').selectOption(pair); await page.waitForFunction(() => window.__MOVE_PREVIEW.ready && window.__MOVE_PREVIEW.handle); }
  if (fc === 'left') { await page.locator('#mirror').click(); await page.waitForFunction(() => document.querySelector('#mirror').textContent === 'Face right' && window.__MOVE_PREVIEW.handle); }
  await page.waitForTimeout(300);
  const box = await page.locator('#game').boundingBox();
  const files = [];
  for (const t of ts.split(',')) {
    await page.evaluate(t => window.__MOVE_PREVIEW.seek(+t), t); await page.waitForTimeout(80);
    const b = await page.screenshot({ clip: { x: box.x + box.width * .2, y: box.y + box.height * .2, width: box.width * .6, height: box.height * .5 } }); files.push([t, b.toString('base64')]);
  }
  const sheet = await browser.newPage({ viewport: { width: Math.min(files.length, 3) * 600, height: Math.ceil(files.length / 3) * 400 } });
  await sheet.setContent(`<body style="margin:0;background:#000;display:flex;flex-wrap:wrap">${files.map(([t, b]) => `<div style="position:relative;width:600px;height:400px"><img src="data:image/png;base64,${b}" width=600><b style="position:absolute;left:6px;top:4px;color:#ff0;font:16px monospace">${t} s</b></div>`).join('')}</body>`);
  await sheet.screenshot({ path: out });
} finally { await browser.close(); }
