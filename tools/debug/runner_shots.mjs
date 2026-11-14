// Stills of an answer to a returning runner: WFM_URL=... LIGHT=v1 node tools/debug/runner_shots.mjs <out.png> <mode> <lou-george|george-lou> <1|-1> t1,t2,...  (seconds after the press)
import { chromium } from 'playwright-core';
const [out, mode = 'backBodyDrop', name = 'lou-george', fac = '1', ts = '0,0.15,0.3,0.45,0.6,0.8,1.0,1.3,1.8'] = process.argv.slice(2);
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1', LIGHT = process.env.LIGHT === 'v1', facing = Number(fac);
const [a, d] = name === 'lou-george' ? [LOU, GEORGE] : [GEORGE, LOU];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  page.on('pageerror', e => console.log('pageerror', e.message));
  await page.goto(`${process.env.WFM_URL ?? 'http://127.0.0.1:5197'}/?arena=1&notitle=1${LIGHT ? '&light=v1' : ''}&p1=${a}&p2=${d}`);
  await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 }); await page.waitForTimeout(1500);
  await page.evaluate(({ facing, mode }) => {
    const G = window.__WFM_GAME, sc = G.scene.scenes[0], w1 = sc.w1, w2 = sc.w2; G.loop.sleep(); sc._p1AI = sc._p2AI = null; sc.tweens.getDelta = () => 1000 / 60;
    window.__T = sc.time.now; window.__step = () => { window.__T += 1000 / 60; G.step(window.__T, 1000 / 60); };
    let press = false; const up = mode === 'backBodyDrop', pw = mode === 'hipToss' || mode === 'armDrag';
    for (const w of [w1, w2]) { w.state = 'standing'; w.y = 400; w.vx = w.vy = 0; w.stamina = 100; }
    w1.input = { justDown: k => k === (pw ? 'power' : 'action') && press, isDown: k => k === 'up' && up && press }; w2.input = { justDown: () => false, isDown: () => false };
    w1.x = 520; w1.facing = facing; w2.facing = -facing; w2.x = 520 + facing * 420; if (!w1.moveSet.includes(mode)) w1.moveSet.push(mode); if (mode === 'armDrag') w1.moveSet = w1.moveSet.filter(m => m !== 'hipToss');
    window.__step(); w2.state = 'running'; w2.runPhase = 'returning'; w2.runFacing = -facing; w2.facing = -facing; w2.runTarget = 520 - facing * 700; w2.runTargetY = null;
    for (let i = 0; i < 200; i++) { press = Math.abs(w2.x - w1.x) < 160 * w1.s && ((w2.x - w1.x) * w2.runFacing) < 45 * w1.s && w2.state === 'running'; if (press) { pw ? w1.tryPower(w2) : w1.tryAction(w2); press = false; break; } window.__step(); }
    sc.cameras.main.stopFollow?.(); sc.cameras.main.setZoom(1.5); sc.cameras.main.centerOn(520, 330);
  }, { facing, mode });
  const shots = []; let frame = 0;
  for (const t of ts.split(',').map(Number)) {
    const target = Math.round(t * 60);
    await page.evaluate(n => { for (let i = 0; i < n; i++) window.__step(); }, target - frame); frame = target;
    shots.push([t, (await page.screenshot({ clip: { x: 150, y: 120, width: 800, height: 420 } })).toString('base64')]);
  }
  const sheet = await browser.newPage({ viewport: { width: 1200, height: Math.ceil(shots.length / 3) * 320 } });
  await sheet.setContent(`<body style="margin:0;background:#000;display:flex;flex-wrap:wrap">${shots.map(([t, b]) => `<div style="position:relative;width:400px;height:320px;overflow:hidden"><img src="data:image/png;base64,${b}" width=600 style="margin:-40px 0 0 -100px"><b style="position:absolute;left:6px;top:4px;color:#ff0;font:15px monospace">+${t} s</b></div>`).join('')}</body>`);
  await sheet.screenshot({ path: out });
} finally { await browser.close(); }
