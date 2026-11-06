// A contact sheet of probe frames for eyeballing a fall (PLAN_FALLS): frames/<id>/sNNNN.jpg from a falls_probe run, a row per id, the frames you name.
//   node tools/debug/falls_sheet.mjs <runDir> <out.png> <id[,id...]> <from> <to> [step=2]
import { chromium } from 'playwright-core';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [dir, out, ids, from, to, step = '2'] = process.argv.slice(2);
const frames = []; for (let i = +from; i <= +to; i += +step) frames.push(i);
const abs = resolve(dir);
const img = (id, i) => { const f = `${abs}/frames/${id}/s${String(i).padStart(4, '0')}.jpg`; return `<div><img src="data:image/jpeg;base64,${readFileSync(f).toString('base64')}" width="400"><span>${i}</span></div>`; };
const html = `<body style="margin:0;background:#111;color:#ff0;font:11px system-ui">${ids.split(',').map(id => `<div style="display:flex;flex-wrap:nowrap;align-items:flex-end"><b style="width:90px">${id}</b>${frames.map(i => img(id, i)).join('')}</div>`).join('')}</body>`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 90 + frames.length * 402, height: 260 * ids.split(',').length + 20 } });
await page.setContent(html); await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true }); await browser.close();
console.log('wrote', out);
