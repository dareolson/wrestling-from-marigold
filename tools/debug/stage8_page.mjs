// PLAN_LIGHT_MOVES T8.4 G8 page: the hand stomp (prone man) and the knee drop (supine man) through the real executors at normal speed, Lou on George and George on Lou, both facings, the
// camera framed so the whole attacker is in view; the probe's numbers beside each loop.
//   WFM_URL=http://localhost:5198 node tools/debug/stage8_page.mjs research/animation/light-moves-2026-11/g8 [stomp.json knee.json]   (the json files are hand_stomp_probe.mjs OUT files, Y=330)
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const [dir, stompJson, kneeJson] = process.argv.slice(2), URL0 = process.env.WFM_URL ?? 'http://localhost:5198';
mkdirSync(`${dir}/video`, { recursive: true });
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const PAIRS = [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]];
const MOVES = [['stomp', '_doHandStomp', 'prone', 'Hand stomp (prone man)'], ['knee', '_doKneeDropV2', 'supine', 'Knee drop (supine man)']];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const cases = [];
try {
  for (const [mv, exec, lying] of MOVES) for (const [name, a, d] of PAIRS) for (const facing of [1, -1]) {
    const tag = `${mv}-${name}-${facing > 0 ? 'right' : 'left'}`;
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, recordVideo: { dir: `${dir}/video/_raw`, size: { width: 800, height: 512 } } });
    const t0 = Date.now(), page = await ctx.newPage();
    await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(({ facing, exec, lying }) => {
      const sc = window.__WFM_GAME.scene.scenes[0], w1 = sc.w1, w2 = sc.w2; sc._p1AI = sc._p2AI = null;
      for (const w of [w1, w2]) { w.state = 'standing'; w.y = 330; w.vx = w.vy = 0; w.stamina = 100; w.input = { justDown: () => false, isDown: () => false }; }
      w1.x = 520; w1.facing = facing; w2.x = 520 + facing * 90; w2.facing = facing;
      w2.state = 'down'; w2.lying = lying; w2.stateTimer = 99;
      // the camera: the whole attacker in view, wherever he walks to (centre a little past the man along the facing)
      const cam = sc.cameras.main; cam.stopFollow?.(); cam.removeBounds?.(); cam.setZoom(1.3); cam.centerOn(w2.x + facing * 60, 290);
      window.__go = () => w1[exec](w2);
    }, { facing, exec, lying });
    await page.waitForTimeout(500);
    const tStart = (Date.now() - t0) / 1000;
    await page.evaluate(() => window.__go());
    await page.waitForTimeout(3200);   // the clip (1.5 s) and the man's sell (to 1.8 s) / jolt, then the loop point
    const tEnd = (Date.now() - t0) / 1000;
    await ctx.close(); await page.video().saveAs(`${dir}/video/${tag}.webm`);
    cases.push({ tag, mv, name, facing, tStart: +tStart.toFixed(2), tEnd: +tEnd.toFixed(2) });
  }
} finally { await browser.close(); }
const rowsOf = f => (f && existsSync(f) ? JSON.parse(readFileSync(f)) : []);
const rows = { stomp: rowsOf(stompJson), knee: rowsOf(kneeJson) };
const find = (mv, name, facing) => { const [, a, d] = PAIRS.find(p => p[0] === name); return rows[mv].find(r => r.a === a && r.d === d && r.facing === facing); };
const nums = (mv, name, facing) => {
  const r = find(mv, name, facing); if (!r) return '<p class=n>no numbers</p>';
  const o = r.bodyOverlap ?? {}, bo = k => (o[k] ? `${o[k].px} px` : '-');
  const main = mv === 'stomp' ? `sole to hand ${r.painted?.soleToHandPx ?? '-'} px painted (overlap ${r.painted?.bootOverHandPx ?? '-'} px); boot to head ${r.painted?.headClearPx ?? '-'} px at contact` : `knee to chest ${r.dist ? Math.hypot(r.dist.dx, r.dist.dy).toFixed(1) : '-'} px; apex ${r.apex?.px ?? '-'} px = ${r.apex?.fracOfHip ?? '-'} of hip height, ${r.apex?.framesApexToContact ?? '-'} frames apex to contact`;
  return `<p class=n>${main}<br>his feet on the man's head and torso, px: set ${bo('set')}, contact ${bo('contact')}, finish ${bo('finish')}<br>max walk ${r.maxStep} px/frame; errors ${r.errors?.length ?? 0}</p>`;
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fig = c => `<figure><video src="video/${c.tag}.webm#t=${c.tStart},${c.tEnd}" data-start="${c.tStart}" data-end="${c.tEnd}" autoplay loop muted playsinline controls></video><figcaption>${esc(c.name.replace('-', ' on '))}, facing ${c.facing > 0 ? 'right' : 'left'}</figcaption>${nums(c.mv, c.name, c.facing)}</figure>`;
writeFileSync(`${dir}/index.html`, `<!doctype html><meta charset=utf-8><title>G8 hand stomp and knee drop</title><style>body{font:15px system-ui;background:#151515;color:#eee;margin:18px auto;max-width:1300px}.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}video{width:100%;background:#000}figure{margin:0}figcaption{font-weight:600;margin-top:4px}.n{font-size:13px;color:#bbb;margin:2px 0 14px}code{background:#262626;padding:1px 4px}</style>
<h1>G8: hand stomp and knee drop (draft, no approval)</h1><p>Real executors at normal speed under <code>?light=v1</code>, Down + Power on a downed man: <b>prone &rarr; hand stomp</b>, <b>supine &rarr; knee drop</b>. The pair stands mid-ring (depth 330) so the attacker has room beside the body. Numbers are measurements, not a verdict; how it looks is Derek's call.</p>
${MOVES.map(([mv, , , title]) => `<h2>${title}</h2>${['lou-george', 'george-lou'].map(name => `<div class="row">${[1, -1].map(f => fig(cases.find(c => c.mv === mv && c.name === name && c.facing === f))).join('')}</div>`).join('')}`).join('')}
<script>for(const v of document.querySelectorAll('video'))v.addEventListener('timeupdate',()=>{if(v.currentTime>=+v.dataset.end)v.currentTime=+v.dataset.start})</script>`);
console.log('wrote', `${dir}/index.html`);
