// PLAN_LIGHT_MOVES T7.3 G7 page: the snapmare out of the tie-up (new) beside the reversal's own clip played from its start (the thrower's back to the man, same facing).
//   WFM_URL=http://127.0.0.1:5197 node tools/debug/snapmare_page.mjs research/animation/light-moves-2026-11/g7
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const [dir] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5197';
mkdirSync(`${dir}/video`, { recursive: true });
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1', GUIDO = 'guido-roster-v1';
const numbers = execFileSync('node', ['tools/debug/snapmare_tieup.mjs', `${dir}/measure.json`], { env: process.env }).toString().trim().split('\n');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
  for (const mode of ['reversal', 'tieup']) for (const [name, a, d] of [['lou-george', LOU, GEORGE], ['guido-lou', GUIDO, LOU]]) for (const facing of [1, -1]) {
    const tag = `${mode}-${name}-${facing > 0 ? 'right' : 'left'}`;
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: 800, height: 512 } } });
    const t0 = Date.now(), page = await ctx.newPage();
    await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(({ facing, mode }) => {
      const sc = window.__WFM_GAME.scene.scenes[0], w1 = sc.w1, w2 = sc.w2; sc._p1AI = sc._p2AI = null; let press = false;
      for (const w of [w1, w2]) { w.state = 'standing'; w.y = 400; w.vx = w.vy = 0; w.stamina = 100; }
      const back = facing > 0 ? 'left' : 'right';
      w1.input = { justDown: k => k === 'power' && press, isDown: k => k === back && press }; w2.input = { justDown: () => false, isDown: () => false };
      if (!w1.moveSet.includes('snapmare')) w1.moveSet.push('snapmare');
      w1.x = 520; w1.facing = facing;
      if (mode === 'reversal') { w2.facing = facing; w2.x = 520 - facing * 62 * w1.s; } else { w2.facing = -facing; w2.x = 520 + facing * 100; }
      window.__go = () => { if (mode === 'reversal') { w1._doSnapmare(w2); } else { w1.state = w2.state = 'lockup'; sc.lockupState = { attacker: w1, defender: w2, timer: 0.2, grapple: null }; sc.events.once('update', () => { press = true; sc.events.once('update', () => { press = false; }); }); } };
    }, { facing, mode });
    await page.waitForTimeout(400);
    const tStart = (Date.now() - t0) / 1000;
    await page.evaluate(() => window.__go());
    await page.waitForTimeout(2200);
    const tEnd = (Date.now() - t0) / 1000;
    await ctx.close(); await page.video().saveAs(`${dir}/video/${tag}.webm`);
    cases.push({ tag, mode, name, facing, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2) });
  }
} finally { await browser.close(); }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const vid = c => `<figure><video src="video/${c.tag}.webm#t=${c.tStart},${c.tEnd}" data-start="${c.tStart}" data-end="${c.tEnd}" autoplay loop muted playsinline controls></video><figcaption>${c.mode === 'tieup' ? 'NEW: from the tie-up (Power + Back)' : 'The reversal\'s clip from its own start'}</figcaption></figure>`;
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>G7 snapmare</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1300px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}video{width:100%}pre{white-space:pre-wrap;background:#222;padding:8px;font-size:11px}</style>
<h1>G7: snapmare from the tie-up (draft, no approval)</h1><p>Right: the new entry through the real lockup slot (Lockup + Power, Back held, <code>?light=v1</code>; Lou and Guido hold it). Left: the existing clip as the atomic-drop reversal starts it. Numbers: <code>tools/debug/snapmare_tieup.mjs</code>.</p>
${['lou-george', 'guido-lou'].flatMap(name => [1, -1].map(f => `<h2>${name.replace('-', ' on ')}, facing ${f > 0 ? 'right' : 'left'}</h2><div class="row">${vid(cases.find(c => c.mode === 'reversal' && c.name === name && c.facing === f))}${vid(cases.find(c => c.mode === 'tieup' && c.name === name && c.facing === f))}</div><pre>${esc(numbers.find(n => n.startsWith(`${name}-${f > 0 ? 'right' : 'left'} `)) ?? '')}</pre>`)).join('\n')}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`);
console.log('wrote', `${dir}/index.html`);
