// PLAN_LIGHT_MOVES T7.2/T7.3: the snapmare out of the tie-up through the real Arena slot (Lockup + Power, Back held), 60 fps. Stills and numbers.
//   WFM_URL=... LIGHT=v1 node tools/debug/snapmare_tieup.mjs <out.json> [stills.png --pair lou-george --facing 1]  (env MODE=tieup|reversal; PAIR, FACING for stills)
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5197', LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1', GUIDO = 'guido-roster-v1';
const [out, pngOut] = process.argv.slice(2), SHOTS = (process.env.SHOTS ?? '0.05,0.17,0.3,0.45,0.6,0.8,1.0,1.2,1.5').split(',').map(Number);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const res = {};
try {
  for (const [name, a, d] of [['lou-george', LOU, GEORGE], ['guido-lou', GUIDO, LOU]]) for (const facing of (process.env.FACING ? [Number(process.env.FACING)] : [1, -1])) {
    if (process.env.PAIR && process.env.PAIR !== name) continue;
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${URL0}/?arena=1&notitle=1&light=v1&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 }); await page.waitForTimeout(1500);
    await page.evaluate(({ facing }) => {
      const G = window.__WFM_GAME, sc = G.scene.scenes[0], w1 = sc.w1, w2 = sc.w2; G.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60;
      window.__T = sc.time.now; window.__step = () => { window.__T += 1000 / 60; G.step(window.__T, 1000 / 60); };
      let press = false; window.__press = () => { press = true; }; window.__release = () => { press = false; };
      for (const w of [w1, w2]) { w.state = 'standing'; w.y = 400; w.vx = w.vy = 0; w.stamina = 100; }
      const back = facing > 0 ? 'left' : 'right';
      w1.input = { justDown: k => k === 'power' && press, isDown: k => k === back && press }; w2.input = { justDown: () => false, isDown: () => false };
      w1.x = 520; w1.facing = facing; w2.facing = -facing; w2.x = 520 + facing * 100;
      if (!w1.moveSet.includes('snapmare')) w1.moveSet.push('snapmare');
      window.__step(); w1.state = w2.state = 'lockup'; sc.lockupState = { attacker: w1, defender: w2, timer: 0.2, grapple: null };
      window.__step();
    }, { facing });
    if (pngOut) {
      await page.evaluate(() => { const sc = window.__WFM_GAME.scene.scenes[0]; window.__press(); window.__step(); window.__release(); sc.cameras.main.stopFollow?.(); sc.cameras.main.setZoom(1.5); sc.cameras.main.centerOn(520, 330); });
      const shots = []; let frame = 1;
      for (const t of SHOTS) { const n = Math.round(t * 60); await page.evaluate(k => { for (let i = 0; i < k; i++) window.__step(); }, n - frame); frame = n; shots.push([t, (await page.screenshot({ clip: { x: 150, y: 120, width: 800, height: 420 } })).toString('base64')]); }
      const sheet = await browser.newPage({ viewport: { width: 1200, height: Math.ceil(shots.length / 3) * 320 } });
      await sheet.setContent(`<body style="margin:0;background:#000;display:flex;flex-wrap:wrap">${shots.map(([t, b]) => `<div style="position:relative;width:400px;height:320px;overflow:hidden"><img src="data:image/png;base64,${b}" width=600 style="margin:-40px 0 0 -100px"><b style="position:absolute;left:6px;top:4px;color:#ff0;font:15px monospace">+${t} s</b></div>`).join('')}</body>`);
      await sheet.screenshot({ path: pngOut }); await page.close(); break;
    }
    const R = await page.evaluate(() => {
      const sc = window.__WFM_GAME.scene.scenes[0], w1 = sc.w1, w2 = sc.w2, j = w => Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints).map(([k, v]) => [k, [v.x, v.y]]));
      const x0 = w1.x; const pre = { a: j(w1), d: j(w2) }; window.__press(); const rows = [];
      for (let i = 0; i < 160; i++) { window.__step(); rows.push({ t: (i + 1) / 60, clip: w1._activeMove?.clip?.id ?? null, ast: w1.state, dst: w2.state, af: w1.facing, df: w2.facing, ax: w1.x, dx: w2.x, a: j(w1), d: j(w2) }); window.__release(); }
      return { rows, pre, x0, started: rows.some(r => r.clip === 'snapmareTieUp'), end: { a: w1.state, d: w2.state, lying: w2.lying } };
    });
    res[`${name}-${facing > 0 ? 'right' : 'left'}`] = { ...R, errors };
    if (pngOut) {
      await page.evaluate(() => { /* restart for stills */ });
    }
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(out, JSON.stringify(res));
for (const [tag, r] of Object.entries(res)) {
  const rows = r.rows, first = rows.findIndex(x => x.clip === 'snapmareTieUp');
  const prev = i => i ? rows[i - 1] : r.pre;
  const steps = rows.map((x, i) => x.clip ? Math.max(...Object.keys(x.a).map(k => Math.hypot(x.a[k][0] - prev(i).a[k][0], x.a[k][1] - prev(i).a[k][1])), ...Object.keys(x.d).map(k => Math.hypot(x.d[k][0] - prev(i).d[k][0], x.d[k][1] - prev(i).d[k][1]))) : 0);
  const flips = rows.filter((x, i) => i && x.af !== rows[i - 1].af).map(x => +x.t.toFixed(2));
  console.log(tag, JSON.stringify({ started: r.started, firstClipFrame: first, firstFramePartStepPx: +steps[first]?.toFixed(1), pivotMaxStepPx: +Math.max(...steps.slice(first + 1, 21)).toFixed(1), flipFrameStepPx: +steps[rows.findIndex((x, i) => i && x.af !== rows[i - 1].af)]?.toFixed(1), snapmareOwnMaxStepPx: +Math.max(...steps.slice(21)).toFixed(1), attackerStateAt1_5_2_5: [rows[89]?.ast, rows[150]?.ast, rows.at(-1).ast], attackerFacingFlipsAt: flips, end: r.end, errors: r.errors }));
}
