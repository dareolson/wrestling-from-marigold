// PLAN_LIGHT_MOVES T5.1/T5.2: body slam numbers through the real executor, 60 fps, both pairings and facings.
//   WFM_URL=http://127.0.0.1:5197 [LIGHT=v1] node tools/debug/slam_measure.mjs <out.json>
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { READ } from './toehold_t30_lib.mjs';
const URL0 = process.env.WFM_URL ?? 'http://127.0.0.1:5197', LIGHT = process.env.LIGHT === 'v1';
const LOU = 'thesz-procreate-v1', GEORGE = 'george-roster-v1';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const res = {};
try {
  for (const [name, a, d] of [['lou-george', LOU, GEORGE], ['george-lou', GEORGE, LOU]]) for (const facing of (process.env.FACING ? [Number(process.env.FACING)] : [1, -1])) {
    if (process.env.PAIR && process.env.PAIR !== name) continue;
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${URL0}/?arena=1&notitle=1${LIGHT ? '&light=v1' : '&light=off'}&p1=${a}&p2=${d}`);
    await page.waitForFunction(() => window.__WFM_GAME?.scene.scenes[0]?.w2, { timeout: 30000 });
    await page.waitForTimeout(1500);
    const rows = await page.evaluate(async ({ facing, readSrc }) => {
      const read = (0, eval)(`(${readSrc})`);
      const G = window.__WFM_GAME, sc = G.scene.scenes[0], w1 = sc.w1, w2 = sc.w2;
      G.loop.sleep(); sc._p1AI = sc._p2AI = null; let T = sc.time.now; const step = () => { T += 1000 / 60; G.step(T, 1000 / 60); };
      sc.tweens.getDelta = () => 1000 / 60;
      for (const w of [w1, w2]) { w.state = 'standing'; w.y = 400; w.vx = w.vy = 0; w.input = { justDown: () => false, isDown: () => false }; }
      w1.x = 520; w1.facing = facing; w2.x = 520 + facing * 80; w2.facing = -facing;
      step(); step();
      const j = w => Object.fromEntries(Object.entries(w.skeleton.jointAttachmentPoints).map(([k, v]) => [k, [v.x, v.y]]));
      const stand = { a: j(w1), mat: w1.y };
      w1._doBodySlam(w2);
      const out = [];
      for (let i = 0; i < 60 * 4; i++) {
        step();
        const r = read();
        out.push({ t: (i + 1) / 60, a: j(w1), d: j(w2), ax: w1.x, dx: w2.x, ay: w1.y, dy: w2.y, ast: w1.state, dst: w2.state, hold: !!w1._activeMove, pin: [...r.att.pinned, ...r.def.pinned], rot: w2.pose.tilt, handle: w1._activeMove ? { t: w1._activeMove.time, id: w1._activeMove.clip.id } : null });
        if (!w1._activeMove && i > 20 && w2.state !== 'holding') { if (out.length > 30) break; }
      }
      return { stand, out, clip: out.find(r => r.handle)?.handle.id };
    }, { facing, readSrc: READ.toString() });
    res[`${name}-${facing > 0 ? 'right' : 'left'}`] = { ...rows, errors };
    await page.close();
  }
} finally { await browser.close(); }
writeFileSync(process.argv[2] ?? '/private/tmp/claude-501/s/slam.json', JSON.stringify(res));
console.log('ok', Object.keys(res).join(' '));
