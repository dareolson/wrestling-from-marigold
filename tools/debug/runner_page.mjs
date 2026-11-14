// PLAN_LIGHT_MOVES T6.6 G6 page: every runner answer (clothesline old and kit's, back body drop old and V2, hip toss, arm drag), both pairings and facings.
//   WFM_URL=http://127.0.0.1:5197 node tools/debug/runner_page.mjs research/animation/light-moves-2026-11/g6
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const [dir] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5197';
mkdirSync(`${dir}/video`, { recursive: true });
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const ANSWERS = [['clothesline', false, 'Clothesline (Action; flag off, unchanged)'], ['backBodyDrop', false, 'Back body drop, OLD (flag off, Up + Action)'], ['backBodyDrop', true, 'Back body drop, NEW (?light=v1)'], ['hipToss', true, 'Runner hip toss (Power, ?light=v1)'], ['armDrag', true, 'Runner arm drag (Power, ?light=v1)']];
const nums = {};
for (const [mode, light] of ANSWERS) { const f = `${dir}/measure-${mode}-${light ? 'new' : 'old'}.json`; execFileSync('node', ['tools/debug/runner_measure.mjs', f], { env: { ...process.env, MODES: mode, LIGHT: light ? 'v1' : '' } }); nums[`${mode}-${light}`] = execFileSync('node', ['tools/debug/runner_report.mjs', f]).toString().trim().split('\n'); }
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
  for (const [mode, light] of ANSWERS) for (const [name, a, d] of [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]]) for (const facing of [1, -1]) {
    const tag = `${mode}-${light ? 'new' : 'old'}-${name}-${facing > 0 ? 'right' : 'left'}`;
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: 800, height: 512 } } });
    const t0 = Date.now(), page = await ctx.newPage();
    await page.goto(`${URL0}/?arena=1&notitle=1${light ? '&light=v1' : ''}&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(({ facing, mode }) => {
      const sc = window.__WFM_GAME.scene.scenes[0], w1 = sc.w1, w2 = sc.w2; sc._p1AI = sc._p2AI = null;
      const up = mode === 'backBodyDrop', pw = mode === 'hipToss' || mode === 'armDrag'; let press = false;
      for (const w of [w1, w2]) { w.state = 'standing'; w.y = 400; w.vx = w.vy = 0; w.stamina = 100; }
      w1.input = { justDown: k => k === (pw ? 'power' : 'action') && press, isDown: k => k === 'up' && up && press }; w2.input = { justDown: () => false, isDown: () => false };
      if (!w1.moveSet.includes(mode)) w1.moveSet.push(mode); if (mode === 'armDrag') w1.moveSet = w1.moveSet.filter(m => m !== 'hipToss');
      w1.x = 520; w1.facing = facing; w2.facing = -facing; w2.x = 520 + facing * 420; window.__done = false; let called = false;
      sc.events.on('update', () => { if (called) return; if (w2.state === 'running' && Math.abs(w2.x - w1.x) < 160 * w1.s && ((w2.x - w1.x) * w2.runFacing) < 45 * w1.s) { press = true; pw ? w1.tryPower(w2) : w1.tryAction(w2); press = false; called = true; } });
      window.__go = () => { w2.state = 'running'; w2.runPhase = 'returning'; w2.runFacing = -facing; w2.facing = -facing; w2.runTarget = 520 - facing * 700; w2.runTargetY = null; };
    }, { facing, mode });
    await page.waitForTimeout(400);
    const tStart = (Date.now() - t0) / 1000;
    await page.evaluate(() => window.__go());
    await page.waitForTimeout(3600);
    const tEnd = (Date.now() - t0) / 1000;
    await ctx.close(); await page.video().saveAs(`${dir}/video/${tag}.webm`);
    cases.push({ tag, mode, light, name, facing, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2) });
  }
} finally { await browser.close(); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const sections = ANSWERS.map(([mode, light, title]) => `<h2>${title}</h2>` + ['lou-george', 'george-lou'].map((name, pi) => `<h3>${name.replace('-', ' on ')}</h3><div class="row">` + [1, -1].map(f => { const c = cases.find(c => c.mode === mode && c.light === light && c.name === name && c.facing === f); return `<figure><video src="video/${c.tag}.webm#t=${c.tStart},${c.tEnd}" data-start="${c.tStart}" data-end="${c.tEnd}" autoplay loop muted playsinline controls></video><figcaption>facing ${f > 0 ? 'right' : 'left'}</figcaption></figure>`; }).join('') + `</div><pre>${esc(nums[`${mode}-${light}`][pi * 2])}</pre>`).join('')).join('\n');
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>G6 runner answers</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1300px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}video{width:100%}pre{white-space:pre-wrap;background:#222;padding:8px;font-size:11px}</style>
<h1>G6: answers to a man coming back off the ropes (draft, no approval)</h1><p>Real <code>tryAction</code> / <code>tryPower</code>, the runner placed 420 px out. Numbers: <code>tools/debug/runner_measure.mjs</code>. The drop toe hold (T6.4) is not built: waiting for Derek.</p>${sections}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`);
console.log('wrote', `${dir}/index.html`);
