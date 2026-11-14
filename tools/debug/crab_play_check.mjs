// B2: the half crab through the real executor on a downed man (?light=v1 and flag off), stepped at 60 fps with the loop asleep.
//   WFM_URL=http://127.0.0.1:5197 node tools/debug/crab_play_check.mjs
import { chromium } from 'playwright-core';
const URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5197';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const out = [];
try {
  for (const [name, a, d] of [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]]) for (const light of [true, false]) for (const facing of [1, -1]) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${URL0}/?arena=1&notitle=1${light ? '&light=v1' : ''}&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const res = await page.evaluate(async ({ facing }) => {
      const G = window.__WFM_GAME, sc = G.scene.scenes[0], w1 = sc.w1, w2 = sc.w2;
      G.loop.sleep(); sc._p1AI = sc._p2AI = null; let T = sc.time.now; const step = () => { T += 1000 / 60; G.step(T, 1000 / 60); };
      sc.tweens.getDelta = () => 1000 / 60;
      for (const w of [w1, w2]) { w.state = 'standing'; w.y = 400; w.vx = w.vy = 0; w.input = { justDown: () => false, isDown: () => false }; }
      w1.x = 520; w1.facing = facing; w2.x = 520 + facing * 90; w2.facing = -facing;
      w2.state = 'down'; w2.lying = 'supine'; w2.stateTimer = 99;
      if (!w1.moveSet.includes('halfBostonCrab')) w1.moveSet.push('halfBostonCrab');
      const stam0 = w2.stamina; step();
      w1._doHalfBostonCrab(w2);
      const trace = [], clipId = () => w1._activeMove?.clip?.id ?? null;
      let held = 0, t = 0;
      for (let i = 0; i < 60 * 14; i++) {
        step(); t = (i + 1) / 60;
        if (i % 30 === 0 || (w1._activeMove == null && !trace.at(-1)?.ended)) trace.push({ t: +t.toFixed(2), a: w1.state, d: w2.state, lying: w2.lying, clip: clipId(), dx: +(w2.x - w1.x).toFixed(0), ended: w1._activeMove == null });
        if (w1._activeMove) held = t;
      }
      return { heldSeconds: +held.toFixed(2), clipEnded: w1._activeMove == null, stamina: [stam0, w2.stamina], final: { a: w1.state, d: w2.state, lying: w2.lying, dTimer: +(w2.stateTimer ?? 0).toFixed(2), aFacing: w1.facing, dFacing: w2.facing }, trace: trace.filter((r, i) => i % 3 === 0 || r.ended) };
    }, { facing });
    out.push({ name, light, facing, ...res, errors });
    await page.close();
  }
} finally { await browser.close(); }
for (const r of out) console.log(r.name, r.light ? 'light' : 'flag-off', r.facing, JSON.stringify({ held: r.heldSeconds, ended: r.clipEnded, stamina: r.stamina, final: r.final, errors: r.errors }), '\n   ', r.trace.slice(0, 3).map(x => `${x.t}:${x.clip}/${x.a}/${x.d}/${x.lying}`).join(' '), '...', r.trace.slice(-2).map(x => `${x.t}:${x.clip}/${x.a}/${x.d}/${x.lying}`).join(' '));
