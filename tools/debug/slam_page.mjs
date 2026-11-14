// PLAN_LIGHT_MOVES T5.3 G5 page: old (flag off) vs new (?light=v1) body slam, normal-speed webm per case, stills, numbers.
//   WFM_URL=http://127.0.0.1:5197 node tools/debug/slam_page.mjs research/animation/light-moves-2026-11/g5
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const [dir] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5197';
mkdirSync(`${dir}/video`, { recursive: true });
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const run = (light, out) => execFileSync('node', ['tools/debug/slam_measure.mjs', out], { env: { ...process.env, LIGHT: light ? 'v1' : '' } });
run(false, `${dir}/measure-old.json`); run(true, `${dir}/measure-new.json`);
const rep = f => execFileSync('node', ['tools/debug/slam_report.mjs', f]).toString().trim().split('\n');
const nOld = rep(`${dir}/measure-old.json`), nNew = rep(`${dir}/measure-new.json`);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
  for (const [name, a, d] of [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]]) for (const facing of [1, -1]) for (const light of [false, true]) {
    const tag = `${name}-${facing > 0 ? 'right' : 'left'}-${light ? 'new' : 'old'}`;
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: 800, height: 512 } } });
    const t0 = Date.now(), page = await ctx.newPage();
    await page.goto(`${URL0}/?arena=1&notitle=1${light ? '&light=v1' : ''}&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(({ facing }) => {
      const sc = window.__WFM_GAME.scene.scenes[0], w1 = sc.w1, w2 = sc.w2; sc._p1AI = sc._p2AI = null;
      for (const w of [w1, w2]) { w.state = 'standing'; w.y = 400; w.vx = w.vy = 0; w.input = { justDown: () => false, isDown: () => false }; }
      w1.x = 520; w1.facing = facing; w2.x = 520 + facing * 80; w2.facing = -facing;
    }, { facing });
    await page.waitForTimeout(400);
    const tStart = (Date.now() - t0) / 1000;
    await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; sc.w1._doBodySlam(sc.w2); });
    const stills = [];
    for (const t of [0.35, 0.8, 1.0, 1.15]) { await page.waitForTimeout(t === 0.35 ? 350 : t === 0.8 ? 450 : t === 1.0 ? 200 : 150); }
    await page.waitForTimeout(1500);
    const tEnd = (Date.now() - t0) / 1000;
    await ctx.close(); await page.video().saveAs(`${dir}/video/${tag}.webm`);
    cases.push({ tag, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2), light });
  }
} finally { await browser.close(); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const keys = ['lou-george-right', 'lou-george-left', 'george-lou-right', 'george-lou-left'];
const cell = c => `<figure><video src="video/${c.tag}.webm#t=${c.tStart},${c.tEnd}" data-start="${c.tStart}" data-end="${c.tEnd}" autoplay loop muted playsinline controls></video><figcaption>${c.light ? 'NEW (?light=v1)' : 'OLD'}</figcaption></figure>`;
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>G5 body slam</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1300px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}video{width:100%}pre{white-space:pre-wrap;background:#222;padding:8px;font-size:11px}</style>
<h1>G5: body slam, old vs new (draft, no approval)</h1><p>Old = flag off. New = <code>bodySlamV2</code> under <code>?light=v1</code>. Numbers from <code>tools/debug/slam_measure.mjs</code> + <code>slam_report.mjs</code> (real executor, 60 fps). Bars: peak ≤ shoulder +10%; horizontal ±20° at the peak; soles planted through the lift; D3 knees.</p>
${keys.map((k, i) => `<h2>${k.replace('-', ' on ').replace('-', ', facing ')}</h2><div class="row">${cell(cases.find(c => c.tag === k + '-old'))}${cell(cases.find(c => c.tag === k + '-new'))}</div><pre>OLD ${esc(nOld[i])}\nNEW ${esc(nNew[i])}</pre>`).join('\n')}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`);
console.log('wrote', `${dir}/index.html`);
